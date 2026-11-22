import { createHash, randomUUID } from 'node:crypto';

import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransport,
  RegistrationResponseJSON,
} from '@simplewebauthn/server';
import type { RowDataPacket } from 'mysql2';
import { z } from 'zod';

import { HttpError } from '@/lib/http-error';
import { executeStatement, queryRows } from '@/lib/mysql/pool';

/**
 * Chaves de acesso (passkeys, tarefa 167), com o SimpleWebAuthn.
 *
 * - O desafio de cada cerimônia é de uso único e vale 5 minutos: fica no
 *   banco e o cookie leva só o id dele. A primeira tentativa marca o
 *   desafio como usado, com ou sem sucesso.
 * - O registro exige sessão; o login usa credencial descoberta pelo
 *   aparelho (sem digitar e-mail) e pede verificação do usuário (biometria
 *   ou PIN do próprio aparelho), que o servidor confere.
 * - O login confere no banco, na hora, se a chave não foi revogada e se a
 *   conta não está bloqueada; papel e versão de sessão vêm do banco, nunca
 *   da credencial.
 */

export const NOME_DO_APP = 'Lyra MetaCare';
export const COOKIE_DO_DESAFIO = 'lyra_chave_de_acesso';
export const VALIDADE_DO_DESAFIO_MS = 5 * 60 * 1000;
export const LIMITE_DE_CHAVES = 10;

export type Finalidade = 'registro' | 'login';

export interface Ambiente {
  /** Origem exata do app, ex.: https://app.lyra.com.br */
  origem: string;
  /** Domínio da Relying Party: o hostname da origem. */
  rpID: string;
}

export function ambienteDaOrigem(origem: string): Ambiente {
  return { origem, rpID: new URL(origem).hostname };
}

export function hashDaCredencial(credencialId: string) {
  return createHash('sha256').update(credencialId).digest('hex');
}

const TRANSPORTES = new Set([
  'ble',
  'cable',
  'hybrid',
  'internal',
  'nfc',
  'smart-card',
  'usb',
]);

function transportesValidos(valor: unknown): AuthenticatorTransport[] {
  return Array.isArray(valor)
    ? (valor.filter(
        (t) => typeof t === 'string' && TRANSPORTES.has(t)
      ) as AuthenticatorTransport[])
    : [];
}

async function guardarDesafio(
  finalidade: Finalidade,
  desafio: string,
  userId: string | null
) {
  const id = randomUUID();
  await executeStatement(
    `INSERT INTO desafios_de_chave (id, finalidade, user_id, desafio, expira_em)
     VALUES (?, ?, ?, ?, ?)`,
    [
      id,
      finalidade,
      userId,
      desafio,
      new Date(Date.now() + VALIDADE_DO_DESAFIO_MS),
    ]
  );
  // Limpeza oportunista: desafios vencidos não servem para nada.
  await executeStatement(
    'DELETE FROM desafios_de_chave WHERE expira_em < UTC_TIMESTAMP(3) - INTERVAL 1 DAY'
  );
  return id;
}

/**
 * Consome o desafio: só a primeira chamada dentro da validade devolve o
 * valor. Repetir a mesma resposta, trocar de finalidade ou de conta falha.
 */
export async function consumirDesafio(
  id: string | undefined,
  finalidade: Finalidade,
  userId: string | null
) {
  if (!id || !/^[0-9a-f-]{36}$/.test(id))
    throw new HttpError('O pedido expirou. Tente de novo.', 400);
  const resultado = await executeStatement(
    `UPDATE desafios_de_chave SET usado_em = UTC_TIMESTAMP(3)
      WHERE id = ? AND finalidade = ? AND usado_em IS NULL
        AND expira_em > UTC_TIMESTAMP(3)
        AND (user_id <=> ?)`,
    [id, finalidade, userId]
  );
  if (resultado.affectedRows !== 1)
    throw new HttpError('O pedido expirou. Tente de novo.', 400);
  const [linha] = await queryRows<{ desafio: string } & RowDataPacket>(
    'SELECT desafio FROM desafios_de_chave WHERE id = ? LIMIT 1',
    [id]
  );
  if (!linha) throw new HttpError('O pedido expirou. Tente de novo.', 400);
  return linha.desafio;
}

interface LinhaDaChave extends RowDataPacket {
  id: string;
  user_id: string;
  credencial_id: string;
  chave_publica: Buffer;
  contador: number | string;
  transportes: unknown;
  revogada_em: Date | null;
}

