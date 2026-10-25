'use client';

import type { ReactNode } from 'react';
import { useAccountSubscription } from '@/hooks/use-account-subscription';
import { useIsAdmin } from '@/hooks/use-is-admin';
import { isPlanFeatureEnabled } from '@/lib/plans/access';
import type { PlanFeatureKey } from '@/types/subscription';
import { PlanUpgradeNotice } from './PlanUpgradeNotice';

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
  if (admin || features.length === 0) return children;
  if (loading)
    return ocultar ? null : (
      <p role="status">Conferindo os recursos do seu plano…</p>
    );
  const faltante = features.find((key) => !isPlanFeatureEnabled(data, key));
  if (!faltante) return children;
  if (ocultar) return null;
  const nome =
    data?.features.find((f) => f.key === faltante)?.name ?? 'esta página';
  return (
    <PlanUpgradeNotice
      currentPlanKey={data?.plan.key ?? 'free'}
      title="Recurso indisponível no seu plano"
      description={`Seu plano atual não inclui ${nome}. Você pode continuar acessando seu perfil e os recursos habilitados.`}
      showAction
    />
  );
}
