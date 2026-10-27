import type { DailyMetric } from '@/hooks/use-daily-metrics';

/** Inventário dos 43 cartões existentes, sem números gerados pelo modelo. */
export const CATALOGO_DAS_METRICAS = [
  {
    id: 'hrv_ms',
    titulo: 'HRV (rMSSD)',
    colunas: ['hrv_ms'],
    descricao:
      'Variação do intervalo entre batimentos, em milissegundos. Compare apenas registros feitos pelo mesmo método.',
  },
  {
    id: 'readiness_score',
    titulo: 'Prontidão',
    colunas: ['readiness_score', 'recovery_score'],
    descricao:
      'Índice calculado com os sinais registrados, de zero a cem. Não mede sua capacidade física nem substitui uma avaliação.',
  },
  {
    id: 'resting_heart_rate',
    titulo: 'FC repouso',
    colunas: ['resting_heart_rate'],
    descricao:
      'Batimentos por minuto registrados em repouso. O contexto e o método de coleta fazem diferença.',
  },
  {
    id: 'hrr_1min_bpm',
    titulo: 'Recuperação FC',
    colunas: ['hrr_1min_bpm'],
    descricao:
      'Diferença da frequência cardíaca no primeiro minuto após o esforço, conforme o registro de origem.',
  },
  {
    id: 'body_temperature_celsius',
    titulo: 'Temperatura',
    colunas: ['body_temperature_celsius'],
    descricao:
      'Temperatura registrada em graus Celsius. Este campo apresenta o valor, sem deduzir a causa de uma mudança.',
  },
  {
    id: 'spo2_average',
    titulo: 'SpO₂ noturna',
    colunas: ['spo2_average'],
    descricao:
      'Percentual de oxigenação estimado pelo dispositivo. Uma leitura isolada não confirma um problema de saúde.',
  },
  {
    id: 'vo2_max',
    titulo: 'VO₂max',
    colunas: ['vo2_max'],
    descricao:
      'Estimativa de uso de oxigênio durante esforço, fornecida pela fonte do registro. Não é uma medição feita pelo painel.',
  },
  {
    id: 'active_minutes',
    titulo: 'Min. mod/vigorosa',
    colunas: ['active_minutes'],
    descricao:
      'Minutos de atividade informados no registro do dia. Sua meta pessoal pode ser acompanhada em Metas.',
  },
  {
    id: 'steps',
    titulo: 'Passos',
    colunas: ['steps'],
    descricao:
      'Quantidade de passos registrados no dia. Zero passos é um registro válido e não significa ausência de informação.',
  },
  {
    id: 'training_load_epoc',
    titulo: 'Carga (EPOC)',
    colunas: ['training_load_epoc'],
    descricao:
      'Carga de exercício registrada pela fonte, segundo o método usado por ela. Não define uma prescrição de treino.',
  },
  {
    id: 'daily_strain',
    titulo: 'Strain diário',
    colunas: ['daily_strain'],
    descricao:
      'Pontuação de esforço do dia informada pela fonte. A escala depende do método do dispositivo.',
  },
  {
    id: 'sedentary_hours',
    titulo: 'Sedentarismo',
    colunas: ['sedentary_hours'],
    descricao:
      'Horas de inatividade informadas no registro. O painel não deduz como esse tempo foi distribuído.',
  },
  {
    id: 'sleep_duration_minutes',
    titulo: 'Duração',
    colunas: ['sleep_duration_minutes'],
    descricao:
      'Tempo de sono registrado. A duração, sozinha, não informa se o descanso foi suficiente para você.',
  },
  {
    id: 'sleep_efficiency',
    titulo: 'Eficiência',
    colunas: ['sleep_efficiency'],
    descricao:
      'Percentual do tempo na cama que foi registrado como sono, conforme o método da fonte.',
  },
  {
    id: 'sleep_regularity_index',
    titulo: 'Regularidade (SRI)',
    colunas: ['sleep_regularity_index'],
    descricao:
      'Índice registrado de regularidade dos horários de sono. Não é uma avaliação da qualidade do descanso.',
  },
  {
    id: 'social_jetlag_hours',
    titulo: 'Social jetlag',
    colunas: ['social_jetlag_hours'],
    descricao:
      'Diferença registrada entre horários de sono dos dias de rotina e dos dias livres, em horas.',
  },
  {
    id: 'rem_sleep_minutes',
    titulo: 'Sono REM',
    colunas: ['rem_sleep_minutes'],
    descricao:
      'Tempo que a fonte identificou como sono REM. Dispositivos usam estimativas para separar as fases do sono.',
  },
  {
    id: 'deep_sleep_minutes',
    titulo: 'Sono profundo',
    colunas: ['deep_sleep_minutes'],
    descricao:
      'Tempo que a fonte identificou como sono profundo. A estimativa não comprova recuperação física.',
  },
  {
    id: 'time_in_range_percent',
    titulo: 'Tempo em faixa',
    colunas: ['time_in_range_percent'],
    descricao:
      'Percentual de tempo dentro da faixa de glicose definida na origem. A faixa precisa considerar o contexto individual.',
  },
  {
    id: 'glycemic_variability_cv',
    titulo: 'Variabilidade (CV)',
    colunas: ['glycemic_variability_cv'],
    descricao:
      'Variação relativa dos valores de glicose registrados. O número não define sozinho o controle da glicose.',
  },
  {
    id: 'gmi_percent',
    titulo: 'GMI (A1c)',
    colunas: ['gmi_percent'],
    descricao:
      'Estimativa calculada a partir de registros de glicose. Não substitui o exame de hemoglobina glicada.',
  },
  {
    id: 'post_prandial_peak_mgdl',
    titulo: 'Pico pós-prandial',
    colunas: ['post_prandial_peak_mgdl'],
    descricao:
      'Maior valor de glicose registrado após uma refeição. O horário e o contexto da coleta são necessários para interpretar.',
  },
  {
    id: 'time_below_range_percent',
    titulo: 'Abaixo da faixa',
    colunas: ['time_below_range_percent'],
    descricao:
      'Percentual de tempo abaixo da faixa definida na origem dos dados. Não é um diagnóstico feito pelo painel.',
  },
  {
    id: 'iauc_per_meal_mgdl_h',
    titulo: 'iAUC/refeição',
    colunas: ['iauc_per_meal_mgdl_h'],
    descricao:
      'Medida registrada da variação acumulada da glicose após a refeição, segundo o método usado na origem.',
  },
  {
    id: 'whtr_ratio',
    titulo: 'WHtR',
    colunas: ['whtr_ratio'],
    descricao:
      'Relação registrada entre a medida da cintura e a altura. O painel não classifica seu estado de saúde por esse número.',
  },
  {
    id: 'protein_g_per_kg',
    titulo: 'Proteína (g/kg)',
    colunas: ['protein_g_per_kg'],
    descricao:
      'Quantidade de proteína registrada em relação ao peso corporal. A necessidade individual não é definida por este cartão.',
  },
  {
    id: 'dietary_fiber_grams',
    titulo: 'Fibras',
    colunas: ['dietary_fiber_grams'],
    descricao:
      'Quantidade de fibras alimentares registrada em gramas. O painel não preenche refeições que você não informou.',
  },
  {
    id: 'eating_window_hours',
    titulo: 'Janela alimentar',
    colunas: ['eating_window_hours'],
    descricao:
      'Intervalo registrado entre a primeira e a última alimentação do dia, em horas.',
  },
  {
    id: 'sodium_potassium_ratio',
    titulo: 'Na:K',
    colunas: ['sodium_potassium_ratio'],
    descricao:
      'Relação registrada entre sódio e potássio. O resultado depende da origem e da cobertura das informações alimentares.',
  },
  {
    id: 'hydration_ml_per_kg',
    titulo: 'Hidratação',
    colunas: ['hydration_ml_per_kg'],
    descricao:
      'Volume de água registrado em relação ao peso corporal. Não representa uma recomendação individual de consumo.',
  },
  {
    id: 'reaction_time_pvt_ms',
    titulo: 'Reação (PVT)',
    colunas: ['reaction_time_pvt_ms'],
    descricao:
      'Tempo de resposta registrado em um teste de atenção, em milissegundos. Considere as condições do teste.',
  },
  {
    id: 'pvt_lapses_count',
    titulo: 'Lapsos PVT',
    colunas: ['pvt_lapses_count'],
    descricao:
      'Quantidade de respostas atrasadas registrada no teste de atenção. O resultado não estabelece uma condição clínica.',
  },
  {
    id: 'cognitive_test_score',
    titulo: 'Pontuação cognitiva',
    colunas: ['cognitive_test_score'],
    descricao:
      'Pontuação registrada pelo teste utilizado na origem. Compare somente resultados da mesma escala e método.',
  },
  {
    id: 'hrv_stress_index',
    titulo: 'Estresse (HRV)',
    colunas: ['hrv_stress_index'],
    descricao:
      'Índice informado pela fonte a partir dos intervalos cardíacos. Ele não mede sozinho como você está se sentindo.',
  },
  {
    id: 'eda_tonic_microsiemens',
    titulo: 'EDA tônica',
    colunas: ['eda_tonic_microsiemens'],
    descricao:
      'Condutividade elétrica da pele registrada pelo sensor. Este sinal, sozinho, não comprova estresse emocional.',
  },
  {
    id: 'afib_history_percent',
    titulo: 'FA',
    colunas: ['afib_history_percent'],
    descricao:
      'Percentual informado pela fonte para ocorrências identificadas de ritmo cardíaco irregular. A interpretação exige contexto profissional.',
  },
  {
    id: 'mood_score',
    titulo: 'Humor',
    colunas: ['mood_score'],
    descricao:
      'Humor que você informou na escala do registro. É um relato pessoal, sem classificação automática de saúde mental.',
  },
  {
    id: 'meditation_minutes',
    titulo: 'Meditação',
    colunas: ['meditation_minutes'],
    descricao:
      'Minutos de meditação ou respiração registrados no dia. Apenas práticas efetivamente registradas entram no total.',
  },
  {
    id: 'blood_pressure_systolic',
    titulo: 'Pressão arterial',
    colunas: ['blood_pressure_systolic', 'blood_pressure_diastolic'],
    descricao:
      'Pressão arterial registrada com seus dois valores. O painel não faz diagnóstico nem escolhe tratamento por uma leitura.',
  },
  {
    id: 'weight_kg',
    titulo: 'Peso',
    colunas: ['weight_kg'],
    descricao:
      'Peso corporal informado em quilogramas. Mudanças precisam considerar o contexto e as condições da medição.',
  },
  {
    id: 'water_liters',
    titulo: 'Hidratação',
    colunas: ['water_liters'],
    descricao:
      'Volume de água informado no dia, em litros. O painel não define uma meta universal de consumo.',
  },
  {
    id: 'workout_calories',
    titulo: 'Calorias treino',
    colunas: ['workout_calories'],
    descricao:
      'Estimativa registrada de energia gasta no exercício. O método e a precisão dependem da fonte.',
  },
  {
    id: 'calories_burned',
    titulo: 'Calorias totais',
    colunas: ['calories_burned'],
    descricao:
      'Estimativa registrada de energia total gasta no dia. Não é uma orientação sobre quanto você deve comer.',
  },
] as const;
export type ChaveDaMetrica = (typeof CATALOGO_DAS_METRICAS)[number]['id'];
export const CATALOGO_DAS_LEITURAS = [
  {
    id: 'leitura_harmonia',
    titulo: 'Harmonia',
    colunas: [],
    descricao:
      'Índice simbólico calculado pelo app a partir dos registros disponíveis. Não é uma medida clínica de equilíbrio.',
  },
  {
    id: 'leitura_reflexao',
    titulo: 'Reflexão do dia',
    colunas: [],
    descricao:
      'Leitura interpretativa para autoconhecimento. Ela não mede seu corpo nem determina o que vai acontecer.',
  },
  {
    id: 'leitura_tendencia',
    titulo: 'Tendência pessoal',
    colunas: [],
    descricao:
      'Distribuição simbólica entre leveza, intensidade e constância, conforme o método do app. Não define alimentação ou tratamento.',
  },
  {
    id: 'leitura_coerencia',
    titulo: 'Ritmo pessoal',
    colunas: [],
    descricao:
      'Pontuação interpretativa que combina os registros disponíveis no método do app. Compare a mesma escala ao longo do tempo.',
  },
  {
    id: 'leitura_camadas',
    titulo: 'Dimensões do bem-estar',
    colunas: [],
    descricao:
      'Visão simbólica do corpo, da respiração, das emoções, da atenção e da satisfação pessoal. Os números não avaliam órgãos ou doenças.',
  },
  {
    id: 'leitura_centros',
    titulo: 'Temas de autoconhecimento',
    colunas: [],
    descricao:
      'Pontuações simbólicas de temas pessoais, como segurança, afeto e expressão. Não representam medições de partes do corpo.',
  },
  {
    id: 'leitura_energia',
    titulo: 'Energia percebida',
    colunas: [],
    descricao:
      'Índice interpretativo construído pelo app com os sinais disponíveis. Ele não mede uma energia física nem substitui seu relato pessoal.',
  },
  {
    id: 'leitura_idade',
    titulo: 'Comparação de indicadores',
    colunas: [],
    descricao:
      'Estimativa interna baseada nos marcadores disponíveis e na idade informada. Não comprova sua idade biológica real.',
  },
  {
    id: 'leitura_sinais',
    titulo: 'Mudanças dos registros',
    colunas: [],
    descricao:
      'Comparação dos sinais informados com registros anteriores. Uma diferença não identifica sozinha a causa nem confirma uma doença.',
  },
  {
    id: 'leitura_ciclo',
    titulo: 'Acompanhamento do ciclo',
    colunas: [],
    descricao:
      'Estimativa do calendário com as informações que você registrou. Não confirma ovulação, fertilidade ou gravidez.',
  },
] as const;
export const CATALOGO_DAS_EXPLICACOES = [
  ...CATALOGO_DAS_METRICAS,
  ...CATALOGO_DAS_LEITURAS,
] as const;
export type ChaveDaLeitura = (typeof CATALOGO_DAS_LEITURAS)[number]['id'];
export type ChaveDaExplicacao = ChaveDaMetrica | ChaveDaLeitura;
export type DescricoesDasMetricas = Partial<Record<ChaveDaExplicacao, string>>;
export function descreverLeitura(
  id: ChaveDaLeitura,
  descricoes?: DescricoesDasMetricas
) {
  return (
    descricoes?.[id] ??
    CATALOGO_DAS_LEITURAS.find((m) => m.id === id)!.descricao
  );
}
export function descreverMetrica(
  id: ChaveDaMetrica,
  metricas: Partial<DailyMetric>,
  descricoes?: DescricoesDasMetricas
) {
  const item = CATALOGO_DAS_METRICAS.find((x) => x.id === id)!;
  const valores = item.colunas.map((c) => metricas[c]);
  const existe =
    id === 'readiness_score'
      ? valores.some((v) => typeof v === 'number' && Number.isFinite(v))
      : valores.every((v) => typeof v === 'number' && Number.isFinite(v));
  return existe
    ? (descricoes?.[id] ?? item.descricao)
    : 'Sem registro desta informação hoje. ' + item.descricao;
}
