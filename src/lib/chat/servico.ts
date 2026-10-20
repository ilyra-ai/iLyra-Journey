import { randomUUID } from 'node:crypto';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';

import { HttpError } from '@/lib/http-error';
import { executeStatement, queryRows, withTransaction } from '@/lib/mysql/pool';
import type {
  EstadoDoTurno,
  PaginaDaConversa,
  PaginaDeConversas,
  PedidoComHistorico,
  ResumoDaConversa,
} from './tipos';

interface ConversaNoBanco extends RowDataPacket {
  id: string;
  user_id: string;
  title: string;
  updated_at: string;
}

interface TurnoNoBanco extends RowDataPacket {
  id: string;
  sequence_number: number;
  conversation_id: string;
  user_id: string;
  question: string;
  answer: string | null;
  status: EstadoDoTurno;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  em_execucao: number;
}

const esquemaDoCursor = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d{1,3})?$/),
  id: z.uuid(),
});

function resumo(linha: ConversaNoBanco): ResumoDaConversa {
  return {
    id: linha.id,
    titulo: linha.title,
    atualizadaEm: `${linha.updated_at.replace(' ', 'T')}Z`,
  };
}

export async function listarConversas(
  userId: string,
  limite: number,
  cursor: string | null
): Promise<PaginaDeConversas> {
  let anterior: z.infer<typeof esquemaDoCursor> | null = null;
  if (cursor) {
    try {
      anterior = esquemaDoCursor.parse(
        JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'))
      );
    } catch {
      throw new HttpError('O marcador do histórico não é válido.', 400);
    }
  }
  const linhas = await queryRows<ConversaNoBanco>(
    `SELECT id, user_id, title, updated_at FROM chat_conversations
     WHERE user_id = ?
       ${anterior ? 'AND (updated_at < ? OR (updated_at = ? AND id < ?))' : ''}
     ORDER BY updated_at DESC, id DESC LIMIT ?`,
    anterior
      ? [userId, anterior.data, anterior.data, anterior.id, limite + 1]
      : [userId, limite + 1]
  );
  const pagina = linhas.slice(0, limite);
  const ultima = pagina.at(-1);
  return {
    conversas: pagina.map(resumo),
    proximoCursor:
      linhas.length > limite && ultima
        ? Buffer.from(
            JSON.stringify({ data: ultima.updated_at, id: ultima.id })
          ).toString('base64url')
        : null,
  };
}

