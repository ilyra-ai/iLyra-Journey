import { NextResponse } from 'next/server';

import { getBillingBaseUrl } from '@/lib/billing/config';
import { respostaDeErro } from '@/lib/http/api';
import { requireAdminSession } from '@/lib/mysql/server-auth';
import { listarCredenciaisPublicas } from '@/lib/pagamentos/credenciais';

export const runtime = 'nodejs';

const SEM_CACHE = { 'Cache-Control': 'private, no-store' };

/**
 * Meios de pagamento (Stripe, Mercado Pago e PayPal) sem os segredos, mais o
 * endereço do webhook da Stripe para cadastrar no painel dela.
 */
export async function GET(request: Request) {
  try {
    await requireAdminSession();
    const base = getBillingBaseUrl(new URL(request.url).origin);
    return NextResponse.json(
      {
        provedores: await listarCredenciaisPublicas(),
        webhookStripe: base ? `${base}/api/webhooks/stripe` : null,
      },
      { headers: SEM_CACHE }
    );
  } catch (error) {
    return respostaDeErro(error, 'Falha ao ler os meios de pagamento.');
  }
}
