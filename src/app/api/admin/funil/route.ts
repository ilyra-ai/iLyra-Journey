import { NextResponse } from 'next/server';

import { esquemaDoPeriodo, painelDoFunil } from '@/lib/funil/painel';
import { respostaDeErro } from '@/lib/http/api';
import { HttpError } from '@/lib/http-error';
import { requireAdminSession } from '@/lib/mysql/server-auth';

export const runtime = 'nodejs';

/** Painel agregado do funil (tarefa 170): só administradores. */
export async function GET(request: Request) {
  try {
    await requireAdminSession();
    const periodo = esquemaDoPeriodo.safeParse(
      new URL(request.url).searchParams.get('dias') ?? '30'
    );
    if (!periodo.success) throw new HttpError('Período inválido.', 400);
    return NextResponse.json(await painelDoFunil(periodo.data), {
      headers: { 'Cache-Control': 'no-store, private' },
    });
  } catch (error) {
    return respostaDeErro(error, 'Não foi possível montar o painel do funil.');
  }
}
