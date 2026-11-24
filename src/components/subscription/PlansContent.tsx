'use client';

import { useState } from 'react';
import { Check, RefreshCw } from 'lucide-react';
import { PageIntro } from '@/components/layout/PageIntro';
import { BillingActionPanel } from '@/components/subscription/BillingActionPanel';
import { SeuUsoDeIa } from './SeuUsoDeIa';
import { PlanBadge } from '@/components/subscription/PlanBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAccountResource } from '@/hooks/use-account-resource';
import { useAccountSubscription } from '@/hooks/use-account-subscription';
import { cn } from '@/lib/utils';
import type { PlanMatrixResponse } from '@/types/subscription';

function catalogoValido(payload: unknown): payload is PlanMatrixResponse {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'plans' in payload &&
    Array.isArray(payload.plans)
  );
}

export function PlansContent() {
  const assinatura = useAccountSubscription();
  const catalogo = useAccountResource<PlanMatrixResponse>({
    endpoint: '/api/public/plans',
    isValid: catalogoValido,
    fallbackErrorMessage: 'Não foi possível consultar os planos.',
    errorToastTitle: 'Planos indisponíveis',
  });
  const [ciclo, setCiclo] = useState<'monthly' | 'annual'>('monthly');
  const planos = catalogo.data?.plans.filter(
    (p) => p.key !== 'admin' && p.isActive && p.isPublic
  );
  // Plano com valores de colaboração é só mensal (tarefa 226): o seletor de
  // ciclo só aparece se algum plano tiver preço anual próprio.
  const temCicloAnual = Boolean(
    planos?.some((p) => p.contributionOptions.length === 0 && p.annualPrice > 0)
  );
  const cicloEmUso = temCicloAnual ? ciclo : 'monthly';
  return (
    <>
      <PageIntro
        eyebrow="Seu próximo passo"
        title="Seu espaço, seu plano"
        description="Compare os recursos e escolha como explorar a Lyra."
      />
      {catalogo.loading || assinatura.loading ? (
        <div
          role="status"
          aria-label="Carregando planos"
          className="grid gap-4 md:grid-cols-3"
        >
          {[0, 1, 2].map((n) => (
            <Skeleton key={n} className="h-96 rounded-xl" />
          ))}
        </div>
      ) : !planos || !assinatura.data ? (
        <Card>
          <CardHeader>
            <CardTitle>Não foi possível carregar os planos</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => {
                void catalogo.refresh();
                void assinatura.refresh();
              }}
            >
              <RefreshCw aria-hidden="true" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
            <p className="text-sm">
              Seu plano atual: <strong>{assinatura.data.plan.name}</strong>
            </p>
            {temCicloAnual ? (
              <div
                role="group"
                aria-label="Ciclo de pagamento"
                className="flex gap-2"
              >
                <Button
                  variant={ciclo === 'monthly' ? 'default' : 'outline'}
                  aria-pressed={ciclo === 'monthly'}
                  onClick={() => setCiclo('monthly')}
                >
                  Mensal
                </Button>
                <Button
                  variant={ciclo === 'annual' ? 'default' : 'outline'}
                  aria-pressed={ciclo === 'annual'}
                  onClick={() => setCiclo('annual')}
                >
                  Anual
                </Button>
              </div>
            ) : null}
          </div>
          {planos.length === 0 ? (
            <p role="status">
              Nenhum plano está disponível para comparação agora.
            </p>
          ) : null}
          <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {planos.map((plano) => {
              const atual = plano.key === assinatura.data!.plan.key;
              const formatar = (valor: number) =>
                new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: plano.currencyCode,
                }).format(valor);
              const valores = plano.contributionOptions;
              const comValores = valores.length > 0;
              const preco = comValores
                ? valores.map((v) => formatar(v.monthlyPrice)).join(' ou ')
                : formatar(
                    cicloEmUso === 'annual'
                      ? plano.annualPrice
                      : plano.monthlyPrice
                  );
              return (
                <Card key={plano.id} className="flex min-w-0 flex-col">
                  <CardHeader className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <PlanBadge planKey={plano.key} label={plano.name} />
                      {atual ? (
                        <span className="text-xs font-semibold text-primary">
                          Seu plano atual
                        </span>
                      ) : null}
                    </div>
                    <CardTitle>{plano.name}</CardTitle>
                    {comValores ? (
                      // Abertura do plano: os valores dão o mesmo acesso e a
                      // pessoa escolhe com quanto colabora.
                      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                        {plano.highlightText ? (
                          <p className="text-sm font-semibold text-primary">
                            {plano.highlightText}
                          </p>
                        ) : null}
                        <p className="mt-1 text-sm leading-6">
                          {plano.description}
                        </p>
                      </div>
                    ) : null}
                    <p className="text-sm text-muted-foreground">
                      {plano.tagline}
                    </p>
                    {/* flex-wrap: com texto a 200%, o "/mês" desce de linha
                        em vez de passar da borda. */}
                    <p
                      className={cn(
                        'flex flex-wrap items-baseline gap-x-1 font-semibold tabular-nums',
                        comValores ? 'text-2xl' : 'text-3xl'
                      )}
                    >
                      <span>{preco}</span>
                      <span className="text-sm font-normal text-muted-foreground">
                        /{cicloEmUso === 'annual' ? 'ano' : 'mês'}
                      </span>
                    </p>
                    {comValores ? (
                      <p className="text-xs text-muted-foreground">
                        Assinatura mensal recorrente, cobrada automaticamente
                        todo mês.
                      </p>
                    ) : (
                      <>
                        <p className="text-sm leading-6">{plano.description}</p>
                        {plano.highlightText ? (
                          <p className="text-sm font-medium text-primary">
                            {plano.highlightText}
                          </p>
                        ) : null}
                      </>
                    )}
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-5">
                    <ul
                      className="flex-1 space-y-3"
                      aria-label={`Recursos do plano ${plano.name}`}
                    >
                      {plano.features
                        .filter(
                          (f) =>
                            f.enabled &&
                            (f.featureType !== 'quota' || f.quotaValue !== 0)
                        )
                        .map((f) => (
                          <li
                            key={f.key}
                            className="flex items-start gap-2 text-sm"
                          >
                            <Check
                              className="mt-0.5 size-4 shrink-0 text-primary"
                              aria-hidden="true"
                            />
                            <span>
                              {f.name}
                              {f.featureType === 'quota' &&
                              f.quotaValue !== null
                                ? `: ${new Intl.NumberFormat('pt-BR').format(f.quotaValue)} ${f.unit ?? ''}`
                                : ''}
                            </span>
                          </li>
                        ))}
                    </ul>
                    {plano.key === 'free' ||
                    plano.displayOrder < assinatura.data!.plan.displayOrder ? (
                      <p className="text-sm text-muted-foreground">
                        {atual
                          ? 'Você já está neste plano.'
                          : 'Seu plano atual já oferece um nível superior. Para alterar ou encerrar uma assinatura, consulte a gestão de cobrança no seu perfil.'}
                      </p>
                    ) : (
                      <BillingActionPanel
                        currentPlanKey={assinatura.data!.plan.key}
                        preferredPlanKey={plano.key}
                        billingInterval={cicloEmUso}
                        compact
                      />
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            Seu plano só muda após a confirmação do pagamento. Você poderá
            revisar as condições antes de concluir.
          </p>
        </div>
      )}
      <SeuUsoDeIa />
    </>
  );
}
