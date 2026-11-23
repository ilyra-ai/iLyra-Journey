import { NextResponse } from 'next/server';

import {
  esquemaDoAmbiente,
  esquemaDoPeriodo,
  painelDoFunil,
} from '@/lib/funil/painel';
import { respostaDeErro } from '@/lib/http/api';
import { HttpError } from '@/lib/http-error';
import { requireAdminSession } from '@/lib/mysql/server-auth';

export const runtime = 'nodejs';

/** Painel agregado do funil (tarefa 170): só administradores. */
export async function GET(request: Request) {
  try {
    await requireAdminSession();
    const consulta = new URL(request.url).searchParams;
    const periodo = esquemaDoPeriodo.safeParse(consulta.get('dias') ?? '30');
    if (!periodo.success) throw new HttpError('Período inválido.', 400);
    const ambiente = esquemaDoAmbiente.safeParse(
      consulta.get('ambiente') ?? 'live'
    );
    if (!ambiente.success) throw new HttpError('Ambiente inválido.', 400);
    return NextResponse.json(await painelDoFunil(periodo.data, ambiente.data), {
      headers: { 'Cache-Control': 'no-store, private' },
    });
  } catch (error) {
    return respostaDeErro(error, 'Não foi possível montar o painel do funil.');
  }
}
