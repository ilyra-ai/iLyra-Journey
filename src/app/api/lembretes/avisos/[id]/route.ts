import { NextResponse } from 'next/server';
import { z } from 'zod';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { requireFeatureEnabled } from '@/lib/plans/service';
import { acaoSchema } from '@/lib/lembretes/esquema';
import { agirSobreAviso } from '@/lib/lembretes/servico';

export const runtime = 'nodejs';
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireServerSession();
    await requireFeatureEnabled(session, 'personal_notifications');
    const id = z.uuid().parse((await params).id);
    await agirSobreAviso(
      session.user.id,
      id,
      await lerJson(request, acaoSchema)
    );
    return NextResponse.json({ salvo: true });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível atualizar este aviso.');
  }
}
