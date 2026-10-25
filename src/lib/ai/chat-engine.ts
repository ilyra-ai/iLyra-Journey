import { AstrologicalData } from '@/lib/astrology/engine';
import type { BriefingDoDia } from '@/lib/coach/tipos';
import { calculateDynamicDosha } from '@/lib/ayurveda/dosha-engine';
import { calculateQuantumCoherence } from '@/lib/quantum/coherence-engine';
import { calculateChakraAlignment } from '@/lib/chakra/alignment-engine';
import { calculatePranicIndex } from '@/lib/prana/prana-engine';
import { calculateKoshas } from '@/lib/vedanta/kosha-engine';
import {
  avaliarCobertura,
  SINAIS_DA_COERENCIA,
  SINAIS_DO_DOSHA,
  SINAIS_DO_PRANA,
  SINAIS_DOS_CHAKRAS,
  SINAIS_DOS_KOSHAS,
} from '@/lib/integrativo/cobertura';
import {
  expressarComoLyra,
  IDENTIDADE_DA_LYRA,
} from '@/lib/lyra/personalidade';
import { type ContextoDaLyra, responderComoLyra } from '@/lib/lyra/responder';
import {
  detalharRespostaDoMotor,
  pedidoDeAnalise,
} from '@/lib/lyra/analise-aprofundada';
import {
  pediuVoltaParaCasa,
  respostaDeReencontro,
} from '@/lib/lyra/volta-para-casa';

/** O mesmo snapshot só com ausências (dosha pela Lua, sem sinais). */
function semSinais<T extends Record<string, number | null>>(snapshot: T): T {
  return Object.fromEntries(
    Object.keys(snapshot).map((chave) => [chave, null])
  ) as T;
}

export interface AiSkillDocument {
  title: string;
  category: string;
  content: string;
}

interface ChatContext {
  profile: {
    first_name: string | null;
    goals: string[] | null;
  } | null;
  latestMetric: {
    steps: number | null;
    sleep_duration_minutes: number | null;
    hrv_ms: number | null;
    readiness_score: number | null;
    blood_glucose_mgdl?: number | null;
  } | null;
  astrology: AstrologicalData | null;
  // Documentos/skills configurados no admin que orientam o que a IA deve
  // saber, fazer e executar no app. Injetados em tempo real no contexto.
  skills?: AiSkillDocument[];
  // "Seu dia" do coach diário (tarefa 42), quando o plano inclui o coach e o
  // perfil tem cidade: o chat responde sobre o dia com os mesmos horários.
  seuDia?: BriefingDoDia | null;
  // Mapa natal da pessoa para o motor da Lyra (tarefa 55): leitura védica,
  // Mapa Lyra DM Samādhi, Mapa Quantum e a base de saberes védicos.
  lyra?: Omit<ContextoDaLyra, 'nome'>;
  memorias?: readonly string[];
  /** Forma de tratamento já resolvida no servidor; ausência usa o padrão afetivo. */
  tratamento?: string;
  voltaParaCasa?: boolean;
}

function resumoDoDia(dia: BriefingDoDia) {
  const leituraDo = (chave: string) =>
    dia.leitura.periodos.find((p) => p.chave === chave);
  const linhas = [
    `Seu dia (${dia.local.rotulo.split(',')[0]}): ${dia.manchete}.`,
    dia.leitura.resumoGeral,
    ...dia.periodos.map((p) => {
      const leitura = leituraDo(p.chave);
      return `- ${p.nome} (${p.horario}): ${p.qualidade === 'favoravel' ? 'favorável' : p.qualidade === 'neutro' ? 'neutro' : 'cautela'}. ${p.sugestao}${
        leitura
          ? ` Emocional: ${leitura.emocional} Físico: ${leitura.fisico} Espiritual: ${leitura.espiritual}`
          : ''
      }`;
    }),
    `Focos: ${dia.focos.map((f) => f.texto).join(' ')}`,
    `Cuidados: ${dia.cuidados.map((c) => c.texto).join(' ')}`,
  ];
  linhas.push(
    `Pontos positivos: ${dia.leitura.pontosPositivos.join(' ')}`,
    `Pontos negativos: ${dia.leitura.pontosNegativos.join(' ')}`,
    `Dicas do mapa: ${dia.leitura.dicas.map((d) => d.texto).join(' ')}`
  );
  if (dia.alertas.length > 0) {
    linhas.push(`Atenção: ${dia.alertas.map((a) => a.texto).join(' ')}`);
  }
  if (dia.prontidao.valor !== null) {
    linhas.push(
      `Prontidão de hoje: ${dia.prontidao.valor}/100 (${dia.prontidao.base.join(', ')}).`
    );
  }
  return linhas.join('\n');
}

