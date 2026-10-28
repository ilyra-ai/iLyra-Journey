import { z } from 'zod';

export const pesquisaDoChatSchema = z
  .object({
    termo: z
      .string()
      .trim()
      .max(160)
      .transform((s) => s.normalize('NFC'))
      .default(''),
    favoritos: z.boolean().default(false),
    cursor: z.string().max(1024).nullable().default(null),
  })
  .strict()
  .refine((p) => p.favoritos || p.termo.length > 0, {
    message: 'Digite o que deseja encontrar.',
    path: ['termo'],
  });

export type PesquisaDoChat = z.infer<typeof pesquisaDoChatSchema>;

/** LIKE trata %, _ e ! como texto, não como instruções de correspondência. */
export function escaparBuscaLiteral(termo: string) {
  return `%${termo.replace(/[!%_]/g, (simbolo) => `!${simbolo}`)}%`;
}
