import {
  CAMPOS_DO_REGISTRO,
  type CampoDoRegistro,
  type DefinicaoDoCampo,
} from './registro-do-dia';

interface DefinicaoDaMetrica {
  nome: string;
  unidade: string | null;
  tipo: 'numero' | 'categoria';
}

function doRegistro(
  campo: CampoDoRegistro,
  unidade?: string
): DefinicaoDaMetrica {
  const d: DefinicaoDoCampo = CAMPOS_DO_REGISTRO[campo];
  return {
    nome: d.rotulo,
    unidade: unidade ?? d.unidade ?? null,
    tipo: 'numero',
  };
}
const numero = (nome: string, unidade: string | null): DefinicaoDaMetrica => ({
  nome,
  unidade,
  tipo: 'numero',
});

/** Metadados de domínio, sem alterar chaves, unidades armazenadas ou cálculos. */
export const CATALOGO_DE_METRICAS = {
  steps: doRegistro('passos', 'passos'),
  sleep_duration_minutes: doRegistro('sono'),
  resting_heart_rate: doRegistro('fcRepouso'),
  calories_burned: numero('Calorias totais gastas', 'kcal'),
  hrv_ms: numero('Variabilidade cardíaca (VFC)', 'ms'),
  deep_sleep_minutes: numero('Duração do sono profundo', 'min'),
  resting_heart_rate_min: numero(
    'Frequência cardíaca mínima em repouso',
    'bpm'
  ),
  resting_heart_rate_max: numero(
    'Frequência cardíaca máxima em repouso',
    'bpm'
  ),
  spo2_average: numero('Saturação média de oxigênio (SpO₂)', '%'),
  respiratory_rate: numero('Frequência respiratória', 'respirações/min'),
  body_temperature_celsius: numero('Temperatura corporal', '°C'),
  total_distance_km: numero('Distância total', 'km'),
  active_minutes: doRegistro('minutosAtivos'),
  workout_calories: numero('Calorias gastas no exercício', 'kcal'),
  vo2_max: numero('Capacidade cardiorrespiratória (VO₂ máximo)', 'mL/kg/min'),
  sleep_latency_minutes: numero('Tempo para adormecer', 'min'),
  rem_sleep_minutes: numero('Duração do sono REM', 'min'),
  light_sleep_minutes: numero('Duração do sono leve', 'min'),
  sleep_efficiency: numero('Eficiência do sono', '%'),
  sleep_score: numero('Pontuação do sono', 'pontos'),
  protein_grams: doRegistro('proteina'),
  carb_grams: numero('Carboidratos', 'g'),
  fat_grams: numero('Gorduras', 'g'),
  water_liters: doRegistro('agua'),
  caffeine_mg: doRegistro('cafeina'),
  stress_score: doRegistro('estresse'),
  recovery_score: numero('Recuperação', '/100'),
  readiness_score: numero('Prontidão', '/100'),
  blood_glucose_mgdl: doRegistro('glicemia'),
  blood_pressure_systolic: doRegistro('pressaoSistolica'),
  blood_pressure_diastolic: doRegistro('pressaoDiastolica'),
  weight_kg: doRegistro('peso'),
  mood_score: doRegistro('humor', '1–5'),
  meditation_minutes: doRegistro('meditacao'),
  hrr_1min_bpm: numero('Recuperação cardíaca após 1 minuto', 'bpm'),
  sleep_regularity_index: numero('Regularidade do sono (SRI)', '/100'),
  social_jetlag_hours: numero(
    'Diferença de horário do sono entre semana e folgas',
    'h'
  ),
  waso_minutes: numero('Tempo acordado após iniciar o sono', 'min'),
  training_load_epoc: numero('Carga de treinamento (EPOC)', 'UA'),
  daily_strain: numero('Esforço diário', '/21'),
  sedentary_hours: numero('Tempo sedentário', 'h'),
  sedentary_breaks: numero('Pausas no tempo sedentário', 'pausas'),
  time_in_range_percent: numero('Tempo com glicose na faixa definida', '%'),
  glycemic_variability_cv: numero(
    'Variabilidade da glicose (coeficiente de variação)',
    '%'
  ),
  gmi_percent: numero('Indicador de gerenciamento da glicose (GMI)', '%'),
  post_prandial_peak_mgdl: numero('Pico de glicose após a refeição', 'mg/dL'),
  time_below_range_percent: numero(
    'Tempo com glicose abaixo da faixa definida',
    '%'
  ),
  iauc_per_meal_mgdl_h: numero(
    'Área incremental da glicose por refeição',
    'mg/dL·h'
  ),
  whtr_ratio: numero('Relação entre cintura e altura', 'razão'),
  protein_g_per_kg: numero('Proteína por peso corporal', 'g/kg'),
  dietary_fiber_grams: numero('Fibras alimentares', 'g'),
  eating_window_hours: numero('Janela alimentar', 'h'),
  sodium_potassium_ratio: numero('Relação entre sódio e potássio', 'razão'),
  hydration_ml_per_kg: numero('Hidratação por peso corporal', 'mL/kg'),
  reaction_time_pvt_ms: numero(
    'Tempo de reação no teste de vigilância (PVT)',
    'ms'
  ),
  pvt_lapses_count: numero(
    'Lapsos de atenção no teste de vigilância (PVT)',
    'lapsos'
  ),
  cognitive_test_score: numero('Pontuação do teste cognitivo', 'pontos'),
  hrv_stress_index: numero(
    'Índice de estresse pela variabilidade cardíaca',
    'índice'
  ),
  eda_tonic_microsiemens: numero(
    'Atividade elétrica da pele (EDA tônica)',
    'µS'
  ),
  afib_history_percent: numero('Tempo com fibrilação atrial registrada', '%'),
  menstrual_flow: {
    nome: 'Fluxo menstrual',
    unidade: 'categoria',
    tipo: 'categoria',
  },
  energy_level: doRegistro('energia', '1–5'),
  sensor_heart_rate_avg: numero('Frequência cardíaca média do sensor', 'bpm'),
  sensor_minutes: numero('Duração registrada pelo sensor', 'min'),
} satisfies Record<string, DefinicaoDaMetrica>;

export type ChaveDaMetrica = keyof typeof CATALOGO_DE_METRICAS;
export const COLUNAS_DAS_METRICAS = Object.keys(
  CATALOGO_DE_METRICAS
) as ChaveDaMetrica[];
export const NUMERIC_METRIC_COLUMNS = COLUNAS_DAS_METRICAS.filter(
  (key) => CATALOGO_DE_METRICAS[key].tipo === 'numero'
);
