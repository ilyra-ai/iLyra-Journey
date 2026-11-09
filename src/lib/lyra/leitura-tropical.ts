import type {
  calcularMapaTropicalPorLocal,
  calcularSolPorData,
  PlanetaTropical,
} from '@/lib/astrology/tropical';
import { normalizarGraus, SIGNOS } from '@/lib/astrology/sideral';

type MapaCompleto = ReturnType<typeof calcularMapaTropicalPorLocal>;
type MapaSolar = ReturnType<typeof calcularSolPorData>;

/** Vocabulário editorial ocidental: interpretações simbólicas, separado dos cálculos. */
const SIGNIFICADOS = [
  'iniciativa e autonomia; observe como começa e sustenta suas escolhas',
  'constância e valores; observe o que lhe dá estabilidade sem impedir mudanças',
  'curiosidade e comunicação; observe como escuta e conecta ideias',
  'vínculos e acolhimento; observe como cuida de si e estabelece limites',
  'expressão e criatividade; observe como participa sem depender de aprovação',
  'discernimento e aperfeiçoamento; observe como organiza sem exigir perfeição',
  'reciprocidade e negociação; observe como concilia diálogo e posicionamento',
  'profundidade e transformação; observe como constrói confiança e aceita transições',
  'exploração e sentido; observe como testa suas convicções na experiência',
  'responsabilidade e construção; observe como combina ambição e descanso',
  'originalidade e participação coletiva; observe como une independência e cooperação',
  'imaginação e sensibilidade; observe como transforma inspiração em escolhas concretas',
] as const;

const PLANETAS: Record<PlanetaTropical, { nome: string; tema: string }> = {
  sol: { nome: 'Sol', tema: 'identidade e expressão consciente' },
  lua: { nome: 'Lua', tema: 'necessidades emocionais e pertencimento' },
  mercurio: {
    nome: 'Mercúrio',
    tema: 'pensamento, aprendizagem e comunicação',
  },
  venus: { nome: 'Vênus', tema: 'afetos, valores e reciprocidade' },
  marte: {
    nome: 'Marte',
    tema: 'iniciativa, desejo e modo de enfrentar conflitos',
  },
  jupiter: {
    nome: 'Júpiter',
    tema: 'expansão, confiança e busca de significado',
  },
  saturno: {
    nome: 'Saturno',
    tema: 'limites, responsabilidade e amadurecimento',
  },
  urano: { nome: 'Urano', tema: 'autonomia, inovação e ruptura de padrões' },
  netuno: {
    nome: 'Netuno',
    tema: 'imaginação, ideais e discernimento das expectativas',
  },
  plutao: {
    nome: 'Plutão',
    tema: 'transformação, poder e processos de desapego',
  },
};

const CASAS = [
  'apresentação pessoal e iniciativa',
  'recursos, valores e segurança material',
  'comunicação, estudo e ambiente próximo',
  'raízes, intimidade e vida doméstica',
  'criatividade, prazer e expressão autoral',
  'organização do cotidiano e responsabilidades práticas',
  'parcerias, acordos e reciprocidade',
  'intimidade, recursos compartilhados e transições',
  'estudos amplos, viagens e visão de mundo',
  'atuação pública, carreira e direção',
  'amizades, redes e projetos coletivos',
  'recolhimento, elaboração interior e encerramentos',
] as const;

const ASPECTOS: Record<string, string> = {
  conjunção: 'aproxima esses temas e convida a reconhecer como atuam juntos',
  sextil:
    'sugere uma oportunidade de colaboração que pede participação consciente',
  quadratura:
    'simboliza tensão entre necessidades e convida a experimentar novas respostas',
  trígono:
    'sugere fluidez entre esses temas, sem dispensar escolhas e desenvolvimento',
  oposição: 'convida a equilibrar necessidades que podem parecer opostas',
};

export interface LeituraTropical {
  versao: 1;
  tipo: 'ocidental';
  natureza: 'interpretacao-simbolica';
  resumo: string;
  planetas: Array<{
    planeta: PlanetaTropical;
    nome: string;
    casa: number | null;
    texto: string;
  }>;
  ascendente: string | null;
  aspectos: string[];
  limites: string[];
}

/** Nunca usa dashas, nakshatras, doshas ou correspondências dos outros mapas. */
export function lerMapaTropical(
  mapa: MapaCompleto | MapaSolar
): LeituraTropical {
  if ('sol' in mapa) {
    const signo = mapa.sol.signo;
    const indice = signo ? SIGNOS.indexOf(signo) : -1;
    return {
      versao: 1,
      tipo: 'ocidental',
      natureza: 'interpretacao-simbolica',
      resumo:
        signo && indice >= 0
          ? `Sol em ${signo}: nesta leitura simbólica ocidental, o tema é ${SIGNIFICADOS[indice]}.`
          : `Seu signo solar pode variar entre ${mapa.sol.signosPossiveis.join(' e ')}. A data sozinha não permite escolher um deles; informe hora e cidade para confirmar.`,
      planetas: [],
      ascendente: null,
      aspectos: [],
      limites: [
        ...mapa.indisponivel,
        'Leitura solar geral, sem previsão individual do dia.',
      ],
    };
  }
  const planetas = mapa.planetas.map(({ planeta, posicao }) => {
    const info = PLANETAS[planeta];
    const casa = mapa.ascendente
      ? Math.floor(
          normalizarGraus(posicao.longitude - mapa.ascendente.longitude) / 30
        ) + 1
      : null;
    return {
      planeta,
      nome: info.nome,
      casa,
      texto: `${info.nome} em ${posicao.signo}: ${info.tema} ganha o tom de ${SIGNIFICADOS[posicao.indice]}.${casa ? ` Na casa ${casa}, a reflexão se concentra em ${CASAS[casa - 1]}.` : ''}`,
    };
  });
  return {
    versao: 1,
    tipo: 'ocidental',
    natureza: 'interpretacao-simbolica',
    resumo: planetas.find((p) => p.planeta === 'sol')!.texto,
    planetas,
    ascendente: mapa.ascendente
      ? `Ascendente em ${mapa.ascendente.signo}: a maneira de se apresentar e iniciar experiências pode ser explorada pelo tema de ${SIGNIFICADOS[mapa.ascendente.indice]}.`
      : null,
    aspectos: mapa.aspectos.map(
      (a) =>
        `${PLANETAS[a.primeiro].nome} em ${a.aspecto} com ${PLANETAS[a.segundo].nome}, orbe ${a.orbe.toFixed(2)}°: ${ASPECTOS[a.aspecto]}.`
    ),
    limites: [
      ...mapa.indisponivel,
      'Leitura natal simbólica; não representa uma previsão individual do dia nem determina acontecimentos.',
    ],
  };
}
