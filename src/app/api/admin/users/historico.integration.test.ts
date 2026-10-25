import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { GET } from './[userId]/historico/route';
import { POST as criar } from './route';
import { criarUsuario } from '../../../../../tests/integration/fixtures';
import { chamar } from '../../../../../tests/integration/http';
import { definirBloqueio } from '@/lib/auth/bloqueio';
import { encerrarSessoes } from '@/lib/auth/encerrar-sessoes';
import { listarEventosDoUsuario } from '@/lib/admin/eventos-usuarios';
import { executeStatement, queryRows } from '@/lib/mysql/pool';
import { runUpdateQuery } from '@/lib/mysql/data-api';
import { assignPlanToUserByAdmin } from '@/lib/plans/service';
import type { HistoricoDeUsuario } from '@/types/gestao-usuarios';

it('reúne cadastro, bloqueio, sessões, perfil e auditoria real de assinaturas sem duplicar estados repetidos', async () => {
  const admin = await criarUsuario('admin');
  const criada = await chamar(criar, {
    method: 'POST',
    usuario: admin,
    body: {
      firstName: 'Histórico',
      email: `historico-${randomUUID()}@teste.lyra.local`,
      password: randomUUID(),
    },
  });
  expect(criada.status).toBe(201);
  const { id } = criada.json as { id: string };
  await definirBloqueio(admin.id, id, true);
  await definirBloqueio(admin.id, id, true);
  await definirBloqueio(admin.id, id, false);
  await encerrarSessoes(admin.id, id, randomUUID(), 'suporte');
  const opcoes = {
    table: 'profiles',
    session: admin.session,
    filters: [{ type: 'eq' as const, column: 'id', value: id }],
    values: { role: 'admin', onboarding_completed: true },
  };
  await runUpdateQuery(opcoes);
  await runUpdateQuery(opcoes);
  await assignPlanToUserByAdmin({
    targetUserId: id,
    actorUserId: admin.id,
    planKey: 'meta',
  });
  const resposta = await chamar(GET, {
    usuario: admin,
    params: { userId: id },
  });
  expect(resposta.status).toBe(200);
  expect(resposta.headers.get('cache-control')).toBe('no-store');
  const dados = resposta.json as HistoricoDeUsuario;
  expect(dados.events.map((e) => e.action).sort()).toEqual(
    [
      'account_created',
      'account_blocked',
      'account_unblocked',
      'sessions_revoked',
      'role_changed',
      'onboarding_changed',
      'subscription_assigned',
    ].sort()
  );
  expect(
    dados.events.every(
      (e) =>
        e.actorEmail === admin.email &&
        Number.isFinite(Date.parse(e.createdAt)) &&
        e.label.length > 5
    )
  ).toBe(true);
  expect(
    dados.events.find((e) => e.action === 'subscription_assigned')
  ).toMatchObject({ source: 'assinaturas', reason: 'meta' });
  expect(dados.nextCursor).toBeNull();
  expect(JSON.stringify(dados)).not.toContain('password');
});

it('pagina sem repetir nem perder registros mesmo quando entra um evento mais recente', async () => {
  const admin = await criarUsuario('admin');
  const pessoa = await criarUsuario();
  for (let i = 0; i < 41; i++) {
    if (i % 2 === 0)
      await encerrarSessoes(admin.id, pessoa.id, randomUUID(), 'suporte');
    else
      await assignPlanToUserByAdmin({
        targetUserId: pessoa.id,
        actorUserId: admin.id,
        planKey: 'meta',
      });
  }
  const primeira = await listarEventosDoUsuario(pessoa.id);
  expect(primeira.events).toHaveLength(20);
  expect(primeira.nextCursor).toBeTruthy();
  // Garante evento posterior à precisão DATETIME (segundos), sem alterar datas gravadas.
  await new Promise((resolve) => setTimeout(resolve, 1100));
  await encerrarSessoes(
    admin.id,
    pessoa.id,
    randomUUID(),
    'suspeita_de_acesso'
  );
  const segunda = await listarEventosDoUsuario(pessoa.id, primeira.nextCursor!);
  const terceira = await listarEventosDoUsuario(pessoa.id, segunda.nextCursor!);
  expect(segunda.events).toHaveLength(20);
  expect(terceira.events).toHaveLength(1);
  expect(terceira.nextCursor).toBeNull();
  const keys = [...primeira.events, ...segunda.events, ...terceira.events].map(
    (e) => e.key
  );
  expect(new Set(keys).size).toBe(41);
  expect((await listarEventosDoUsuario(pessoa.id)).events[0].reason).toBe(
    'suspeita_de_acesso'
  );
});

