import { describe, expect, it } from 'vitest';

import { calcularMapaNatal } from '../mapa-natal';
import { calcularLinhasAstrocartograficas } from './astrocartografia';
import { signoDivisional } from './divisionais';
import { calcularCalendarioDeEclipses } from './eclipses';
import { calcularRetornos } from './retornos';
import { calcularTransitosNatais } from './transitos';

/**
 * Oráculos independentes do motor de inovações (tarefas 175 a 179): fontes
 * e fórmulas que não usam o astronomy-engine, para conferir o motor por fora.
 *
 * - Eclipses: catálogo da NASA (Fred Espenak, GSFC), "Solar/Lunar Eclipses:
 *   2021 to 2030", horários do máximo em TD consultados em 18/11/2026 em
 *   eclipse.gsfc.nasa.gov/SEdecade/SEdecade2021.html e
 *   eclipse.gsfc.nasa.gov/LEdecade/LEdecade2021.html. TD − UT ≈ 70 s nesses
 *   anos (ΔT), por isso a tolerância de 3 minutos.
 * - Divisionais: regras fechadas da tradição (D9: cada 3°20' avança um signo
 *   a partir de Áries; D10: signos ímpares começam no próprio signo e pares
 *   no nono a partir dele, em partes de 3°).
 * - Astrocartografia e retorno solar: fórmulas de baixa precisão de Jean
 *   Meeus, "Astronomical Algorithms", 2ª ed., cap. 12 (tempo sideral) e 25
 *   (Sol, precisão de ~0,01°).
 */

const MINUTO = 60_000;

const ECLIPSES_SOLARES_NASA = [
  { td: '2026-02-17T12:13:05Z', tipo: 'annular' },
  { td: '2026-08-12T17:47:05Z', tipo: 'total' },
  { td: '2027-02-06T16:00:47Z', tipo: 'annular' },
  { td: '2027-08-02T10:07:49Z', tipo: 'total' },
];
const ECLIPSES_LUNARES_NASA = [
  { td: '2026-03-03T11:34:52Z', tipo: 'total' },
  { td: '2026-08-28T04:14:04Z', tipo: 'partial' },
  { td: '2027-02-20T23:14:06Z', tipo: 'penumbral' },
  { td: '2027-07-18T16:04:09Z', tipo: 'penumbral' },
  { td: '2027-08-17T07:14:59Z', tipo: 'penumbral' },
];

const graus = (rad: number) => (rad * 180) / Math.PI;
const rad = (g: number) => (g * Math.PI) / 180;
const normal = (g: number) => ((g % 360) + 360) % 360;
const diferenca = (a: number, b: number) => {
  const d = normal(a - b);
  return d > 180 ? d - 360 : d;
};
const diaJuliano = (data: Date) => data.getTime() / 86_400_000 + 2_440_587.5;

