import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/mysql/server-auth';
import { respostaDeErro } from '@/lib/http/api';
import {
  carregarRelatorio,
  lerPedidoRelatorio,
} from '@/lib/admin/reports/servico';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    await requireAdminSession();
    const pedido = lerPedidoRelatorio(new URL(request.url).searchParams);
    return NextResponse.json(await carregarRelatorio(pedido), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (erro) {
    return respostaDeErro(
      erro,
      'Não foi possível gerar o relatório administrativo.'
    );
  }
}
