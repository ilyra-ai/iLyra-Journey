import { NextResponse } from 'next/server';
import { z } from 'zod';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { versaoSchema } from '@/lib/diario-pessoal/esquema';
import { analisarRelato } from '@/lib/diario-pessoal/servico';

export const runtime = 'nodejs';
// Modelos locais em CPU podem levar alguns minutos.
export const maxDuration = 180;
type Contexto = { params: Promise<{ id: string }> };

/** Organiza o texto e escreve a análise do dia com o modelo autorizado. */
export async function POST(request: Request, c: Contexto) {
  try {
    const s = await requireServerSession(),
      id = z.uuid().parse((await c.params).id),
      p = await lerJson(request, versaoSchema);
    return NextResponse.json(await analisarRelato(s, id, p.versao), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível analisar o relato.');
  }
}
