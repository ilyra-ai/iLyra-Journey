import { NextResponse } from 'next/server';
import { z } from 'zod';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { requireFeatureEnabled } from '@/lib/plans/service';
import {
  editarMarcadorSchema,
  versaoSchema,
} from '@/lib/acontecimentos/esquema';
import { salvarMarcador, excluirMarcador } from '@/lib/acontecimentos/servico';
export const runtime = 'nodejs';
type Contexto = { params: Promise<{ id: string }> };
export async function PUT(request: Request, c: Contexto) {
  try {
    const s = await requireServerSession();
    await requireFeatureEnabled(s, 'daily_checkin');
    const id = z.uuid().parse((await c.params).id),
      p = await lerJson(request, editarMarcadorSchema);
    await salvarMarcador(s.user.id, p.nome, id, p.versao);
    return NextResponse.json({ id });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível editar o marcador.');
  }
}
export async function DELETE(request: Request, c: Contexto) {
  try {
    const s = await requireServerSession();
    await requireFeatureEnabled(s, 'daily_checkin');
    const id = z.uuid().parse((await c.params).id),
      p = await lerJson(request, versaoSchema);
    await excluirMarcador(s.user.id, id, p.versao);
    return NextResponse.json({ excluido: true });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível excluir o marcador.');
  }
}
