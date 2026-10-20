import { NextResponse } from 'next/server';
import { z } from 'zod';

import { listarConversas } from '@/lib/chat/servico';
import { respostaDeErro } from '@/lib/http/api';
import { requireServerSession } from '@/lib/mysql/server-auth';

export const runtime = 'nodejs';

const parametros = z.object({
  limite: z.coerce.number().int().min(1).max(20).default(3),
  cursor: z.string().max(1024).nullable(),
});

export async function GET(request: Request) {
  try {
    const session = await requireServerSession();
    const busca = new URL(request.url).searchParams;
    const { limite, cursor } = parametros.parse({
      limite: busca.get('limite') ?? undefined,
      cursor: busca.get('cursor'),
    });
    return NextResponse.json(
      await listarConversas(session.user.id, limite, cursor),
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (erro) {
    return respostaDeErro(erro, 'Não foi possível carregar o histórico.');
  }
}
