'use client';

import { Crown, ShieldCheck, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PlanKey } from '@/types/subscription';

/**
 * Cores dos planos (tarefa 218). Desde a tarefa 225 só Care e Administrador
 * estão em uso; Free e Meta aparecem só no histórico, em tom neutro. O Care
 * se chama Lyra Journey desde a tarefa 226 (a chave interna continua `care`).
 */
const planVisuals: Record<
  PlanKey,
  {
    label: string;
    className: string;
    icon: typeof Sparkles;
  }
> = {
  admin: {
    label: 'Administrador',
    className:
      'border-amber-500/50 bg-amber-400/15 text-amber-800 dark:text-amber-200',
    icon: ShieldCheck,
  },
  care: {
    label: 'Lyra Journey',
    className:
      'border-teal-500/50 bg-teal-400/15 text-teal-800 dark:text-teal-200',
    icon: Crown,
  },
  free: {
    label: 'Free',
    className: 'border-border bg-muted text-muted-foreground',
    icon: Sparkles,
  },
  meta: {
    label: 'Meta',
    className: 'border-border bg-muted text-muted-foreground',
    icon: Sparkles,
  },
};

export function PlanBadge({
  planKey,
  label,
}: {
  planKey: PlanKey;
  label?: string;
}) {
  const visual = planVisuals[planKey];
  const Icon = visual.icon;

  return (
    <Badge variant="outline" className={cn('max-w-32', visual.className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="truncate">{label ?? visual.label}</span>
    </Badge>
  );
}
