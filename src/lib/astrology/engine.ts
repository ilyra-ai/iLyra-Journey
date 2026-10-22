import { calcularMapaNatal } from './mapa-natal';
import {
  ayanamshaLahiri,
  longitudeSideral,
  NAKSHATRAS,
  normalizarGraus,
  SIGNOS,
} from './sideral';
import { fusoValido } from './tempo';

/** Dados de nascimento do perfil (colunas de `profiles`). */
export interface BirthReference {
  birth_date?: string | Date | null;
  birth_time?: string | null;
  birth_location?: string | null;
  birth_latitude?: number | string | null;
  birth_longitude?: number | string | null;
  birth_timezone?: string | null;
}

export interface AstrologicalData {
  moonPhase: number;
  moonSign: string;
  sunSign: string;
  /** Mahadasha / Antardasha vigentes (só com nascimento completo). */
  currentDasha?: string;
  nakshatra: string;
  tithi: string;
  paksha: string;
  ayanamshaDegrees: number;
  impactOnHealth: {
    sleep: string;
    energy: string;
    stress: string;
  };
}

const shuklaTithis = [
  'Pratipada',
  'Dvitiya',
  'Tritiya',
  'Chaturthi',
  'Panchami',
  'Shashthi',
  'Saptami',
  'Ashtami',
  'Navami',
  'Dashami',
  'Ekadashi',
  'Dwadashi',
  'Trayodashi',
  'Chaturdashi',
  'Purnima',
];

const krishnaTithis = [...shuklaTithis.slice(0, 14), 'Amavasya'];

function buildTithi(phaseAngle: number) {
  const rawTithi = Math.floor(normalizarGraus(phaseAngle) / 12) + 1;
  const waxing = rawTithi <= 15;
  const paksha = waxing ? 'Shukla Paksha' : 'Krishna Paksha';
  const tithiNumber = waxing ? rawTithi : rawTithi - 15;
  const label = waxing
    ? shuklaTithis[tithiNumber - 1]
    : krishnaTithis[tithiNumber - 1];
  return {
    paksha,
    tithi: `${label} (${paksha})`,
  };
}

function buildHealthImpact(
  moonPhase: number,
  moonSign: string,
  paksha: string
) {
  const nearFullMoon = moonPhase >= 0.45 && moonPhase <= 0.55;
  const nearNewMoon = moonPhase <= 0.06 || moonPhase >= 0.94;

  if (nearFullMoon) {
    return {
      sleep:
        'Lua Cheia: na leitura simbólica, um convite à pausa e à reflexão. A fase lunar não permite avaliar seu sono ou prever sua recuperação.',
      energy: `Lua em ${moonSign}: expansão como tema simbólico de reflexão, sem medir disposição física ou definir intensidade de treino.`,
      stress:
        'Leitura simbólica de expressão e observação das emoções; não é uma avaliação de estresse ou da resposta autonômica.',
    };
  }

  if (nearNewMoon) {
    return {
      sleep:
        'Lua Nova: na leitura simbólica, um convite ao recolhimento. A fase lunar não comprova sono profundo ou recuperação física.',
      energy: `Lua em ${moonSign}: recolhimento como tema simbólico, sem determinar sua capacidade física ou o treino indicado.`,
      stress:
        'Leitura simbólica de introspecção e revisão de prioridades, sem inferir o estado emocional da pessoa.',
    };
  }

  if (paksha === 'Shukla Paksha') {
    return {
      sleep:
        'Lua crescente: crescimento é um tema simbólico desta fase, não uma medição de ativação ou profundidade do sono.',
      energy: `Lua em ${moonSign}: crescimento como tema simbólico de planejamento, sem prever desempenho ou resposta metabólica.`,
      stress:
        'Leitura simbólica de construção e planejamento; o estresse real depende dos seus relatos e sinais, não da fase lunar.',
    };
  }

  return {
    sleep:
      'Lua minguante: recolhimento é um tema simbólico, sem estabelecer como seu corpo dorme ou responde à rotina.',
    energy: `Lua em ${moonSign}: revisão como tema simbólico, sem inferir fadiga ou necessidades fisiológicas.`,
    stress:
      'Leitura simbólica de revisão e pausa, sem prever alterações de humor ou fadiga.',
  };
}

function numero(valor: number | string | null | undefined) {
  if (valor === null || valor === undefined || valor === '') return null;
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : null;
}

function dataIso(valor: string | Date | null | undefined) {
  if (!valor) return null;
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}/.test(valor) ? valor.slice(0, 10) : null;
}

/**
 * Mahadasha e Antardasha vigentes, calculados do mapa natal real. Exige data
 * de nascimento e local escolhido da base de cidades (coordenadas e fuso);
 * antes este campo era só um texto fixo.
 */
function buildCurrentDasha(date: Date, nascimento?: BirthReference) {
  const data = dataIso(nascimento?.birth_date);
  const latitude = numero(nascimento?.birth_latitude);
  const longitude = numero(nascimento?.birth_longitude);
  const fuso = nascimento?.birth_timezone;
  if (
    !data ||
    latitude === null ||
    longitude === null ||
    !fuso ||
    !fusoValido(fuso)
  ) {
    return undefined;
  }
  const dasha = calcularMapaNatal(
    {
      data,
      hora: nascimento?.birth_time ? nascimento.birth_time.slice(0, 5) : null,
      latitude,
      longitude,
      fuso,
    },
    date
  ).dasha;
  if (!dasha) return undefined;
  const ate = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(dasha.antardasha.fim);
  return `Mahadasha de ${dasha.mahadasha.nome}, Antardasha de ${dasha.antardasha.nome} (até ${ate})`;
}

export function getAstrologicalContext(
  date: Date = new Date(),
  birthReference?: BirthReference
): AstrologicalData {
  const ayanamshaDegrees = Number(ayanamshaLahiri(date).toFixed(6));
  const siderealMoonLongitude = longitudeSideral('lua', date);
  const siderealSunLongitude = longitudeSideral('sol', date);
  const phaseAngle = normalizarGraus(
    siderealMoonLongitude - siderealSunLongitude
  );
  const moonPhase = Number((phaseAngle / 360).toFixed(6));

  const moonSignIndex = Math.floor(siderealMoonLongitude / 30);
  const sunSignIndex = Math.floor(siderealSunLongitude / 30);
  const nakshatraIndex = Math.floor(siderealMoonLongitude / (360 / 27));
  const { paksha, tithi } = buildTithi(phaseAngle);

  return {
    moonPhase,
    moonSign: SIGNOS[moonSignIndex],
    sunSign: SIGNOS[sunSignIndex],
    currentDasha: buildCurrentDasha(date, birthReference),
    nakshatra: NAKSHATRAS[nakshatraIndex],
    tithi,
    paksha,
    ayanamshaDegrees,
    impactOnHealth: buildHealthImpact(moonPhase, SIGNOS[moonSignIndex], paksha),
  };
}
