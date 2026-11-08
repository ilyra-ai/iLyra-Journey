import { estaEmSilencio } from '@/lib/lembretes/horarios';
import { exigirGruposAtivos } from '@/lib/plataforma/funcionalidades';
import { resumoDoDescanso } from '@/lib/descanso/repositorio';
import type { PoolConnection } from 'mysql2/promise';
import type { AppSession } from '@/types/app-session';
import type { z } from 'zod';
import { queryRows, executeStatement, withTransaction } from '@/lib/mysql/pool';
import { HttpError } from '@/lib/http-error';
import { tempoDecorrido } from './relogio';
import type {
  inicioSchema,
  acaoSchema,
  percepcaoSchema,
  SessaoDeFoco,
  CentralDeFoco,
} from './esquema';
interface Linha {
  id: string;
  user_id: string;
  kind: SessaoDeFoco['tipo'];
  target_seconds: number;
  state: SessaoDeFoco['estado'];
  elapsed_ms: number;
  running_since: string | null;
  started_at: string;
  ended_at: string | null;
  perception: number | null;
  note: string | null;
  version: number;
}
const iso = (s: string) => s.replace(' ', 'T') + 'Z';
const fim = (r: Linha) => r.state === 'completed' || r.state === 'ended';
function converter(r: Linha, agora: Date): SessaoDeFoco {
  return {
    id: r.id,
    tipo: r.kind,
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
    percepcao: r.perception,
    nota: r.note,
    versao: Number(r.version),
  };
}
async function exigir(s: AppSession) {
  await exigirGruposAtivos(['rotinas_praticas']);
  if (!s.user.onboarding_completed)
    throw new HttpError('Conclua o cadastro antes de iniciar uma sessão.', 403);
}
async function titular(id: string, c: PoolConnection) {
  const linhas = await queryRows(
    'SELECT id FROM users WHERE id=? FOR UPDATE',
    [id],
    c
  );
  if (!linhas.length) throw new HttpError('Conta não encontrada.', 404);
}
async function linha(user: string, id: string, c: PoolConnection) {
  const [r] = await queryRows<Linha>(
    'SELECT * FROM focus_sessions WHERE id=? AND user_id=? FOR UPDATE',
    [id, user],
    c
  );
  if (!r) throw new HttpError('Sessão de foco não encontrada.', 404);
  return r;
}
function versao(r: Linha, v: number) {
  if (Number(r.version) !== v)
    throw new HttpError(
      'A sessão mudou em outra aba. Atualize antes de tentar novamente.',
      409
    );
}
export async function lerCentralDeFoco(
  s: AppSession,
  cursor: string | null = null,
  agora = new Date()
): Promise<CentralDeFoco> {
  await exigir(s);
  let antes: { started_at: string; id: string } | null = null;
  if (cursor) {
    const [r] = await queryRows<{ started_at: string; id: string }>(
      "SELECT started_at,id FROM focus_sessions WHERE id=? AND user_id=? AND state IN ('completed','ended')",
      [cursor, s.user.id]
    );
    if (!r) throw new HttpError('Página de histórico inválida.', 400);
    antes = r;
  }
  const [ativas, historico, [totais]] = await Promise.all([
    queryRows<Linha>(
      "SELECT * FROM focus_sessions WHERE user_id=? AND state IN ('running','paused') ORDER BY started_at DESC,id DESC LIMIT 1",
      [s.user.id]
    ),
    queryRows<Linha>(
      `SELECT * FROM focus_sessions WHERE user_id=? AND state IN ('completed','ended') ${antes ? 'AND (started_at<? OR (started_at=? AND id<?))' : ''} ORDER BY started_at DESC,id DESC LIMIT 21`,
      [
        s.user.id,
        ...(antes ? [antes.started_at, antes.started_at, antes.id] : []),
      ]
    ),
    queryRows<{
      focos: number;
      pausas: number;
      focoMs: number;
      pausaMs: number;
    }>(
      "SELECT COALESCE(SUM(kind='foco'),0) focos,COALESCE(SUM(kind='pausa'),0) pausas,COALESCE(SUM(IF(kind='foco',elapsed_ms,0)),0) focoMs,COALESCE(SUM(IF(kind='pausa',elapsed_ms,0)),0) pausaMs FROM focus_sessions WHERE user_id=? AND state IN ('completed','ended')",
      [s.user.id]
    ),
  ]);
  return {
    ativa: ativas[0] ? converter(ativas[0], agora) : null,
    historico: historico.slice(0, 20).map((r) => converter(r, agora)),
    proximo: historico.length > 20 ? historico[19].id : null,
    observadoEm: agora.toISOString(),
    totais: {
      focos: Number(totais.focos),
      pausas: Number(totais.pausas),
      focoMs: Number(totais.focoMs),
      pausaMs: Number(totais.pausaMs),
    },
  };
}
export async function iniciarFoco(
  s: AppSession,
  p: z.infer<typeof inicioSchema>,
  agora = new Date()
) {
  await exigir(s);
  return withTransaction(async (c) => {
    await titular(s.user.id, c);
    const [anterior] = await queryRows<Linha>(
      'SELECT * FROM focus_sessions WHERE id=?',
      [p.id],
      c
    );
    if (anterior) {
      if (anterior.user_id !== s.user.id)
        throw new HttpError('Pedido não encontrado.', 404);
      if (
        anterior.kind !== p.tipo ||
        Number(anterior.target_seconds) !== p.minutos * 60
      )
        throw new HttpError(
          'Este identificador já pertence a outra sessão.',
          409
        );
      return converter(anterior, agora);
    }
    const [ativa] = await queryRows(
      "SELECT id FROM focus_sessions WHERE user_id=? AND state IN ('running','paused') LIMIT 1",
      [s.user.id],
      c
    );
    if (ativa)
      throw new HttpError(
        'Encerre a sessão atual antes de iniciar outra.',
        409
      );
    await executeStatement(
      'INSERT INTO focus_sessions(id,user_id,kind,target_seconds,running_since,started_at) VALUES(?,?,?,?,?,?)',
      [p.id, s.user.id, p.tipo, p.minutos * 60, agora, agora],
      c
    );
    return converter(await linha(s.user.id, p.id, c), agora);
  });
}
export async function agirNoFoco(
  s: AppSession,
  id: string,
  p: z.infer<typeof acaoSchema>,
  agora = new Date()
) {
  await exigir(s);
  return withTransaction(async (c) => {
    await titular(s.user.id, c);
    const r = await linha(s.user.id, id, c);
    if (p.acao === 'encerrar' && fim(r)) return converter(r, agora);
    versao(r, p.versao);
    if (fim(r)) throw new HttpError('Esta sessão já foi encerrada.', 409);
    const ms = converter(r, agora).decorridoMs;
    let estado: Linha['state'],
      desde: Date | null = null,
      encerrada: Date | null = null;
    if (p.acao === 'pausar') {
      if (r.state !== 'running')
        throw new HttpError('A sessão já está pausada.', 409);
      estado = 'paused';
    } else if (p.acao === 'retomar') {
      if (r.state !== 'paused')
        throw new HttpError('A sessão já está em curso.', 409);
      if (ms >= Number(r.target_seconds) * 1000)
        throw new HttpError(
          'A duração escolhida foi alcançada. Encerre a sessão.',
          400
        );
      estado = 'running';
      desde = agora;
    } else {
      estado = ms >= Number(r.target_seconds) * 1000 ? 'completed' : 'ended';
      encerrada = agora;
    }
    await executeStatement(
      'UPDATE focus_sessions SET state=?,elapsed_ms=?,running_since=?,ended_at=?,version=version+1 WHERE id=? AND user_id=?',
      [estado, ms, desde, encerrada, id, s.user.id],
      c
    );
    return converter(await linha(s.user.id, id, c), agora);
  });
}
export async function perceberFoco(
  s: AppSession,
  id: string,
  p: z.infer<typeof percepcaoSchema>,
  agora = new Date()
) {
  await exigir(s);
  return withTransaction(async (c) => {
    await titular(s.user.id, c);
    const r = await linha(s.user.id, id, c);
    versao(r, p.versao);
    if (!fim(r))
      throw new HttpError(
        'Encerre a sessão antes de registrar sua percepção.',
        400
      );
    await executeStatement(
      'UPDATE focus_sessions SET perception=?,note=?,version=version+1 WHERE id=? AND user_id=?',
      [p.percepcao, p.nota || null, id, s.user.id],
      c
    );
    return converter(await linha(s.user.id, id, c), agora);
  });
}
export async function excluirFoco(s: AppSession, id: string, v: number) {
  await exigir(s);
  await withTransaction(async (c) => {
    await titular(s.user.id, c);
    const r = await linha(s.user.id, id, c);
    versao(r, v);
    if (!fim(r))
      throw new HttpError(
        'Encerre a sessão antes de remover seu histórico.',
        400
      );
    await executeStatement(
      'DELETE FROM focus_sessions WHERE id=? AND user_id=?',
      [id, s.user.id],
      c
    );
  });
}

