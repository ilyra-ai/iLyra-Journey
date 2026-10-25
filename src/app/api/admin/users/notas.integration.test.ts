import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { GET, POST } from './[userId]/notas/route';
import { PATCH, DELETE } from './[userId]/notas/[noteId]/route';
import { criarUsuario } from '../../../../../tests/integration/fixtures';
import { chamar } from '../../../../../tests/integration/http';
import {
  criarNota,
  atualizarNota,
  excluirNota,
} from '@/lib/admin/notas-usuarios';
import { listarEventosDoUsuario } from '@/lib/admin/eventos-usuarios';
import { executeStatement, queryRows } from '@/lib/mysql/pool';
import { exportarDadosDoTitular, excluirConta } from '@/lib/lgpd/conta';

it('CRUD real por dois administradores registra autoria e eventos sem copiar o conteúdo', async () => {
  const admin = await criarUsuario('admin');
  const outro = await criarUsuario('admin');
  const pessoa = await criarUsuario();
  const id = randomUUID();
  const criada = await chamar(POST, {
    method: 'POST',
    params: { userId: pessoa.id },
    usuario: admin,
    body: { id, body: '  Retorno de suporte agendado.  ' },
  });
  expect(criada.status).toBe(201);
  expect(criada.headers.get('cache-control')).toBe('no-store');
  expect(criada.json).toMatchObject({
    note: {
      id,
      body: 'Retorno de suporte agendado.',
      version: 1,
      authorEmail: admin.email,
      editorEmail: admin.email,
    },
  });
  const lista = await chamar(GET, {
    params: { userId: pessoa.id },
    usuario: admin,
  });
  expect(lista.headers.get('cache-control')).toBe('no-store');
  expect(lista.json).toMatchObject({ notes: [{ id }] });
  const igual = await atualizarNota(
    outro.id,
    pessoa.id,
    id,
    'Retorno de suporte agendado.',
    1
  );
  expect(igual.note.version).toBe(1);
  const editada = await chamar(PATCH, {
    method: 'PATCH',
    params: { userId: pessoa.id, noteId: id },
    usuario: outro,
    body: { body: 'Atendimento concluído.', version: 1 },
  });
  expect(editada.status).toBe(200);
  expect(editada.json).toMatchObject({
    note: { version: 2, authorEmail: admin.email, editorEmail: outro.email },
  });
  expect(
    (
      await chamar(PATCH, {
        method: 'PATCH',
        params: { userId: pessoa.id, noteId: id },
        usuario: admin,
        body: { body: 'Edição antiga', version: 1 },
      })
    ).status
  ).toBe(409);
  expect(
    (
      await chamar(DELETE, {
        method: 'DELETE',
        params: { userId: pessoa.id, noteId: id },
        usuario: admin,
        body: { version: 1 },
      })
    ).status
  ).toBe(409);
  expect(
    (
      await chamar(DELETE, {
        method: 'DELETE',
        params: { userId: pessoa.id, noteId: id },
        usuario: admin,
        body: { version: 2 },
      })
    ).status
  ).toBe(200);
  expect(
    (await chamar(GET, { params: { userId: pessoa.id }, usuario: admin })).json
  ).toEqual({ notes: [] });
  const eventos = await listarEventosDoUsuario(pessoa.id);
  expect(eventos.events.map((e) => e.action).sort()).toEqual(
    ['note_created', 'note_updated', 'note_deleted'].sort()
  );
  expect(JSON.stringify(eventos)).not.toContain('Atendimento concluído.');
  expect(JSON.stringify(eventos)).not.toContain('Retorno de suporte agendado.');
});

it('criação é idempotente, não reutiliza identificador com outro conteúdo/autor e não ressuscita nota excluída', async () => {
  const admin = await criarUsuario('admin');
  const pessoa = await criarUsuario();
  const id = randomUUID();
  const respostas = await Promise.all([
    criarNota(admin.id, pessoa.id, id, 'Suporte'),
    criarNota(admin.id, pessoa.id, id, 'Suporte'),
  ]);
  expect(respostas.filter((r) => r.repeated)).toHaveLength(1);
  expect(
    await queryRows('SELECT id FROM admin_user_notes WHERE user_id = ?', [
      pessoa.id,
    ])
  ).toHaveLength(1);
  await expect(
    criarNota(admin.id, pessoa.id, id, 'Outro conteúdo')
  ).rejects.toMatchObject({ statusCode: 409 });
  await expect(
    criarNota((await criarUsuario('admin')).id, pessoa.id, id, 'Suporte')
  ).rejects.toMatchObject({ statusCode: 409 });
  await excluirNota(admin.id, pessoa.id, id, 1);
  await expect(
    criarNota(admin.id, pessoa.id, id, 'Suporte')
  ).rejects.toMatchObject({ statusCode: 409 });
  expect(
    await queryRows('SELECT id FROM admin_user_notes WHERE user_id = ?', [
      pessoa.id,
    ])
  ).toHaveLength(0);
});

