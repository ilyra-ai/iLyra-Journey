import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { POST } from './route';
import { POST as registrar } from '../../auth/register/route';
import { criarUsuario } from '../../../../../tests/integration/fixtures';
import { chamar } from '../../../../../tests/integration/http';
import { queryRows } from '@/lib/mysql/pool';

it('cadastros público e administrativo concedem um único Free sem conceder papel administrativo', async () => {
  const admin = await criarUsuario('admin');
  const identificador = randomUUID();
  const corpo = {
    firstName: 'Nova',
    lastName: 'Conta',
    email: `nova-${identificador}@teste.lyra.local`,
    password: randomUUID(),
  };
  const negada = await chamar(POST, {
    method: 'POST',
    body: corpo,
    usuario: await criarUsuario(),
  });
  expect(negada.status).toBe(403);
  const criada = await chamar(POST, {
    method: 'POST',
    body: corpo,
    usuario: admin,
  });
  expect(criada.status).toBe(201);
  expect(criada.json).toMatchObject({ planKey: 'care' });
  const publica = await chamar(registrar, {
    method: 'POST',
    body: {
      ...corpo,
      email: `publica-${identificador}@teste.lyra.local`,
      acceptTerms: true,
    },
    usuario: null,
  });
  expect(publica.status).toBe(200);
  for (const email of [
    corpo.email,
    `publica-${identificador}@teste.lyra.local`,
  ]) {
    const linhas = await queryRows<{ plan_key: string; role: string }>(
      `SELECT s.plan_key, p.role FROM users u JOIN profiles p ON p.id = u.id JOIN user_subscriptions a ON a.user_id = u.id JOIN subscription_plans s ON s.id = a.plan_id WHERE u.email = ? AND a.status = 'active'`,
      [email]
    );
    expect(linhas).toEqual([{ plan_key: 'care', role: 'patient' }]);
  }
  const repetida = await chamar(POST, {
    method: 'POST',
    body: corpo,
    usuario: admin,
  });
  expect(repetida.status).toBe(409);
});
