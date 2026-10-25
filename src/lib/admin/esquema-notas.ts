import { z } from 'zod';
import { semCaracteresDeControle } from '@/lib/reflexao/esquema';

export const LIMITE_TEXTO_NOTA = 2000;
export const LIMITE_NOTAS_POR_CONTA = 100;
export const textoNotaSchema = z
  .string()
  .max(8000)
  .transform((value) => semCaracteresDeControle(value).trim())
  .pipe(
    z
      .string()
      .min(1, 'Escreva a nota operacional.')
      .max(LIMITE_TEXTO_NOTA, 'A nota pode ter até 2.000 caracteres.')
  );
export const criarNotaSchema = z
  .object({ id: z.uuid(), body: textoNotaSchema })
  .strict();
export const versaoNotaSchema = z.number().int().min(1).max(4_294_967_294);
export const atualizarNotaSchema = z
  .object({ body: textoNotaSchema, version: versaoNotaSchema })
  .strict();
export const excluirNotaSchema = z
  .object({ version: versaoNotaSchema })
  .strict();