it('isola contas e recusa anônimo, paciente, administrador bloqueado, identificadores e cursores inválidos', async () => {
  const admin = await criarUsuario('admin');
  const pessoa = await criarUsuario();
  const outra = await criarUsuario();
  await encerrarSessoes(admin.id, outra.id, randomUUID(), 'suporte');
  const chamada = { params: { userId: pessoa.id } };
  expect((await chamar(GET, { ...chamada, usuario: null })).status).toBe(401);
  expect((await chamar(GET, { ...chamada, usuario: pessoa })).status).toBe(403);
  expect((await chamar(GET, { ...chamada, usuario: admin })).json).toEqual({
    events: [],
    nextCursor: null,
  });
  expect(
    (await chamar(GET, { params: { userId: randomUUID() }, usuario: admin }))
      .status
  ).toBe(404);
  expect(
    (
      await chamar(GET, {
        ...chamada,
        usuario: admin,
        path: '/api/teste?cursor=errado',
      })
    ).status
  ).toBe(400);
  expect(
    (await chamar(GET, { params: { userId: 'invalido' }, usuario: admin }))
      .status
  ).toBe(400);
  await definirBloqueio((await criarUsuario('admin')).id, admin.id, true);
  expect((await chamar(GET, { ...chamada, usuario: admin })).status).toBe(401);
});

it('preserva o histórico quando o autor é excluído, sem fabricar sua identidade', async () => {
  const admin = await criarUsuario('admin');
  const pessoa = await criarUsuario();
  await encerrarSessoes(admin.id, pessoa.id, randomUUID(), 'suporte');
  await executeStatement('DELETE FROM users WHERE id = ?', [admin.id]);
  const dados = await listarEventosDoUsuario(pessoa.id);
  expect(dados.events).toHaveLength(1);
  expect(dados.events[0].actorEmail).toBeNull();
});

it('rebaixamento de papel considera somente administradores ativos e audita somente mudança efetiva', async () => {
  const admin = await criarUsuario('admin');
  const reserva = await criarUsuario('admin');
  await definirBloqueio(admin.id, reserva.id, true);
  const outros = await queryRows<{ id: string }>(
    "SELECT id FROM profiles WHERE role='admin' AND id NOT IN (?, ?)",
    [admin.id, reserva.id]
  );
  await executeStatement(
    "UPDATE profiles SET role='patient' WHERE role='admin' AND id NOT IN (?, ?)",
    [admin.id, reserva.id]
  );
  const opcoes = {
    table: 'profiles',
    session: admin.session,
    filters: [{ type: 'eq' as const, column: 'id', value: admin.id }],
    values: { role: 'patient' },
  };
  try {
    await expect(runUpdateQuery(opcoes)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect((await listarEventosDoUsuario(admin.id)).events).toHaveLength(0);
    await definirBloqueio(admin.id, reserva.id, false);
    await runUpdateQuery(opcoes);
    expect((await listarEventosDoUsuario(admin.id)).events).toMatchObject([
      { action: 'role_changed', reason: 'patient' },
    ]);
  } finally {
    for (const pessoa of outros)
      await executeStatement("UPDATE profiles SET role='admin' WHERE id=?", [
        pessoa.id,
      ]);
  }
});
