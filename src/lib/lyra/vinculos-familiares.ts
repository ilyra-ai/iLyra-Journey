import type { MapaNatal } from '@/lib/astrology/mapa-natal';
import {
  type Graha,
  NOME_DO_GRAHA,
  REGENTE_DO_SIGNO,
  SIGNOS,
} from '@/lib/astrology/sideral';

import { dignidadeDoGraha, GRAHAS_INFO } from './conhecimento/jyotish';

/**
 * Vínculos familiares no mapa védico, como leitura simbólica (tarefa 208).
 *
 * O Jyotish associa cada parente a uma casa e a um planeta significador
 * (karaka): a mãe à casa 4 e à Lua, o pai à casa 9 e ao Sol, os irmãos às
 * casas 3 e 11 e a Marte, os tios maternos à casa 6 e a Mercúrio, os filhos
 * à casa 5 e a Júpiter e o cônjuge à casa 7 e a Vênus. Avós, sogros e netos
 * saem do princípio "casa a partir da casa" (bhavat bhavam): o 9º a partir
 * do 9º (casa 5) para a linha paterna, o 4º a partir do 4º (casa 7) para a
 * materna, o 4º e o 9º a partir do 7º (casas 10 e 3) para sogra e sogro e o
 * 5º a partir do 5º (casa 9) para os netos. Filhos e filhas são lidos pela
 * mesma casa: a tradição não separa por gênero. Fonte: Brihat Parashara Hora
 * Shastra (capítulos das casas e dos karakas).
 *
 * A leitura só aponta temas para reflexão. Não descreve a pessoa real, não
 * prevê acontecimentos, não diagnostica e não afirma conflito: mostra onde a
 * tradição veria mais atrito ou mais apoio e o que vale observar. Primos e
 * tios paternos não têm regra fixa na tradição e ficam indisponíveis.
 */

export type IdDoVinculo =
  | 'mae'
  | 'pai'
  | 'irmaos-mais-novos'
  | 'irmaos-mais-velhos'
  | 'tios-maternos'
  | 'avos-paternos'
  | 'avos-maternos'
  | 'filhos'
  | 'conjuge'
  | 'sogra'
  | 'sogro'
  | 'netos';

interface DefinicaoDoVinculo {
  id: IdDoVinculo;
  nome: string;
  casa: number;
  karaka: Graha;
  /** O que a casa e o significador representam neste vínculo. */
  tema: string;
  /** Perguntas de reflexão, sem resposta pronta. */
  reflexoes: readonly string[];
  /** De onde vem a associação. */
  origem: string;
}

