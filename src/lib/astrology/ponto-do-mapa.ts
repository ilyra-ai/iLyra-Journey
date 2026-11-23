import { NOME_DO_GRAHA, type Graha } from './sideral';

/**
 * Pergunte ao ponto do mapa (tarefa 187). O link do mapa para o chat leva só
 * o identificador do planeta e a pergunta pronta, nunca data, hora ou local
 * de nascimento. O chat confere os dois antes de usar.
 */

export const LIMITE_DA_PERGUNTA_DO_PONTO = 300;

const GRAHAS = new Set(Object.keys(NOME_DO_GRAHA));

export function nomeCurtoDoGraha(graha: Graha) {
  return NOME_DO_GRAHA[graha].split(' (')[0];
}

/** Pergunta pronta, só com a posição do ponto. */
export function perguntaSobreOPonto(ponto: {
  graha: Graha;
  signo: string;
  casa: number | null;
}) {
  return `O que significa ${nomeCurtoDoGraha(ponto.graha)} em ${ponto.signo}${
    ponto.casa ? ` na casa ${ponto.casa}` : ''
  } no meu mapa védico?`;
}

export function linkDaPerguntaDoPonto(ponto: {
  graha: Graha;
  signo: string;
  casa: number | null;
}) {
  return `/chat?ponto=${ponto.graha}&pergunta=${encodeURIComponent(
    perguntaSobreOPonto(ponto)
  )}`;
}

/** Só identificadores de planeta conhecidos; o resto é ignorado. */
export function pontoDaBusca(valor: string | null) {
  return valor && GRAHAS.has(valor)
    ? { graha: valor as Graha, nome: nomeCurtoDoGraha(valor as Graha) }
    : null;
}

export function perguntaDaBusca(valor: string | null) {
  const texto = valor?.trim() ?? '';
  return texto && texto.length <= LIMITE_DA_PERGUNTA_DO_PONTO ? texto : null;
}
