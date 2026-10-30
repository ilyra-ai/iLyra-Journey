import { z } from 'zod';
import type { PlanFeatureKey } from '@/types/subscription';

/** Janela máxima de uma consulta, em dias civis. */
export const JANELA_MAXIMA = 31;
/** Itens por página. */
export const ITENS_POR_PAGINA = 40;

export const ASSUNTOS = {
  registros: 'Registros pessoais',
  praticas: 'Práticas',
  metas: 'Metas',
  acontecimentos: 'Acontecimentos',
  experiencias: 'Experiências',
} as const;
export type Assunto = keyof typeof ASSUNTOS;
export const LISTA_DE_ASSUNTOS = Object.keys(ASSUNTOS) as Assunto[];

/**
 * Cada origem guarda a página onde o registro original pode ser consultado e
 * os recursos do plano que essa página já exige. A linha do tempo não amplia
 * nenhum acesso: uma origem fora do plano não é consultada.
 */
export const ORIGENS = {
  registro: {
    nome: 'Registro do dia',
    assunto: 'registros',
    recursos: ['daily_checkin'],
    destino: '/dia',
  },
  reflexao: {
    nome: 'Reflexão da noite',
    assunto: 'registros',
    recursos: ['evening_reflection'],
    destino: '/dia',
  },
  avaliacao: {
    nome: 'Avaliação de bem-estar',
    assunto: 'registros',
    recursos: ['wellbeing_assessments'],
    destino: '/',
  },
  acompanhamento: {
    nome: 'Acompanhamento pessoal',
    assunto: 'registros',
    recursos: ['wellbeing_assessments'],
    destino: '/acompanhamentos',
  },
  refeicao: {
    nome: 'Diário alimentar',
    assunto: 'registros',
    recursos: ['daily_checkin'],
    destino: '/alimentacao',
  },
  respiracao: {
    nome: 'Respiração guiada',
    assunto: 'praticas',
    recursos: ['guided_breathing'],
    destino: '/respiracao',
  },
  meditacao: {
    nome: 'Prática guiada',
    assunto: 'praticas',
    recursos: ['guided_breathing'],
    destino: '/meditacoes',
  },
  foco: {
    nome: 'Foco e pausa',
    assunto: 'praticas',
    recursos: [],
    destino: '/foco',
  },
  rotina: {
    nome: 'Rotina',
    assunto: 'praticas',
    recursos: ['personal_habits'],
    destino: '/rotinas',
  },
  meta: {
    nome: 'Meta',
    assunto: 'metas',
    recursos: ['goal_progress_tracking'],
    destino: '/goals',
  },
  acontecimento: {
    nome: 'Acontecimentos do dia',
    assunto: 'acontecimentos',
    recursos: ['daily_checkin'],
    destino: '/acontecimentos',
  },
  descanso: {
    nome: 'Modo descanso',
    assunto: 'acontecimentos',
    recursos: [],
    destino: '/descanso',
  },
  experiencia: {
    nome: 'Experiência pessoal',
    assunto: 'experiencias',
    recursos: ['personal_habits', 'metrics_history_days'],
    destino: '/experiencias',
  },
} as const satisfies Record<
  string,
  {
    nome: string;
    assunto: Assunto;
    recursos: readonly PlanFeatureKey[];
    destino: string;
  }
>;
export type Origem = keyof typeof ORIGENS;
export const LISTA_DE_ORIGENS = Object.keys(ORIGENS) as Origem[];

export const consultaSchema = z
  .object({
    inicio: z.iso.date({ error: 'Informe a data inicial.' }),
    fim: z.iso.date({ error: 'Informe a data final.' }),
    assuntos: z
      .array(z.enum(LISTA_DE_ASSUNTOS as [Assunto, ...Assunto[]]))
      .min(1, 'Escolha ao menos um assunto.')
      .refine(
        (a) => new Set(a).size === a.length,
        'Escolha cada assunto uma vez.'
      )
      .optional(),
    pagina: z
      .number()
      .int('Página inválida.')
      .min(0, 'Página inválida.')
      .max(1000, 'Página inválida.'),
  })
  .strict()
  .refine((p) => p.inicio <= p.fim, {
    message: 'A data inicial deve vir antes da final.',
    path: ['fim'],
  })
  .refine(
    (p) =>
      (Date.parse(p.fim) - Date.parse(p.inicio)) / 86400000 < JANELA_MAXIMA,
    {
      message: `Consulte até ${JANELA_MAXIMA} dias por vez.`,
      path: ['inicio'],
    }
  );
export type Consulta = z.infer<typeof consultaSchema>;

/** Lê a consulta dos parâmetros da URL. */
export function consultaDaUrl(q: URLSearchParams, hoje: string) {
  const assuntos = q.get('assuntos');
  return consultaSchema.parse({
    inicio: q.get('inicio') ?? hoje,
    fim: q.get('fim') ?? q.get('inicio') ?? hoje,
    // Sem filtro, a consulta usa todos os assuntos disponíveis no plano.
    assuntos:
      assuntos === null ? undefined : assuntos.split(',').filter(Boolean),
    pagina: Number(q.get('pagina') ?? '0'),
  });
}

export interface ItemDaLinhaDoTempo {
  /** Origem e identificador do registro original, sem repetição. */
  chave: string;
  origem: Origem;
  assunto: Assunto;
  data: string;
  /** Horário local "HH:mm" quando a origem guarda o instante; senão nulo. */
  hora: string | null;
  titulo: string;
  resumo: string;
  detalhes: Array<{ rotulo: string; valor: string }>;
  destino: string;
}
export interface LinhaDoTempo {
  hoje: string;
  corte: string | null;
  fuso: string;
  inicio: string;
  fim: string;
  assuntos: Array<{
    id: Assunto;
    nome: string;
    disponivel: boolean;
    selecionado: boolean;
    total: number;
  }>;
  /** Origens fora do plano atual: não são consultadas nem exibidas. */
  origensIndisponiveis: Origem[];
  itens: ItemDaLinhaDoTempo[];
  total: number;
  pagina: number;
  proximaPagina: number | null;
}

/**
 * Ordem da linha do tempo: dias do mais recente ao mais antigo; dentro do
 * dia, primeiro o que não tem horário (registros do dia inteiro), depois em
 * ordem cronológica. Empates seguem origem e chave, de forma estável.
 */
export function compararItens(a: ItemDaLinhaDoTempo, b: ItemDaLinhaDoTempo) {
  if (a.data !== b.data) return a.data < b.data ? 1 : -1;
  if (a.hora !== b.hora) {
    if (a.hora === null) return -1;
    if (b.hora === null) return 1;
    return a.hora < b.hora ? -1 : 1;
  }
  const oa = LISTA_DE_ORIGENS.indexOf(a.origem),
    ob = LISTA_DE_ORIGENS.indexOf(b.origem);
  if (oa !== ob) return oa - ob;
  return a.chave < b.chave ? -1 : a.chave > b.chave ? 1 : 0;
}