const VINCULOS: readonly DefinicaoDoVinculo[] = [
  {
    id: 'mae',
    nome: 'Mãe',
    casa: 4,
    karaka: 'lua',
    tema: 'acolhimento, segurança emocional, o lar de origem e a forma como você aprendeu a ser cuidado',
    reflexoes: [
      'Em que situações você se sente acolhido, e em quais sente falta disso?',
      'O que do jeito de cuidar que você recebeu você quer manter, e o que quer fazer diferente?',
    ],
    origem: 'casa 4 (Sukha Bhava) e a Lua como significadora da mãe',
  },
  {
    id: 'pai',
    nome: 'Pai',
    casa: 9,
    karaka: 'sol',
    tema: 'orientação, valores, autoridade e o exemplo de direção na vida',
    reflexoes: [
      'Quais valores você recebeu como referência, e quais escolheu por conta própria?',
      'Como você lida com autoridade e com ser autoridade para alguém?',
    ],
    origem: 'casa 9 (Dharma Bhava) e o Sol como significador do pai',
  },
  {
    id: 'irmaos-mais-novos',
    nome: 'Irmãos mais novos',
    casa: 3,
    karaka: 'marte',
    tema: 'parceria, iniciativa compartilhada, coragem e convivência no dia a dia',
    reflexoes: [
      'Onde a convivência pede mais paciência, e onde pede mais limites?',
      'Que tipo de apoio você oferece, e que tipo espera receber?',
    ],
    origem: 'casa 3 (Sahaja Bhava) e Marte como significador dos irmãos',
  },
  {
    id: 'irmaos-mais-velhos',
    nome: 'Irmãos mais velhos',
    casa: 11,
    karaka: 'marte',
    tema: 'apoio, comparação, redes de ajuda e realização de desejos',
    reflexoes: [
      'Há comparações antigas que ainda influenciam como você se vê?',
      'Em que momentos você pede ajuda, e em quais prefere resolver sozinho?',
    ],
    origem: 'casa 11 (Labha Bhava) e Marte como significador dos irmãos',
  },
  {
    id: 'tios-maternos',
    nome: 'Tios maternos',
    casa: 6,
    karaka: 'mercurio',
    tema: 'conselho, conversa e a família extensa do lado materno',
    reflexoes: [
      'Quem da família extensa é referência de conselho para você?',
      'Há conversas pendentes que pedem leveza em vez de disputa?',
    ],
    origem:
      'casa 6 (o 3º a partir do 4º) e Mercúrio como significador dos tios maternos',
  },
  {
    id: 'avos-paternos',
    nome: 'Avós paternos',
    casa: 5,
    karaka: 'sol',
    tema: 'tradição, herança de valores e a história da linha paterna',
    reflexoes: [
      'O que você conhece da história da sua família paterna?',
      'Que tradições dessa linha fazem sentido para você hoje?',
    ],
    origem: 'casa 5 (o 9º a partir do 9º, princípio bhavat bhavam)',
  },
  {
    id: 'avos-maternos',
    nome: 'Avós maternos',
    casa: 7,
    karaka: 'lua',
    tema: 'raízes afetivas, costumes de cuidado e a história da linha materna',
    reflexoes: [
      'Que costumes de cuidado vieram da família da sua mãe?',
      'O que dessa história você gostaria de conhecer melhor?',
    ],
    origem: 'casa 7 (o 4º a partir do 4º, princípio bhavat bhavam)',
  },
  {
    id: 'filhos',
    nome: 'Filhos e filhas',
    casa: 5,
    karaka: 'jupiter',
    tema: 'criação, afeto, orgulho, expectativas e o que você transmite a quem vem depois',
    reflexoes: [
      'O que você espera dos seus filhos, e o que eles esperam de você?',
      'Como equilibrar proteção e liberdade nesta fase da vida deles?',
    ],
    origem:
      'casa 5 (Putra Bhava) e Júpiter como significador dos filhos; a tradição lê filhos e filhas pela mesma casa, sem separar por gênero',
  },
  {
    id: 'conjuge',
    nome: 'Cônjuge ou companheiro(a)',
    casa: 7,
    karaka: 'venus',
    tema: 'parceria, acordos, afeto do dia a dia e a forma como vocês decidem juntos',
    reflexoes: [
      'Em que vocês se apoiam bem, e onde os acordos pedem conversa?',
      'O que cada um precisa para se sentir escutado na relação?',
    ],
    origem: 'casa 7 (Kalatra Bhava) e Vênus como significadora do cônjuge',
  },
  {
    id: 'sogra',
    nome: 'Sogra',
    casa: 10,
    karaka: 'lua',
    tema: 'acolhimento na família do cônjuge, convivência e limites entre as duas casas',
    reflexoes: [
      'Como você se sente recebido na família do seu cônjuge?',
      'Que limites tornam a convivência mais leve para todos?',
    ],
    origem:
      'casa 10 (o 4º a partir do 7º, princípio bhavat bhavam) e a Lua como significadora da mãe',
  },
  {
    id: 'sogro',
    nome: 'Sogro',
    casa: 3,
    karaka: 'sol',
    tema: 'respeito, referências e a autoridade na família do cônjuge',
    reflexoes: [
      'Como você lida com opiniões e expectativas da família do seu cônjuge?',
      'Onde há espaço para respeito mútuo sem abrir mão do que é seu?',
    ],
    origem:
      'casa 3 (o 9º a partir do 7º, princípio bhavat bhavam) e o Sol como significador do pai',
  },
  {
    id: 'netos',
    nome: 'Netos',
    casa: 9,
    karaka: 'jupiter',
    tema: 'continuidade, legado, alegria e a convivência entre gerações',
    reflexoes: [
      'O que você gostaria de transmitir às próximas gerações?',
      'Como estar presente sem ocupar o lugar dos pais deles?',
    ],
    origem:
      'casa 9 (o 5º a partir do 5º, princípio bhavat bhavam) e Júpiter como significador dos filhos',
  },
];

