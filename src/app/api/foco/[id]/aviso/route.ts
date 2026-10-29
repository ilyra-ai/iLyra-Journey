import { z } from 'zod';
import { NextResponse } from 'next/server';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { reservarAviso } from '@/lib/foco/servico';
export const runtime = 'nodejs';
export async function POST(r: Request, c: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireServerSession();
    await lerJson(r, z.object({}).strict());
    return NextResponse.json(
      await reservarAviso(s, z.uuid().parse((await c.params).id)),
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (e) {
    return respostaDeErro(
      e,
      'Não foi possível conferir seu horário de silêncio. Nenhum som será emitido.'
    );
  }
}
