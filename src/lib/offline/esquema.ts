import { z } from 'zod';
import {
  registroDoDiaSchema,
  type CampoDoRegistro,
} from '@/lib/metricas/registro-do-dia';
import { reflexaoSchema } from '@/lib/reflexao/esquema';
export const registroOfflineSchema = registroDoDiaSchema
  .safeExtend({ data: z.iso.date() })
  .strict();
export const reflexaoOfflineSchema = reflexaoSchema
  .safeExtend({ data: z.iso.date() })
  .strict();
const comum = {
  id: z.uuid(),
  base: z.string().regex(/^[a-f0-9]{64}$/),
  salvoLocalEm: z.iso.datetime(),
};
export const operacaoSchema = z.discriminatedUnion('tipo', [
  z
    .object({
      ...comum,
      tipo: z.literal('registro'),
      conteudo: registroOfflineSchema,
    })
    .strict(),
  z
    .object({
      ...comum,
      tipo: z.literal('reflexao'),
      conteudo: reflexaoOfflineSchema,
    })
    .strict(),
]);
export const envioSchema = z
  .object({ permissao: z.string().min(1).max(4096), operacao: operacaoSchema })
  .strict();
export type OperacaoOffline = z.output<typeof operacaoSchema>;
export type TipoOffline = OperacaoOffline['tipo'];
export interface BaseOffline {
  tipo: TipoOffline;
  data: string;
  revisao: string;
  registroId: string | null;
  valores: Partial<Record<CampoDoRegistro, number | null>>;
  reflexao: {
    emocional: number;
    corpo: number;
    espiritual: number;
    frase: string | null;
  } | null;
}
export interface ContextoOffline {
  selecao: { registro: boolean; reflexao: boolean };
  titular: string;
  nome: string;
  fuso: string;
  hoje: string;
  emitidoEm: string;
  expiraEm: string;
  permissao: string;
  recursos: { registro: boolean; reflexao: boolean };
  bases: BaseOffline[];
}
export interface ReciboOffline {
  id: string;
  tipo: TipoOffline;
  data: string;
  revisao: string;
  aplicadoEm: string;
  recalculos: 'concluidos' | 'pendentes';
  repetida: boolean;
}
