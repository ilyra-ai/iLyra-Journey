import { selecionarAnexos } from '@/lib/anexos/servico';
import { listaDeTextos } from '@/lib/json-values';
import { partesDoBanco, partesDoChatSchema, type ParteDoChat } from './partes';
import { filtrarPaineisDoChat } from './painel';
import { metadadosDaImagem } from './imagens';
import type { PedidoDeImagemDoTurno } from './tipos';
import { randomUUID } from 'node:crypto';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';

import { HttpError } from '@/lib/http-error';
import {
  PADRAO_VOLTA_PARA_CASA,
  pediuVoltaParaCasa,
} from '@/lib/lyra/volta-para-casa';
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
  favorita: number;
  id: string;
  sequence_number: number;
  conversation_id: string;
  user_id: string;
  question: string;
  answer: string | null;
  response_parts: unknown;
  attachment_ids: unknown;
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
  antes: number | null = null,
  depois: number | null = null,
  alvo: string | null = null
): Promise<PaginaDaConversa> {
  const [conversa] = await queryRows<ConversaNoBanco>(
    'SELECT id, user_id, title, updated_at FROM chat_conversations WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  if (!conversa) throw new HttpError('Conversa não encontrada.', 404);
  let sequenciaAlvo: number | null = null;
  if (alvo) {
    const [mensagem] = await queryRows<{ sequence_number: number }>(
      'SELECT sequence_number FROM chat_turns WHERE id=? AND conversation_id=? AND user_id=?',
      [alvo, id, userId]
    );
    if (!mensagem)
      throw new HttpError('Mensagem não encontrada nesta conversa.', 404);
    sequenciaAlvo = Number(mensagem.sequence_number);
  }
  const sequencia = antes ?? depois ?? sequenciaAlvo;
  const comparacao = antes !== null ? '<' : depois !== null ? '>' : '<=';
  const linhas = await queryRows<TurnoNoBanco>(
    `SELECT id, sequence_number, question, answer, response_parts, attachment_ids, status, error_message, created_at,
       EXISTS(SELECT 1 FROM chat_favorites f WHERE f.turn_id=chat_turns.id AND f.user_id=chat_turns.user_id) AS favorita
       FROM chat_turns WHERE conversation_id = ? AND user_id = ?
       ${sequencia === null ? '' : `AND sequence_number ${comparacao} ?`}
       ORDER BY sequence_number ${depois !== null ? 'ASC' : 'DESC'} LIMIT 41`,
    sequencia === null ? [id, userId] : [id, userId, sequencia]
  );
  const pagina = linhas.slice(0, 40);
  if (depois === null) pagina.reverse();
  let proximoDepois: number | null =
    depois !== null && linhas.length > 40
      ? Number(pagina.at(-1)?.sequence_number)
      : null;
  if (alvo && pagina.length) {
    const ultima = Number(pagina.at(-1)?.sequence_number);
    const posteriores = await queryRows<{ sequence_number: number }>(
      'SELECT sequence_number FROM chat_turns WHERE conversation_id=? AND user_id=? AND sequence_number>? LIMIT 1',
      [id, userId, ultima]
    );
    if (posteriores.length) proximoDepois = ultima;
  }
  const imagens = new Map(
    (pagina.length
      ? await queryRows<Parameters<typeof metadadosDaImagem>[0]>(
          `SELECT i.turn_id, i.request_kind, i.status, i.provider_preset, i.model_name, i.width, i.height, i.error_message, i.deadline_at > UTC_TIMESTAMP(3) AS ativa FROM chat_generated_images i JOIN chat_turns t ON t.id = i.turn_id
     WHERE t.conversation_id = ? AND t.user_id = ? AND t.id IN (?)`,
          [id, userId, pagina.map((linha) => linha.id)]
        )
      : []
    ).map((linha) => [linha.turn_id, metadadosDaImagem(linha)])
  );
  return {
    conversa: resumo(conversa),
    turnos: await Promise.all(
      pagina.map(async (linha) => ({
        partes: await filtrarPaineisDoChat(
          userId,
          partesDoBanco(linha.response_parts)
        ),
        anexos: listaDeTextos(linha.attachment_ids),
        id: linha.id,
        favorita: Boolean(linha.favorita),
        imagem: imagens.get(linha.id) ?? null,
        sequencia: Number(linha.sequence_number),
        pergunta: linha.question,
        resposta: linha.answer,
        estado: linha.status,
        erro: linha.error_message,
        criadaEm: `${linha.created_at.replace(' ', 'T')}Z`,
      }))
    ),
    antes:
      depois === null && linhas.length > 40
        ? Number(pagina[0].sequence_number)
        : null,
    depois: proximoDepois,
  };
}

/** Uma repetição da mesma requisição concluída não gera nem cobra de novo. */
export async function respostaJaGravada(
  userId: string,
  pedido: PedidoComHistorico
) {
  if (pedido.regenerate) return null;
  const [turno] = await queryRows<TurnoNoBanco>(
    `SELECT question, answer, status, attachment_ids FROM chat_turns
      WHERE id = ? AND conversation_id = ? AND user_id = ?`,
    [pedido.turnId, pedido.conversationId, userId]
  );
  if (
    turno &&
    (turno.question !== pedido.query ||
      JSON.stringify(listaDeTextos(turno.attachment_ids)) !==
        JSON.stringify(pedido.anexos ?? []))
  ) {
    throw new HttpError('Esta mensagem já corresponde a outra pergunta.', 409);
  }
  return turno?.status === 'concluido' ? turno.answer : null;
}

export interface TurnoEmExecucao {
  conversationId: string;
  turnId: string;
  attemptId: string;
  contexto: string;
  voltaParaCasa: boolean;
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
      `SELECT id, conversation_id, user_id, question, status, attachment_ids,
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
    if (
      existente &&
      (existente.question !== pedido.query ||
        JSON.stringify(listaDeTextos(existente.attachment_ids)) !==
          JSON.stringify(pedido.anexos ?? []))
    ) {
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
    await selecionarAnexos(
      userId,
      pedido.conversationId,
      pedido.anexos ?? [],
      conexao
    );
    const attemptId = randomUUID();
    if (existente) {
      await conexao.execute(
        `UPDATE chat_turns SET status = 'processando', error_message = NULL,
          attempt_id = ?, updated_at = UTC_TIMESTAMP(3) WHERE id = ? AND user_id = ?`,
        [attemptId, pedido.turnId, userId]
      );
    } else {
      await conexao.execute(
        `INSERT INTO chat_turns (id, conversation_id, user_id, question, status, attempt_id, attachment_ids)
         VALUES (?, ?, ?, ?, 'processando', ?, ?)`,
        [
          pedido.turnId,
          pedido.conversationId,
          userId,
          pedido.query,
          attemptId,
          JSON.stringify(pedido.anexos ?? []),
        ]
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
         AND answer IS NOT NULL AND COALESCE(JSON_LENGTH(attachment_ids),0)=0
       ORDER BY sequence_number DESC LIMIT 8`,
      [pedido.conversationId, userId, pedido.turnId, pedido.turnId]
    );
    // A ativação vem do histórico integral do titular, não da janela de oito
    // mensagens enviada ao modelo. Ao refazer um turno antigo, só seus
    // antecedentes podem ativar o contexto, nunca mensagens posteriores.
    const [ativacoes] = await conexao.query<RowDataPacket[]>(
      `SELECT id FROM chat_turns
       WHERE conversation_id = ? AND user_id = ? AND status = 'concluido'
         AND sequence_number < (SELECT sequence_number FROM chat_turns WHERE id = ?)
         AND REGEXP_LIKE(question, ?, 'i') LIMIT 1`,
      [pedido.conversationId, userId, pedido.turnId, PADRAO_VOLTA_PARA_CASA]
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
      voltaParaCasa: pediuVoltaParaCasa(pedido.query) || ativacoes.length > 0,
    };
  });
}

