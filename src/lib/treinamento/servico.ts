import { randomUUID } from 'node:crypto';
import type { PoolConnection } from 'mysql2/promise';
import { z } from 'zod';
import type { AppSession } from '@/types/app-session';
import { HttpError } from '@/lib/http-error';
import { executeStatement, queryRows, withTransaction } from '@/lib/mysql/pool';
import { lerConfiguracaoDeIa } from '@/lib/ai/provedores-da-plataforma';
import {
  type Avaliacao,
  type EstadoDoTreinamento,
  exemplosDoTreino,
  MECANISMO,
  type Metricas,
  NOME_DO_MODELO_TREINAVEL,
  type NovaAvaliacao,
  type SessaoDeTreino,
} from './esquema';

const iso = (s: string | null) => (s ? s.replace(' ', 'T') + 'Z' : null);
const semBarra = (u: string) => u.trim().replace(/\/+$/, '');

function exigirAdministrador(s: AppSession) {
  if (s.user.role !== 'admin')
    throw new HttpError('Acesso restrito a administradores.', 403);
}

/** Chamada autenticada ao serviço de treinamento. */
async function chamarServico<T>(
  caminho: string,
  esquema: z.ZodType<T>,
  opcoes: { metodo?: string; corpo?: unknown; tempo?: number } = {}
): Promise<T> {
  const segredo = process.env.LYRA_TREINO_SEGREDO,
    endereco = process.env.LYRA_TREINO_URL;
  if (!segredo || segredo.length < 32 || !endereco)
    throw new HttpError(
      'O serviço de treinamento não está configurado (LYRA_TREINO_URL e LYRA_TREINO_SEGREDO).',
      503
    );
  let resposta: Response;
  try {
    resposta = await fetch(`${semBarra(endereco)}${caminho}`, {
      method: opcoes.metodo ?? 'GET',
      headers: {
        Authorization: `Bearer ${segredo}`,
        'Content-Type': 'application/json',
      },
      body:
        opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo),
      cache: 'no-store',
      signal: AbortSignal.timeout(opcoes.tempo ?? 15_000),
    });
  } catch {
    throw new HttpError(
      'O serviço de treinamento não respondeu. Confira se ele está em execução.',
      503
    );
  }
  const corpo: unknown = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    const detalhe =
      corpo && typeof corpo === 'object' && 'detail' in corpo
        ? String((corpo as { detail: unknown }).detail)
        : `HTTP ${resposta.status}`;
    throw new HttpError(
      `O serviço de treinamento recusou o pedido: ${detalhe}`,
      resposta.status === 409 || resposta.status === 422
        ? 409
        : resposta.status === 404
          ? 404
          : 502
    );
  }
  return esquema.parse(corpo);
}

const estadoDoServico = z.object({
  versaoAtiva: z.number(),
  minimo: z.number(),
  treinando: z.boolean(),
});
const tarefaDoServico = z.object({
  estado: z.enum(['fila', 'treinando', 'concluida', 'falhou']),
  versao: z.number().optional(),
  antes: z.unknown().optional(),
  depois: z.unknown().optional(),
  perdaFinal: z.number().nullable().optional(),
  erro: z.string().optional(),
});

/**
 * O treino só existe com o modelo treinável realmente conectado: ele precisa
 * ser o primeiro modelo da ordem de uso (o que responde o chat) e o serviço
 * precisa responder.
 */
async function conexao() {
  const endereco = process.env.LYRA_TREINO_URL;
  const configuracao = await lerConfiguracaoDeIa();
  const primeiro = configuracao.ordem.find((e) => e.tipo === 'modelo');
  const provedor =
    primeiro && primeiro.tipo === 'modelo'
      ? configuracao.provedores.find((p) => p.preset === primeiro.preset)
      : undefined;
  const esperado = endereco ? `${semBarra(endereco)}/v1` : null;
  if (
    !primeiro ||
    primeiro.tipo !== 'modelo' ||
    !provedor?.baseUrl ||
    !esperado ||
    semBarra(provedor.baseUrl) !== esperado ||
    primeiro.modelo !== NOME_DO_MODELO_TREINAVEL
  )
    return {
      conectado: false as const,
      motivo: `O treinamento exige o modelo treinável da Lyra como primeiro modelo da ordem em Admin → Modelos de IA (endereço ${esperado ?? 'LYRA_TREINO_URL/v1'}, modelo "${NOME_DO_MODELO_TREINAVEL}"). Sem esse modelo conectado, não há pesos para treinar.`,
      servico: null,
    };
  try {
    return {
      conectado: true as const,
      motivo: null,
      servico: await chamarServico('/treino', estadoDoServico),
    };
  } catch (e) {
    return {
      conectado: false as const,
      motivo: e instanceof Error ? e.message : 'Serviço indisponível.',
      servico: null,
    };
  }
}

