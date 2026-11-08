import { NextResponse } from 'next/server';
import { respostaDeErro } from '@/lib/http/api';
import { lerEstadoDosGrupos } from '@/lib/plataforma/funcionalidades';

export const runtime = 'nodejs';

/** Somente disponibilidade pública; nunca expõe atores ou histórico administrativo. */
export async function GET() {
  try {
    return NextResponse.json(await lerEstadoDosGrupos(), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (erro) {
    return respostaDeErro(
      erro,
      'Não foi possível consultar as funcionalidades.'
    );
  }
}
