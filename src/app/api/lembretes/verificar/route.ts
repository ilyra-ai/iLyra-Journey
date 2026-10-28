import { NextResponse } from 'next/server';
import { respostaDeErro } from '@/lib/http/api';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { requireFeatureEnabled } from '@/lib/plans/service';
import { processarLembretes } from '@/lib/lembretes/servico';

export const runtime = 'nodejs';
export async function POST() {
  try {
    const session = await requireServerSession();
    await requireFeatureEnabled(session, 'personal_notifications');
    return NextResponse.json({
      emitidos: await processarLembretes(session.user.id),
    });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível verificar os lembretes.');
  }
}
