import type { NextResponse } from 'next/server';

import { origemDoApp } from '@/lib/auth/social/rotas';
import type { RegraDeLimite } from '@/lib/security/rate-limit';

import {
  ambienteDaOrigem,
  COOKIE_DO_DESAFIO,
  VALIDADE_DO_DESAFIO_MS,
} from './servico';

/** Origem e RP ID vêm do endereço configurado do app (APP_BASE_URL). */
export function ambienteDoPedido(request: Request) {
  return ambienteDaOrigem(origemDoApp(request));
}

/** Cookie só com o id do desafio, restrito às rotas das chaves. */
export function guardarCookieDoDesafio(resposta: NextResponse, id: string) {
  resposta.cookies.set(COOKIE_DO_DESAFIO, id, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/auth/chave',
    maxAge: VALIDADE_DO_DESAFIO_MS / 1000,
  });
}

export function apagarCookieDoDesafio(resposta: NextResponse) {
  resposta.cookies.set(COOKIE_DO_DESAFIO, '', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/auth/chave',
    maxAge: 0,
  });
}

export function cookieDoDesafio(request: Request) {
  const cabecalho = request.headers.get('cookie') ?? '';
  const par = cabecalho
    .split(';')
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${COOKIE_DO_DESAFIO}=`));
  return par
    ? decodeURIComponent(par.slice(COOKIE_DO_DESAFIO.length + 1))
    : undefined;
}

/** Tentativas automáticas de login por chave, por IP. */
export const LIMITE_CHAVE_POR_IP: RegraDeLimite = {
  escopo: 'chave-login-ip',
  limite: 30,
  janelaSegundos: 10 * 60,
};
