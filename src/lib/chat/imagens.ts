import { randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import {
  gerarImagemNoSegundoModelo,
  segundoModeloParaImagem,
} from '@/lib/ai/geracao-de-imagens';
import { lerConfiguracaoDeIa } from '@/lib/ai/provedores-da-plataforma';
import { HttpError } from '@/lib/http-error';
import { preferenciasDaMemoria } from '@/lib/memoria/servico';
import { executeStatement, queryRows, withTransaction } from '@/lib/mysql/pool';
import { consumeUsageQuota, requireFeatureEnabled } from '@/lib/plans/service';
import type { AppSession } from '@/types/app-session';
import type { ImagemDoTurno } from './tipos';

interface Linha extends RowDataPacket {
  turn_id: string;
  request_kind: ImagemDoTurno['tipo'];
  status: ImagemDoTurno['estado'];
  provider_preset: string | null;
  model_name: string | null;
  width: number | null;
  height: number | null;
  error_message: string | null;
  prompt: string;
  image_data: Buffer | null;
  memory_excluded: number;
  ativa: number;
}

export function metadadosDaImagem(linha: Linha): ImagemDoTurno {
  return {
    turnoId: linha.turn_id,
    tipo: linha.request_kind,
    estado:
      linha.status === 'gerando' && Number(linha.ativa) === 0
        ? 'erro'
        : linha.status,
    provedor: linha.provider_preset,
    modelo: linha.model_name,
    largura: linha.width,
    altura: linha.height,
    erro:
      linha.status === 'gerando' && Number(linha.ativa) === 0
        ? 'A geração foi interrompida. Tente novamente.'
        : linha.error_message,
  };
}

export async function lerImagemDoTurno(userId: string, turnId: string) {
  const [linha] = await queryRows<Linha>(
    `SELECT i.*, t.memory_excluded, i.deadline_at > UTC_TIMESTAMP(3) AS ativa FROM chat_generated_images i
     JOIN chat_turns t ON t.id = i.turn_id WHERE t.user_id = ? AND t.id = ?`,
    [userId, turnId]
  );
  if (!linha) throw new HttpError('Imagem não encontrada.', 404);
  return linha;
}

/** Cada tentativa tem trava, prazo e identificador: uma resposta atrasada não sobrescreve outra. */
export async function gerarImagemDoTurno(
  session: AppSession,
  turnId: string,
  privacyMode = false,
  buscar: typeof fetch = fetch
) {
  await requireFeatureEnabled(session, 'chat_images');
  const userId = session.user.id;
  const atual = await lerImagemDoTurno(userId, turnId);
  if (atual.status === 'pronta') return metadadosDaImagem(atual);
  const attempt = randomUUID();
  const executar = await withTransaction(async (db) => {
    const [linhas] = await db.query<Linha[]>(
      `SELECT i.*, t.memory_excluded, i.deadline_at > UTC_TIMESTAMP(3) AS ativa
       FROM chat_generated_images i JOIN chat_turns t ON t.id = i.turn_id
       WHERE i.turn_id = ? AND t.user_id = ? FOR UPDATE`,
      [turnId, userId]
    );
    const linha = linhas[0];
    if (!linha) throw new HttpError('Imagem não encontrada.', 404);
    if (
      linha.status === 'pronta' ||
      (linha.status === 'gerando' && linha.ativa)
    )
      return false;
    await db.execute(
      `UPDATE chat_generated_images SET status = 'gerando', attempt_id = ?,
      error_message = NULL, deadline_at = UTC_TIMESTAMP(3) + INTERVAL 11 MINUTE WHERE turn_id = ?`,
      [attempt, turnId]
    );
    return true;
  });
  if (!executar)
    return metadadosDaImagem(await lerImagemDoTurno(userId, turnId));
  try {
    if (privacyMode || atual.memory_excluded)
      throw new HttpError(
        'O Modo Privacidade não envia pedidos para modelos de imagens. Desative-o antes de enviar um novo pedido.',
        409
      );
    const config = await lerConfiguracaoDeIa();
    const segundo = segundoModeloParaImagem(config);
    const preferencias = await preferenciasDaMemoria(userId);
    if (!segundo.local && !preferencias?.allow_cloud)
      throw new HttpError(
        'Autorize o envio a provedores em nuvem nas preferências de privacidade antes de gerar a imagem.',
        403
      );
    await consumeUsageQuota({ session, featureKey: 'ai_chat_messages' });
    await executeStatement(
      'UPDATE chat_generated_images SET provider_preset = ?, model_name = ? WHERE turn_id = ? AND attempt_id = ?',
      [segundo.preset, segundo.conexao.modelo, turnId, attempt]
    );
    const imagem = await gerarImagemNoSegundoModelo(
      config,
      atual.prompt,
      buscar
    );
    await executeStatement(
      `UPDATE chat_generated_images SET status = 'pronta', image_data = ?,
      mime_type = ?, width = ?, height = ?, error_message = NULL WHERE turn_id = ? AND attempt_id = ?`,
      [
        imagem.bytes,
        imagem.tipo,
        imagem.largura,
        imagem.altura,
        turnId,
        attempt,
      ]
    );
  } catch (erro) {
    const mensagem =
      erro instanceof HttpError
        ? erro.message
        : 'O segundo modelo não concluiu a imagem. Confira se ele oferece geração de imagens, a conexão e os limites do provedor; depois tente novamente.';
    await executeStatement(
      `UPDATE chat_generated_images SET status = 'erro', error_message = ?
      WHERE turn_id = ? AND attempt_id = ?`,
      [mensagem.slice(0, 500), turnId, attempt]
    );
  }
  return metadadosDaImagem(await lerImagemDoTurno(userId, turnId));
}
