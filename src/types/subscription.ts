export const COMMERCIAL_PLAN_KEYS = ['free', 'meta', 'care'] as const;
export const PLAN_KEYS = [...COMMERCIAL_PLAN_KEYS, 'admin'] as const;

export type PlanKey = (typeof PLAN_KEYS)[number];

export const PLAN_FEATURE_KEYS = [
  'dashboard_access',
  'ai_scores',
  'ai_tips_feed',
  'profile_management',
  'goal_progress_tracking',
  'wearable_bluetooth_connection',
  'realtime_monitoring',
  'voice_monitoring_updates',
  'ai_chat_messages',
  'ai_plan_generations',
  'professionals_total',
  'appointments_active',
  'metrics_history_days',
  'daily_checkin',
  'weekly_review',
  'guided_breathing',
  'evening_reflection',
  'vedic_insights',
  'calendar_integration',
  'personal_habits',
  'wellbeing_assessments',
  'chat_history',
  'chat_images',
  'lyra_memory',
  'personal_notifications',
  'health_intelligence',
] as const;

export type PlanFeatureKey = (typeof PLAN_FEATURE_KEYS)[number];

export type PlanFeatureCategory = 'Essencial' | 'IA' | 'Clínico' | 'Operação';

export type PlanFeatureType = 'boolean' | 'quota';

export type PlanFeatureMeterKind =
  'toggle' | 'usage_counter' | 'active_rows' | 'rolling_days';

export interface PlanFeatureAccess {
  key: PlanFeatureKey;
  name: string;
  description: string;
  category: PlanFeatureCategory;
  featureType: PlanFeatureType;
  meterKind: PlanFeatureMeterKind;
  unit: string | null;
  enabled: boolean;
  quotaValue: number | null;
  resetInterval: string | null;
  usedValue: number | null;
  remainingValue: number | null;
  sortOrder: number;
  /**
   * Recurso desligado para usuários por configuração global do administrador
   * (ex.: agendamentos, tarefa 134), independentemente do plano.
   */
  globalmenteDesativado?: boolean;
}

export interface SubscriptionPlanSummary {
  id: string;
  key: PlanKey;
  name: string;
  tagline: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  currencyCode: string;
  highlightText: string | null;
  accentFrom: string;
  accentTo: string;
  displayOrder: number;
  isActive: boolean;
  isPublic: boolean;
}

export interface AccountSubscriptionSummary {
  gruposFuncionais?: import('@/lib/plataforma/grupos').EstadoDosGrupos;
  administrativeAccess?: boolean;
  subscriptionId: string;
  status: string;
  billingInterval: string;
  source: string;
  startsAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  plan: SubscriptionPlanSummary;
  features: PlanFeatureAccess[];
}

export interface PlanMatrixPlan extends SubscriptionPlanSummary {
  features: PlanFeatureAccess[];
  /**
   * O plano pode ser assinado online agora: tem preço na Stripe no ambiente
   * em uso (teste ou produção, escolhido em Admin → Pagamentos).
   */
  assinaturaOnline: boolean;
}

export interface PlanMatrixResponse {
  plans: PlanMatrixPlan[];
}

export interface PlanMatrixUpdateInput {
  name: string;
  tagline: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  currencyCode: string;
  highlightText: string | null;
  accentFrom: string;
  accentTo: string;
  isActive: boolean;
  isPublic: boolean;
  features: Array<{
    key: PlanFeatureKey;
    enabled: boolean;
    quotaValue: number | null;
    resetInterval: string | null;
  }>;
}

export interface UserSubscriptionAssignment {
  userId: string;
  email: string | null;
  fullName: string;
  role: string;
  subscription: AccountSubscriptionSummary;
}

export interface AdminUserPlanSummary {
  key: PlanKey | null;
  name: string | null;
  billingInterval: string | null;
  status: string | null;
}

export interface AdminUserListItem {
  blockedAt: string | null;
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  onboardingCompleted: boolean;
  createdAt: string;
  avatarUrl: string | null;
  // LGPD: a listagem administrativa traz só identificação, papel, onboarding
  // e plano. Nascimento, gênero, idade, metas e atividade ficam com o titular.
  role: string;
  plan: AdminUserPlanSummary;
}

export interface AdminUserListResponse {
  users: AdminUserListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface BillingCatalogPlan {
  key: PlanKey;
  name: string;
  tagline: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  currencyCode: string;
  highlightText: string | null;
  accentFrom: string;
  accentTo: string;
  current: boolean;
  purchaseEnabled: boolean;
  availableIntervals: Array<'monthly' | 'annual'>;
}

export interface BillingEnvironmentStatus {
  provider: 'stripe';
  configured: boolean;
  portalEnabled: boolean;
  missingKeys: string[];
}

export interface AccountBillingContext {
  environment: BillingEnvironmentStatus;
  customerLinked: boolean;
  subscriptionSource: string | null;
  plans: BillingCatalogPlan[];
}
