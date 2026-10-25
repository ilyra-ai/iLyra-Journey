import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { GET, POST } from '../marcadores/route';
import { PATCH, DELETE } from '../marcadores/[markerId]/route';
import { GET as conta } from './[userId]/marcadores/route';
import { PUT } from './[userId]/marcadores/[markerId]/route';
import { criarUsuario } from '../../../../../tests/integration/fixtures';
import { chamar } from '../../../../../tests/integration/http';
import {
  atribuirMarcador,
  criarMarcador,
  editarMarcador,
  excluirMarcador,
  listarMarcadores,
} from '@/lib/admin/marcadores-usuarios';
import { queryRows, executeStatement } from '@/lib/mysql/pool';
import { listarEventosDoUsuario } from '@/lib/admin/eventos-usuarios';
import { exportarDadosDoTitular, excluirConta } from '@/lib/lgpd/conta';

it('CRUD do catálogo, atribuição por conta e exclusão auditada sem ressuscitar identificadores', async () => {
  const admin = await criarUsuario('admin'),
    pessoa = await criarUsuario(),
    outra = await criarUsuario();
  const id = randomUUID();
  const name = `Suporte ${id.slice(0, 8)}`;
  const nova = await chamar(POST, {
    method: 'POST',
    usuario: admin,
    body: { id, name: `  ${name}  `, color: 'azul' },
  });
  expect(nova.status).toBe(201);
  expect(
    (
      await chamar(POST, {
        method: 'POST',
        usuario: admin,
        body: { id, name, color: 'azul' },
      })
    ).json
  ).toEqual({ id, repeated: true });
  expect(
    (
      await chamar(PUT, {
        method: 'PUT',
        usuario: admin,
        params: { userId: pessoa.id, markerId: id },
        body: { assigned: true },
      })
    ).json
  ).toEqual({ assigned: true, repeated: false });
  expect(
    (
      await chamar(PUT, {
        method: 'PUT',
        usuario: admin,
        params: { userId: pessoa.id, markerId: id },
        body: { assigned: true },
      })
    ).json
  ).toEqual({ assigned: true, repeated: true });
  const lista = await chamar(conta, {
    usuario: admin,
    params: { userId: pessoa.id },
  });
  expect(lista.headers.get('cache-control')).toBe('no-store');
  expect(lista.json).toMatchObject({
    markers: expect.arrayContaining([
      expect.objectContaining({ id, assigned: true, userCount: 1 }),
    ]),
  });
  expect(
    (await listarMarcadores(outra.id)).markers.find((m) => m.id === id)
      ?.assigned
  ).toBe(false);
  expect(
    (
      await chamar(PATCH, {
        method: 'PATCH',
        usuario: admin,
        params: { markerId: id },
        body: { name: `Retorno ${id.slice(0, 8)}`, color: 'verde', version: 1 },
      })
    ).status
  ).toBe(200);
  expect(
    (await listarMarcadores(pessoa.id)).markers.find((m) => m.id === id)
  ).toMatchObject({ version: 2, color: 'verde', assigned: true });
  expect(
    (
      await chamar(PATCH, {
        method: 'PATCH',
        usuario: admin,
        params: { markerId: id },
        body: { name, color: 'azul', version: 1 },
      })
    ).status
  ).toBe(409);
  expect(
    (
      await chamar(DELETE, {
        method: 'DELETE',
        usuario: admin,
        params: { markerId: id },
        body: { version: 2, expectedUsers: 0 },
      })
    ).status
  ).toBe(409);
  expect(
    (
      await chamar(DELETE, {
        method: 'DELETE',
        usuario: admin,
        params: { markerId: id },
        body: { version: 2, expectedUsers: 1 },
      })
    ).json
  ).toEqual({ deleted: true, affectedUsers: 1 });
  expect((await listarMarcadores()).markers.some((m) => m.id === id)).toBe(
    false
  );
  expect(
    await queryRows(
      'SELECT user_id FROM admin_user_marker_assignments WHERE marker_id=?',
      [id]
    )
  ).toHaveLength(0);
  expect(
    (
      await queryRows(
        'SELECT name,created_by FROM admin_user_markers WHERE id=?',
        [id]
      )
    )[0]
  ).toEqual({ name: '', created_by: null });
  await expect(criarMarcador(admin.id, id, name, 'azul')).rejects.toMatchObject(
    { statusCode: 409 }
  );
  await criarMarcador(admin.id, randomUUID(), name, 'azul');
  expect(
    (await listarEventosDoUsuario(pessoa.id)).events.map((e) => e.action).sort()
  ).toEqual(['marker_assigned', 'marker_removed'].sort());
});

