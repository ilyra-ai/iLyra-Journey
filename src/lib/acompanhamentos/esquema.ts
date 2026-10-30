import { z } from 'zod';

/** Limite de acompanhamentos por conta, somando ativos e arquivados. */
export const LIMITE_DE_ACOMPANHAMENTOS = 30;
/** Janela máxima de uma consulta de histórico, em dias civis. */
export const JANELA_MAXIMA_DO_HISTORICO = 366;

export const FREQUENCIAS = {
  diaria: { nome: 'Diária', descricao: 'Uma resposta por dia' },
  semanal: {
    nome: 'Semanal',
    descricao: 'Uma resposta por semana, começando na segunda-feira',
  },
} as const;
export type Frequencia = keyof typeof FREQUENCIAS;

const ponto = z
  .number({ error: 'Informe um ponto da escala.' })
  .int('Use um ponto inteiro da escala.')
  .min(0, 'Use pontos entre 0 e 10.')
  .max(10, 'Use pontos entre 0 e 10.');
const rotuloSchema = z.object({
  valor: ponto,
  rotulo: z.string().trim().max(40, 'Use até 40 caracteres em cada rótulo.'),
});

/**
 * Escala de pontos inteiros consecutivos. Começa em 0 ou 1, termina em até 10
 * e precisa de rótulos nos extremos para que cada resposta seja compreensível.
 * Pontos intermediários podem ter rótulo próprio ou ficar só com o número.
 */
export const escalaSchema = z
  .object({
    minimo: z.union([z.literal(0), z.literal(1)], {
      error: 'O menor ponto deve ser 0 ou 1.',
    }),
    maximo: z
      .number({ error: 'Informe o maior ponto da escala.' })
      .int('Use um ponto inteiro da escala.')
      .min(1, 'O maior ponto deve ficar entre 1 e 10.')
      .max(10, 'O maior ponto deve ficar entre 1 e 10.'),
    rotulos: z.array(rotuloSchema).max(11, 'Use até 11 rótulos.'),
  })
  .strict()
  .refine((e) => e.maximo > e.minimo, {
    message: 'O maior ponto deve ser maior que o menor.',
    path: ['maximo'],
  })
  .refine(
    (e) => e.rotulos.every((r) => r.valor >= e.minimo && r.valor <= e.maximo),
    { message: 'Há rótulo fora da escala escolhida.', path: ['rotulos'] }
  )
  .refine(
    (e) => new Set(e.rotulos.map((r) => r.valor)).size === e.rotulos.length,
    { message: 'Cada ponto pode ter um único rótulo.', path: ['rotulos'] }
  )
  .refine(
    (e) =>
      [e.minimo, e.maximo].every((v) =>
        e.rotulos.some((r) => r.valor === v && r.rotulo.length > 0)
      ),
    {
      message: 'Dê um rótulo ao menor e ao maior ponto da escala.',
      path: ['rotulos'],
    }
  );
export type Escala = z.infer<typeof escalaSchema>;

const nome = z
  .string()
  .trim()
  .min(1, 'Dê um nome ao acompanhamento.')
  .max(60, 'Use até 60 caracteres no nome.');
const descricao = z
  .string()
  .trim()
  .max(300, 'Use até 300 caracteres na descrição.');

export const acompanhamentoSchema = z
  .object({
    pedidoId: z.uuid(),
    nome,
    descricao,
    frequencia: z.enum(['diaria', 'semanal']),
    escala: escalaSchema,
  })
  .strict();
export type DadosDoAcompanhamento = z.infer<typeof acompanhamentoSchema>;

export const edicaoSchema = z
  .object({
    versao: z.number().int().positive(),
    nome,
    descricao,
    frequencia: z.enum(['diaria', 'semanal']),
    escala: escalaSchema,
  })
  .strict();
export type EdicaoDoAcompanhamento = z.infer<typeof edicaoSchema>;

export const acaoSchema = z
  .object({
    acao: z.enum(['arquivar', 'restaurar']),
    versao: z.number().int().positive(),
  })
  .strict();
export const versaoSchema = z
  .object({ versao: z.number().int().positive() })
  .strict();
export const ordemSchema = z
  .object({
    ids: z
      .array(z.uuid())
      .max(LIMITE_DE_ACOMPANHAMENTOS)
      .refine((a) => new Set(a).size === a.length, 'Repita cada item uma vez.'),
  })
  .strict();

export const registroSchema = z
  .object({
    idRegistro: z.uuid(),
    data: z.iso.date(),
    valor: ponto,
    nota: z.string().trim().max(500, 'Use até 500 caracteres na nota.'),
    versao: z.number().int().nonnegative(),
  })
  .strict();
export type DadosDoRegistro = z.infer<typeof registroSchema>;
export const exclusaoDeRegistroSchema = z
  .object({ idRegistro: z.uuid(), versao: z.number().int().positive() })
  .strict();

export const periodoSchema = z
  .object({ inicio: z.iso.date(), fim: z.iso.date() })
  .refine((p) => p.inicio <= p.fim, 'A data inicial deve vir antes da final.')
  .refine(
    (p) =>
      (Date.parse(p.fim) - Date.parse(p.inicio)) / 86400000 <
      JANELA_MAXIMA_DO_HISTORICO,
    `Consulte até ${JANELA_MAXIMA_DO_HISTORICO} dias por vez.`
  );

