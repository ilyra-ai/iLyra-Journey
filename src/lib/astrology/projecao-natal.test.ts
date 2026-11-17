import { describe, expect, it } from 'vitest';
import { performance } from 'node:perf_hooks';
import { calcularMapaNatal, mapaNatalNaData } from './mapa-natal';
import { calcularVimshottari } from './vimshottari';

const nascimento = {
  data: '1990-06-15',
  hora: '10:30',
  latitude: -23.5505,
  longitude: -46.6333,
  fuso: 'America/Sao_Paulo',
};

describe('projeção natal sem repetir efemérides', () => {
  it('preserva o resultado integral antes, durante e depois de cada transição', () => {
    const mapa = calcularMapaNatal(nascimento);
    const periodos = calcularVimshottari(
      mapa.lua.longitude,
      mapa.nascimentoUtc
    );
    for (const periodo of periodos) {
      for (const subperiodo of periodo.antardashas) {
        for (const deslocamento of [-1, 0, 1]) {
          const referencia = new Date(
            subperiodo.inicio.getTime() + deslocamento
          );
          expect(mapaNatalNaData(mapa, referencia)).toEqual(
            calcularMapaNatal(nascimento, referencia)
          );
        }
      }
    }
  });

  it('não altera a leitura anterior nem inventa períodos fora da cobertura', () => {
    const mapa = calcularMapaNatal(
      nascimento,
      new Date('2026-11-09T12:00:00Z')
    );
    const anterior = structuredClone(mapa);
    expect(mapaNatalNaData(mapa, new Date('2300-01-01')).dasha).toBeNull();
    expect(mapa).toEqual(anterior);
  });

  it('mede oito referências com recálculo e com reutilização local equivalente', () => {
    const referencias = Array.from(
      { length: 8 },
      (_, indice) => new Date(Date.UTC(2026, 10, 9 + indice, 12))
    );
    const recalcular = () =>
      referencias.map((data) => calcularMapaNatal(nascimento, data));
    const reutilizar = () => {
      const mapa = calcularMapaNatal(nascimento, referencias[0]);
      return referencias.map((data) => mapaNatalNaData(mapa, data));
    };
    expect(reutilizar()).toEqual(recalcular());
    for (let i = 0; i < 20; i++) {
      recalcular();
      reutilizar();
    }
    const medidas = (executar: () => unknown) => {
      const amostras = Array.from({ length: 100 }, () => {
        const inicio = performance.now();
        executar();
        return performance.now() - inicio;
      }).sort((a, b) => a - b);
      return { p50: amostras[50], p95: amostras[95], p99: amostras[99] };
    };
    console.info(
      'Benchmark natal local em ms (sem banco, rede ou geração de texto)',
      {
        recalculo: medidas(recalcular),
        reutilizacao: medidas(reutilizar),
      }
    );
  });
});

describe('Conferência dos dados de nascimento', () => {
  const base = {
    data: '1990-12-01',
    hora: '10:30',
    latitude: -23.5475,
    longitude: -46.6361,
    fuso: 'America/Sao_Paulo',
  };
  it('recusa data, hora, fuso e local que não existem', () => {
    for (const erro of [
      { data: '1990-02-30' },
      { data: '1990-13-01' },
      { data: '01/12/1990' },
      { hora: '25:99' },
      { hora: '10h30' },
      { fuso: 'Marte/Olympus' },
      { latitude: 91 },
      { longitude: -181 },
      { latitude: Number.NaN },
    ]) {
      expect(() => calcularMapaNatal({ ...base, ...erro })).toThrow(RangeError);
    }
  });
  it('aceita ano bissexto, hora desconhecida e os extremos do relógio', () => {
    expect(() =>
      calcularMapaNatal({ ...base, data: '2000-02-29' })
    ).not.toThrow();
    expect(() => calcularMapaNatal({ ...base, hora: null })).not.toThrow();
    expect(() => calcularMapaNatal({ ...base, hora: '00:00' })).not.toThrow();
    expect(() => calcularMapaNatal({ ...base, hora: '23:59' })).not.toThrow();
  });
});

describe('Ascendente védico além do Círculo Polar', () => {
  const tromso = {
    data: '1990-06-21',
    hora: '12:00',
    latitude: 69.6492,
    longitude: 18.9553,
    fuso: 'Europe/Oslo',
  };
  it('declara Lagna e casas indisponíveis e mantém planetas e períodos', () => {
    const mapa = calcularMapaNatal(tromso, new Date('2026-11-17T12:00:00Z'));
    expect(mapa.horaConhecida).toBe(true);
    expect(mapa.limiteDoLagna).toBe('latitude-polar');
    expect(mapa.lagna).toBeNull();
    expect(mapa.planetas.every((p) => p.casa === null)).toBe(true);
    expect(mapa.dasha).not.toBeNull();
    expect(mapa.planetas).toHaveLength(9);
  });
  it('abaixo do Círculo Polar o Lagna continua calculado', () => {
    const mapa = calcularMapaNatal(
      { ...tromso, latitude: 66.5 },
      new Date('2026-11-17T12:00:00Z')
    );
    expect(mapa.limiteDoLagna).toBeNull();
    expect(mapa.lagna).not.toBeNull();
  });
  it('sem hora o limite não se aplica: falta a hora, não o lugar', () => {
    const mapa = calcularMapaNatal(
      { ...tromso, hora: null },
      new Date('2026-11-17T12:00:00Z')
    );
    expect(mapa.limiteDoLagna).toBeNull();
    expect(mapa.lagna).toBeNull();
  });
});
