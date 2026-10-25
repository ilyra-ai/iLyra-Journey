/** Unidade de cobrança da Stripe. Mantém inteiros/BigInt até a apresentação. */
const ZERO = new Set([
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'JPY',
  'KMF',
  'KRW',
  'MGA',
  'PYG',
  'RWF',
  'VND',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
]);
const TRES = new Set(['BHD', 'JOD', 'KWD', 'OMR', 'TND']);
export function casasDaMoeda(moeda: string) {
  return ZERO.has(moeda.toUpperCase())
    ? 0
    : TRES.has(moeda.toUpperCase())
      ? 3
      : 2;
}
/** ISK/UGX continuam representadas com duas casas na API, embora sejam moedas sem fração. */
export function passoDaMoeda(moeda: string) {
  return ['ISK', 'UGX'].includes(moeda.toUpperCase())
    ? 100
    : TRES.has(moeda.toUpperCase())
      ? 10
      : 1;
}
export function formatarValorFinanceiro(
  valor: string | number | null,
  moeda: string | null
): string {
  if (valor === null) return 'Não disponível';
  if (!moeda || !/^[A-Z]{3}$/.test(moeda))
    return (
      BigInt(valor).toLocaleString('pt-BR') +
      ' unidades mínimas (moeda não informada)'
    );
  const v = BigInt(valor),
    negativo = v < BigInt(0),
    abs = negativo ? -v : v,
    casas = casasDaMoeda(moeda),
    divisor = BigInt(10) ** BigInt(casas),
    inteiro = abs / divisor,
    fracao = (abs % divisor).toString().padStart(casas, '0');
  if (['ISK', 'UGX'].includes(moeda) && abs % divisor !== BigInt(0))
    return `${v.toLocaleString('pt-BR')} unidades mínimas ${moeda}`;
  const visual = ['ISK', 'UGX'].includes(moeda) ? 0 : casas;
  // formatToParts de BigInt não perde centavos de somas acima de MAX_SAFE_INTEGER.
  const numero = negativo ? (inteiro === BigInt(0) ? -0 : -inteiro) : inteiro;
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: moeda,
      minimumFractionDigits: visual,
      maximumFractionDigits: visual,
    })
      .formatToParts(numero)
      .map((p) => (p.type === 'fraction' ? fracao : p.value))
      .join('');
  } catch {
    return `${v.toLocaleString('pt-BR')} unidades mínimas ${moeda}`;
  }
}
/** Entrada decimal explícita, sem parseFloat, arredondamento ou notação científica. */
export function valorEmUnidades(texto: string, moeda: string): number | null {
  const casas = casasDaMoeda(moeda),
    limpo = texto.trim().replace(',', '.');
  if (!/^\d+(?:\.\d+)?$/.test(limpo)) return null;
  const [inteiro, fracao = ''] = limpo.split('.');
  if (fracao.length > casas) return null;
  const n =
    BigInt(inteiro) * BigInt(10) ** BigInt(casas) +
    BigInt(fracao.padEnd(casas, '0') || '0');
  if (
    n <= BigInt(0) ||
    n > BigInt(Number.MAX_SAFE_INTEGER) ||
    n % BigInt(passoDaMoeda(moeda)) !== BigInt(0)
  )
    return null;
  return Number(n);
}