type LinhaDaSessao = {
  id: string;
  status: SessaoDeTreino['estado'];
  started_at: string;
  started_by: string | null;
  ended_at: string | null;
  job_id: string | null;
  examples: number | null;
  model_version: number | null;
  applied_at: string | null;
  metrics: unknown;
  error_message: string | null;
  avaliacoes: number;
  nome: string | null;
};
const SELECIONAR_SESSOES = `SELECT s.*,(SELECT COUNT(*) FROM ai_training_feedback f WHERE f.session_id=s.id) avaliacoes,
  TRIM(CONCAT(COALESCE(p.first_name,''),' ',COALESCE(p.last_name,''))) nome
  FROM ai_training_sessions s LEFT JOIN profiles p ON p.id=s.started_by`;
function sessao(r: LinhaDaSessao): SessaoDeTreino {
  return {
    id: r.id,
    estado: r.status,
    iniciadaEm: iso(r.started_at)!,
    iniciadaPor: r.nome || null,
    encerradaEm: iso(r.ended_at),
    exemplos: r.examples === null ? null : Number(r.examples),
    versaoDoModelo: r.model_version === null ? null : Number(r.model_version),
    aplicadaEm: iso(r.applied_at),
    metricas:
      r.metrics === null
        ? null
        : ((typeof r.metrics === 'string'
            ? JSON.parse(r.metrics)
            : r.metrics) as Metricas),
    erro: r.error_message,
    avaliacoes: Number(r.avaliacoes),
  };
}
async function sessaoAberta(c?: PoolConnection, travar = false) {
  const [r] = await queryRows<LinhaDaSessao>(
    `${SELECIONAR_SESSOES} WHERE s.aberta=1${travar ? ' FOR UPDATE' : ''}`,
    [],
    c
  );
  return r ?? null;
}

/** Acompanha um treino em andamento e grava o resultado na sessão. */
async function acompanhar(r: LinhaDaSessao) {
  if (r.status !== 'treinando' || !r.job_id) return;
  let t: z.infer<typeof tarefaDoServico>;
  try {
    t = await chamarServico(
      `/treino/tarefas/${encodeURIComponent(r.job_id)}`,
      tarefaDoServico
    );
  } catch (e) {
    // Tarefa que o serviço não conhece (dados do serviço recriados) não
    // pode ficar "treinando" para sempre; serviço fora do ar, sim, espera.
    if (e instanceof HttpError && e.statusCode === 404)
      await executeStatement(
        "UPDATE ai_training_sessions SET status='falhou',error_message=? WHERE id=? AND status='treinando'",
        [
          'O serviço de treinamento não encontrou esta tarefa (os dados do serviço foram recriados). Envie o treino de novo.',
          r.id,
        ]
      );
    return;
  }
  if (t.estado === 'concluida' && t.versao)
    await executeStatement(
      "UPDATE ai_training_sessions SET status='aplicada',model_version=?,metrics=?,applied_at=UTC_TIMESTAMP(3),error_message=NULL WHERE id=? AND status='treinando'",
      [
        t.versao,
        JSON.stringify({
          antes: t.antes ?? null,
          depois: t.depois ?? null,
          perdaFinal: t.perdaFinal ?? null,
        }),
        r.id,
      ]
    );
  else if (t.estado === 'falhou')
    await executeStatement(
      "UPDATE ai_training_sessions SET status='falhou',error_message=? WHERE id=? AND status='treinando'",
      [(t.erro ?? 'O treino falhou.').slice(0, 400), r.id]
    );
}

