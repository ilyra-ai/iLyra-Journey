import { NextResponse } from 'next/server';
import { z } from 'zod';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { requireFeatureEnabled } from '@/lib/plans/service';
import { iniciarSchema } from '@/lib/rotinas/esquema';
import { iniciarRotina } from '@/lib/rotinas/servico';
export const runtime = 'nodejs';
export async function POST(
  request: Request,
  contexto: { params: Promise<{ id: string }> }
) {
  try {
    const s = await requireServerSession();
    await requireFeatureEnabled(s, 'personal_habits');
    const id = z.uuid().parse((await contexto.params).id),
      p = await lerJson(request, iniciarSchema);
    return NextResponse.json(
      await iniciarRotina(s, id, p.idExecucao, p.versao)
    );
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível iniciar a rotina.');
  }
}
