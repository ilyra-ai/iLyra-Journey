import { NextResponse } from 'next/server';
import { z } from 'zod';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { requireFeatureEnabled } from '@/lib/plans/service';
import { acaoSchema, versaoSchema } from '@/lib/experiencias/esquema';
import {
  agirNaExperiencia,
  excluirExperiencia,
  lerRevisao,
} from '@/lib/experiencias/servico';
export const runtime = 'nodejs';
type Contexto = { params: Promise<{ id: string }> };
async function sessao() {
  const s = await requireServerSession();
  await requireFeatureEnabled(s, 'personal_habits');
  await requireFeatureEnabled(s, 'metrics_history_days');
  return s;
}
export async function GET(_r: Request, c: Contexto) {
  try {
    const s = await sessao(),
      id = z.uuid().parse((await c.params).id);
    return NextResponse.json(await lerRevisao(s.user.id, id), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível abrir a experiência.');
  }
}
export async function POST(request: Request, c: Contexto) {
  try {
    const s = await sessao(),
      id = z.uuid().parse((await c.params).id),
      p = await lerJson(request, acaoSchema);
    await agirNaExperiencia(s.user.id, id, p.acao, p.versao);
    return NextResponse.json({ salvo: true });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível atualizar a experiência.');
  }
}
export async function DELETE(request: Request, c: Contexto) {
  try {
    const s = await sessao(),
      id = z.uuid().parse((await c.params).id),
      p = await lerJson(request, versaoSchema);
    await excluirExperiencia(s.user.id, id, p.versao);
    return NextResponse.json({ excluida: true });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível excluir a experiência.');
  }
}
