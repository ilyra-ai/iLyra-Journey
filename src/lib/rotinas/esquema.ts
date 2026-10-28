import { z } from 'zod';
import { ATIVIDADES } from '@/lib/lembretes/esquema';

export const LIMITE_DE_ROTINAS = 30;
export const LIMITE_DE_PASSOS = 20;
export const passoSchema = z
  .object({
    id: z.uuid(),
    titulo: z.string().trim().min(1, 'Dê um nome ao passo.').max(120),
    minutos: z.number().int().min(1).max(180).nullable(),
    atividade: z.enum([
      'livre',
      'checkin',
      'respiracao',
      'habito',
      'plano',
      'metas',
    ]),
    habitoId: z.uuid().nullable(),
  })
  .strict()
  .refine(
    (p) =>
      p.atividade === 'habito' ? p.habitoId !== null : p.habitoId === null,
    {
      message: 'Escolha um hábito apenas para passos de hábito.',
      path: ['habitoId'],
    }
  );
export const rotinaSchema = z
  .object({
    titulo: z.string().trim().min(1, 'Dê um nome à rotina.').max(100),
    dias: z
      .array(z.number().int().min(0).max(6))
      .min(1, 'Escolha os dias.')
      .max(7)
      .refine((d) => new Set(d).size === d.length, 'Há dias repetidos.')
      .transform((d) => [...d].sort()),
    passos: z
      .array(passoSchema)
      .min(1, 'Acrescente um passo.')
      .max(LIMITE_DE_PASSOS)
      .refine(
        (p) => new Set(p.map((x) => x.id)).size === p.length,
        'Há passos repetidos.'
      ),
  })
  .strict();
export const editarRotinaSchema = rotinaSchema.extend({
  versao: z.number().int().positive(),
});
export const versaoSchema = z
  .object({ versao: z.number().int().positive() })
  .strict();
export const iniciarSchema = z
  .object({ idExecucao: z.uuid(), versao: z.number().int().positive() })
  .strict();
export const acaoDaRotinaSchema = z.discriminatedUnion('acao', [
  z
    .object({ acao: z.literal('pausar'), versao: z.number().int().positive() })
    .strict(),
  z
    .object({ acao: z.literal('retomar'), versao: z.number().int().positive() })
    .strict(),
  z
    .object({
      acao: z.enum(['concluir', 'pular']),
      passoId: z.uuid(),
      versao: z.number().int().positive(),
    })
    .strict(),
]);
export const PRATICAS = {
  livre: { nome: 'Passo livre', destino: null, recurso: null },
  ...ATIVIDADES,
  plano: {
    nome: 'Plano de hoje',
    destino: '/plan',
    recurso: 'ai_plan_generations',
  },
  metas: {
    nome: 'Metas',
    destino: '/goals',
    recurso: 'goal_progress_tracking',
  },
} as const;
export type DadosDaRotina = z.infer<typeof rotinaSchema>;
export type Passo = DadosDaRotina['passos'][number];
export type AcaoDaRotina = z.infer<typeof acaoDaRotinaSchema>;
export interface Execucao {
  id: string;
  rotinaId: string;
  titulo: string;
  estado: 'em_curso' | 'pausada' | 'encerrada';
  versao: number;
  iniciadaEm: string;
  finalizadaEm: string | null;
  passos: Array<Passo & { estado: 'pendente' | 'concluido' | 'pulado' }>;
}
export interface Rotina extends DadosDaRotina {
  id: string;
  versao: number;
  execucao: Execucao | null;
}
export interface CentralDeRotinas {
  rotinas: Rotina[];
  habitos: Array<{ id: string; nome: string }>;
}
