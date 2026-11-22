import type { RegistrationResponseJSON } from '@simplewebauthn/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  ambienteDoPedido,
  apagarCookieDoDesafio,
  cookieDoDesafio,
} from '@/lib/auth/chaves/rotas';
import { concluirRegistro, listarChaves } from '@/lib/auth/chaves/servico';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireServerSession } from '@/lib/mysql/server-auth';

export const runtime = 'nodejs';

const esquema = z.object({
  nome: z.string(),
  // A estrutura da resposta é conferida pelo SimpleWebAuthn.
  resposta: z.object({ id: z.string().max(1400) }).passthrough(),
});

/** Conclui a criação da chave de acesso na conta da sessão (tarefa 167). */
export async function POST(request: Request) {
  try {
    const session = await requireServerSession();
    const { nome, resposta } = await lerJson(request, esquema);
    await concluirRegistro(
      ambienteDoPedido(request),
      session.user.id,
      cookieDoDesafio(request),
      resposta as unknown as RegistrationResponseJSON,
      nome
    );
    const saida = NextResponse.json(
      { chaves: await listarChaves(session.user.id) },
      { status: 201 }
    );
    apagarCookieDoDesafio(saida);
    return saida;
  } catch (error) {
    const saida = respostaDeErro(
      error,
      'Não foi possível criar a chave de acesso.'
    );
    apagarCookieDoDesafio(saida);
    return saida;
  }
}
