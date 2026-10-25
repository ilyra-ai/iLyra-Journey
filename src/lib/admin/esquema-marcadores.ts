import { z } from 'zod';
import { semCaracteresDeControle } from '@/lib/reflexao/esquema';
import { CORES_MARCADOR } from '@/types/gestao-usuarios';

export const LIMITE_CATALOGO_MARCADORES = 50;
export const LIMITE_MARCADORES_POR_CONTA = 10;
const nome = z
  .string()
  .max(160)
  .transform((v) => semCaracteresDeControle(v).replace(/\s+/g, ' ').trim())
  .pipe(z.string().min(1).max(40));
const versao = z.number().int().min(1).max(4_294_967_294);
export const criarMarcadorSchema = z
  .object({ id: z.uuid(), name: nome, color: z.enum(CORES_MARCADOR) })
  .strict();
export const editarMarcadorSchema = z
  .object({ name: nome, color: z.enum(CORES_MARCADOR), version: versao })
  .strict();
export const excluirMarcadorSchema = z
  .object({
    version: versao,
    expectedUsers: z.number().int().min(0).max(100_000_000),
  })
  .strict();
export const atribuirMarcadorSchema = z
  .object({ assigned: z.boolean() })
  .strict();
