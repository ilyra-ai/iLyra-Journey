import { NextResponse } from 'next/server';

import {
  ambienteDoPedido,
  guardarCookieDoDesafio,
} from '@/lib/auth/chaves/rotas';
import { opcoesDeRegistro } from '@/lib/auth/chaves/servico';
import { respostaDeErro } from '@/lib/http/api';
import { requireServerSession } from '@/lib/mysql/server-auth';

export const runtime = 'nodejs';

/** Opções para criar uma chave de acesso (tarefa 167): só com sessão. */
export async function POST(request: Request) {
  try {
    const session = await requireServerSession();
    const { opcoes, desafioId } = await opcoesDeRegistro(
      ambienteDoPedido(request),
      {
        id: session.user.id,
        email: session.user.email,
        nome: session.user.user_metadata.full_name ?? '',
      }
    );
    const resposta = NextResponse.json(
      { opcoes },
      { headers: { 'Cache-Control': 'no-store' } }
    );
    guardarCookieDoDesafio(resposta, desafioId);
    return resposta;
  } catch (error) {
    return respostaDeErro(
      error,
      'Não foi possível preparar a chave de acesso.'
    );
  }
}
