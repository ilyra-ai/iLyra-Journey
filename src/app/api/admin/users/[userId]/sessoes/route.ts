import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  encerrarSessoes,
  MOTIVOS_ENCERRAMENTO,
} from '@/lib/auth/encerrar-sessoes';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireAdminSession } from '@/lib/mysql/server-auth';

export const runtime = 'nodejs';
const schema = z
  .object({ requestId: z.uuid(), reason: z.enum(MOTIVOS_ENCERRAMENTO) })
  .strict();

export async function POST(
  request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await requireAdminSession();
    const userId = z.uuid().parse((await context.params).userId);
    const body = await lerJson(request, schema);
    return NextResponse.json(
      await encerrarSessoes(
        session.user.id,
        userId,
        body.requestId,
        body.reason
      )
    );
  } catch (error) {
    return respostaDeErro(error, 'Não foi possível encerrar as sessões.');
  }
}
