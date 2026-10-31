import { NextResponse } from 'next/server';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireAdminSession } from '@/lib/mysql/server-auth';
import { avaliacaoSchema } from '@/lib/treinamento/esquema';
import { avaliarResposta, listarAvaliacoes } from '@/lib/treinamento/servico';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const s = await requireAdminSession();
    return NextResponse.json(
      { avaliacoes: await listarAvaliacoes(s) },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível listar as avaliações.');
  }
}

export async function POST(request: Request) {
  try {
    const s = await requireAdminSession();
    return NextResponse.json(
      await avaliarResposta(s, await lerJson(request, avaliacaoSchema)),
      { status: 201 }
    );
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível salvar a avaliação.');
  }
}
