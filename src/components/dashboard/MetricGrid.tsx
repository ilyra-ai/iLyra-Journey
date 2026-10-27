'use client';
import {
  GRUPOS_DO_PAINEL,
  type GrupoDoPainel,
} from '@/hooks/use-abas-do-painel';

import {
  descreverMetrica,
  type DescricoesDasMetricas,
} from '@/lib/painel/catalogo';

import type { ElementType } from 'react';
import {
  Activity,
  BedDouble,
  Brain,
  Droplet,
  RefreshCw,
  Smile,
  Utensils,
} from 'lucide-react';

import { DailyMetric } from '@/hooks/use-daily-metrics';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { decimalPtBr } from '@/lib/formato/numero';
import { cn } from '@/lib/utils';

// Tons de estado do Lyra Clean. O coral (cosmic) fica reservado a
// conteúdo astral/IA, por isso os pilares fisiológicos não o usam.
type ToneKey =
  'primary' | 'warning' | 'info' | 'destructive' | 'golden' | 'success';

interface PillarMetric {
  title: string;
  value: string;
  description: string;
}

interface PillarConfig {
  title: string;
  description: string;
  icon: ElementType;
  tone: ToneKey;
  metrics: PillarMetric[];
}

const toneStyles: Record<
  ToneKey,
  {
    badge:
      'default' | 'warning' | 'destructive' | 'info' | 'golden' | 'success';
    icon: string;
  }
> = {
  primary: {
    badge: 'default',
    icon: 'bg-sidebar-accent text-primary',
  },
  warning: {
    badge: 'warning',
    icon: 'bg-warning-light text-warning',
  },
  info: {
    badge: 'info',
    icon: 'bg-info-light text-info',
  },
  destructive: {
    badge: 'destructive',
    icon: 'bg-destructive-light text-destructive',
  },
  golden: {
    badge: 'golden',
    icon: 'bg-golden-light text-golden',
  },
  success: {
    badge: 'success',
    icon: 'bg-success-light text-success',
  },
};

const hasMetricValue = (value: number | null | undefined): value is number =>
  value !== null && value !== undefined && Number.isFinite(value);

// Métrica não registrada: valor "—" e status "sem registro" (antes o valor
// ausente virava 0 e ganhava rótulos como "Ótimo", "Seguro" ou "Saudável").
const SEM_VALOR = '—';

const formatNumber = (
  value: number | null | undefined,
  formatter: (input: number) => string
) => (hasMetricValue(value) ? formatter(value) : SEM_VALOR);

const formatMinutesToHours = (minutes: number | null | undefined) =>
  formatNumber(minutes, (input) => {
    const hours = Math.floor(input / 60);
    const mins = Math.round(input % 60);
    return `${hours}h ${mins}m`;
  });

const formatInteger = (value: number | null | undefined) =>
  formatNumber(value, (input) => Math.round(input).toLocaleString('pt-BR'));

const formatDecimal = (
  value: number | null | undefined,
  digits = 1,
  suffix = ''
) =>
  formatNumber(value, (input) => {
    const space = suffix ? ' ' : '';
    return `${decimalPtBr(input, digits)}${space}${suffix}`.trim();
  });

const formatPercent = (value: number | null | undefined, digits = 1) =>
  formatNumber(value, (input) => `${decimalPtBr(input, digits)}%`);

const formatScore = (
  value: number | null | undefined,
  total: number,
  digits = 0
) => formatNumber(value, (input) => `${decimalPtBr(input, digits)}/${total}`);

function MetricTile({ metric }: { metric: PillarMetric }) {
  return (
    <div className="min-w-0 rounded-md border border-border bg-background p-4">
      <div className="flex h-full flex-col gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-sm font-medium text-muted-foreground">
            {metric.title}
          </p>
          <p className="break-words font-display text-2xl font-semibold tracking-[-0.03em] text-foreground">
            {metric.value}
          </p>
        </div>
        <p className="text-caption leading-5 text-muted-foreground">
          {metric.description}
        </p>
      </div>
    </div>
  );
}

