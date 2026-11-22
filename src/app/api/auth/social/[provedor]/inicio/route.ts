import { NextResponse } from 'next/server';

import { destinoDeRetorno } from '@/lib/auth/retorno';
import { credenciaisDoProvedor } from '@/lib/auth/social/configuracao';
import {
  COOKIE_DO_ESTADO,
  DURACAO_DO_ESTADO_S,
  novoEstado,
  urlDeAutorizacao,
} from '@/lib/auth/social/oauth';
import { contarEtapaSemBloquear } from '@/lib/funil/registro';
import {
  enderecoDeRetorno,
  origemDoApp,
  provedorDaRota,
  voltarComErro,
} from '@/lib/auth/social/rotas';

export const runtime = 'nodejs';

/**
 * Começa o login com Google ou Apple (tarefas 164 e 165). Recebe só
 * `aceite=1` (termos aceitos na tela de cadastro) e um identificador de
 * retorno da lista fechada; nada de dado pessoal na URL.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ provedor: string }> }
) {
  const origem = origemDoApp(request);
  const provedor = provedorDaRota((await params).provedor);
  if (!provedor) return voltarComErro(origem, 'indisponivel');
  const credenciais = await credenciaisDoProvedor(provedor);
  if (!credenciais) return voltarComErro(origem, 'indisponivel');

  const consulta = new URL(request.url).searchParams;
  const destino = consulta.get('destino');
  const { estado, cookie } = await novoEstado(provedor, {
    retorno: destinoDeRetorno(destino) ? destino : null,
    aceite: consulta.get('aceite') === '1',
  });
  await contarEtapaSemBloquear('login_iniciado', provedor);
  const resposta = NextResponse.redirect(
    urlDeAutorizacao(credenciais, estado, enderecoDeRetorno(provedor, origem)),
    303
  );
  resposta.cookies.set(COOKIE_DO_ESTADO, cookie, {
    httpOnly: true,
    // A Apple devolve por POST vindo do domínio dela: o cookie só volta
    // nesse POST com SameSite=None (que exige Secure). O Google volta por
    // navegação comum, e Lax basta.
    sameSite: provedor === 'apple' ? 'none' : 'lax',
    secure: provedor === 'apple' || origem.startsWith('https://'),
    path: `/api/auth/social/${provedor}`,
    maxAge: DURACAO_DO_ESTADO_S,
  });
  return resposta;
}
