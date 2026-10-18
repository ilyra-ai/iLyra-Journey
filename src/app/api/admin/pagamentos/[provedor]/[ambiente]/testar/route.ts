import { NextResponse } from 'next/server';

import { HttpError } from '@/lib/http-error';
import { respostaDeErro } from '@/lib/http/api';
import { requireAdminSession } from '@/lib/mysql/server-auth';
import { testarCredenciaisSalvas } from '@/lib/pagamentos/credenciais';
import { ambienteSchema, provedorSchema } from '@/lib/pagamentos/esquema';

export const runtime = 'nodejs';

/**
 * "Testar conexão": chama a API do provedor com as chaves salvas do ambiente
 * (Stripe: conta e preços dos planos; Mercado Pago: usuário; PayPal: token
 * OAuth do sandbox ou da produção) e grava o resultado. Credencial recusada
 * responde 200 com `ok: false` e o motivo.
 */
export async function POST(
  _request: Request,
  contexto: { params: Promise<{ provedor: string; ambiente: string }> }
) {
  try {
    await requireAdminSession();
    const { provedor, ambiente } = await contexto.params;
    const provedorLido = provedorSchema.safeParse(provedor);
    const ambienteLido = ambienteSchema.safeParse(ambiente);
    if (!provedorLido.success || !ambienteLido.success) {
      throw new HttpError('Meio de pagamento ou ambiente desconhecido.', 404);
    }
    const teste = await testarCredenciaisSalvas(
      provedorLido.data,
      ambienteLido.data
    );
    return NextResponse.json(teste, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    return respostaDeErro(error, 'Falha ao testar as credenciais.');
  }
}
