'use client';
import { PlanFeatureGate } from '@/components/subscription/PlanFeatureGate';

import * as React from 'react';
import dynamic from 'next/dynamic';
import {
  ABAS_DO_PAINEL,
  GRUPOS_DO_PAINEL,
  useAbasDoPainel,
} from '@/hooks/use-abas-do-painel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BedDouble,
  Bot,
  Droplets,
  HeartPulse,
  MoonStar,
  Sparkles,
  TimerReset,
  Waves,
  Bluetooth,
  BluetoothConnected,
} from 'lucide-react';

import { useDailyMetrics } from '@/hooks/use-daily-metrics';
import { useMetaDeSono } from '@/hooks/use-meta-de-sono';
import { resumoDoGrafico } from '@/lib/graficos/resumo';
import { useDescricoesDoPainel } from '@/hooks/use-descricoes-do-painel';
import { ExplicacoesDoPainel } from './ExplicacoesDoPainel';
import { descreverMetrica, descreverLeitura } from '@/lib/painel/catalogo';
import { useAIScores } from '@/hooks/use-ai-scores';
import { useProfile } from '@/hooks/use-profile';
import { useAccountSubscription } from '@/hooks/use-account-subscription';
import { usePublicSitePageConfig } from '@/hooks/use-public-site-page-config';
import { useHealthOrchestrator } from '@/context/HealthOrchestratorContext';
import { isPlanFeatureEnabled } from '@/lib/plans/access';
import { scaleRem } from '@/lib/site-page-config/runtime';
import { cn } from '@/lib/utils';
import { PlanUpgradeNotice } from '@/components/subscription/PlanUpgradeNotice';
import { MetricGrid } from './MetricGrid';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartFigure,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { SeuDiaCard } from '@/components/coach/SeuDiaCard';
import { BotaoRegistroDoDia } from '@/components/metricas/RegistroDoDia';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

function CarregandoAssunto() {
  return (
    <p role="status" className="py-4 text-sm text-muted-foreground">
      Carregando este assunto...
    </p>
  );
}

const AITipsCard = dynamic(
  () => import('./AITipsCard').then((modulo) => modulo.AITipsCard),
  { loading: CarregandoAssunto }
);
const LyraIntelligence2026 = dynamic(
  () =>
    import('./LyraIntelligence2026').then(
      (modulo) => modulo.LyraIntelligence2026
    ),
  { loading: CarregandoAssunto }
);
const VedicDashboard = dynamic(
  () => import('./VedicDashboard').then((modulo) => modulo.VedicDashboard),
  { loading: CarregandoAssunto }
);
const AssessmentCard = dynamic(
  () => import('./AssessmentCard').then((modulo) => modulo.AssessmentCard),
  { loading: CarregandoAssunto }
);

const weeklyChartConfig = {
  prontidao: {
    label: 'Prontidão',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function formatWeekday(date: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
  })
    .format(new Date(`${date}T12:00:00`))
    .replace('.', '');
}

/** "7h30" ou "8h" (meta de sono). */
function formatarHoras(minutos: number) {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0
    ? `${horas}h`
    : `${horas}h${String(resto).padStart(2, '0')}`;
}

const PERCENTUAL = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
  signDisplay: 'exceptZero',
});

function formatDelta(delta: number) {
  if (delta === 0 || Number.isNaN(delta)) {
    return 'Estável';
  }

  return `${PERCENTUAL.format(delta)}%`;
}

/** Variação contra o dia anterior; null quando falta um dos dois registros. */
function calculateDelta(
  current: number | null | undefined,
  previous: number | null | undefined
) {
  if (
    current === null ||
    current === undefined ||
    previous === null ||
    previous === undefined ||
    previous === 0
  ) {
    return null;
  }

  return ((current - previous) / previous) * 100;
}

function getDeltaVisual(delta: number) {
  if (delta > 0) {
    return {
      icon: ArrowUpRight,
      className: 'text-success',
    };
  }

  if (delta < 0) {
    return {
      icon: ArrowDownRight,
      className: 'text-destructive',
    };
  }

  return {
    icon: TimerReset,
    className: 'text-muted-foreground',
  };
}

function LoadingDashboard() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-80 md:col-span-2" />
        <Skeleton className="h-80 md:col-span-2" />
        <Skeleton className="h-72 xl:col-span-2" />
        <Skeleton className="h-72 xl:col-span-2" />
        <Skeleton className="h-72 md:col-span-2 xl:col-span-4" />
      </div>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
      <Skeleton className="h-96" />
      <Skeleton className="h-144" />
    </div>
  );
}

interface MiniMetricCardProps {
  title: string;
  value: string;
  description: string;
  tone: 'primary' | 'warning' | 'info' | 'success' | 'golden';
  icon: React.ElementType;
  /** null: sem registro hoje ou ontem para comparar. */
  delta: number | null;
}

