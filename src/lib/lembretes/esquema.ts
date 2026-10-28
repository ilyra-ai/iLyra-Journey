import { z } from 'zod';

import { fusoValido } from '@/lib/astrology/tempo';
import type { PlanFeatureKey } from '@/types/subscription';

export const ATIVIDADES = {
  checkin: { nome: 'Check-in', destino: '/', recurso: 'daily_checkin' },
  respiracao: {
    nome: 'Respiração',
    destino: '/respiracao',
    recurso: 'guided_breathing',
  },
  habito: { nome: 'Hábito', destino: '/profile', recurso: 'personal_habits' },
} as const satisfies Record<
  string,
  { nome: string; destino: string; recurso: PlanFeatureKey }
>;

export const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const hora = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'Informe um horário válido.');

export const lembreteSchema = z
  .object({
    titulo: z.string().trim().min(1, 'Dê um nome ao lembrete.').max(100),
    atividade: z.enum(['checkin', 'respiracao', 'habito']),
    hora,
    dias: z
      .array(z.number().int().min(0).max(6))
      .min(1, 'Escolha ao menos um dia.')
      .max(7)
      .refine(
        (dias) => new Set(dias).size === dias.length,
        'Há dias repetidos.'
      )
      .transform((dias) => [...dias].sort()),
    ativo: z.boolean(),
  })
  .strict();
export type DadosDoLembrete = z.infer<typeof lembreteSchema>;
export const editarLembreteSchema = lembreteSchema.extend({
  versao: z.number().int().positive(),
});

export const preferenciasSchema = z
  .object({
    fuso: z
      .string()
      .min(1)
      .max(80)
      .refine(fusoValido, 'Escolha um fuso horário válido.'),
    silencioAtivo: z.boolean(),
    inicioSilencio: hora,
    fimSilencio: hora,
    versao: z.number().int().positive(),
  })
  .strict()
  .refine((p) => !p.silencioAtivo || p.inicioSilencio !== p.fimSilencio, {
    message: 'O início e o fim do silêncio precisam ser diferentes.',
    path: ['fimSilencio'],
  });
export type PreferenciasDeLembretes = z.infer<typeof preferenciasSchema>;
export const acaoSchema = z.discriminatedUnion('acao', [
  z
    .object({
      acao: z.literal('adiar'),
      minutos: z.union([z.literal(10), z.literal(30), z.literal(60)]),
      versao: z.number().int().positive(),
    })
    .strict(),
  z
    .object({
      acao: z.literal('dispensar'),
      versao: z.number().int().positive(),
    })
    .strict(),
]);

export interface Lembrete extends DadosDoLembrete {
  id: string;
  versao: number;
}
export interface AvisoDeLembrete {
  id: string;
  titulo: string;
  atividade: DadosDoLembrete['atividade'];
  previstoEm: string;
  estado: 'pending' | 'delivered';
  versao: number;
}
export interface CentralDeLembretes {
  preferencias: PreferenciasDeLembretes;
  lembretes: Lembrete[];
  avisos: AvisoDeLembrete[];
}
