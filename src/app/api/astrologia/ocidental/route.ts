import { NextResponse } from 'next/server';
import { lerPerfilAstrologico } from '@/lib/astrology/perfil-astrologico';
import { tropicalDoPerfil } from '@/lib/astrology/tropical-do-perfil';
import { respostaDeErro } from '@/lib/http/api';
import { HttpError } from '@/lib/http-error';
import { requireServerSession } from '@/lib/mysql/server-auth';

export const runtime = 'nodejs';

/** Consulta privada do próprio perfil. A experiência anônima pertence à tarefa 157. */
export async function GET(request: Request) {
  try {
    const session = await requireServerSession();
    const parametro = new URL(request.url).searchParams.get('ocorrencia');
    if (
      parametro !== null &&
      parametro !== 'anterior' &&
      parametro !== 'posterior'
    )
      throw new HttpError('Ocorrência deve ser anterior ou posterior.', 400);
    const perfil = await lerPerfilAstrologico(session.user.id);
    return NextResponse.json(
      tropicalDoPerfil(perfil, new Date(), parametro ?? undefined),
      {
        headers: { 'Cache-Control': 'private, no-store' },
      }
    );
  } catch (error) {
    if (error instanceof RangeError)
      return NextResponse.json(
        { error: error.message },
        { status: 422, headers: { 'Cache-Control': 'private, no-store' } }
      );
    return respostaDeErro(error, 'Falha ao calcular o mapa ocidental.');
  }
}
