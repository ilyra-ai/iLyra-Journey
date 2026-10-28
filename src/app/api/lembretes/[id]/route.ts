import { NextResponse } from 'next/server';
import { z } from 'zod';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { requireFeatureEnabled } from '@/lib/plans/service';
import { editarLembreteSchema } from '@/lib/lembretes/esquema';
import { editarLembrete, excluirLembrete } from '@/lib/lembretes/servico';

export const runtime = 'nodejs';
type Contexto = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Contexto) {
  try {
    const session = await requireServerSession();
    await requireFeatureEnabled(session, 'personal_notifications');
    const id = z.uuid().parse((await params).id);
    await editarLembrete(
      session.user.id,
      id,
      await lerJson(request, editarLembreteSchema)
    );
    return NextResponse.json({ salvo: true });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível salvar o lembrete.');
  }
}

export async function DELETE(request: Request, { params }: Contexto) {
  try {
    const session = await requireServerSession();
    await requireFeatureEnabled(session, 'personal_notifications');
    const id = z.uuid().parse((await params).id);
    const { versao } = await lerJson(
      request,
      z.object({ versao: z.number().int().positive() }).strict()
    );
    await excluirLembrete(session.user.id, id, versao);
    return NextResponse.json({ excluido: true });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível excluir o lembrete.');
  }
}
