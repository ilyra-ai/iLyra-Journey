import { NextResponse } from 'next/server';
import { z } from 'zod';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { edicaoSchema, versaoSchema } from '@/lib/alimentacao/esquema';
import { editarRefeicao, excluirRefeicao } from '@/lib/alimentacao/servico';
export const runtime = 'nodejs';
type Contexto = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, c: Contexto) {
  try {
    const s = await requireServerSession(),
      id = z.uuid().parse((await c.params).id);
    return NextResponse.json(
      await editarRefeicao(s, id, await lerJson(request, edicaoSchema)),
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível salvar o registro.');
  }
}
export async function DELETE(request: Request, c: Contexto) {
  try {
    const s = await requireServerSession(),
      id = z.uuid().parse((await c.params).id),
      p = await lerJson(request, versaoSchema);
    await excluirRefeicao(s, id, p.versao);
    return NextResponse.json({ excluido: true });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível excluir o registro.');
  }
}
