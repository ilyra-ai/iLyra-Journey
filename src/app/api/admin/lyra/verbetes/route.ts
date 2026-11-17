import { NextResponse } from 'next/server';

import { respostaDeErro } from '@/lib/http/api';
import { HttpError } from '@/lib/http-error';
import {
  apagarVerbeteGerado,
  listarVerbetesGerados,
} from '@/lib/lyra/verbetes-gerados-servico';
import { requireAdminSession } from '@/lib/mysql/server-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const SEM_CACHE = { 'Cache-Control': 'private, no-store' };

/**
 * Verbetes escritos automaticamente pelo modelo conectado (tarefa 198), para
 * a administração acompanhar o que entrou na base. Somente administradores.
 */
export async function GET() {
  try {
    await requireAdminSession();
    return NextResponse.json(
      { verbetes: await listarVerbetesGerados() },
      { headers: SEM_CACHE }
    );
  } catch (erro) {
    return respostaDeErro(erro, 'Não foi possível listar os verbetes.');
  }
}

/** `?id=<verbete>` remove um verbete escrito automaticamente. */
export async function DELETE(request: Request) {
  try {
    await requireAdminSession();
    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new HttpError('Informe o verbete a remover.', 400);
    await apagarVerbeteGerado(id);
    return NextResponse.json({ removido: id }, { headers: SEM_CACHE });
  } catch (erro) {
    return respostaDeErro(erro, 'Não foi possível remover o verbete.');
  }
}
