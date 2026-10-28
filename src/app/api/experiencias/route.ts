import { NextResponse } from 'next/server';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { requireFeatureEnabled } from '@/lib/plans/service';
import { experienciaSchema } from '@/lib/experiencias/esquema';
import {
  criarExperiencia,
  listarExperiencias,
} from '@/lib/experiencias/servico';
export const runtime = 'nodejs';
async function sessao() {
  const s = await requireServerSession();
  await requireFeatureEnabled(s, 'personal_habits');
  await requireFeatureEnabled(s, 'metrics_history_days');
  return s;
}
export async function GET() {
  try {
    const s = await sessao();
    return NextResponse.json(await listarExperiencias(s), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível carregar suas experiências.');
  }
}
export async function POST(request: Request) {
  try {
    const s = await sessao(),
      r = await criarExperiencia(s, await lerJson(request, experienciaSchema));
    return NextResponse.json(r, { status: r.criada ? 201 : 200 });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível registrar a experiência.');
  }
}
