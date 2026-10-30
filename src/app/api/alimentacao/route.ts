import { NextResponse } from 'next/server';
import { z } from 'zod';
import { respostaDeErro } from '@/lib/http/api';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { refeicaoSchema } from '@/lib/alimentacao/esquema';
import { criarRefeicao, lerDia } from '@/lib/alimentacao/servico';
import {
  fotoDoFormulario,
  jsonDoFormulario,
  lerFormulario,
} from '@/lib/alimentacao/formulario';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET(request: Request) {
  try {
    const s = await requireServerSession(),
      data = new URL(request.url).searchParams.get('data');
    return NextResponse.json(
      await lerDia(s, data === null ? null : z.iso.date().parse(data)),
      { headers }
    );
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível carregar seu diário.');
  }
}
export async function POST(request: Request) {
  try {
    const s = await requireServerSession(),
      f = await lerFormulario(request),
      dados = refeicaoSchema.parse(jsonDoFormulario(f, 'dados')),
      r = await criarRefeicao(s, dados, await fotoDoFormulario(f));
    return NextResponse.json(r.refeicao, {
      status: r.criada ? 201 : 200,
      headers,
    });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível salvar o registro.');
  }
}
