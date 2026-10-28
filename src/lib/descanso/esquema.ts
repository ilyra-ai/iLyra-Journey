import { z } from 'zod';
export const periodoSchema = z
  .object({
    inicio: z.iso.date(),
    fim: z.iso.date().nullable(),
    retornoDias: z.union([
      z.literal(0),
      z.literal(3),
      z.literal(7),
      z.literal(14),
    ]),
    atividade: z.enum(['checkin', 'respiracao', 'habito']).nullable(),
    metas: z
      .array(z.uuid())
      .max(50)
      .refine((a) => new Set(a).size === a.length, 'Há metas repetidas.'),
  })
  .strict()
  .refine(
    (p) => p.fim === null || p.fim >= p.inicio,
    'O fim deve ser no início ou depois dele.'
  )
  .refine(
    (p) =>
      p.fim === null ||
      (Date.parse(p.fim) - Date.parse(p.inicio)) / 86400000 <= 365,
    'Defina até 366 dias por pausa programada.'
  )
  .refine(
    (p) => p.retornoDias > 0 || p.atividade === null,
    'Sem retorno gradual, deixe a atividade de retorno vazia.'
  );
export const criarSchema = periodoSchema.safeExtend({ pedidoId: z.uuid() });
export const editarSchema = periodoSchema.safeExtend({
  versao: z.number().int().positive(),
});
export const acaoSchema = z
  .object({
    acao: z.enum(['encerrar', 'cancelar', 'concluir_retorno']),
    versao: z.number().int().positive(),
  })
  .strict();
export type DadosDoPeriodo = z.infer<typeof periodoSchema>;
export type EstadoDoPeriodo =
  'agendada' | 'ativa' | 'retorno' | 'encerrada' | 'cancelada';
export interface PeriodoDeDescanso {
  id: string;
  inicio: string;
  fim: string | null;
  fuso: string;
  ativadaEm: string | null;
  encerradaEm: string | null;
  dataEncerramento: string | null;
  canceladaEm: string | null;
  retornoDias: 0 | 3 | 7 | 14;
  atividade: 'checkin' | 'respiracao' | 'habito' | null;
  retornoEncerradoEm: string | null;
  dataFimRetorno: string | null;
  criadaEm: string;
  versao: number;
}
export interface AdaptacaoDaMeta {
  id: string;
  prazoOriginal: string;
  prazoEfetivo: string;
  diasNeutros: number;
  emDescanso: boolean;
}
export interface ResumoDoDescanso {
  agora: string;
  atual:
    | (PeriodoDeDescanso & {
        estado: EstadoDoPeriodo;
        hoje: string;
        inicioRetorno: string | null;
        fimRetorno: string | null;
      })
    | null;
}
export interface CentralDoDescanso extends ResumoDoDescanso {
  hoje: string;
  fuso: string;
  historico: PeriodoDeDescanso[];
  proximo: string | null;
  metas: { id: string; titulo: string; prazo: string }[];
  vinculos: { periodoId: string; metaId: string; prazoOriginal: string }[];
  atividades: ('checkin' | 'respiracao' | 'habito')[];
  adaptacoes: AdaptacaoDaMeta[];
}