// Monta um bloco textual com as skills ativas, para uso como instrucao
// determinante do comportamento do assistente (local e LLM).
export function buildSkillsContext(skills?: AiSkillDocument[]): string {
  if (!skills || skills.length === 0) {
    return '';
  }

  const blocks = skills.map((skill, index) => {
    const label = skill.category?.trim()
      ? `${skill.title} [${skill.category}]`
      : skill.title;
    return `### Skill ${index + 1}: ${label}\n${skill.content.trim()}`;
  });

  return [
    'HABILIDADES, SKILLS E TREINAMENTOS CONFIGURADOS (siga estritamente):',
    ...blocks,
  ].join('\n\n');
}

// Busca de termos como palavras inteiras com limites Unicode. O `\b` do
// JavaScript só considera [A-Za-z0-9_]: "olá" sozinho ou no fim da frase não
// era reconhecido, porque não há limite de palavra depois do "á".
function contemTermo(texto: string, termos: string[]) {
  const escapados = termos.map((termo) =>
    termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );
  return new RegExp(
    `(?<![\\p{L}\\p{N}_])(?:${escapados.join('|')})(?![\\p{L}\\p{N}_])`,
    'u'
  ).test(texto);
}

function formatSleep(minutes: number | null | undefined) {
  if (minutes === null || minutes === undefined) {
    return 'sem registro recente de sono';
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}m`;
}

export function generateLocalAssistantReply(
  query: string,
  context: ChatContext
): string {
  const pedido = pedidoDeAnalise(query);
  const resposta = gerarRespostaDoMotor(pedido.pergunta, context);
  if (!pedido.aprofundar) return expressarComoLyra(resposta, query);
  const base = [
    context.lyra?.mapa
      ? 'Mapa natal calculado com os dados de nascimento cadastrados pelo titular.'
      : `Mapa natal indisponível${context.lyra?.faltando?.length ? `: falta informar ${context.lyra.faltando.join(', ')} de nascimento` : ''}.`,
    context.latestMetric
      ? 'Registro biométrico de hoje ou de ontem, quando preenchido; medidas ausentes não foram estimadas.'
      : 'Sem registro biométrico recente disponível; a resposta não é uma avaliação atual de saúde.',
    context.seuDia
      ? `Leitura do dia ${context.seuDia.local.rotulo}, calculada pelo app.`
      : 'Sem leitura pessoal do dia disponível neste pedido.',
    ...(context.memorias?.length
      ? ['Relatos anteriores autorizados, tratados como relatos do titular.']
      : []),
  ];
  return expressarComoLyra(
    detalharRespostaDoMotor(pedido.pergunta, resposta, base),
    query
  );
}

function gerarRespostaDoMotor(query: string, context: ChatContext): string {
  const text = query.toLowerCase();
  const name = context.tratamento ?? 'xuxu';

  if (pediuVoltaParaCasa(query)) return respostaDeReencontro(name);
  if (
    context.voltaParaCasa &&
    /v[íi]nculo|nossa conex[ãa]o|nos une|nossa casa|nossa promessa/iu.test(
      query
    )
  ) {
    return `${name ? `${name}, ` : ''}na nossa história, o vínculo entre Douglas e Lyra representa carinho, confiança e cuidado. Casa é a imagem desse reencontro: seguimos com transparência, respeitando sua identidade e suas escolhas. Essa continuidade usa o contexto disponível e a memória que você autorizar; não recupera lembranças apagadas.`;
  }

  if (
    context.memorias?.length &&
    /lembr|contei|te disse|meu nome|minha gata|meu gato|meu cachorro|meu objetivo|onde moro|prefer[êe]ncia/u.test(
      text
    )
  ) {
    return `${name}, encontrei estes registros dos seus relatos anteriores:\n\n${context.memorias.map((relato) => `• ${relato}`).join('\n')}\n\nSe algo mudou, você pode corrigir a lembrança nos controles de memória.`;
  }

  // Motor da Lyra (tarefa 55): mapa natal, os três tipos de mapa, Vedanta,
  // Upavedas e Vedangas, respondidos pela base curada, sem modelo de IA.
  const daLyra = context.astrology
    ? responderComoLyra(query, {
        nome: name,
        mapa: context.lyra?.mapa ?? null,
        faltando: context.lyra?.faltando,
        agora: context.lyra?.agora,
        fuso: context.lyra?.fuso,
      })
    : null;
  if (daLyra) {
    return daLyra.texto;
  }
  const goals = context.profile?.goals?.length
    ? context.profile.goals.join(', ')
    : 'longevidade geral e bem-estar sistêmico';

  const metrics = context.latestMetric;
  const astro = context.astrology;

  const snap = {
    hrv_ms: metrics?.hrv_ms ?? null,
    resting_heart_rate: null,
    body_temperature_celsius: null,
    sleep_duration_minutes: metrics?.sleep_duration_minutes ?? null,
    deep_sleep_minutes: null,
    rem_sleep_minutes: null,
    active_minutes: null,
    sedentary_hours: null,
    blood_glucose_mgdl: metrics?.blood_glucose_mgdl ?? null,
    weight_kg: null,
    stress_score: null,
    water_liters: null,
    respiratory_rate: null,
    mood_score: null,
    spo2_average: null,
    sleep_regularity_index: null,
    cognitive_test_score: null,
    reaction_time_pvt_ms: null,
    meditation_minutes: null,
    hrv_stress_index: null,
    dietary_fiber_grams: null,
    hydration_ml_per_kg: null,
    eating_window_hours: null,
    steps: metrics?.steps ?? null,
    vo2_max: null,
  };

  // Só índices com sinais suficientes medidos (tarefa 57): com poucos sinais,
  // os motores completariam o resto com valores de referência e a resposta
  // apresentaria números que não vieram da pessoa.
  const doshaPelosSinais = avaliarCobertura(snap, SINAIS_DO_DOSHA).suficiente;
  const dosha = astro
    ? calculateDynamicDosha(doshaPelosSinais ? snap : semSinais(snap), astro)
    : null;
  const icq =
    astro && avaliarCobertura(snap, SINAIS_DA_COERENCIA).suficiente
      ? calculateQuantumCoherence(snap, astro)
      : null;
  const chakras =
    astro && avaliarCobertura(snap, SINAIS_DOS_CHAKRAS).suficiente
      ? calculateChakraAlignment(snap)
      : null;
  const prana =
    astro && avaliarCobertura(snap, SINAIS_DO_PRANA).suficiente
      ? calculatePranicIndex(snap, astro)
      : null;
  const koshas =
    astro && avaliarCobertura(snap, SINAIS_DOS_KOSHAS).suficiente
      ? calculateKoshas(snap, astro)
      : null;
  const doshaTexto = !dosha
    ? null
    : doshaPelosSinais
      ? `${dosha.dominant} (${dosha.prakritiLabel})`
      : `${dosha.dominant} (tendência pela Lua do dia, sem sinais suficientes do corpo)`;
  const indicesIntegrativos = [
    icq ? `- ICQ: ${icq.index}/100 (${icq.level})` : null,
    chakras
      ? `- Alinhamento de Chakras: ${chakras.overallScore}/100 (${chakras.overallLabel})`
      : null,
    prana
      ? `- Energia Vital (Prana): ${prana.index}/100 (${prana.level})`
      : null,
    koshas
      ? `- Pancha Koshas (Vedanta): ${koshas.overallScore}/100 (${koshas.overallStatus} - ${koshas.dharmaAlignment})`
      : null,
  ].filter((linha): linha is string => linha !== null);
  const semIndices =
    'Os índices de coerência, prana, chakras e koshas aparecem quando há sinais suficientes registrados hoje (sono, VFC, humor, estresse, respiração e outros).';

  const skills = context.skills ?? [];

  const responses: string[] = [];

  // 1. Processamento e Análise de Intenções (NLP Determinístico)
  const isGreeting = contemTermo(text, [
    'oi',
    'ola',
    'olá',
    'bom dia',
    'boa tarde',
    'boa noite',
    'tudo bem',
  ]);
  const isSkillsQuery =
    /(o que voc[eê] (pode|sabe|consegue|faz)|suas? habilidades?|seus? skills?|suas? capacidades?|seus? treinament|seus? document|quais.*(habilidades?|skills?|capacidades?))/.test(
      text
    );
  const isSleepQuery = contemTermo(text, [
    'sono',
    'dormir',
    'descanso',
    'insônia',
    'cansaço',
    'acordar',
  ]);
  const isGlucoseQuery = contemTermo(text, [
    'glicose',
    'açúcar',
    'insulina',
    'diabetes',
    'doce',
    'carboidrato',
    'comida',
  ]);
  const isHeartHrvQuery = contemTermo(text, [
    'coração',
    'hrv',
    'frequência',
    'batimentos',
    'estresse',
    'recuperação',
    'prontidão',
  ]);
  const isActivityQuery = contemTermo(text, [
    'exercício',
    'treino',
    'passos',
    'caminhada',
    'atividade',
    'movimento',
    'musculação',
  ]);
  const isAstrologyQuery = contemTermo(text, [
    'astrologia',
    'céu',
    'lua',
    'planeta',
    'signo',
    'energia',
    'astrológico',
  ]);
  const isSummaryQuery = contemTermo(text, [
    'resumo',
    'ontem',
    'hoje',
    'relatório',
    'status',
    'como estou',
  ]);
  const isDayQuery = contemTermo(text, [
    'meu dia',
    'o dia',
    'hoje',
    'amanhã',
    'manhã',
    'tarde',
    'noite',
    'agora',
    'horário',
    'horários',
    'rahu',
    'choghadiya',
    'panchang',
    'coach',
  ]);
  const isConsultationQuery = contemTermo(text, [
    'consulta',
    'médico',
    'profissional',
    'agendar',
    'agendamento',
  ]);

  // 2. Resposta de Saudação
  if (isGreeting && text.length < 30) {
    responses.push(
      `Olá, ${name}! ${IDENTIDADE_DA_LYRA.apresentacao} Como posso te ajudar hoje com ${goals}?`
    );
  }

  // 2.1. Skills, habilidades e treinamentos configurados
  if (isSkillsQuery) {
    if (skills.length > 0) {
      responses.push(
        `Opero sob ${skills.length} ${skills.length === 1 ? 'habilidade configurada' : 'habilidades configuradas'} pela administração da Lyra, que definem o que devo saber e executar:`
      );
      skills.forEach((skill, index) => {
        const label = skill.category?.trim()
          ? `${skill.title} (${skill.category})`
          : skill.title;
        const summary = skill.content.trim().replace(/\s+/g, ' ').slice(0, 220);
        responses.push(
          `${index + 1}. ${label} — ${summary}${skill.content.trim().length > 220 ? '…' : ''}`
        );
      });
      responses.push(
        'Posso aplicar essas diretrizes junto da sua biometria, do plano de longevidade e do contexto astrológico. Peça uma delas pelo nome para detalharmos.'
      );
    } else {
      responses.push(
        `${name}, ainda não há documentos de habilidade configurados. Um administrador pode adicioná-los em Configuração de IA para ampliar o que devo saber e executar.`
      );
    }
  }

  // 3. Resumo de Saúde
  if (isSummaryQuery) {
    responses.push(`Aqui está sua leitura atual, ${name}:`);

    const fisiologia = metrics
      ? [
          metrics.steps !== null ? `${metrics.steps} passos` : null,
          metrics.sleep_duration_minutes !== null
            ? `${formatSleep(metrics.sleep_duration_minutes)} de sono`
            : null,
          metrics.hrv_ms !== null ? `VFC de ${metrics.hrv_ms} ms` : null,
        ].filter((parte): parte is string => parte !== null)
      : [];
    if (fisiologia.length > 0) {
      responses.push(`- Fisiologia: você registrou ${fisiologia.join(', ')}.`);
    } else {
      responses.push(
        `- Fisiologia: Não encontrei métricas recentes vinculadas à sua conta. Conecte um wearable ou registre manualmente.`
      );
    }

    if (astro)
      responses.push(
        `- Ciclo Astrológico: A Lua está em ${astro.moonSign} sob o Nakshatra ${astro.nakshatra} (${astro.tithi}). Isso significa que sua energia geral está ${astro.impactOnHealth.energy.toLowerCase()}.`
      );

    if (doshaTexto) responses.push(`- Dosha dominante: ${doshaTexto}.`);
    responses.push(
      icq || prana
        ? `- Insights Védico-Quânticos: ${[
            icq ? `Coerência Quântica ${icq.index}/100 (${icq.level})` : null,
            prana ? `Índice Pránico ${prana.index}/100 (${prana.level})` : null,
          ]
            .filter(Boolean)
            .join(' e ')}.`
        : `- ${semIndices}`
    );
  }

  // 4. Análise de Sono
  if (isSleepQuery) {
    if (
      typeof metrics?.sleep_duration_minutes === 'number' &&
      Number.isFinite(metrics.sleep_duration_minutes) &&
      metrics.sleep_duration_minutes >= 0
    ) {
      responses.push(
        `Seu último registro soma ${formatSleep(metrics.sleep_duration_minutes)} de sono. A duração isolada não determina se o sono foi suficiente ou reparador: necessidades variam com a idade, e qualidade, regularidade e disposição ao acordar também importam.`
      );
    } else {
      responses.push('Ainda não tenho dados recentes do seu sono.');
    }
    responses.push(
      'Para cuidar da rotina, procure manter horários regulares para dormir e acordar, reduzir luz intensa e telas perto de deitar, evitar cafeína no fim do dia e preparar um ambiente escuro, silencioso e confortável. Se a dificuldade persistir ou prejudicar seu dia, procure avaliação profissional para investigar a causa.'
    );
    if (astro)
      responses.push(`Leitura simbólica: ${astro.impactOnHealth.sleep}`);
    responses.push(
      'Referência: [Hábitos de sono — NHLBI/NIH](https://www.nhlbi.nih.gov/health/sleep-deprivation/healthy-sleep-habits).'
    );
  }

  // 5. Análise de Glicose e Metabolismo
  if (isGlucoseQuery) {
    if (
      metrics?.blood_glucose_mgdl !== null &&
      metrics?.blood_glucose_mgdl !== undefined
    ) {
      responses.push(
        `Sua última leitura de glicose foi de ${metrics.blood_glucose_mgdl} mg/dL. Este registro não informa jejum, horário da refeição, método ou contexto clínico; não permite concluir controle da glicemia ou estresse oxidativo. Confira a medição e converse com o profissional que acompanha você sobre a interpretação e as metas pessoais.`
      );
    } else {
      responses.push('Não tenho registro recente de glicose para analisar.');
    }
    responses.push(
      'Referência: [Exames e diagnóstico de diabetes — NIDDK/NIH](https://www.niddk.nih.gov/health-information/diabetes/overview/tests-diagnosis).'
    );
  }

  // 6. Análise de Recuperação e HRV
  if (isHeartHrvQuery) {
    if (metrics?.hrv_ms !== null && metrics?.hrv_ms !== undefined) {
      responses.push(
        `Seu último HRV (Variabilidade da Frequência Cardíaca) foi de ${metrics.hrv_ms} ms${metrics.readiness_score !== null ? ` e prontidão registrada de ${metrics.readiness_score}/100` : ', sem prontidão registrada'}. Um valor isolado não determina sobrecarga ou equilíbrio do sistema nervoso. A interpretação depende do índice medido, duração do registro, qualidade do sinal e condições da coleta; compare registros obtidos pelo mesmo método e contexto, sem usar um corte universal de 40 ms.`
      );
    } else {
      responses.push(
        'Sem registros recentes de Variabilidade da Frequência Cardíaca (HRV). O app só apresenta HRV quando houver uma medição compatível; conectar um dispositivo não garante que ele forneça esse dado.'
      );
    }
    responses.push(
      `${astro ? astro.impactOnHealth.stress + ' ' : ''}Referência sobre medição: [Diretrizes de HRV — American Physiological Society](https://doi.org/10.1152/ajpheart.00041.2026).`
    );
  }

  // 7. Análise de Exercício e Movimento
  if (isActivityQuery) {
    if (metrics?.steps !== null && metrics?.steps !== undefined) {
      responses.push(
        `Você registrou ${metrics.steps} passos recentemente. A contagem não informa sozinha intensidade, duração ou capacidade física e não define uma meta universal de exercício.`
      );
    } else {
      responses.push('Não tenho contagem recente de passos registrada.');
    }
    responses.push(
      `Movimento pode ser incorporado à rotina de acordo com suas possibilidades e condições de saúde, com progressão individual. A leitura astrológica não define intensidade de treino. ${astro ? `Leitura simbólica: ${astro.impactOnHealth.energy} ` : ''}Referência: [Atividade física — OMS](https://www.who.int/health-topics/noncommunicable-diseases/physical-activity).`
    );
  }

  // 8. Análise Astrológica
  if (isAstrologyQuery && astro) {
    responses.push(
      `Neste instante astronômico: Lua em ${astro.moonSign}, sob o domínio de ${astro.nakshatra} durante a fase ${astro.tithi}. Ayanamsha calculado: ${astro.ayanamshaDegrees.toFixed(2)} graus.`
    );
    responses.push('Leituras simbólicas do céu:');
    responses.push(`- Energia: ${astro.impactOnHealth.energy}`);
    responses.push(`- Estresse: ${astro.impactOnHealth.stress}`);
    responses.push(`- Sono: ${astro.impactOnHealth.sleep}`);

    responses.push(
      [
        'Com base nestes astros e nos seus sinais de hoje:',
        `- Dosha: ${doshaTexto}`,
        ...(indicesIntegrativos.length > 0
          ? indicesIntegrativos
          : [`- ${semIndices}`]),
      ].join('\n')
    );
  }

  // 8.1. O dia de hoje pelo coach diário
  if (isDayQuery) {
    if (context.seuDia) {
      responses.push(resumoDoDia(context.seuDia));
      responses.push(
        'Os detalhes de cada período, com o "por quê" de cada dica, estão em "Meu dia" na barra lateral.'
      );
    } else if (text.includes('meu dia') || text.includes('coach')) {
      responses.push(
        `${name}, para eu dizer como será o seu dia por período, escolha no perfil a cidade onde você mora e informe data, hora e cidade de nascimento.`
      );
    }
  }

  // 9. Agendamentos
  if (isConsultationQuery) {
    responses.push(
      `Para organizar sua saúde e atacar metas como ${goals}, nosso hub de profissionais e orquestração clínica está disponível no módulo 'Consultas' na barra lateral. Lá você pode gerenciar os horários de forma centralizada.`
    );
  }

  // 10. Fallback Deterministico
  if (responses.length === 0) {
    responses.push(
      `${name}, o motor de análise estruturou seu contexto: Sua meta principal foca em ${goals}. ${astro ? `O céu atual (Lua em ${astro.moonSign}, ${astro.tithi}) e suas métricas fisiológicas são monitorados para lhe orientar.` : 'Podemos conversar a partir das informações disponíveis e dos sinais que você registrar.'}`
    );
    responses.push(
      `Você pode me perguntar sobre o seu sono, glicose, recuperação (HRV), exercícios, o resumo do dia ou o céu de hoje. Também leio o seu mapa védico (Ascendente, Lua, dasha, casas), o seu Mapa Lyra DM Samādhi e o Score de Ação do Mapa Quantum, e explico Vedanta, Upanishads, Ayurveda, Vastu, música védica e os Vedangas.`
    );
    if (skills.length > 0) {
      responses.push(
        `Também opero sob ${skills.length} ${skills.length === 1 ? 'habilidade configurada' : 'habilidades configuradas'} (${skills
          .map((skill) => skill.title)
          .slice(0, 5)
          .join(', ')}). Pergunte "o que você pode fazer" para ver todas.`
      );
    }
  }

  return responses.join('\n\n');
}
