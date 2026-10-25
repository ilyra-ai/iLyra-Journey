import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { PATCH } from './[userId]/bloqueio/route';
import { GET as listar } from './route';
import { POST as login } from '../../auth/login/route';
import { PATCH as trocarEmail } from '../../account/email/route';
import { GET as sessao } from '../../auth/session/route';
import { criarUsuario } from '../../../../../tests/integration/fixtures';
import { chamar, cookieJar } from '../../../../../tests/integration/http';
import { executeStatement, queryRows } from '@/lib/mysql/pool';
import { definirBloqueio } from '@/lib/auth/bloqueio';
import { hashPassword } from '@/lib/auth/password';
import { excluirConta } from '@/lib/lgpd/conta';

it('bloqueio persiste, recusa login e APIs, desbloqueio exige novo login sem reativar o cookie antigo', async () => {
  const admin = await criarUsuario('admin');
  const pessoa = await criarUsuario();
  const senha = randomUUID();
  await executeStatement('UPDATE users SET password_hash = ? WHERE id = ?', [
    await hashPassword(senha),
    pessoa.id,
  ]);
  await chamar(sessao, { usuario: pessoa });
  const cookieAntigo = new Map(cookieJar);
  const alterar = (blocked: boolean) =>
    chamar(PATCH, {
      method: 'PATCH',
      params: { userId: pessoa.id },
      body: { blocked },
      usuario: admin,
    });
  expect((await alterar(true)).status).toBe(200);
  const [estado] = await queryRows<{
    blocked_at: string;
    session_version: number;
  }>('SELECT blocked_at, session_version FROM users WHERE id = ?', [pessoa.id]);
  expect(estado.blocked_at).toBeTruthy();
  expect(estado.session_version).toBe(1);
  expect((await alterar(true)).status).toBe(200);
  expect(
    (
      await queryRows(
        'SELECT blocked_at, session_version FROM users WHERE id = ?',
        [pessoa.id]
      )
    )[0]
  ).toEqual(estado);
  const lista = await chamar(listar, {
    path: `/api/admin/users?search=${pessoa.email}`,
    usuario: admin,
  });
  expect(lista.json).toMatchObject({
    users: [{ id: pessoa.id, blockedAt: estado.blocked_at }],
  });
  const negado = await chamar(login, {
    method: 'POST',
    body: { email: pessoa.email, password: senha },
    usuario: null,
  });
  expect(negado.status).toBe(403);
  expect(cookieJar.size).toBe(0);
  expect((await chamar(listar, { usuario: pessoa })).status).toBe(401);
  expect((await chamar(sessao)).json).toEqual({ session: null });
  expect((await alterar(false)).status).toBe(200);
  cookieJar.clear();
  for (const [key, value] of cookieAntigo) cookieJar.set(key, value);
  expect((await chamar(sessao)).json).toEqual({ session: null });
  const entrou = await chamar(login, {
    method: 'POST',
    body: { email: pessoa.email, password: senha },
    usuario: null,
  });
  expect(entrou.status).toBe(200);
  expect((await chamar(sessao)).json).toMatchObject({
    session: { user: { id: pessoa.id } },
  });
});

it('troca de e-mail preserva a sessão de versão nova após desbloqueio', async () => {
  const admin = await criarUsuario('admin');
  const pessoa = await criarUsuario();
  const password = randomUUID();
  await executeStatement('UPDATE users SET password_hash = ? WHERE id = ?', [
    await hashPassword(password),
    pessoa.id,
  ]);
  await definirBloqueio(admin.id, pessoa.id, true);
  await definirBloqueio(admin.id, pessoa.id, false);
  expect(
    (
      await chamar(login, {
        method: 'POST',
        body: { email: pessoa.email, password },
        usuario: null,
      })
    ).status
  ).toBe(200);
  const newEmail = `alterado-${randomUUID()}@teste.lyra.local`;
  const alterada = await chamar(trocarEmail, {
    method: 'PATCH',
    body: { currentPassword: password, newEmail },
  });
  expect(alterada.status).toBe(200);
  expect((await chamar(sessao)).json).toMatchObject({
    session: { user: { id: pessoa.id, email: newEmail } },
  });
});

it('recusa anônimo, paciente, autobloqueio, corpo inválido e conta inexistente', async () => {
  const admin = await criarUsuario('admin');
  const pessoa = await criarUsuario();
  const request = {
    method: 'PATCH',
    params: { userId: pessoa.id },
    body: { blocked: true },
  };
  expect((await chamar(PATCH, { ...request, usuario: null })).status).toBe(401);
  expect((await chamar(PATCH, { ...request, usuario: pessoa })).status).toBe(
    403
  );
  expect(
    (
      await chamar(PATCH, {
        ...request,
        params: { userId: admin.id },
        usuario: admin,
      })
    ).status
  ).toBe(409);
  expect(
    (
      await chamar(PATCH, {
        ...request,
        body: { blocked: 'false' },
        usuario: admin,
      })
    ).status
  ).toBe(400);
  expect(
    (
      await chamar(PATCH, {
        ...request,
        params: { userId: randomUUID() },
        usuario: admin,
      })
    ).status
  ).toBe(404);
});

it('bloqueios administrativos cruzados simultâneos preservam um administrador ativo', async () => {
  const a = await criarUsuario('admin');
  const b = await criarUsuario('admin');
  const resultados = await Promise.allSettled([
    definirBloqueio(a.id, b.id, true),
    definirBloqueio(b.id, a.id, true),
  ]);
  expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  expect(resultados.filter((r) => r.status === 'rejected')).toHaveLength(1);
  const contas = await queryRows<{ blocked_at: string | null }>(
    'SELECT blocked_at FROM users WHERE id IN (?, ?)',
    [a.id, b.id]
  );
  expect(contas.filter((c) => c.blocked_at === null)).toHaveLength(1);
});

it('administrador bloqueado não conta como recuperação para excluir o último ativo', async () => {
  const ativo = await criarUsuario('admin');
  const bloqueado = await criarUsuario('admin');
  await definirBloqueio(ativo.id, bloqueado.id, true);
  const outros = await queryRows<{ id: string }>(
    "SELECT id FROM profiles WHERE role = 'admin' AND id NOT IN (?, ?)",
    [ativo.id, bloqueado.id]
  );
  await executeStatement(
    "UPDATE profiles SET role = 'patient' WHERE role = 'admin' AND id NOT IN (?, ?)",
    [ativo.id, bloqueado.id]
  );
  try {
    await expect(excluirConta(ativo.id)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(
      await queryRows('SELECT id FROM users WHERE id = ?', [ativo.id])
    ).toHaveLength(1);
    await definirBloqueio(ativo.id, bloqueado.id, false);
    await excluirConta(ativo.id);
    expect(
      await queryRows('SELECT id FROM users WHERE id = ?', [ativo.id])
    ).toHaveLength(0);
  } finally {
    for (const conta of outros)
      await executeStatement(
        "UPDATE profiles SET role = 'admin' WHERE id = ?",
        [conta.id]
      );
  }
});
