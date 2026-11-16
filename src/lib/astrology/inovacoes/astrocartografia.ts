import {
  Body,
  EquatorFromVector,
  GeoVector,
  MakeTime,
  RotateVector,
  Rotation_EQJ_EQD,
  SiderealTime,
} from 'astronomy-engine';
import { ascendenteSideral, ayanamshaLahiri } from '../sideral';
import { limitarLocal, normalizarAngulo } from './numerica';
import type { ZodiacoDeInovacoes } from './transitos';

const corpos = [
  { nome: 'Sol', codigo: Body.Sun },
  { nome: 'Lua', codigo: Body.Moon },
  { nome: 'Mercúrio', codigo: Body.Mercury },
  { nome: 'Vênus', codigo: Body.Venus },
  { nome: 'Marte', codigo: Body.Mars },
  { nome: 'Júpiter', codigo: Body.Jupiter },
  { nome: 'Saturno', codigo: Body.Saturn },
] as const;

type Ponto = { latitude: number; longitude: number };

function longitudeGeografica(valor: number) {
  return normalizarAngulo(valor + 180) - 180;
}

/** Recorta trajetos na descontinuidade de longitude do antimeridiano. */
export function dividirNoAntimeridiano(pontos: Ponto[]): Ponto[][] {
  const segmentos: Ponto[][] = [];
  let segmento: Ponto[] = [];
  for (const ponto of pontos) {
    const ultimo = segmento[segmento.length - 1];
    if (ultimo && Math.abs(ultimo.longitude - ponto.longitude) > 180) {
      if (segmento.length > 1) segmentos.push(segmento);
      segmento = [];
    }
    segmento.push(ponto);
  }
  if (segmento.length > 1) segmentos.push(segmento);
  return segmentos;
}

/** Linhas AS/DS/MC/IC geocêntricas sobre o globo no instante natal. */
export function calcularLinhasAstrocartograficas(instante: Date) {
  if (!Number.isFinite(instante.getTime()))
    throw new RangeError('Instante natal inválido.');
  const tempo = MakeTime(instante);
  const sideralGreenwich = SiderealTime(tempo) * 15;
  const rotacao = Rotation_EQJ_EQD(tempo);
  const linhas: {
    planeta: string;
    angulo: 'MC' | 'IC' | 'AS' | 'DS';
    segmentos: Ponto[][];
  }[] = [];

  for (const corpo of corpos) {
    const vetorDeData = RotateVector(
      rotacao,
      GeoVector(corpo.codigo, tempo, true)
    );
    const coordenadas = EquatorFromVector(vetorDeData);
    const meridiano = longitudeGeografica(
      coordenadas.ra * 15 - sideralGreenwich
    );
    for (const angulo of ['MC', 'IC'] as const) {
      const lon = longitudeGeografica(meridiano + (angulo === 'IC' ? 180 : 0));
      linhas.push({
        planeta: corpo.nome,
        angulo,
        segmentos: [
          Array.from({ length: 81 }, (_, i) => ({
            latitude: -80 + i * 2,
            longitude: lon,
          })),
        ],
      });
    }

    for (const angulo of ['AS', 'DS'] as const) {
      let pontos: Ponto[] = [];
      const segmentos: Ponto[][] = [];
      for (let latitude = -89; latitude <= 89; latitude += 1) {
        const phi = (latitude * Math.PI) / 180;
        const delta = (coordenadas.dec * Math.PI) / 180;
        const c = -Math.tan(phi) * Math.tan(delta);
        if (Math.abs(c) > 1) {
          segmentos.push(...dividirNoAntimeridiano(pontos));
          pontos = [];
          continue;
        }
        const h = (Math.acos(c) * 180) / Math.PI;
        const lon = longitudeGeografica(meridiano + (angulo === 'AS' ? -h : h));
        pontos.push({ latitude, longitude: lon });
      }
      segmentos.push(...dividirNoAntimeridiano(pontos));
      linhas.push({ planeta: corpo.nome, angulo, segmentos });
    }
  }
  return {
    versao: 1,
    metodo: 'geocentrico-EQD-sem-paralaxe-ou-refracao',
    nascimentoUtc: instante.toISOString(),
    linhas,
    limite:
      'As linhas AS/DS são geocêntricas, sem paralaxe lunar, refração, relevo ou efeitos topocêntricos.',
  };
}

/** Recalcula apenas o ascendente da localidade: UTC natal é imutável. */
export function compararAscendentesRelocados(
  instante: Date,
  localOriginal: { latitude: number; longitude: number },
  localConsultado: { latitude: number; longitude: number },
  zodiaco: ZodiacoDeInovacoes
) {
  limitarLocal(localOriginal.latitude, localOriginal.longitude);
  limitarLocal(localConsultado.latitude, localConsultado.longitude);
  if (
    Math.abs(localOriginal.latitude) >= 66.56 ||
    Math.abs(localConsultado.latitude) >= 66.56
  ) {
    throw new RangeError(
      'O cálculo de ascendente relocalizado não está disponível em latitude polar.'
    );
  }
  const converter = (local: { latitude: number; longitude: number }) => {
    const sideral = ascendenteSideral(
      instante,
      local.latitude,
      local.longitude
    );
    return zodiaco === 'sideral'
      ? sideral
      : normalizarAngulo(sideral + ayanamshaLahiri(instante));
  };
  return {
    nascimentoUtc: instante.toISOString(),
    zodiaco,
    ascendenteOriginal: converter(localOriginal),
    ascendenteRelocado: converter(localConsultado),
    localConsultado: { ...localConsultado },
    limite:
      'A consulta mantém o mesmo instante natal, sem alterar o local de nascimento do perfil.',
  };
}
