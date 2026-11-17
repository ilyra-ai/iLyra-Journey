import {
  latitudePolar,
  ascendenteSideral,
  type Graha,
  longitudeSideral,
  NOME_DO_GRAHA,
  normalizarGraus,
  posicao,
  type Posicao,
  REGENTE_DO_SIGNO,
} from './sideral';
import { fusoValido, localParaUtc, ocorrenciasLocais } from './tempo';
import type { Intervalo } from './panchang';
import {
  calcularVimshottari,
  dashaVigente,
  type DashaAtual,
  senhorDoNakshatra,
} from './vimshottari';

/**
 * Mapa natal védico (Rashi/D1, casas por signo inteiro a partir do Lagna).
 */

export interface DadosDeNascimento {
  /** AAAA-MM-DD local. */
  data: string;
  /** HH:mm local; sem hora o Lagna e as casas não são calculados. */
  hora: string | null;
  /** A hora foi estimada pela pessoa (janela do dia), não lida de um registro. */
  horaEstimada?: boolean;
  latitude: number;
  longitude: number;
  /** Fuso IANA do local de nascimento. */
  fuso: string;
}

export interface PlanetaNoMapa extends Posicao {
  graha: Graha;
  nome: string;
  /** Casa (1 a 12) contada do Lagna; null sem hora de nascimento. */
  casa: number | null;
  retrogrado: boolean;
}

/**
 * De onde vem a hora do mapa: informada pela pessoa, estimada por ela ao
 * escolher uma janela do dia de nascimento, ou desconhecida (o cálculo usa
 * 12:00 local e não tem Lagna).
 */
export type PrecisaoDaHora = 'informada' | 'estimada' | 'desconhecida';

/**
 * Sem a hora de nascimento, a Lua pode estar em mais de um signo e de um
 * nakshatra ao longo do dia civil, e o período de vida (dasha) depende dela.
 * Em vez de escolher um instante, o motor lista o que é possível naquele dia.
 */
export interface PossibilidadesSemHora {
  /** Índices dos signos em que a Lua esteve no dia, na ordem do dia. */
  signosDaLua: number[];
  /** Índices dos nakshatras em que a Lua esteve no dia, na ordem do dia. */
  nakshatrasDaLua: number[];
  /** Mahadashas que estariam vigentes hoje, conforme a hora do nascimento. */
  mahadashas: Graha[];
}

export interface MapaNatal {
  nascimentoUtc: Date;
  /** Sem hora de nascimento, o mapa usa 12:00 local e não tem Lagna. */
  horaConhecida: boolean;
  /**
   * Motivo de o Lagna não existir mesmo com a hora conhecida: nascimento
   * além do Círculo Polar. `null` nos demais casos.
   */
  limiteDoLagna: 'latitude-polar' | null;
  /**
   * A hora informada caiu numa mudança de horário de verão ou de fuso:
   * `repetida` (ocorreu duas vezes; o mapa usa a primeira) ou `inexistente`
   * (não existiu; o mapa usa o relógio adiantado). O perfil guarda só a hora
   * local, então o motor declara a escolha em vez de escondê-la.
   */
  horarioAmbiguo: 'repetida' | 'inexistente' | null;
  precisaoDaHora: PrecisaoDaHora;
  /** Dia civil de nascimento (só com a hora desconhecida). */
  diaDeNascimento: Intervalo | null;
  /** O que é possível no dia de nascimento (só com a hora desconhecida). */
  possibilidades: PossibilidadesSemHora | null;
  lagna: (Posicao & { regente: Graha; nomeDoRegente: string }) | null;
  planetas: PlanetaNoMapa[];
  lua: PlanetaNoMapa;
  /** Senhor do nakshatra da Lua natal (início do Vimshottari). */
  senhorDoNakshatraNatal: Graha;
  /**
   * Mahadasha e Antardasha vigentes. `null` fora dos 120 anos do ciclo e
   * também com a hora desconhecida: nesse caso o período não é determinável
   * e as alternativas estão em `possibilidades`.
   */
  dasha: DashaAtual | null;
}

const GRAHAS: Graha[] = [
  'sol',
  'lua',
  'marte',
  'mercurio',
  'jupiter',
  'venus',
  'saturno',
  'rahu',
  'ketu',
];

function retrogrado(graha: Graha, instante: Date) {
  // Sol e Lua nunca retrogradam; os nodos médios estão sempre em movimento
  // retrógrado.
  if (graha === 'sol' || graha === 'lua') return false;
  if (graha === 'rahu' || graha === 'ketu') return true;
  const antes = longitudeSideral(
    graha,
    new Date(instante.getTime() - 43_200_000)
  );
  const depois = longitudeSideral(
    graha,
    new Date(instante.getTime() + 43_200_000)
  );
  return normalizarGraus(depois - antes + 180) - 180 < 0;
}

const MEIA_HORA = 1_800_000;

function diaCivil(data: string, fuso: string): Intervalo {
  const [ano, mes, dia] = data.split('-').map(Number);
  const seguinte = new Date(Date.UTC(ano, mes - 1, dia + 1))
    .toISOString()
    .slice(0, 10);
  return {
    inicio: localParaUtc(data, '00:00', fuso),
    fim: localParaUtc(seguinte, '00:00', fuso),
  };
}

/**
 * Percorre o dia civil de nascimento de meia em meia hora (e no último
 * instante) e reúne os signos e nakshatras da Lua e os Mahadashas que
 * estariam vigentes em `agora` para cada hora possível de nascimento.
 */
