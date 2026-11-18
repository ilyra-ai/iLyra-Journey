'use client';

import type { ReactNode } from 'react';
import { useAccountSubscription } from '@/hooks/use-account-subscription';
import { useIsAdmin } from '@/hooks/use-is-admin';
import { isPlanFeatureEnabled } from '@/lib/plans/access';
import { gruposDoRecurso } from '@/lib/plataforma/grupos';
import type { PlanFeatureKey } from '@/types/subscription';
import { PlanUpgradeNotice } from './PlanUpgradeNotice';
import { PLANO_DE_BASE } from '@/types/subscription';

/** Filhos bloqueados não são montados: não consultam dados nem iniciam práticas. */
export function PlanFeatureGate({
  features,
  children,
  ocultar = false,
}: {
  features: readonly PlanFeatureKey[];
  children: ReactNode;
  ocultar?: boolean;
}) {
  const { data, loading } = useAccountSubscription();
  const admin = useIsAdmin();
  if (features.length === 0) return children;
  const controlado = features.some(
    (feature) => gruposDoRecurso(feature).length > 0
  );
  if (
    controlado &&
    (!data?.gruposFuncionais ||
      features.some((feature) =>
        gruposDoRecurso(feature).some(
          (grupo) => !data.gruposFuncionais?.[grupo]
        )
      ))
  )
    return null;
  if (admin && data) return children;
  if (loading)
    return ocultar ? null : (
      <p role="status">Conferindo os recursos do seu plano…</p>
    );
  const faltante = features.find((key) => !isPlanFeatureEnabled(data, key));
  if (!faltante) return children;
  if (ocultar) return null;
  const recurso = data?.features.find((f) => f.key === faltante),
    nome = recurso?.name ?? 'esta página';
  // Desligado pelo administrador para todos (tarefa 134): não é limitação do
  // plano, então não há oferta de troca de plano.
  if (recurso?.globalmenteDesativado)
    return (
      <PlanUpgradeNotice
        currentPlanKey={data?.plan.key ?? PLANO_DE_BASE}
        title="Recurso desativado pelo administrador"
        description={`O recurso “${nome}” está desativado pelo administrador do app para todos os usuários. Seus registros continuam guardados e voltam a aparecer se o recurso for reativado.`}
      />
    );
  return (
    <PlanUpgradeNotice
      currentPlanKey={data?.plan.key ?? PLANO_DE_BASE}
      title="Recurso indisponível no seu plano"
      description={`Seu plano atual não inclui ${nome}. Você pode continuar acessando seu perfil e os recursos habilitados.`}
      showAction
    />
  );
}
