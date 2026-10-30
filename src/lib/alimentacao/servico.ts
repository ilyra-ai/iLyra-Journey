import { createHash } from 'node:crypto';
import type { PoolConnection } from 'mysql2/promise';
import type { AppSession } from '@/types/app-session';
import { HttpError } from '@/lib/http-error';
import { executeStatement, queryRows, withTransaction } from '@/lib/mysql/pool';
import { requireFeatureEnabled } from '@/lib/plans/service';
import { contextoDoDiario } from '@/lib/acontecimentos/servico';
import { somarDias } from '@/lib/acontecimentos/analise';
import { processarAnexo } from '@/lib/anexos/servico';
import {
  LIMITE_POR_DIA,
  type DadosDaRefeicao,
  type DiaDoDiario,
  type EdicaoDaRefeicao,
  type Refeicao,
} from './esquema';

type Linha = {
  id: string;
  user_id: string;
  entry_date: string;
  entry_time: string;
  kind: Refeicao['tipo'];
  description: string;
  portion_estimate: Refeicao['porcao'];
  perception: number | null;
  note: string;
  version: number;
  updated_at: string;
  photo_bytes?: number | null;
  photo_sha?: string | null;
};
const COLUNAS =
  'e.id,e.user_id,e.entry_date,e.entry_time,e.kind,e.description,e.portion_estimate,e.perception,e.note,e.version,e.updated_at,p.byte_size photo_bytes,p.sha256 photo_sha';
const iso = (s: string) => s.replace(' ', 'T') + 'Z';
function converter(r: Linha): Refeicao {
  return {
    id: r.id,
    data: r.entry_date,
    hora: r.entry_time,
    tipo: r.kind,
    descricao: r.description,
    porcao: r.portion_estimate,
    percepcao: r.perception === null ? null : Number(r.perception),
    nota: r.note,
    foto:
      r.photo_sha && r.photo_bytes
        ? { bytes: Number(r.photo_bytes), assinatura: r.photo_sha.slice(0, 16) }
        : null,
    versao: Number(r.version),
    atualizadaEm: iso(r.updated_at),
  };
}

/** Diário alimentar: registro manual do dia e histórico do plano. */
export async function autorizarDiario(s: AppSession) {
  await requireFeatureEnabled(s, 'daily_checkin');
  await requireFeatureEnabled(s, 'metrics_history_days');
}
async function titular(userId: string, c: PoolConnection) {
  const [u] = await queryRows(
    'SELECT id FROM users WHERE id=? FOR UPDATE',
    [userId],
    c
  );
  if (!u) throw new HttpError('Conta não encontrada.', 404);
}
async function encontrar(
  userId: string,
  id: string,
  c?: PoolConnection,
  travar = false
) {
  const [r] = await queryRows<Linha>(
    `SELECT ${COLUNAS} FROM meal_entries e LEFT JOIN meal_photos p ON p.entry_id=e.id AND p.user_id=e.user_id WHERE e.id=? AND e.user_id=?${travar ? ' FOR UPDATE' : ''}`,
    [id, userId],
    c
  );
  if (!r) throw new HttpError('Registro não encontrado.', 404);
  return r;
}
function exigirData(data: string, ctx: { hoje: string; corte: string | null }) {
  if (data > ctx.hoje)
    throw new HttpError('Escolha uma data até o dia local de hoje.', 400);
  if (ctx.corte && data < ctx.corte)
    throw new HttpError(
      'Este dia está fora do histórico disponível no seu plano.',
      403
    );
}
function conferirVersao(atual: number, recebida: number) {
  if (Number(atual) !== recebida)
    throw new HttpError(
      'O registro mudou em outra página. Atualize antes de tentar novamente.',
      409
    );
}