function possibilidadesDoDia(
  dia: Intervalo,
  agora: Date
): PossibilidadesSemHora {
  const signos = new Set<number>();
  const nakshatras = new Set<number>();
  const mahadashas = new Set<Graha>();
  const fim = dia.fim.getTime() - 1;
  const instantes: number[] = [];
  for (let ms = dia.inicio.getTime(); ms < fim; ms += MEIA_HORA) {
    instantes.push(ms);
  }
  instantes.push(fim);
  for (const ms of instantes) {
    const instante = new Date(ms);
    const lua = posicao(longitudeSideral('lua', instante));
    signos.add(lua.signo);
    nakshatras.add(lua.nakshatra);
    const vigente = dashaVigente(
      calcularVimshottari(lua.longitude, instante),
      agora
    );
    if (vigente) mahadashas.add(vigente.mahadasha.graha);
  }
  return {
    signosDaLua: [...signos],
    nakshatrasDaLua: [...nakshatras],
    mahadashas: [...mahadashas],
  };
}

/**
 * Recusa datas e horas que não existem no calendário e locais fora do globo.
 * Sem esta conferência, "1990-02-30" virava 2 de março e "25:99" o dia
 * seguinte, e o mapa saía calculado para outro instante sem aviso.
 */
export function conferirNascimento(nascimento: DadosDeNascimento) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nascimento.data))
    throw new RangeError('Informe a data de nascimento no formato AAAA-MM-DD.');
  const [ano, mes, dia] = nascimento.data.split('-').map(Number);
  if (
    new Date(Date.UTC(ano, mes - 1, dia)).toISOString().slice(0, 10) !==
    nascimento.data
  )
    throw new RangeError('A data de nascimento não existe no calendário.');
  if (
    nascimento.hora !== null &&
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(nascimento.hora)
  )
    throw new RangeError('Hora de nascimento inválida; informe HH:mm.');
  if (!fusoValido(nascimento.fuso))
    throw new RangeError('Fuso horário do local de nascimento desconhecido.');
  if (
    !Number.isFinite(nascimento.latitude) ||
    !Number.isFinite(nascimento.longitude) ||
    Math.abs(nascimento.latitude) > 90 ||
    Math.abs(nascimento.longitude) > 180
  )
    throw new RangeError('Local de nascimento inválido.');
}

function horarioAmbiguo(
  data: string,
  hora: string,
  fuso: string
): MapaNatal['horarioAmbiguo'] {
  const ocorrencias = ocorrenciasLocais(data, hora, fuso).length;
  return ocorrencias === 0
    ? 'inexistente'
    : ocorrencias > 1
      ? 'repetida'
      : null;
}

export function calcularMapaNatal(
  nascimento: DadosDeNascimento,
  agora: Date = new Date()
): MapaNatal {
  conferirNascimento(nascimento);
  const horaConhecida = Boolean(nascimento.hora);
  const instante = localParaUtc(
    nascimento.data,
    nascimento.hora ?? '12:00',
    nascimento.fuso
  );

  const polar = latitudePolar(nascimento.latitude);
  const lagnaLongitude =
    horaConhecida && !polar
      ? ascendenteSideral(instante, nascimento.latitude, nascimento.longitude)
      : null;
  const signoDoLagna =
    lagnaLongitude === null ? null : Math.floor(lagnaLongitude / 30);

  const planetas = GRAHAS.map((graha): PlanetaNoMapa => {
    const pos = posicao(longitudeSideral(graha, instante));
    return {
      ...pos,
      graha,
      nome: NOME_DO_GRAHA[graha],
      casa:
        signoDoLagna === null
          ? null
          : ((pos.signo - signoDoLagna + 12) % 12) + 1,
      retrogrado: retrogrado(graha, instante),
    };
  });
  const lua = planetas.find((p) => p.graha === 'lua') as PlanetaNoMapa;
  const diaDeNascimento = horaConhecida
    ? null
    : diaCivil(nascimento.data, nascimento.fuso);

  return {
    nascimentoUtc: instante,
    horaConhecida,
    limiteDoLagna: horaConhecida && polar ? 'latitude-polar' : null,
    horarioAmbiguo: horaConhecida
      ? horarioAmbiguo(nascimento.data, nascimento.hora!, nascimento.fuso)
      : null,
    precisaoDaHora: !horaConhecida
      ? 'desconhecida'
      : nascimento.horaEstimada
        ? 'estimada'
        : 'informada',
    diaDeNascimento,
    possibilidades: diaDeNascimento
      ? possibilidadesDoDia(diaDeNascimento, agora)
      : null,
    lagna:
      lagnaLongitude === null
        ? null
        : (() => {
            const pos = posicao(lagnaLongitude);
            const regente = REGENTE_DO_SIGNO[pos.signo];
            return { ...pos, regente, nomeDoRegente: NOME_DO_GRAHA[regente] };
          })(),
    planetas,
    lua,
    senhorDoNakshatraNatal: senhorDoNakshatra(lua.nakshatra),
    // Com a hora desconhecida, a Lua do meio-dia não define o período.
    dasha: horaConhecida
      ? dashaVigente(calcularVimshottari(lua.longitude, instante), agora)
      : null,
  };
}

/** Projeta os períodos sem repetir a astronomia imutável do nascimento. */
export function mapaNatalNaData(mapa: MapaNatal, agora: Date): MapaNatal {
  return {
    ...mapa,
    possibilidades: mapa.diaDeNascimento
      ? possibilidadesDoDia(mapa.diaDeNascimento, agora)
      : null,
    dasha: mapa.horaConhecida
      ? dashaVigente(
          calcularVimshottari(mapa.lua.longitude, mapa.nascimentoUtc),
          agora
        )
      : null,
  };
}
