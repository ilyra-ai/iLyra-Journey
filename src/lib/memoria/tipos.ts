import { z } from 'zod';

export const fatoSchema = z.object({
  uuid: z.uuid(),
  fact: z.string(),
  episodes: z.array(z.uuid()),
  created_at: z.string(),
  valid_at: z.string().nullable(),
  invalid_at: z.string().nullable(),
  origens: z
    .array(
      z.object({
        texto: z.string(),
        data: z.string(),
        conversaId: z.uuid().nullable(),
        titulo: z.string().nullable(),
      })
    )
    .default([]),
});
export type FatoDaMemoria = z.infer<typeof fatoSchema>;

export const estadoDaMemoriaSchema = z.object({
  ativa: z.boolean(),
  nuvem: z.boolean(),
  apagando: z.boolean(),
  fila: z.coerce.number(),
  prontos: z.coerce.number(),
  erros: z.coerce.number(),
  disponivel: z.boolean(),
  fatos: z.array(fatoSchema),
  proximo: z.number().nullable(),
});
export type EstadoDaMemoria = z.infer<typeof estadoDaMemoriaSchema>;
