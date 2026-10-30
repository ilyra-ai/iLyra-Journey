import { NextResponse } from 'next/server';
import { z } from 'zod';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { requireFeatureEnabled } from '@/lib/plans/service';
import { exigirDiaNoHistorico } from '@/lib/plans/historico';
import { dataDoRegistroSchema } from '@/lib/metricas/registro-do-dia';
import { listarVersoes, desfazerVersao } from '@/lib/metricas/versoes';
import {
  depoisDeGravarRegistro,
  lerRegistroDoDia,
} from '@/lib/metricas/gravacao';

export const runtime = 'nodejs';
const consulta = z.object({
  data: z.iso.date(),
  antes: z.coerce
    .number()
    .int()
    .positive()
    .max(Number.MAX_SAFE_INTEGER)
    .optional(),
});
const desfazer = z
  .object({ data: dataDoRegistroSchema, id: z.uuid() })
  .strict();
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET(request: Request) {
  try {
    const s = await requireServerSession();
    await requireFeatureEnabled(s, 'daily_checkin');
    const url = new URL(request.url);
    const p = consulta.parse({
      data: url.searchParams.get('data'),
      antes: url.searchParams.get('antes') ?? undefined,
    });
    await exigirDiaNoHistorico(s.user.id, p.data);
    return NextResponse.json(await listarVersoes(s.user.id, p.data, p.antes), {
      headers,
    });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível ler o histórico de alterações.');
  }
}
export async function POST(request: Request) {
  try {
    const s = await requireServerSession();
    await requireFeatureEnabled(s, 'daily_checkin');
    const p = await lerJson(request, desfazer);
    await exigirDiaNoHistorico(s.user.id, p.data);
    const data = await desfazerVersao(s.user.id, p.id, p.data);
    await depoisDeGravarRegistro(s.user.id, data);
    return NextResponse.json(
      { registro: await lerRegistroDoDia(s.user.id, data) },
      { headers }
    );
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível desfazer a alteração.');
  }
}