export async function lerDia(
  s: AppSession,
  data: string | null,
  agora = new Date()
): Promise<DiaDoDiario> {
  await autorizarDiario(s);
  const ctx = await contextoDoDiario(s.user.id, agora),
    dia = data ?? ctx.hoje;
  exigirData(dia, ctx);
  const inicioDosDias = [somarDias(ctx.hoje, -30), ctx.corte ?? '']
    .sort()
    .at(-1)!;
  const [linhas, dias] = await Promise.all([
    queryRows<Linha>(
      `SELECT ${COLUNAS} FROM meal_entries e LEFT JOIN meal_photos p ON p.entry_id=e.id AND p.user_id=e.user_id WHERE e.user_id=? AND e.entry_date=? ORDER BY e.entry_time,e.created_at,e.id`,
      [s.user.id, dia]
    ),
    queryRows<{ entry_date: string; total: number }>(
      'SELECT entry_date,COUNT(*) total FROM meal_entries WHERE user_id=? AND entry_date BETWEEN ? AND ? GROUP BY entry_date ORDER BY entry_date DESC',
      [s.user.id, inicioDosDias, ctx.hoje]
    ),
  ]);
  return {
    hoje: ctx.hoje,
    corte: ctx.corte,
    fuso: ctx.fuso,
    data: dia,
    refeicoes: linhas.map(converter),
    dias: dias.map((d) => ({ data: d.entry_date, total: Number(d.total) })),
  };
}

async function gravarFoto(
  userId: string,
  id: string,
  foto: { nome: string; tipo: string; bytes: Buffer },
  c: PoolConnection
) {
  // Mesma validação e normalização dos anexos privados (tarefa 127): somente
  // PNG, JPEG ou WebP estáticos, convertidos em PNG sem metadados.
  const p = await processarAnexo(foto.nome, foto.tipo, foto.bytes);
  if (p.tipo !== 'image/png')
    throw new HttpError('Envie uma foto PNG, JPEG ou WebP.', 415);
  await executeStatement(
    'INSERT INTO meal_photos(entry_id,user_id,mime_type,byte_size,sha256,file_data) VALUES(?,?,?,?,?,?) AS nova ON DUPLICATE KEY UPDATE mime_type=nova.mime_type,byte_size=nova.byte_size,sha256=nova.sha256,file_data=nova.file_data,created_at=CURRENT_TIMESTAMP(3)',
    [
      id,
      userId,
      p.tipo,
      p.bytes.length,
      createHash('sha256').update(p.bytes).digest('hex'),
      p.bytes,
    ],
    c
  );
}

export async function criarRefeicao(
  s: AppSession,
  p: DadosDaRefeicao,
  foto: { nome: string; tipo: string; bytes: Buffer } | null,
  agora = new Date()
) {
  await autorizarDiario(s);
  const ctx = await contextoDoDiario(s.user.id, agora);
  if (!p.descricao && !foto)
    throw new HttpError(
      'Descreva o que comeu ou bebeu ou adicione uma foto.',
      400
    );
  return withTransaction(async (c) => {
    await titular(s.user.id, c);
    const [existente] = await queryRows<Linha>(
      'SELECT * FROM meal_entries WHERE id=? FOR UPDATE',
      [p.id],
      c
    );
    if (existente) {
      if (existente.user_id !== s.user.id)
        throw new HttpError('Registro não encontrado.', 404);
      if (
        existente.entry_date !== p.data ||
        existente.entry_time !== p.hora ||
        existente.kind !== p.tipo ||
        existente.description !== p.descricao
      )
        throw new HttpError(
          'Este pedido já foi usado para outro registro.',
          409
        );
      return {
        refeicao: converter(await encontrar(s.user.id, p.id, c)),
        criada: false,
      };
    }
    exigirData(p.data, ctx);
    const [n] = await queryRows<{ total: number }>(
      'SELECT COUNT(*) total FROM meal_entries WHERE user_id=? AND entry_date=?',
      [s.user.id, p.data],
      c
    );
    if (Number(n.total) >= LIMITE_POR_DIA)
      throw new HttpError(
        `Este dia já tem ${LIMITE_POR_DIA} registros. Edite ou exclua um para registrar outro.`,
        409
      );
    await executeStatement(
      'INSERT INTO meal_entries(id,user_id,entry_date,entry_time,kind,description,portion_estimate,perception,note,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
      [
        p.id,
        s.user.id,
        p.data,
        p.hora,
        p.tipo,
        p.descricao,
        p.porcao,
        p.percepcao,
        p.nota,
        agora,
        agora,
      ],
      c
    );
    if (foto) await gravarFoto(s.user.id, p.id, foto, c);
    return {
      refeicao: converter(await encontrar(s.user.id, p.id, c)),
      criada: true,
    };
  });
}

