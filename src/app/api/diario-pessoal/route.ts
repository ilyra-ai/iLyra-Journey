import { NextResponse } from 'next/server';
import { z } from 'zod';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { mesSchema, novoRelatoSchema } from '@/lib/diario-pessoal/esquema';
import {
  criarRelato,
  lerMesDoDiario,
  lerRelatosDoDia,
} from '@/lib/diario-pessoal/servico';

export const runtime = 'nodejs';
const SEM_CACHE = { 'Cache-Control': 'private, no-store' };

/** `?mes=AAAA-MM` devolve os dias com relatos; `?data=AAAA-MM-DD`, os relatos. */
export async function GET(request: Request) {
  try {
    const s = await requireServerSession(),
      url = new URL(request.url),
      data = url.searchParams.get('data'),
      mes = url.searchParams.get('mes');
    if (data)
      return NextResponse.json(
        { relatos: await lerRelatosDoDia(s, z.iso.date().parse(data)) },
        { headers: SEM_CACHE }
      );
    return NextResponse.json(
      await lerMesDoDiario(s, mes ? mesSchema.parse(mes) : null),
      { headers: SEM_CACHE }
    );
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível abrir o diário.');
  }
}

export async function POST(request: Request) {
  try {
    const s = await requireServerSession();
    return NextResponse.json(
      await criarRelato(s, await lerJson(request, novoRelatoSchema)),
      { status: 201, headers: SEM_CACHE }
    );
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível guardar o relato.');
  }
}
