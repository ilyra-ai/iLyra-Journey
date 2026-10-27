import { queryRows } from '@/lib/mysql/pool';
import { contaTemRecurso, limiteDeMetricasDaConta } from '@/lib/plans/service';
import { corteDoHistorico } from '@/lib/plans/historico';
import { painelDoChatSchema, type ParteDoChat } from './partes';

/** Painel solicitado explicitamente; os números vêm somente dos registros do titular. */
export async function montarPainelDoChat(
  usuario: string
): Promise<ParteDoChat[]> {
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

/** A leitura de um painel antigo também respeita o plano vigente. */
export async function filtrarPaineisDoChat(
  usuario: string,
  partes: ParteDoChat[]
): Promise<ParteDoChat[]> {
  if (!partes.length) return partes;
  const limite = await limiteDeMetricasDaConta(usuario),
    corte = corteDoHistorico(limite);
  const comEscores = await contaTemRecurso(usuario, 'ai_scores');
  return partes.map((parte) => {
    const dias =
      limite === 0
        ? []
        : parte.dias
            .filter((dia) => !corte || dia.data >= corte)
            .map((dia) => ({
              ...dia,
              prontidao: comEscores ? dia.prontidao : null,
            }));
    return {
      ...parte,
      dias,
      indisponivel: limite === 0 ? 'plano' : dias.length ? null : 'sem-dados',
    };
  });
}
