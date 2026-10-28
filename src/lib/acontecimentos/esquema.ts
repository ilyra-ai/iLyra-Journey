import { z } from 'zod';
export const LIMITE_DE_MARCADORES = 30;
export const marcadorSchema = z
  .object({
    nome: z
      .string()
      .trim()
      .min(1, 'Dê um nome ao marcador.')
      .max(80)
      .transform((s) => s.normalize('NFC')),
  })
  .strict();
export const versaoSchema = z
  .object({ versao: z.number().int().positive() })
  .strict();
export const editarMarcadorSchema = marcadorSchema.extend({
  versao: z.number().int().positive(),
});
export const diaSchema = z
  .object({
    data: z.iso.date(),
    marcadores: z
      .array(z.uuid())
      .max(LIMITE_DE_MARCADORES)
      .refine((a) => new Set(a).size === a.length, 'Há marcadores repetidos.'),
    nota: z.string().trim().max(1000),
    confirmado: z.literal(true, {
      error: 'Confirme que revisou os acontecimentos deste dia.',
    }),
    versao: z.number().int().nonnegative(),
  })
  .strict();
export const periodoSchema = z
  .object({ inicio: z.iso.date(), fim: z.iso.date() })
  .strict()
  .refine((p) => p.inicio <= p.fim, 'A data inicial deve vir antes da final.')
  .refine(
    (p) => (Date.parse(p.fim) - Date.parse(p.inicio)) / 86400000 < 366,
    'Escolha até 366 dias.'
  );
export const comparacaoSchema = periodoSchema.safeExtend({
  marcadorId: z.uuid(),
  metrica: z.enum(['sono', 'energia']),
  deslocamento: z.union([z.literal(0), z.literal(1)]),
});
export type PedidoDoDia = z.infer<typeof diaSchema>;
export type PedidoDaComparacao = z.infer<typeof comparacaoSchema>;
export interface Marcador {
  id: string;
  nome: string;
  versao: number;
}
export interface DiaDeAcontecimentos {
  data: string;
  nota: string;
  confirmado: boolean;
  versao: number;
  marcadores: string[];
}
export interface CentralDeAcontecimentos {
  hoje: string;
  fuso: string;
  corte: string | null;
  comparacaoPermitida: boolean;
  inicio: string;
  fim: string;
  marcadores: Marcador[];
  dias: DiaDeAcontecimentos[];
}
export interface ParDeObservacao {
  data: string;
  dataMetrica: string;
  confirmado: boolean;
  presenca: boolean | null;
  valor: number | null;
  metricaId: string | null;
  atualizadaEm: string | null;
  outrosMarcadores: number;
  ausencia: string | null;
}
export interface Comparacao {
  pedido: PedidoDaComparacao;
  marcador: string;
  unidade: string;
  nomeMetrica: string;
  pares: ParDeObservacao[];
  qualidade: {
    dias: number;
    paresValidos: number;
    com: number;
    sem: number;
    cobertura: number;
    apta: boolean;
    motivos: string[];
  };
  resumo: {
    medianaCom: number;
    medianaSem: number;
    diferenca: number;
    contraditorio: boolean;
    outrosMarcadoresEm: number;
  } | null;
  calculadaEm: string;
}