it('recusa anônimo, paciente, administrador bloqueado, cor/corpo inválidos e recursos inexistentes', async () => {
  const admin = await criarUsuario('admin'),
    pessoa = await criarUsuario();
  const id = randomUUID();
  await criarMarcador(admin.id, id, `QA-${id.slice(0, 8)}`, 'neutro');
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
          body: { id: randomUUID(), name: 'Teste', color: 'azul' },
        })
      ).status
    ).toBe(status);
    expect(
      (await chamar(conta, { usuario, params: { userId: pessoa.id } })).status
    ).toBe(status);
    expect(
      (
        await chamar(PATCH, {
          method: 'PATCH',
          usuario,
          params: { markerId: id },
          body: { name: 'Outro', color: 'verde', version: 1 },
        })
      ).status
    ).toBe(status);
    expect(
      (
        await chamar(DELETE, {
          method: 'DELETE',
          usuario,
          params: { markerId: id },
          body: { version: 1, expectedUsers: 0 },
        })
      ).status
    ).toBe(status);
    expect(
      (
        await chamar(PUT, {
          method: 'PUT',
          usuario,
          params: { userId: pessoa.id, markerId: id },
          body: { assigned: true },
        })
      ).status
    ).toBe(status);
  }
  for (const body of [
    { id: randomUUID(), name: 'Teste', color: 'url(javascript:x)' },
    { id: randomUUID(), name: ' '.repeat(10), color: 'azul' },
    { id: randomUUID(), name: 'x'.repeat(41), color: 'azul' },
    { id: randomUUID(), name: 'Teste', color: 'azul', role: 'admin' },
  ])
    expect(
      (await chamar(POST, { method: 'POST', usuario: admin, body })).status
    ).toBe(400);
  expect(
    (await chamar(conta, { usuario: admin, params: { userId: randomUUID() } }))
      .status
  ).toBe(404);
  expect(
    (
      await chamar(PUT, {
        method: 'PUT',
        usuario: admin,
        params: { userId: pessoa.id, markerId: randomUUID() },
        body: { assigned: true },
      })
    ).status
  ).toBe(404);
  expect(
    (
      await chamar(DELETE, {
        method: 'DELETE',
        usuario: admin,
        params: { markerId: id },
        body: { version: 1 },
      })
    ).status
  ).toBe(400);
  await executeStatement(
    'UPDATE users SET blocked_at=UTC_TIMESTAMP() WHERE id=?',
    [admin.id]
  );
  expect((await chamar(GET, { usuario: admin })).status).toBe(401);
  await expect(
    atribuirMarcador(admin.id, pessoa.id, id, true)
  ).rejects.toMatchObject({ statusCode: 403 });
});

it('edições concorrentes respeitam versão e nomes ativos são únicos', async () => {
  const admin = await criarUsuario('admin'),
    outro = await criarUsuario('admin');
  const id = randomUUID();
  const name = `Editar-${id.slice(0, 8)}`;
  await criarMarcador(admin.id, id, name, 'neutro');
  const resultados = await Promise.allSettled([
    editarMarcador(admin.id, id, name + ' A', 'azul', 1),
    editarMarcador(outro.id, id, name + ' B', 'verde', 1),
  ]);
  expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  expect(resultados.filter((r) => r.status === 'rejected')).toHaveLength(1);
  const atual = (await listarMarcadores()).markers.find((m) => m.id === id)!;
  expect(atual.version).toBe(2);
  expect(
    (
      await chamar(POST, {
        method: 'POST',
        usuario: admin,
        body: {
          id: randomUUID(),
          name: atual.name.toLowerCase(),
          color: 'azul',
        },
      })
    ).status
  ).toBe(409);
});

