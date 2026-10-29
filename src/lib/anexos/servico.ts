import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { PoolConnection } from 'mysql2/promise';
import { HttpError } from '@/lib/http-error';
import { queryRows, executeStatement, withTransaction } from '@/lib/mysql/pool';
import { requireFeatureEnabled } from '@/lib/plans/service';
import type { AppSession } from '@/types/app-session';
import { MAX_BYTES_ANEXO, MAX_TEXTO_ANEXO, type AnexoPrivado } from './tipos';
export const idsAnexosSchema = z
  .array(z.uuid())
  .max(3)
  .refine((a) => new Set(a).size === a.length, 'Não repita o mesmo anexo.');
interface Linha {
  id: string;
  conversation_id: string;
  user_id: string;
  file_name: string;
  mime_type: string;
  byte_size: number;
  sha256: string;
  file_data: Buffer;
  text_content: string | null;
  created_at: string;
}
export function metadadosAnexo(a: Linha): AnexoPrivado {
  return {
    id: a.id,
    nome: a.file_name,
    tipo: a.mime_type,
    bytes: Number(a.byte_size),
    criadaEm: a.created_at.replace(' ', 'T') + 'Z',
  };
}
export async function autorizarAnexos(s: AppSession) {
  if (!s.user.onboarding_completed)
    throw new HttpError('Conclua o cadastro antes de usar anexos.', 403);
  await requireFeatureEnabled(s, 'chat_history');
  await requireFeatureEnabled(s, 'ai_chat_messages');
}
export async function processarAnexo(
  nome: string,
  tipo: string,
  bytes: Buffer
) {
  if (!bytes.length || bytes.length > MAX_BYTES_ANEXO)
    throw new HttpError('Escolha um arquivo não vazio de até 3 MiB.', 413);
  if (!nome || nome.length > 120 || /[\x00-\x1f\x7f/\\]/.test(nome))
    throw new HttpError('Nome de arquivo inválido.', 400);
  if (tipo === 'text/plain' && /\.txt$/i.test(nome)) {
    let texto: string;
    try {
      texto = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      throw new HttpError('O TXT precisa estar em UTF-8.', 400);
    }
    if (
      !texto.trim() ||
      texto.length > MAX_TEXTO_ANEXO ||
      /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(texto)
    )
      throw new HttpError(
        'O TXT precisa ser legível, sem caracteres de controle e ter até 8.000 caracteres.',
        400
      );
    return { nome, tipo, bytes, texto };
  }
  const formatos: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/webp': 'webp',
  };
  if (!formatos[tipo] || !/\.(png|jpe?g|webp)$/i.test(nome))
    throw new HttpError(
      'São aceitos TXT UTF-8, PNG, JPEG e WebP estáticos. PDF e documentos de escritório não são aceitos.',
      415
    );
  try {
    const imagem = sharp(bytes, {
        limitInputPixels: 16_000_000,
        failOn: 'warning',
      }),
      meta = await imagem.metadata();
    if (meta.format !== formatos[tipo] || (meta.pages ?? 1) !== 1)
      throw new Error('formato');
    const normalizada = await imagem.rotate().png().toBuffer();
    if (normalizada.length > MAX_BYTES_ANEXO)
      throw new HttpError(
        'A cópia PNG sem metadados excede 3 MiB. Escolha uma imagem menor.',
        413
      );
    return {
      nome: nome.replace(/\.[^.]+$/, '.png'),
      tipo: 'image/png',
      bytes: normalizada,
      texto: null,
    };
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(
      'Imagem inválida, animada, danificada ou acima de 16 milhões de pixels.',
      400
    );
  }
}
export async function listarAnexos(s: AppSession, conversaId: string) {
  await autorizarAnexos(s);
  z.uuid().parse(conversaId);
  const [c] = await queryRows(
    'SELECT id FROM chat_conversations WHERE id=? AND user_id=?',
    [conversaId, s.user.id]
  );
  if (!c) throw new HttpError('Conversa não encontrada.', 404);
  return (
    await queryRows<Linha>(
      'SELECT id,file_name,mime_type,byte_size,created_at FROM chat_attachments WHERE conversation_id=? AND user_id=? ORDER BY created_at,id',
      [conversaId, s.user.id]
    )
  ).map(metadadosAnexo);
}
export async function gravarAnexo(
  s: AppSession,
  conversaId: string,
  id: string,
  nome: string,
  tipo: string,
  bytes: Buffer
) {
  await autorizarAnexos(s);
  z.uuid().parse(conversaId);
  z.uuid().parse(id);
  const a = await processarAnexo(nome, tipo, bytes),
    hash = createHash('sha256').update(a.bytes).digest('hex');
  return withTransaction(async (c) => {
    await queryRows(
      'SELECT id FROM users WHERE id=? FOR UPDATE',
      [s.user.id],
      c
    );
    const [conversa] = await queryRows<{ user_id: string }>(
      'SELECT user_id FROM chat_conversations WHERE id=? FOR UPDATE',
      [conversaId],
      c
    );
    if (conversa && conversa.user_id !== s.user.id)
      throw new HttpError('Conversa não encontrada.', 404);
    const [existente] = await queryRows<Linha>(
      'SELECT * FROM chat_attachments WHERE id=? FOR UPDATE',
      [id],
      c
    );
    if (existente) {
      if (
        existente.user_id !== s.user.id ||
        existente.conversation_id !== conversaId
      )
        throw new HttpError('Anexo não encontrado.', 404);
      if (
        existente.sha256 !== hash ||
        existente.file_name !== a.nome ||
        existente.mime_type !== a.tipo
      )
        throw new HttpError(
          'Este identificador já pertence a outro arquivo.',
          409
        );
      return metadadosAnexo(existente);
    }
    const [reservado] = await queryRows<{ user_id: string }>(
      'SELECT user_id FROM chat_attachment_ids WHERE id=? FOR UPDATE',
      [id],
      c
    );
    if (reservado)
      throw new HttpError(
        reservado.user_id === s.user.id
          ? 'Este arquivo foi excluído. Selecione-o novamente com um novo identificador.'
          : 'Anexo não encontrado.',
        reservado.user_id === s.user.id ? 409 : 404
      );
    const [envios] = await queryRows<{ total: number }>(
      'SELECT COUNT(*) total FROM chat_attachment_ids WHERE user_id=? AND created_at>=UTC_TIMESTAMP()-INTERVAL 1 DAY',
      [s.user.id],
      c
    );
    if (Number(envios.total) >= 100)
      throw new HttpError(
        'Limite de 100 uploads nas últimas 24 horas atingido. Aguarde antes de adicionar novos arquivos.',
        429
      );
    const [q] = await queryRows<{
      total: number;
      bytes: number;
      conversa: number;
    }>(
      'SELECT COUNT(*) total,COALESCE(SUM(byte_size),0) bytes,COALESCE(SUM(conversation_id=?),0) conversa FROM chat_attachments WHERE user_id=?',
      [conversaId, s.user.id],
      c
    );
    if (
      Number(q.total) >= 100 ||
      Number(q.conversa) >= 20 ||
      Number(q.bytes) + a.bytes.length > 30 * 1024 * 1024
    )
      throw new HttpError(
        'Limite de anexos atingido: 20 por conversa, 100 arquivos e 30 MiB por conta. Exclua arquivos que não precisa guardar.',
        409
      );
    if (!conversa)
      await executeStatement(
        'INSERT INTO chat_conversations (id,user_id,title) VALUES (?,?,?)',
        [conversaId, s.user.id, 'Conversa com anexos'],
        c
      );
    await executeStatement(
      'INSERT INTO chat_attachment_ids (id,user_id) VALUES (?,?)',
      [id, s.user.id],
      c
    );
    await executeStatement(
      'INSERT INTO chat_attachments (id,conversation_id,user_id,file_name,mime_type,byte_size,sha256,file_data,text_content) VALUES (?,?,?,?,?,?,?,?,?)',
      [
        id,
        conversaId,
        s.user.id,
        a.nome,
        a.tipo,
        a.bytes.length,
        hash,
        a.bytes,
        a.texto,
      ],
      c
    );
    const [linha] = await queryRows<Linha>(
      'SELECT * FROM chat_attachments WHERE id=?',
      [id],
      c
    );
    return metadadosAnexo(linha);
  });
}
export async function lerAnexo(s: AppSession, id: string) {
  await autorizarAnexos(s);
  z.uuid().parse(id);
  const [a] = await queryRows<Linha>(
    'SELECT * FROM chat_attachments WHERE id=? AND user_id=?',
    [id, s.user.id]
  );
  if (!a) throw new HttpError('Anexo não encontrado.', 404);
  return a;
}
export async function selecionarAnexos(
  userId: string,
  conversaId: string,
  ids: string[],
  c?: PoolConnection
) {
  idsAnexosSchema.parse(ids);
  return Promise.all(
    ids.map(async (id) => {
      const [a] = await queryRows<Linha>(
        'SELECT * FROM chat_attachments WHERE id=? AND user_id=? AND conversation_id=?' +
          (c ? ' FOR SHARE' : ''),
        [id, userId, conversaId],
        c
      );
      if (!a)
        throw new HttpError(
          'Um anexo foi excluído ou não pertence a esta conversa. Selecione os arquivos novamente.',
          409
        );
      return a;
    })
  );
}
export async function excluirAnexo(s: AppSession, id: string) {
  await lerAnexo(s, id);
  await executeStatement(
    'DELETE FROM chat_attachments WHERE id=? AND user_id=?',
    [id, s.user.id]
  );
}
