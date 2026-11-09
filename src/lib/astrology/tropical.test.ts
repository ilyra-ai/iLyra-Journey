import { describe, expect, it } from 'vitest';
import { buscarCidades } from '@/lib/geo/cidades';
import {
  calcularMapaTropical,
  calcularSolPorData,
  validarDataTropical,
} from './tropical';

const agora = new Date('2026-11-09T12:00:00Z');
const saoPaulo = buscarCidades('sao paulo, sp')[0];
const entrada = { data: '1990-12-01', hora: '10:30', cidadeId: saoPaulo.id };
const distancia = (a: number, b: number) =>
  Math.abs(((a - b + 540) % 360) - 180);

describe('Mapa tropical independente', () => {
  // JPL Horizons DE441, geocêntrico 500@399, quantidade 31, UTC 1990-12-01 12:30.
  // Consulta real em 09/11/2026: longitude aparente na eclíptica da data, sem refração.
  const referenciaJpl = {
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
  };
  it.each(Object.entries(referenciaJpl))(
    'confere %s com efeméride JPL independente',
    (nome, longitude) => {
      const mapa = calcularMapaTropical(entrada, agora);
      const planeta = mapa.planetas.find((p) => p.planeta === nome)!;
      expect(mapa.nascimento.instanteUtc).toBe('1990-12-01T12:30:00.000Z');
      expect(distancia(planeta.posicao.longitude, longitude)).toBeLessThan(
        0.02
      );
    }
  );

  it('confere ascendente tropical com referência Swiss independente e usa casas iguais', () => {
    const mapa = calcularMapaTropical(entrada, agora);
    // Swiss Ephemeris 2.10.03: referência sideral existente acrescida do seu ayanamsha de referência.
    expect(
      distancia(mapa.ascendente!.longitude, 283.2392 + 23.73019974)
    ).toBeLessThan(0.05);
    expect(mapa.sistemaDeCasas).toBe('iguais-a-partir-do-ascendente');
    expect(mapa.casas![0].cuspide.longitude).toBeCloseTo(
      mapa.ascendente!.longitude,
      10
    );
    expect(
      distancia(
        mapa.casas![6].cuspide.longitude,
        mapa.ascendente!.longitude + 180
      )
    ).toBeLessThan(0.000001);
    expect(mapa.planetas).toHaveLength(10);
    expect(mapa.zodiaco).toBe('tropical');
  });

  it('confere o Sol em ano bissexto com o JPL', () => {
    const mapa = calcularMapaTropical(
      { ...entrada, data: '2000-02-29', hora: '09:00' },
      agora
    );
    expect(
      distancia(
        mapa.planetas.find((p) => p.planeta === 'sol')!.posicao.longitude,
        340.2058271
      )
    ).toBeLessThan(0.02);
    expect(
      distancia(
        mapa.planetas.find((p) => p.planeta === 'lua')!.posicao.longitude,
        275.5362099
      )
    ).toBeLessThan(0.02);
  });

  it.each([
    ['2000-01-05', 'Capricórnio'],
    ['2000-02-05', 'Aquário'],
    ['2000-03-05', 'Peixes'],
    ['2000-04-05', 'Áries'],
    ['2000-05-05', 'Touro'],
    ['2000-06-05', 'Gêmeos'],
    ['2000-07-05', 'Câncer'],
    ['2000-08-05', 'Leão'],
    ['2000-09-05', 'Virgem'],
    ['2000-10-05', 'Libra'],
    ['2000-11-05', 'Escorpião'],
    ['2000-12-05', 'Sagitário'],
  ])('confirma somente o signo solar seguro de %s', (data, signo) => {
    const leitura = calcularSolPorData(data, agora);
    expect(leitura.sol.signo).toBe(signo);
    expect(leitura.faltando).toEqual(['hora', 'cidade']);
    expect(leitura).not.toHaveProperty('ascendente');
    expect(leitura).not.toHaveProperty('planetas');
    expect(
      Date.parse(leitura.janelaUtc.fim) - Date.parse(leitura.janelaUtc.inicio)
    ).toBe(50 * 3_600_000 - 1);
  });

  it('mantém a incerteza na fronteira Peixes/Áries sem presumir hora ou fuso', () => {
    const leitura = calcularSolPorData('2024-03-20', agora);
    expect(leitura.sol.signo).toBeNull();
    expect(leitura.sol.signosPossiveis).toEqual(['Peixes', 'Áries']);
    expect(leitura.precisao).toBe('signo-solar-pode-variar');
  });

  it.each([
    '2001-02-29',
    '1900-02-29',
    '1899-12-31',
    '2027-01-01',
    '2000-13-01',
    '2000-04-31',
    '01/12/1990',
    '',
  ])('recusa data inválida %s', (data) => {
    expect(() => validarDataTropical(data, agora)).toThrow(RangeError);
  });

  it('recusa horário inexistente no início do verão brasileiro', () => {
    expect(() =>
      calcularMapaTropical(
        { ...entrada, data: '2018-11-04', hora: '00:30' },
        agora
      )
    ).toThrow(/não existiu/);
  });

  it('exige desambiguação explícita de horário repetido', () => {
    const repetido = { ...entrada, data: '2019-02-16', hora: '23:30' };
    expect(() => calcularMapaTropical(repetido, agora)).toThrow(/duas vezes/);
    const anterior = calcularMapaTropical(
      { ...repetido, ocorrencia: 'anterior' },
      agora
    );
    const posterior = calcularMapaTropical(
      { ...repetido, ocorrencia: 'posterior' },
      agora
    );
    expect(
      Date.parse(posterior.nascimento.instanteUtc) -
        Date.parse(anterior.nascimento.instanteUtc)
    ).toBe(3_600_000);
  });

  it('não publica ascendente e casas em latitude polar', () => {
    const cidade = buscarCidades('longyearbyen')[0];
    expect(cidade.latitude).toBeGreaterThan(66.56);
    const mapa = calcularMapaTropical(
      { ...entrada, cidadeId: cidade.id },
      agora
    );
    expect(mapa.ascendente).toBeNull();
    expect(mapa.casas).toBeNull();
    expect(mapa.planetas).toHaveLength(10);
    expect(mapa.indisponivel.length).toBeGreaterThan(0);
  });

  it('recusa cidade e hora inválidas', () => {
    expect(() =>
      calcularMapaTropical({ ...entrada, cidadeId: -1 }, agora)
    ).toThrow(/Cidade/);
    expect(() =>
      calcularMapaTropical({ ...entrada, hora: '25:00' }, agora)
    ).toThrow(/Hora/);
  });

  it('mede latência real do cálculo completo e solar no servidor', () => {
    for (const [nome, calcular] of [
      ['completo', () => calcularMapaTropical(entrada, agora)],
      ['solar', () => calcularSolPorData(entrada.data, agora)],
    ] as const) {
      calcular();
      const amostras = Array.from({ length: 100 }, () => {
        const inicio = performance.now();
        calcular();
        return performance.now() - inicio;
      }).sort((a, b) => a - b);
      expect(amostras.every(Number.isFinite)).toBe(true);
      console.info(
        `Latência tropical ${nome}, 100 amostras locais: p50=${amostras[49].toFixed(3)}ms; p95=${amostras[94].toFixed(3)}ms; p99=${amostras[98].toFixed(3)}ms. Sem incluir rede ou banco.`
      );
    }
  });
});
