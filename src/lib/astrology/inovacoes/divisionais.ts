import { SIGNOS } from '../sideral';
import type { MapaNatal } from '../mapa-natal';
import { indiceDivisional } from './numerica';

export type DivisaoVedica = 9 | 10;

export interface PosicaoDivisional {
  graha: string;
  longitudeNatal: number;
  indiceDoSigno: number;
  nomeDoSigno: string;
  casa: number | null;
  porcao: number;
  vargottama: boolean;
}

/**
 * Navamsa: móvel/próprio, fixo/nono, duplo/quinto.
 * Dashamsa: signo ímpar/próprio, par/nono (contagem inclusiva).
 */
export function signoDivisional(longitudeNatal: number, divisao: DivisaoVedica) {
  const resultado = indiceDivisional(longitudeNatal, divisao);
  return { ...resultado, nome: SIGNOS[resultado.indice] };
}

/** Deriva D9/D10 exclusivamente das posições natais siderais calculadas. */
export function calcularMapaDivisional(mapa: MapaNatal, divisao: DivisaoVedica) {
  const ascendente = mapa.lagna
    ? signoDivisional(mapa.lagna.longitude, divisao)
    : null;
  const planetas: PosicaoDivisional[] = mapa.planetas.map((planeta) => {
    const posicao = signoDivisional(planeta.longitude, divisao);
    return {
      graha: planeta.graha,
      longitudeNatal: planeta.longitude,
      indiceDoSigno: posicao.indice,
      nomeDoSigno: posicao.nome,
      porcao: posicao.porcao,
      vargottama: posicao.vargottama,
      casa: ascendente
        ? ((posicao.indice - ascendente.indice + 12) % 12) + 1
        : null,
    };
  });
  return {
    versao: 1,
    mapa: divisao === 9 ? 'Navamsa D9' : 'Dashamsa D10',
    metodo: 'Parashari-Lahiri',
    ascendente: ascendente
      ? { nomeDoSigno: ascendente.nome, indiceDoSigno: ascendente.indice }
      : null,
    planetas,
    limite: mapa.horaConhecida
      ? 'O ascendente divisional é muito sensível à precisão da hora de nascimento.'
      : 'Sem hora natal, não se calculam casas nem ascendente divisional; as posições planetárias são aproximadas.',
    interpretacao:
      'D9 e D10 são técnicas interpretativas védicas, não previsões científicas.',
  };
}
