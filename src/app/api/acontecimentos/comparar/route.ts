import { NextResponse } from 'next/server';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { requireFeatureEnabled } from '@/lib/plans/service';
import { comparacaoSchema } from '@/lib/acontecimentos/esquema';
import { compararAcontecimentos } from '@/lib/acontecimentos/servico';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const s = await requireServerSession();
    await requireFeatureEnabled(s, 'daily_checkin');
    await requireFeatureEnabled(s, 'metrics_history_days');
    return NextResponse.json(
      await compararAcontecimentos(
        s.user.id,
        await lerJson(request, comparacaoSchema)
      ),
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível comparar os registros.');
  }
}
