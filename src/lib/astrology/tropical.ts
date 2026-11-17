import {
  Body,
  Ecliptic,
  GeoVector,
  MakeTime,
  SiderealTime,
  e_tilt,
} from 'astronomy-engine';
import { cidadePorId } from '@/lib/geo/cidades';
import { SIGNOS, longitudeTropical, normalizarGraus } from './sideral';
import { fusoValido, ocorrenciasLocais } from './tempo';

const HORA = 3_600_000;
const DIA = 24 * HORA;
const CLASSICOS = [
  'sol',
  'lua',
  'mercurio',
  'venus',
  'marte',
  'jupiter',
  'saturno',
] as const;
const EXTERIORES = {
  urano: Body.Uranus,
  netuno: Body.Neptune,
  plutao: Body.Pluto,
} as const;
export type PlanetaTropical =
  (typeof CLASSICOS)[number] | keyof typeof EXTERIORES;

export const planetasTropicais = [
  ...CLASSICOS,
  ...Object.keys(EXTERIORES),
] as readonly PlanetaTropical[];

export interface BaseNatalTropical {
  planetas: Record<PlanetaTropical, number>;
  ascendente: number | null;
}

export interface PosicaoTropical {
  longitude: number;
  signo: (typeof SIGNOS)[number];
  indice: number;
  grauNoSigno: number;
}

function posicaoTropical(longitude: number): PosicaoTropical {
  const normalizada = normalizarGraus(longitude);
  const indice = Math.floor(normalizada / 30);
  return {
    longitude: normalizada,
    signo: SIGNOS[indice],
    indice,
    grauNoSigno: normalizada % 30,
  };
}

/** Calendário gregoriano; intervalo de cálculo deliberadamente limitado e testável. */
export function validarDataTropical(data: string, agora = new Date()): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data))
    throw new RangeError('Informe a data no formato AAAA-MM-DD.');
  const [ano, mes, dia] = data.split('-').map(Number);
  const instante = Date.UTC(ano, mes - 1, dia);
  if (ano < 1900 || new Date(instante).toISOString().slice(0, 10) !== data)
    throw new RangeError(
      'Data inexistente ou anterior ao intervalo suportado de 1900.'
    );
  if (data > agora.toISOString().slice(0, 10))
    throw new RangeError('A data de nascimento não pode estar no futuro.');
  return instante;
}

/** Sem hora/local, considera todo o dia civil em UTC−12 a UTC+14; não adota um nascimento fictício. */
export function calcularSolPorData(data: string, agora = new Date()) {
  const meiaNoite = validarDataTropical(data, agora);
  const inicio = meiaNoite - 14 * HORA;
  const fim = Math.min(meiaNoite + DIA + 12 * HORA - 1, agora.getTime());
  const signos = new Set<(typeof SIGNOS)[number]>();
  for (let instante = inicio; instante < fim; instante += HORA) {
    signos.add(
      posicaoTropical(longitudeTropical('sol', new Date(instante))).signo
    );
  }
  signos.add(posicaoTropical(longitudeTropical('sol', new Date(fim))).signo);
  const possiveis = [...signos];
  return {
    versao: 1 as const,
    zodiaco: 'tropical' as const,
    metodo:
      'astronomy-engine/geocentrico-ecliptica-verdadeira-da-data' as const,
    nascimento: { data, hora: null, cidade: null },
    precisao:
      possiveis.length === 1
        ? ('signo-solar-confirmado-na-janela' as const)
        : ('signo-solar-pode-variar' as const),
    janelaUtc: {
      inicio: new Date(inicio).toISOString(),
      fim: new Date(fim).toISOString(),
    },
    sol: {
      signo: possiveis.length === 1 ? possiveis[0] : null,
      signosPossiveis: possiveis,
    },
    faltando: ['hora', 'cidade'],
    indisponivel: [
      'grau natal exato',
      'Lua natal precisa',
      'ascendente',
      'casas',
      'aspectos natais',
    ],
  };
}

function instanteLocal(
  data: string,
  hora: string,
  fuso: string,
  ocorrencia?: 'anterior' | 'posterior'
) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora))
    throw new RangeError('Hora inválida; informe HH:mm.');
  if (!fusoValido(fuso)) throw new RangeError('Fuso IANA indisponível.');
  const candidatos = ocorrenciasLocais(data, hora, fuso);
  if (!candidatos.length)
    throw new RangeError(
      'Esse horário local não existiu devido à mudança de fuso ou horário de verão.'
    );
  if (candidatos.length > 1 && !ocorrencia)
    throw new RangeError(
      'Esse horário local ocorreu duas vezes; informe a ocorrência anterior ou posterior.'
    );
  return new Date(
    ocorrencia === 'posterior'
      ? candidatos[candidatos.length - 1]
      : candidatos[0]
  );
}

function ascendenteTropical(
  instante: Date,
  latitude: number,
  longitude: number
) {
  const tempo = MakeTime(instante);
  const r = ((SiderealTime(tempo) * 15 + longitude) * Math.PI) / 180;
  const e = (e_tilt(tempo).tobl * Math.PI) / 180;
  const fi = (latitude * Math.PI) / 180;
  return posicaoTropical(
    (Math.atan2(
      Math.cos(r),
      -(Math.sin(r) * Math.cos(e) + Math.tan(fi) * Math.sin(e))
    ) *
      180) /
      Math.PI
  );
}

