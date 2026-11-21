import type { SIGNOS } from '@/lib/astrology/sideral';

/**
 * Os doze signos do zodíaco tropical na tradição ocidental (tarefa 158).
 *
 * Elemento, modalidade e regente vêm da tradição (Ptolomeu, Tetrabiblos,
 * livro I); os regentes modernos de Escorpião, Aquário e Peixes aparecem
 * só como complemento. Forças, pontos de atenção e perguntas são temas de
 * reflexão escritos pela Lyra: possibilidades, nunca medidas de
 * personalidade, previsões ou diagnósticos.
 */

export type Signo = (typeof SIGNOS)[number];
export type Elemento = 'fogo' | 'terra' | 'ar' | 'água';
export type Modalidade = 'cardinal' | 'fixo' | 'mutável';

export interface SignoOcidental {
  simbolo: string;
  elemento: Elemento;
  modalidade: Modalidade;
  regente: string;
  forcas: [string, string];
  atencao: [string, string];
  pergunta: string;
}

export const FONTE_DOS_SIGNOS =
  'Tradição astrológica ocidental (Ptolomeu, Tetrabiblos, livro I: elementos, modalidades e regências)';

export const SIGNOS_OCIDENTAIS: Record<Signo, SignoOcidental> = {
  Áries: {
    simbolo: '♈',
    elemento: 'fogo',
    modalidade: 'cardinal',
    regente: 'Marte',
    forcas: ['coragem para começar', 'franqueza ao dizer o que quer'],
    atencao: [
      'pressa diante do que pede tempo',
      'impaciência com o ritmo dos outros',
    ],
    pergunta: 'O que você quer começar, mesmo sem ter todas as respostas?',
  },
  Touro: {
    simbolo: '♉',
    elemento: 'terra',
    modalidade: 'fixo',
    regente: 'Vênus',
    forcas: [
      'constância para sustentar o que importa',
      'presença no corpo e nos sentidos',
    ],
    atencao: [
      'apego ao conhecido quando a mudança chega',
      'resistência a rever planos',
    ],
    pergunta: 'O que lhe dá segurança sem prender você no mesmo lugar?',
  },
  Gêmeos: {
    simbolo: '♊',
    elemento: 'ar',
    modalidade: 'mutável',
    regente: 'Mercúrio',
    forcas: [
      'curiosidade que liga ideias',
      'facilidade de conversar e aprender',
    ],
    atencao: [
      'dispersão entre muitos interesses',
      'dificuldade de aprofundar uma escolha',
    ],
    pergunta: 'Qual conversa ou ideia merece a sua atenção inteira agora?',
  },
  Câncer: {
    simbolo: '♋',
    elemento: 'água',
    modalidade: 'cardinal',
    regente: 'Lua',
    forcas: [
      'cuidado com quem está por perto',
      'memória afetiva que cria pertencimento',
    ],
    atencao: [
      'proteger-se demais e se fechar',
      'cuidar dos outros e esquecer de si',
    ],
    pergunta:
      'Onde você se sente em casa, e como pode cuidar de si do mesmo jeito?',
  },
  Leão: {
    simbolo: '♌',
    elemento: 'fogo',
    modalidade: 'fixo',
    regente: 'Sol',
    forcas: ['generosidade e calor humano', 'criatividade que se mostra'],
    atencao: [
      'depender do reconhecimento alheio',
      'orgulho que dificulta pedir ajuda',
    ],
    pergunta: 'O que você cria quando ninguém está olhando?',
  },
  Virgem: {
    simbolo: '♍',
    elemento: 'terra',
    modalidade: 'mutável',
    regente: 'Mercúrio',
    forcas: [
      'atenção aos detalhes que fazem diferença',
      'vontade de ser útil e aperfeiçoar',
    ],
    atencao: [
      'exigência de perfeição consigo',
      'crítica que esconde o que já está bom',
    ],
    pergunta: 'O que já está bom o suficiente para ser celebrado hoje?',
  },
  Libra: {
    simbolo: '♎',
    elemento: 'ar',
    modalidade: 'cardinal',
    regente: 'Vênus',
    forcas: [
      'senso de justiça e equilíbrio',
      'diplomacia que aproxima pessoas',
    ],
    atencao: [
      'adiar decisões para evitar conflito',
      'buscar harmonia à custa da própria voz',
    ],
    pergunta:
      'Que decisão ficaria mais leve se você ouvisse a sua própria opinião primeiro?',
  },
  Escorpião: {
    simbolo: '♏',
    elemento: 'água',
    modalidade: 'fixo',
    regente: 'Marte (moderno: Plutão)',
    forcas: [
      'profundidade emocional',
      'capacidade de se transformar nas crises',
    ],
    atencao: ['desconfiança que afasta', 'controle como forma de se proteger'],
    pergunta: 'O que você está pronta ou pronto para deixar ir?',
  },
  Sagitário: {
    simbolo: '♐',
    elemento: 'fogo',
    modalidade: 'mutável',
    regente: 'Júpiter',
    forcas: [
      'otimismo e busca de sentido',
      'abertura para o novo e para o diferente',
    ],
    atencao: [
      'prometer além do que cabe',
      'evitar compromissos que pedem permanência',
    ],
    pergunta: 'Que pergunta sobre a vida tem guiado as suas escolhas?',
  },
  Capricórnio: {
    simbolo: '♑',
    elemento: 'terra',
    modalidade: 'cardinal',
    regente: 'Saturno',
    forcas: [
      'disciplina para construir no longo prazo',
      'responsabilidade com o que assume',
    ],
    atencao: ['rigidez consigo mesmo', 'deixar o descanso sempre para depois'],
    pergunta:
      'O que você está construindo, e quando vai se permitir descansar no caminho?',
  },
  Aquário: {
    simbolo: '♒',
    elemento: 'ar',
    modalidade: 'fixo',
    regente: 'Saturno (moderno: Urano)',
    forcas: ['originalidade de pensamento', 'senso de coletivo e amizade'],
    atencao: [
      'distanciamento das próprias emoções',
      'teimosia em defesa da independência',
    ],
    pergunta:
      'Como você pode ser você mesmo e ainda assim se sentir parte de algo?',
  },
  Peixes: {
    simbolo: '♓',
    elemento: 'água',
    modalidade: 'mutável',
    regente: 'Júpiter (moderno: Netuno)',
    forcas: ['empatia e sensibilidade', 'imaginação que inspira'],
    atencao: [
      'absorver o que os outros sentem',
      'fugir do concreto quando pesa',
    ],
    pergunta: 'Que sonho seu pede um primeiro passo bem concreto?',
  },
};

const NATUREZA_DO_ELEMENTO: Record<Elemento, string> = {
  fogo: 'ação e entusiasmo',
  terra: 'concretude e estabilidade',
  ar: 'ideias e relações',
  água: 'emoção e intuição',
};

const NATUREZA_DA_MODALIDADE: Record<Modalidade, string> = {
  cardinal: 'iniciar',
  fixo: 'sustentar',
  mutável: 'adaptar',
};

/** Frase da natureza simbólica do signo: elemento e modalidade. */
export function naturezaDoSigno(signo: Signo) {
  const s = SIGNOS_OCIDENTAIS[signo];
  return `${signo} é um signo de ${s.elemento}, ligado a ${NATUREZA_DO_ELEMENTO[s.elemento]}, e ${s.modalidade}, com o movimento de ${NATUREZA_DA_MODALIDADE[s.modalidade]}. O regente tradicional é ${s.regente}.`;
}

/** Elementos que a tradição considera afins (fogo com ar, terra com água). */
export function elementosAfins(a: Elemento, b: Elemento) {
  const par = new Set([a, b]);
  return (
    a === b ||
    (par.has('fogo') && par.has('ar')) ||
    (par.has('terra') && par.has('água'))
  );
}