function PillarCard({ pillar }: { pillar: PillarConfig }) {
  const Icon = pillar.icon;
  const tone = toneStyles[pillar.tone];

  return (
    <Card className="min-w-0">
      <CardHeader className="gap-4 p-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-3">
            <Badge variant={tone.badge} className="self-start">
              Pilar vivo
            </Badge>
            <div className="space-y-1.5">
              <CardTitle>{pillar.title}</CardTitle>
              <CardDescription>{pillar.description}</CardDescription>
            </div>
          </div>
          <div
            aria-hidden="true"
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-full',
              tone.icon
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
        {pillar.metrics.map((metric) => (
          <MetricTile key={`${pillar.title}-${metric.title}`} metric={metric} />
        ))}
      </CardContent>
    </Card>
  );
}

interface MetricGridProps {
  metrics: DailyMetric;
  grupo?: GrupoDoPainel;
  descricoes?: DescricoesDasMetricas;
}

export function MetricGrid({ metrics, grupo, descricoes }: MetricGridProps) {
  const readinessScore = metrics.readiness_score ?? metrics.recovery_score;
  const sistolica = metrics.blood_pressure_systolic;
  const diastolica = metrics.blood_pressure_diastolic;

  const pillars: PillarConfig[] = [
    {
      title: 'Recuperação e resiliência',
      description:
        'Capacidade de adaptação ao estresse, recuperação e estabilidade do sistema.',
      icon: RefreshCw,
      tone: 'primary',
      metrics: [
        {
          title: 'HRV (rMSSD)',
          value: formatDecimal(metrics.hrv_ms, 0, 'ms'),
          description: descreverMetrica('hrv_ms', metrics, descricoes),
        },
        {
          title: 'Prontidão',
          value: formatScore(readinessScore, 100, 0),
          description: descreverMetrica('readiness_score', metrics, descricoes),
        },
        {
          title: 'FC repouso',
          value: formatDecimal(metrics.resting_heart_rate, 0, 'bpm'),
          description: descreverMetrica(
            'resting_heart_rate',
            metrics,
            descricoes
          ),
        },
        {
          title: 'Recuperação FC',
          value: formatDecimal(metrics.hrr_1min_bpm, 0, 'bpm'),
          description: descreverMetrica('hrr_1min_bpm', metrics, descricoes),
        },
        {
          title: 'Temperatura',
          value: formatDecimal(metrics.body_temperature_celsius, 1, '°C'),
          description: descreverMetrica(
            'body_temperature_celsius',
            metrics,
            descricoes
          ),
        },
        {
          title: 'SpO₂ noturna',
          value: formatPercent(metrics.spo2_average, 1),
          description: descreverMetrica('spo2_average', metrics, descricoes),
        },
      ],
    },
    {
      title: 'Cardio e atividade física',
      description:
        'Gasto energético, aptidão e intensidade acumulada para manter ritmo com clareza.',
      icon: Activity,
      tone: 'warning',
      metrics: [
        {
          title: 'VO₂max',
          value: formatDecimal(metrics.vo2_max, 1, 'mL/kg/min'),
          description: descreverMetrica('vo2_max', metrics, descricoes),
        },
        {
          title: 'Min. mod/vigorosa',
          value: formatDecimal(metrics.active_minutes, 0, 'min'),
          description: descreverMetrica('active_minutes', metrics, descricoes),
        },
        {
          title: 'Passos',
          value: formatInteger(metrics.steps),
          description: descreverMetrica('steps', metrics, descricoes),
        },
        {
          title: 'Carga (EPOC)',
          value: formatDecimal(metrics.training_load_epoc, 0, 'UA'),
          description: descreverMetrica(
            'training_load_epoc',
            metrics,
            descricoes
          ),
        },
        {
          title: 'Strain diário',
          value: formatScore(metrics.daily_strain, 21, 1),
          description: descreverMetrica('daily_strain', metrics, descricoes),
        },
        {
          title: 'Sedentarismo',
          value: formatDecimal(metrics.sedentary_hours, 1, 'h'),
          description: descreverMetrica('sedentary_hours', metrics, descricoes),
        },
      ],
    },
    {
      title: 'Sono e cronobiologia',
      description:
        'Estrutura do descanso, consistência dos horários e profundidade de recuperação.',
      icon: BedDouble,
      tone: 'info',
      metrics: [
        {
          title: 'Duração',
          value: formatMinutesToHours(metrics.sleep_duration_minutes),
          description: descreverMetrica(
            'sleep_duration_minutes',
            metrics,
            descricoes
          ),
        },
        {
          title: 'Eficiência',
          value: formatPercent(metrics.sleep_efficiency, 0),
          description: descreverMetrica(
            'sleep_efficiency',
            metrics,
            descricoes
          ),
        },
        {
          title: 'Regularidade (SRI)',
          value: formatScore(metrics.sleep_regularity_index, 100, 0),
          description: descreverMetrica(
            'sleep_regularity_index',
            metrics,
            descricoes
          ),
        },
        {
          title: 'Social jetlag',
          value: formatDecimal(metrics.social_jetlag_hours, 1, 'h'),
          description: descreverMetrica(
            'social_jetlag_hours',
            metrics,
            descricoes
          ),
        },
        {
          title: 'Sono REM',
          value: formatMinutesToHours(metrics.rem_sleep_minutes),
          description: descreverMetrica(
            'rem_sleep_minutes',
            metrics,
            descricoes
          ),
        },
        {
          title: 'Sono profundo',
          value: formatMinutesToHours(metrics.deep_sleep_minutes),
          description: descreverMetrica(
            'deep_sleep_minutes',
            metrics,
            descricoes
          ),
        },
      ],
    },
    {
      title: 'Metabolismo e glicose',
      description:
        'Controle glicêmico, estabilidade metabólica e resposta alimentar do corpo.',
      icon: Droplet,
      tone: 'destructive',
      metrics: [
        {
          title: 'Tempo em faixa',
          value: formatPercent(metrics.time_in_range_percent, 1),
          description: descreverMetrica(
            'time_in_range_percent',
            metrics,
            descricoes
          ),
        },
        {
          title: 'Variabilidade (CV)',
          value: formatPercent(metrics.glycemic_variability_cv, 1),
          description: descreverMetrica(
            'glycemic_variability_cv',
            metrics,
            descricoes
          ),
        },
        {
          title: 'GMI (A1c)',
          value: formatPercent(metrics.gmi_percent, 1),
          description: descreverMetrica('gmi_percent', metrics, descricoes),
        },
        {
          title: 'Pico pós-prandial',
          value: formatDecimal(metrics.post_prandial_peak_mgdl, 0, 'mg/dL'),
          description: descreverMetrica(
            'post_prandial_peak_mgdl',
            metrics,
            descricoes
          ),
        },
        {
          title: 'Abaixo da faixa',
          value: formatPercent(metrics.time_below_range_percent, 1),
          description: descreverMetrica(
            'time_below_range_percent',
            metrics,
            descricoes
          ),
        },
        {
          title: 'iAUC/refeição',
          value: formatDecimal(metrics.iauc_per_meal_mgdl_h, 1),
          description: descreverMetrica(
            'iauc_per_meal_mgdl_h',
            metrics,
            descricoes
          ),
        },
      ],
    },
    {
      title: 'Nutrição e composição',
      description:
        'Composição corporal, distribuição de macros e padrão de alimentação diária.',
      icon: Utensils,
      tone: 'golden',
      metrics: [
        {
          title: 'WHtR',
          value: formatNumber(metrics.whtr_ratio, (input) =>
            decimalPtBr(input, 2)
          ),
          description: descreverMetrica('whtr_ratio', metrics, descricoes),
        },
        {
          title: 'Proteína (g/kg)',
          value: formatNumber(metrics.protein_g_per_kg, (input) =>
            decimalPtBr(input, 2)
          ),
          description: descreverMetrica(
            'protein_g_per_kg',
            metrics,
            descricoes
          ),
        },
        {
          title: 'Fibras',
          value: formatDecimal(metrics.dietary_fiber_grams, 0, 'g'),
          description: descreverMetrica(
            'dietary_fiber_grams',
            metrics,
            descricoes
          ),
        },
        {
          title: 'Janela alimentar',
          value: formatDecimal(metrics.eating_window_hours, 1, 'h'),
          description: descreverMetrica(
            'eating_window_hours',
            metrics,
            descricoes
          ),
        },
        {
          title: 'Na:K',
          value: formatNumber(metrics.sodium_potassium_ratio, (input) =>
            decimalPtBr(input, 2)
          ),
          description: descreverMetrica(
            'sodium_potassium_ratio',
            metrics,
            descricoes
          ),
        },
        {
          title: 'Hidratação',
          value: formatDecimal(metrics.hydration_ml_per_kg, 0, 'mL/kg'),
          description: descreverMetrica(
            'hydration_ml_per_kg',
            metrics,
            descricoes
          ),
        },
      ],
    },
    {
      title: 'Saúde mental e foco',
      description:
        'Clareza cognitiva, carga emocional, vigilância e estabilidade do sistema nervoso.',
      icon: Brain,
      tone: 'info',
      metrics: [
        {
          title: 'Reação (PVT)',
          value: formatDecimal(metrics.reaction_time_pvt_ms, 0, 'ms'),
          description: descreverMetrica(
            'reaction_time_pvt_ms',
            metrics,
            descricoes
          ),
        },
        {
          title: 'Lapsos PVT',
          value: formatInteger(metrics.pvt_lapses_count),
          description: descreverMetrica(
            'pvt_lapses_count',
            metrics,
            descricoes
          ),
        },
        {
          title: 'Pontuação cognitiva',
          value: formatNumber(metrics.cognitive_test_score, (input) =>
            decimalPtBr(input, 2)
          ),
          description: descreverMetrica(
            'cognitive_test_score',
            metrics,
            descricoes
          ),
        },
        {
          title: 'Estresse (HRV)',
          value: formatNumber(metrics.hrv_stress_index, (input) =>
            decimalPtBr(input, 1)
          ),
          description: descreverMetrica(
            'hrv_stress_index',
            metrics,
            descricoes
          ),
        },
        {
          title: 'EDA tônica',
          value: formatDecimal(metrics.eda_tonic_microsiemens, 2, 'µS'),
          description: descreverMetrica(
            'eda_tonic_microsiemens',
            metrics,
            descricoes
          ),
        },
        {
          title: 'FA',
          value: formatPercent(metrics.afib_history_percent, 1),
          description: descreverMetrica(
            'afib_history_percent',
            metrics,
            descricoes
          ),
        },
        {
          title: 'Humor',
          value: formatScore(metrics.mood_score, 5, 0),
          description: descreverMetrica('mood_score', metrics, descricoes),
        },
        {
          title: 'Meditação',
          value: formatDecimal(metrics.meditation_minutes, 0, 'min'),
          description: descreverMetrica(
            'meditation_minutes',
            metrics,
            descricoes
          ),
        },
      ],
    },
    {
      title: 'Saúde geral',
      description:
        'Camada ampla de monitoramento corporal com sinais de base e composição global.',
      icon: Smile,
      tone: 'success',
      metrics: [
        {
          title: 'Pressão arterial',
          value:
            hasMetricValue(sistolica) && hasMetricValue(diastolica)
              ? `${sistolica}/${diastolica} mmHg`
              : SEM_VALOR,
          description: descreverMetrica(
            'blood_pressure_systolic',
            metrics,
            descricoes
          ),
        },
        {
          title: 'Peso',
          value: formatDecimal(metrics.weight_kg, 1, 'kg'),
          description: descreverMetrica('weight_kg', metrics, descricoes),
        },
        {
          title: 'Hidratação',
          value: formatDecimal(metrics.water_liters, 1, 'L'),
          description: descreverMetrica('water_liters', metrics, descricoes),
        },
        {
          title: 'Calorias treino',
          value: formatDecimal(metrics.workout_calories, 0, 'kcal'),
          description: descreverMetrica(
            'workout_calories',
            metrics,
            descricoes
          ),
        },
        {
          title: 'Calorias totais',
          value: formatDecimal(metrics.calories_burned, 0, 'kcal'),
          description: descreverMetrica('calories_burned', metrics, descricoes),
        },
      ],
    },
  ];

  return (
    <div
      className={cn('grid gap-4', !grupo && 'xl:grid-cols-2 2xl:grid-cols-3')}
    >
      {pillars
        .filter(
          (pilar) =>
            !grupo ||
            pilar.title ===
              GRUPOS_DO_PAINEL.find((item) => item.id === grupo)?.titulo
        )
        .map((pillar) => (
          <PillarCard key={pillar.title} pillar={pillar} />
        ))}
    </div>
  );
}
