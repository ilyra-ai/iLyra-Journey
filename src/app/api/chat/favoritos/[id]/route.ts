import { NextResponse } from 'next/server';
import { z } from 'zod';
import { definirFavorita } from '@/lib/chat/pesquisa';
import { respostaDeErro } from '@/lib/http/api';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { requireFeatureEnabled } from '@/lib/plans/service';

export const runtime = 'nodejs';
type Contexto = { params: Promise<{ id: string }> };
async function alterar(contexto: Contexto, favorita: boolean) {
  try {
    const session = await requireServerSession();
    await requireFeatureEnabled(session, 'chat_history');
    const id = z.uuid().parse((await contexto.params).id);
    await definirFavorita(session.user.id, id, favorita);
    return NextResponse.json({ favorita });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível atualizar a resposta favorita.');
  }
}
export async function PUT(_request: Request, contexto: Contexto) {
  return alterar(contexto, true);
}
export async function DELETE(_request: Request, contexto: Contexto) {
  return alterar(contexto, false);
}
