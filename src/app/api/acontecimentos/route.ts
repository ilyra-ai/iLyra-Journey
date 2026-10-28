import { NextResponse } from 'next/server';
import { respostaDeErro } from '@/lib/http/api';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { requireFeatureEnabled } from '@/lib/plans/service';
import { periodoSchema } from '@/lib/acontecimentos/esquema';
import { listarDiario } from '@/lib/acontecimentos/servico';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    const s = await requireServerSession();
    await requireFeatureEnabled(s, 'daily_checkin');
    const q = new URL(request.url).searchParams,
      p =
        q.has('inicio') || q.has('fim')
          ? periodoSchema.parse(Object.fromEntries(q))
          : undefined;
    return NextResponse.json(await listarDiario(s.user.id, p), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível carregar seus acontecimentos.');
  }
}
