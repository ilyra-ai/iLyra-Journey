import { HttpError } from '@/lib/http-error';
import { randomBytes } from 'node:crypto';

import { after, NextResponse } from 'next/server';
import { z } from 'zod';

import { prepararPlanoAoEntrar } from '@/lib/ai/plano-do-dia';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import {
  buildAppSession,
  setSessionCookie,
  signSessionToken,
} from '@/lib/auth/session';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { queryRows } from '@/lib/mysql/pool';
import { registrarErroInterno } from '@/lib/observability/log-seguro';
import { contarEtapaSemBloquear } from '@/lib/funil/registro';
import {
  LIMITE_LOGIN_POR_CONTA,
  LIMITE_LOGIN_POR_IP,
  exigirDentroDoLimite,
  exigirLimiteDisponivel,
  ipDoCliente,
  registrarOcorrencia,
  zerarLimite,
} from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Credenciais obrigatórias.')
    .max(255),
  // Mesma normalização do cadastro (a senha é gravada sem espaços nas pontas).
  password: z.string().trim().min(1, 'Credenciais obrigatórias.').max(200),
  // "Lembrar-me": true mantém a sessão por 7 dias; false cria uma sessão que
  // termina ao fechar o navegador.
  remember: z.boolean().optional(),
});

interface UserRow {
  blocked_at: string | null;
  session_version: number;
  id: string;
  email: string;
  password_hash: string;
  role: string;
  first_name: string | null;
  last_name: string | null;
  onboarding_completed: number;
}

// Hash bcrypt (mesmo custo do cadastro) de uma senha aleatória descartada,
// gerado uma vez por processo: comparado quando o e-mail não existe, para que
// o tempo de resposta não revele quais e-mails têm conta.
let hashDeReferencia: Promise<string> | null = null;
function obterHashDeReferencia() {
  hashDeReferencia ??= hashPassword(randomBytes(32).toString('base64url'));
  return hashDeReferencia;
}

const CREDENCIAIS_INVALIDAS = 'E-mail ou senha inválidos.';

export async function POST(request: Request) {
  try {
    const payload = await lerJson(request, loginSchema);

    // Força bruta: cada IP tem um teto de tentativas e cada conta um teto de
    // falhas de senha (este último não depende de cabeçalho forjável). Com a
    // conta bloqueada, nem a senha correta entra até a janela terminar.
    await exigirDentroDoLimite(LIMITE_LOGIN_POR_IP, ipDoCliente(request));
    await exigirLimiteDisponivel(LIMITE_LOGIN_POR_CONTA, payload.email);

    const users = await queryRows<UserRow>(
      `
        SELECT
          u.id,
          u.email,
          u.password_hash,
          u.blocked_at,
          u.session_version,
          p.role,
          p.first_name,
          p.last_name,
          p.onboarding_completed
        FROM users u
        INNER JOIN profiles p ON p.id = u.id
        WHERE u.email = ?
        LIMIT 1
      `,
      [payload.email]
    );

    const user = users[0];
    // E-mail inexistente e senha errada respondem igual (401, mesma
    // mensagem e mesmo custo): antes, 404 "Usuário não encontrado" permitia
    // descobrir quais e-mails têm conta.
    const validPassword = await verifyPassword(
      payload.password,
      user?.password_hash ?? (await obterHashDeReferencia())
    );
    if (!user || !validPassword) {
      await registrarOcorrencia(LIMITE_LOGIN_POR_CONTA, payload.email);
      return NextResponse.json(
        { error: CREDENCIAIS_INVALIDAS },
        { status: 401 }
      );
    }
    if (user.blocked_at) {
      throw new HttpError(
        'Sua conta está bloqueada. Entre em contato com a administração para recuperar o acesso.',
        403
      );
    }
    await zerarLimite(LIMITE_LOGIN_POR_CONTA, payload.email);

    const sessionOptions = { persistent: payload.remember === true };
    const token = await signSessionToken(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        sessionVersion: user.session_version,
      },
      sessionOptions
    );
    await setSessionCookie(token, sessionOptions);
    await contarEtapaSemBloquear('login_concluido', 'email');

    // Plano do dia pronto ao entrar (tarefa 51), sem atrasar o login: roda
    // depois da resposta. Antes do onboarding ainda não há perfil para ele.
    if (user.onboarding_completed) {
      after(async () => {
        try {
          await prepararPlanoAoEntrar(user.id, user.role);
        } catch (error) {
          registrarErroInterno('plano:ao-entrar', error);
        }
      });
    }

    return NextResponse.json({
      session: buildAppSession(
        { sub: user.id, email: user.email, role: user.role },
        user
      ),
    });
  } catch (error) {
    return respostaDeErro(error, 'Falha no login.');
  }
}
