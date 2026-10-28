import { NextResponse } from 'next/server';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { requireFeatureEnabled } from '@/lib/plans/service';
import { marcadorSchema } from '@/lib/acontecimentos/esquema';
import { salvarMarcador } from '@/lib/acontecimentos/servico';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const s = await requireServerSession();
    await requireFeatureEnabled(s, 'daily_checkin');
    const p = await lerJson(request, marcadorSchema);
    return NextResponse.json(
      { id: await salvarMarcador(s.user.id, p.nome) },
      { status: 201 }
    );
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível criar o marcador.');
  }
}
