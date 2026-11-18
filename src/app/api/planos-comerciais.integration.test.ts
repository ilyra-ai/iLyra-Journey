import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import Layout from '@/app/planos/layout';
import { POST as checkout } from '@/app/api/billing/checkout/route';
import { GET as catalogo } from '@/app/api/public/plans/route';
import { executeStatement, queryRows } from '@/lib/mysql/pool';
import { assignPlanToUserByAdmin } from '@/lib/plans/service';
import {
  criarUsuario,
  type UsuarioDeTeste,
  reativarPlanoNoTeste,
} from '../../../tests/integration/fixtures';
import { chamar, entrarComo } from '../../../tests/integration/http';

describe('jornada comercial dos próprios planos', () => {
  let pessoa: UsuarioDeTeste, gestora: UsuarioDeTeste;
  beforeAll(async () => {
    pessoa = await criarUsuario();
    gestora = await criarUsuario('admin');
  });
  afterAll(async () => {
    await entrarComo(null);
    for (const u of [pessoa, gestora])
      if (u) await executeStatement('DELETE FROM users WHERE id = ?', [u.id]);
  });
  it('exige autenticação e encaminha administradores para a gestão', async () => {
    await entrarComo(null);
    await expect(Layout({ children: 'conteúdo' })).rejects.toMatchObject({
      digest: expect.stringContaining('/login'),
    });
    await entrarComo(gestora);
    await expect(Layout({ children: 'conteúdo' })).rejects.toMatchObject({
      digest: expect.stringContaining('/admin/plans'),
    });
    await entrarComo(pessoa);
    expect(await Layout({ children: 'conteúdo' })).toBe('conteúdo');
  });
  it('recusa contratação por administrador e requisições anônimas no servidor', async () => {
    const body = { planKey: 'meta', billingInterval: 'monthly' };
    expect(
      (await chamar(checkout, { method: 'POST', body, usuario: null })).status
    ).toBe(401);
    expect(
      (await chamar(checkout, { method: 'POST', body, usuario: gestora }))
        .status
    ).toBe(403);
    expect(
      (
        await chamar(checkout, {
          method: 'POST',
          body: { ...body, planKey: 'admin' },
          usuario: pessoa,
        })
      ).status
    ).toBe(400);
  });
  it.each(['is_public', 'is_active'] as const)(
    'um plano sem %s não pode ser contratado por chamada direta',
    async (campo) => {
      const [original] = await queryRows<{
        is_public: number;
        is_active: number;
      }>(
        "SELECT is_public,is_active FROM subscription_plans WHERE plan_key='meta'"
      );
      await executeStatement(
        `UPDATE subscription_plans SET ${campo}=FALSE WHERE plan_key='meta'`
      );
      try {
        const lista = await chamar(catalogo, { usuario: pessoa });
        expect(
          (lista.json as { plans: { key: string }[] }).plans.some(
            (p) => p.key === 'meta'
          )
        ).toBe(false);
        expect(
          (
            await chamar(checkout, {
              method: 'POST',
              body: { planKey: 'meta', billingInterval: 'monthly' },
              usuario: pessoa,
            })
          ).status
        ).toBe(404);
      } finally {
        await executeStatement(
          "UPDATE subscription_plans SET is_public=?,is_active=? WHERE plan_key='meta'",
          [original.is_public, original.is_active]
        );
      }
    }
  );
  it('recusa reduzir plano pelo checkout de upgrade, sem alterar a assinatura', async () => {
    // A regra continua no código; o Meta é reativado só para exercitá-la.
    const restaurarMeta = await reativarPlanoNoTeste('meta');
    try {
      await assignPlanToUserByAdmin({
        targetUserId: pessoa.id,
        actorUserId: gestora.id,
        planKey: 'care',
      });
      expect(
        (
          await chamar(checkout, {
            method: 'POST',
            body: { planKey: 'meta', billingInterval: 'monthly' },
            usuario: pessoa,
          })
        ).status
      ).toBe(400);
      const [atual] = await queryRows<{ plan_key: string }>(
        "SELECT p.plan_key FROM user_subscriptions s JOIN subscription_plans p ON p.id=s.plan_id WHERE s.user_id=? AND s.status='active'",
        [pessoa.id]
      );
      expect(atual.plan_key).toBe('care');
    } finally {
      await restaurarMeta();
    }
  });
});