export async function lerEstadoDoTreinamento(
  s: AppSession
): Promise<EstadoDoTreinamento> {
  exigirAdministrador(s);
  const aberta = await sessaoAberta();
  if (aberta) await acompanhar(aberta);
  const [c, linhas] = await Promise.all([
    conexao(),
    queryRows<LinhaDaSessao>(
      `${SELECIONAR_SESSOES} ORDER BY s.started_at DESC LIMIT 10`
    ),
  ]);
  const todas = linhas.map(sessao);
  const atual = todas.find(
    (x) => x.estado === 'ativa' || x.estado === 'treinando'
  );
  return {
    conectado: c.conectado,
    motivo: c.motivo,
    versaoAtiva: c.servico?.versaoAtiva ?? null,
    minimo: c.servico?.minimo ?? 4,
    mecanismo: MECANISMO,
    sessao: atual ?? null,
    historico: todas.filter((x) => x !== atual),
  };
}

/** On: abre a sessão e avisa o modelo conectado. */
export async function ativarTreinamento(s: AppSession) {
  exigirAdministrador(s);
  const c = await conexao();
  if (!c.conectado) throw new HttpError(c.motivo, 409);
  const id = randomUUID();
  await withTransaction(async (cx) => {
    if (await sessaoAberta(cx, true))
      throw new HttpError(
        'Já existe um treinamento ligado ou em andamento.',
        409
      );
    await cx.execute(
      'INSERT INTO ai_training_sessions(id,status,started_by) VALUES(?,?,?)',
      [id, 'ativa', s.user.id]
    );
  });
  try {
    await chamarServico('/treino/sessoes', z.unknown(), {
      metodo: 'POST',
      corpo: { sessao: id, aberta: true },
    });
  } catch (e) {
    await executeStatement('DELETE FROM ai_training_sessions WHERE id=?', [id]);
    throw e;
  }
  return lerEstadoDoTreinamento(s);
}

/**
 * Off: envia as avaliações salvas ao serviço, que treina e aplica a nova
 * versão para todos. Uma sessão que falhou pode ser reenviada.
 */
export async function desativarTreinamento(s: AppSession) {
  exigirAdministrador(s);
  const r = await withTransaction(async (cx) => {
    const r = await sessaoAberta(cx, true);
    const falha = r
      ? null
      : (
          await queryRows<LinhaDaSessao>(
            `${SELECIONAR_SESSOES} WHERE s.status='falhou' ORDER BY s.started_at DESC LIMIT 1 FOR UPDATE`,
            [],
            cx
          )
        )[0];
    const alvo = r ?? falha;
    if (!alvo || alvo.status === 'treinando')
      throw new HttpError(
        alvo
          ? 'O treino já está em andamento.'
          : 'O treinamento não está ligado.',
        409
      );
    return alvo;
  });
  const avaliacoes = await queryRows<{
    question: string;
    answer: string;
    rating: number;
    correction: string | null;
  }>(
    'SELECT question,answer,rating,correction FROM ai_training_feedback WHERE session_id=? ORDER BY created_at,id',
    [r.id]
  );
  const exemplos = exemplosDoTreino(
    avaliacoes.map((a) => ({
      pergunta: a.question,
      resposta: a.answer,
      nota: Number(a.rating) === 1 ? 1 : -1,
      correcao: a.correction,
    }))
  );
  const { tarefa } = await chamarServico(
    '/treino',
    z.object({ tarefa: z.string() }),
    { metodo: 'POST', corpo: { sessao: r.id, exemplos }, tempo: 30_000 }
  );
  await executeStatement(
    "UPDATE ai_training_sessions SET status='treinando',job_id=?,examples=?,ended_by=?,ended_at=UTC_TIMESTAMP(3),error_message=NULL WHERE id=?",
    [tarefa, exemplos.length, s.user.id, r.id]
  );
  await chamarServico('/treino/sessoes', z.unknown(), {
    metodo: 'POST',
    corpo: { sessao: r.id, aberta: false },
  }).catch(() => undefined);
  return lerEstadoDoTreinamento(s);
}

type LinhaDaAvaliacao = {
  id: string;
  turn_id: string;
  question: string;
  answer: string;
  rating: number;
  correction: string | null;
  version: number;
  updated_at: string;
};
const avaliacao = (r: LinhaDaAvaliacao): Avaliacao => ({
  id: r.id,
  turnoId: r.turn_id,
  pergunta: r.question,
  resposta: r.answer,
  nota: Number(r.rating) === 1 ? 1 : -1,
  correcao: r.correction,
  versao: Number(r.version),
  atualizadaEm: iso(r.updated_at)!,
});

