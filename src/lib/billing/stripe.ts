import Stripe from 'stripe';

import { HttpError } from '@/lib/http-error';
import { getStripeApiVersion } from '@/lib/billing/config';
import { credenciaisDoStripe } from '@/lib/pagamentos/credenciais';

// Cache do cliente no escopo global (sobrevive ao hot reload em
// desenvolvimento), associado à chave com que foi criado: trocar a chave em
// Admin → Pagamentos passa a valer na próxima chamada, sem reiniciar o app.
type GlobalStripeState = typeof globalThis & {
  __lyraStripeClient?: { chave: string; cliente: Stripe };
};

const globalStripeState = globalThis as GlobalStripeState;

/**
 * Cliente Stripe com as chaves em uso: as do painel do administrador ou, na
 * falta delas, STRIPE_SECRET_KEY do .env.local.
 */
export async function getStripeClient(credenciais?: {
  chaveSecreta: string | null;
}): Promise<Stripe> {
  const { chaveSecreta } = credenciais ?? (await credenciaisDoStripe());

  if (!chaveSecreta) {
    throw new HttpError(
      'Billing externo não configurado: informe a chave da Stripe em Admin → Pagamentos (ou STRIPE_SECRET_KEY no .env.local).',
      503
    );
  }

  const atual = globalStripeState.__lyraStripeClient;
  if (atual?.chave === chaveSecreta) {
    return atual.cliente;
  }

  const cliente = new Stripe(chaveSecreta, {
    apiVersion: getStripeApiVersion(),
    typescript: true,
  });
  globalStripeState.__lyraStripeClient = { chave: chaveSecreta, cliente };
  return cliente;
}
