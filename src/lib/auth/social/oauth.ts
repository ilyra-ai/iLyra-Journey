import { createHash, randomBytes } from 'node:crypto';

import {
  createRemoteJWKSet,
  importPKCS8,
  jwtVerify,
  SignJWT,
  type JWTVerifyGetKey,
} from 'jose';

import { HttpError } from '@/lib/http-error';

import type { CredenciaisDoProvedor, ProvedorSocial } from './configuracao';

/**
 * Login com Google (OpenID Connect, código de autorização com PKCE) e com
 * Apple (Sign in with Apple, resposta por form_post) — tarefas 164 e 165.
 * O `state` e o `nonce` vão num cookie assinado e de curta duração; o
 * `id_token` é conferido pela chave pública oficial de cada provedor
 * (emissor, audiência, nonce e validade).
 */

export const ENDERECOS = {
  google: {
    autorizacao: 'https://accounts.google.com/o/oauth2/v2/auth',
    token: 'https://oauth2.googleapis.com/token',
    chaves: 'https://www.googleapis.com/oauth2/v3/certs',
    emissores: ['https://accounts.google.com', 'accounts.google.com'],
  },
  apple: {
    autorizacao: 'https://appleid.apple.com/auth/authorize',
    token: 'https://appleid.apple.com/auth/token',
    chaves: 'https://appleid.apple.com/auth/keys',
    emissores: ['https://appleid.apple.com'],
  },
} as const;

export const COOKIE_DO_ESTADO = 'lyra_login_social';
export const DURACAO_DO_ESTADO_S = 10 * 60;

export interface EstadoDoLogin {
  provedor: ProvedorSocial;
  state: string;
  nonce: string;
  /** PKCE (Google); a Apple usa o segredo do cliente. */
  verificador: string | null;
  /** Identificador de retorno da lista fechada de `retorno.ts`. */
  retorno: string | null;
  /** A pessoa aceitou os termos antes (necessário para conta nova). */
  aceite: boolean;
}

