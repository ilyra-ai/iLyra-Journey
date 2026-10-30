import { NextResponse } from 'next/server';
import { z } from 'zod';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { acaoSchema } from '@/lib/meditacoes/esquema';
import { agirNaMeditacao } from '@/lib/meditacoes/servico';
export const runtime = 'nodejs';
type Contexto = { params: Promise<{ id: string }> };
export async function POST(request: Request, c: Contexto) {
  try {
    const s = await requireServerSession(),
      id = z.uuid().parse((await c.params).id);
    return NextResponse.json(
      await agirNaMeditacao(s, id, await lerJson(request, acaoSchema)),
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível atualizar a prática.');
  }
}
