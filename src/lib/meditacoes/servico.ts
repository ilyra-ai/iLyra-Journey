import type { PoolConnection } from 'mysql2/promise';
import type { z } from 'zod';
import type { AppSession } from '@/types/app-session';
import { HttpError } from '@/lib/http-error';
import { executeStatement, queryRows, withTransaction } from '@/lib/mysql/pool';
import { requireFeatureEnabled } from '@/lib/plans/service';
import { contextoDoDiario } from '@/lib/acontecimentos/servico';
import { tempoDecorrido } from '@/lib/foco/relogio';
import { somarMinutosDeMeditacao } from '@/lib/metricas/gravacao';
import { praticaPorId } from './catalogo';
import type {
  acaoSchema,
  inicioSchema,
  CentralDeMeditacoes,
  SessaoDeMeditacao,
} from './esquema';

interface Linha {
  id: string;
  user_id: string;
  practice_id: string;
  practice_version: number;
  target_seconds: number;
  state: SessaoDeMeditacao['estado'];
  elapsed_ms: number;
  running_since: string | null;
  started_at: string;
  ended_at: string | null;
  local_date: string;
  minutes_due: number | null;
  minutes_logged: number | null;
  version: number;
}
const iso = (s: string) => s.replace(' ', 'T') + 'Z';
const encerrada = (r: Linha) => r.state === 'completed' || r.state === 'ended';

function converter(r: Linha, agora: Date): SessaoDeMeditacao {
  const p = praticaPorId(r.practice_id);
  return {
    id: r.id,
    pratica: r.practice_id,
    // Uma prática retirada do catálogo continua identificada no histórico.
    titulo: p?.titulo ?? 'Prática guiada',
    finalidade: p?.finalidade ?? null,
    versaoDaPratica: Number(r.practice_version),
    alvoSegundos: Number(r.target_seconds),
    estado: r.state,
    decorridoMs:
      r.state === 'running'
        ? tempoDecorrido(
            Number(r.elapsed_ms),
            r.running_since,
            agora,
            Number(r.target_seconds)
          )
        : Number(r.elapsed_ms),
    iniciadaEm: iso(r.started_at),
    encerradaEm: r.ended_at ? iso(r.ended_at) : null,
    dataLocal: r.local_date,
    minutosRegistrados:
      r.minutes_logged === null ? null : Number(r.minutes_logged),
    versao: Number(r.version),
  };
}
async function sessao(s: AppSession) {
  await requireFeatureEnabled(s, 'guided_breathing');
}
async function titular(id: string, c: PoolConnection) {
  const [u] = await queryRows(
    'SELECT id FROM users WHERE id=? FOR UPDATE',
    [id],
    c
  );
  if (!u) throw new HttpError('Conta não encontrada.', 404);
}
async function linha(user: string, id: string, c: PoolConnection) {
  const [r] = await queryRows<Linha>(
    'SELECT * FROM meditation_sessions WHERE id=? AND user_id=? FOR UPDATE',
    [id, user],
    c
  );
  if (!r) throw new HttpError('Sessão não encontrada.', 404);
  return r;
}

export async function lerCentralDeMeditacoes(
  s: AppSession,
  agora = new Date()
): Promise<CentralDeMeditacoes> {
  await sessao(s);
  const [ativas, historico, [totais]] = await Promise.all([
    queryRows<Linha>(
      "SELECT * FROM meditation_sessions WHERE user_id=? AND state IN ('running','paused') ORDER BY started_at DESC,id DESC LIMIT 1",
      [s.user.id]
    ),
    queryRows<Linha>(
      "SELECT * FROM meditation_sessions WHERE user_id=? AND state IN ('completed','ended') ORDER BY started_at DESC,id DESC LIMIT 20",
      [s.user.id]
    ),
    queryRows<{ sessoes: number; concluidas: number; minutos: number }>(
      "SELECT COUNT(*) sessoes,COALESCE(SUM(state='completed'),0) concluidas,COALESCE(SUM(minutes_logged),0) minutos FROM meditation_sessions WHERE user_id=? AND state IN ('completed','ended')",
      [s.user.id]
    ),
  ]);
  return {
    ativa: ativas[0] ? converter(ativas[0], agora) : null,
    historico: historico.map((r) => converter(r, agora)),
    totais: {
      sessoes: Number(totais.sessoes),
      concluidas: Number(totais.concluidas),
      minutos: Number(totais.minutos),
    },
    observadoEm: agora.toISOString(),
  };
}

