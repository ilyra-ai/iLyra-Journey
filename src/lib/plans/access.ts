import {
  AccountSubscriptionSummary,
  PlanFeatureAccess,
  PlanFeatureKey,
} from '@/types/subscription';
import { capacidadeDisponivel } from './dependencias';
import { gruposDoRecurso } from '@/lib/plataforma/grupos';

export function getPlanFeature(
  summary: AccountSubscriptionSummary | null,
  featureKey: PlanFeatureKey
): PlanFeatureAccess | null {
  if (!summary) {
    return null;
  }

  return summary.features.find((feature) => feature.key === featureKey) ?? null;
}

export function isPlanFeatureEnabled(
  summary: AccountSubscriptionSummary | null,
  featureKey: PlanFeatureKey
) {
  if (
    gruposDoRecurso(featureKey).some(
      (grupo) => summary?.gruposFuncionais?.[grupo] === false
    )
  )
    return false;
  if (getPlanFeature(summary, featureKey)?.globalmenteDesativado) return false;
  if (summary?.administrativeAccess) return true;
  if (summary && featureKey !== 'profile_management' && !summary.plan.isActive)
    return false;
  return summary ? capacidadeDisponivel(summary.features, featureKey) : false;
}

export function getQuotaUsagePercentage(feature: PlanFeatureAccess | null) {
  if (!feature || feature.quotaValue === null || feature.usedValue === null) {
    return null;
  }

  if (feature.quotaValue === 0) {
    return 0;
  }

  return Math.min(100, (feature.usedValue / feature.quotaValue) * 100);
}
