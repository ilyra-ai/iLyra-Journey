'use client';

import * as React from 'react';
import { ArrowUpRight, CreditCard, Loader2, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { useAccountBilling } from '@/hooks/use-account-billing';
import { contribuicaoInicial, lerContribuicao } from '@/lib/auth/retorno';
import type { BillingCatalogPlan, PlanKey } from '@/types/subscription';

const PLAN_ORDER: Record<PlanKey, number> = {
  free: 0,
  admin: 3,
  meta: 1,
  care: 2,
};

function extractApiError(payload: unknown) {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'error' in payload &&
    typeof payload.error === 'string'
  ) {
    return payload.error;
  }

  return undefined;
}

function valorMensal(valor: number, moeda: string) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: moeda,
  }).format(valor);
}

/**
 * Valores de colaboração do plano (tarefa 226): a pessoa escolhe com quanto
 * colabora, sem nome para cada valor; todos dão o mesmo acesso. Um único
 * botão assina o valor escolhido, em cobrança mensal recorrente.
 */
function EscolhaDoValor({
  plan,
  ativarCobranca,
  ocupado,
  aoAssinar,
}: {
  plan: BillingCatalogPlan;
  ativarCobranca: boolean;
  ocupado: (opcao: string) => boolean;
  aoAssinar: (opcao: string) => void;
}) {
  const disponiveis = plan.contributionOptions.filter((o) => o.available);
  // O valor escolhido no convite da landing vem pré-selecionado (tarefa 161).
  const [escolhido, setEscolhido] = React.useState(() =>
    contribuicaoInicial(disponiveis, lerContribuicao())
  );
  const opcao = disponiveis.find((o) => o.key === escolhido) ?? disponiveis[0];
  const id = React.useId();
  if (!opcao) return null;
  const valor = valorMensal(opcao.monthlyPrice, plan.currencyCode);
  return (
    <div className="space-y-3">
      <RadioGroup
        aria-labelledby={`${id}-titulo`}
        value={opcao.key}
        onValueChange={setEscolhido}
        className="grid grid-cols-2 gap-2"
      >
        <p id={`${id}-titulo`} className="col-span-2 text-sm font-medium">
          Com quanto você quer colaborar?
        </p>
        {plan.contributionOptions.map((o) => (
          <Label
            key={o.key}
            htmlFor={`${id}-${o.key}`}
            className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold tabular-nums transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/10 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50"
          >
            <RadioGroupItem
              id={`${id}-${o.key}`}
              value={o.key}
              disabled={!o.available}
            />
            {valorMensal(o.monthlyPrice, plan.currencyCode)}
            <span className="text-xs font-normal text-muted-foreground">
              /mês
            </span>
          </Label>
        ))}
      </RadioGroup>
      <Button
        className="h-auto min-h-10 w-full whitespace-normal"
        onClick={() => aoAssinar(opcao.key)}
        disabled={ocupado(opcao.key)}
      >
        {ocupado(opcao.key) ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <ArrowUpRight className="mr-2 h-4 w-4" aria-hidden="true" />
        )}
        {ativarCobranca
          ? `Ativar colaboração de ${valor} por mês`
          : `Assinar com ${valor} por mês`}
      </Button>
      <p className="text-xs leading-5 text-muted-foreground">
        Cobrança mensal automática, renovada todo mês pela Stripe, sem precisar
        comprar de novo. Você cancela quando quiser na gestão da cobrança.
      </p>
    </div>
  );
}