export async function editarRefeicao(
  s: AppSession,
  id: string,
  p: EdicaoDaRefeicao,
  agora = new Date()
) {
  await autorizarDiario(s);
  const ctx = await contextoDoDiario(s.user.id, agora);
  return withTransaction(async (c) => {
    await titular(s.user.id, c);
    const r = await encontrar(s.user.id, id, c, true);
    conferirVersao(r.version, p.versao);
    exigirData(r.entry_date, ctx);
    exigirData(p.data, ctx);
    if (p.data !== r.entry_date) {
      const [n] = await queryRows<{ total: number }>(
        'SELECT COUNT(*) total FROM meal_entries WHERE user_id=? AND entry_date=?',
        [s.user.id, p.data],
        c
      );
      if (Number(n.total) >= LIMITE_POR_DIA)
        throw new HttpError(
          `O dia escolhido já tem ${LIMITE_POR_DIA} registros.`,
          409
        );
    }
    if (!p.descricao && !r.photo_sha)
      throw new HttpError(
        'Descreva o que comeu ou bebeu ou mantenha uma foto.',
        400
      );
    await executeStatement(
      'UPDATE meal_entries SET entry_date=?,entry_time=?,kind=?,description=?,portion_estimate=?,perception=?,note=?,version=version+1,updated_at=? WHERE id=? AND user_id=?',
      [
        p.data,
        p.hora,
        p.tipo,
        p.descricao,
        p.porcao,
        p.percepcao,
        p.nota,
        agora,
        id,
        s.user.id,
      ],
      c
    );
    return converter(await encontrar(s.user.id, id, c));
  });
}

export async function excluirRefeicao(
  s: AppSession,
  id: string,
  versao: number,
  agora = new Date()
) {
  await autorizarDiario(s);
  const ctx = await contextoDoDiario(s.user.id, agora);
  await withTransaction(async (c) => {
    await titular(s.user.id, c);
    const r = await encontrar(s.user.id, id, c, true);
    conferirVersao(r.version, versao);
    exigirData(r.entry_date, ctx);
    await executeStatement(
      'DELETE FROM meal_entries WHERE id=? AND user_id=?',
      [id, s.user.id],
      c
    );
  });
}

export async function trocarFoto(
  s: AppSession,
  id: string,
  versao: number,
  foto: { nome: string; tipo: string; bytes: Buffer },
  agora = new Date()
) {
  await autorizarDiario(s);
  const ctx = await contextoDoDiario(s.user.id, agora);
  return withTransaction(async (c) => {
    await titular(s.user.id, c);
    const r = await encontrar(s.user.id, id, c, true);
    conferirVersao(r.version, versao);
    exigirData(r.entry_date, ctx);
    await gravarFoto(s.user.id, id, foto, c);
    await executeStatement(
      'UPDATE meal_entries SET version=version+1,updated_at=? WHERE id=? AND user_id=?',
      [agora, id, s.user.id],
      c
    );
    return converter(await encontrar(s.user.id, id, c));
  });
}

export async function removerFoto(
  s: AppSession,
  id: string,
  versao: number,
  agora = new Date()
) {
  await autorizarDiario(s);
  const ctx = await contextoDoDiario(s.user.id, agora);
  return withTransaction(async (c) => {
    await titular(s.user.id, c);
    const r = await encontrar(s.user.id, id, c, true);
    conferirVersao(r.version, versao);
    exigirData(r.entry_date, ctx);
    if (!r.photo_sha) throw new HttpError('Este registro não tem foto.', 404);
    if (!r.description)
      throw new HttpError(
        'Descreva o que comeu ou bebeu antes de remover a única foto.',
        400
      );
    await executeStatement(
      'DELETE FROM meal_photos WHERE entry_id=? AND user_id=?',
      [id, s.user.id],
      c
    );
    await executeStatement(
      'UPDATE meal_entries SET version=version+1,updated_at=? WHERE id=? AND user_id=?',
      [agora, id, s.user.id],
      c
    );
    return converter(await encontrar(s.user.id, id, c));
  });
}

export async function lerFoto(s: AppSession, id: string, agora = new Date()) {
  await autorizarDiario(s);
  const ctx = await contextoDoDiario(s.user.id, agora);
  const [r] = await queryRows<{
    file_data: Buffer;
    mime_type: string;
    entry_date: string;
  }>(
    'SELECT p.file_data,p.mime_type,e.entry_date FROM meal_photos p JOIN meal_entries e ON e.id=p.entry_id AND e.user_id=p.user_id WHERE p.entry_id=? AND p.user_id=?',
    [id, s.user.id]
  );
  if (!r) throw new HttpError('Foto não encontrada.', 404);
  exigirData(r.entry_date, ctx);
  return { dados: r.file_data, tipo: r.mime_type };
}
