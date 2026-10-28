import { NextResponse } from 'next/server';
import { pesquisarNoChat } from '@/lib/chat/pesquisa';
import { pesquisaDoChatSchema } from '@/lib/chat/pesquisa-esquema';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { requireFeatureEnabled } from '@/lib/plans/service';

export const runtime = 'nodejs';
/** POST mantém termos pessoais fora da URL e do histórico do navegador. */
export async function POST(request: Request) {
  try {
    const session = await requireServerSession();
    await requireFeatureEnabled(session, 'chat_history');
    const p = await lerJson(request, pesquisaDoChatSchema);
    return NextResponse.json(await pesquisarNoChat(session.user.id, p), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível pesquisar suas conversas.');
  }
}