export interface DefinicaoDoAcompanhamento {
  id: string;
  sequencia: number;
  frequencia: Frequencia;
  escala: Escala;
  criadaEm: string;
}
export interface Acompanhamento {
  id: string;
  nome: string;
  descricao: string;
  posicao: number;
  arquivado: boolean;
  arquivadoEm: string | null;
  versao: number;
  criadoEm: string;
  definicao: DefinicaoDoAcompanhamento;
  registros: number;
  ultimoRegistro: { data: string; valor: number; rotulo: string } | null;
  /** Data do período atual (hoje ou a segunda-feira desta semana). */
  periodoAtual: string;
  respondidoNoPeriodoAtual: boolean;
}
export interface CentralDeAcompanhamentos {
  hoje: string;
  corte: string | null;
  fuso: string;
  acompanhamentos: Acompanhamento[];
}
export interface RegistroDoAcompanhamento {
  idRegistro: string;
  data: string;
  valor: number;
  rotulo: string;
  nota: string;
  versao: number;
  definicaoId: string;
  /** Verdadeiro quando a resposta usou uma escala ou frequência anterior. */
  definicaoAnterior: boolean;
  atualizadoEm: string;
}
export interface ResumoDaDefinicao {
  definicaoId: string;
  sequencia: number;
  respostas: number;
  mediana: number | null;
  minimo: number | null;
  maximo: number | null;
}
export interface DetalheDoAcompanhamento {
  hoje: string;
  corte: string | null;
  fuso: string;
  inicio: string;
  fim: string;
  acompanhamento: Acompanhamento;
  definicoes: DefinicaoDoAcompanhamento[];
  registros: RegistroDoAcompanhamento[];
  /**
   * Períodos esperados pela frequência atual (dias ou segundas-feiras), desde
   * o primeiro período acompanhado dentro da janela. Um período sem registro
   * é ausência de resposta, nunca zero.
   */
  periodos: string[];
  semRegistro: number;
  resumos: ResumoDaDefinicao[];
  calculadoEm: string;
}

/** Texto de cada ponto: rótulo do titular ou o próprio número. */
export function rotuloDoValor(escala: Escala, valor: number): string {
  const r = escala.rotulos.find((x) => x.valor === valor)?.rotulo;
  return r ? `${valor} · ${r}` : String(valor);
}
export function pontosDaEscala(escala: Escala): number[] {
  return Array.from(
    { length: escala.maximo - escala.minimo + 1 },
    (_, i) => escala.minimo + i
  );
}
export function faixaDaEscala(escala: Escala) {
  return `${escala.minimo} a ${escala.maximo}`;
}
/** Dia da semana (0 = domingo) de uma data civil ISO. */
export function diaDaSemana(data: string) {
  return new Date(`${data}T12:00:00Z`).getUTCDay();
}
/** Segunda-feira da semana civil que contém a data. */
export function inicioDaSemana(data: string) {
  const d = new Date(`${data}T12:00:00Z`),
    deslocamento = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - deslocamento);
  return d.toISOString().slice(0, 10);
}
export function mesmaEscala(a: Escala, b: Escala) {
  const normalizar = (e: Escala) =>
    JSON.stringify({
      minimo: e.minimo,
      maximo: e.maximo,
      rotulos: [...e.rotulos]
        .filter((r) => r.rotulo.length > 0)
        .sort((x, y) => x.valor - y.valor),
    });
  return normalizar(a) === normalizar(b);
}
/** Mantém somente rótulos preenchidos, em ordem crescente. */
export function escalaNormalizada(e: Escala): Escala {
  return {
    minimo: e.minimo,
    maximo: e.maximo,
    rotulos: e.rotulos
      .filter((r) => r.rotulo.length > 0)
      .sort((a, b) => a.valor - b.valor),
  };
}

export const MODELOS_DE_ESCALA: ReadonlyArray<{
  id: string;
  nome: string;
  escala: Escala;
}> = [
  {
    id: 'cinco',
    nome: '1 a 5',
    escala: {
      minimo: 1,
      maximo: 5,
      rotulos: [
        { valor: 1, rotulo: 'Muito baixa' },
        { valor: 2, rotulo: 'Baixa' },
        { valor: 3, rotulo: 'Média' },
        { valor: 4, rotulo: 'Alta' },
        { valor: 5, rotulo: 'Muito alta' },
      ],
    },
  },
  {
    id: 'tres',
    nome: 'Baixa, média ou alta',
    escala: {
      minimo: 1,
      maximo: 3,
      rotulos: [
        { valor: 1, rotulo: 'Baixa' },
        { valor: 2, rotulo: 'Média' },
        { valor: 3, rotulo: 'Alta' },
      ],
    },
  },
  {
    id: 'dez',
    nome: '0 a 10',
    escala: {
      minimo: 0,
      maximo: 10,
      rotulos: [
        { valor: 0, rotulo: 'Nada' },
        { valor: 10, rotulo: 'Totalmente' },
      ],
    },
  },
  {
    id: 'simnao',
    nome: 'Sim ou não',
    escala: {
      minimo: 0,
      maximo: 1,
      rotulos: [
        { valor: 0, rotulo: 'Não' },
        { valor: 1, rotulo: 'Sim' },
      ],
    },
  },
];
