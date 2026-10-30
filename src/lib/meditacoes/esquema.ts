import { z } from 'zod';
import type { Finalidade } from './catalogo';

export const inicioSchema = z
  .object({
    id: z.uuid({ error: 'Identificador do pedido inválido.' }),
    pratica: z.string().regex(/^[a-z0-9-]{1,40}$/, 'Prática inválida.'),
    versao: z.number().int().positive('Versão da prática inválida.'),
  })
  .strict();
export const acaoSchema = z
  .object({
    acao: z.enum(['pausar', 'retomar', 'encerrar'], {
      error: 'Ação inválida.',
    }),
    versao: z.number().int().positive('Versão inválida.'),
  })
  .strict();

export type EstadoDaSessao = 'running' | 'paused' | 'completed' | 'ended';
export interface SessaoDeMeditacao {
  id: string;
  pratica: string;
  titulo: string;
  finalidade: Finalidade | null;
  versaoDaPratica: number;
  alvoSegundos: number;
  estado: EstadoDaSessao;
  decorridoMs: number;
  iniciadaEm: string;
  encerradaEm: string | null;
  dataLocal: string;
  /** Minutos inteiros realizados e somados à meditação do dia. */
  minutosRegistrados: number | null;
  versao: number;
}
export interface CentralDeMeditacoes {
  ativa: SessaoDeMeditacao | null;
  historico: SessaoDeMeditacao[];
  totais: { sessoes: number; concluidas: number; minutos: number };
  observadoEm: string;
}
