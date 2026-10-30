import { z } from 'zod';

/** Refeições, lanches e bebidas por dia, por conta. */
export const LIMITE_POR_DIA = 30;

export const TIPOS = {
  cafe: 'Café da manhã',
  almoco: 'Almoço',
  jantar: 'Jantar',
  lanche: 'Lanche',
  bebida: 'Bebida',
  outro: 'Outro',
} as const;
export type TipoDeRefeicao = keyof typeof TIPOS;
export const PORCOES = {
  pequena: 'Pequena',
  media: 'Média',
  grande: 'Grande',
} as const;
export type Porcao = keyof typeof PORCOES;
export const PERCEPCOES: Record<number, string> = {
  1: 'Muito desconfortável',
  2: 'Desconfortável',
  3: 'Neutra',
  4: 'Bem',
  5: 'Muito bem',
};

const campos = {
  data: z.iso.date({ error: 'Informe a data.' }),
  hora: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Informe o horário no formato HH:MM.'),
  tipo: z.enum(['cafe', 'almoco', 'jantar', 'lanche', 'bebida', 'outro'], {
    error: 'Escolha o tipo de registro.',
  }),
  descricao: z.string().trim().max(500, 'Use até 500 caracteres na descrição.'),
  porcao: z
    .enum(['pequena', 'media', 'grande'], { error: 'Porção inválida.' })
    .nullable(),
  percepcao: z
    .number({ error: 'Percepção inválida.' })
    .int('Percepção inválida.')
    .min(1, 'Percepção inválida.')
    .max(5, 'Percepção inválida.')
    .nullable(),
  nota: z.string().trim().max(500, 'Use até 500 caracteres na nota.'),
};
export const refeicaoSchema = z
  .object({ id: z.uuid({ error: 'Identificador inválido.' }), ...campos })
  .strict();
export type DadosDaRefeicao = z.infer<typeof refeicaoSchema>;
export const edicaoSchema = z
  .object({
    versao: z.number().int().positive('Versão inválida.'),
    ...campos,
  })
  .strict();
export type EdicaoDaRefeicao = z.infer<typeof edicaoSchema>;
export const versaoSchema = z
  .object({ versao: z.number().int().positive('Versão inválida.') })
  .strict();

export interface Refeicao {
  id: string;
  data: string;
  hora: string;
  tipo: TipoDeRefeicao;
  descricao: string;
  porcao: Porcao | null;
  percepcao: number | null;
  nota: string;
  /** Presente quando há foto; muda quando a foto é trocada. */
  foto: { bytes: number; assinatura: string } | null;
  versao: number;
  atualizadaEm: string;
}
export interface DiaDoDiario {
  hoje: string;
  corte: string | null;
  fuso: string;
  data: string;
  refeicoes: Refeicao[];
  /** Quantidade de registros por dia, nos últimos 31 dias permitidos. */
  dias: Array<{ data: string; total: number }>;
}
