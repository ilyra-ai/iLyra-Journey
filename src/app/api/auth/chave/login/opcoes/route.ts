import { NextResponse } from 'next/server';

import {
  ambienteDoPedido,
  guardarCookieDoDesafio,
  LIMITE_CHAVE_POR_IP,
} from '@/lib/auth/chaves/rotas';
import { opcoesDeLogin } from '@/lib/auth/chaves/servico';
import { respostaDeErro } from '@/lib/http/api';
import { exigirDentroDoLimite, ipDoCliente } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

/** Desafio para entrar com uma chave de acesso (tarefa 167). */
export async function POST(request: Request) {
  try {
    await exigirDentroDoLimite(LIMITE_CHAVE_POR_IP, ipDoCliente(request));
    const { opcoes, desafioId } = await opcoesDeLogin(
      ambienteDoPedido(request)
    );
    const resposta = NextResponse.json(
      { opcoes },
      { headers: { 'Cache-Control': 'no-store' } }
    );
    guardarCookieDoDesafio(resposta, desafioId);
    return resposta;
  } catch (error) {
    return respostaDeErro(error, 'Não foi possível preparar o login.');
  }
}
