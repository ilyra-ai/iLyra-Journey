import type { PlanFeatureAccess, PlanFeatureKey } from '@/types/subscription';

/** Dependências técnicas; ativar um recurso não ativa outro silenciosamente. */
export const DEPENDENCIAS: Partial<
  Record<PlanFeatureKey, readonly PlanFeatureKey[]>
> = {
  ai_plan_generations: ['vedic_insights'],
  ai_scores: ['metrics_history_days'],
  daily_checkin: ['metrics_history_days'],
  voice_monitoring_updates: ['realtime_monitoring'],
  calendar_integration: ['vedic_insights'],
  chat_history: ['ai_chat_messages'],
  chat_images: ['chat_history'],
  lyra_memory: ['ai_chat_messages'],
};

/** Perfil e direitos da conta são essenciais, independentemente do plano (104). */
export function capacidadeDisponivel(
  features: readonly PlanFeatureAccess[],
  key: PlanFeatureKey
): boolean {
  if (key === 'profile_management') return true;
  const feature = features.find((f) => f.key === key);
  if (
    !feature?.enabled ||
    (feature.featureType === 'quota' && feature.quotaValue === 0)
  )
    return false;
  return (DEPENDENCIAS[key] ?? []).every((dependency) =>
    capacidadeDisponivel(features, dependency)
  );
}