/** Identificadores e nomes dos vínculos, para outras partes do app. */
export const NOMES_DOS_VINCULOS: Readonly<Record<IdDoVinculo, string>> =
  Object.fromEntries(VINCULOS.map((v) => [v.id, v.nome])) as Record<
    IdDoVinculo,
    string
  >;

const CASAS_DIFICEIS = new Set([6, 8, 12]);
const CASAS_DE_APOIO = new Set([1, 4, 5, 7, 9, 10]);

export interface LeituraDoVinculo {
  id: IdDoVinculo;
  nome: string;
  /** Equilíbrio dos sinais simbólicos, para o tom do card. */
  tom: 'apoio' | 'atrito' | 'equilibrio';
  /** Uma ou duas frases para o card. */
  resumo: string;
  tema: string;
  /** Sinais que a tradição leria como atrito ou aprendizado. */
  atritos: string[];
  /** Sinais que a tradição leria como apoio. */
  apoios: string[];
  reflexoes: readonly string[];
  /** De onde vem a leitura (casa, significador e referência). */
  origem: string;
}

export interface VinculosFamiliares {
  /** Signo usado como casa 1: o Lagna ou, sem ele, a Lua natal. */
  referencia: 'lagna' | 'lua';
  vinculos: LeituraDoVinculo[];
  /** Vínculos sem regra fixa na tradição. */
  indisponiveis: string[];
  limite: string;
}

export const LIMITE_DOS_VINCULOS =
  'Leitura simbólica do mapa para reflexão sobre os vínculos: não descreve a pessoa real, não prevê acontecimentos e não é avaliação psicológica ou de saúde. Conflitos familiares que pesam merecem conversa e, se preciso, o apoio de um profissional.';

function casaContada(referencia: number, signo: number) {
  return ((signo - referencia + 12) % 12) + 1;
}

function nomeCurto(graha: Graha) {
  return NOME_DO_GRAHA[graha].split(' (')[0];
}