export async function concluirTurno(
  userId: string,
  turno: TurnoEmExecucao,
  resposta: string,
  memoriaPrivada = false,
  imagem: PedidoDeImagemDoTurno | null = null,
  memoriaPermitida = true,
  partes: ParteDoChat[] = []
) {
  await withTransaction(async (conexao) => {
    const [fonte] = await queryRows<{ attachment_ids: unknown }>(
      'SELECT attachment_ids FROM chat_turns WHERE id=? AND user_id=? FOR UPDATE',
      [turno.turnId, userId],
      conexao
    );
    await selecionarAnexos(
      userId,
      turno.conversationId,
      listaDeTextos(fonte?.attachment_ids),
      conexao
    );
    const [resultado] = await conexao.execute<ResultSetHeader>(
      `UPDATE chat_turns SET answer = ?, response_parts = ?, status = 'concluido', error_message = NULL,
          memory_excluded = memory_excluded OR ?, updated_at = UTC_TIMESTAMP(3)
       WHERE id = ? AND user_id = ? AND attempt_id = ?`,
      [
        resposta,
        JSON.stringify(partesDoChatSchema.parse(partes)),
        memoriaPrivada,
        turno.turnId,
        userId,
        turno.attemptId,
      ]
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
    if (imagem)
      await conexao.execute(
        `INSERT IGNORE INTO chat_generated_images (turn_id, request_kind, status, prompt, attempt_id, deadline_at)
       VALUES (?, ?, 'pendente', ?, ?, UTC_TIMESTAMP(3))`,
        [turno.turnId, imagem.tipo, imagem.prompt, randomUUID()]
      );
    // A resposta e o relato entram na mesma transação. Refazer a resposta não
    // duplica o episódio e uma mensagem privada não participa da importação.
    if (memoriaPermitida)
      await conexao.execute(
        `INSERT IGNORE INTO memory_episodes (id, user_id, turn_id, content, reference_at, generation)
       SELECT ?, t.user_id, t.id, t.question, t.created_at, p.generation
       FROM chat_turns t JOIN memory_preferences p ON p.user_id = t.user_id
       WHERE t.id = ? AND t.user_id = ? AND t.memory_excluded = FALSE
         AND p.enabled = TRUE AND p.purge_pending = FALSE`,
        [randomUUID(), turno.turnId, userId]
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

/** Metadados da repetição idempotente, sempre limitados ao titular. */
export async function partesJaGravadas(userId: string, turnId: string) {
  const [linha] = await queryRows<{ response_parts: unknown }>(
    'SELECT response_parts FROM chat_turns WHERE id = ? AND user_id = ?',
    [turnId, userId]
  );
  return filtrarPaineisDoChat(userId, partesDoBanco(linha?.response_parts));
}