function aleatorio(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

function chaveDoEstado() {
  const segredo = process.env.AUTH_SECRET;
  if (!segredo)
    throw new Error('Variável de ambiente obrigatória ausente: AUTH_SECRET');
  return new TextEncoder().encode(`lyra:login-social:${segredo}`);
}

/** Cria o estado de um novo login e o valor assinado do cookie. */
export async function novoEstado(
  provedor: ProvedorSocial,
  opcoes: { retorno: string | null; aceite: boolean }
) {
  const estado: EstadoDoLogin = {
    provedor,
    state: aleatorio(),
    nonce: aleatorio(),
    verificador: provedor === 'google' ? aleatorio(48) : null,
    retorno: opcoes.retorno,
    aceite: opcoes.aceite,
  };
  const cookie = await new SignJWT({ ...estado })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${DURACAO_DO_ESTADO_S}s`)
    .sign(chaveDoEstado());
  return { estado, cookie };
}

/** Confere o cookie e o `state` devolvido pelo provedor. */
export async function conferirEstado(
  cookie: string | undefined,
  provedor: ProvedorSocial,
  stateRecebido: string | null
): Promise<EstadoDoLogin> {
  if (!cookie || !stateRecebido)
    throw new HttpError('O login expirou. Tente de novo.', 400);
  let estado: EstadoDoLogin;
  try {
    const { payload } = await jwtVerify(cookie, chaveDoEstado(), {
      algorithms: ['HS256'],
    });
    estado = payload as unknown as EstadoDoLogin;
  } catch {
    throw new HttpError('O login expirou. Tente de novo.', 400);
  }
  if (estado.provedor !== provedor || estado.state !== stateRecebido)
    throw new HttpError('O retorno do login não confere. Tente de novo.', 400);
  return estado;
}

/** `code_challenge` S256 do PKCE. */
export function desafioPkce(verificador: string) {
  return createHash('sha256').update(verificador).digest('base64url');
}

export function urlDeAutorizacao(
  credenciais: Pick<CredenciaisDoProvedor, 'provedor' | 'clientId'>,
  estado: EstadoDoLogin,
  redirecionamento: string
) {
  const p = new URLSearchParams({
    client_id: credenciais.clientId,
    redirect_uri: redirecionamento,
    response_type: 'code',
    state: estado.state,
    nonce: estado.nonce,
  });
  if (credenciais.provedor === 'google') {
    p.set('scope', 'openid email profile');
    p.set('code_challenge', desafioPkce(estado.verificador!));
    p.set('code_challenge_method', 'S256');
    p.set('prompt', 'select_account');
  } else {
    p.set('scope', 'name email');
    // Com nome ou e-mail pedidos, a Apple exige a resposta por POST.
    p.set('response_mode', 'form_post');
  }
  return `${ENDERECOS[credenciais.provedor].autorizacao}?${p}`;
}

/** Segredo do cliente da Apple: JWT ES256 assinado com a chave .p8. */
export async function segredoDoClienteApple(
  credenciais: CredenciaisDoProvedor,
  agora = new Date()
) {
  if (!credenciais.appleTeamId || !credenciais.appleKeyId)
    throw new HttpError(
      'Login com Apple incompleto: faltam Team ID e Key ID.',
      503
    );
  const chave = await importPKCS8(credenciais.segredo, 'ES256');
  const emSegundos = Math.floor(agora.getTime() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: credenciais.appleKeyId })
    .setIssuer(credenciais.appleTeamId)
    .setSubject(credenciais.clientId)
    .setAudience('https://appleid.apple.com')
    .setIssuedAt(emSegundos)
    .setExpirationTime(emSegundos + 5 * 60)
    .sign(chave);
}

/** Troca o código pelo `id_token` no endpoint oficial do provedor. */
export async function trocarCodigo(
  credenciais: CredenciaisDoProvedor,
  codigo: string,
  estado: EstadoDoLogin,
  redirecionamento: string,
  buscar: typeof fetch = fetch
): Promise<string> {
  const corpo = new URLSearchParams({
    grant_type: 'authorization_code',
    code: codigo,
    redirect_uri: redirecionamento,
    client_id: credenciais.clientId,
    client_secret:
      credenciais.provedor === 'apple'
        ? await segredoDoClienteApple(credenciais)
        : credenciais.segredo,
  });
  if (estado.verificador) corpo.set('code_verifier', estado.verificador);
  let resposta: Response;
  try {
    resposta = await buscar(ENDERECOS[credenciais.provedor].token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: corpo,
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new HttpError('Não foi possível falar com o provedor de login.', 502);
  }
  const json = (await resposta.json().catch(() => null)) as {
    id_token?: unknown;
  } | null;
  if (!resposta.ok || typeof json?.id_token !== 'string')
    throw new HttpError('O provedor de login recusou o pedido.', 502);
  return json.id_token;
}

const chavesRemotas = new Map<ProvedorSocial, JWTVerifyGetKey>();
function chavesOficiais(provedor: ProvedorSocial) {
  let chaves = chavesRemotas.get(provedor);
  if (!chaves) {
    chaves = createRemoteJWKSet(new URL(ENDERECOS[provedor].chaves));
    chavesRemotas.set(provedor, chaves);
  }
  return chaves;
}

export interface IdentidadeSocial {
  provedor: ProvedorSocial;
  sujeito: string;
  email: string | null;
  emailVerificado: boolean;
  /** Google manda o nome no id_token; a Apple só no primeiro login. */
  nome: { primeiro: string | null; sobrenome: string | null };
}

/** Confere o `id_token` e devolve a identidade. */
export async function conferirIdToken(
  idToken: string,
  esperado: { provedor: ProvedorSocial; clientId: string; nonce: string },
  chaves: JWTVerifyGetKey = chavesOficiais(esperado.provedor)
): Promise<IdentidadeSocial> {
  let payload: Record<string, unknown>;
  try {
    ({ payload } = await jwtVerify(idToken, chaves, {
      issuer: [...ENDERECOS[esperado.provedor].emissores],
      audience: esperado.clientId,
    }));
  } catch {
    throw new HttpError('A identidade do login não pôde ser confirmada.', 401);
  }
  if (payload.nonce !== esperado.nonce || typeof payload.sub !== 'string')
    throw new HttpError('A identidade do login não pôde ser confirmada.', 401);
  const email =
    typeof payload.email === 'string'
      ? payload.email.trim().toLowerCase()
      : null;
  // A Apple informa "true" como texto.
  const verificado =
    payload.email_verified === true || payload.email_verified === 'true';
  const texto = (valor: unknown) =>
    typeof valor === 'string' && valor.trim() ? valor.trim() : null;
  return {
    provedor: esperado.provedor,
    sujeito: payload.sub,
    email,
    emailVerificado: Boolean(email) && verificado,
    nome: {
      primeiro: texto(payload.given_name),
      sobrenome: texto(payload.family_name),
    },
  };
}

/**
 * Nome enviado pela Apple no primeiro login, no campo `user` do form_post
 * (JSON). Só nome: o e-mail confiável é o do id_token.
 */
export function nomeDaApple(campoUser: string | null) {
  if (!campoUser) return null;
  try {
    const dados = JSON.parse(campoUser) as {
      name?: { firstName?: unknown; lastName?: unknown };
    };
    const texto = (v: unknown) =>
      typeof v === 'string' && v.trim() ? v.trim().slice(0, 120) : null;
    return {
      primeiro: texto(dados.name?.firstName),
      sobrenome: texto(dados.name?.lastName),
    };
  } catch {
    return null;
  }
}
