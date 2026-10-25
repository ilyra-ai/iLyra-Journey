import { NextResponse } from 'next/server';

import { respostaDeErro } from '@/lib/http/api';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { recursoHabilitado, requireFeatureEnabled } from '@/lib/plans/service';
import { lerSemana } from '@/lib/semana/servico';

export const runtime = 'nodejs';

/** Retrospectiva dos últimos 7 dias da própria pessoa. */
export async function GET() {
  try {
    const session = await requireServerSession();
    await requireFeatureEnabled(session, 'weekly_review');
    await requireFeatureEnabled(session, 'vedic_insights');

    // Metas só entram na semana quando o plano inclui o acompanhamento.
    const comMetas = await recursoHabilitado(
      session.user.id,
      session.user.role,
      'goal_progress_tracking'
    );
    const semana = await lerSemana(session.user.id, new Date(), comMetas);
    return NextResponse.json(semana, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    return respostaDeErro(error, 'Falha ao montar a sua semana.');
  }
}
