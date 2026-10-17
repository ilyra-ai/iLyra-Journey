'use client';

import { useCallback } from 'react';

import { useAccountSubscription } from '@/hooks/use-account-subscription';
import { useIsAdmin } from '@/hooks/use-is-admin';
import { rotaLiberadaNoPlano } from '@/lib/plans/rotas';

/**
 * Devolve uma função que diz se uma página do app pode ser oferecida à
 * pessoa conforme o plano vigente (ver `RECURSOS_DA_ROTA`). Usa o mesmo
 * pedido compartilhado de `/api/account/subscription` do cabeçalho e do menu.
 */
export function useRotaLiberada() {
  const { data: assinatura } = useAccountSubscription();
  const administrador = useIsAdmin();

  return useCallback(
    (href: string) => rotaLiberadaNoPlano(href, assinatura, administrador),
    [assinatura, administrador]
  );
}