/** Fundo suave + ícone de cada tom (o coral fica só para astral/IA). */
const miniMetricToneStyles: Record<MiniMetricCardProps['tone'], string> = {
  primary: 'bg-sidebar-accent text-primary',
  warning: 'bg-warning-light text-warning',
  info: 'bg-info-light text-info',
  success: 'bg-success-light text-success',
  golden: 'bg-golden-light text-golden',
};

function MiniMetricCard({
  title,
  value,
  description,
  tone,
  icon: Icon,
  delta,
}: MiniMetricCardProps) {
  const deltaVisual = delta === null ? null : getDeltaVisual(delta);
  const DeltaIcon = deltaVisual?.icon ?? null;

  return (
    <Card className="min-w-0">
      <CardContent className="flex h-full flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 text-sm font-medium text-muted-foreground">
            {title}
          </p>
          <div
            aria-hidden="true"
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-full',
              miniMetricToneStyles[tone]
            )}
          >
            <Icon className="size-4" />
          </div>
        </div>

        <p className="break-words font-display text-4xl font-semibold tracking-[-0.03em] text-foreground">
          {value}
        </p>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="min-w-0 text-caption leading-5 text-muted-foreground">
            {description}
          </p>
          {delta !== null && deltaVisual && DeltaIcon ? (
            <div
              className={cn(
                'flex shrink-0 items-center gap-1',
                deltaVisual.className
              )}
            >
              <DeltaIcon aria-hidden="true" className="size-4" />
              <span className="text-caption font-medium">
                {formatDelta(delta)}
                <span className="sr-only"> em relação a ontem</span>
              </span>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

const HarmoniaAtualCard = dynamic(
  () =>
    import('./HarmoniaAtualCard').then((modulo) => modulo.HarmoniaAtualCard),
  { loading: CarregandoAssunto }
);

export function Dashboard() {
  const { aba: solicitada, grupo, selecionar } = useAbasDoPainel();
  const { config: appConfig } = usePublicSitePageConfig('app');
  const { data: subscription, loading: subscriptionLoading } =
    useAccountSubscription();
  const {
    astrology,
    isSyncing,
    syncError,
    vitals,
    triggerManualSync,
    bluetoothConnect,
    bluetoothDisconnect,
    isBluetoothConnected,
  } = useHealthOrchestrator();

  const dashboardEnabled = isPlanFeatureEnabled(
    subscription,
    'dashboard_access'
  );
  const aiScoresEnabled = isPlanFeatureEnabled(subscription, 'ai_scores');
  const aiTipsEnabled = isPlanFeatureEnabled(subscription, 'ai_tips_feed');

  const comHistorico = isPlanFeatureEnabled(
    subscription,
    'metrics_history_days'
  );
  const explicacoes = useDescricoesDoPainel(
    dashboardEnabled &&
      comHistorico &&
      isPlanFeatureEnabled(subscription, 'health_intelligence')
  );
  const {
    metrics,
    todayMetrics,
    loading: metricsLoading,
    error: erroMetricas,
    refresh: relerMetricas,
  } = useDailyMetrics(7, dashboardEnabled && comHistorico);
  const {
    scores,
    loading: scoresLoading,
    error: erroEscores,
    refresh: relerEscores,
  } = useAIScores(aiScoresEnabled);
  const {
    profile: intelligenceProfile,
    chronologicalAge,
    isFemale,
  } = useProfile(dashboardEnabled && solicitada === 'orientacoes');

  const { meta: metaDeSono } = useMetaDeSono();

  const loading = subscriptionLoading || metricsLoading || scoresLoading;

  const previousMetrics =
    metrics.length > 1 ? metrics[metrics.length - 2] : null;

  const readinessScore = aiScoresEnabled
    ? (scores?.readinessScore ?? todayMetrics?.readiness_score ?? null)
    : null;
  const longevityScore = scores?.longevityScore ?? null;
  // Sem dados, "—". Sem os scores no plano, a longevidade nem aparece.
  const rotuloDaLongevidade =
    longevityScore !== null
      ? longevityScore.toLocaleString('pt-BR', {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })
      : '—';
  const detalheDaLongevidade =
    scores && longevityScore !== null
      ? `Escala de 0 a 10, com ${scores.cobertura} de ${scores.totalDeMetricas} métricas medidas hoje.`
      : `Precisa de pelo menos 3 métricas medidas hoje${
          scores ? ` (agora: ${scores.cobertura})` : ''
        }.`;
  const sleepMinutes = todayMetrics?.sleep_duration_minutes ?? null;
  const deepSleepMinutes = todayMetrics?.deep_sleep_minutes ?? null;
  const remSleepMinutes = todayMetrics?.rem_sleep_minutes ?? null;
  // Meta de sono da própria pessoa (ou a sugestão do catálogo de metas);
  // antes, 8 horas fixas para todos.
  const sleepGoalMinutes = metaDeSono.minutos;
  const rotuloDaMetaDeSono = `${formatarHoras(sleepGoalMinutes)} por noite${
    metaDeSono.origem === 'sugestao' ? ' (sugestão)' : ''
  }`;
  const sleepProgress =
    sleepMinutes === null
      ? 0
      : Math.min(100, Math.round((sleepMinutes / sleepGoalMinutes) * 100));
  const stepsDelta = calculateDelta(
    todayMetrics?.steps,
    previousMetrics?.steps
  );
  const hydrationDelta = calculateDelta(
    todayMetrics?.water_liters,
    previousMetrics?.water_liters
  );
  const meditationDelta = calculateDelta(
    todayMetrics?.meditation_minutes,
    previousMetrics?.meditation_minutes
  );
  const glucoseDelta = calculateDelta(
    todayMetrics?.blood_glucose_mgdl,
    previousMetrics?.blood_glucose_mgdl
  );

  const hrvHoje = todayMetrics?.hrv_ms ?? null;
  const pulseValue = hrvHoje ?? readinessScore ?? null;
  const pulseUnit = hrvHoje !== null ? 'ms' : '/100';
  const pulseLabel =
    hrvHoje !== null ? 'Variabilidade cardíaca' : 'Prontidão geral';

  // Uma única grandeza no gráfico (tarefa 57): VFC em ms quando há VFC na
  // semana; senão, a prontidão de 0 a 100. Antes a mesma linha misturava ms
  // e pontuação, dia a dia. Dias sem registro ficam null (lacuna), nunca 0.
  const trajetoriaPelaVfc = metrics.some((metric) => metric.hrv_ms !== null);
  const serieDaTrajetoria = trajetoriaPelaVfc
    ? { rotulo: 'Variabilidade cardíaca (VFC)', unidade: 'ms' }
    : { rotulo: 'Prontidão geral', unidade: '/100' };
  const pulseTrendData = metrics.map((metric) => ({
    dia: formatWeekday(metric.date),
    pulso: trajetoriaPelaVfc ? metric.hrv_ms : metric.readiness_score,
  }));
  const temTrajetoria = pulseTrendData.some((ponto) => ponto.pulso !== null);
  const configDaTrajetoria = {
    pulso: { label: serieDaTrajetoria.rotulo, color: 'hsl(var(--primary))' },
  } satisfies ChartConfig;

  const weeklyFlowData = metrics.map((metric) => {
    const valor = metric.readiness_score ?? metric.recovery_score;
    return {
      dia: formatWeekday(metric.date),
      prontidao: valor === null ? null : Math.round(valor),
    };
  });
  const temSemana = weeklyFlowData.some((ponto) => ponto.prontidao !== null);

  const passosHoje = todayMetrics?.steps ?? null;
  const aguaHoje = todayMetrics?.water_liters ?? null;
  const meditacaoHoje = todayMetrics?.meditation_minutes ?? null;
  const glicoseHoje = todayMetrics?.blood_glucose_mgdl ?? null;

  const miniMetrics: MiniMetricCardProps[] = [
    {
      title: 'Passos do dia',
      value: passosHoje === null ? '—' : passosHoje.toLocaleString('pt-BR'),
      description: descreverMetrica(
        'steps',
        todayMetrics ?? {},
        explicacoes.data?.descricoes
      ),
      tone: 'primary',
      icon: Activity,
      delta: stepsDelta,
    },
    {
      title: 'Hidratação',
      value:
        aguaHoje === null
          ? '—'
          : `${aguaHoje.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L`,
      description: descreverMetrica(
        'water_liters',
        todayMetrics ?? {},
        explicacoes.data?.descricoes
      ),
      tone: 'info',
      icon: Droplets,
      delta: hydrationDelta,
    },
    {
      title: 'Meditação',
      value: meditacaoHoje === null ? '—' : `${meditacaoHoje} min`,
      description: descreverMetrica(
        'meditation_minutes',
        todayMetrics ?? {},
        explicacoes.data?.descricoes
      ),
      tone: 'success',
      icon: Waves,
      delta: meditationDelta,
    },
    {
      title: 'Glicose atual',
      value:
        glicoseHoje === null
          ? '—'
          : `${glicoseHoje.toLocaleString('pt-BR')} mg/dL`,
      description:
        glicoseHoje === null
          ? 'Sem leitura hoje: registre no check-in ou conecte o sensor.'
          : 'Leitura disponível do metabolismo do dia.',
      tone: 'golden',
      icon: Sparkles,
      delta: glucoseDelta,
    },
  ];

  const syncBadgeVariant = isSyncing
    ? 'info'
    : syncError
      ? 'warning'
      : 'success';

  const syncBadgeLabel = isSyncing
    ? appConfig.dashboard.syncStatusLoading
    : syncError
      ? appConfig.dashboard.syncStatusPartial
      : appConfig.dashboard.syncStatusReady;

  const syncSummary = isSyncing
    ? 'Atualizando os registros disponíveis da sua conta.'
    : syncError
      ? syncError
      : todayMetrics?.registrado
        ? 'Leitura consolidada com os registros de hoje, do dispositivo e da sua conta.'
        : 'Ainda não há registro hoje: faça o check-in ou conecte um dispositivo.';

  const astroTitle = 'Sua reflexão do dia';
  const astroDetail = descreverLeitura(
    'leitura_reflexao',
    explicacoes.data?.descricoes
  );

  const handleSyncNow = async () => {
    await Promise.all([
      triggerManualSync(),
      relerMetricas(),
      relerEscores(),
      explicacoes.refresh(),
    ]);
  };

  if (subscriptionLoading) {
    return <LoadingDashboard />;
  }

  if (!subscription || !dashboardEnabled) {
    return (
      <PlanUpgradeNotice
        currentPlanKey={subscription?.plan.key ?? 'free'}
        title="Painel completo indisponível"
        description="O painel completo não faz parte do seu plano atual. Conheça os planos que incluem esta visão."
      />
    );
  }

  const comOrientacoes =
    aiTipsEnabled ||
    isPlanFeatureEnabled(subscription, 'health_intelligence') ||
    isPlanFeatureEnabled(subscription, 'vedic_insights');
  const comAvaliacoes = isPlanFeatureEnabled(
    subscription,
    'wellbeing_assessments'
  );
  const abas = ABAS_DO_PAINEL.filter(
    (item) =>
      (item.id !== 'orientacoes' || comOrientacoes) &&
      (item.id !== 'avaliacoes' || comAvaliacoes)
  );
  const aba = abas.some((item) => item.id === solicitada)
    ? solicitada
    : 'resumo';
  const avisoDeFalha =
    erroMetricas || erroEscores ? (
      <Card role="alert">
        <CardHeader>
          <CardTitle>Não foi possível carregar seu painel</CardTitle>
          <CardDescription>
            Seus registros continuam salvos. Tente carregar novamente para
            consultar os valores.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => void handleSyncNow()}>Tentar novamente</Button>
        </CardContent>
      </Card>
    ) : null;
  const resumo: Array<MiniMetricCardProps & { grupo: string }> = [
    {
      title: 'Seu sono',
      value: sleepMinutes === null ? '—' : formatMinutes(sleepMinutes),
      description: descreverMetrica(
        'sleep_duration_minutes',
        todayMetrics ?? {},
        explicacoes.data?.descricoes
      ),
      tone: 'info',
      icon: BedDouble,
      delta: null,
      grupo: 'sono',
    },
    {
      title: 'Seu movimento',
      value: passosHoje === null ? '—' : passosHoje.toLocaleString('pt-BR'),
      description: descreverMetrica(
        'steps',
        todayMetrics ?? {},
        explicacoes.data?.descricoes
      ),
      tone: 'primary',
      icon: Activity,
      delta: stepsDelta,
      grupo: 'movimento',
    },
    {
      title: 'Sua disposição',
      value: readinessScore === null ? '—' : String(Math.round(readinessScore)),
      description: descreverMetrica(
        'readiness_score',
        todayMetrics ?? {},
        explicacoes.data?.descricoes
      ),
      tone: 'success',
      icon: HeartPulse,
      delta: null,
      grupo: 'recuperacao',
    },
  ];
  return (
    <ExplicacoesDoPainel.Provider value={explicacoes.data?.descricoes ?? {}}>
      <div className="flex min-w-0 flex-col gap-5 pb-24" aria-busy={loading}>
        {avisoDeFalha}
        {comHistorico &&
          isPlanFeatureEnabled(subscription, 'health_intelligence') && (
            <div
              className="rounded-md border border-border bg-card p-3 text-sm text-muted-foreground"
              role="status"
            >
              {explicacoes.loading
                ? 'Preparando suas explicações...'
                : explicacoes.error
                  ? 'Não foi possível atualizar as explicações. Seus valores continuam preservados.'
                  : {
                      pronto:
                        'Explicações preparadas pelo modelo conectado, com seus registros atuais.',
                      sem_modelo:
                        'Nenhum modelo autorizado está disponível. Você está vendo as explicações do catálogo, sem geração por IA.',
                      privado:
                        'Modo privado: explicações do catálogo, sem enviar seus registros a um modelo.',
                      atualizando:
                        'Uma atualização das explicações já está em andamento.',
                      limite:
                        'As atualizações automáticas de hoje atingiram o limite. Seus valores continuam disponíveis.',
                      falha:
                        'O modelo não entregou explicações válidas agora. Mantivemos as definições do catálogo.',
                    }[explicacoes.data?.estado ?? 'sem_modelo']}
              {(explicacoes.error || explicacoes.data?.estado === 'falha') && (
                <Button
                  className="ml-2"
                  variant="outline"
                  onClick={() => void explicacoes.refresh()}
                >
                  Tentar atualizar explicações
                </Button>
              )}
            </div>
          )}
        {loading && (
          <p role="status" className="text-sm text-muted-foreground">
            Atualizando seus registros e índices...
          </p>
        )}
        <Tabs
          value={aba}
          onValueChange={selecionar}
          activationMode="manual"
          className="min-w-0"
          hidden={metricsLoading && metrics.length === 0}
        >
          <TabsList
            aria-label="Assuntos do seu painel"
            className="flex h-auto w-full flex-wrap justify-start gap-1 p-1"
          >
            {abas.map((item) => (
              <TabsTrigger
                key={item.id}
                value={item.id}
                className="min-h-11 flex-1"
              >
                {item.nome}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <Badge variant={syncBadgeVariant}>{syncBadgeLabel}</Badge>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {syncSummary}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <BotaoRegistroDoDia />
              <PlanFeatureGate
                features={['wearable_bluetooth_connection']}
                ocultar
              >
                <Button
                  variant="outline"
                  onClick={() =>
                    isBluetoothConnected
                      ? bluetoothDisconnect()
                      : void bluetoothConnect()
                  }
                >
                  {isBluetoothConnected ? (
                    <BluetoothConnected aria-hidden="true" />
                  ) : (
                    <Bluetooth aria-hidden="true" />
                  )}
                  {isBluetoothConnected ? 'Cinta conectada' : 'Conectar cinta'}
                </Button>
              </PlanFeatureGate>
              <Button
                variant="secondary"
                onClick={() => void handleSyncNow()}
                disabled={isSyncing}
                aria-busy={isSyncing}
              >
                <TimerReset aria-hidden="true" />
                {isSyncing
                  ? 'Atualizando...'
                  : appConfig.dashboard.syncButtonLabel}
              </Button>
            </div>
          </div>
          <TabsContent value="resumo" className="space-y-5">
            <div>
              <h2 className="font-display text-xl font-semibold">
                Seu dia em um olhar
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                O essencial para começar. Escolha um assunto nas abas para ver
                os detalhes.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {resumo
                .filter(
                  (metric) => metric.grupo !== 'recuperacao' || aiScoresEnabled
                )
                .map(({ grupo: destino, ...metric }) => (
                  <div
                    key={metric.title}
                    className="flex min-w-0 flex-col gap-2"
                  >
                    <MiniMetricCard {...metric} />
                    <Button
                      variant="outline"
                      className="min-h-11"
                      onClick={() => selecionar('registros', destino)}
                    >
                      Ver {destino === 'recuperacao' ? 'recuperação' : destino}
                    </Button>
                  </div>
                ))}
            </div>
          </TabsContent>
          <TabsContent value="registros" className="space-y-5">
            <div className="max-w-sm space-y-2">
              <label
                htmlFor="grupo-das-metricas"
                className="text-sm font-medium"
              >
                Quais registros você quer ver?
              </label>
              <select
                id="grupo-das-metricas"
                value={grupo}
                onChange={(evento) =>
                  selecionar('registros', evento.target.value)
                }
                className="min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"
              >
                {GRUPOS_DO_PAINEL.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
              </select>
            </div>
            {grupo === 'recuperacao' && (
              <Card className="min-w-0 md:col-span-2">
                <CardHeader className="gap-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-col gap-3">
                      <Badge variant="default" className="self-start">
                        {appConfig.dashboard.pulseBadge}
                      </Badge>
                      <div className="flex flex-col gap-1">
                        <CardTitle
                          className="md:text-3xl"
                          style={{
                            fontSize: scaleRem(
                              1.5,
                              appConfig.typography.pageTitle
                            ),
                          }}
                        >
                          {appConfig.dashboard.pulseTitle}
                        </CardTitle>
                        <CardDescription
                          className="max-w-2xl"
                          style={{
                            fontSize: scaleRem(
                              0.95,
                              appConfig.typography.pageBody
                            ),
                          }}
                        >
                          {appConfig.dashboard.pulseDescription}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {pulseLabel}
                    </p>
                    <p className="font-display text-4xl font-semibold tracking-[-0.03em] text-foreground">
                      {pulseValue !== null ? Math.round(pulseValue) : '—'}
                      {pulseValue !== null ? (
                        <span className="ml-1 text-base font-medium text-muted-foreground">
                          {pulseUnit}
                        </span>
                      ) : null}
                    </p>
                    {pulseValue === null ? (
                      <p className="text-caption text-muted-foreground">
                        Sem VFC nem prontidão hoje: faça o check-in ou conecte a
                        pulseira.
                      </p>
                    ) : null}
                    {pulseValue !== null && pulseUnit === '/100' ? (
                      <Progress
                        aria-label="Prontidão geral de 0 a 100"
                        value={Math.min(100, Math.round(pulseValue))}
                        className="h-1.5"
                      />
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <div className="rounded-full border border-border bg-background px-3 py-1.5 text-caption text-foreground">
                      FC repouso:{' '}
                      <span className="font-semibold">
                        {todayMetrics?.resting_heart_rate
                          ? `${todayMetrics.resting_heart_rate} bpm`
                          : vitals?.heartRate
                            ? `${Math.round(vitals.heartRate)} bpm`
                            : 'Sem leitura'}
                      </span>
                    </div>
                    {aiScoresEnabled ? (
                      <div className="rounded-full border border-border bg-background px-3 py-1.5 text-caption text-foreground">
                        Longevidade:{' '}
                        <span className="font-semibold">
                          {rotuloDaLongevidade}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-2 rounded-md border border-border bg-background p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <HeartPulse
                          aria-hidden="true"
                          className="size-4 text-primary"
                        />
                        <span className="text-sm font-semibold text-foreground">
                          Estado atual
                        </span>
                      </div>
                      <Badge variant={syncBadgeVariant}>{syncBadgeLabel}</Badge>
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {syncSummary}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            {grupo === 'sono' && (
              <Card className="min-w-0 xl:col-span-2">
                <CardHeader className="gap-4">
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="info">Sono registrado</Badge>
                    <div
                      aria-hidden="true"
                      className="flex size-9 items-center justify-center rounded-full bg-info-light text-info"
                    >
                      <BedDouble className="size-4" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <CardTitle className="text-4xl tracking-[-0.03em]">
                      {sleepMinutes !== null
                        ? formatMinutes(sleepMinutes)
                        : 'Sem dados'}
                    </CardTitle>
                    <CardDescription>
                      {sleepMinutes !== null
                        ? appConfig.dashboard.sleepDescription
                        : appConfig.dashboard.sleepEmptyDescription}
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">
                        {appConfig.dashboard.sleepGoalLabel}
                      </span>
                      <span className="font-medium text-foreground">
                        {rotuloDaMetaDeSono}
                      </span>
                    </div>
                    <Progress
                      aria-label={`Sono em relação à meta de ${formatarHoras(sleepGoalMinutes)}`}
                      value={sleepProgress}
                    />
                    {metaDeSono.origem === 'sugestao' ? (
                      <p className="text-caption leading-5 text-muted-foreground">
                        Crie a meta “Sono por noite” em Metas para usar o seu
                        alvo.
                      </p>
                    ) : null}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-md border border-border bg-background p-4">
                      <p className="text-sm font-medium text-muted-foreground">
                        {appConfig.dashboard.deepSleepLabel}
                      </p>
                      <p className="mt-1 font-display text-2xl font-semibold tracking-[-0.03em] text-foreground">
                        {deepSleepMinutes !== null
                          ? formatMinutes(deepSleepMinutes)
                          : '—'}
                      </p>
                    </div>
                    <div className="rounded-md border border-border bg-background p-4">
                      <p className="text-sm font-medium text-muted-foreground">
                        {appConfig.dashboard.remSleepLabel}
                      </p>
                      <p className="mt-1 font-display text-2xl font-semibold tracking-[-0.03em] text-foreground">
                        {remSleepMinutes !== null
                          ? formatMinutes(remSleepMinutes)
                          : '—'}
                      </p>
                    </div>
                  </div>

                  <p className="text-caption leading-5 text-muted-foreground">
                    {descreverMetrica(
                      'sleep_duration_minutes',
                      todayMetrics ?? {},
                      explicacoes.data?.descricoes
                    )}
                  </p>
                </CardContent>
              </Card>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              {miniMetrics
                .filter(
                  (_, indice) =>
                    ({ movimento: 0, alimentacao: 1, mente: 2, glicose: 3 })[
                      grupo as 'movimento' | 'alimentacao' | 'mente' | 'glicose'
                    ] === indice
                )
                .map((metric) => (
                  <MiniMetricCard key={metric.title} {...metric} />
                ))}
            </div>
            {todayMetrics?.registrado ? (
              <section className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-foreground">
                    {appConfig.dashboard.pillarsTitle}
                  </h2>
                  <p className="max-w-3xl text-body leading-relaxed text-muted-foreground">
                    {appConfig.dashboard.pillarsDescription}
                  </p>
                </div>
                <MetricGrid
                  metrics={
                    aiScoresEnabled
                      ? todayMetrics
                      : {
                          ...todayMetrics,
                          readiness_score: null,
                          recovery_score: null,
                        }
                  }
                  grupo={grupo}
                  descricoes={explicacoes.data?.descricoes}
                />
              </section>
            ) : (
              <Card className="border-dashed">
                <CardHeader className="gap-3">
                  <CardTitle className="text-2xl">
                    {appConfig.dashboard.emptyMetricsTitle}
                  </CardTitle>
                  <CardDescription>
                    {appConfig.dashboard.emptyMetricsDescription}
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="evolucao" className="space-y-5">
            <Card className="flex min-w-0 flex-col md:col-span-2">
              <CardHeader className="gap-1">
                <CardTitle>Trajetória recente</CardTitle>
                <CardDescription>
                  {serieDaTrajetoria.rotulo} nos últimos 7 dias (
                  {serieDaTrajetoria.unidade === 'ms' ? 'em ms' : 'de 0 a 100'}
                  ).
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                {temTrajetoria ? (
                  <ChartFigure
                    resumo={resumoDoGrafico('Trajetória dos últimos 7 dias', [
                      {
                        nome: serieDaTrajetoria.rotulo,
                        valores: pulseTrendData.map((ponto) => ponto.pulso),
                        unidade: serieDaTrajetoria.unidade,
                      },
                    ])}
                  >
                    <ChartContainer
                      config={configDaTrajetoria}
                      className="aspect-auto h-64 w-full border-none bg-transparent p-0"
                    >
                      <AreaChart
                        data={pulseTrendData}
                        margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
                      >
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="dia"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={12}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          width={40}
                          allowDecimals={false}
                          domain={
                            serieDaTrajetoria.unidade === '/100'
                              ? [0, 100]
                              : ['auto', 'auto']
                          }
                          unit={serieDaTrajetoria.unidade === 'ms' ? ' ms' : ''}
                        />
                        <ChartTooltip
                          cursor={false}
                          content={<ChartTooltipContent />}
                        />
                        <Area
                          type="monotone"
                          dataKey="pulso"
                          stroke="var(--color-pulso)"
                          fill="var(--color-pulso)"
                          fillOpacity={0.1}
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ChartContainer>
                  </ChartFigure>
                ) : (
                  <div className="flex min-h-48 flex-1 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-background p-6 text-center">
                    <Activity
                      aria-hidden="true"
                      className="size-6 text-muted-foreground"
                    />
                    <p className="text-sm text-muted-foreground">
                      Ainda não há leituras suficientes para desenhar a
                      trajetória.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="min-w-0">
              <CardHeader className="gap-3">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-col gap-2">
                    <Badge variant="secondary" className="self-start">
                      {appConfig.dashboard.weeklyBadge}
                    </Badge>
                    <CardTitle className="text-2xl">
                      {appConfig.dashboard.weeklyTitle}
                    </CardTitle>
                    <CardDescription>
                      {appConfig.dashboard.weeklyDescription}
                    </CardDescription>
                  </div>
                  {/* Só aparece quando o plano inclui os scores de IA. */}
                  {aiScoresEnabled ? (
                    <div className="flex flex-wrap items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-caption text-muted-foreground">
                      <Bot aria-hidden="true" className="size-4 text-accent" />
                      {appConfig.dashboard.aiUnlockedLabel}:{' '}
                      <span className="font-semibold text-foreground">
                        {appConfig.dashboard.aiUnlockedYes}
                      </span>
                    </div>
                  ) : null}
                </div>
              </CardHeader>

              <CardContent className="flex flex-col gap-6">
                {temSemana ? (
                  <ChartFigure
                    resumo={resumoDoGrafico('Prontidão nos últimos 7 dias', [
                      {
                        nome: 'Prontidão',
                        valores: weeklyFlowData.map((ponto) => ponto.prontidao),
                        unidade: '/100',
                      },
                    ])}
                  >
                    <ChartContainer
                      config={weeklyChartConfig}
                      className="aspect-auto h-72 w-full border-none bg-transparent p-0 md:h-80"
                    >
                      <AreaChart
                        data={weeklyFlowData}
                        margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
                      >
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="dia"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={12}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          width={36}
                          domain={[0, 100]}
                          ticks={[0, 50, 100]}
                        />
                        <ChartTooltip
                          cursor={false}
                          content={<ChartTooltipContent />}
                        />
                        <Area
                          type="monotone"
                          dataKey="prontidao"
                          stroke="var(--color-prontidao)"
                          fill="var(--color-prontidao)"
                          fillOpacity={0.1}
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ChartContainer>
                  </ChartFigure>
                ) : (
                  <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-background p-6 text-center">
                    <Activity
                      aria-hidden="true"
                      className="size-6 text-muted-foreground"
                    />
                    <p className="text-sm text-muted-foreground">
                      Ainda não há leituras da semana para exibir a prontidão.
                    </p>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="flex flex-col gap-2 rounded-md border border-border p-4">
                    <p className="text-sm font-medium text-muted-foreground">
                      {appConfig.dashboard.currentReadinessLabel}
                    </p>
                    <p className="font-display text-4xl font-semibold tracking-[-0.03em] text-foreground">
                      {readinessScore !== null
                        ? Math.round(readinessScore)
                        : '—'}
                      {readinessScore !== null ? (
                        <span className="ml-1 text-base font-medium text-muted-foreground">
                          /100
                        </span>
                      ) : null}
                    </p>
                    {readinessScore === null ? (
                      <p className="text-caption text-muted-foreground">
                        Registre ao menos dois sinais hoje (sono, energia,
                        humor, estresse ou a pulseira).
                      </p>
                    ) : null}
                    {readinessScore !== null ? (
                      <Progress
                        aria-label="Prontidão atual de 0 a 100"
                        value={Math.min(100, Math.round(readinessScore))}
                        className="h-1.5"
                      />
                    ) : null}
                  </div>
                  {aiScoresEnabled ? (
                    <div className="flex flex-col gap-2 rounded-md border border-border p-4">
                      <p className="text-sm font-medium text-muted-foreground">
                        {appConfig.dashboard.longevityLabel}
                      </p>
                      <p className="font-display text-4xl font-semibold tracking-[-0.03em] text-foreground">
                        {rotuloDaLongevidade}
                      </p>
                      <p className="text-caption text-muted-foreground">
                        {detalheDaLongevidade}
                      </p>
                    </div>
                  ) : null}
                  <div className="flex flex-col gap-2 rounded-md border border-border p-4">
                    <p className="text-sm font-medium text-muted-foreground">
                      {appConfig.dashboard.liveContextLabel}
                    </p>
                    <p className="text-body leading-relaxed text-foreground/80">
                      {descreverLeitura(
                        'leitura_reflexao',
                        explicacoes.data?.descricoes
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          {comOrientacoes && (
            <TabsContent value="orientacoes" className="space-y-5">
              <PlanFeatureGate
                features={['ai_tips_feed', 'vedic_insights', 'ai_scores']}
                ocultar
              >
                <SeuDiaCard noPainel />
              </PlanFeatureGate>
              <PlanFeatureGate features={['vedic_insights']} ocultar>
                <HarmoniaAtualCard appConfig={appConfig} />
                <Card className="min-w-0 xl:col-span-2">
                  <CardHeader className="gap-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <MoonStar
                          aria-hidden="true"
                          className="size-5 shrink-0 text-cosmic"
                        />
                        <Badge variant="cosmic">Sua reflexão</Badge>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <CardTitle className="text-2xl">{astroTitle}</CardTitle>
                      <p className="text-body leading-relaxed text-foreground/80">
                        {astroDetail}
                      </p>
                    </div>
                  </CardHeader>

                  <CardContent className="flex flex-col gap-4">
                    {astrology?.nakshatra ||
                    astrology?.paksha ||
                    astrology?.tithi ? (
                      <details>
                        <summary className="cursor-pointer text-sm">
                          Consultar os dados técnicos da leitura
                        </summary>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {[
                            astrology?.nakshatra,
                            astrology?.paksha,
                            astrology?.tithi,
                          ]
                            .filter((chip): chip is string => Boolean(chip))
                            .map((chip, index) => (
                              <span
                                key={`${index}-${chip}`}
                                className="rounded-full bg-cosmic-light px-2.5 py-1 text-caption font-medium text-cosmic-strong"
                              >
                                {chip}
                              </span>
                            ))}
                        </div>
                      </details>
                    ) : null}

                    <div className="rounded-md border border-border bg-background p-4">
                      <p className="text-sm font-medium text-muted-foreground">
                        Sobre esta reflexão
                      </p>
                      <p className="mt-2 text-body leading-relaxed text-foreground/80">
                        {descreverLeitura(
                          'leitura_reflexao',
                          explicacoes.data?.descricoes
                        )}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </PlanFeatureGate>
              {aiTipsEnabled ? (
                <div className="md:col-span-2 xl:col-span-4">
                  <AITipsCard
                    className="h-full"
                    featureEnabled={aiTipsEnabled}
                    currentPlanKey={subscription.plan.key}
                  />
                </div>
              ) : null}
              <PlanFeatureGate features={['health_intelligence']} ocultar>
                {' '}
                <LyraIntelligence2026
                  metrics={metrics}
                  todayMetrics={todayMetrics}
                  profile={intelligenceProfile}
                  chronologicalAge={chronologicalAge}
                  isFemale={isFemale}
                  readinessScore={readinessScore}
                />
              </PlanFeatureGate>
              <PlanFeatureGate features={['vedic_insights']} ocultar>
                <VedicDashboard featureEnabled={dashboardEnabled} />
              </PlanFeatureGate>
            </TabsContent>
          )}
          {comAvaliacoes && (
            <TabsContent value="avaliacoes" className="space-y-5">
              <section className="flex flex-col gap-5">
                <PlanFeatureGate features={['wellbeing_assessments']} ocultar>
                  <AssessmentCard />
                </PlanFeatureGate>
              </section>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </ExplicacoesDoPainel.Provider>
  );
}