/** Uma decisão de aviso por sessão, sem fila tardia; não encerra nem inventa uma prática. */
export async function reservarAviso(
  s: AppSession,
  id: string,
  agora = new Date()
) {
  await exigir(s);
  return withTransaction(async (c) => {
    await titular(s.user.id, c);
    const r = await linha(s.user.id, id, c);
    if (
      fim(r) ||
      r.state !== 'running' ||
      converter(r, agora).decorridoMs < Number(r.target_seconds) * 1000
    )
      return {
        permitido: false,
        motivo: 'O aviso só é avaliado ao alcançar a duração em curso.',
      };
    const [marcada] = await queryRows<{ alert_claimed_at: string | null }>(
      'SELECT alert_claimed_at FROM focus_sessions WHERE id=?',
      [id],
      c
    );
    if (marcada.alert_claimed_at)
      return { permitido: false, motivo: 'Aviso já conferido por outra aba.' };
    const [prefs] = await queryRows<{
      timezone: string;
      quiet_enabled: number;
      quiet_start: string;
      quiet_end: string;
      version: number;
    }>(
      'SELECT timezone,quiet_enabled,quiet_start,quiet_end,version FROM reminder_preferences WHERE user_id=?',
      [s.user.id],
      c
    );
    const silencio = prefs
      ? estaEmSilencio(agora, {
          fuso: prefs.timezone,
          silencioAtivo: Boolean(prefs.quiet_enabled),
          inicioSilencio: prefs.quiet_start,
          fimSilencio: prefs.quiet_end,
          versao: prefs.version,
        })
      : false;
    const descanso = await resumoDoDescanso(s.user.id, agora, c),
      pausado =
        descanso.atual && ['ativa', 'retorno'].includes(descanso.atual.estado);
    await executeStatement(
      'UPDATE focus_sessions SET alert_claimed_at=? WHERE id=? AND user_id=?',
      [agora, id, s.user.id],
      c
    );
    return {
      permitido: !silencio && !pausado,
      motivo: silencio
        ? 'Horário de silêncio respeitado.'
        : pausado
          ? 'Modo descanso respeitado.'
          : 'Aviso local autorizado.',
    };
  });
}
