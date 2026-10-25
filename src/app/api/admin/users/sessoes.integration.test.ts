import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { POST } from './[userId]/sessoes/route';
import { POST as login } from '../../auth/login/route';
import { GET as sessao } from '../../auth/session/route';
import { criarUsuario } from '../../../../../tests/integration/fixtures';
import { chamar, cookieJar } from '../../../../../tests/integration/http';
import { encerrarSessoes } from '@/lib/auth/encerrar-sessoes';
import { hashPassword } from '@/lib/auth/password';
import { executeStatement, queryRows } from '@/lib/mysql/pool';
import { exportarDadosDoTitular, excluirConta } from '@/lib/lgpd/conta';

it('encerra o cookie anterior sem bloquear a conta e não revoga novo login ao repetir a solicitação', async () => {
  const admin = await criarUsuario('admin');
  const pessoa = await criarUsuario();
  const password = randomUUID();
  await executeStatement('UPDATE users SET password_hash = ? WHERE id = ?', [
    await hashPassword(password),
    pessoa.id,
  ]);
  await chamar(sessao, { usuario: pessoa });
  const cookieAntigo = new Map(cookieJar);
  const body = { requestId: randomUUID(), reason: 'suporte' };
  expect(
    (
      await chamar(POST, {
        method: 'POST',
        params: { userId: pessoa.id },
        usuario: admin,
        body,
      })
    ).json
  ).toEqual({ revoked: true, repeated: false });
  cookieJar.clear();
  for (const [k, v] of cookieAntigo) cookieJar.set(k, v);
  expect((await chamar(sessao)).json).toEqual({ session: null });
  expect(
    (
      await chamar(login, {
        method: 'POST',
        body: { email: pessoa.email, password },
        usuario: null,
      })
    ).status
  ).toBe(200);
  const cookieNovo = new Map(cookieJar);
  expect(
    (
      await chamar(POST, {
        method: 'POST',
        params: { userId: pessoa.id },
        usuario: admin,
        body,
      })
    ).json
  ).toEqual({ revoked: true, repeated: true });
  cookieJar.clear();
  for (const [k, v] of cookieNovo) cookieJar.set(k, v);
  expect((await chamar(sessao)).json).toMatchObject({
    session: { user: { id: pessoa.id } },
  });
  expect(
    (
      await queryRows(
        'SELECT blocked_at, session_version FROM users WHERE id = ?',
        [pessoa.id]
      )
    )[0]
  ).toEqual({ blocked_at: null, session_version: 1 });
});

it('serializa a repetição concorrente e recusa reutilizar identificador com outros dados', async () => {
  const admin = await criarUsuario('admin');
  const pessoa = await criarUsuario();
  const requestId = randomUUID();
  const resultados = await Promise.all([
    encerrarSessoes(admin.id, pessoa.id, requestId, 'suporte'),
    encerrarSessoes(admin.id, pessoa.id, requestId, 'suporte'),
  ]);
  expect(resultados.filter((r) => r.repeated)).toHaveLength(1);
  expect(
    (
      await queryRows('SELECT session_version FROM users WHERE id = ?', [
        pessoa.id,
      ])
    )[0]
  ).toEqual({ session_version: 1 });
  await expect(
    encerrarSessoes(admin.id, pessoa.id, requestId, 'suspeita_de_acesso')
  ).rejects.toMatchObject({ statusCode: 409 });
  await expect(
    encerrarSessoes(
      (await criarUsuario('admin')).id,
      pessoa.id,
      requestId,
      'suporte'
    )
  ).rejects.toMatchObject({ statusCode: 409 });
});

it('recusa anônimo, paciente, administrador bloqueado, alvo inexistente e campos inválidos', async () => {
  const admin = await criarUsuario('admin');
  const pessoa = await criarUsuario();
  const request = {
    method: 'POST',
    params: { userId: pessoa.id },
    body: { requestId: randomUUID(), reason: 'suporte' },
  };
  expect((await chamar(POST, { ...request, usuario: null })).status).toBe(401);
  expect((await chamar(POST, { ...request, usuario: pessoa })).status).toBe(
    403
  );
  expect(
    (
      await chamar(POST, {
        ...request,
        usuario: admin,
        params: { userId: randomUUID() },
      })
    ).status
  ).toBe(404);
  expect(
    (
      await chamar(POST, {
        ...request,
        usuario: admin,
        body: { ...request.body, reason: 'texto livre' },
      })
    ).status
  ).toBe(400);
  expect(
    (
      await chamar(POST, {
        ...request,
        usuario: admin,
        body: { reason: 'suporte' },
      })
    ).status
  ).toBe(400);
  await executeStatement(
    'UPDATE users SET blocked_at = UTC_TIMESTAMP() WHERE id = ?',
    [admin.id]
  );
  expect((await chamar(POST, { ...request, usuario: admin })).status).toBe(401);
  await expect(
    encerrarSessoes(admin.id, pessoa.id, randomUUID(), 'suporte')
  ).rejects.toMatchObject({ statusCode: 403 });
});

it('exporta somente os eventos do titular sem identidade do administrador e exclui em cascata', async () => {
  const admin = await criarUsuario('admin');
  const pessoa = await criarUsuario();
  const outra = await criarUsuario();
  await encerrarSessoes(
    admin.id,
    pessoa.id,
    randomUUID(),
    'solicitacao_do_titular'
  );
  await encerrarSessoes(admin.id, outra.id, randomUUID(), 'suporte');
  const dados = await exportarDadosDoTitular(pessoa.id);
  expect(dados.eventos_administrativos).toHaveLength(1);
  expect(dados.eventos_administrativos[0]).toMatchObject({
    action: 'sessions_revoked',
    reason: 'solicitacao_do_titular',
  });
  expect(dados.eventos_administrativos[0]).not.toHaveProperty('actor_id');
  await excluirConta(pessoa.id);
  expect(
    await queryRows('SELECT id FROM admin_user_events WHERE user_id = ?', [
      pessoa.id,
    ])
  ).toHaveLength(0);
  expect(
    await queryRows('SELECT id FROM admin_user_events WHERE user_id = ?', [
      outra.id,
    ])
  ).toHaveLength(1);
});

it('administrador pode encerrar as próprias sessões sem perder o papel nem bloquear a conta', async () => {
  const admin = await criarUsuario('admin');
  const resposta = await chamar(POST, {
    method: 'POST',
    params: { userId: admin.id },
    usuario: admin,
    body: { requestId: randomUUID(), reason: 'suporte' },
  });
  expect(resposta.status).toBe(200);
  expect((await chamar(sessao)).json).toEqual({ session: null });
  expect(
    (
      await queryRows(
        'SELECT u.blocked_at, p.role FROM users u JOIN profiles p ON p.id = u.id WHERE u.id = ?',
        [admin.id]
      )
    )[0]
  ).toEqual({ blocked_at: null, role: 'admin' });
});
