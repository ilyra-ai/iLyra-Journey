import { z } from 'zod';

import type { DashaAtual } from '@/lib/astrology/vimshottari';
import { TEMA_DO_DASHA } from '@/lib/lyra/conhecimento/jyotish';
import type { Graha } from '@/lib/astrology/sideral';

/**
 * Teatro dos Futuros Revisáveis (tarefa 189). A pessoa traz uma dúvida e
 * três caminhos que ela mesma escreve; a Lyra devolve três histórias
 * hipotéticas, uma por caminho, separando:
 * - FATOS do mapa calculado (período Vimshottari vigente e as datas dele);
 * - SÍMBOLOS da tradição (o tema do senhor do período);
 * - FICÇÃO: a história, que só reorganiza o que a pessoa escreveu, sem
 *   inventar acontecimentos, sem previsão e sem diagnóstico.
 * Tudo por regras, sem modelo de IA; nada é gravado. Mudar uma premissa muda
 * a história, porque o texto é montado a partir dela.
 */

export const HORIZONTES = {
  '3m': { rotulo: 'três meses', meses: 3 },
  '1a': { rotulo: 'um ano', meses: 12 },
  '3a': { rotulo: 'três anos', meses: 36 },
} as const;

export type Horizonte = keyof typeof HORIZONTES;

const texto = (max: number) =>
  z
    .string()
    .trim()
    .min(3, 'Escreva pelo menos três letras.')
    .max(max, `Use até ${max} caracteres.`);

export const esquemaDoTeatro = z
  .object({
    duvida: texto(200),
    horizonte: z.enum(['3m', '1a', '3a']),
    caminhos: z
      .array(z.object({ titulo: texto(60), passo: texto(200) }).strict())
      .length(3, 'Escreva três caminhos.'),
  })
  .strict();

export type PremissasDoTeatro = z.infer<typeof esquemaDoTeatro>;

/**
 * Temas que não viram cenário: decisões de saúde (a Lyra não orienta
 * tratamento) e risco à vida (a resposta é cuidado imediato, não ficção).
 */
const RISCO =
  /suic[ií]d|me matar|tirar a (minha )?vida|n[aã]o quero (mais )?viver|autoles|me machucar/i;
const SAUDE =
  /rem[eé]dio|medica[cç][aã]o|tratamento|diagn[oó]stic|quimio|cirurgi|dose|parar de tomar|doen[cç]a|gravidez|abort/i;

export type TemaSensivel = 'risco' | 'saude' | null;

export function temaSensivel(premissas: PremissasDoTeatro): TemaSensivel {
  const tudo = [
    premissas.duvida,
    ...premissas.caminhos.flatMap((c) => [c.titulo, c.passo]),
  ].join(' \n ');
  if (RISCO.test(tudo)) return 'risco';
  if (SAUDE.test(tudo)) return 'saude';
  return null;
}

export const MENSAGEM_DO_TEMA: Record<Exclude<TemaSensivel, null>, string> = {
  risco:
    'Isto não é para um cenário de ficção. Se você está pensando em tirar a própria vida ou em se machucar, fale agora com o CVV, pelo 188 (ligação gratuita, 24 horas) ou em cvv.org.br. Em perigo imediato, ligue 192 (SAMU) ou vá a um pronto-socorro.',
  saude:
    'Decisões de saúde, remédios e tratamentos ficam com profissionais de saúde: a Lyra não monta cenários sobre isso. Você pode usar o Teatro para outras escolhas da sua vida.',
};

interface Periodo {
  nome: string;
  graha: Graha;
  inicio: Date;
  fim: Date;
}

export interface FatoDoMapa {
  rotulo: string;
  texto: string;
}

export interface Ramo {
  id: string;
  titulo: string;
  passo: string;
  historia: string[];
  perguntas: string[];
}

export interface TeatroDosFuturos {
  aviso: 'NÃO É PREVISÃO';
  fatos: FatoDoMapa[];
  simbolos: FatoDoMapa[];
  ramos: Ramo[];
}

const mesAno = (data: Date) =>
  data.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  });

function somarMeses(data: Date, meses: number) {
  const nova = new Date(data);
  nova.setUTCMonth(nova.getUTCMonth() + meses);
  return nova;
}

function nomeCurto(nome: string) {
  return nome.split(' (')[0];
}

