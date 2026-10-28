import type { PoolConnection } from 'mysql2/promise';
import { queryRows } from '@/lib/mysql/pool';
import { somarDias } from '@/lib/acontecimentos/analise';
import { dataLocal } from '@/lib/astrology/tempo';
import {
  intervalosNeutros,
  contarDiasNeutros,
  estadoDoPeriodo,
  retornoDoPeriodo,
} from './calendario';
import type {
  PeriodoDeDescanso,
  ResumoDoDescanso,
  AdaptacaoDaMeta,
} from './esquema';
export type LinhaDoPeriodo = {
  id: string;
  user_id: string;
  start_date: string;
  planned_end: string | null;
  timezone: string;
  active_since: string | null;
  ended_date: string | null;
  ended_at: string | null;
  cancelled_at: string | null;
  return_days: 0 | 3 | 7 | 14;
  return_activity: PeriodoDeDescanso['atividade'];
  return_ended_date: string | null;
  return_ended_at: string | null;
  created_at: string;
  version: number;
};
const iso = (s: string | null) => (s ? s.replace(' ', 'T') + 'Z' : null);
export function periodoDoBanco(r: LinhaDoPeriodo): PeriodoDeDescanso {
  return {
    id: r.id,
    inicio: r.start_date,
    fim: r.planned_end,
    fuso: r.timezone,
    ativadaEm: iso(r.active_since),
    encerradaEm: iso(r.ended_at),
    dataEncerramento: r.ended_date,
    canceladaEm: iso(r.cancelled_at),
    retornoDias: Number(r.return_days) as PeriodoDeDescanso['retornoDias'],
    atividade: r.return_activity,
    retornoEncerradoEm: iso(r.return_ended_at),
    dataFimRetorno: r.return_ended_date,
    criadaEm: iso(r.created_at)!,
    versao: Number(r.version),
  };
}
export async function periodosRelevantes(
  userId: string,
  agora = new Date(),
  c?: PoolConnection
) {
  const rs = await queryRows<LinhaDoPeriodo>(
    "SELECT * FROM rest_periods WHERE user_id=? AND cancelled_at IS NULL AND COALESCE(ended_date,planned_end,'9999-12-31')>=? - INTERVAL 16 DAY ORDER BY created_at DESC,id DESC",
    [userId, agora.toISOString().slice(0, 10)],
    c
  );
  return rs.map(periodoDoBanco);
}
export async function resumoDoDescanso(
  userId: string,
  agora = new Date(),
  c?: PoolConnection
): Promise<ResumoDoDescanso> {
  const periodos = await periodosRelevantes(userId, agora, c),
    p = periodos.find((p) =>
      ['agendada', 'ativa', 'retorno'].includes(estadoDoPeriodo(p, agora))
    );
  if (!p) return { agora: agora.toISOString(), atual: null };
  const ret = retornoDoPeriodo(p);
  return {
    agora: agora.toISOString(),
    atual: {
      ...p,
      estado: estadoDoPeriodo(p, agora),
      hoje: dataLocal(agora, p.fuso),
      inicioRetorno: ret.inicio,
      fimRetorno: ret.fim,
    },
  };
}
export async function periodosParaSequencias(
  userId: string,
  hoje: string,
  c?: PoolConnection
) {
  const rs = await queryRows<LinhaDoPeriodo>(
    'SELECT * FROM rest_periods WHERE user_id=? AND cancelled_at IS NULL AND start_date<=? AND COALESCE(return_ended_date,DATE_ADD(COALESCE(ended_date,planned_end,?),INTERVAL return_days DAY))>=?',
    [userId, hoje, hoje, somarDias(hoje, -400)],
    c
  );
  return rs.map(periodoDoBanco);
}
export async function adaptacoesDasMetas(
  userId: string,
  hoje: string,
  agora = new Date(),
  c?: PoolConnection
): Promise<AdaptacaoDaMeta[]> {
  const rows = await queryRows<
    LinhaDoPeriodo & {
      goal_id: string;
      original_deadline: string;
      deadline: string | null;
    }
  >(
    'SELECT p.*,v.goal_id,v.original_deadline,g.deadline FROM rest_goal_links v JOIN rest_periods p ON p.id=v.period_id AND p.user_id=v.user_id JOIN goals g ON g.id=v.goal_id AND g.user_id=v.user_id WHERE v.user_id=? AND p.cancelled_at IS NULL ORDER BY p.start_date,p.id',
    [userId],
    c
  );
  const porMeta = new Map<
    string,
    { prazo: string; intervalos: [string, string][]; atual: boolean }
  >();
  for (const row of rows) {
    if (row.deadline !== row.original_deadline) continue;
    const p = periodoDoBanco(row),
      m = porMeta.get(row.goal_id) ?? {
        prazo: row.original_deadline,
        intervalos: [],
        atual: false,
      };
    m.intervalos.push(...intervalosNeutros(p, hoje));
    m.atual ||= ['ativa', 'retorno'].includes(estadoDoPeriodo(p, agora));
    porMeta.set(row.goal_id, m);
  }
  return [...porMeta].map(([id, m]) => {
    const diasNeutros = contarDiasNeutros(m.intervalos);
    return {
      id,
      prazoOriginal: m.prazo,
      prazoEfetivo: somarDias(m.prazo, diasNeutros),
      diasNeutros,
      emDescanso: m.atual,
    };
  });
}
