import { NextResponse } from 'next/server';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { requireFeatureEnabled } from '@/lib/plans/service';
import { lembreteSchema } from '@/lib/lembretes/esquema';
import { criarLembrete, listarCentral } from '@/lib/lembretes/servico';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const session = await requireServerSession();
    await requireFeatureEnabled(session, 'personal_notifications');
    return NextResponse.json(await listarCentral(session.user.id), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível carregar seus lembretes.');
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireServerSession();
    await requireFeatureEnabled(session, 'personal_notifications');
    const dados = await lerJson(request, lembreteSchema);
    return NextResponse.json(
      { id: await criarLembrete(session.user.id, dados) },
      { status: 201 }
    );
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível criar o lembrete.');
  }
}