it('limite de dez marcadores por conta resiste a atribuições concorrentes e não impede repetição', async () => {
  const admin = await criarUsuario('admin'),
    pessoa = await criarUsuario();
  const ids = [];
  for (let i = 0; i < 11; i++) {
    const id = randomUUID();
    ids.push(id);
    await criarMarcador(admin.id, id, `Limite-${id.slice(0, 8)}`, 'neutro');
    if (i < 9) await atribuirMarcador(admin.id, pessoa.id, id, true);
  }
  const resultados = await Promise.allSettled([
    atribuirMarcador(admin.id, pessoa.id, ids[9], true),
    atribuirMarcador(admin.id, pessoa.id, ids[10], true),
  ]);
  expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  expect(resultados.filter((r) => r.status === 'rejected')).toHaveLength(1);
  expect(
    (await listarMarcadores(pessoa.id)).markers.filter((m) => m.assigned)
  ).toHaveLength(10);
  expect(
    (await atribuirMarcador(admin.id, pessoa.id, ids[0], true)).repeated
  ).toBe(true);
  await atribuirMarcador(admin.id, pessoa.id, ids[0], false);
  expect(
    (await listarMarcadores(pessoa.id)).markers.filter((m) => m.assigned)
  ).toHaveLength(9);
});

it('excluir catálogo e atribuir simultaneamente não removem contas além do impacto confirmado', async () => {
  const admin = await criarUsuario('admin'),
    pessoa = await criarUsuario(),
    outra = await criarUsuario();
  const id = randomUUID();
  await criarMarcador(admin.id, id, `Impacto-${id.slice(0, 8)}`, 'roxo');
  await atribuirMarcador(admin.id, pessoa.id, id, true);
  const [delecao, atribuicao] = await Promise.allSettled([
    excluirMarcador(admin.id, id, 1, 1),
    atribuirMarcador(admin.id, outra.id, id, true),
  ]);
  expect(
    [delecao, atribuicao].filter((r) => r.status === 'fulfilled')
  ).toHaveLength(1);
  const links = await queryRows(
    'SELECT user_id FROM admin_user_marker_assignments WHERE marker_id=?',
    [id]
  );
  if (delecao.status === 'fulfilled') {
    expect(links).toHaveLength(0);
    expect(atribuicao.status).toBe('rejected');
  } else {
    expect(links).toHaveLength(2);
    expect(atribuicao.status).toBe('fulfilled');
  }
});

it('exporta marcadores apenas do titular e exclui associações sem remover catálogo compartilhado', async () => {
  const admin = await criarUsuario('admin'),
    pessoa = await criarUsuario(),
    outra = await criarUsuario();
  const id = randomUUID();
  const name = `Operação-${id.slice(0, 8)}`;
  await criarMarcador(admin.id, id, name, 'verde');
  await atribuirMarcador(admin.id, pessoa.id, id, true);
  await atribuirMarcador(admin.id, outra.id, id, true);
  const dados = await exportarDadosDoTitular(pessoa.id);
  expect(dados.marcadores_operacionais).toHaveLength(1);
  expect(dados.marcadores_operacionais[0]).toMatchObject({
    name,
    color: 'verde',
  });
  expect(dados.marcadores_operacionais[0]).not.toHaveProperty('assigned_by');
  await executeStatement('DELETE FROM users WHERE id=?', [admin.id]);
  expect(
    (await listarMarcadores(pessoa.id)).markers.find((m) => m.id === id)
  ).toMatchObject({ assigned: true, userCount: 2 });
  await excluirConta(pessoa.id);
  expect(
    (await listarMarcadores(outra.id)).markers.find((m) => m.id === id)
  ).toMatchObject({ assigned: true, userCount: 1 });
});

it('limite global de cinquenta marcadores ativos resiste a criações concorrentes', async () => {
  const admin = await criarUsuario('admin');
  const criados: string[] = [];
  const [atual] = await queryRows<{ total: number }>(
    'SELECT COUNT(*) AS total FROM admin_user_markers WHERE deleted_at IS NULL'
  );
  const tentativas = [randomUUID(), randomUUID()];
  try {
    for (let i = Number(atual.total); i < 49; i++) {
      const id = randomUUID();
      criados.push(id);
      await executeStatement(
        'INSERT INTO admin_user_markers (id,name,color,created_by) VALUES (?,?,?,?)',
        [id, `Catálogo-${id.slice(0, 8)}`, 'neutro', admin.id]
      );
    }
    const resultados = await Promise.allSettled(
      tentativas.map((id) =>
        criarMarcador(admin.id, id, `Novo-${id.slice(0, 8)}`, 'azul')
      )
    );
    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(resultados.filter((r) => r.status === 'rejected')).toHaveLength(1);
    expect((await listarMarcadores()).markers).toHaveLength(50);
  } finally {
    for (const id of [...criados, ...tentativas])
      await executeStatement('DELETE FROM admin_user_markers WHERE id=?', [id]);
  }
});
