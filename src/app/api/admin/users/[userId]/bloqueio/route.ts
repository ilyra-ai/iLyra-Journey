import { NextResponse } from 'next/server';
import { z } from 'zod';
import { definirBloqueio } from '@/lib/auth/bloqueio';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireAdminSession } from '@/lib/mysql/server-auth';

export const runtime = 'nodejs';
const schema = z.object({ blocked: z.boolean() }).strict();

export async function PATCH(
  request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await requireAdminSession();
    const userId = z.uuid().parse((await context.params).userId);
    const { blocked } = await lerJson(request, schema);
    return NextResponse.json(
      await definirBloqueio(session.user.id, userId, blocked)
    );
  } catch (error) {
    return respostaDeErro(error, 'Não foi possível alterar o acesso da conta.');
  }
}
