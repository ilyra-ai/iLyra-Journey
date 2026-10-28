import { NextResponse } from 'next/server';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { requireFeatureEnabled } from '@/lib/plans/service';
import { preferenciasSchema } from '@/lib/lembretes/esquema';
import { salvarPreferencias } from '@/lib/lembretes/servico';

export const runtime = 'nodejs';
export async function PUT(request: Request) {
  try {
    const session = await requireServerSession();
    await requireFeatureEnabled(session, 'personal_notifications');
    await salvarPreferencias(
      session.user.id,
      await lerJson(request, preferenciasSchema)
    );
    return NextResponse.json({ salvo: true });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível salvar o fuso e o silêncio.');
  }
}
