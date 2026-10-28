import { NextResponse } from 'next/server';
import { z } from 'zod';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { requireFeatureEnabled } from '@/lib/plans/service';
import { acaoDaRotinaSchema } from '@/lib/rotinas/esquema';
import { agirNaRotina } from '@/lib/rotinas/servico';
export const runtime = 'nodejs';
export async function POST(
  request: Request,
  contexto: { params: Promise<{ id: string }> }
) {
  try {
    const s = await requireServerSession();
    await requireFeatureEnabled(s, 'personal_habits');
    const id = z.uuid().parse((await contexto.params).id);
    return NextResponse.json(
      await agirNaRotina(
        s.user.id,
        id,
        await lerJson(request, acaoDaRotinaSchema)
      )
    );
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível atualizar a execução.');
  }
}
