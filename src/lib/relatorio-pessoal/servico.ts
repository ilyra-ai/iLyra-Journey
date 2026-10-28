import { createHash } from 'node:crypto';
import type { AppSession } from '@/types/app-session';
import { HttpError } from '@/lib/http-error';
import { queryRows, withTransaction } from '@/lib/mysql/pool';
import { contaTemRecurso, requireFeatureEnabled } from '@/lib/plans/service';
import { contextoDoDiario } from '@/lib/acontecimentos/servico';
import { mediana, somarDias } from '@/lib/acontecimentos/analise';
import {
  CAMPOS_DO_REGISTRO,
  valorDoRelatorio,
  unidadeDoCampo,
  type OpcoesDoRelatorio,
  type RelatorioPessoal,
  type Selecao,
  type DiaDoRelatorio,
} from './esquema';
export async function opcoesDoRelatorio(
  s: AppSession,
  agora = new Date()
): Promise<OpcoesDoRelatorio> {
  await requireFeatureEnabled(s, 'metrics_history_days');
  const [ctx, metricas, reflexoes, acontecimentos] = await Promise.all([
    contextoDoDiario(s.user.id, agora),
    contaTemRecurso(s.user.id, 'daily_checkin'),
    contaTemRecurso(s.user.id, 'evening_reflection'),
    contaTemRecurso(s.user.id, 'daily_checkin'),
  ]);
  return {
    hoje: ctx.hoje,
    corte: ctx.corte,
    fuso: ctx.fuso,
    metricas,
    reflexoes,
    acontecimentos,
  };
}
export async function montarRelatorio(
  s: AppSession,
  p: Selecao,
  agora = new Date()
): Promise<RelatorioPessoal> {
  const ctx = await opcoesDoRelatorio(s, agora);
  if (p.fim > ctx.hoje)
    throw new HttpError('Escolha datas até o dia local de hoje.', 400);
  if (ctx.corte && p.inicio < ctx.corte)
    throw new HttpError(
      'O período está fora do histórico disponível no plano.',
      403
    );
  if (
    (p.metricas.length && !ctx.metricas) ||
    (p.reflexoes && !ctx.reflexoes) ||
    (p.acontecimentos && !ctx.acontecimentos)
  )
    throw new HttpError(
      'Uma categoria selecionada não está disponível no seu plano.',
      403
    );
  const selecao = { ...p, metricas: [...p.metricas].sort() };
  return withTransaction(async (c) => {
    const rows = p.metricas.length
      ? await queryRows<Record<string, unknown>>(
          `SELECT id,date,${selecao.metricas.map((m) => CAMPOS_DO_REGISTRO[m].coluna).join(',')} FROM daily_metrics WHERE user_id=? AND date BETWEEN ? AND ? ORDER BY date`,
          [s.user.id, p.inicio, p.fim],
          c
        )
      : [];
    const reflexoes = p.reflexoes
      ? await queryRows<{
          id: string;
          reflection_date: string;
          emotional_score: number;
          body_score: number;
          spiritual_score: number;
          note?: string | null;
        }>(
          `SELECT id,reflection_date,emotional_score,body_score,spiritual_score${p.notas ? ',note' : ''} FROM daily_reflections WHERE user_id=? AND reflection_date BETWEEN ? AND ? ORDER BY reflection_date`,
          [s.user.id, p.inicio, p.fim],
          c
        )
      : [];
    const acontecimentos = p.acontecimentos
      ? await queryRows<{
          event_date: string;
          confirmed: number;
          note?: string;
        }>(
          `SELECT event_date,confirmed${p.notas ? ',note' : ''} FROM personal_event_days WHERE user_id=? AND event_date BETWEEN ? AND ? ORDER BY event_date`,
          [s.user.id, p.inicio, p.fim],
          c
        )
      : [];
    const marcadores = p.acontecimentos
      ? await queryRows<{ event_date: string; name: string }>(
          'SELECT d.event_date,m.name FROM personal_event_days d JOIN personal_event_day_markers v ON v.event_date=d.event_date AND v.user_id=d.user_id JOIN personal_event_markers m ON m.id=v.marker_id AND m.user_id=v.user_id WHERE d.user_id=? AND d.event_date BETWEEN ? AND ? ORDER BY d.event_date,m.name,m.id',
          [s.user.id, p.inicio, p.fim],
          c
        )
      : [];
    const porData = new Map(rows.map((r) => [String(r.date), r])),
      porReflexao = new Map(reflexoes.map((r) => [r.reflection_date, r])),
      porAcontecimento = new Map(acontecimentos.map((r) => [r.event_date, r])),
      porMarcador = new Map<string, string[]>();
    for (const m of marcadores)
      porMarcador.set(m.event_date, [
        ...(porMarcador.get(m.event_date) ?? []),
        m.name,
      ]);
    const dias: DiaDoRelatorio[] = [];
    for (let data = p.inicio; data <= p.fim; data = somarDias(data, 1)) {
      const row = porData.get(data),
        r = porReflexao.get(data),
        a = porAcontecimento.get(data);
      dias.push({
        data,
        registroId: row ? String(row.id) : null,
        valores: Object.fromEntries(
          selecao.metricas.map((m) => [
            m,
            valorDoRelatorio(m, row?.[CAMPOS_DO_REGISTRO[m].coluna]),
          ])
        ),
        reflexao: r
          ? {
              id: r.id,
              emocional: Number(r.emotional_score),
              corpo: Number(r.body_score),
              espiritual: Number(r.spiritual_score),
              ...(p.notas ? { nota: r.note ?? null } : {}),
            }
          : null,
        acontecimentos: a
          ? {
              revisado: Boolean(a.confirmed),
              marcadores: porMarcador.get(data) ?? [],
              ...(p.notas ? { nota: a.note ?? '' } : {}),
            }
          : null,
      });
    }
    const resumos = selecao.metricas.map((campo) => {
      const vs = dias
        .map((d) => d.valores[campo])
        .filter((v): v is number => v !== null && v !== undefined);
      return {
        campo,
        nome: CAMPOS_DO_REGISTRO[campo].rotulo,
        unidade: unidadeDoCampo(campo),
        n: vs.length,
        ausentes: dias.length - vs.length,
        mediana: mediana(vs),
        minimo: vs.length ? Math.min(...vs) : null,
        maximo: vs.length ? Math.max(...vs) : null,
      };
    });
    const dados = { selecao, fuso: ctx.fuso, dias, resumos };
    return {
      ...dados,
      extraidoEm: agora.toISOString(),
      revisao: createHash('sha256').update(JSON.stringify(dados)).digest('hex'),
    };
  });
}
