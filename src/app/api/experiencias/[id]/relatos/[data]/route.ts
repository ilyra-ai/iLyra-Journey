import { NextResponse } from 'next/server';
import { z } from 'zod';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { HttpError } from '@/lib/http-error';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { requireFeatureEnabled } from '@/lib/plans/service';
import { notaSchema } from '@/lib/experiencias/esquema';
import { salvarRelato, excluirRelato } from '@/lib/experiencias/servico';
export const runtime = 'nodejs';
type Contexto = { params: Promise<{ id: string; data: string }> };
const parametros = z.object({ id: z.uuid(), data: z.iso.date() });
const exclusao = z
  .object({ idRelato: z.uuid(), versao: z.number().int().positive() })
  .strict();
async function sessao() {
  const s = await requireServerSession();
  await requireFeatureEnabled(s, 'personal_habits');
  await requireFeatureEnabled(s, 'metrics_history_days');
  return s;
}
export async function PUT(request: Request, c: Contexto) {
  try {
    const s = await sessao(),
      r = parametros.parse(await c.params),
      p = await lerJson(request, notaSchema);
    if (r.data !== p.data)
      throw new HttpError(
        'A data do relato não corresponde ao dia aberto.',
        400
      );
    await salvarRelato(s.user.id, r.id, p);
    return NextResponse.json({ salvo: true });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível salvar o acompanhamento.');
  }
}
export async function DELETE(request: Request, c: Contexto) {
  try {
    const s = await sessao(),
      r = parametros.parse(await c.params),
      p = await lerJson(request, exclusao);
    await excluirRelato(s.user.id, r.id, r.data, p.idRelato, p.versao);
    return NextResponse.json({ excluido: true });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível excluir o relato.');
  }
}