it('recusa acesso comum, anônimo, campos inválidos, alvo inexistente e acesso cruzado por identificador', async () => {
  const admin = await criarUsuario('admin');
  const pessoa = await criarUsuario();
  const outra = await criarUsuario();
  const id = randomUUID();
  const nota = await criarNota(admin.id, pessoa.id, id, 'Texto operacional');
  for (const [usuario, status] of [
    [null, 401],
    [pessoa, 403],
  ] as const) {
    expect(
      (await chamar(GET, { params: { userId: pessoa.id }, usuario })).status
    ).toBe(status);
    expect(
      (
        await chamar(POST, {
          method: 'POST',
          params: { userId: pessoa.id },
          usuario,
          body: { id: randomUUID(), body: 'Nova' },
        })
      ).status
    ).toBe(status);
    expect(
      (
        await chamar(PATCH, {
          method: 'PATCH',
          params: { userId: pessoa.id, noteId: id },
          usuario,
          body: { body: 'Edição', version: 1 },
        })
      ).status
    ).toBe(status);
    expect(
      (
        await chamar(DELETE, {
          method: 'DELETE',
          params: { userId: pessoa.id, noteId: id },
          usuario,
          body: { version: 1 },
        })
      ).status
    ).toBe(status);
  }
  for (const body of ['', ' '.repeat(10), 'a'.repeat(2001)])
    expect(
      (
        await chamar(POST, {
          method: 'POST',
          params: { userId: pessoa.id },
          usuario: admin,
          body: { id: randomUUID(), body },
        })
      ).status
    ).toBe(400);
  expect(
    (
      await chamar(POST, {
        method: 'POST',
        params: { userId: pessoa.id },
        usuario: admin,
        body: { id: randomUUID(), body: 'Texto', role: 'admin' },
      })
    ).status
  ).toBe(400);
  expect(
    (await chamar(GET, { params: { userId: randomUUID() }, usuario: admin }))
      .status
  ).toBe(404);
  expect(
    (
      await chamar(PATCH, {
        method: 'PATCH',
        params: { userId: outra.id, noteId: id },
        usuario: admin,
        body: { body: 'Edição', version: nota.note.version },
      })
    ).status
  ).toBe(404);
  expect(
    (
      await chamar(DELETE, {
        method: 'DELETE',
        params: { userId: outra.id, noteId: id },
        usuario: admin,
        body: { version: 1 },
      })
    ).status
  ).toBe(404);
  expect(
    (await chamar(GET, { params: { userId: outra.id }, usuario: admin })).json
  ).toEqual({ notes: [] });
  await executeStatement(
    'UPDATE users SET blocked_at=UTC_TIMESTAMP() WHERE id=?',
    [admin.id]
  );
  expect(
    (await chamar(GET, { params: { userId: pessoa.id }, usuario: admin }))
      .status
  ).toBe(401);
  await expect(
    criarNota(admin.id, pessoa.id, randomUUID(), 'Texto')
  ).rejects.toMatchObject({ statusCode: 403 });
});

it('duas edições simultâneas não sobrescrevem a versão vencedora', async () => {
  const admin = await criarUsuario('admin');
  const outro = await criarUsuario('admin');
  const pessoa = await criarUsuario();
  const id = randomUUID();
  await criarNota(admin.id, pessoa.id, id, 'Texto original');
  const resultados = await Promise.allSettled([
    atualizarNota(admin.id, pessoa.id, id, 'Primeira alteração', 1),
    atualizarNota(outro.id, pessoa.id, id, 'Segunda alteração', 1),
  ]);
  expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  expect(resultados.filter((r) => r.status === 'rejected')).toHaveLength(1);
  expect(
    (
      await queryRows('SELECT version FROM admin_user_notes WHERE id=?', [id])
    )[0]
  ).toEqual({ version: 2 });
});

it('limite de notas é preservado diante de criações concorrentes', async () => {
  const admin = await criarUsuario('admin');
  const pessoa = await criarUsuario();
  for (let i = 0; i < 99; i++)
    await executeStatement(
      'INSERT INTO admin_user_notes (id,user_id,body) VALUES (?,?,?)',
      [randomUUID(), pessoa.id, 'Nota operacional de teste']
    );
  const resultados = await Promise.allSettled([
    criarNota(admin.id, pessoa.id, randomUUID(), 'Nova nota A'),
    criarNota(admin.id, pessoa.id, randomUUID(), 'Nova nota B'),
  ]);
  expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  expect(resultados.filter((r) => r.status === 'rejected')).toHaveLength(1);
  expect(
    (
      await queryRows(
        'SELECT COUNT(*) AS total FROM admin_user_notes WHERE user_id=?',
        [pessoa.id]
      )
    )[0]
  ).toEqual({ total: 100 });
});

it('notas são exportadas somente ao titular, preservadas sem autor excluído e apagadas com a conta', async () => {
  const admin = await criarUsuario('admin');
  const pessoa = await criarUsuario();
  const outra = await criarUsuario();
  const id = randomUUID();
  await criarNota(admin.id, pessoa.id, id, '<script>texto literal</script>');
  await criarNota(admin.id, outra.id, randomUUID(), 'Outra conta');
  const exportacao = await exportarDadosDoTitular(pessoa.id);
  expect(exportacao.notas_operacionais).toHaveLength(1);
  expect(exportacao.notas_operacionais[0]).toMatchObject({
    body: '<script>texto literal</script>',
    version: 1,
  });
  expect(exportacao.notas_operacionais[0]).not.toHaveProperty('author_id');
  await executeStatement('DELETE FROM users WHERE id=?', [admin.id]);
  expect(
    (
      await queryRows(
        'SELECT author_id,editor_id FROM admin_user_notes WHERE id=?',
        [id]
      )
    )[0]
  ).toEqual({ author_id: null, editor_id: null });
  await excluirConta(pessoa.id);
  expect(
    await queryRows('SELECT id FROM admin_user_notes WHERE user_id=?', [
      pessoa.id,
    ])
  ).toHaveLength(0);
  expect(
    await queryRows('SELECT id FROM admin_user_events WHERE user_id=?', [
      pessoa.id,
    ])
  ).toHaveLength(0);
  expect(
    await queryRows('SELECT id FROM admin_user_notes WHERE user_id=?', [
      outra.id,
    ])
  ).toHaveLength(1);
});
