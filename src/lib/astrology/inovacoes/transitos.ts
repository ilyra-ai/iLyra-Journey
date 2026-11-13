import type { MapaNatal } from '../mapa-natal';
import { longitudeSideral, longitudeTropical, type Graha } from '../sideral';
import { HORA_MS, conferirInstantes, procurarPassagens } from './numerica';

const corpos = [
  'sol',
  'lua',
  'mercurio',
  'venus',
  'marte',
  'jupiter',
  'saturno',
] as const satisfies readonly Graha[];

const aspectos = [
  { nome: 'conjunção', graus: [0] },
  { nome: 'sextil', graus: [-60, 60] },
  { nome: 'quadratura', graus: [-90, 90] },
  { nome: 'trígono', graus: [-120, 120] },
  { nome: 'oposição', graus: [180] },
] as const;

export type ZodiacoDeInovacoes = 'sideral' | 'tropical';

/** Busca aspectos exatos a posições natais, inclusive passagens retrógradas. */
export function calcularTransitosNatais(
  mapa: MapaNatal,
  zodiaco: ZodiacoDeInovacoes,
  inicio: Date,
  fim: Date
) {
  conferirInstantes(inicio, fim, 31);
  if (!mapa.horaConhecida) {
    throw new RangeError(
      'Informe a hora de nascimento para calcular eventos por grau natal exato.'
    );
  }

  const longitudeDo = (corpo: Graha, data: Date) =>
    zodiaco === 'sideral'
      ? longitudeSideral(corpo, data)
      : longitudeTropical(corpo, data);

  const natal = corpos.map((corpo) => ({
    corpo,
    longitude:
      zodiaco === 'sideral'
        ? mapa.planetas.find((p) => p.graha === corpo)!.longitude
        : longitudeDo(corpo, mapa.nascimentoUtc),
  }));

  const eventos: {
    utc: string;
    transito: Graha;
    natal: Graha;
    aspecto: string;
    angulo: number;
    longitudeNatal: number;
    longitudeEmTransito: number;
    movimento: 'direto' | 'retrogrado';
  }[] = [];

  for (const corpo of corpos) {
    const cache = new Map<number, number>();
    const longitude = (data: Date) => {
      const ms = data.getTime();
      let valor = cache.get(ms);
      if (valor === undefined) {
        valor = longitudeDo(corpo, data);
        cache.set(ms, valor);
      }
      return valor;
    };

    for (const ponto of natal) {
      for (const aspecto of aspectos) {
        for (const orientacao of aspecto.graus) {
          const alvo = ponto.longitude + orientacao;
          const datas = procurarPassagens(
            longitude,
            alvo,
            inicio,
            fim,
            corpo === 'lua' ? HORA_MS * 2 : HORA_MS * 6
          );
          for (const data of datas) {
            const delta =
              longitude(new Date(data.getTime() + HORA_MS)) -
              longitude(new Date(data.getTime() - HORA_MS));
            const movimento =
              ((delta + 540) % 360) - 180 >= 0 ? 'direto' : 'retrogrado';
            eventos.push({
              utc: data.toISOString(),
              transito: corpo,
              natal: ponto.corpo,
              aspecto: aspecto.nome,
              angulo: Math.abs(orientacao),
              longitudeNatal: ponto.longitude,
              longitudeEmTransito: longitude(data),
              movimento,
            });
          }
        }
      }
    }
  }
  eventos.sort((a, b) => a.utc.localeCompare(b.utc));
  return {
    versao: 1,
    metodo: 'busca-numerica-efemerides-astronomy-engine',
    zodiaco,
    inicio: inicio.toISOString(),
    fim: fim.toISOString(),
    eventos,
    interpretacao:
      'Aspectos representam alinhamentos geométricos; a interpretação astrológica é simbólica.',
  };
}
