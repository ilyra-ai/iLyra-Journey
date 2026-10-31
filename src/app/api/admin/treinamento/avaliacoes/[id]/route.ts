import { NextResponse } from 'next/server';
import { z } from 'zod';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireAdminSession } from '@/lib/mysql/server-auth';
import { edicaoSchema, versaoSchema } from '@/lib/treinamento/esquema';
import { editarAvaliacao, excluirAvaliacao } from '@/lib/treinamento/servico';

export const runtime = 'nodejs';
type Contexto = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, c: Contexto) {
  try {
    const s = await requireAdminSession(),
      id = z.uuid().parse((await c.params).id);
    return NextResponse.json(
      await editarAvaliacao(s, id, await lerJson(request, edicaoSchema))
    );
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível salvar a avaliação.');
  }
}

export async function DELETE(request: Request, c: Contexto) {
  try {
    const s = await requireAdminSession(),
      id = z.uuid().parse((await c.params).id),
      p = await lerJson(request, versaoSchema);
    await excluirAvaliacao(s, id, p.versao);
    return NextResponse.json({ excluida: true });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível excluir a avaliação.');
  }
}