/** Casas iguais de 30° a partir do ascendente: sistema explícito, distinto das casas védicas por signo inteiro. */
export function calcularMapaTropical(
  entrada: {
    data: string;
    hora: string;
    cidadeId: number;
    ocorrencia?: 'anterior' | 'posterior';
  },
  agora = new Date()
) {
  validarDataTropical(entrada.data, agora);
  if (!Number.isSafeInteger(entrada.cidadeId))
    throw new RangeError('Selecione uma cidade válida.');
  const cidade = cidadePorId(entrada.cidadeId);
  if (!cidade) throw new RangeError('Cidade não encontrada na base local.');
  return calcularMapaTropicalPorLocal(
    {
      data: entrada.data,
      hora: entrada.hora,
      ocorrencia: entrada.ocorrencia,
      local: {
        nome: cidade.rotulo,
        fuso: cidade.fuso,
        latitude: cidade.latitude,
        longitude: cidade.longitude,
      },
    },
    agora
  );
}

/** Coordenadas verificadas do perfil; não depende de reidentificar cidades homônimas. */
export function calcularMapaTropicalPorLocal(
  entrada: Parameters<typeof prepararNascimentoTropical>[0],
  agora = new Date()
) {
  const nascimento = prepararNascimentoTropical(entrada, agora);
  return montarMapaTropical(nascimento, calcularBaseTropical(nascimento));
}

export function prepararNascimentoTropical(
  entrada: {
    data: string;
    hora: string;
    ocorrencia?: 'anterior' | 'posterior';
    local: { nome: string; fuso: string; latitude: number; longitude: number };
  },
  agora = new Date()
) {
  validarDataTropical(entrada.data, agora);
  const cidade = entrada.local;
  if (
    !cidade.nome.trim() ||
    !Number.isFinite(cidade.latitude) ||
    !Number.isFinite(cidade.longitude) ||
    Math.abs(cidade.latitude) > 90 ||
    Math.abs(cidade.longitude) > 180
  )
    throw new RangeError('Local de nascimento inválido.');
  const instante = instanteLocal(
    entrada.data,
    entrada.hora,
    cidade.fuso,
    entrada.ocorrencia
  );
  if (instante > agora)
    throw new RangeError('O instante de nascimento não pode estar no futuro.');
  return {
    data: entrada.data,
    hora: entrada.hora,
    instanteUtc: instante.toISOString(),
    cidade: { ...cidade },
  };
}

type NascimentoTropical = ReturnType<typeof prepararNascimentoTropical>;

export function calcularBaseTropical(
  nascimento: NascimentoTropical
): BaseNatalTropical {
  const instante = new Date(nascimento.instanteUtc);
  const { cidade } = nascimento;
  const planetas = Object.fromEntries(
    planetasTropicais.map((planeta) => [
      planeta,
      normalizarGraus(
        planeta === 'urano' || planeta === 'netuno' || planeta === 'plutao'
          ? Ecliptic(GeoVector(EXTERIORES[planeta], MakeTime(instante), true))
              .elon
          : longitudeTropical(planeta, instante)
      ),
    ])
  ) as BaseNatalTropical['planetas'];
  const polar = Math.abs(cidade.latitude) >= 66.56;
  return {
    planetas,
    ascendente: polar
      ? null
      : ascendenteTropical(instante, cidade.latitude, cidade.longitude)
          .longitude,
  };
}

export function montarMapaTropical(
  nascimento: NascimentoTropical,
  base: BaseNatalTropical
) {
  const planetas = planetasTropicais.map((planeta) => ({
    planeta,
    posicao: posicaoTropical(base.planetas[planeta]),
  }));
  const ascendente =
    base.ascendente === null ? null : posicaoTropical(base.ascendente);
  const casas = ascendente
    ? Array.from({ length: 12 }, (_, indice) => ({
        numero: indice + 1,
        cuspide: posicaoTropical(ascendente.longitude + indice * 30),
      }))
    : null;
  const aspectos: {
    primeiro: PlanetaTropical;
    segundo: PlanetaTropical;
    aspecto: string;
    angulo: number;
    orbe: number;
  }[] = [];
  const principais = [
    { nome: 'conjunção', angulo: 0, orbe: 6 },
    { nome: 'sextil', angulo: 60, orbe: 4 },
    { nome: 'quadratura', angulo: 90, orbe: 6 },
    { nome: 'trígono', angulo: 120, orbe: 6 },
    { nome: 'oposição', angulo: 180, orbe: 6 },
  ];
  for (let i = 0; i < planetas.length; i++) {
    for (let j = i + 1; j < planetas.length; j++) {
      const distancia = Math.abs(
        ((planetas[i].posicao.longitude - planetas[j].posicao.longitude + 540) %
          360) -
          180
      );
      for (const aspecto of principais) {
        const orbe = Math.abs(distancia - aspecto.angulo);
        if (orbe <= aspecto.orbe)
          aspectos.push({
            primeiro: planetas[i].planeta,
            segundo: planetas[j].planeta,
            aspecto: aspecto.nome,
            angulo: aspecto.angulo,
            orbe,
          });
      }
    }
  }
  return {
    versao: 1 as const,
    zodiaco: 'tropical' as const,
    metodo:
      'astronomy-engine/geocentrico-ecliptica-verdadeira-da-data' as const,
    nascimento,
    precisao: 'horario-local-informado' as const,
    sistemaDeCasas: 'iguais-a-partir-do-ascendente' as const,
    planetas,
    ascendente,
    casas,
    aspectos,
    faltando: [],
    indisponivel: !ascendente
      ? [
          'ascendente e casas não calculados nesta implementação em latitude polar',
        ]
      : [],
    interpretacao:
      'As posições são cálculos astronômicos; seu significado astrológico é simbólico.' as const,
  };
}
