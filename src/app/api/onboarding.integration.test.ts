import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { POST } from './onboarding/route';
import { PATCH as atualizarPerfil } from './data/[table]/route';
import { GET as sessao } from './auth/session/route';
import { criarUsuario } from '../../../tests/integration/fixtures';
import { chamar } from '../../../tests/integration/http';
import { executeStatement, queryRows } from '@/lib/mysql/pool';
import { buscarCidades } from '@/lib/geo/cidades';
const cidade = () => buscarCidades('São Paulo')[0];
const dados = () => ({
  first_name: 'Pessoa',
  last_name: 'Teste',
  birth_date: '1990-05-15',
  birth_city_id: cidade().id,
  consent: true,
});
it('conclui atomicamente preservando objetivos, apelido e opções não respondidas', async () => {
  const pessoa = await criarUsuario();
  await executeStatement(
    "UPDATE profiles SET onboarding_completed=FALSE,goals=?,nickname='Nome anterior',gender=NULL,activity_level=NULL WHERE id=?",
    [JSON.stringify(['regulate_sleep_duration']), pessoa.id]
  );
  const r = await chamar(POST, {
    method: 'POST',
    usuario: pessoa,
    body: dados(),
  });
  expect(r.status).toBe(200);
  expect(r.headers.get('cache-control')).toBe('no-store');
  const [perfil] = await queryRows<{
    goals: unknown;
    nickname: string;
    gender: null;
    activity_level: null;
    birth_city_id: number;
    birth_timezone: string;
    onboarding_completed: number;
  }>(
    'SELECT goals,nickname,gender,activity_level,birth_city_id,birth_timezone,onboarding_completed FROM profiles WHERE id=?',
    [pessoa.id]
  );
  expect(perfil).toMatchObject({
    goals: ['regulate_sleep_duration'],
    nickname: 'Nome anterior',
    gender: null,
    activity_level: null,
    birth_city_id: cidade().id,
    birth_timezone: cidade().fuso,
    onboarding_completed: 1,
  });
  expect(
    await queryRows(
      'SELECT id FROM consent_records WHERE user_id=? AND consent_type=?',
      [pessoa.id, 'health_data_processing']
    )
  ).toHaveLength(1);
  expect((await chamar(sessao)).json).toMatchObject({
    session: { user: { onboarding_completed: true } },
  });
  expect((await chamar(POST, { method: 'POST', body: dados() })).status).toBe(
    200
  );
  expect(
    await queryRows(
      'SELECT id FROM consent_records WHERE user_id=? AND consent_type=?',
      [pessoa.id, 'health_data_processing']
    )
  ).toHaveLength(1);
});
it('valida consentimento, datas, cidade e corpo antes de marcar conclusão ou gravar consentimento', async () => {
  const pessoa = await criarUsuario();
  await executeStatement(
    'UPDATE profiles SET onboarding_completed=FALSE WHERE id=?',
    [pessoa.id]
  );
  for (const body of [
    { ...dados(), consent: false },
    { ...dados(), birth_date: '2020-01-01' },
    { ...dados(), birth_date: '1990-02-31' },
    { ...dados(), goals: [] },
    { ...dados(), user_id: randomUUID() },
  ])
    expect(
      (await chamar(POST, { method: 'POST', usuario: pessoa, body })).status
    ).toBe(400);
  expect(
    (
      await chamar(POST, {
        method: 'POST',
        usuario: pessoa,
        body: { ...dados(), birth_city_id: 999999999 },
      })
    ).status
  ).toBe(404);
  expect(
    (
      await queryRows('SELECT onboarding_completed FROM profiles WHERE id=?', [
        pessoa.id,
      ])
    )[0]
  ).toEqual({ onboarding_completed: 0 });
  expect(
    await queryRows('SELECT id FROM consent_records WHERE user_id=?', [
      pessoa.id,
    ])
  ).toHaveLength(0);
});
it('impede conclusão direta incompleta pela API genérica, mas preserva edição de perfis concluídos', async () => {
  const pessoa = await criarUsuario();
  await executeStatement(
    'UPDATE profiles SET onboarding_completed=FALSE WHERE id=?',
    [pessoa.id]
  );
  const request = {
    method: 'PATCH',
    usuario: pessoa,
    params: { table: 'profiles' },
    body: {
      values: { onboarding_completed: true },
      filters: [{ type: 'eq', column: 'id', value: pessoa.id }],
    },
  };
  expect((await chamar(atualizarPerfil, request)).status).toBe(409);
  expect(
    (await chamar(POST, { method: 'POST', usuario: pessoa, body: dados() }))
      .status
  ).toBe(200);
  expect((await chamar(atualizarPerfil, request)).status).toBe(200);
});
it('grava somente opções explícitas e usa coordenadas do servidor, sem alterar outra conta', async () => {
  const pessoa = await criarUsuario(),
    outra = await criarUsuario();
  const r = await chamar(POST, {
    method: 'POST',
    usuario: pessoa,
    body: {
      ...dados(),
      nickname: 'Apelido novo',
      gender: 'prefer_not-to-say',
      activity_level: 2,
      birth_time: '14:30',
      residence_city_id: cidade().id,
    },
  });
  expect(r.status).toBe(200);
  expect(
    (
      await queryRows(
        'SELECT nickname,gender,activity_level,birth_time,birth_latitude,residence_city_id FROM profiles WHERE id=?',
        [pessoa.id]
      )
    )[0]
  ).toMatchObject({
    nickname: 'Apelido novo',
    gender: 'prefer_not-to-say',
    activity_level: 2,
    birth_time: '14:30:00',
    birth_latitude: cidade().latitude,
    residence_city_id: cidade().id,
  });
  expect(
    (
      await queryRows('SELECT birth_city_id FROM profiles WHERE id=?', [
        outra.id,
      ])
    )[0]
  ).toEqual({ birth_city_id: null });
  expect(
    (await chamar(POST, { method: 'POST', usuario: null, body: dados() }))
      .status
  ).toBe(401);
});

it('limita gravações repetidas sem bloquear a leitura da própria sessão', async () => {
  const pessoa = await criarUsuario();
  for (let i = 0; i < 20; i++)
    expect(
      (await chamar(POST, { method: 'POST', usuario: pessoa, body: dados() }))
        .status
    ).toBe(200);
  const limitada = await chamar(POST, {
    method: 'POST',
    usuario: pessoa,
    body: dados(),
  });
  expect(limitada.status).toBe(429);
  expect(Number(limitada.headers.get('retry-after'))).toBeGreaterThan(0);
  expect((await chamar(sessao)).status).toBe(200);
});
