import { expect, it } from 'vitest';
import { criarUsuario } from '../../../tests/integration/fixtures';
import { queryRows, executeStatement } from '@/lib/mysql/pool';
import {
  assignPlanToUserByAdmin,
  getPlanMatrix,
  getAccountSubscriptionSummary,
  updatePlanMatrixByKey,
} from './service';
import {
  getPublicPlanCatalog,
  createStripeCheckoutUrl,
} from '@/lib/billing/service';

it('somente a conta designada recebe Administrador; atribuição não promove papel', async () => {
  const [designada] = await queryRows<{ id: string }>(
    "SELECT id FROM users WHERE email = 'admin@lyra.local'"
  );
  expect(designada).toBeTruthy();
  const plano = await getAccountSubscriptionSummary(designada.id, 'admin');
  expect(plano.plan.key).toBe('admin');
  expect(plano.features.every((f) => f.enabled && f.quotaValue === null)).toBe(
    true
  );
  const pessoa = await criarUsuario();
  const gestora = await criarUsuario('admin');
  for (const alvo of [pessoa, gestora])
    await expect(
      assignPlanToUserByAdmin({
        targetUserId: alvo.id,
        actorUserId: designada.id,
        planKey: 'admin',
      })
    ).rejects.toMatchObject({ statusCode: 403 });
  expect(
    (
      await queryRows<{ role: string }>(
        'SELECT role FROM profiles WHERE id = ?',
        [pessoa.id]
      )
    )[0].role
  ).toBe('patient');
});
it('plano privado não aparece no catálogo mesmo se um registro antigo estiver público, nem usa checkout', async () => {
  const [plano] = await queryRows<{ id: string }>(
    "SELECT id FROM subscription_plans WHERE plan_key = 'admin'"
  );
  await executeStatement(
    'UPDATE subscription_plans SET is_public = TRUE WHERE id = ?',
    [plano.id]
  );
  try {
    expect((await getPublicPlanCatalog()).some((p) => p.key === 'admin')).toBe(
      false
    );
  } finally {
    await executeStatement(
      'UPDATE subscription_plans SET is_public = FALSE WHERE id = ?',
      [plano.id]
    );
  }
  const pessoa = await criarUsuario();
  await expect(
    createStripeCheckoutUrl({
      session: pessoa.session,
      planKey: 'admin',
      billingInterval: 'monthly',
    })
  ).rejects.toMatchObject({ statusCode: 403 });
});
it('matriz inclui quatro planos e não permite transformar o Administrador em produto comercial', async () => {
  const matriz = await getPlanMatrix();
  expect(matriz.plans.map((p) => p.key)).toEqual([
    'free',
    'meta',
    'care',
    'admin',
  ]);
  const plano = matriz.plans.find((p) => p.key === 'admin')!;
  expect(plano.isPublic).toBe(false);
  expect(plano.assinaturaOnline).toBe(false);
  await expect(
    updatePlanMatrixByKey('admin', {
      ...plano,
      isPublic: true,
      features: plano.features,
    })
  ).rejects.toMatchObject({ statusCode: 403 });
});