/** Sol aparente de Meeus (cap. 25): longitude e ascensão reta, em graus. */
function solDeMeeus(data: Date) {
  const t = (diaJuliano(data) - 2_451_545) / 36_525;
  const l0 = normal(280.46646 + 36_000.76983 * t + 0.0003032 * t * t);
  const m = rad(normal(357.52911 + 35_999.05029 * t - 0.0001537 * t * t));
  const c =
    (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(m) +
    (0.019993 - 0.000101 * t) * Math.sin(2 * m) +
    0.000289 * Math.sin(3 * m);
  const omega = rad(125.04 - 1934.136 * t);
  const lambda = normal(l0 + c - 0.00569 - 0.00478 * Math.sin(omega));
  const epsilon =
    23 +
    (26 + (21.448 - 46.815 * t - 0.00059 * t * t + 0.001813 * t ** 3) / 60) /
      60 +
    0.00256 * Math.cos(omega);
  const ra = normal(
    graus(
      Math.atan2(
        Math.cos(rad(epsilon)) * Math.sin(rad(lambda)),
        Math.cos(rad(lambda))
      )
    )
  );
  return { lambda, ra };
}

/** Tempo sideral médio de Greenwich (Meeus, eq. 12.4), em graus. */
function tempoSideralDeGreenwich(data: Date) {
  const jd = diaJuliano(data);
  const t = (jd - 2_451_545) / 36_525;
  return normal(
    280.46061837 +
      360.98564736629 * (jd - 2_451_545) +
      0.000387933 * t * t -
      (t * t * t) / 38_710_000
  );
}

describe('Oráculos independentes das inovações do motor', () => {
  it('eclipses de 2026 e 2027 batem com o catálogo da NASA (instante e tipo)', () => {
    const eventos = [
      ...calcularCalendarioDeEclipses(
        new Date('2026-01-01T00:00:00Z'),
        new Date('2026-12-31T00:00:00Z'),
        -23.5505,
        -46.6333
      ).eventos,
      ...calcularCalendarioDeEclipses(
        new Date('2026-12-31T00:00:00Z'),
        new Date('2027-12-31T00:00:00Z'),
        -23.5505,
        -46.6333
      ).eventos,
    ];
    for (const [tipo, catalogo] of [
      ['solar', ECLIPSES_SOLARES_NASA],
      ['lunar', ECLIPSES_LUNARES_NASA],
    ] as const) {
      const domotor = eventos.filter((e) => e.tipo === tipo);
      expect(domotor).toHaveLength(catalogo.length);
      catalogo.forEach((oficial, i) => {
        const diferencaMs = Math.abs(
          new Date(domotor[i].utc).getTime() - new Date(oficial.td).getTime()
        );
        expect(diferencaMs).toBeLessThan(3 * MINUTO);
        expect(domotor[i].classificacao).toBe(oficial.tipo);
      });
    }
  });

  it('D9 e D10 seguem as regras fechadas em todo o zodíaco', () => {
    for (let longitude = 0.05; longitude < 360; longitude += 0.37) {
      const signo = Math.floor(longitude / 30);
      expect(signoDivisional(longitude, 9).indice).toBe(
        Math.floor(longitude / (30 / 9)) % 12
      );
      const parte = Math.floor((longitude % 30) / 3);
      const comeco = signo % 2 === 0 ? signo : (signo + 8) % 12;
      expect(signoDivisional(longitude, 10).indice).toBe((comeco + parte) % 12);
    }
  });

  it('a linha MC do Sol fica onde o tempo sideral local iguala a ascensão reta do Sol', () => {
    for (const iso of [
      '1974-05-10T13:30:00Z',
      '1990-12-01T12:30:00Z',
      '2026-11-18T18:00:00Z',
    ]) {
      const instante = new Date(iso);
      const linha = calcularLinhasAstrocartograficas(instante).linhas.find(
        (l) => l.planeta === 'Sol' && l.angulo === 'MC'
      );
      const esperada = diferenca(
        solDeMeeus(instante).ra,
        tempoSideralDeGreenwich(instante)
      );
      expect(
        Math.abs(diferenca(linha!.segmentos[0][0].longitude, esperada))
      ).toBeLessThan(0.05);
    }
  });

  it('nos trânsitos do Sol, o Sol de Meeus está no ângulo exato do ponto natal', () => {
    const mapa = calcularMapaNatal(
      {
        data: '1974-05-10',
        hora: '10:30',
        latitude: -23.5505,
        longitude: -46.6333,
        fuso: 'America/Sao_Paulo',
      },
      new Date('2026-11-18T12:00:00Z')
    );
    const doSol = calcularTransitosNatais(
      mapa,
      'tropical',
      new Date('2026-11-01T00:00:00Z'),
      new Date('2026-12-01T00:00:00Z')
    ).eventos.filter((e) => e.transito === 'sol');
    expect(doSol.length).toBeGreaterThan(0);
    for (const evento of doSol) {
      const sol = solDeMeeus(new Date(evento.utc)).lambda;
      expect(
        Math.abs(
          Math.abs(diferenca(sol, evento.longitudeNatal)) - evento.angulo
        )
      ).toBeLessThan(0.03);
    }
  });

  it('a revolução solar tropical cai quando o Sol de Meeus volta ao grau natal', () => {
    const mapa = calcularMapaNatal(
      {
        data: '1974-05-10',
        hora: '10:30',
        latitude: -23.5505,
        longitude: -46.6333,
        fuso: 'America/Sao_Paulo',
      },
      new Date('2026-11-18T12:00:00Z')
    );
    const [retorno] = calcularRetornos(
      mapa,
      'sol',
      'tropical',
      new Date('2027-01-01T00:00:00Z'),
      new Date('2027-12-31T00:00:00Z'),
      { latitude: -23.5505, longitude: -46.6333, nome: 'São Paulo' }
    ).retornos;
    const alvo = solDeMeeus(mapa.nascimentoUtc).lambda;
    // Instante, por bissecção, em que o Sol de Meeus volta ao grau natal.
    let a = new Date('2027-05-05T00:00:00Z').getTime();
    let b = new Date('2027-05-15T00:00:00Z').getTime();
    for (let i = 0; i < 60; i += 1) {
      const meio = (a + b) / 2;
      if (diferenca(solDeMeeus(new Date(meio)).lambda, alvo) < 0) a = meio;
      else b = meio;
    }
    expect(Math.abs(new Date(retorno.instanteUtc).getTime() - a)).toBeLessThan(
      20 * MINUTO
    );
  });
});
