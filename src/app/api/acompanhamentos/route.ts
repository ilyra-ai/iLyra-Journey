import { NextResponse } from 'next/server';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { acompanhamentoSchema } from '@/lib/acompanhamentos/esquema';
import {
  criarAcompanhamento,
  listarAcompanhamentos,
} from '@/lib/acompanhamentos/servico';
import { sessaoDosAcompanhamentos } from '@/lib/acompanhamentos/sessao';
export const runtime = 'nodejs';
export async function GET() {
  try {
    const s = await sessaoDosAcompanhamentos();
    return NextResponse.json(await listarAcompanhamentos(s), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível carregar seus acompanhamentos.');
  }
}
export async function POST(request: Request) {
  try {
    const s = await sessaoDosAcompanhamentos(),
      r = await criarAcompanhamento(
        s,
        await lerJson(request, acompanhamentoSchema)
      );
    return NextResponse.json(r, { status: r.criado ? 201 : 200 });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível criar o acompanhamento.');
  }
}
