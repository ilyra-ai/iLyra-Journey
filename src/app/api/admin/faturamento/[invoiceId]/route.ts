import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/mysql/server-auth';
import { respostaDeErro } from '@/lib/http/api';
import { carregarDetalheFinanceiro } from '@/lib/billing/admin/consultas';
export const runtime = 'nodejs';
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    await requireAdminSession();
    const id = z.uuid().parse((await params).invoiceId);
    return NextResponse.json(await carregarDetalheFinanceiro(id), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (erro) {
    return respostaDeErro(erro, 'Não foi possível consultar esta fatura.');
  }
}
