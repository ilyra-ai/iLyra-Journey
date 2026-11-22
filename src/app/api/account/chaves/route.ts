import { NextResponse } from 'next/server';

import { listarChaves } from '@/lib/auth/chaves/servico';
import { respostaDeErro } from '@/lib/http/api';
import { requireServerSession } from '@/lib/mysql/server-auth';

export const runtime = 'nodejs';

/** Chaves de acesso ativas da própria conta (tarefa 167). */
export async function GET() {
  try {
    const session = await requireServerSession();
    return NextResponse.json(
      { chaves: await listarChaves(session.user.id) },
      { headers: { 'Cache-Control': 'no-store, private' } }
    );
  } catch (error) {
    return respostaDeErro(
      error,
      'Não foi possível listar as chaves de acesso.'
    );
  }
}
