import { NextResponse } from 'next/server';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { requireFeatureEnabled } from '@/lib/plans/service';
import { rotinaSchema } from '@/lib/rotinas/esquema';
import { listarRotinas, salvarRotina } from '@/lib/rotinas/servico';
export const runtime = 'nodejs';
export async function GET() {
  try {
    const s = await requireServerSession();
    await requireFeatureEnabled(s, 'personal_habits');
    return NextResponse.json(await listarRotinas(s.user.id), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível carregar suas rotinas.');
  }
}
export async function POST(request: Request) {
  try {
    const s = await requireServerSession();
    await requireFeatureEnabled(s, 'personal_habits');
    return NextResponse.json(
      { id: await salvarRotina(s, await lerJson(request, rotinaSchema)) },
      { status: 201 }
    );
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível criar a rotina.');
  }
}
