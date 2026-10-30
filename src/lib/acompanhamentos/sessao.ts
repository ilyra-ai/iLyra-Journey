import { requireServerSession } from '@/lib/mysql/server-auth';
import { requireFeatureEnabled } from '@/lib/plans/service';

/**
 * Acompanhamentos são autoavaliações pessoais: exigem o recurso de
 * avaliações de bem-estar e o histórico de métricas do plano, que limita as
 * datas consultadas e registradas.
 */
export async function sessaoDosAcompanhamentos() {
  const s = await requireServerSession();
  await requireFeatureEnabled(s, 'wellbeing_assessments');
  await requireFeatureEnabled(s, 'metrics_history_days');
  return s;
}