async function chavesAtivasDaConta(userId: string) {
  return queryRows<LinhaDaChave>(
    `SELECT id, user_id, credencial_id, chave_publica, contador, transportes,
            revogada_em
       FROM chaves_de_acesso
      WHERE user_id = ? AND revogada_em IS NULL`,
    [userId]
  );
}

export async function opcoesDeRegistro(
  ambiente: Ambiente,
  conta: { id: string; email: string; nome: string }
) {
  const existentes = await chavesAtivasDaConta(conta.id);
  if (existentes.length >= LIMITE_DE_CHAVES)
    throw new HttpError(
      `Limite de ${LIMITE_DE_CHAVES} chaves de acesso por conta. Revogue uma antes de criar outra.`,
      409
    );
  const opcoes = await generateRegistrationOptions({
    rpName: NOME_DO_APP,
    rpID: ambiente.rpID,
    userName: conta.email,
    userDisplayName: conta.nome || conta.email,
    // O identificador do usuário no autenticador é o id da conta, que não
    // revela nada pessoal.
    userID: new TextEncoder().encode(conta.id),
    attestationType: 'none',
    excludeCredentials: existentes.map((c) => ({
      id: c.credencial_id,
      transports: transportesValidos(c.transportes),
    })),
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'required',
    },
  });
  const desafioId = await guardarDesafio(
    'registro',
    opcoes.challenge,
    conta.id
  );
  return { opcoes, desafioId };
}

export const esquemaDoNome = z
  .string()
  .trim()
  .min(1, 'Dê um nome para a chave.')
  .max(60, 'O nome pode ter até 60 caracteres.');