/** Avaliações da sessão ligada (salvas na hora: recarga não perde nada). */
export async function listarAvaliacoes(s: AppSession): Promise<Avaliacao[]> {
  exigirAdministrador(s);
  const r = await sessaoAberta();
  if (!r) return [];
  return (
    await queryRows<LinhaDaAvaliacao>(
      'SELECT * FROM ai_training_feedback WHERE session_id=? ORDER BY created_at,id',
      [r.id]
    )
  ).map(avaliacao);
}

async function sessaoParaAvaliar(cx: PoolConnection) {
  const r = await sessaoAberta(cx, true);
  if (!r || r.status !== 'ativa')
    throw new HttpError('Ligue o Treinamento para avaliar respostas.', 409);
  return r;
}

/** Cria ou atualiza a avaliação de uma resposta do próprio administrador. */
export async function avaliarResposta(
  s: AppSession,
  p: NovaAvaliacao
): Promise<Avaliacao> {
  exigirAdministrador(s);
  return withTransaction(async (cx) => {
    const r = await sessaoParaAvaliar(cx);
    // Pergunta e resposta vêm do banco, nunca do navegador; só conversas do
    // próprio administrador entram no treino.
    const [turno] = await queryRows<{
      question: string;
      answer: string | null;
    }>(
      "SELECT question,answer FROM chat_turns WHERE id=? AND user_id=? AND status='concluido'",
      [p.turnoId, s.user.id],
      cx
    );
    if (!turno?.answer)
      throw new HttpError('Resposta não encontrada nas suas conversas.', 404);
    const correcao = p.correcao?.trim() ? p.correcao.trim() : null;
    await cx.execute(
      `INSERT INTO ai_training_feedback(id,session_id,turn_id,admin_id,question,answer,rating,correction)
       VALUES(?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE rating=VALUES(rating),correction=VALUES(correction),version=version+1`,
      [
        randomUUID(),
        r.id,
        p.turnoId,
        s.user.id,
        turno.question,
        turno.answer,
        p.nota,
        correcao,
      ]
    );
    const [linha] = await queryRows<LinhaDaAvaliacao>(
      'SELECT * FROM ai_training_feedback WHERE session_id=? AND turn_id=?',
      [r.id, p.turnoId],
      cx
    );
    return avaliacao(linha);
  });
}

async function encontrarAvaliacao(
  s: AppSession,
  id: string,
  cx: PoolConnection,
  sessaoId: string
) {
  const [linha] = await queryRows<LinhaDaAvaliacao>(
    'SELECT * FROM ai_training_feedback WHERE id=? AND admin_id=? AND session_id=? FOR UPDATE',
    [id, s.user.id, sessaoId],
    cx
  );
  if (!linha) throw new HttpError('Avaliação não encontrada.', 404);
  return linha;
}

export async function editarAvaliacao(
  s: AppSession,
  id: string,
  p: { versao: number; nota: 1 | -1; correcao: string | null }
) {
  exigirAdministrador(s);
  return withTransaction(async (cx) => {
    const r = await sessaoParaAvaliar(cx);
    const atual = await encontrarAvaliacao(s, id, cx, r.id);
    if (Number(atual.version) !== p.versao)
      throw new HttpError('A avaliação mudou em outra página. Atualize.', 409);
    await cx.execute(
      'UPDATE ai_training_feedback SET rating=?,correction=?,version=version+1 WHERE id=?',
      [p.nota, p.correcao?.trim() ? p.correcao.trim() : null, id]
    );
    return avaliacao(await encontrarAvaliacao(s, id, cx, r.id));
  });
}

export async function excluirAvaliacao(
  s: AppSession,
  id: string,
  versao: number
) {
  exigirAdministrador(s);
  await withTransaction(async (cx) => {
    const r = await sessaoParaAvaliar(cx);
    const atual = await encontrarAvaliacao(s, id, cx, r.id);
    if (Number(atual.version) !== versao)
      throw new HttpError('A avaliação mudou em outra página. Atualize.', 409);
    await cx.execute('DELETE FROM ai_training_feedback WHERE id=?', [id]);
  });
}
