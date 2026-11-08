import type { PlanFeatureKey } from '@/types/subscription';

/** Catálogo de política, compartilhado pelo servidor e pela navegação. */
export const GRUPOS_FUNCIONAIS = {
  registros_saude: {
    nome: 'Registro diário de saúde e bem-estar',
    recursos: ['daily_checkin'],
    paginas: ['/dia', '/offline'],
    apis: [
      '/api/metricas',
      '/api/data/user-assessments',
      '/api/data/user_assessments',
      '/api/data/streaks',
      '/api/data/user_streaks',
      '/api/offline',
      '/api/coach/hoje',
      '/api/coach/feedback',
    ],
  },
  diario_reflexao: {
    nome: 'Diário pessoal e reflexão da noite',
    recursos: ['evening_reflection'],
    paginas: ['/offline'],
    apis: ['/api/diario-pessoal', '/api/reflexao', '/api/offline'],
  },
  outros_registros: {
    nome: 'Outros registros pessoais',
    recursos: ['wellbeing_assessments'],
    paginas: [
      '/alimentacao',
      '/acontecimentos',
      '/acompanhamentos',
      '/experiencias',
    ],
    apis: [
      '/api/alimentacao',
      '/api/acontecimentos',
      '/api/acompanhamentos',
      '/api/experiencias',
    ],
  },
  metas_habitos_plano: {
    nome: 'Metas, hábitos e plano do dia',
    recursos: [
      'goal_progress_tracking',
      'personal_habits',
      'ai_plan_generations',
    ],
    paginas: ['/goals', '/plan'],
    apis: [
      '/api/metas',
      '/api/plano',
      '/api/data/goals',
      '/api/data/habits',
      '/api/data/suggested_habits',
      '/api/data/ai_plans',
      '/api/functions/generate-ai-plan',
    ],
  },
  rotinas_praticas: {
    nome: 'Rotinas e práticas',
    recursos: ['guided_breathing'],
    paginas: ['/rotinas', '/respiracao', '/meditacoes', '/foco'],
    apis: ['/api/rotinas', '/api/respiracao', '/api/meditacoes', '/api/foco'],
  },
  lembretes_descanso: {
    nome: 'Lembretes, notificações e descanso',
    recursos: ['personal_notifications'],
    paginas: ['/lembretes', '/descanso'],
    apis: ['/api/lembretes', '/api/notificacoes', '/api/descanso'],
  },
  dispositivos: {
    nome: 'Dispositivos e monitoramento',
    recursos: [
      'wearable_bluetooth_connection',
      'realtime_monitoring',
      'voice_monitoring_updates',
    ],
    paginas: ['/connect', '/monitoring'],
    apis: ['/api/metricas/sensor'],
  },
  calendario_agenda: {
    nome: 'Calendário e agendamentos',
    recursos: [
      'calendar_integration',
      'appointments_active',
      'professionals_total',
    ],
    paginas: ['/appointments', '/calendario'],
    apis: [
      '/api/calendario',
      '/api/data/appointments',
      '/api/data/professionals',
    ],
  },
} as const satisfies Record<
  string,
  {
    nome: string;
    recursos: readonly PlanFeatureKey[];
    paginas: readonly string[];
    apis: readonly string[];
  }
>;

export type GrupoFuncional = keyof typeof GRUPOS_FUNCIONAIS;
export type EstadoDosGrupos = Record<GrupoFuncional, boolean>;
export const CHAVES_DOS_GRUPOS = Object.keys(
  GRUPOS_FUNCIONAIS
) as GrupoFuncional[];

export function gruposDoRecurso(recurso: PlanFeatureKey): GrupoFuncional[] {
  return CHAVES_DOS_GRUPOS.filter((chave) =>
    (GRUPOS_FUNCIONAIS[chave].recursos as readonly PlanFeatureKey[]).includes(
      recurso
    )
  );
}

function corresponde(caminho: string, prefixo: string) {
  return caminho === prefixo || caminho.startsWith(prefixo + '/');
}

export function gruposDoCaminho(href: string): GrupoFuncional[] {
  const caminho = href.split(/[?#]/, 1)[0];
  return CHAVES_DOS_GRUPOS.filter((chave) =>
    [
      ...GRUPOS_FUNCIONAIS[chave].paginas,
      ...GRUPOS_FUNCIONAIS[chave].apis,
    ].some((prefixo) => corresponde(caminho, prefixo))
  );
}

/** Sem estado confirmado, uma função controlada não é oferecida. */
export function caminhoAtivo(href: string, estado?: EstadoDosGrupos): boolean {
  return gruposDoCaminho(href).every((grupo) => estado?.[grupo] === true);
}
