import { expect, it } from 'vitest';
import { GET } from './plans/route';
import { PATCH } from '../admin/plans/[planKey]/route';
import { criarUsuario } from '../../../../tests/integration/fixtures';
import { chamar } from '../../../../tests/integration/http';
import { getPlanMatrix, updatePlanMatrixByKey } from '@/lib/plans/service';
import { executeStatement } from '@/lib/mysql/pool';
import { beneficiosPublicos } from '@/lib/plans/beneficios-publicos';
import type { PlanMatrixResponse } from '@/types/subscription';

it('publica alterações reais dos três planos comerciais com limites, zero e desabilitação; protege Administrador', async () => {
  const admin = await criarUsuario('admin');
  const original = await getPlanMatrix();
  try {
    for (const plan of original.plans.filter((p) => p.key !== 'admin')) {
      const features = plan.features.map((f) => ({
        key: f.key,
        enabled: f.enabled,
        quotaValue: f.quotaValue,
        resetInterval: f.resetInterval,
      }));
      const chat = features.find((f) => f.key === 'ai_chat_messages')!;
      chat.enabled = true;
      chat.quotaValue = 7;
      chat.resetInterval = 'monthly';
      features.find((f) => f.key === 'professionals_total')!.quotaValue = 0;
      features.find((f) => f.key === 'dashboard_access')!.enabled = false;
      expect(
        (
          await chamar(PATCH, {
            method: 'PATCH',
            usuario: admin,
            params: { planKey: plan.key },
            body: { ...plan, features },
          })
        ).status
      ).toBe(200);
      const response = await chamar(GET, { usuario: null });
      expect(response.headers.get('cache-control')).toBe('no-store');
      const publicPlan = (response.json as PlanMatrixResponse).plans.find(
        (p) => p.key === plan.key
      )!;
      const beneficios = beneficiosPublicos(publicPlan.features);
      expect(
        beneficios.find((b) => b.key === 'ai_chat_messages')?.label
      ).toContain('7');
      expect(
        beneficios.find((b) => b.key === 'ai_chat_messages')?.label
      ).toContain('por mês');
      expect(
        beneficios.some(
          (b) => b.key === 'professionals_total' || b.key === 'dashboard_access'
        )
      ).toBe(false);
      chat.quotaValue = null;
      await updatePlanMatrixByKey(plan.key, { ...plan, features });
      const atualizado = (await chamar(GET, { usuario: null }))
        .json as PlanMatrixResponse;
      expect(
        beneficiosPublicos(
          atualizado.plans.find((p) => p.key === plan.key)!.features
        ).find((b) => b.key === 'ai_chat_messages')?.label
      ).toContain('sem limite');
      chat.quotaValue = 1;
      await updatePlanMatrixByKey(plan.key, { ...plan, features });
      const singular = (await chamar(GET, { usuario: null }))
        .json as PlanMatrixResponse;
      expect(
        beneficiosPublicos(
          singular.plans.find((p) => p.key === plan.key)!.features
        ).find((b) => b.key === 'ai_chat_messages')?.label
      ).toContain('até 1 mensagem por mês');
    }
    await executeStatement(
      "UPDATE subscription_plans SET is_public=TRUE WHERE plan_key='admin'"
    );
    expect(
      (
        (await chamar(GET, { usuario: null })).json as PlanMatrixResponse
      ).plans.some((p) => p.key === 'admin')
    ).toBe(false);
  } finally {
    for (const plan of original.plans.filter((p) => p.key !== 'admin'))
      await updatePlanMatrixByKey(plan.key, plan);
    await executeStatement(
      "UPDATE subscription_plans SET is_public=FALSE WHERE plan_key='admin'"
    );
  }
});
