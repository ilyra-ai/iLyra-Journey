'use client';
import { useEffect } from 'react';
import { EVENTO_PLANOS_ATUALIZADOS } from '@/lib/plans/atualizacao-publica';

import {
  useAccountResource,
  UseAccountResourceResult,
} from '@/hooks/use-account-resource';
import { AccountSubscriptionSummary } from '@/types/subscription';

function isAccountSubscriptionSummary(
  payload: unknown
): payload is AccountSubscriptionSummary {
  return typeof payload === 'object' && payload !== null && 'plan' in payload;
}

export function useAccountSubscription(): UseAccountResourceResult<AccountSubscriptionSummary> {
  const recurso = useAccountResource({
    compartilharAtualizacoes: true,
    preservarAoAtualizarComFalha: true,
    endpoint: '/api/account/subscription',
    isValid: isAccountSubscriptionSummary,
    fallbackErrorMessage: 'Falha ao carregar o plano atual.',
    errorToastTitle: 'Falha ao carregar o plano atual.',
  });
  const { refresh } = recurso;
  useEffect(() => {
    const atualizar = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    const storage = (e: StorageEvent) => {
      if (e.key === EVENTO_PLANOS_ATUALIZADOS) atualizar();
    };
    window.addEventListener('focus', atualizar);
    document.addEventListener('visibilitychange', atualizar);
    window.addEventListener(EVENTO_PLANOS_ATUALIZADOS, atualizar);
    window.addEventListener('storage', storage);
    const intervalo = window.setInterval(atualizar, 30_000);
    return () => {
      clearInterval(intervalo);
      window.removeEventListener('focus', atualizar);
      document.removeEventListener('visibilitychange', atualizar);
      window.removeEventListener(EVENTO_PLANOS_ATUALIZADOS, atualizar);
      window.removeEventListener('storage', storage);
    };
  }, [refresh]);
  // Atualizar direitos em segundo plano não desmonta formulários em edição.
  return { ...recurso, loading: recurso.loading && recurso.data === null };
}
