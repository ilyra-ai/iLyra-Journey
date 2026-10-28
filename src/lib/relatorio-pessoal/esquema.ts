import { z } from 'zod';
import {
  NOMES_DOS_CAMPOS,
  CAMPOS_DO_REGISTRO,
  type CampoDoRegistro,
} from '@/lib/metricas/registro-do-dia';
export { CAMPOS_DO_REGISTRO, NOMES_DOS_CAMPOS };
export const selecaoSchema = z
  .object({
    inicio: z.iso.date(),
    fim: z.iso.date(),
    metricas: z
      .array(z.enum(NOMES_DOS_CAMPOS))
      .max(NOMES_DOS_CAMPOS.length)
      .refine(
        (a) => new Set(a).size === a.length,
        'Selecione cada métrica uma vez.'
      ),
    reflexoes: z.boolean(),
    acontecimentos: z.boolean(),
    notas: z.boolean(),
  })
  .strict()
  .refine((p) => p.inicio <= p.fim, 'A data inicial deve vir antes da final.')
  .refine(
    (p) => (Date.parse(p.fim) - Date.parse(p.inicio)) / 86400000 < 90,
    'Escolha até 90 dias por relatório.'
  )
  .refine(
    (p) => p.metricas.length > 0 || p.reflexoes || p.acontecimentos,
    'Selecione ao menos uma categoria.'
  );
export const downloadSchema = z
  .object({
    selecao: selecaoSchema,
    revisao: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
export type Selecao = z.infer<typeof selecaoSchema>;
export interface OpcoesDoRelatorio {
  hoje: string;
  corte: string | null;
  fuso: string;
  reflexoes: boolean;
  acontecimentos: boolean;
  metricas: boolean;
}
export interface DiaDoRelatorio {
  data: string;
  registroId: string | null;
  valores: Partial<Record<CampoDoRegistro, number | null>>;
  reflexao: {
    id: string;
    emocional: number;
    corpo: number;
    espiritual: number;
    nota?: string | null;
  } | null;
  acontecimentos: {
    revisado: boolean;
    marcadores: string[];
    nota?: string;
  } | null;
}
export interface RelatorioPessoal {
  selecao: Selecao;
  fuso: string;
  extraidoEm: string;
  dias: DiaDoRelatorio[];
  revisao: string;
  resumos: {
    campo: CampoDoRegistro;
    nome: string;
    unidade: string;
    n: number;
    ausentes: number;
    mediana: number | null;
    minimo: number | null;
    maximo: number | null;
  }[];
}
export function unidadeDoCampo(c: CampoDoRegistro) {
  const d = CAMPOS_DO_REGISTRO[c];
  return 'unidade' in d
    ? d.unidade
    : ['humor', 'energia'].includes(c)
      ? '1–5'
      : 'passos';
}
export function valorDoRelatorio(
  c: CampoDoRegistro,
  v: unknown
): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v),
    d = CAMPOS_DO_REGISTRO[c];
  return Number.isFinite(n) && n >= d.minimo && n <= d.maximo ? n : null;
}
