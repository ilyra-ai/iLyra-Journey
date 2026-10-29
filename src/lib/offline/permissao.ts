import { createHmac } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { getSecret } from '@/lib/auth/session';
import { HttpError } from '@/lib/http-error';
/** Chave derivada de propósito próprio: esta permissão nunca é um token de login. */
function chave() {
  return createHmac('sha256', getSecret())
    .update('lyra:permissao-offline:v1')
    .digest();
}
export const VALIDADE_OFFLINE_SEGUNDOS = 24 * 60 * 60;
export async function emitirPermissaoOffline(
  userId: string,
  agora = new Date()
) {
  const inicio = Math.floor(agora.getTime() / 1000),
    fim = inicio + VALIDADE_OFFLINE_SEGUNDOS;
  return {
    token: await new SignJWT({ escopo: 'registros-offline' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setAudience('lyra-offline')
      .setIssuedAt(inicio)
      .setExpirationTime(fim)
      .sign(chave()),
    expiraEm: new Date(fim * 1000).toISOString(),
  };
}
export async function exigirPermissaoOffline(
  token: string,
  userId: string,
  agora = new Date()
) {
  try {
    const { payload } = await jwtVerify(token, chave(), {
      algorithms: ['HS256'],
      audience: 'lyra-offline',
      currentDate: agora,
    });
    if (payload.sub !== userId || payload.escopo !== 'registros-offline')
      throw new Error('Titular ou escopo divergente.');
  } catch {
    throw new HttpError(
      'A permissão local expirou ou pertence a outra conta. Confirme a conta original e atualize a preparação online.',
      403
    );
  }
}
