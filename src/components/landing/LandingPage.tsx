'use client';

import {
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  SubmitEvent,
  useEffect,
  useState,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Menu,
  RotateCw,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/context/AuthContext';
import { PlanMatrixPlan } from '@/types/subscription';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { MarcaLyra } from '@/components/marca/MarcaLyra';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import type {
  LandingSectionKey,
  LandingPageConfig,
  ToneKey,
} from '@/lib/site-page-config/schema';
import { usePublicSitePageConfig } from '@/hooks/use-public-site-page-config';
import { getBuilderIcon } from '@/lib/site-page-config/ui';
import { moedaPtBr } from '@/lib/formato/numero';
import { cn } from '@/lib/utils';
import { ThemeToggleButton } from '@/components/theme/ThemeControls';
import { PuckClientRenderer } from '@/components/puck/PuckClientRenderer';
import {
  ROTA_POLITICA_DE_PRIVACIDADE,
  ROTA_TERMOS_DE_USO,
} from '@/lib/lgpd/documentos';

/*
  Landing redesenhada por completo (tarefa 63): uma coluna de leitura calma,
  celular primeiro, com menos molduras e mais espaço. Referências de 2026:
  topo com uma promessa e uma ação principal, prova logo abaixo, preços
  transparentes, poucas cores (teal da marca para ação, coral só para o
  conteúdo astral e de IA) e paridade entre os temas claro e escuro.

  Todo o texto vem do construtor de UI (`landing`) e os planos vêm do
  catálogo público (`/api/public/plans`); nada é inventado aqui. Os botões
  de navegação viraram links de verdade (abrem em nova aba, aparecem no
  menu de contexto e funcionam sem JavaScript).
*/

// Fundo suave chapado do ícone de cada item; o coral ("cosmic") fica
// reservado ao conteúdo astral e de IA.
function corDoIconeTonal(tone: ToneKey): string {
  switch (tone) {
    case 'cosmic':
      return 'bg-cosmic-light text-cosmic-strong';
    case 'golden':
      return 'bg-golden-light text-golden';
    case 'soft':
      return 'bg-muted text-foreground';
    case 'primary':
    case 'accent':
      return 'bg-sidebar-accent text-sidebar-accent-foreground';
  }
}

// Cor do número de cada indicador, na mesma regra de tons.
function corDoNumero(tone: ToneKey): string {
  switch (tone) {
    case 'cosmic':
      return 'text-cosmic-strong';
    case 'golden':
      return 'text-golden';
    case 'soft':
      return 'text-foreground';
    case 'primary':
    case 'accent':
      return 'text-primary';
  }
}

// Plano recomendado no catálogo (decisão comercial já existente na landing
// anterior): recebe o contorno e o botão principal.
const PLANO_EM_DESTAQUE = 'meta';

// Quantos recursos de cada plano aparecem antes do "e mais N".
const RECURSOS_POR_PLANO = 5;

const CONTEINER = 'mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8';
const ESPACO_DA_SECAO = 'scroll-mt-20 py-16 sm:py-24';
const ROTULO_DA_SECAO = 'text-sm font-medium text-primary';

type PublicPlansPayload = {
  plans: PlanMatrixPlan[];
  error?: string;
};

type LandingPageProps = {
  overrideConfig?: LandingPageConfig;
  previewMode?: boolean;
};

// Faixa de telas em que o texto cresce do mínimo ao máximo.
const TELA_MINIMA_PX = 360;
const TELA_MAXIMA_PX = 1280;

/**
 * Tamanho fluido de verdade: cresce em linha reta do mínimo (360 px) ao
 * máximo (1280 px). O valor do meio do `clamp` antes era fixo em rem, então
 * o título ficava sempre no mesmo tamanho e enorme no celular.
 */
function buildFluidFontSize(minRem: number, maxRem: number, scale: number) {
  const minimoPx = minRem * scale * 16;
  const maximoPx = maxRem * scale * 16;
  const inclinacao = (maximoPx - minimoPx) / (TELA_MAXIMA_PX - TELA_MINIMA_PX);
  const baseRem = (minimoPx - inclinacao * TELA_MINIMA_PX) / 16;
  const vw = inclinacao * 100;
  // Valores de CSS exigem ponto decimal (por isso `toFixed`).
  return `clamp(${(minimoPx / 16).toFixed(3)}rem, calc(${baseRem.toFixed(3)}rem + ${vw.toFixed(3)}vw), ${(maximoPx / 16).toFixed(3)}rem)`;
}

/**
 * Destino configurável no construtor: rota interna (`/login`), âncora da
 * própria página (`#planos`) ou endereço externo (`https://`). Na
 * pré-visualização do construtor os links não navegam.
 */
function LinkDaLanding({
  href,
  previewMode,
  className,
  comoBotao = false,
  aoNavegar,
  children,
}: {
  href: string;
  previewMode: boolean;
  className?: string;
  /** Links com aparência de botão recebem a escala de botões do construtor. */
  comoBotao?: boolean;
  /** Chamado ao seguir o link (fecha o menu móvel, por exemplo). */
  aoNavegar?: () => void;
  children: ReactNode;
}) {
  const aoClicar = (evento: MouseEvent<HTMLAnchorElement>) => {
    if (previewMode) {
      evento.preventDefault();
      return;
    }
    aoNavegar?.();
  };
  const atributos = {
    className,
    onClick: aoClicar,
    ...(comoBotao ? { 'data-slot': 'button' } : {}),
  };

  if (href.startsWith('/')) {
    return (
      <Link href={href} {...atributos}>
        {children}
      </Link>
    );
  }

  return (
    <a
      href={href}
      rel={href.startsWith('https://') ? 'noopener noreferrer' : undefined}
      {...atributos}
    >
      {children}
    </a>
  );
}

/** Abertura padrão das seções: rótulo, título e texto de apoio. */
function AberturaDaSecao({
  id,
  rotulo,
  titulo,
  descricao,
  estiloDoTitulo,
  estiloDoTexto,
  centralizada = false,
}: {
  id: string;
  rotulo: string;
  titulo: string;
  descricao: string;
  estiloDoTitulo: CSSProperties;
  estiloDoTexto: CSSProperties;
  centralizada?: boolean;
}) {
  return (
    <div className={cn('max-w-2xl', centralizada && 'mx-auto text-center')}>
      <p className={ROTULO_DA_SECAO}>{rotulo}</p>
      <h2
        id={id}
        className="mt-3 text-balance font-display font-semibold leading-tight tracking-[-0.02em] text-foreground"
        style={estiloDoTitulo}
      >
        {titulo}
      </h2>
      <p
        className="mt-4 text-pretty leading-relaxed text-muted-foreground"
        style={estiloDoTexto}
      >
        {descricao}
      </p>
    </div>
  );
}

export function LandingPage({
  overrideConfig,
  previewMode = false,
}: LandingPageProps) {
  const router = useRouter();
  const { db } = useAuth();
  // Configuração publicada (hook compartilhado) ou o rascunho em edição no
  // construtor de UI (pré-visualização).
  const { config: publicConfig } = usePublicSitePageConfig('landing');
  const config: LandingPageConfig = overrideConfig ?? publicConfig;
  const [plans, setPlans] = useState<PlanMatrixPlan[]>([]);
  const [plansStatus, setPlansStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading'
  );
  const [plansError, setPlansError] = useState('');
  const [tentativaDosPlanos, setTentativaDosPlanos] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);

  const textStyles = {
    heroTitle: {
      fontSize: buildFluidFontSize(2, 4.25, config.typography.heroTitle),
    } satisfies CSSProperties,
    heroBody: {
      fontSize: buildFluidFontSize(1.0, 1.2, config.typography.heroBody),
    } satisfies CSSProperties,
    sectionTitle: {
      fontSize: buildFluidFontSize(1.5, 2.4, config.typography.sectionTitle),
    } satisfies CSSProperties,
    sectionBody: {
      fontSize: buildFluidFontSize(1, 1.12, config.typography.sectionBody),
    } satisfies CSSProperties,
    cardTitle: {
      fontSize: buildFluidFontSize(1.0, 1.2, config.typography.cardTitle),
    } satisfies CSSProperties,
    cardBody: {
      fontSize: buildFluidFontSize(0.92, 1.05, config.typography.cardBody),
    } satisfies CSSProperties,
    buttonLabel: {
      fontSize: buildFluidFontSize(0.92, 1.04, config.typography.buttonLabel),
    } satisfies CSSProperties,
  };

  useEffect(() => {
    const controller = new AbortController();

    async function loadPlans() {
      try {
        const response = await fetch('/api/public/plans', {
          cache: 'no-store',
          signal: controller.signal,
        });
        const payload = (await response.json()) as PublicPlansPayload;

        if (!response.ok || !Array.isArray(payload.plans)) {
          throw new Error(
            payload.error || 'Falha ao carregar o catálogo público.'
          );
        }

        setPlans(
          payload.plans.sort(
            (left, right) => left.displayOrder - right.displayOrder
          )
        );
        setPlansStatus('ready');
      } catch (error) {
        if (controller.signal.aborted) return;
        setPlans([]);
        setPlansStatus('error');
        setPlansError(
          error instanceof Error
            ? error.message
            : 'Falha ao carregar os planos.'
        );
      }
    }

    void loadPlans();
    return () => controller.abort();
  }, [tentativaDosPlanos]);

  function tentarCarregarPlanosDeNovo() {
    setPlansStatus('loading');
    setPlansError('');
    setTentativaDosPlanos((atual) => atual + 1);
  }

  const enabledCapabilities = plans.reduce(
    (total, plan) =>
      total + plan.features.filter((feature) => feature.enabled).length,
    0
  );
  const checkoutReady = plans.filter(
    (plan) => plan.externalMonthlyPriceId || plan.externalAnnualPriceId
  ).length;
  const categories = new Set(
    plans.flatMap((plan) =>
      plan.features
        .filter((feature) => feature.enabled)
        .map((feature) => feature.category)
    )
  ).size;

  function resolveMetricValue(source: string, customValue: string) {
    if (source === 'planCount') return String(plans.length);
    if (source === 'featureCount') return String(enabledCapabilities);
    if (source === 'categoryCount') return String(categories);
    if (source === 'checkoutCount') return String(checkoutReady);
    return customValue;
  }

  async function handleQuickLogin(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (previewMode) {
      return;
    }
    setSubmitting(true);

    const { error } = await db.auth.signInWithPassword({ email, password });

    setSubmitting(false);

    if (error) {
      toast.error('Não foi possível entrar agora.', {
        description: error.message,
      });
      return;
    }

    toast.success('Boas-vindas. Sua órbita foi aberta com sucesso.');
    router.push('/');
  }

  // Itens do menu: só as seções visíveis (antes o menu apontava também
  // para seções ocultas no construtor).
  const itensDoMenu = [
    { href: '#recursos', rotulo: 'Recursos', visivel: config.features.visible },
    { href: '#fluxo', rotulo: 'Como funciona', visivel: config.flow.visible },
    { href: '#planos', rotulo: 'Planos', visivel: config.plans.visible },
    { href: '#faq', rotulo: 'Dúvidas', visivel: config.faq.visible },
  ].filter((item) => item.visivel);

  const botaoPrincipal = cn(
    buttonVariants({ size: 'xl' }),
    'h-auto min-h-12 whitespace-normal py-3 text-center'
  );
  const botaoSecundario = cn(
    buttonVariants({ size: 'xl', variant: 'secondary' }),
    'h-auto min-h-12 whitespace-normal py-3 text-center'
  );

  function renderSection(sectionKey: LandingSectionKey) {
    switch (sectionKey) {
      case 'features':
        if (!config.features.visible) {
          return null;
        }

        return (
          <section
            id="recursos"
            aria-labelledby="titulo-recursos"
            className={ESPACO_DA_SECAO}
          >
            <div className={CONTEINER}>
              <AberturaDaSecao
                id="titulo-recursos"
                rotulo={config.features.badgeText}
                titulo={config.features.title}
                descricao={config.features.description}
                estiloDoTitulo={textStyles.sectionTitle}
                estiloDoTexto={textStyles.sectionBody}
              />

              {/* Grade sem caixas: um fio separa os itens (ritmo calmo, sem
                  cartões repetidos). */}
              <ul className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                {config.features.items.map((feature) => {
                  const FeatureIcon = getBuilderIcon(feature.icon);

                  return (
                    <li
                      key={feature.id}
                      data-escala="recurso"
                      className="min-w-0 border-t border-border pt-6"
                    >
                      <span
                        data-escala="icone"
                        className={cn(
                          'flex size-10 items-center justify-center rounded-md',
                          corDoIconeTonal(feature.tone)
                        )}
                      >
                        <FeatureIcon className="size-5" aria-hidden="true" />
                      </span>
                      <h3
                        className="mt-5 font-display font-semibold text-foreground"
                        style={textStyles.cardTitle}
                      >
                        {feature.title}
                      </h3>
                      <p
                        className="mt-2 text-pretty leading-relaxed text-muted-foreground"
                        style={textStyles.cardBody}
                      >
                        {feature.description}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        );
      case 'metrics':
        if (!config.metrics.visible) {
          return null;
        }

        return (
          <section
            aria-labelledby="titulo-indicadores"
            className="border-y border-border bg-card py-16 sm:py-20"
          >
            <div className={CONTEINER}>
              <AberturaDaSecao
                id="titulo-indicadores"
                rotulo={config.metrics.badgeText}
                titulo={config.metrics.title}
                descricao={config.metrics.description}
                estiloDoTitulo={textStyles.sectionTitle}
                estiloDoTexto={textStyles.sectionBody}
              />

              {/* Faixa de números em lista de definição: rótulo, valor e
                  nota de cada indicador. */}
              <dl
                aria-busy={plansStatus === 'loading'}
                className="mt-12 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 xl:grid-cols-4"
              >
                {config.metrics.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex min-w-0 flex-col gap-2 bg-background p-6"
                  >
                    <dt className="text-sm font-medium text-muted-foreground">
                      {item.label}
                    </dt>
                    <dd
                      className={cn(
                        'font-display text-4xl font-semibold tracking-tight tabular-nums',
                        corDoNumero(item.tone)
                      )}
                    >
                      {plansStatus === 'loading' && item.source !== 'custom' ? (
                        <>
                          <Skeleton className="h-10 w-16" />
                          <span className="sr-only">Carregando</span>
                        </>
                      ) : (
                        resolveMetricValue(item.source, item.customValue)
                      )}
                    </dd>
                    <dd
                      className="leading-relaxed text-muted-foreground"
                      style={textStyles.cardBody}
                    >
                      {item.note}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        );
      case 'flow':
        if (!config.flow.visible) {
          return null;
        }

        return (
          <section
            id="fluxo"
            aria-labelledby="titulo-fluxo"
            className={ESPACO_DA_SECAO}
          >
            <div className={CONTEINER}>
              <AberturaDaSecao
                id="titulo-fluxo"
                rotulo={config.flow.badgeText}
                titulo={config.flow.title}
                descricao={config.flow.description}
                estiloDoTitulo={textStyles.sectionTitle}
                estiloDoTexto={textStyles.sectionBody}
              />

              {/* Etapas em lista ordenada; no desktop, uma linha liga os
                  marcadores. */}
              <ol className="mt-12 grid gap-10 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
                {config.flow.items.map((step) => {
                  const StepIcon = getBuilderIcon(step.icon);

                  return (
                    <li
                      key={step.id}
                      data-escala="recurso"
                      className="relative min-w-0"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          data-escala="icone"
                          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-primary"
                        >
                          <StepIcon className="size-5" aria-hidden="true" />
                        </span>
                        <span className="font-display text-sm font-semibold text-primary">
                          {step.step}
                        </span>
                        <span
                          aria-hidden="true"
                          className="hidden h-px flex-1 bg-border lg:block"
                        />
                      </div>
                      <h3
                        className="mt-5 font-display font-semibold text-foreground"
                        style={textStyles.cardTitle}
                      >
                        {step.title}
                      </h3>
                      <p
                        className="mt-2 text-pretty leading-relaxed text-muted-foreground"
                        style={textStyles.cardBody}
                      >
                        {step.description}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </div>
          </section>
        );
      case 'plans':
        if (!config.plans.visible) {
          return null;
        }

        return (
          <section
            id="planos"
            aria-labelledby="titulo-planos"
            className={cn(ESPACO_DA_SECAO, 'border-y border-border bg-card')}
          >
            <div className={CONTEINER}>
              <AberturaDaSecao
                id="titulo-planos"
                rotulo={config.plans.badgeText}
                titulo={config.plans.title}
                descricao={config.plans.description}
                estiloDoTitulo={textStyles.sectionTitle}
                estiloDoTexto={textStyles.sectionBody}
                centralizada
              />

              {plansStatus === 'loading' ? (
                <div
                  className="mt-12 grid gap-6 lg:grid-cols-3"
                  aria-busy="true"
                >
                  <p className="sr-only">Carregando os planos</p>
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={`plano-esqueleto-${index}`}
                      className="space-y-4 rounded-xl border border-border bg-background p-6"
                    >
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-10 w-32" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-4/5" />
                      <Skeleton className="h-11 w-full" />
                    </div>
                  ))}
                </div>
              ) : null}

              {plansStatus === 'ready' && plans.length === 0 ? (
                <p className="mx-auto mt-12 max-w-md text-center text-muted-foreground">
                  Nenhum plano está aberto para assinatura no momento.
                </p>
              ) : null}

              {plansStatus === 'ready' && plans.length > 0 ? (
                <ul className="mt-12 grid items-stretch gap-6 lg:grid-cols-3">
                  {plans.map((plan, indice) => {
                    const destaque = plan.key === PLANO_EM_DESTAQUE;
                    const todosOsRecursos = plan.features.filter(
                      (feature) => feature.enabled
                    );
                    // A partir do segundo plano, a lista mostra o que ele
                    // acrescenta ao anterior ("Tudo do Free, mais:"); antes
                    // os três cartões repetiam os mesmos cinco recursos.
                    const anterior = indice > 0 ? plans[indice - 1] : null;
                    const chavesDoAnterior = new Set(
                      anterior?.features
                        .filter((feature) => feature.enabled)
                        .map((feature) => feature.key) ?? []
                    );
                    const novos = todosOsRecursos.filter(
                      (feature) => !chavesDoAnterior.has(feature.key)
                    );
                    const herdaDoAnterior =
                      anterior !== null &&
                      novos.length > 0 &&
                      novos.length < todosOsRecursos.length;
                    const recursos = herdaDoAnterior ? novos : todosOsRecursos;
                    const restantes = recursos.length - RECURSOS_POR_PLANO;

                    return (
                      <li
                        key={plan.key}
                        data-escala="plano"
                        aria-labelledby={`plano-${plan.key}`}
                        className={cn(
                          'flex min-w-0 flex-col rounded-xl border bg-background p-6 sm:p-8',
                          destaque
                            ? 'border-primary shadow-md ring-1 ring-primary'
                            : 'border-border'
                        )}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h3
                            id={`plano-${plan.key}`}
                            className="flex items-center gap-2.5 font-display font-semibold text-foreground"
                            style={textStyles.cardTitle}
                          >
                            {/* Cor cadastrada no plano, com contorno para
                                não sumir no tema escuro. */}
                            <span
                              aria-hidden="true"
                              className="size-3 shrink-0 rounded-full ring-1 ring-border"
                              style={{ backgroundColor: plan.accentFrom }}
                            />
                            {plan.name}
                          </h3>
                          {plan.highlightText ? (
                            <Badge variant={destaque ? 'default' : 'secondary'}>
                              {plan.highlightText}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm font-medium text-foreground">
                          {plan.tagline}
                        </p>

                        <p className="mt-6 flex flex-wrap items-baseline gap-x-1.5">
                          <span className="font-display text-4xl font-semibold tracking-tight text-foreground tabular-nums">
                            {moedaPtBr(plan.monthlyPrice, plan.currencyCode)}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            por mês
                          </span>
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          ou {moedaPtBr(plan.annualPrice, plan.currencyCode)}{' '}
                          por ano
                        </p>

                        <p
                          className="mt-5 text-pretty leading-relaxed text-muted-foreground"
                          style={textStyles.cardBody}
                        >
                          {plan.description}
                        </p>

                        <p
                          id={`recursos-do-plano-${plan.key}`}
                          className="mt-6 border-t border-border pt-6 text-sm font-medium text-foreground"
                        >
                          {herdaDoAnterior && anterior
                            ? `Tudo do ${anterior.name}, mais:`
                            : 'Inclui:'}
                        </p>
                        <ul
                          aria-labelledby={`plano-${plan.key} recursos-do-plano-${plan.key}`}
                          className="mt-4 flex-1 space-y-3"
                        >
                          {recursos
                            .slice(0, RECURSOS_POR_PLANO)
                            .map((feature) => (
                              <li
                                key={`${plan.key}-${feature.key}`}
                                className="flex items-start gap-3 text-sm text-foreground"
                              >
                                <Check
                                  className="mt-0.5 size-4 shrink-0 text-primary"
                                  aria-hidden="true"
                                />
                                <span className="leading-6">
                                  {feature.name}
                                </span>
                              </li>
                            ))}
                          {restantes > 0 ? (
                            <li className="pl-7 text-sm text-muted-foreground">
                              e mais {restantes}{' '}
                              {restantes === 1 ? 'recurso' : 'recursos'}
                            </li>
                          ) : null}
                        </ul>

                        <LinkDaLanding
                          href={config.hero.primaryCtaHref}
                          previewMode={previewMode}
                          comoBotao
                          className={cn(
                            buttonVariants({
                              variant: destaque ? 'default' : 'secondary',
                              size: 'lg',
                            }),
                            'mt-8 w-full'
                          )}
                        >
                          <span style={textStyles.buttonLabel}>
                            {config.plans.ctaLabel}
                          </span>
                          <span className="sr-only"> no plano {plan.name}</span>
                          <ArrowRight aria-hidden="true" />
                        </LinkDaLanding>
                      </li>
                    );
                  })}
                </ul>
              ) : null}

              {plansStatus === 'error' ? (
                <div
                  role="alert"
                  className="mx-auto mt-12 flex max-w-xl flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive-light px-6 py-6 text-center"
                >
                  <p className="text-sm font-medium text-destructive">
                    Não conseguimos carregar os planos agora.
                  </p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {plansError}
                  </p>
                  <Button
                    variant="secondary"
                    onClick={tentarCarregarPlanosDeNovo}
                  >
                    <RotateCw aria-hidden="true" /> Tentar de novo
                  </Button>
                </div>
              ) : null}
            </div>
          </section>
        );
      case 'faq':
        if (!config.faq.visible) {
          return null;
        }

        return (
          <section
            id="faq"
            aria-labelledby="titulo-faq"
            className={ESPACO_DA_SECAO}
          >
            <div
              className={cn(
                CONTEINER,
                'grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16'
              )}
            >
              <AberturaDaSecao
                id="titulo-faq"
                rotulo={config.faq.badgeText}
                titulo={config.faq.title}
                descricao={config.faq.description}
                estiloDoTitulo={textStyles.sectionTitle}
                estiloDoTexto={textStyles.sectionBody}
              />

              <Accordion type="single" collapsible className="min-w-0">
                {config.faq.items.map((item) => (
                  <AccordionItem key={item.id} value={item.id}>
                    <AccordionTrigger>{item.question}</AccordionTrigger>
                    <AccordionContent>{item.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>
        );
      case 'finalCta':
        if (!config.finalCta.visible) {
          return null;
        }

        return (
          <section aria-labelledby="titulo-chamada-final" className="pb-20">
            <div className={CONTEINER}>
              <div className="rounded-2xl border border-border bg-sidebar-accent px-6 py-14 text-center sm:px-12 sm:py-20">
                <AberturaDaSecao
                  id="titulo-chamada-final"
                  rotulo={config.finalCta.badgeText}
                  titulo={config.finalCta.title}
                  descricao={config.finalCta.description}
                  estiloDoTitulo={textStyles.sectionTitle}
                  estiloDoTexto={textStyles.sectionBody}
                  centralizada
                />
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                  <LinkDaLanding
                    href={config.finalCta.primaryHref}
                    previewMode={previewMode}
                    comoBotao
                    className={botaoPrincipal}
                  >
                    <span style={textStyles.buttonLabel}>
                      {config.finalCta.primaryLabel}
                    </span>
                    <ArrowRight aria-hidden="true" />
                  </LinkDaLanding>
                  <LinkDaLanding
                    href={config.finalCta.secondaryHref}
                    previewMode={previewMode}
                    comoBotao
                    className={botaoSecundario}
                  >
                    <span style={textStyles.buttonLabel}>
                      {config.finalCta.secondaryLabel}
                    </span>
                  </LinkDaLanding>
                </div>
              </div>
            </div>
          </section>
        );
      default:
        return null;
    }
  }

  const orderedSections = Array.from(
    new Set<LandingSectionKey>([
      ...config.sectionOrder,
      'features',
      'metrics',
      'flow',
      'plans',
      'faq',
      'finalCta',
    ])
  );

  // Escalas do construtor de UI (landing.sizing): cards do topo, itens de
  // recursos e do fluxo, planos, ícones e botões (regras em globals.css,
  // pelos atributos `data-escala` e `data-slot`).
  const escalasDaLanding = {
    '--landing-escala-hero': String(config.sizing.heroCard),
    '--landing-escala-recurso': String(config.sizing.featureCard),
    '--landing-escala-plano': String(config.sizing.planCard),
    '--landing-escala-icone': String(config.sizing.iconScale),
    '--landing-escala-botao': String(config.sizing.buttonScale),
  } as CSSProperties;

  // Na pré-visualização a landing fica dentro do <main> do painel: sem um
  // segundo <main>.
  const Principal = previewMode ? 'div' : 'main';

  return (
    <div
      className="lyra-landing min-h-screen bg-background text-foreground"
      style={escalasDaLanding}
    >
      <header
        className={cn(
          'top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75',
          previewMode ? 'relative' : 'sticky'
        )}
      >
        <div
          className={cn(
            CONTEINER,
            'flex h-16 items-center justify-between gap-3'
          )}
        >
          <LinkDaLanding
            href="#topo"
            previewMode={previewMode}
            className="flex min-w-0 items-center gap-2.5 rounded-md py-1 pr-1 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MarcaLyra tamanho="36px" prioridade />
            <span className="whitespace-nowrap font-display text-lg font-semibold lowercase leading-tight tracking-tight text-foreground">
              {config.footer.brandLine}
            </span>
            <span className="sr-only">, voltar ao topo</span>
          </LinkDaLanding>

          {itensDoMenu.length > 0 ? (
            <nav aria-label="Seções da página" className="hidden md:block">
              <ul className="flex items-center gap-1">
                {itensDoMenu.map((item) => (
                  <li key={item.href}>
                    <LinkDaLanding
                      href={item.href}
                      previewMode={previewMode}
                      className="inline-flex min-h-10 items-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {item.rotulo}
                    </LinkDaLanding>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {/* Na pré-visualização do construtor o botão mudaria o tema do
                próprio painel administrativo. */}
            {previewMode ? null : <ThemeToggleButton />}
            <LinkDaLanding
              href={config.hero.primaryCtaHref}
              previewMode={previewMode}
              comoBotao
              className={cn(
                buttonVariants({ variant: 'ghost' }),
                'hidden sm:inline-flex'
              )}
            >
              <span style={textStyles.buttonLabel}>
                {config.header.loginLabel}
              </span>
            </LinkDaLanding>
            <LinkDaLanding
              href={config.hero.primaryCtaHref}
              previewMode={previewMode}
              comoBotao
              // No celular a mesma ação fica no topo da página e no menu.
              className={cn(buttonVariants(), 'hidden sm:inline-flex')}
            >
              <span style={textStyles.buttonLabel}>
                {config.header.fullLoginLabel}
              </span>
            </LinkDaLanding>

            {itensDoMenu.length > 0 ? (
              <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    aria-label="Abrir o menu da página"
                    disabled={previewMode}
                  >
                    <Menu aria-hidden="true" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="gap-6">
                  <SheetHeader className="space-y-1 pr-10 text-left">
                    <SheetTitle className="font-display">Menu</SheetTitle>
                    <SheetDescription>
                      Vá direto para uma parte da página.
                    </SheetDescription>
                  </SheetHeader>
                  <nav aria-label="Seções da página (menu)">
                    <ul className="flex flex-col gap-1">
                      {itensDoMenu.map((item) => (
                        <li key={item.href}>
                          <SheetClose asChild>
                            <a
                              href={item.href}
                              className="flex min-h-12 items-center rounded-md px-3 text-base font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              {item.rotulo}
                            </a>
                          </SheetClose>
                        </li>
                      ))}
                    </ul>
                  </nav>
                  <div className="mt-auto flex flex-col gap-3 border-t border-border pt-6">
                    <LinkDaLanding
                      href={config.hero.primaryCtaHref}
                      previewMode={previewMode}
                      comoBotao
                      aoNavegar={() => setMenuAberto(false)}
                      className={cn(buttonVariants({ size: 'lg' }), 'w-full')}
                    >
                      {config.header.fullLoginLabel}
                    </LinkDaLanding>
                    <LinkDaLanding
                      href={config.hero.primaryCtaHref}
                      previewMode={previewMode}
                      comoBotao
                      aoNavegar={() => setMenuAberto(false)}
                      className={cn(
                        buttonVariants({ size: 'lg', variant: 'secondary' }),
                        'w-full'
                      )}
                    >
                      {config.header.loginLabel}
                    </LinkDaLanding>
                  </div>
                </SheetContent>
              </Sheet>
            ) : null}
          </div>
        </div>
      </header>

      <Principal id={previewMode ? undefined : 'conteudo-principal'}>
        {/* Topo: a promessa e a ação principal à esquerda; a entrada
            rápida à direita (abaixo, no celular). */}
        <section
          id="topo"
          aria-labelledby="titulo-da-landing"
          className="scroll-mt-20 pb-16 pt-12 sm:pb-24 sm:pt-20"
        >
          <div
            className={cn(
              CONTEINER,
              'grid gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-center lg:gap-16'
            )}
          >
            <div className="min-w-0">
              <p className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-sm font-medium text-foreground">
                <Sparkles
                  className="size-3.5 shrink-0 text-cosmic-strong"
                  aria-hidden="true"
                />
                <span className="min-w-0">{config.hero.badgeText}</span>
              </p>

              <h1
                id="titulo-da-landing"
                className="mt-6 max-w-3xl text-balance break-words font-display font-semibold leading-[1.05] tracking-[-0.035em] text-foreground"
                style={textStyles.heroTitle}
              >
                {config.hero.title}{' '}
                <span className="text-primary">{config.hero.accentTitle}</span>
              </h1>

              <p
                className="mt-6 max-w-xl text-pretty leading-relaxed text-muted-foreground"
                style={textStyles.heroBody}
              >
                {config.hero.description}
              </p>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <LinkDaLanding
                  href={config.hero.primaryCtaHref}
                  previewMode={previewMode}
                  comoBotao
                  className={botaoPrincipal}
                >
                  <span style={textStyles.buttonLabel}>
                    {config.hero.primaryCtaLabel}
                  </span>
                  <ArrowRight aria-hidden="true" />
                </LinkDaLanding>
                <LinkDaLanding
                  href={config.hero.secondaryCtaHref}
                  previewMode={previewMode}
                  comoBotao
                  className={botaoSecundario}
                >
                  <span style={textStyles.buttonLabel}>
                    {config.hero.secondaryCtaLabel}
                  </span>
                </LinkDaLanding>
              </div>
            </div>

            <Card data-escala="hero" className="min-w-0 shadow-lg">
              <CardHeader>
                <Badge variant="cosmic" className="w-fit">
                  {config.hero.quickAuthBadge}
                </Badge>
                <CardTitle as="h2" style={textStyles.cardTitle}>
                  {config.hero.quickAuthTitle}
                </CardTitle>
                <CardDescription style={textStyles.cardBody}>
                  {config.hero.quickAuthDescription}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleQuickLogin}>
                  <div className="space-y-2">
                    <Label htmlFor="landing-email">E-mail</Label>
                    <Input
                      id="landing-email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      disabled={previewMode}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="landing-password">Senha</Label>
                    <div className="relative">
                      <Input
                        id="landing-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="pr-11"
                        disabled={previewMode}
                      />
                      <button
                        type="button"
                        aria-label={
                          showPassword ? 'Ocultar senha' : 'Mostrar senha'
                        }
                        aria-pressed={showPassword}
                        onClick={() => setShowPassword((current) => !current)}
                        disabled={previewMode}
                        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                      >
                        {showPassword ? (
                          <EyeOff className="size-[18px]" aria-hidden="true" />
                        ) : (
                          <Eye className="size-[18px]" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 pt-1 sm:flex-row">
                    <Button
                      type="submit"
                      className="h-11 sm:flex-1"
                      style={textStyles.buttonLabel}
                      disabled={
                        previewMode ||
                        submitting ||
                        email.trim().length === 0 ||
                        password.trim().length === 0
                      }
                    >
                      {submitting
                        ? 'Entrando...'
                        : config.hero.quickAuthSubmitLabel}
                      <ArrowRight aria-hidden="true" />
                    </Button>
                    <LinkDaLanding
                      href={config.hero.primaryCtaHref}
                      previewMode={previewMode}
                      comoBotao
                      className={cn(
                        buttonVariants({ variant: 'secondary' }),
                        'h-11 sm:flex-1'
                      )}
                    >
                      <span style={textStyles.buttonLabel}>
                        {config.hero.quickAuthSecondaryLabel}
                      </span>
                    </LinkDaLanding>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Prévia do produto: os três sinais que a pessoa encontra no app,
            em uma faixa única (antes um cartão dentro de outro). */}
        <section
          aria-labelledby="titulo-previa"
          className="border-y border-border bg-card py-14 sm:py-16"
        >
          <div
            className={cn(
              CONTEINER,
              'grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,2.2fr)] lg:gap-16'
            )}
          >
            <div className="min-w-0">
              <p className={ROTULO_DA_SECAO}>{config.hero.previewBadge}</p>
              <h2
                id="titulo-previa"
                className="mt-3 text-balance font-display font-semibold tracking-[-0.02em] text-foreground"
                style={textStyles.cardTitle}
              >
                {config.hero.previewTitle}
              </h2>
              <p
                className="mt-3 text-pretty leading-relaxed text-muted-foreground"
                style={textStyles.cardBody}
              >
                {config.hero.previewDescription}
              </p>
            </div>
            <ul className="grid gap-8 sm:grid-cols-3 sm:gap-6">
              {config.hero.previewItems.map((item) => {
                const ItemIcon = getBuilderIcon(item.icon);

                return (
                  <li key={item.id} data-escala="hero" className="min-w-0">
                    <span
                      data-escala="icone"
                      className={cn(
                        'flex size-10 items-center justify-center rounded-md',
                        corDoIconeTonal(item.tone)
                      )}
                    >
                      <ItemIcon className="size-[18px]" aria-hidden="true" />
                    </span>
                    <h3
                      className="mt-4 font-display font-semibold text-foreground"
                      style={textStyles.cardTitle}
                    >
                      {item.title}
                    </h3>
                    <p
                      className="mt-2 text-pretty leading-relaxed text-muted-foreground"
                      style={textStyles.cardBody}
                    >
                      {item.description}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* Blocos publicados no editor Puck (documento "landing-home"), logo
            após o topo. Sem blocos publicados, nada é exibido. */}
        <PuckClientRenderer documentKey="landing-home" className="w-full" />

        {orderedSections.map((sectionKey) => (
          <div key={sectionKey}>{renderSection(sectionKey)}</div>
        ))}
      </Principal>

      <footer className="border-t border-border py-10">
        <div
          className={cn(
            CONTEINER,
            'flex flex-col gap-6 md:flex-row md:items-start md:justify-between'
          )}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <MarcaLyra tamanho="32px" />
            <p className="font-display text-base font-semibold lowercase tracking-tight text-foreground">
              {config.footer.brandLine}
            </p>
          </div>
          <p
            className="min-w-0 text-pretty leading-relaxed text-muted-foreground md:max-w-xl"
            style={textStyles.cardBody}
          >
            {config.footer.note}
          </p>
        </div>
        <nav aria-label="Documentos legais" className={cn(CONTEINER, 'mt-6')}>
          <ul className="flex flex-wrap gap-x-6 border-t border-border pt-4 text-sm text-muted-foreground">
            <li>
              <Link
                href={ROTA_POLITICA_DE_PRIVACIDADE}
                onClick={
                  previewMode ? (evento) => evento.preventDefault() : undefined
                }
                className="inline-flex min-h-11 items-center underline-offset-4 hover:text-foreground hover:underline"
              >
                Política de privacidade
              </Link>
            </li>
            <li>
              <Link
                href={ROTA_TERMOS_DE_USO}
                onClick={
                  previewMode ? (evento) => evento.preventDefault() : undefined
                }
                className="inline-flex min-h-11 items-center underline-offset-4 hover:text-foreground hover:underline"
              >
                Termos de uso
              </Link>
            </li>
          </ul>
        </nav>
      </footer>
    </div>
  );
}
