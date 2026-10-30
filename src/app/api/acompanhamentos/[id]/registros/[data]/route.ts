import { NextResponse } from 'next/server';
import { z } from 'zod';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { HttpError } from '@/lib/http-error';
import {
  exclusaoDeRegistroSchema,
  registroSchema,
} from '@/lib/acompanhamentos/esquema';
import { excluirRegistro, salvarRegistro } from '@/lib/acompanhamentos/servico';
import { sessaoDosAcompanhamentos } from '@/lib/acompanhamentos/sessao';
export const runtime = 'nodejs';
type Contexto = { params: Promise<{ id: string; data: string }> };
const parametros = z.object({ id: z.uuid(), data: z.iso.date() });
export async function PUT(request: Request, c: Contexto) {
  try {
    const s = await sessaoDosAcompanhamentos(),
      r = parametros.parse(await c.params),
      p = await lerJson(request, registroSchema);
    if (r.data !== p.data)
      throw new HttpError(
        'A data da resposta não corresponde ao período aberto.',
        400
      );
    return NextResponse.json(await salvarRegistro(s.user.id, r.id, p));
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível salvar a resposta.');
  }
}
export async function DELETE(request: Request, c: Contexto) {
  try {
    const s = await sessaoDosAcompanhamentos(),
      r = parametros.parse(await c.params),
      p = await lerJson(request, exclusaoDeRegistroSchema);
    await excluirRegistro(s.user.id, r.id, r.data, p.idRegistro, p.versao);
    return NextResponse.json({ excluido: true });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível excluir a resposta.');
  }
}
