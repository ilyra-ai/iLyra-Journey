/** Operações numéricas determinísticas, sem LLM, MySQL ou rede. */
export const DIA_MS = 86_400_000;
export const HORA_MS = 3_600_000;

export function normalizarAngulo(graus: number): number {
  if (!Number.isFinite(graus)) throw new RangeError('Ângulo inválido.');
  return ((graus % 360) + 360) % 360;
}

export function diferencaAngular(graus: number): number {
  return normalizarAngulo(graus + 180) - 180;
}

export function limitarLocal(latitude: number, longitude: number) {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    throw new RangeError('Latitude ou longitude geográfica inválida.');
  }
  return { latitude, longitude };
}

export function conferirInstantes(inicio: Date, fim: Date, maxDias: number) {
  if (
    !Number.isFinite(inicio.getTime()) ||
    !Number.isFinite(fim.getTime()) ||
    fim.getTime() <= inicio.getTime() ||
    fim.getTime() - inicio.getTime() > maxDias * DIA_MS
  ) {
    throw new RangeError('Informe um intervalo positivo de no máximo ' + maxDias + ' dias.');
  }
}

/**
 * Busca passagens por ângulo circular, inclusive retornos múltiplos por retrogradação.
 * Passos devem respeitar a velocidade angular do corpo pesquisado.
 */
export function procurarPassagens(
  longitude: (data: Date) => number,
  alvo: number,
  inicio: Date,
  fim: Date,
  passoMs: number,
  toleranciaMs = 15_000
): Date[] {
  conferirInstantes(inicio, fim, 370);
  if (
    !Number.isFinite(alvo) ||
    !Number.isFinite(passoMs) ||
    passoMs <= 0 ||
    passoMs > DIA_MS ||
    !Number.isFinite(toleranciaMs) ||
    toleranciaMs < 1
  ) {
    throw new RangeError('Parâmetros inválidos para a busca de eventos.');
  }
  if ((fim.getTime() - inicio.getTime()) / passoMs > 200_000)
    throw new RangeError('A pesquisa excede o limite seguro de amostragem.');

  const erro = (ms: number) => diferencaAngular(longitude(new Date(ms)) - alvo);
  const eventos: Date[] = [];
  let anteriorMs = inicio.getTime();
  let anterior = erro(anteriorMs);
  const fimMs = fim.getTime();

  while (anteriorMs < fimMs) {
    const proximoMs = Math.min(fimMs, anteriorMs + passoMs);
    const proximo = erro(proximoMs);
    const cruza =
      Math.abs(proximo - anterior) < 180 &&
      ((anterior <= 0 && proximo >= 0) || (anterior >= 0 && proximo <= 0));
    if (cruza) {
      let a = anteriorMs;
      let b = proximoMs;
      const sinalInicial = anterior;
      for (let it = 0; it < 45 && b - a > toleranciaMs; it += 1) {
        const meio = Math.floor((a + b) / 2);
        const valor = erro(meio);
        if ((sinalInicial <= 0 && valor >= 0) || (sinalInicial >= 0 && valor <= 0)) {
          b = meio;
        } else {
          a = meio;
        }
      }
      const instante = Math.round((a + b) / 2);
      if (
        !eventos.length ||
        instante - eventos[eventos.length - 1].getTime() > toleranciaMs * 2
      ) {
        eventos.push(new Date(instante));
      }
    }
    anteriorMs = proximoMs;
    anterior = proximo;
  }
  return eventos;
}

/** Signos divisionais com convenções Parāśari explícitas. */
export function indiceDivisional(longitudeNatal: number, divisao: 9 | 10) {
  const grau = normalizarAngulo(longitudeNatal);
  const signo = Math.floor(grau / 30);
  const fracao = grau - signo * 30;
  const porcao = Math.min(divisao - 1, Math.floor((fracao * divisao) / 30));
  const inicio =
    divisao === 9
      ? (signo + (signo % 3 === 0 ? 0 : signo % 3 === 1 ? 8 : 4)) % 12
      : (signo + (signo % 2 === 0 ? 0 : 8)) % 12;
  const indice = (inicio + porcao) % 12;
  return { indice, porcao: porcao + 1, vargottama: indice === signo };
}
