'use client';
import type { ReactNode } from 'react';
import { useAccountSubscription } from '@/hooks/use-account-subscription';
import type { GrupoFuncional } from '@/lib/plataforma/grupos';

/** O conteúdo desligado não monta hooks, formulários, áudio nem consultas. */
export function GrupoFuncionalGate({
  grupos,
  children,
  alternativa = null,
}: {
  grupos: readonly GrupoFuncional[];
  children: ReactNode;
  alternativa?: ReactNode;
}) {
  const { data, loading } = useAccountSubscription();
  if (loading || !data?.gruposFuncionais) return null;
  return grupos.every((grupo) => data.gruposFuncionais?.[grupo] === true)
    ? children
    : alternativa;
}
