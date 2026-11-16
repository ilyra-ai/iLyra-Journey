import { describe, expect, it } from 'vitest';
import { calcularMapaNatal } from '../mapa-natal';
import { calcularMapaDivisional, signoDivisional } from './divisionais';
import { calcularTransitosNatais } from './transitos';
import { calcularRetornos } from './retornos';
import {
  calcularLinhasAstrocartograficas,
  compararAscendentesRelocados,
} from './astrocartografia';
import { calcularCalendarioDeEclipses } from './eclipses';
import {
  diferencaAngular,
  normalizarAngulo,
  procurarPassagens,
  limitarLocal,
} from './numerica';

const nascimento = {
  data: '1990-12-01',
  hora: '10:30',
  latitude: -23.5475,
  longitude: -46.6361,
  fuso: 'America/Sao_Paulo',
};
const mapa = calcularMapaNatal(nascimento, new Date('2026-11-13T12:00:00Z'));
const distancia = (a: number, b: number) => Math.abs(diferencaAngular(a - b));

describe('Inovações matemáticas da Lyra sem provedores de IA', () => {
  it('encontra raízes circulares e três passagens com reversão', () => {
    expect(normalizarAngulo(-1)).toBe(359);
    const inicio = new Date('2026-01-01T00:00:00Z');
    const curva = (data: Date) =>
      30 *
      Math.sin(
        ((data.getTime() - inicio.getTime()) / 86_400_000) * (Math.PI / 2)
      );
    const passagens = procurarPassagens(
      curva,
      0,
      new Date(inicio.getTime() + 86_400_000),
      new Date(inicio.getTime() + 7 * 86_400_000),
      3_600_000
    );
    expect(passagens).toHaveLength(3);
    expect(passagens.every((d) => Math.abs(curva(d)) < 0.02)).toBe(true);
  });

  it('deriva D9/D10 pelas regras dos signos e das 108 divisões', () => {
    expect(signoDivisional(12, 9).nome).toBe('Câncer');
    expect(signoDivisional(7, 10).nome).toBe('Gêmeos');
    expect(signoDivisional(30, 9).nome).toBe('Capricórnio');
    expect(signoDivisional(60, 9).nome).toBe('Libra');
    for (let signo = 0; signo < 12; signo += 1) {
      for (let parte = 0; parte < 9; parte += 1) {
        const valor = signoDivisional(signo * 30 + ((parte + 0.5) * 30) / 9, 9);
        expect(valor.porcao).toBe(parte + 1);
        expect(valor.indice).toBeGreaterThanOrEqual(0);
        expect(valor.indice).toBeLessThan(12);
      }
    }
    const d9 = calcularMapaDivisional(mapa, 9);
    const d10 = calcularMapaDivisional(mapa, 10);
    expect(d9.planetas).toHaveLength(9);
    expect(d10.planetas).toHaveLength(9);
    expect(d9.ascendente).not.toBeNull();
    expect(d10.planetas.every((p) => p.casa !== null)).toBe(true);
  });

  it('encontra trânsitos reais com graus calculados e ordenação temporal', () => {
    const resultado = calcularTransitosNatais(
      mapa,
      'sideral',
      new Date('2026-11-13T00:00:00Z'),
      new Date('2026-11-16T00:00:00Z')
    );
    expect(resultado.eventos.length).toBeGreaterThan(0);
    expect(
      resultado.eventos.every(
        (e) =>
          Math.abs(
            distancia(e.longitudeEmTransito, e.longitudeNatal) - e.angulo
          ) < 0.02
      )
    ).toBe(true);
    const horarios = resultado.eventos.map((e) => e.utc);
    expect(horarios).toEqual([...horarios].sort());
  });

  it('encontra retornos solar e lunar ao grau natal sem LLM', () => {
    const local = {
      latitude: nascimento.latitude,
      longitude: nascimento.longitude,
      nome: 'São Paulo',
    };
    const solar = calcularRetornos(
      mapa,
      'sol',
      'sideral',
      new Date('2026-01-01T00:00:00Z'),
      new Date('2027-01-01T00:00:00Z'),
      local
    );
    expect(solar.retornos).toHaveLength(1);
    expect(
      distancia(
        solar.retornos[0].longitudeDoRetorno,
        solar.retornos[0].longitudeNatal
      )
    ).toBeLessThan(0.005);

    const lunar = calcularRetornos(
      mapa,
      'lua',
      'sideral',
      new Date('2026-10-01T00:00:00Z'),
      new Date('2026-11-15T00:00:00Z'),
      local
    );
    expect(lunar.retornos.length).toBeGreaterThan(0);
    expect(
      lunar.retornos.every(
        (e) => distancia(e.longitudeNatal, e.longitudeDoRetorno) < 0.005
      )
    ).toBe(true);
  });

  it('calcula 28 linhas globais e ascendente relocalizado', () => {
    const resultado = calcularLinhasAstrocartograficas(mapa.nascimentoUtc);
    expect(resultado.linhas).toHaveLength(28);
    expect(
      resultado.linhas.every((linha) =>
        linha.segmentos.every((segmento) =>
          segmento.every(
            (p) =>
              p.latitude >= -90 &&
              p.latitude <= 90 &&
              p.longitude >= -180 &&
              p.longitude <= 180
          )
        )
      )
    ).toBe(true);
    const mc = resultado.linhas.find(
      (linha) => linha.planeta === 'Sol' && linha.angulo === 'MC'
    )!;
    const ic = resultado.linhas.find(
      (linha) => linha.planeta === 'Sol' && linha.angulo === 'IC'
    )!;
    expect(
      distancia(mc.segmentos[0][0].longitude, ic.segmentos[0][0].longitude)
    ).toBeCloseTo(180, 6);

    const local = {
      latitude: nascimento.latitude,
      longitude: nascimento.longitude,
    };
    const igual = compararAscendentesRelocados(
      mapa.nascimentoUtc,
      local,
      local,
      'sideral'
    );
    expect(
      distancia(igual.ascendenteOriginal, igual.ascendenteRelocado)
    ).toBeLessThan(1e-9);
    const alterado = compararAscendentesRelocados(
      mapa.nascimentoUtc,
      local,
      { latitude: 40.71, longitude: -74 },
      'sideral'
    );
    expect(
      distancia(alterado.ascendenteOriginal, alterado.ascendenteRelocado)
    ).toBeGreaterThan(1);
    expect(() => limitarLocal(95, 0)).toThrow(RangeError);
  });

  it('localiza eclipse solar conhecido de 12/08/2026', () => {
    const resultado = calcularCalendarioDeEclipses(
      new Date('2026-08-01T00:00:00Z'),
      new Date('2026-09-01T00:00:00Z'),
      40.42,
      -3.7
    );
    expect(
      resultado.eventos.some(
        (e) => e.tipo === 'solar' && e.utc.slice(0, 10) === '2026-08-12'
      )
    ).toBe(true);
    expect(resultado.eventos.every((e) => typeof e.visivel === 'boolean')).toBe(
      true
    );
  });
});
