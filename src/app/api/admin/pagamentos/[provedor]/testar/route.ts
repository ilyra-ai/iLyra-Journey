import { NextResponse } from 'next/server';

import { HttpError } from '@/lib/http-error';
import { respostaDeErro } from '@/lib/http/api';
import { requireAdminSession } from '@/lib/mysql/server-auth';
import { testarCredenciaisSalvas } from '@/lib/pagamentos/credenciais';
import { provedorSchema } from '@/lib/pagamentos/esquema';

export const runtime = 'nodejs';

/**
 * "Testar conexão": chama a API do provedor com as credenciais salvas
 * (Stripe: conta; Mercado Pago: usuário; PayPal: token OAuth) e grava o
 * resultado. Credencial recusada responde 200 com `ok: false` e o motivo.
 */
export async function POST(
  _request: Request,
  contexto: { params: Promise<{ provedor: string }> }
) {
  try {
    await requireAdminSession();
    const resultado = provedorSchema.safeParse(
      (await contexto.params).provedor
    );
    if (!resultado.success) {
      throw new HttpError('Meio de pagamento desconhecido.', 404);
    }
    const teste = await testarCredenciaisSalvas(resultado.data);
    return NextResponse.json(teste, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    return respostaDeErro(error, 'Falha ao testar as credenciais.');
  }
}
