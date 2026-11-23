import { queryRows } from '@/lib/mysql/pool';
import { recursoAtivoNaPlataforma } from '@/lib/plataforma/funcionalidades';
import { contaTemRecurso, limiteDeMetricasDaConta } from '@/lib/plans/service';
import { corteDoHistorico } from '@/lib/plans/historico';
import { painelDoChatSchema, type ParteDoChat } from './partes';

/** Painel solicitado explicitamente; os números vêm somente dos registros do titular. */
export async function montarPainelDoChat(
  usuario: string
): Promise<ParteDoChat[]> {
  if (!(await recursoAtivoNaPlataforma('metrics_history_days'))) return [];
  const limite = await limiteDeMetricasDaConta(usuario);
  const corte = corteDoHistorico(limite);
  const comEscores = await contaTemRecurso(usuario, 'ai_scores');
  const linhas =
    limite === 0
      ? []
      : await queryRows<{
          data: string;
          passos: number | null;
          sono: number | null;
          vfc: number | null;
          prontidao: number | null;
        }>(
          `SELECT DATE_FORMAT(date, '%Y-%m-%d') AS data, steps AS passos,
       sleep_duration_minutes AS sono, hrv_ms AS vfc, readiness_score AS prontidao
       FROM daily_metrics WHERE user_id = ? AND date >= UTC_DATE() - INTERVAL 6 DAY
       AND date <= UTC_DATE() AND (? IS NULL OR date >= ?) ORDER BY date`,
          [usuario, corte, corte]
        );
  return [
    painelDoChatSchema.parse({
      tipo: 'painel',
      versao: 1,
      titulo: 'Seus registros recentes',
      geradoEm: new Date().toISOString(),
      indisponivel: limite === 0 ? 'plano' : linhas.length ? null : 'sem-dados',
      dias: linhas.map((linha) => ({
        ...linha,
        prontidao: comEscores ? linha.prontidao : null,
      })),
    }),
  ];
}

/**
 * A leitura de partes antigas também respeita o plano vigente: o painel
 * segue o histórico de métricas e o ponto do mapa (tarefa 180) some se a
 * conta perdeu o recurso de mapas.
 */
export async function filtrarPaineisDoChat(
  usuario: string,
  partes: ParteDoChat[]
): Promise<ParteDoChat[]> {
  if (!partes.length) return partes;
  const temPainel = partes.some((p) => p.tipo === 'painel');
  const temPonto = partes.some((p) => p.tipo === 'ponto-do-mapa');
  const metricasAtivas =
    temPainel && (await recursoAtivoNaPlataforma('metrics_history_days'));
  const limite = metricasAtivas ? await limiteDeMetricasDaConta(usuario) : 0;
  const corte = corteDoHistorico(limite);
  const comEscores = metricasAtivas
    ? await contaTemRecurso(usuario, 'ai_scores')
    : false;
  const comMapa = temPonto
    ? await contaTemRecurso(usuario, 'vedic_insights')
    : false;
  return partes.flatMap((parte): ParteDoChat[] => {
    if (parte.tipo === 'ponto-do-mapa') return comMapa ? [parte] : [];
    if (!metricasAtivas) return [];
    const dias =
      limite === 0
        ? []
        : parte.dias
            .filter((dia) => !corte || dia.data >= corte)
            .map((dia) => ({
              ...dia,
              prontidao: comEscores ? dia.prontidao : null,
            }));
    return [
      {
        ...parte,
        dias,
        indisponivel: limite === 0 ? 'plano' : dias.length ? null : 'sem-dados',
      },
    ];
  });
}
