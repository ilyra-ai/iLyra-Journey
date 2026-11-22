import { NextResponse } from 'next/server';

import { destinoDeRetorno } from '@/lib/auth/retorno';

import { PROVEDORES_SOCIAIS, type ProvedorSocial } from './configuracao';

/** Códigos de erro que a tela de login sabe explicar (lista fechada). */
export const ERROS_DO_LOGIN_SOCIAL = [
  'indisponivel',
  'expirou',
  'recusado',
  'termos',
  'sem-email',
  'bloqueada',
  'cancelado',
] as const;
export type ErroDoLoginSocialCodigo = (typeof ERROS_DO_LOGIN_SOCIAL)[number];

export function provedorDaRota(valor: string): ProvedorSocial | null {
  return (PROVEDORES_SOCIAIS as readonly string[]).includes(valor)
    ? (valor as ProvedorSocial)
    : null;
}

/** Origem pública do app: a configurada, ou a da própria requisição. */
export function origemDoApp(request: Request) {
  const configurada =
    process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;
  return (configurada || new URL(request.url).origin).replace(/\/+$/, '');
}

/** Endereço de retorno que vai cadastrado no Google Cloud e no Apple Developer. */
export function enderecoDeRetorno(provedor: ProvedorSocial, origem: string) {
  return `${origem}/api/auth/social/${provedor}/retorno`;
}

/** Volta à tela de login com um código de erro conhecido (303: vale para POST). */
export function voltarComErro(origem: string, codigo: ErroDoLoginSocialCodigo) {
  return NextResponse.redirect(`${origem}/login?erro=${codigo}`, 303);
}

/** Volta ao login já com sessão: o app leva ao onboarding ou ao destino. */
export function voltarComSessao(origem: string, retorno: string | null) {
  const destino = destinoDeRetorno(retorno) ? `?destino=${retorno}` : '';
  return NextResponse.redirect(`${origem}/login${destino}`, 303);
}
