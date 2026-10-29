import { z } from 'zod';
export const inicioSchema = z
  .object({
    id: z.uuid(),
    tipo: z.enum(['foco', 'pausa']),
    minutos: z.number().int().min(1).max(180),
  })
  .strict()
  .refine((p) => p.tipo !== 'pausa' || p.minutos <= 60, {
    message: 'Uma pausa pode durar até 60 minutos.',
    path: ['minutos'],
  });
export const acaoSchema = z
  .object({
    acao: z.enum(['pausar', 'retomar', 'encerrar']),
    versao: z.number().int().positive(),
  })
  .strict();
export const percepcaoSchema = z
  .object({
    versao: z.number().int().positive(),
    percepcao: z.number().int().min(1).max(5).nullable(),
    nota: z.string().trim().max(280),
  })
  .strict();
export interface SessaoDeFoco {
  id: string;
  tipo: 'foco' | 'pausa';
  alvoSegundos: number;
  estado: 'running' | 'paused' | 'completed' | 'ended';
  decorridoMs: number;
  iniciadaEm: string;
  encerradaEm: string | null;
  percepcao: number | null;
  nota: string | null;
  versao: number;
}
export interface CentralDeFoco {
  ativa: SessaoDeFoco | null;
  historico: SessaoDeFoco[];
  proximo: string | null;
  observadoEm: string;
  totais: { focos: number; pausas: number; focoMs: number; pausaMs: number };
}
