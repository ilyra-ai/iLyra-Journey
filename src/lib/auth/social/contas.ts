import { randomBytes, randomUUID } from 'node:crypto';

import type { RowDataPacket } from 'mysql2/promise';

import { hashPassword } from '@/lib/auth/password';
import { HttpError } from '@/lib/http-error';
import { registrarConsentimentos } from '@/lib/lgpd/conta';
import { executeStatement, queryRows, withTransaction } from '@/lib/mysql/pool';
import { ensureUserSubscription } from '@/lib/plans/service';
import { PLANO_DE_BASE } from '@/types/subscription';

import type { IdentidadeSocial } from './oauth';

/**
 * Conta da Lyra a partir de uma identidade do Google ou da Apple (tarefas
 * 164 e 165), sem contas duplicadas:
 * 1. identidade já vinculada → a mesma conta;
 * 2. e-mail verificado pelo provedor igual ao de uma conta → vínculo;
 * 3. senão, conta nova, só com o aceite dos termos e e-mail verificado.
 * Conta bloqueada não entra, como no login por senha.
 */

export interface ContaDoLogin {
  id: string;
  email: string;
  role: string;
  session_version: number;
  blocked_at: string | null;
  first_name: string | null;
  last_name: string | null;
  onboarding_completed: number;
}

/** Erro com código, para a tela de login explicar sem detalhes internos. */
export class ErroDoLoginSocial extends HttpError {
  constructor(
    message: string,
    statusCode: number,
    readonly codigo: 'termos' | 'sem-email' | 'bloqueada'
  ) {
    super(message, statusCode);
  }
}

async function contaPorId(id: string) {
  const [conta] = await queryRows<ContaDoLogin & RowDataPacket>(
    `SELECT u.id, u.email, u.session_version, u.blocked_at,
            p.role, p.first_name, p.last_name, p.onboarding_completed
       FROM users u INNER JOIN profiles p ON p.id = u.id
      WHERE u.id = ? LIMIT 1`,
    [id]
  );
  return conta ?? null;
}

export async function entrarComIdentidade(
  identidade: IdentidadeSocial,
  opcoes: {
    aceite: boolean;
    nome?: { primeiro: string | null; sobrenome: string | null };
    userAgent: string | null;
  }
): Promise<ContaDoLogin & { nova: boolean }> {
  const [vinculo] = await queryRows<{ user_id: string } & RowDataPacket>(
    'SELECT user_id FROM contas_sociais WHERE provedor = ? AND sujeito = ? LIMIT 1',
    [identidade.provedor, identidade.sujeito]
  );
  let id = vinculo?.user_id ?? null;
  let nova = false;

  if (!id) {
    if (!identidade.email || !identidade.emailVerificado)
      throw new ErroDoLoginSocial(
        'O provedor não confirmou um e-mail para esta conta. Entre com e-mail e senha.',
        400,
        'sem-email'
      );
    const [existente] = await queryRows<{ id: string } & RowDataPacket>(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [identidade.email]
    );
    if (existente) {
      id = existente.id;
    } else {
      if (!opcoes.aceite)
        throw new ErroDoLoginSocial(
          'Para criar a conta, aceite os termos de uso e a política de privacidade.',
          409,
          'termos'
        );
      id = await criarConta(identidade.email, opcoes);
      nova = true;
    }
    // INSERT IGNORE: duas abas no mesmo instante não duplicam o vínculo.
    await executeStatement(
      `INSERT IGNORE INTO contas_sociais (provedor, sujeito, user_id, email)
       VALUES (?, ?, ?, ?)`,
      [identidade.provedor, identidade.sujeito, id, identidade.email]
    );
  }

  const conta = await contaPorId(id);
  if (!conta) throw new HttpError('Conta não encontrada.', 404);
  if (conta.blocked_at)
    throw new ErroDoLoginSocial(
      'Sua conta está bloqueada. Entre em contato com a administração para recuperar o acesso.',
      403,
      'bloqueada'
    );
  await executeStatement(
    `UPDATE contas_sociais SET ultimo_acesso_em = CURRENT_TIMESTAMP(3)
      WHERE provedor = ? AND sujeito = ?`,
    [identidade.provedor, identidade.sujeito]
  );
  return { ...conta, nova };
}

async function criarConta(
  email: string,
  opcoes: {
    nome?: { primeiro: string | null; sobrenome: string | null };
    userAgent: string | null;
  }
) {
  const id = randomUUID();
  // Senha aleatória descartada: a conta criada pelo provedor entra por ele
  // (o app ainda não tem recuperação de senha para definir uma).
  const senhaInutilizavel = await hashPassword(
    randomBytes(32).toString('base64url')
  );
  await withTransaction(async (conexao) => {
    await conexao.execute(
      'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)',
      [id, email, senhaInutilizavel]
    );
    await conexao.execute(
      `INSERT INTO profiles (id, first_name, last_name, email, onboarding_completed, role)
       VALUES (?, ?, ?, ?, FALSE, 'patient')`,
      [
        id,
        opcoes.nome?.primeiro?.slice(0, 120) || null,
        opcoes.nome?.sobrenome?.slice(0, 120) || null,
        email,
      ]
    );
    await registrarConsentimentos({
      userId: id,
      tipos: ['terms_of_use', 'privacy_policy'],
      userAgent: opcoes.userAgent,
      connection: conexao,
    });
    await ensureUserSubscription(id, PLANO_DE_BASE, 'auth_register', conexao);
  });
  return id;
}
