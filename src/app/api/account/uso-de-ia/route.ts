import { NextResponse } from 'next/server';

import { esquemaDoMes, usoDoTitular } from '@/lib/ai/uso-servico';
import { respostaDeErro } from '@/lib/http/api';
import { requireServerSession } from '@/lib/mysql/server-auth';

export const runtime = 'nodejs';

/** Uso de IA da própria conta no mês (tarefa 163). GET ?mes=AAAA-MM. */
export async function GET(request: Request) {
  try {
    const session = await requireServerSession();
    const mes = esquemaDoMes.parse(
      new URL(request.url).searchParams.get('mes') ??
        new Date().toISOString().slice(0, 7)
    );
    return NextResponse.json(await usoDoTitular(session.user.id, mes), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    return respostaDeErro(error, 'Falha ao consultar o seu uso de IA.');
  }
}
