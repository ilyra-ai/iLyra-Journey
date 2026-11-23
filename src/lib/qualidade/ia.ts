import { resumoDoUso } from '@/lib/ai/uso-servico';
import { queryRows } from '@/lib/mysql/pool';

/**
 * Qualidade dos modelos de IA (tarefa 183), lida do registro de uso da
 * tarefa 163 (\`ia_uso\`): só números e identificação técnica, nunca o
 * pedido nem a resposta. Nada de treino automático nem troca de modelo:
 * a cadeia em produção continua a configurada em Configuração de IA.
 */

export interface QualidadeDoModelo {
  provedor: string;
  modelo: string;
  local: boolean;
  chamadas: number;
  ok: number;
  cortadas: number;
  recusadas: number;
  falhas: number;
  taxaDeFalha: number | null;
  /** Latência das chamadas concluídas (ok ou cortadas), em milissegundos. */
  latenciaP50: number | null;
  latenciaP95: number | null;
  /** Custo do mês corrente pelo preço cadastrado; null sem preço ou local. */
  custoDoMes: number | null;
  moeda: string | null;
}

/** Percentil pelo método do posto mais próximo, sobre valores ordenados. */
export function percentil(ordenados: number[], p: number) {
  if (ordenados.length === 0) return null;
  const posto = Math.max(1, Math.ceil((p / 100) * ordenados.length));
  return ordenados[posto - 1];
}

/** Teto de linhas por modelo para calcular percentis sem varrer tudo. */
const AMOSTRA_MAXIMA = 20_000;

export async function qualidadeDaIa(
  dias: number,
  agora = new Date()
): Promise<QualidadeDoModelo[]> {
  const desde = new Date(agora.getTime() - dias * 86_400_000);
  const contagens = await queryRows<{
    provedor: string;
    modelo: string;
    local: number;
    chamadas: string;
    ok: string;
    cortadas: string;
    recusadas: string;
    falhas: string;
  }>(
    `SELECT provedor, modelo, local, COUNT(*) AS chamadas,
            SUM(resultado = 'ok') AS ok,
            SUM(resultado = 'cortado') AS cortadas,
            SUM(resultado = 'recusado') AS recusadas,
            SUM(resultado = 'falhou') AS falhas
       FROM ia_uso
      WHERE created_at >= ?
      GROUP BY provedor, modelo, local
      ORDER BY chamadas DESC`,
    [desde]
  );
  const mes = agora.toISOString().slice(0, 7);
  const custos = new Map(
    (await resumoDoUso(mes)).map((l) => [
      `${l.provedor}\u0000${l.modelo}`,
      { custo: l.custo, moeda: l.moeda },
    ])
  );

  return Promise.all(
    contagens.map(async (c): Promise<QualidadeDoModelo> => {
      const tempos = (
        await queryRows<{ ms: number }>(
          `SELECT milissegundos AS ms FROM ia_uso
            WHERE provedor = ? AND modelo = ? AND created_at >= ?
              AND resultado IN ('ok', 'cortado')
            ORDER BY created_at DESC LIMIT ${AMOSTRA_MAXIMA}`,
          [c.provedor, c.modelo, desde]
        )
      )
        .map((t) => Number(t.ms))
        .sort((a, b) => a - b);
      const chamadas = Number(c.chamadas);
      const falhas = Number(c.falhas ?? 0);
      const custo = custos.get(`${c.provedor}\u0000${c.modelo}`);
      return {
        provedor: c.provedor,
        modelo: c.modelo,
        local: Boolean(c.local),
        chamadas,
        ok: Number(c.ok ?? 0),
        cortadas: Number(c.cortadas ?? 0),
        recusadas: Number(c.recusadas ?? 0),
        falhas,
        taxaDeFalha: chamadas > 0 ? falhas / chamadas : null,
        latenciaP50: percentil(tempos, 50),
        latenciaP95: percentil(tempos, 95),
        custoDoMes: custo?.custo ?? null,
        moeda: custo?.moeda ?? null,
      };
    })
  );
}