export async function iniciarMeditacao(
  s: AppSession,
  p: z.infer<typeof inicioSchema>,
  agora = new Date()
) {
  await sessao(s);
  const pratica = praticaPorId(p.pratica);
  if (!pratica) throw new HttpError('Prática não encontrada.', 404);
  if (pratica.versao !== p.versao)
    throw new HttpError(
      'O roteiro desta prática foi atualizado. Atualize a página para ver a versão atual.',
      409
    );
  const ctx = await contextoDoDiario(s.user.id, agora);
  return withTransaction(async (c) => {
    await titular(s.user.id, c);
    const [anterior] = await queryRows<Linha>(
      'SELECT * FROM meditation_sessions WHERE id=?',
      [p.id],
      c
    );
    if (anterior) {
      if (anterior.user_id !== s.user.id)
        throw new HttpError('Pedido não encontrado.', 404);
      if (
        anterior.practice_id !== p.pratica ||
        Number(anterior.practice_version) !== p.versao
      )
        throw new HttpError(
          'Este identificador já pertence a outra sessão.',
          409
        );
      return converter(anterior, agora);
    }
    const [ativa] = await queryRows(
      "SELECT id FROM meditation_sessions WHERE user_id=? AND state IN ('running','paused') LIMIT 1",
      [s.user.id],
      c
    );
    if (ativa)
      throw new HttpError(
        'Conclua ou interrompa a prática atual antes de iniciar outra.',
        409
      );
    await executeStatement(
      'INSERT INTO meditation_sessions(id,user_id,practice_id,practice_version,target_seconds,running_since,started_at,local_date) VALUES(?,?,?,?,?,?,?,?)',
      [
        p.id,
        s.user.id,
        pratica.id,
        pratica.versao,
        pratica.minutos * 60,
        agora,
        agora,
        ctx.hoje,
      ],
      c
    );
    return converter(await linha(s.user.id, p.id, c), agora);
  });
}

/**
 * Soma os minutos devidos à meditação do dia uma única vez. A reserva é
 * atômica (minutes_logged nulo → valor devido); se a soma falhar, a reserva é
 * desfeita para que um novo encerramento conclua o registro sem duplicar.
 */
async function registrarMinutos(userId: string, id: string) {
  const [r] = await queryRows<Linha>(
    'SELECT * FROM meditation_sessions WHERE id=? AND user_id=?',
    [id, userId]
  );
  if (!r || r.minutes_logged !== null || r.minutes_due === null) return;
  const devidos = Number(r.minutes_due);
  const reserva = await executeStatement(
    'UPDATE meditation_sessions SET minutes_logged=? WHERE id=? AND user_id=? AND minutes_logged IS NULL',
    [devidos, id, userId]
  );
  if (reserva.affectedRows !== 1 || devidos === 0) return;
  try {
    await somarMinutosDeMeditacao(userId, r.local_date, devidos);
  } catch (e) {
    await executeStatement(
      'UPDATE meditation_sessions SET minutes_logged=NULL WHERE id=? AND user_id=?',
      [id, userId]
    );
    throw e;
  }
}

export async function agirNaMeditacao(
  s: AppSession,
  id: string,
  p: z.infer<typeof acaoSchema>,
  agora = new Date()
) {
  await sessao(s);
  const resultado = await withTransaction(async (c) => {
    await titular(s.user.id, c);
    const r = await linha(s.user.id, id, c);
    // Um segundo encerramento confirma o primeiro, sem somar tempo de novo.
    if (p.acao === 'encerrar' && encerrada(r)) return r;
    if (Number(r.version) !== p.versao)
      throw new HttpError(
        'A prática mudou em outra aba. Atualize antes de tentar novamente.',
        409
      );
    if (encerrada(r)) throw new HttpError('Esta prática já terminou.', 409);
    const ms = converter(r, agora).decorridoMs,
      alvo = Number(r.target_seconds) * 1000;
    let estado: Linha['state'],
      desde: Date | null = null,
      fim: Date | null = null,
      devidos: number | null = null;
    if (p.acao === 'pausar') {
      if (r.state !== 'running')
        throw new HttpError('A prática já está pausada.', 409);
      estado = 'paused';
    } else if (p.acao === 'retomar') {
      if (r.state !== 'paused')
        throw new HttpError('A prática já está em andamento.', 409);
      if (ms >= alvo)
        throw new HttpError(
          'A duração da prática foi alcançada. Conclua a prática.',
          400
        );
      estado = 'running';
      desde = agora;
    } else {
      estado = ms >= alvo ? 'completed' : 'ended';
      fim = agora;
      // Só minutos inteiros efetivamente realizados entram na meditação.
      devidos = Math.floor(ms / 60000);
    }
    await executeStatement(
      'UPDATE meditation_sessions SET state=?,elapsed_ms=?,running_since=?,ended_at=?,minutes_due=COALESCE(?,minutes_due),version=version+1 WHERE id=? AND user_id=?',
      [estado, ms, desde, fim, devidos, id, s.user.id],
      c
    );
    return linha(s.user.id, id, c);
  });
  if (encerrada(resultado)) await registrarMinutos(s.user.id, id);
  const [atual] = await queryRows<Linha>(
    'SELECT * FROM meditation_sessions WHERE id=? AND user_id=?',
    [id, s.user.id]
  );
  return converter(atual, agora);
}
