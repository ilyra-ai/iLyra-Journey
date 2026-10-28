import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { editarSchema, acaoSchema } from '@/lib/descanso/esquema';
import { editarPeriodo, agirNoPeriodo } from '@/lib/descanso/servico';
export const runtime = 'nodejs';
type Contexto = { params: Promise<{ id: string }> };
export async function PUT(request: Request, c: Contexto) {
  try {
    const s = await requireServerSession(),
      id = z.uuid().parse((await c.params).id);
    await editarPeriodo(s, id, await lerJson(request, editarSchema));
    return NextResponse.json({ salvo: true });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível alterar o período.');
  }
}
export async function POST(request: Request, c: Contexto) {
  try {
    const s = await requireServerSession(),
      id = z.uuid().parse((await c.params).id),
      p = await lerJson(request, acaoSchema);
    await agirNoPeriodo(s.user.id, id, p.acao, p.versao);
    return NextResponse.json({ salvo: true });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível concluir a ação.');
  }
}