export async function concluirRegistro(
  ambiente: Ambiente,
  userId: string,
  desafioId: string | undefined,
  resposta: RegistrationResponseJSON,
  nome: string
) {
  const desafio = await consumirDesafio(desafioId, 'registro', userId);
  let verificacao: Awaited<ReturnType<typeof verifyRegistrationResponse>>;
  try {
    verificacao = await verifyRegistrationResponse({
      response: resposta,
      expectedChallenge: desafio,
      expectedOrigin: ambiente.origem,
      expectedRPID: ambiente.rpID,
      requireUserVerification: true,
    });
  } catch (erro) {
    throw new HttpError(
      `A chave de acesso não foi aceita: ${erro instanceof Error ? erro.message : 'resposta inválida'}.`,
      400
    );
  }
  if (!verificacao.verified)
    throw new HttpError('A chave de acesso não foi aceita.', 400);
  const info = verificacao.registrationInfo;
  const credencial = info.credential;
  const id = randomUUID();
  try {
    await executeStatement(
      `INSERT INTO chaves_de_acesso
         (id, user_id, credencial_id, credencial_hash, chave_publica, contador,
          transportes, tipo_de_dispositivo, com_backup, aaguid, nome)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        credencial.id,
        hashDaCredencial(credencial.id),
        Buffer.from(credencial.publicKey),
        credencial.counter,
        JSON.stringify(transportesValidos(credencial.transports)),
        info.credentialDeviceType,
        info.credentialBackedUp,
        info.aaguid,
        esquemaDoNome.parse(nome),
      ]
    );
  } catch (erro) {
    if ((erro as { code?: string }).code === 'ER_DUP_ENTRY')
      throw new HttpError('Esta chave de acesso já está cadastrada.', 409);
    throw erro;
  }
  return id;
}

export async function opcoesDeLogin(ambiente: Ambiente) {
  const opcoes = await generateAuthenticationOptions({
    rpID: ambiente.rpID,
    userVerification: 'required',
  });
  const desafioId = await guardarDesafio('login', opcoes.challenge, null);
  return { opcoes, desafioId };
}

export interface ContaDaChave {
  id: string;
  email: string;
  role: string;
  session_version: number;
  first_name: string | null;
  last_name: string | null;
  onboarding_completed: number | boolean;
}

/** Verifica a assinatura e devolve a conta, conferida no banco agora. */
export async function concluirLogin(
  ambiente: Ambiente,
  desafioId: string | undefined,
  resposta: AuthenticationResponseJSON
): Promise<ContaDaChave> {
  const desafio = await consumirDesafio(desafioId, 'login', null);
  const recusa = () =>
    new HttpError(
      'Esta chave de acesso não está cadastrada ou foi revogada. Entre de outro jeito.',
      401
    );
  if (typeof resposta?.id !== 'string' || resposta.id.length > 1400)
    throw recusa();
  const [chave] = await queryRows<LinhaDaChave>(
    `SELECT id, user_id, credencial_id, chave_publica, contador, transportes,
            revogada_em
       FROM chaves_de_acesso WHERE credencial_hash = ? LIMIT 1`,
    [hashDaCredencial(resposta.id)]
  );
  if (!chave || chave.revogada_em || chave.credencial_id !== resposta.id)
    throw recusa();

  let verificacao: Awaited<ReturnType<typeof verifyAuthenticationResponse>>;
  try {
    verificacao = await verifyAuthenticationResponse({
      response: resposta,
      expectedChallenge: desafio,
      expectedOrigin: ambiente.origem,
      expectedRPID: ambiente.rpID,
      requireUserVerification: true,
      credential: {
        id: chave.credencial_id,
        publicKey: new Uint8Array(chave.chave_publica),
        counter: Number(chave.contador),
        transports: transportesValidos(chave.transportes),
      },
    });
  } catch {
    // Inclui contador que não avançou: possível clone da credencial.
    throw new HttpError('A chave de acesso não foi aceita.', 401);
  }
  if (!verificacao.verified)
    throw new HttpError('A chave de acesso não foi aceita.', 401);

  const [conta] = await queryRows<
    ContaDaChave & { blocked_at: Date | null } & RowDataPacket
  >(
    `SELECT u.id, u.email, u.session_version, u.blocked_at,
            p.role, p.first_name, p.last_name, p.onboarding_completed
       FROM users u INNER JOIN profiles p ON p.id = u.id
      WHERE u.id = ? LIMIT 1`,
    [chave.user_id]
  );
  if (!conta) throw recusa();
  if (conta.blocked_at)
    throw new HttpError(
      'Sua conta está bloqueada. Entre em contato com a administração para recuperar o acesso.',
      403
    );
  await executeStatement(
    `UPDATE chaves_de_acesso
        SET contador = ?, ultimo_uso_em = UTC_TIMESTAMP(3)
      WHERE id = ? AND revogada_em IS NULL`,
    [verificacao.authenticationInfo.newCounter, chave.id]
  );
  return conta;
}

export interface ChaveDaConta {
  id: string;
  nome: string;
  tipoDeDispositivo: 'singleDevice' | 'multiDevice';
  comBackup: boolean;
  criadaEm: string;
  ultimoUsoEm: string | null;
}

export async function listarChaves(userId: string): Promise<ChaveDaConta[]> {
  const linhas = await queryRows<
    {
      id: string;
      nome: string;
      tipo_de_dispositivo: 'singleDevice' | 'multiDevice';
      com_backup: number;
      criada_em: Date;
      ultimo_uso_em: Date | null;
    } & RowDataPacket
  >(
    `SELECT id, nome, tipo_de_dispositivo, com_backup, criada_em, ultimo_uso_em
       FROM chaves_de_acesso
      WHERE user_id = ? AND revogada_em IS NULL
      ORDER BY criada_em ASC`,
    [userId]
  );
  return linhas.map((l) => ({
    id: l.id,
    nome: l.nome,
    tipoDeDispositivo: l.tipo_de_dispositivo,
    comBackup: Boolean(l.com_backup),
    criadaEm: new Date(l.criada_em).toISOString(),
    ultimoUsoEm: l.ultimo_uso_em
      ? new Date(l.ultimo_uso_em).toISOString()
      : null,
  }));
}

export async function renomearChave(userId: string, id: string, nome: string) {
  const resultado = await executeStatement(
    `UPDATE chaves_de_acesso SET nome = ?
      WHERE id = ? AND user_id = ? AND revogada_em IS NULL`,
    [esquemaDoNome.parse(nome), id, userId]
  );
  if (resultado.affectedRows !== 1)
    throw new HttpError('Chave de acesso não encontrada.', 404);
}

export async function revogarChave(userId: string, id: string) {
  const resultado = await executeStatement(
    `UPDATE chaves_de_acesso SET revogada_em = UTC_TIMESTAMP(3)
      WHERE id = ? AND user_id = ? AND revogada_em IS NULL`,
    [id, userId]
  );
  if (resultado.affectedRows !== 1)
    throw new HttpError('Chave de acesso não encontrada.', 404);
}