export async function lerConversa(
  userId: string,
  id: string,
  antes: number | null = null
): Promise<PaginaDaConversa> {
  const [conversa] = await queryRows<ConversaNoBanco>(
    'SELECT id, user_id, title, updated_at FROM chat_conversations WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  if (!conversa) throw new HttpError('Conversa não encontrada.', 404);
  const linhas = await queryRows<TurnoNoBanco>(
    `SELECT id, sequence_number, question, answer, status, error_message, created_at
       FROM chat_turns WHERE conversation_id = ? AND user_id = ?
       ${antes === null ? '' : 'AND sequence_number < ?'}
       ORDER BY sequence_number DESC LIMIT 41`,
    antes === null ? [id, userId] : [id, userId, antes]
  );
  const pagina = linhas.slice(0, 40).reverse();
  return {
    conversa: resumo(conversa),
    turnos: pagina.map((linha) => ({
      id: linha.id,
      sequencia: Number(linha.sequence_number),
      pergunta: linha.question,
      resposta: linha.answer,
      estado: linha.status,
      erro: linha.error_message,
      criadaEm: `${linha.created_at.replace(' ', 'T')}Z`,
    })),
    antes: linhas.length > 40 ? Number(pagina[0].sequence_number) : null,
  };
}

/** Uma repetição da mesma requisição concluída não gera nem cobra de novo. */
export async function respostaJaGravada(
  userId: string,
  pedido: PedidoComHistorico
) {
  if (pedido.regenerate) return null;
  const [turno] = await queryRows<TurnoNoBanco>(
    `SELECT question, answer, status FROM chat_turns
      WHERE id = ? AND conversation_id = ? AND user_id = ?`,
    [pedido.turnId, pedido.conversationId, userId]
  );
  if (turno && turno.question !== pedido.query) {
    throw new HttpError('Esta mensagem já corresponde a outra pergunta.', 409);
  }
  return turno?.status === 'concluido' ? turno.answer : null;
}

export interface TurnoEmExecucao {
  conversationId: string;
  turnId: string;
  attemptId: string;
  contexto: string;
}

export async function iniciarTurno(
  userId: string,
  pedido: PedidoComHistorico
): Promise<TurnoEmExecucao> {
  return withTransaction(async (conexao) => {
    const [conversas] = await conexao.query<ConversaNoBanco[]>(
      'SELECT id, user_id FROM chat_conversations WHERE id = ? FOR UPDATE',
      [pedido.conversationId]
    );
    if (conversas[0] && conversas[0].user_id !== userId) {
      throw new HttpError('Conversa não encontrada.', 404);
    }
    if (!conversas[0]) {
      if (pedido.regenerate)
        throw new HttpError('Conversa não encontrada.', 404);
      await conexao.execute(
        'INSERT INTO chat_conversations (id, user_id, title) VALUES (?, ?, ?)',
        [
          pedido.conversationId,
          userId,
          pedido.query.replace(/\s+/g, ' ').slice(0, 120),
        ]
      );
    }
    const [existentes] = await conexao.query<TurnoNoBanco[]>(
      `SELECT id, conversation_id, user_id, question, status,
              updated_at > UTC_TIMESTAMP(3) - INTERVAL 30 MINUTE AS em_execucao
         FROM chat_turns WHERE id = ? FOR UPDATE`,
      [pedido.turnId]
    );
    const existente = existentes[0];
    if (
      existente &&
      (existente.user_id !== userId ||
        existente.conversation_id !== pedido.conversationId)
    ) {
      throw new HttpError('Mensagem não encontrada.', 404);
    }
    if (existente && existente.question !== pedido.query) {
      throw new HttpError(
        'Esta mensagem já corresponde a outra pergunta.',
        409
      );
    }
    if (
      existente?.status === 'processando' &&
      Number(existente.em_execucao) === 1
    ) {
      throw new HttpError(
        'Esta resposta ainda está sendo preparada. Aguarde e recarregue a conversa.',
        409
      );
    }
    if (pedido.regenerate && !existente)
      throw new HttpError('Mensagem não encontrada.', 404);
    const attemptId = randomUUID();
    if (existente) {
      await conexao.execute(
        `UPDATE chat_turns SET status = 'processando', error_message = NULL,
          attempt_id = ?, updated_at = UTC_TIMESTAMP(3) WHERE id = ? AND user_id = ?`,
        [attemptId, pedido.turnId, userId]
      );
    } else {
      await conexao.execute(
        `INSERT INTO chat_turns (id, conversation_id, user_id, question, status, attempt_id)
         VALUES (?, ?, ?, ?, 'processando', ?)`,
        [pedido.turnId, pedido.conversationId, userId, pedido.query, attemptId]
      );
    }
    await conexao.execute(
      'UPDATE chat_conversations SET updated_at = UTC_TIMESTAMP(3) WHERE id = ? AND user_id = ?',
      [pedido.conversationId, userId]
    );
    // Janela recente limitada ao contexto do modelo; o histórico armazenado
    // permanece integral e pode ser paginado pela interface.
    const [anteriores] = await conexao.query<TurnoNoBanco[]>(
      `SELECT question, answer FROM chat_turns
       WHERE conversation_id = ? AND user_id = ? AND id <> ?
         AND sequence_number < (SELECT sequence_number FROM chat_turns WHERE id = ?)
         AND answer IS NOT NULL
       ORDER BY sequence_number DESC LIMIT 8`,
      [pedido.conversationId, userId, pedido.turnId, pedido.turnId]
    );
    const contexto: Array<{ pergunta: string; resposta: string }> = [];
    let caracteres = 0;
    for (const anterior of anteriores) {
      const tamanho = anterior.question.length + (anterior.answer?.length ?? 0);
      if (caracteres + tamanho > 12000) break;
      caracteres += tamanho;
      contexto.push({
        pergunta: anterior.question,
        resposta: anterior.answer ?? '',
      });
    }
    return {
      conversationId: pedido.conversationId,
      turnId: pedido.turnId,
      attemptId,
      contexto: contexto.length ? JSON.stringify(contexto.reverse()) : '',
    };
  });
}

export async function concluirTurno(
  userId: string,
  turno: TurnoEmExecucao,
  resposta: string
) {
  await withTransaction(async (conexao) => {
    const [resultado] = await conexao.execute<ResultSetHeader>(
      `UPDATE chat_turns SET answer = ?, status = 'concluido', error_message = NULL,
          updated_at = UTC_TIMESTAMP(3)
       WHERE id = ? AND user_id = ? AND attempt_id = ?`,
      [resposta, turno.turnId, userId, turno.attemptId]
    );
    if (resultado.affectedRows !== 1) {
      throw new HttpError(
        'Uma tentativa mais recente já substituiu esta resposta.',
        409
      );
    }
    await conexao.execute(
      'UPDATE chat_conversations SET updated_at = UTC_TIMESTAMP(3) WHERE id = ? AND user_id = ?',
      [turno.conversationId, userId]
    );
  });
}

export async function registrarFalhaDoTurno(
  userId: string,
  turno: TurnoEmExecucao,
  mensagem: string
) {
  await executeStatement(
    `UPDATE chat_turns SET status = 'erro', error_message = ?, updated_at = UTC_TIMESTAMP(3)
     WHERE id = ? AND user_id = ? AND attempt_id = ?`,
    [mensagem.slice(0, 500), turno.turnId, userId, turno.attemptId]
  );
}
