/**
 * Números exibidos na interface em pt-BR (tarefa 62): vírgula decimal e
 * ponto de milhar. `toFixed` sempre usa ponto ("0.52" em vez de "0,52") e
 * continua valendo só para valores de CSS e de SVG, que exigem ponto.
 */
const CACHE = new Map<number, Intl.NumberFormat>();

function formatadorCom(casas: number) {
  let formatador = CACHE.get(casas);
  if (!formatador) {
    formatador = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: casas,
      maximumFractionDigits: casas,
    });
    CACHE.set(casas, formatador);
  }
  return formatador;
}

/** Número com casas decimais fixas, no padrão brasileiro. */
export function decimalPtBr(valor: number, casas = 1): string {
  return formatadorCom(casas).format(valor);
}

/** Valor monetário com o código da moeda do plano (BRL, USD...). */
export function moedaPtBr(valor: number, codigoDaMoeda: string): string {
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: codigoDaMoeda,
    }).format(valor);
  } catch {
    // Código fora da ISO 4217: mostra o código cadastrado e o número.
    return `${codigoDaMoeda} ${decimalPtBr(valor, 2)}`;
  }
}
