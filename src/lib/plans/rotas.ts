import { isPlanFeatureEnabled } from '@/lib/plans/access';
import type {
  AccountSubscriptionSummary,
  PlanFeatureKey,
} from '@/types/subscription';

/**
 * Recursos do plano que cada página do app exige. Uma página só aparece
 * (menu lateral, menu do celular, busca Ctrl K, atalhos, botões e avisos que
 * levam a ela) quando TODOS os recursos listados estão habilitados no plano
 * vigente. Páginas fora desta lista não dependem do plano. O Perfil reúne a assinatura e os direitos do
 * titular da LGPD e por isso fica sempre acessível.
 *
 * As APIs continuam recusando com 403 o que o plano não inclui; esta lista
 * apenas evita mostrar à pessoa o que ela não pode usar.
 */
export const RECURSOS_DA_ROTA: Readonly<
  Record<string, readonly PlanFeatureKey[]>
> = {
  '/': ['dashboard_access'],
  '/dia': ['ai_tips_feed', 'vedic_insights', 'ai_scores'],
  '/semana': ['weekly_review', 'vedic_insights'],
  '/respiracao': ['guided_breathing'],
  '/lembretes': ['personal_notifications'],
  '/rotinas': ['personal_habits'],
  '/acontecimentos': ['daily_checkin'],
  '/relatorio-pessoal': ['metrics_history_days'],
  '/experiencias': ['personal_habits', 'metrics_history_days'],
  '/acompanhamentos': ['wellbeing_assessments', 'metrics_history_days'],
  '/linha-do-tempo': ['metrics_history_days'],
  '/plan': ['ai_plan_generations'],
  '/goals': ['goal_progress_tracking'],
  // Toda consulta pertence a um profissional cadastrado na mesma página.
  '/appointments': ['appointments_active', 'professionals_total'],
  '/monitoring': ['realtime_monitoring'],
  '/chat': ['ai_chat_messages'],
  '/connect': ['wearable_bluetooth_connection'],
};

/** Caminho sem consulta (`?`) nem âncora (`#`). */
function caminhoDe(href: string) {
  return href.split(/[?#]/, 1)[0] || '/';
}

export function recursosDaRota(href: string): readonly PlanFeatureKey[] {
  return RECURSOS_DA_ROTA[caminhoDe(href)] ?? [];
}

/**
 * Diz se a página pode ser oferecida à pessoa.
 * - Administradores veem tudo.
 * - Páginas sem recurso associado estão sempre liberadas.
 * - Com o plano ainda carregando (`null`), páginas que dependem dele ficam
 *   ocultas: assim nada aparece e depois some.
 */
export function rotaLiberadaNoPlano(
  href: string,
  assinatura: AccountSubscriptionSummary | null,
  administrador: boolean
): boolean {
  if (administrador) {
    return true;
  }
  const recursos = recursosDaRota(href);
  if (recursos.length === 0) {
    return true;
  }
  return recursos.every((recurso) => isPlanFeatureEnabled(assinatura, recurso));
}
