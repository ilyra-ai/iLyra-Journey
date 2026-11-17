import type { MapaNatal } from '../mapa-natal';
import {
  ascendenteSideral,
  ascendenteTropical,
  latitudePolar,
  longitudeSideral,
  longitudeTropical,
} from '../sideral';
import {
  HORA_MS,
  conferirInstantes,
  limitarLocal,
  normalizarAngulo,
  procurarPassagens,
} from './numerica';
import type { ZodiacoDeInovacoes } from './transitos';

const corpos = [
  'sol',
  'lua',
  'mercurio',
  'venus',
  'marte',
  'jupiter',
  'saturno',
] as const;

type CorpoDeRetorno = 'sol' | 'lua';

/** Revolução = retorno exato ao grau eclíptico natal, não aniversário civil. */
export function calcularRetornos(
  mapa: MapaNatal,
  corpo: CorpoDeRetorno,
  zodiaco: ZodiacoDeInovacoes,
  inicio: Date,
  fim: Date,
  local: { latitude: number; longitude: number; nome: string }
) {
  conferirInstantes(inicio, fim, 370);
  limitarLocal(local.latitude, local.longitude);
  if (!local.nome.trim())
    throw new RangeError('Informe a localidade para a carta de retorno.');
  if (latitudePolar(local.latitude))
    throw new RangeError('Casas de retorno indisponíveis em latitude polar.');
  if (!mapa.horaConhecida)
    throw new RangeError('A revolução requer hora natal conhecida.');

  const longitudeDo = (nome: (typeof corpos)[number], data: Date) =>
    zodiaco === 'sideral'
      ? longitudeSideral(nome, data)
      : longitudeTropical(nome, data);
  const longitudeNatal = longitudeDo(corpo, mapa.nascimentoUtc);
  const passagens = procurarPassagens(
    (data) => longitudeDo(corpo, data),
    longitudeNatal,
    inicio,
    fim,
    corpo === 'lua' ? 2 * HORA_MS : 12 * HORA_MS
  );
  const retornos = passagens.map((instante) => {
    const ascendente =
      zodiaco === 'sideral'
        ? ascendenteSideral(instante, local.latitude, local.longitude)
        : ascendenteTropical(instante, local.latitude, local.longitude);
    const planetas = corpos.map((planeta) => {
      const longitude = longitudeDo(planeta, instante);
      const signo = Math.floor(longitude / 30);
      const casa =
        zodiaco === 'sideral'
          ? ((signo - Math.floor(ascendente / 30) + 12) % 12) + 1
          : Math.floor(normalizarAngulo(longitude - ascendente) / 30) + 1;
      return { planeta, longitude, signo, casa };
    });
    return {
      instanteUtc: instante.toISOString(),
      longitudeNatal,
      longitudeDoRetorno: longitudeDo(corpo, instante),
      ascendente,
      planetas,
      local: { ...local },
    };
  });
  return {
    versao: 1,
    tipo: corpo === 'sol' ? 'revolucao-solar' : 'revolucao-lunar',
    zodiaco,
    inicio: inicio.toISOString(),
    fim: fim.toISOString(),
    retornos,
    interpretacao:
      'Retornos são coincidências de longitudes astronômicas; a leitura astrológica é simbólica.',
  };
}
