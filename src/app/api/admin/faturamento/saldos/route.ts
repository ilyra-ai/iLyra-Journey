import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/mysql/server-auth';
import { respostaDeErro } from '@/lib/http/api';
import { lerFiltrosFaturamento } from '@/lib/billing/admin/filtros';
import { carregarSaldo } from '@/lib/billing/admin/saldos';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    await requireAdminSession();
    return NextResponse.json(
      await carregarSaldo(
        lerFiltrosFaturamento(new URL(request.url).searchParams)
      ),
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (erro) {
    return respostaDeErro(
      erro,
      'Não foi possível consultar os movimentos de saldo.'
    );
  }
}
