/**
 * Referências independentes para conferir o Motor astrológico (tarefa 183).
 * Nenhum valor aqui vem do próprio app: cada número foi obtido de uma fonte
 * externa citada em `FONTES`, com a data da consulta. O app calcula com o
 * astronomy-engine; as referências vêm do Swiss Ephemeris e do JPL.
 */

export const FONTES = {
  swiss:
    'Swiss Ephemeris 2.10.03 (pyswisseph, efemérides Moshier, SIDM_LAHIRI, Rahu = nodo médio, Lagna por houses_ex sideral)',
  jpl: 'JPL Horizons DE441, geocêntrico 500@399, quantidade 31 (longitude aparente na eclíptica da data), consulta de 09/11/2026',
} as const;

export type Fonte = keyof typeof FONTES;

/** Tolerâncias: o que se espera de diferença entre motores corretos. */
export const TOLERANCIAS = {
  longitude: 0.02,
  ayanamsha: 0.01,
  lagna: 0.05,
  /** Datas do Vimshottari: 0,008° na Lua desloca cerca de 1 dia. */
  diasDoDasha: 2,
} as const;

interface ReferenciaSideral {
  id: string;
  rotulo: string;
  instante: string;
  latitude: number;
  longitude: number;
  ayanamsha: number;
  lagna: number;
  planetas: Record<string, number>;
}

export const REFERENCIAS_SIDERAIS: readonly ReferenciaSideral[] = [
  {
    id: 'sp-1990',
    rotulo: 'São Paulo, 01/12/1990 12:30 UTC',
    instante: '1990-12-01T12:30:00Z',
    latitude: -23.5475,
    longitude: -46.6361,
    ayanamsha: 23.73019974,
    lagna: 283.2392,
    planetas: {
      sol: 225.3188,
      lua: 33.796,
      marte: 40.2534,
      mercurio: 245.6554,
      jupiter: 109.8593,
      venus: 232.7243,
      saturno: 268.6392,
      rahu: 277.0138,
    },
  },
  {
    id: 'delhi-1985',
    rotulo: 'Délhi, 15/07/1985 01:15 UTC',
    instante: '1985-07-15T01:15:00Z',
    latitude: 28.6519,
    longitude: 77.2315,
    ayanamsha: 23.65503486,
    lagna: 103.3264,
    planetas: {
      sol: 88.8557,
      lua: 54.0396,
      marte: 89.7877,
      mercurio: 115.3686,
      jupiter: 290.9045,
      venus: 45.8079,
      saturno: 207.9095,
      rahu: 21.168,
    },
  },
];

/** Sol tropical no JPL, incluindo a troca de Peixes para Áries em 2024. */
export const REFERENCIAS_DO_SOL_TROPICAL = [
  { instante: '2000-02-29T12:00:00Z', longitude: 340.2058271 },
  { instante: '2024-03-20T02:55:00Z', longitude: 359.9921201 },
  { instante: '2024-03-20T03:25:00Z', longitude: 0.0128177 },
] as const;

/** Planetas tropicais no JPL em 01/12/1990 12:30 UTC. */
export const REFERENCIA_TROPICAL_1990 = {
  instante: '1990-12-01T12:30:00Z',
  planetas: {
    sol: 249.0527081,
    lua: 57.5302256,
    mercurio: 269.3893478,
    venus: 256.4582201,
    marte: 63.9872279,
    jupiter: 133.5932593,
    saturno: 292.3730121,
    urano: 277.9598778,
    netuno: 283.0224994,
    plutao: 228.5477445,
  },
} as const;

/** Vimshottari do caso de São Paulo, pela Lua do Swiss Ephemeris. */
export const REFERENCIA_DO_DASHA_SP_1990 = {
  nascimento: {
    data: '1990-12-01',
    hora: '10:30',
    latitude: -23.5475,
    longitude: -46.6361,
    fuso: 'America/Sao_Paulo',
  },
  agora: '2026-10-12T12:00:00Z',
  mahadasha: { graha: 'rahu', inicio: '2010-09-16', fim: '2028-09-15' },
  antardasha: { graha: 'lua', inicio: '2026-02-27', fim: '2027-08-29' },
} as const;
