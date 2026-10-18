import { z } from 'zod';

import {
  type EntradaDaCredencial,
  PROVEDORES_DE_PAGAMENTO,
  type ProvedorDePagamento,
} from './credenciais';
import { errosDeFormato } from './formatos';

export const provedorSchema = z.enum(PROVEDORES_DE_PAGAMENTO, {
  error: 'Meio de pagamento desconhecido.',
});

// Campo opcional: vazio vira `undefined` ("manter o que está salvo").
const textoOpcional = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((valor) => (valor ? valor : undefined));

export const credencialSchema = z.object({
  ambiente: z.enum(['test', 'live']),
  ativo: z.boolean(),
  chavePublica: z
    .string()
    .trim()
    .max(255)
    .nullable()
    .transform((valor) => (valor ? valor : null)),
  segredo: textoOpcional,
  removerSegredo: z.boolean().optional().default(false),
  segredoDoWebhook: textoOpcional,
  removerSegredoDoWebhook: z.boolean().optional().default(false),
});

type CredencialInformada = z.output<typeof credencialSchema>;

/**
 * Valida os formatos do provedor (as mesmas regras da tela, em
 * `formatos.ts`) e monta a entrada do serviço.
 */
export function entradaDaCredencial(
  provedor: ProvedorDePagamento,
  informado: CredencialInformada
): { entrada: EntradaDaCredencial; erros: string[] } {
  return {
    erros: errosDeFormato(provedor, informado),
    entrada: {
      ambiente: informado.ambiente,
      ativo: informado.ativo,
      chavePublica: informado.chavePublica,
      segredo: informado.removerSegredo ? null : informado.segredo,
      segredoDoWebhook: informado.removerSegredoDoWebhook
        ? null
        : informado.segredoDoWebhook,
    },
  };
}
