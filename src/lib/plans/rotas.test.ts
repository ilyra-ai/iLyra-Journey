import { describe, expect, it } from 'vitest';

import { getVisibleNavigation } from '@/components/layout/navigation';
import { getDefaultPageConfig } from '@/lib/site-page-config/defaults';
import {
  RECURSOS_DA_ROTA,
  recursosDaRota,
  rotaLiberadaNoPlano,
} from '@/lib/plans/rotas';
import {
  type AccountSubscriptionSummary,
  PLAN_FEATURE_KEYS,
  type PlanFeatureKey,
} from '@/types/subscription';

// Assinatura com exatamente os recursos informados habilitados.
function assinaturaCom(
  habilitados: readonly PlanFeatureKey[]
): AccountSubscriptionSummary {
  return {
    subscriptionId: 'sub_1',
    status: 'active',
    billingInterval: 'monthly',
    source: 'auth_register',
    startsAt: '2026-10-01 00:00:00',
    currentPeriodStart: '2026-10-01 00:00:00',
    currentPeriodEnd: '2026-11-01 00:00:00',
    cancelAtPeriodEnd: false,
    plan: {
      id: 'plan_free',
      key: 'free',
      name: 'Free',
      tagline: '',
      description: '',
      monthlyPrice: 0,
      annualPrice: 0,
      currencyCode: 'BRL',
      highlightText: null,
      accentFrom: '#000000',
      accentTo: '#000000',
      displayOrder: 0,
      isActive: true,
      isPublic: true,
    },
    features: PLAN_FEATURE_KEYS.map((key, indice) => ({
      key,
      name: key,
      description: key,
      category: 'Essencial',
      featureType: 'boolean',
      meterKind: 'toggle',
      unit: null,
      enabled: habilitados.includes(key),
      quotaValue: null,
      resetInterval: null,
      usedValue: null,
      remainingValue: null,
      sortOrder: indice,
    })),
  };
}

// Matriz atual do Free (sem pulseira, monitoramento e voz).
const FREE: PlanFeatureKey[] = [
  'dashboard_access',
  'ai_scores',
  'ai_tips_feed',
  'profile_management',
  'goal_progress_tracking',
  'ai_chat_messages',
  'ai_plan_generations',
  'professionals_total',
  'appointments_active',
  'metrics_history_days',
];

const hrefsVisiveis = (assinatura: AccountSubscriptionSummary | null) =>
  getVisibleNavigation(false, getDefaultPageConfig('app'), (href) =>
    rotaLiberadaNoPlano(href, assinatura, false)
  ).map((item) => item.href);

describe('rotas do app conforme o plano', () => {
  it('todo recurso exigido por uma rota existe no catálogo de recursos', () => {
    for (const recursos of Object.values(RECURSOS_DA_ROTA)) {
      for (const recurso of recursos) {
        expect(PLAN_FEATURE_KEYS).toContain(recurso);
      }
    }
  });

  it('ignora consulta e âncora ao identificar a rota', () => {
    expect(recursosDaRota('/dia#reflexao')).toEqual(['ai_tips_feed']);
    expect(recursosDaRota('/chat?origem=painel')).toEqual(['ai_chat_messages']);
    expect(recursosDaRota('/semana')).toEqual([]);
  });

  it('Free não vê Monitoramento nem Dispositivos e vê o restante', () => {
    const hrefs = hrefsVisiveis(assinaturaCom(FREE));
    expect(hrefs).not.toContain('/monitoring');
    expect(hrefs).not.toContain('/connect');
    for (const href of [
      '/',
      '/dia',
      '/semana',
      '/respiracao',
      '/plan',
      '/goals',
      '/appointments',
      '/chat',
      '/profile',
    ]) {
      expect(hrefs).toContain(href);
    }
  });

  it('plano com tudo habilitado vê todas as páginas da pessoa', () => {
    const hrefs = hrefsVisiveis(assinaturaCom(PLAN_FEATURE_KEYS));
    for (const href of Object.keys(RECURSOS_DA_ROTA)) {
      expect(hrefs).toContain(href);
    }
  });

  it('agenda exige consultas e profissionais ao mesmo tempo', () => {
    const semProfissionais = assinaturaCom(
      FREE.filter((recurso) => recurso !== 'professionals_total')
    );
    expect(rotaLiberadaNoPlano('/appointments', semProfissionais, false)).toBe(
      false
    );
  });

  it('desligar um recurso no admin tira a página do menu', () => {
    const semChat = assinaturaCom(
      FREE.filter((recurso) => recurso !== 'ai_chat_messages')
    );
    expect(hrefsVisiveis(semChat)).not.toContain('/chat');
  });

  it('mantém o próprio perfil acessível mesmo com todos os recursos desativados', () => {
    const semRecursos = assinaturaCom([]);
    expect(rotaLiberadaNoPlano('/profile', semRecursos, false)).toBe(true);
    expect(hrefsVisiveis(semRecursos)).toContain('/profile');
  });

  it('com o plano ainda carregando, só as páginas sem recurso aparecem', () => {
    const hrefs = hrefsVisiveis(null);
    expect(hrefs).toEqual(
      hrefs.filter((href) => recursosDaRota(href).length === 0)
    );
    expect(hrefs).toContain('/profile');
  });

  it('administrador vê tudo, mesmo sem assinatura carregada', () => {
    for (const href of Object.keys(RECURSOS_DA_ROTA)) {
      expect(rotaLiberadaNoPlano(href, null, true)).toBe(true);
    }
  });
});
