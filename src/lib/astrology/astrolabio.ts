/**
 * Geometria do Astrolábio Vivo (tarefa 186): a roda do mapa sideral
 * desenhada a partir das longitudes reais do Motor, sem posições fixas.
 *
 * Convenção da roda: o Lagna (ascendente) fica à esquerda, às 9 horas, e o
 * zodíaco avança no sentido anti-horário, como nos mapas impressos. Sem hora
 * de nascimento não há Lagna: o início de Áries fica à esquerda e as casas
 * não são desenhadas.
 */

export const CENTRO = 200;

/** Ângulo em graus (anti-horário a partir das 3 horas) de uma longitude. */
export function anguloDaLongitude(longitude: number, ascendente: number) {
  return (((180 + longitude - ascendente) % 360) + 360) % 360;
}

/** Ponto da roda em coordenadas SVG (o eixo y do SVG aponta para baixo). */
export function pontoNaRoda(raio: number, angulo: number) {
  const rad = (angulo * Math.PI) / 180;
  return {
    x: Math.round((CENTRO + raio * Math.cos(rad)) * 100) / 100,
    y: Math.round((CENTRO - raio * Math.sin(rad)) * 100) / 100,
  };
}

/** Casa por signo inteiro: o signo do Lagna é a casa 1. */
export function casaPorSignoInteiro(
  indiceDoSigno: number,
  indiceDoLagna: number
) {
  return ((indiceDoSigno - indiceDoLagna + 12) % 12) + 1;
}

/**
 * Raio de cada planeta para os rótulos não se sobreporem: planetas a menos
 * de `folga` graus do anterior descem um degrau para dentro da roda.
 */
export function raiosSemSobreposicao(
  longitudes: number[],
  { raio = 118, degrau = 26, folga = 12, degraus = 4 } = {}
) {
  const ordem = longitudes
    .map((longitude, indice) => ({ longitude, indice }))
    .sort((a, b) => a.longitude - b.longitude);
  const raios = new Array<number>(longitudes.length).fill(raio);
  let nivel = 0;
  ordem.forEach((atual, i) => {
    const anterior = ordem[i - 1];
    nivel =
      anterior && atual.longitude - anterior.longitude < folga
        ? (nivel + 1) % degraus
        : 0;
    raios[atual.indice] = raio - nivel * degrau;
  });
  return raios;
}

/** Abreviações visíveis na roda; o nome completo fica no rótulo acessível. */
export const SIGLA_DO_GRAHA: Record<string, string> = {
  sol: 'Sol',
  lua: 'Lua',
  marte: 'Mar',
  mercurio: 'Mer',
  jupiter: 'Júp',
  venus: 'Vên',
  saturno: 'Sat',
  rahu: 'Rah',
  ketu: 'Ket',
};
