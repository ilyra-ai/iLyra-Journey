import { NextResponse } from 'next/server';
import { z } from 'zod';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { HttpError } from '@/lib/http-error';
import {
  acaoSchema,
  edicaoSchema,
  periodoSchema,
  versaoSchema,
} from '@/lib/acompanhamentos/esquema';
import {
  agirNoAcompanhamento,
  editarAcompanhamento,
  excluirAcompanhamento,
  lerAcompanhamento,
} from '@/lib/acompanhamentos/servico';
import { sessaoDosAcompanhamentos } from '@/lib/acompanhamentos/sessao';
export const runtime = 'nodejs';
type Contexto = { params: Promise<{ id: string }> };
export async function GET(request: Request, c: Contexto) {
  try {
    const s = await sessaoDosAcompanhamentos(),
      id = z.uuid().parse((await c.params).id),
      q = new URL(request.url).searchParams,
      inicio = q.get('inicio'),
      fim = q.get('fim');
    if ((inicio === null) !== (fim === null))
      throw new HttpError('Informe as duas datas do período.', 400);
    const periodo =
      inicio !== null && fim !== null
        ? periodoSchema.parse({ inicio, fim })
        : null;
    return NextResponse.json(await lerAcompanhamento(s.user.id, id, periodo), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível abrir o acompanhamento.');
  }
}
export async function PATCH(request: Request, c: Contexto) {
  try {
    const s = await sessaoDosAcompanhamentos(),
      id = z.uuid().parse((await c.params).id),
      p = await lerJson(request, edicaoSchema);
    return NextResponse.json(await editarAcompanhamento(s.user.id, id, p));
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível salvar o acompanhamento.');
  }
}
export async function POST(request: Request, c: Contexto) {
  try {
    const s = await sessaoDosAcompanhamentos(),
      id = z.uuid().parse((await c.params).id),
      p = await lerJson(request, acaoSchema);
    await agirNoAcompanhamento(s.user.id, id, p.acao, p.versao);
    return NextResponse.json({ salvo: true });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível atualizar o acompanhamento.');
  }
}
export async function DELETE(request: Request, c: Contexto) {
  try {
    const s = await sessaoDosAcompanhamentos(),
      id = z.uuid().parse((await c.params).id),
      p = await lerJson(request, versaoSchema);
    await excluirAcompanhamento(s.user.id, id, p.versao);
    return NextResponse.json({ excluido: true });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível excluir o acompanhamento.');
  }
}