export function BillingActionPanel({
  currentPlanKey,
  compact = false,
  preferredPlanKey,
  billingInterval,
}: {
  currentPlanKey: PlanKey;
  compact?: boolean;
  preferredPlanKey?: PlanKey;
  billingInterval?: 'monthly' | 'annual';
}) {
  const { data, loading, refresh } = useAccountBilling();
  const [actionKey, setActionKey] = React.useState<string | null>(null);

  const handleRedirectAction = React.useCallback(
    async (
      path: '/api/billing/checkout' | '/api/billing/portal',
      body?: object
    ) => {
      setActionKey(path + JSON.stringify(body ?? {}));
      try {
        const response = await fetch(path, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: body ? JSON.stringify(body) : undefined,
        });

        const payload = (await response.json()) as {
          url?: string;
          error?: string;
        };

        if (!response.ok || typeof payload.url !== 'string') {
          throw new Error(
            extractApiError(payload) || 'Falha ao iniciar o fluxo comercial.'
          );
        }

        window.location.href = payload.url;
      } catch (error) {
        toast.error('Não foi possível abrir o pagamento.', {
          description:
            error instanceof Error ? error.message : 'Erro desconhecido.',
        });
        await refresh();
      } finally {
        setActionKey(null);
      }
    },
    [refresh]
  );

  if (loading) {
    return compact ? (
      <Skeleton className="h-10 w-full rounded" />
    ) : (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full rounded" />
        <Skeleton className="h-10 w-full rounded" />
      </div>
    );
  }

  if (!data) {
    return (
      <Alert>
        <AlertTitle>
          Não foi possível consultar as opções de pagamento
        </AlertTitle>
        <AlertDescription>
          <Button variant="outline" onClick={() => void refresh()}>
            Tentar novamente
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!data.environment.configured) {
    return (
      <Alert className="rounded-md border-border bg-card shadow-none">
        <Settings2 className="h-4 w-4" aria-hidden="true" />
        <AlertTitle>Pagamentos online indisponíveis no momento</AlertTitle>
        <AlertDescription className="break-words">
          Você pode comparar os planos e tentar novamente mais tarde.
          {data.environment.missingKeys.length > 0
            ? ` Configuração administrativa pendente: ${data.environment.missingKeys.join(', ')}.`
            : null}
        </AlertDescription>
      </Alert>
    );
  }

  const canCheckoutCurrentPlan =
    currentPlanKey !== 'free' && data.subscriptionSource !== 'stripe';

  const commercialPlans = data.plans.filter((plan) => {
    // Uma assinatura já vinculada deve ser alterada pelo portal.
    if (data.subscriptionSource === 'stripe') return false;
    if (!plan.purchaseEnabled) {
      return false;
    }

    if (preferredPlanKey && plan.key !== preferredPlanKey) {
      return false;
    }

    if (plan.key === currentPlanKey) {
      return canCheckoutCurrentPlan;
    }

    return PLAN_ORDER[plan.key] > PLAN_ORDER[currentPlanKey];
  });

  const portalEligible =
    data.customerLinked &&
    data.environment.portalEnabled &&
    data.subscriptionSource === 'stripe';

  if (!portalEligible && commercialPlans.length === 0) {
    return (
      <Alert className="rounded-md border-border bg-card shadow-none">
        <Settings2 className="h-4 w-4" aria-hidden="true" />
        <AlertTitle>Nenhuma ação comercial disponível agora</AlertTitle>
        <AlertDescription>
          {currentPlanKey === 'care'
            ? 'Você já está no plano mais completo disponível.'
            : 'Este plano não está disponível para contratação agora. Tente novamente mais tarde.'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      {portalEligible ? (
        <Button
          variant="outline"
          // Quebra linha com texto ampliado a 200% (WCAG 1.4.4), sem vazar.
          className="h-auto min-h-10 w-full whitespace-normal"
          onClick={() => handleRedirectAction('/api/billing/portal')}
          disabled={actionKey === '/api/billing/portal{}'}
        >
          {actionKey === '/api/billing/portal{}' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <CreditCard className="mr-2 h-4 w-4" aria-hidden="true" />
          )}
          Gerenciar cobrança no portal
        </Button>
      ) : null}

      {commercialPlans.map((plan) => {
        const isCurrentPlanCheckout = plan.key === currentPlanKey;

        return (
          <div
            key={plan.key}
            className={
              compact
                ? 'space-y-2'
                : 'space-y-3 rounded-md border border-border bg-card p-4'
            }
          >
            {!compact ? (
              <div>
                <p className="text-sm font-semibold">{plan.name}</p>
                <p className="text-xs text-muted-foreground">{plan.tagline}</p>
                {isCurrentPlanCheckout ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Você já tem acesso a este plano. Aqui poderá contratar a
                    assinatura sem alterar o nível dos seus recursos.
                  </p>
                ) : null}
              </div>
            ) : null}
            {plan.contributionOptions.length > 0 ? (
              <EscolhaDoValor
                plan={plan}
                ativarCobranca={isCurrentPlanCheckout}
                ocupado={(opcao) =>
                  actionKey ===
                  '/api/billing/checkout' +
                    JSON.stringify({
                      planKey: plan.key,
                      billingInterval: 'monthly',
                      contributionOption: opcao,
                    })
                }
                aoAssinar={(opcao) =>
                  void handleRedirectAction('/api/billing/checkout', {
                    planKey: plan.key,
                    billingInterval: 'monthly',
                    contributionOption: opcao,
                  })
                }
              />
            ) : (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  {billingInterval !== 'annual' &&
                  plan.availableIntervals.includes('monthly') ? (
                    <Button
                      className="h-auto min-h-10 whitespace-normal"
                      onClick={() =>
                        handleRedirectAction('/api/billing/checkout', {
                          planKey: plan.key,
                          billingInterval: 'monthly',
                        })
                      }
                      disabled={
                        actionKey ===
                        '/api/billing/checkout{"planKey":"' +
                          plan.key +
                          '","billingInterval":"monthly"}'
                      }
                    >
                      {actionKey ===
                      '/api/billing/checkout{"planKey":"' +
                        plan.key +
                        '","billingInterval":"monthly"}' ? (
                        <Loader2
                          className="mr-2 h-4 w-4 animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <ArrowUpRight
                          className="mr-2 h-4 w-4"
                          aria-hidden="true"
                        />
                      )}
                      {isCurrentPlanCheckout
                        ? `Ativar cobrança ${plan.name} mensal`
                        : `Assinar ${plan.name} mensal`}
                    </Button>
                  ) : null}
                  {billingInterval !== 'monthly' &&
                  plan.availableIntervals.includes('annual') ? (
                    <Button
                      variant="outline"
                      className="h-auto min-h-10 whitespace-normal"
                      onClick={() =>
                        handleRedirectAction('/api/billing/checkout', {
                          planKey: plan.key,
                          billingInterval: 'annual',
                        })
                      }
                      disabled={
                        actionKey ===
                        '/api/billing/checkout{"planKey":"' +
                          plan.key +
                          '","billingInterval":"annual"}'
                      }
                    >
                      {actionKey ===
                      '/api/billing/checkout{"planKey":"' +
                        plan.key +
                        '","billingInterval":"annual"}' ? (
                        <Loader2
                          className="mr-2 h-4 w-4 animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <ArrowUpRight
                          className="mr-2 h-4 w-4"
                          aria-hidden="true"
                        />
                      )}
                      {isCurrentPlanCheckout
                        ? `Ativar cobrança ${plan.name} anual`
                        : `Assinar ${plan.name} anual`}
                    </Button>
                  ) : null}
                </div>
                {billingInterval &&
                !plan.availableIntervals.includes(billingInterval) ? (
                  <p role="status" className="text-sm text-muted-foreground">
                    Este plano não está disponível no ciclo selecionado.
                  </p>
                ) : null}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
