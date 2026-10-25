import { requireFeatureEnabled } from '@/lib/plans/service';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { lerConversa } from '@/lib/chat/servico';
import { respostaDeErro } from '@/lib/http/api';
import { requireServerSession } from '@/lib/mysql/server-auth';

export const runtime = 'nodejs';

const parametros = z.object({
  id: z.uuid(),
  antes: z.coerce.number().int().min(1).max(Number.MAX_SAFE_INTEGER).optional(),
});

export async function GET(
  request: Request,
  contexto: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireServerSession();
    await requireFeatureEnabled(session, 'chat_history');

    const rota = await contexto.params;
    const { id, antes } = parametros.parse({
      id: rota.id,
      antes: new URL(request.url).searchParams.get('antes') ?? undefined,
    });
    return NextResponse.json(
      await lerConversa(session.user.id, id, antes ?? null),
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (erro) {
    return respostaDeErro(erro, 'Não foi possível abrir a conversa.');
  }
}
