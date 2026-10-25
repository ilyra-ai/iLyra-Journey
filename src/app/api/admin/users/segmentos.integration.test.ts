import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { GET as users } from './route';
import { GET, POST } from './segmentos/route';
import { PATCH, DELETE } from './segmentos/[segmentId]/route';
import { criarUsuario } from '../../../../../tests/integration/fixtures';
import { chamar } from '../../../../../tests/integration/http';
import {
  filtrosUsuariosSchema,
  consultaUsuariosSchema,
} from '@/lib/admin/esquema-filtros';
import {
  salvarSegmento,
  listarSegmentos,
} from '@/lib/admin/segmentos-usuarios';
import {
  criarMarcador,
  atribuirMarcador,
  excluirMarcador,
} from '@/lib/admin/marcadores-usuarios';
import { definirBloqueio } from '@/lib/auth/bloqueio';
import { ensureUserSubscription } from '@/lib/plans/service';
import { queryRows, executeStatement } from '@/lib/mysql/pool';
import { exportarDadosDoTitular, excluirConta } from '@/lib/lgpd/conta';
const query = () => consultaUsuariosSchema.parse({ filters: {} });
it('combina filtros e mantém contagem/paginação consistentes, sem ampliar marcador removido', async () => {
  const admin = await criarUsuario('admin');
  const prefix = `Filtro-${randomUUID().slice(0, 8)}`;
  const a = await criarUsuario('patient', prefix + ' A'),
    b = await criarUsuario('patient', prefix + ' B'),
    c = await criarUsuario('admin', prefix + ' C');
  await ensureUserSubscription(a.id, 'free');
  await ensureUserSubscription(b.id, 'meta');
  await ensureUserSubscription(c.id, 'care');
  await executeStatement(
    'UPDATE profiles SET onboarding_completed=0 WHERE id=?',
    [a.id]
  );
  await definirBloqueio(admin.id, b.id, true);
  const marker = randomUUID();
  await criarMarcador(
    admin.id,
    marker,
    'Segmento-' + marker.slice(0, 8),
    'azul'
  );
  await atribuirMarcador(admin.id, b.id, marker, true);
  const call = async (params: Record<string, string>) =>
    chamar(users, {
      usuario: admin,
      path:
        '/api/admin/users?' +
        new URLSearchParams({ search: prefix, ...params }),
    });
  expect((await call({})).json).toMatchObject({ total: 3 });
  expect(
    (
      await call({
        access: 'blocked',
        role: 'patient',
        plan: 'meta',
        onboarding: 'complete',
        markerId: marker,
      })
    ).json
  ).toMatchObject({ total: 1, users: [{ id: b.id }] });
  expect(
    (await call({ access: 'active', plan: 'free', onboarding: 'pending' })).json
  ).toMatchObject({ total: 1, users: [{ id: a.id }] });
  expect((await call({ role: 'admin', pageSize: '1' })).json).toMatchObject({
    total: 1,
    users: [{ id: c.id }],
  });
  expect((await call({ pageSize: '1', page: '1' })).json).toMatchObject({
    total: 3,
    page: 1,
    users: expect.any(Array),
  });
  await excluirMarcador(admin.id, marker, 1, 1);
  expect((await call({ markerId: marker })).json).toMatchObject({
    total: 0,
    users: [],
  });
  expect((await call({ access: 'inventado' })).status).toBe(400);
  expect((await call({ role: "' OR 1=1 --" })).json).toMatchObject({
    total: 0,
  });
});
it('CRUD de segmento privado, versões, repetição e isolamento entre administradores', async () => {
  const admin = await criarUsuario('admin'),
    outro = await criarUsuario('admin');
  const id = randomUUID(),
    q = query();
  expect(
    (
      await chamar(POST, {
        method: 'POST',
        usuario: admin,
        body: { id, name: 'Meu segmento', query: q },
      })
    ).status
  ).toBe(201);
  expect(
    (
      await chamar(POST, {
        method: 'POST',
        usuario: admin,
        body: { id, name: 'Meu segmento', query: q },
      })
    ).json
  ).toMatchObject({ repeated: true });
  expect((await chamar(GET, { usuario: outro })).json).toEqual({
    segments: [],
  });
  expect(
    (
      await chamar(PATCH, {
        method: 'PATCH',
        usuario: outro,
        params: { segmentId: id },
        body: { name: 'Invasão', query: q, version: 1 },
      })
    ).status
  ).toBe(404);
  expect(
    (
      await chamar(DELETE, {
        method: 'DELETE',
        usuario: outro,
        params: { segmentId: id },
        body: { version: 1 },
      })
    ).status
  ).toBe(404);
  expect(
    (
      await chamar(PATCH, {
        method: 'PATCH',
        usuario: admin,
        params: { segmentId: id },
        body: {
          name: 'Ativos',
          query: { ...q, filters: { ...q.filters, access: 'active' } },
          version: 1,
        },
      })
    ).status
  ).toBe(200);
  expect(
    (
      await chamar(DELETE, {
        method: 'DELETE',
        usuario: admin,
        params: { segmentId: id },
        body: { version: 1 },
      })
    ).status
  ).toBe(409);
  expect(
    (
      await chamar(DELETE, {
        method: 'DELETE',
        usuario: admin,
        params: { segmentId: id },
        body: { version: 2 },
      })
    ).status
  ).toBe(200);
  expect(
    (
      await chamar(POST, {
        method: 'POST',
        usuario: admin,
        body: { id, name: 'Meu segmento', query: q },
      })
    ).status
  ).toBe(409);
});
it('recusa acesso não administrativo e campos desconhecidos, valida marcador ao salvar', async () => {
  const admin = await criarUsuario('admin'),
    pessoa = await criarUsuario();
  for (const [usuario, status] of [
    [null, 401],
    [pessoa, 403],
  ] as const) {
    expect((await chamar(GET, { usuario })).status).toBe(status);
    expect(
      (
        await chamar(POST, {
          method: 'POST',
          usuario,
          body: { id: randomUUID(), name: 'Teste', query: query() },
        })
      ).status
    ).toBe(status);
  }
  expect(
    (
      await chamar(POST, {
        method: 'POST',
        usuario: admin,
        body: {
          id: randomUUID(),
          name: 'Teste',
          query: query(),
          userId: pessoa.id,
        },
      })
    ).status
  ).toBe(400);
  expect(
    (
      await chamar(POST, {
        method: 'POST',
        usuario: admin,
        body: {
          id: randomUUID(),
          name: 'Teste',
          query: {
            ...query(),
            filters: {
              ...filtrosUsuariosSchema.parse({}),
              markerId: randomUUID(),
            },
          },
        },
      })
    ).status
  ).toBe(409);
  await executeStatement(
    'UPDATE users SET blocked_at=UTC_TIMESTAMP() WHERE id=?',
    [admin.id]
  );
  expect((await chamar(GET, { usuario: admin })).status).toBe(401);
});
it('limite concorrente e edições concorrentes não sobrescrevem segmentos', async () => {
  const admin = await criarUsuario('admin');
  const id = randomUUID();
  await salvarSegmento(admin.id, id, 'Original', query());
  const r = await Promise.allSettled([
    salvarSegmento(admin.id, id, 'A', query(), 1),
    salvarSegmento(admin.id, id, 'B', query(), 1),
  ]);
  expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
  for (let i = 1; i < 19; i++)
    await salvarSegmento(admin.id, randomUUID(), 'Segmento ' + i, query());
  const limites = await Promise.allSettled([
    salvarSegmento(admin.id, randomUUID(), 'Último A', query()),
    salvarSegmento(admin.id, randomUUID(), 'Último B', query()),
  ]);
  expect(limites.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
  expect((await listarSegmentos(admin.id)).segments).toHaveLength(20);
});
it('exporta somente segmentos próprios e remove em cascata', async () => {
  const admin = await criarUsuario('admin'),
    outro = await criarUsuario('admin');
  await salvarSegmento(admin.id, randomUUID(), 'Privado', query());
  await salvarSegmento(outro.id, randomUUID(), 'De outra conta', query());
  const dados = await exportarDadosDoTitular(admin.id);
  expect(dados.segmentos_administrativos).toHaveLength(1);
  expect(dados.segmentos_administrativos[0].name).toBe('Privado');
  await excluirConta(admin.id);
  expect(
    await queryRows('SELECT id FROM admin_user_segments WHERE user_id=?', [
      admin.id,
    ])
  ).toHaveLength(0);
  expect((await listarSegmentos(outro.id)).segments).toHaveLength(1);
});
