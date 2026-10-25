import { registrarEventoDeUsuario } from '@/lib/admin/eventos-usuarios';
import { randomUUID } from 'node:crypto';
import { hashPassword } from '@/lib/auth/password';
import { lerJson } from '@/lib/http/api';
import { withTransaction } from '@/lib/mysql/pool';
import { ensureUserSubscription } from '@/lib/plans/service';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { respostaDeErro } from '@/lib/http/api';
import { requireAdminSession } from '@/lib/mysql/server-auth';
import { listAdminUsersWithSubscriptions } from '@/lib/plans/service';

export const runtime = 'nodejs';

const querySchema = z.object({
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(0).max(100_000).default(0),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  sortColumn: z.enum(['created_at', 'first_name', 'email']).optional(),
  ascending: z.enum(['true', 'false']).default('false'),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdminSession();

    const parametros = Object.fromEntries(
      [...request.nextUrl.searchParams.entries()].filter(([, valor]) => valor)
    );
    const query = querySchema.parse(parametros);
    const response = await listAdminUsersWithSubscriptions({
      search: query.search,
      page: query.page,
      pageSize: query.pageSize,
      sortColumn: query.sortColumn,
      ascending: query.ascending === 'true',
    });

    return NextResponse.json(response);
  } catch (error) {
    return respostaDeErro(
      error,
      'Falha ao carregar a lista administrativa de usuários.'
    );
  }
}

const criarSchema = z
  .object({
    firstName: z.string().trim().min(1).max(120),
    lastName: z.string().trim().max(120).default(''),
    email: z.email().trim().toLowerCase().max(255),
    password: z
      .string()
      .trim()
      .min(12)
      .max(72)
      .refine(
        (v) => Buffer.byteLength(v, 'utf8') <= 72,
        'A senha deve ter até 72 bytes.'
      ),
  })
  .strict();

/** Cadastro administrativo cria uma conta comum e Free; não concede papel administrativo. */
export async function POST(request: Request) {
  try {
    const session = await requireAdminSession();
    const body = await lerJson(request, criarSchema);
    const id = randomUUID();
    const hash = await hashPassword(body.password);
    await withTransaction(async (db) => {
      await db.execute(
        'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)',
        [id, body.email, hash]
      );
      await db.execute(
        `INSERT INTO profiles (id, email, first_name, last_name, role, onboarding_completed) VALUES (?, ?, ?, ?, 'patient', FALSE)`,
        [id, body.email, body.firstName, body.lastName]
      );
      await ensureUserSubscription(id, 'free', 'admin_create', db);
      await registrarEventoDeUsuario(db, {
        userId: id,
        actorId: session.user.id,
        action: 'account_created',
      });
    });
    return NextResponse.json({ id, planKey: 'free' }, { status: 201 });
  } catch (erro) {
    return respostaDeErro(erro, 'Não foi possível cadastrar o usuário.');
  }
}
