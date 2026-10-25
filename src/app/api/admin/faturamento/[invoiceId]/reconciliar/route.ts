import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/mysql/server-auth';
import { respostaDeErro } from '@/lib/http/api';
import { faturaLocal, reconciliarFatura } from '@/lib/billing/admin/provedor';
import { carregarDetalheFinanceiro } from '@/lib/billing/admin/consultas';
export const runtime = 'nodejs';
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    await requireAdminSession();
    const id = z.uuid().parse((await params).invoiceId),
      f = await faturaLocal(id);
    await reconciliarFatura(f.external_invoice_id, f.environment);
    return NextResponse.json(await carregarDetalheFinanceiro(id), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (erro) {
    return respostaDeErro(
      erro,
      'Não foi possível conferir a fatura no provedor.'
    );
  }
}
