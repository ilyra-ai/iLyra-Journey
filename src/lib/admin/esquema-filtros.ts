import { z } from 'zod';
import { PLAN_KEYS } from '@/types/subscription';
import { semCaracteresDeControle } from '@/lib/reflexao/esquema';
export const filtrosUsuariosSchema = z
  .object({
    access: z.enum(['all', 'active', 'blocked']).default('all'),
    role: z.string().trim().min(1).max(32).nullable().default(null),
    onboarding: z.enum(['all', 'complete', 'pending']).default('all'),
    plan: z.enum(['all', 'none', ...PLAN_KEYS]).default('all'),
    markerId: z.uuid().nullable().default(null),
  })
  .strict();
export const consultaUsuariosSchema = z
  .object({
    search: z.string().trim().max(120).default(''),
    filters: filtrosUsuariosSchema,
    sortColumn: z
      .enum(['created_at', 'first_name', 'email'])
      .default('created_at'),
    ascending: z.boolean().default(false),
  })
  .strict();
export type FiltrosUsuarios = z.infer<typeof filtrosUsuariosSchema>;
export type ConsultaUsuarios = z.infer<typeof consultaUsuariosSchema>;
export const FILTROS_INICIAIS = filtrosUsuariosSchema.parse({});
const name = z
  .string()
  .max(240)
  .transform((v) => semCaracteresDeControle(v).replace(/\s+/g, ' ').trim())
  .pipe(z.string().min(1).max(60));
export const criarSegmentoSchema = z
  .object({ id: z.uuid(), name, query: consultaUsuariosSchema })
  .strict();
export const editarSegmentoSchema = z
  .object({
    name,
    query: consultaUsuariosSchema,
    version: z.number().int().min(1).max(4294967294),
  })
  .strict();
export const excluirSegmentoSchema = z
  .object({ version: z.number().int().min(1).max(4294967294) })
  .strict();
export interface SegmentoUsuarios {
  id: string;
  name: string;
  query: ConsultaUsuarios;
  version: number;
}
