import type { AuthenticationResponseJSON } from '@simplewebauthn/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  ambienteDoPedido,
  apagarCookieDoDesafio,
  cookieDoDesafio,
  LIMITE_CHAVE_POR_IP,
} from '@/lib/auth/chaves/rotas';
import { concluirLogin } from '@/lib/auth/chaves/servico';
import {
  buildAppSession,
  setSessionCookie,
  signSessionToken,
} from '@/lib/auth/session';
import { contarEtapaSemBloquear } from '@/lib/funil/registro';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { exigirDentroDoLimite, ipDoCliente } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

const esquema = z.object({
  resposta: z.object({ id: z.string().max(1400) }).passthrough(),
});

/**
 * Entrar com uma chave de acesso (tarefa 167). A sessão nasce igual à do
 * login por senha: papel e versão de sessão lidos do banco agora.
 */
export async function POST(request: Request) {
  try {
    await exigirDentroDoLimite(LIMITE_CHAVE_POR_IP, ipDoCliente(request));
    const { resposta } = await lerJson(request, esquema);
    const conta = await concluirLogin(
      ambienteDoPedido(request),
      cookieDoDesafio(request),
      resposta as unknown as AuthenticationResponseJSON
    );
    const token = await signSessionToken({
      sub: conta.id,
      email: conta.email,
      role: conta.role,
      sessionVersion: conta.session_version,
    });
    await setSessionCookie(token);
    await contarEtapaSemBloquear('login_concluido', 'chave');
    const saida = NextResponse.json({
      session: buildAppSession(
        { sub: conta.id, email: conta.email, role: conta.role },
        conta
      ),
    });
    apagarCookieDoDesafio(saida);
    return saida;
  } catch (error) {
    const saida = respostaDeErro(error, 'Não foi possível entrar com a chave.');
    apagarCookieDoDesafio(saida);
    return saida;
  }
}
