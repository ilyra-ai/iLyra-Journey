import {
  longitudeTropical,
  normalizarGraus,
  SIGNOS,
} from '@/lib/astrology/sideral';
import {
  elementosAfins,
  FONTE_DOS_SIGNOS,
  naturezaDoSigno,
  SIGNOS_OCIDENTAIS,
  type Elemento,
  type Signo,
} from '@/lib/lyra/conhecimento/signos-ocidentais';

/**
 * Leitura gratuita com a voz do Motor Lyra (tarefa 158): só regras e
 * cálculos locais, sem modelo de IA e sem custo de tokens. Cada trecho
 * declara a própria origem ("por que esta frase foi mostrada").
 */

export interface OrigemDoTrecho {
  trecho: string;
  origem: string;
}

export interface LeituraGratuita {
  signo: Signo | null;
  simbolo: string | null;
  natureza: string | null;
  forcas: string[];
  atencao: string[];
  pergunta: string | null;
  reflexaoDoDia: {
    /** Dia civil em São Paulo, AAAA-MM-DD. */
    data: string;
    solHoje: Signo;
    texto: string;
  };
  origens: OrigemDoTrecho[];
}

function diaEmSaoPaulo(agora: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(agora);
}

/** Signo tropical do Sol no instante, calculado no servidor. */
export function signoDoSolNoInstante(instante: Date): Signo {
  const longitude = normalizarGraus(longitudeTropical('sol', instante));
  return SIGNOS[Math.floor(longitude / 30)];
}

function textoDaReflexao(natal: Signo | null, hoje: Signo) {
  const inicio = `Hoje o Sol passa por ${hoje}`;
  if (!natal)
    return `${inicio}, tema de ${SIGNOS_OCIDENTAIS[hoje].elemento}. Use a pergunta do seu signo, quando ele estiver confirmado, como ponto de partida da reflexão.`;
  if (natal === hoje)
    return `${inicio}, o mesmo signo do seu Sol de nascimento: um convite simbólico para revisitar a pergunta acima.`;
  const distancia = Math.abs(SIGNOS.indexOf(natal) - SIGNOS.indexOf(hoje));
  if (distancia === 6)
    return `${inicio}, o signo oposto ao seu: na leitura simbólica, um tema de equilíbrio entre o seu jeito e o de quem vê as coisas pelo outro lado.`;
  const a = SIGNOS_OCIDENTAIS[natal].elemento;
  const b = SIGNOS_OCIDENTAIS[hoje].elemento;
  if (a === b)
    return `${inicio}, signo de ${b}, o mesmo elemento do seu Sol: um tema simbólico de fluidez para levar a sua pergunta adiante.`;
  if (elementosAfins(a, b))
    return `${inicio}, signo de ${b}, elemento afim ${COM_A[a]} do seu Sol: um tema simbólico de fluidez para levar a sua pergunta adiante.`;
  return `${inicio}, signo de ${b}, diferente ${COM_DE[a]} do seu Sol: observe, como reflexão, o que esse outro ritmo pode ensinar ao seu.`;
}

/** Terra e água são femininos: "à água", "da terra". */
const COM_A: Record<Elemento, string> = {
  fogo: 'ao fogo',
  ar: 'ao ar',
  terra: 'à terra',
  água: 'à água',
};
const COM_DE: Record<Elemento, string> = {
  fogo: 'do fogo',
  ar: 'do ar',
  terra: 'da terra',
  água: 'da água',
};

/** Monta a leitura gratuita de um signo calculado (ou incerto: `null`). */
export function leituraGratuita(
  signo: Signo | null,
  agora = new Date()
): LeituraGratuita {
  const solHoje = signoDoSolNoInstante(agora);
  const dados = signo ? SIGNOS_OCIDENTAIS[signo] : null;
  const origens: OrigemDoTrecho[] = [
    {
      trecho: 'Signo solar',
      origem:
        'Cálculo astronômico da posição do Sol no zodíaco tropical para a data informada, feito no servidor.',
    },
    {
      trecho: 'Natureza, forças, pontos de atenção e pergunta',
      origem: `Regras da base curada da Lyra. ${FONTE_DOS_SIGNOS}. Temas de reflexão, não medidas de personalidade.`,
    },
    {
      trecho: 'Reflexão do dia',
      origem: `Posição do Sol calculada no servidor para ${diaEmSaoPaulo(agora)} (horário de Brasília), comparada com o seu signo pelas regras de elemento e oposição.`,
    },
  ];
  return {
    signo,
    simbolo: dados?.simbolo ?? null,
    natureza: signo ? naturezaDoSigno(signo) : null,
    forcas: dados ? [...dados.forcas] : [],
    atencao: dados ? [...dados.atencao] : [],
    pergunta: dados?.pergunta ?? null,
    reflexaoDoDia: {
      data: diaEmSaoPaulo(agora),
      solHoje,
      texto: textoDaReflexao(signo, solHoje),
    },
    origens,
  };
}
