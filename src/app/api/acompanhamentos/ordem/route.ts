import { NextResponse } from 'next/server';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { ordemSchema } from '@/lib/acompanhamentos/esquema';
import { reordenarAcompanhamentos } from '@/lib/acompanhamentos/servico';
import { sessaoDosAcompanhamentos } from '@/lib/acompanhamentos/sessao';
export const runtime = 'nodejs';
export async function PUT(request: Request) {
  try {
    const s = await sessaoDosAcompanhamentos(),
      p = await lerJson(request, ordemSchema);
    await reordenarAcompanhamentos(s.user.id, p.ids);
    return NextResponse.json({ salvo: true });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível reorganizar a lista.');
  }
}
