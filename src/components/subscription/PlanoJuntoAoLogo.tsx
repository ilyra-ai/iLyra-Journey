'use client';

import Link from 'next/link';
import { useAccountSubscription } from '@/hooks/use-account-subscription';
import { useIsAdmin } from '@/hooks/use-is-admin';
import { Skeleton } from '@/components/ui/skeleton';
import { PlanBadge } from './PlanBadge';

/** O nome vem da assinatura efetiva; o papel decide apenas o destino. */
export function PlanoJuntoAoLogo({ aoAbrir }: { aoAbrir?: () => void }) {
  const { data, loading, refresh } = useAccountSubscription();
  const administrador = useIsAdmin();
  if (loading)
    return (
      <span role="status" aria-label="Carregando seu plano">
        <Skeleton className="h-7 w-16 rounded-full" />
      </span>
    );
  if (!data)
    return (
      <button
        type="button"
        className="max-w-24 rounded px-1 text-xs text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
        onClick={() => void refresh()}
      >
        Recarregar plano
      </button>
    );
  return (
    <Link
      href={administrador ? '/admin/plans' : '/planos'}
      onClick={aoAbrir}
      className="inline-flex min-h-11 min-w-0 shrink-0 items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      aria-label={
        administrador
          ? `Plano ${data.plan.name}. Abrir gestão de planos`
          : `Plano ${data.plan.name}. Comparar planos e fazer upgrade`
      }
    >
      <PlanBadge planKey={data.plan.key} label={data.plan.name} />
    </Link>
  );
}
