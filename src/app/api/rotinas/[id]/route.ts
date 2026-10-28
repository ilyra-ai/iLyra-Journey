import { NextResponse } from 'next/server';
import { z } from 'zod';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { requireFeatureEnabled } from '@/lib/plans/service';
import { editarRotinaSchema, versaoSchema } from '@/lib/rotinas/esquema';
import { salvarRotina, excluirRotina } from '@/lib/rotinas/servico';
export const runtime = 'nodejs';
type Contexto = { params: Promise<{ id: string }> };
export async function PUT(request: Request, contexto: Contexto) {
  try {
    const s = await requireServerSession();
    await requireFeatureEnabled(s, 'personal_habits');
    const id = z.uuid().parse((await contexto.params).id),
      { versao, ...dados } = await lerJson(request, editarRotinaSchema);
    await salvarRotina(s, dados, id, versao);
    return NextResponse.json({ id });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível editar a rotina.');
  }
}
export async function DELETE(request: Request, contexto: Contexto) {
  try {
    const s = await requireServerSession();
    await requireFeatureEnabled(s, 'personal_habits');
    const id = z.uuid().parse((await contexto.params).id),
      { versao } = await lerJson(request, versaoSchema);
    await excluirRotina(s.user.id, id, versao);
    return NextResponse.json({ excluida: true });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível excluir a rotina.');
  }
}
