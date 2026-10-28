import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { criarSchema } from '@/lib/descanso/esquema';
import { lerCentralDoDescanso, criarPeriodo } from '@/lib/descanso/servico';
import { resumoDoDescanso } from '@/lib/descanso/repositorio';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    const s = await requireServerSession(),
      url = new URL(request.url);
    if (url.searchParams.get('resumo') === '1')
      return NextResponse.json(await resumoDoDescanso(s.user.id), {
        headers: { 'Cache-Control': 'private, no-store' },
      });
    const raw = url.searchParams.get('antes'),
      antes = raw === null ? null : z.uuid().parse(raw);
    return NextResponse.json(await lerCentralDoDescanso(s, antes), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível carregar seu descanso.');
  }
}
export async function POST(request: Request) {
  try {
    const s = await requireServerSession(),
      r = await criarPeriodo(s, await lerJson(request, criarSchema));
    return NextResponse.json(r, { status: r.criada ? 201 : 200 });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível registrar seu descanso.');
  }
}
