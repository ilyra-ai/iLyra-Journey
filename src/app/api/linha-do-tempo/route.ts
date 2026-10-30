import { NextResponse } from 'next/server';
import { respostaDeErro } from '@/lib/http/api';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { requireFeatureEnabled } from '@/lib/plans/service';
import { consultaDaUrl } from '@/lib/linha-do-tempo/esquema';
import {
  contextoDaLinhaDoTempo,
  lerLinhaDoTempo,
} from '@/lib/linha-do-tempo/servico';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    const s = await requireServerSession();
    await requireFeatureEnabled(s, 'metrics_history_days');
    const ctx = await contextoDaLinhaDoTempo(s.user.id),
      consulta = consultaDaUrl(new URL(request.url).searchParams, ctx.hoje);
    return NextResponse.json(await lerLinhaDoTempo(s, consulta), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível carregar sua linha do tempo.');
  }
}
