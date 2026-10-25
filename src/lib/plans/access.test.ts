import { describe, expect, it } from 'vitest';

import {
  getPlanFeature,
  getQuotaUsagePercentage,
  isPlanFeatureEnabled,
} from '@/lib/plans/access';
import {
  AccountSubscriptionSummary,
  PlanFeatureAccess,
} from '@/types/subscription';

const baseFeature: PlanFeatureAccess = {
  key: 'ai_chat_messages',
  name: 'Mensagens IA',
  description: 'Mensagens mensais com IA.',
  category: 'IA',
  featureType: 'quota',
  meterKind: 'usage_counter',
  unit: 'mensagens',
  enabled: true,
  quotaValue: 100,
  resetInterval: 'monthly',
  usedValue: 25,
  remainingValue: 75,
  sortOrder: 1,
};

function buildSubscription(
  features: PlanFeatureAccess[]
): AccountSubscriptionSummary {
  return {
    subscriptionId: 'sub_1',
    status: 'active',
    billingInterval: 'monthly',
    source: 'internal',
    startsAt: '2026-03-13 00:00:00',
    currentPeriodStart: '2026-03-13 00:00:00',
    currentPeriodEnd: '2026-04-13 00:00:00',
    cancelAtPeriodEnd: false,
    plan: {
      id: 'plan_free',
      key: 'free',
      name: 'Free',
      tagline: 'Entrada',
      description: 'Plano de entrada',
      monthlyPrice: 0,
      annualPrice: 0,
      currencyCode: 'BRL',
      highlightText: null,
      accentFrom: '#111111',
      accentTo: '#222222',
      displayOrder: 0,
      isActive: true,
      isPublic: true,
    },
    features,
  };
}

describe('plan access helpers', () => {
  it('cota zero e dependência desativada impedem a disponibilidade; perfil essencial permanece', () => {
    const zero = buildSubscription([{ ...baseFeature, quotaValue: 0 }]);
    expect(isPlanFeatureEnabled(zero, 'ai_chat_messages')).toBe(false);
    const history = {
      ...baseFeature,
      key: 'chat_history' as const,
      featureType: 'boolean' as const,
      quotaValue: null,
    };
    expect(
      isPlanFeatureEnabled(buildSubscription([history]), 'chat_history')
    ).toBe(false);
    expect(
      isPlanFeatureEnabled(
        buildSubscription([history, baseFeature]),
        'chat_history'
      )
    ).toBe(true);
    expect(
      isPlanFeatureEnabled(buildSubscription([]), 'profile_management')
    ).toBe(true);
  });
  it('plano inativo não libera capacidades; a atribuição de plano não concede acesso administrativo', () => {
    const s = buildSubscription([baseFeature]);
    s.plan.isActive = false;
    expect(isPlanFeatureEnabled(s, 'ai_chat_messages')).toBe(false);
    expect(isPlanFeatureEnabled(s, 'profile_management')).toBe(true);
    s.administrativeAccess = true;
    expect(isPlanFeatureEnabled(s, 'ai_chat_messages')).toBe(true);
  });
  it('retorna a feature correta dentro da assinatura', () => {
    const subscription = buildSubscription([baseFeature]);

    expect(getPlanFeature(subscription, 'ai_chat_messages')).toEqual(
      baseFeature
    );
  });

  it('retorna false quando a feature nao existe ou esta desabilitada', () => {
    const disabledFeature = { ...baseFeature, enabled: false };
    const subscription = buildSubscription([disabledFeature]);

    expect(isPlanFeatureEnabled(subscription, 'ai_chat_messages')).toBe(false);
    expect(isPlanFeatureEnabled(subscription, 'ai_scores')).toBe(false);
  });

  it('calcula o percentual de consumo com limite superior de 100', () => {
    expect(getQuotaUsagePercentage(baseFeature)).toBe(25);
    expect(
      getQuotaUsagePercentage({
        ...baseFeature,
        usedValue: 140,
        remainingValue: 0,
      })
    ).toBe(100);
  });

  it('retorna null quando nao ha quota numerica ou consumo carregado', () => {
    expect(
      getQuotaUsagePercentage({
        ...baseFeature,
        quotaValue: null,
        usedValue: null,
        remainingValue: null,
      })
    ).toBeNull();
  });
});
