import { NextResponse } from 'next/server';
import { z } from 'zod';
import { atribuirMarcadorSchema } from '@/lib/admin/esquema-marcadores';
import { atribuirMarcador } from '@/lib/admin/marcadores-usuarios';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireAdminSession } from '@/lib/mysql/server-auth';
export const runtime = 'nodejs';
export async function PUT(
  request: Request,
  context: { params: Promise<{ userId: string; markerId: string }> }
) {
  try {
    const session = await requireAdminSession();
    const { userId, markerId } = z
      .object({ userId: z.uuid(), markerId: z.uuid() })
      .parse(await context.params);
    const body = await lerJson(request, atribuirMarcadorSchema);
    return NextResponse.json(
      await atribuirMarcador(session.user.id, userId, markerId, body.assigned)
    );
  } catch (error) {
    return respostaDeErro(
      error,
      'Não foi possível alterar o marcador da conta.'
    );
  }
}
