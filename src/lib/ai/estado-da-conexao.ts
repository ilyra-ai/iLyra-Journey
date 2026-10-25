/** Resultados de rede só comprovam a conexão e o instante em que foram obtidos. */
export const VALIDADE_DA_VERIFICACAO_MS = 120_000;
export type EstadoDaConexao =
  'nao_verificada' | 'verificando' | 'disponivel' | 'indisponivel' | 'expirada';
export interface VerificacaoDaConexao {
  ok: boolean;
  verificadaEm: number;
}
export function estadoDaConexao(
  resultado: VerificacaoDaConexao | null,
  verificando: boolean,
  agora: number
): EstadoDaConexao {
  if (verificando) return 'verificando';
  if (!resultado) return 'nao_verificada';
  if (Math.max(0, agora - resultado.verificadaEm) >= VALIDADE_DA_VERIFICACAO_MS)
    return 'expirada';
  return resultado.ok ? 'disponivel' : 'indisponivel';
}
/** Não aplica resposta de conexão removida, reaberta ou editada durante a consulta. */
export function aplicarResultadoDaConexao<T extends { versaoConexao: string }>(
  atual: T,
  versaoConsultada: string,
  mudanca: Partial<T>
): T {
  return atual.versaoConexao === versaoConsultada
    ? { ...atual, ...mudanca }
    : atual;
}