function lerVinculo(
  definicao: DefinicaoDoVinculo,
  mapa: MapaNatal,
  referencia: number
): LeituraDoVinculo {
  const signoDaCasa = (referencia + definicao.casa - 1) % 12;
  const regente = REGENTE_DO_SIGNO[signoDaCasa];
  const atritos: string[] = [];
  const apoios: string[] = [];

  // Planetas na casa do vínculo.
  for (const planeta of mapa.planetas) {
    if (casaContada(referencia, planeta.signo) !== definicao.casa) continue;
    const natureza = GRAHAS_INFO[planeta.graha].natureza;
    const nome = nomeCurto(planeta.graha);
    if (natureza === 'benefico') {
      apoios.push(
        `${nome} na casa deste vínculo traz, na leitura tradicional, ${GRAHAS_INFO[planeta.graha].florescer}.`
      );
    } else if (natureza === 'malefico') {
      atritos.push(
        `${nome} na casa deste vínculo pode trazer, como tema simbólico, ${GRAHAS_INFO[planeta.graha].sombra}; é um convite a perceber esses padrões, não uma sentença.`
      );
    }
  }

  // Regente da casa: onde está e com que força.
  const planetaRegente = mapa.planetas.find((p) => p.graha === regente)!;
  const casaDoRegente = casaContada(referencia, planetaRegente.signo);
  const nomeDoRegente = nomeCurto(regente);
  if (CASAS_DIFICEIS.has(casaDoRegente)) {
    atritos.push(
      `O regente da casa, ${nomeDoRegente}, está na casa ${casaDoRegente}, que a tradição associa a esforço e transformação: o vínculo pode pedir mais atenção e diálogo.`
    );
  } else if (CASAS_DE_APOIO.has(casaDoRegente)) {
    apoios.push(
      `O regente da casa, ${nomeDoRegente}, está na casa ${casaDoRegente}, uma posição de sustentação na leitura tradicional.`
    );
  }
  const dignidadeDoRegente = dignidadeDoGraha(
    regente,
    planetaRegente.signo,
    REGENTE_DO_SIGNO[planetaRegente.signo]
  );
  if (dignidadeDoRegente === 'debilitado') {
    atritos.push(
      `${nomeDoRegente}, regente da casa, está em debilitação em ${SIGNOS[planetaRegente.signo]}: um ponto de aprendizado, que pede paciência.`
    );
  } else if (dignidadeDoRegente) {
    apoios.push(
      `${nomeDoRegente}, regente da casa, está ${dignidadeDoRegente === 'exaltado' ? 'em exaltação' : 'no próprio signo'} em ${SIGNOS[planetaRegente.signo]}.`
    );
  }

  // Significador do vínculo, quando não é o próprio regente.
  if (definicao.karaka !== regente) {
    const karaka = mapa.planetas.find((p) => p.graha === definicao.karaka)!;
    const nomeDoKaraka = nomeCurto(definicao.karaka);
    const dignidade = dignidadeDoGraha(
      definicao.karaka,
      karaka.signo,
      REGENTE_DO_SIGNO[karaka.signo]
    );
    if (dignidade === 'debilitado') {
      atritos.push(
        `${nomeDoKaraka}, significador deste vínculo, está em debilitação em ${SIGNOS[karaka.signo]}: a tradição leria aqui um tema que pede cuidado consciente.`
      );
    } else if (dignidade) {
      apoios.push(
        `${nomeDoKaraka}, significador deste vínculo, está ${dignidade === 'exaltado' ? 'em exaltação' : 'no próprio signo'} em ${SIGNOS[karaka.signo]}.`
      );
    }
    const casaDoKaraka = casaContada(referencia, karaka.signo);
    if (CASAS_DIFICEIS.has(casaDoKaraka)) {
      atritos.push(
        `${nomeDoKaraka}, significador deste vínculo, está na casa ${casaDoKaraka}: o tema pode aparecer com mais intensidade em fases de mudança.`
      );
    }
  }

  const tom: LeituraDoVinculo['tom'] =
    atritos.length > apoios.length
      ? 'atrito'
      : apoios.length > atritos.length
        ? 'apoio'
        : 'equilibrio';
  const abertura = {
    apoio: 'No seu mapa, este vínculo aparece com mais sinais de apoio',
    atrito:
      'No seu mapa, este vínculo aparece com mais sinais de atrito e aprendizado',
    equilibrio:
      'No seu mapa, este vínculo aparece com sinais de apoio e de atrito em equilíbrio',
  }[tom];
  return {
    id: definicao.id,
    nome: definicao.nome,
    tom,
    resumo: `${abertura}, ligados a ${definicao.tema}.`,
    tema: definicao.tema,
    atritos,
    apoios,
    reflexoes: definicao.reflexoes,
    origem: `${definicao.origem}; Brihat Parashara Hora Shastra.`,
  };
}

/**
 * Leitura simbólica dos vínculos familiares. `null` quando o mapa não tem
 * referência confiável: sem Lagna e com a Lua natal mudando de signo no dia
 * do nascimento.
 */
export function lerVinculosFamiliares(
  mapa: MapaNatal
): VinculosFamiliares | null {
  const luaIncerta = (mapa.possibilidades?.signosDaLua.length ?? 1) > 1;
  if (!mapa.lagna && luaIncerta) return null;
  const referencia = mapa.lagna ? mapa.lagna.signo : mapa.lua.signo;
  return {
    referencia: mapa.lagna ? 'lagna' : 'lua',
    vinculos: VINCULOS.map((definicao) =>
      lerVinculo(definicao, mapa, referencia)
    ),
    indisponiveis: ['primos', 'tios paternos'],
    limite: mapa.lagna
      ? LIMITE_DOS_VINCULOS
      : `${LIMITE_DOS_VINCULOS} Sem o Ascendente, as casas são contadas a partir da Lua natal (Chandra Lagna), técnica tradicional menos precisa.`,
  };
}
