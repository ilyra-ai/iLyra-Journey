import { z } from 'zod';

import { PLAN_KEYS } from '@/types/subscription';

import {
  AMBIENTES_DE_PAGAMENTO,
  type AmbienteDePagamento,
  type EntradaDaCredencial,
  PROVEDORES_DE_PAGAMENTO,
  type ProvedorDePagamento,
} from './credenciais';
import { errosDeFormato, errosDosPrecosDaStripe } from './formatos';

export const provedorSchema = z.enum(PROVEDORES_DE_PAGAMENTO, {
  error: 'Meio de pagamento desconhecido.',
});

export const ambienteSchema = z.enum(AMBIENTES_DE_PAGAMENTO, {
  error: 'Ambiente desconhecido: use test (teste) ou live (produção).',
});

// Campo opcional: vazio vira `undefined` ("manter o que está salvo").
const textoOpcional = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((valor) => (valor ? valor : undefined));

// Id da Stripe: vazio vira `null` ("sem id neste ambiente").
const idDaStripe = z
  .string()
  .trim()
  .max(255)
  .nullable()
  .optional()
  .transform((valor) => (valor ? valor : null));

export const credencialSchema = z.object({
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
  precos: z
    .array(
      z.object({
        plano: z.enum(PLAN_KEYS),
        produto: idDaStripe,
        mensal: idDaStripe,
        anual: idDaStripe,
      })
    )
    .max(PLAN_KEYS.length)
    .optional(),
});

export const configuracaoSchema = z.object({
  ambienteEmUso: z.enum(AMBIENTES_DE_PAGAMENTO),
  ativo: z.boolean(),
});

type CredencialInformada = z.output<typeof credencialSchema>;

/**
 * Valida os formatos do provedor (as mesmas regras da tela, em
 * `formatos.ts`), inclusive chave da Stripe de outro ambiente e preços
 * repetidos, e monta a entrada do serviço.
 */
export function entradaDaCredencial(
  provedor: ProvedorDePagamento,
  ambiente: AmbienteDePagamento,
  informado: CredencialInformada
): { entrada: EntradaDaCredencial; erros: string[] } {
  return {
    erros: [
      ...errosDeFormato(provedor, informado, ambiente),
      ...errosDosPrecosDaStripe(informado.precos ?? []),
    ],
    entrada: {
      chavePublica: informado.chavePublica,
      segredo: informado.removerSegredo ? null : informado.segredo,
      segredoDoWebhook: informado.removerSegredoDoWebhook
        ? null
        : informado.segredoDoWebhook,
      precos: informado.precos,
    },
  };
}
