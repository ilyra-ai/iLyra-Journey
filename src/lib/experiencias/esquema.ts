import { z } from 'zod';
export const LIMITE_DE_EXPERIENCIAS = 30;
export const experienciaSchema = z
  .object({
    pedidoId: z.uuid(),
    titulo: z.string().trim().min(1, 'Dê um nome à experiência.').max(100),
    objetivo: z
      .string()
      .trim()
      .min(1, 'Descreva o que deseja observar.')
      .max(500),
    mudanca: z
      .string()
      .trim()
      .min(1, 'Descreva a pequena mudança escolhida.')
      .max(500),
    inicio: z.iso.date(),
    alinhamentoSono: z.union([z.literal(0), z.literal(1)]),
    dias: z
      .number()
      .int()
      .min(3, 'Escolha ao menos três dias.')
      .max(60, 'Escolha até 60 dias.'),
    inicioReferencia: z.iso.date(),
    fimReferencia: z.iso.date(),
    metaId: z.uuid().nullable(),
    habitoId: z.uuid().nullable(),
  })
  .strict()
  .refine(
    (p) => p.inicioReferencia <= p.fimReferencia && p.fimReferencia < p.inicio,
    {
      message: 'A referência deve terminar antes do início da experiência.',
      path: ['fimReferencia'],
    }
  )
  .refine(
    (p) =>
      (Date.parse(p.fimReferencia) - Date.parse(p.inicioReferencia)) /
        86400000 <
      30,
    { message: 'Use até 30 dias de referência.', path: ['inicioReferencia'] }
  );
export const acaoSchema = z
  .object({
    acao: z.enum(['pausar', 'retomar', 'encerrar']),
    versao: z.number().int().positive(),
  })
  .strict();
export const versaoSchema = z
  .object({ versao: z.number().int().positive() })
  .strict();
export const notaSchema = z
  .object({
    idRelato: z.uuid(),
    data: z.iso.date(),
    seguiu: z.enum(['sim', 'parcial', 'nao']).nullable(),
    percepcao: z.number().int().min(1).max(5).nullable(),
    nota: z.string().trim().max(1000),
    versao: z.number().int().nonnegative(),
  })
  .strict()
  .refine(
    (p) => p.seguiu !== null || p.percepcao !== null || p.nota.length > 0,
    {
      message: 'Informe ao menos uma percepção, acompanhamento ou nota.',
      path: ['nota'],
    }
  );
export type DadosDaExperiencia = z.infer<typeof experienciaSchema>;
export type DadosDaNota = z.infer<typeof notaSchema>;
export interface Experiencia {
  id: string;
  titulo: string;
  objetivo: string;
  mudanca: string;
  inicioReferencia: string;
  fimReferencia: string;
  inicio: string;
  fim: string;
  fuso: string;
  alinhamentoSono: 0 | 1;
  metaId: string | null;
  habitoId: string | null;
  estado: 'em_curso' | 'pausada' | 'encerrada';
  versao: number;
  registradaEm: string;
  retrospectiva: boolean;
  encerradaEm: string | null;
  dataEncerramento: string | null;
  relatos: number;
}
export interface NotaDaExperiencia extends Omit<DadosDaNota, 'versao'> {
  versao: number;
}
export interface PausaDaExperiencia {
  id: string;
  inicio: string;
  fim: string | null;
  iniciadaEm: string;
  encerradaEm: string | null;
}
export interface CentralDeExperiencias {
  hoje: string;
  corte: string | null;
  fuso: string;
  experiencias: Experiencia[];
  metas: Array<{ id: string; titulo: string }>;
  habitos: Array<{ id: string; nome: string }>;
}
export interface LinhaDaRevisao {
  data: string;
  fase: 'referencia' | 'observacao';
  pausado: boolean;
  foraDoHistorico: boolean;
  dataSono: string;
  sonoId: string | null;
  energiaId: string | null;
  sono: number | null;
  energia: number | null;
  nota: NotaDaExperiencia | null;
}
export interface ResumoDaExperiencia {
  hoje: string;
  fimObservado: string;
  corte: string | null;
  experiencia: Experiencia;
  pausas: PausaDaExperiencia[];
  linhas: LinhaDaRevisao[];
  relatos: NotaDaExperiencia[];
  sobrepostas: number;
  criterios: { referencia: number; observacao: number };
  comparacoes: Array<{
    metrica: 'sono' | 'energia';
    nome: string;
    unidade: string;
    nReferencia: number;
    nObservacao: number;
    medianaReferencia: number | null;
    medianaObservacao: number | null;
    diferenca: number | null;
    apta: boolean;
  }>;
  revisao: string[];
  calculadaEm: string;
}
