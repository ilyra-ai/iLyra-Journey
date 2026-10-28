import { NextResponse } from 'next/server';
import { z } from 'zod';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { requireFeatureEnabled } from '@/lib/plans/service';
import { diaSchema, versaoSchema } from '@/lib/acontecimentos/esquema';
import {
  salvarDia,
  excluirDia,
  listarDiario,
} from '@/lib/acontecimentos/servico';
import { HttpError } from '@/lib/http-error';
export const runtime = 'nodejs';
type Contexto = { params: Promise<{ data: string }> };
export async function GET(_r: Request, c: Contexto) {
  try {
    const s = await requireServerSession();
    await requireFeatureEnabled(s, 'daily_checkin');
    const data = z.iso.date().parse((await c.params).data),
      d = await listarDiario(s.user.id, { inicio: data, fim: data });
    return NextResponse.json(
      { dia: d.dias[0] ?? null },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível carregar o dia.');
  }
}
export async function PUT(request: Request, c: Contexto) {
  try {
    const s = await requireServerSession();
    await requireFeatureEnabled(s, 'daily_checkin');
    const data = z.iso.date().parse((await c.params).data),
      p = await lerJson(request, diaSchema);
    if (p.data !== data)
      throw new HttpError(
        'A data do formulário não corresponde ao dia aberto.',
        400
      );
    await salvarDia(s.user.id, p);
    return NextResponse.json({ salvo: true });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível salvar os acontecimentos.');
  }
}
export async function DELETE(request: Request, c: Contexto) {
  try {
    const s = await requireServerSession();
    await requireFeatureEnabled(s, 'daily_checkin');
    const data = z.iso.date().parse((await c.params).data),
      p = await lerJson(request, versaoSchema);
    await excluirDia(s.user.id, data, p.versao);
    return NextResponse.json({ excluido: true });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível excluir o registro do dia.');
  }
}
