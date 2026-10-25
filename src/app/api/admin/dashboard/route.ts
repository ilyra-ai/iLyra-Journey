import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/mysql/server-auth';
import { respostaDeErro } from '@/lib/http/api';
import { lerFiltros } from '@/lib/admin/analytics/filtros';
import {
  carregarPainel,
  carregarDetalhes,
} from '@/lib/admin/analytics/consultas';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    await requireAdminSession();
    const { detalhe, pagina, paginaEventos, ...filtros } = lerFiltros(
      new URL(request.url).searchParams
    );
    const dados = detalhe
      ? await carregarDetalhes(filtros, detalhe, pagina)
      : await carregarPainel(filtros, paginaEventos);
    return NextResponse.json(dados, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (erro) {
    return respostaDeErro(
      erro,
      'Não foi possível calcular os indicadores administrativos.'
    );
  }
}