function periodo(p: DashaAtual['mahadasha']): Periodo {
  return {
    nome: nomeCurto(p.nome),
    graha: p.graha,
    inicio: p.inicio,
    fim: p.fim,
  };
}

/** Período do mapa: fato calculado; sem hora de nascimento, não há. */
export interface ContextoDoMapa {
  dasha: DashaAtual | null;
}

export function montarTeatro(
  premissas: PremissasDoTeatro,
  contexto: ContextoDoMapa,
  agora = new Date()
): TeatroDosFuturos {
  const horizonte = HORIZONTES[premissas.horizonte];
  const fimDoHorizonte = somarMeses(agora, horizonte.meses);
  const fatos: FatoDoMapa[] = [];
  const simbolos: FatoDoMapa[] = [];
  let virada: Periodo | null = null;

  if (contexto.dasha) {
    const maha = periodo(contexto.dasha.mahadasha);
    const antar = periodo(contexto.dasha.antardasha);
    fatos.push({
      rotulo: 'Período vigente (Vimshottari)',
      texto: `Mahadasha de ${maha.nome} até ${mesAno(maha.fim)}; subperíodo de ${antar.nome} até ${mesAno(antar.fim)}.`,
    });
    const proximo = contexto.dasha.proximaAntardasha;
    if (proximo && proximo.inicio <= fimDoHorizonte) {
      virada = {
        nome: nomeCurto(proximo.nome),
        graha: proximo.graha,
        inicio: proximo.inicio,
        fim: proximo.inicio,
      };
      fatos.push({
        rotulo: 'Mudança dentro do horizonte',
        texto: `Em ${mesAno(proximo.inicio)} começa o subperíodo de ${virada.nome}.`,
      });
    }
    simbolos.push({
      rotulo: `${maha.nome} na tradição`,
      texto: `Lido como ${TEMA_DO_DASHA[maha.graha]}.`,
    });
    if (antar.graha !== maha.graha)
      simbolos.push({
        rotulo: `${antar.nome} na tradição`,
        texto: `Lido como ${TEMA_DO_DASHA[antar.graha]}.`,
      });
    if (virada)
      simbolos.push({
        rotulo: `${virada.nome} na tradição`,
        texto: `Lido como ${TEMA_DO_DASHA[virada.graha]}.`,
      });
  } else {
    fatos.push({
      rotulo: 'Período vigente',
      texto:
        'Sem a hora de nascimento, o período Vimshottari não é determinável: as histórias abaixo usam só as suas premissas.',
    });
  }

  const tema = contexto.dasha
    ? TEMA_DO_DASHA[contexto.dasha.mahadasha.graha]
    : null;
  const nomeDoPeriodo = contexto.dasha
    ? nomeCurto(contexto.dasha.mahadasha.nome)
    : null;

  const ramos = premissas.caminhos.map((caminho, i): Ramo => {
    const historia = [
      `Cena 1. Diante de "${premissas.duvida}", você escolhe: ${caminho.titulo}. O primeiro passo é o que você escreveu: ${caminho.passo}.`,
      `Cena 2. Imagine os próximos ${horizonte.rotulo} com esse passo no centro. Esta história não diz o que vai acontecer: ela só acompanha a escolha que você descreveu, para você observar como se sente dentro dela.`,
    ];
    if (tema && nomeDoPeriodo)
      historia.push(
        `Cena 3. Como lente simbólica, o período de ${nomeDoPeriodo} costuma ser lido como ${tema}. O que, em "${caminho.titulo}", conversa com esse tema, e o que vai na direção contrária?`
      );
    if (virada)
      historia.push(
        `Cena 4. Em ${mesAno(virada.inicio)}, quando começa o subperíodo de ${virada.nome}, a história faz uma pausa: um ponto simbólico para revisar este caminho, sem nada marcado para acontecer.`
      );
    return {
      id: `caminho-${i + 1}`,
      titulo: caminho.titulo,
      passo: caminho.passo,
      historia,
      perguntas: [
        `Se você seguir "${caminho.titulo}", o que precisa estar verdadeiro daqui a ${horizonte.rotulo} para você se sentir em paz com a escolha?`,
        'Qual premissa deste caminho você mudaria primeiro, e por quê?',
        'O que você ganha e o que você deixa de lado em comparação com os outros dois caminhos?',
      ],
    };
  });

  return { aviso: 'NÃO É PREVISÃO', fatos, simbolos, ramos };
}
