import { describe, expect, it } from 'vitest';
import {
  calcularMapaTropicalPorLocal,
  calcularSolPorData,
} from '@/lib/astrology/tropical';
import { lerMapaTropical } from './leitura-tropical';

const agora = new Date('2026-11-09T12:00:00Z');
const entrada = {
  data: '1990-12-01',
  hora: '10:30',
  local: {
    nome: 'São Paulo',
    latitude: -23.5505,
    longitude: -46.6333,
    fuso: 'America/Sao_Paulo',
  },
};

describe('Leitura ocidental própria da Lyra', () => {
  it('interpreta os dez planetas tropicais e as casas calculadas sem camadas védicas', () => {
    const mapa = calcularMapaTropicalPorLocal(entrada, agora);
    const leitura = lerMapaTropical(mapa);
    expect(leitura.tipo).toBe('ocidental');
    expect(leitura.natureza).toBe('interpretacao-simbolica');
    expect(leitura.resumo).toContain('Sol em Sagitário');
    expect(leitura.planetas).toHaveLength(10);
    expect(leitura.ascendente).toContain(mapa.ascendente!.signo);
    for (const planeta of leitura.planetas) {
      expect(planeta.casa).toBeGreaterThanOrEqual(1);
      expect(planeta.casa).toBeLessThanOrEqual(12);
      expect(planeta.texto).toContain(`casa ${planeta.casa}`);
    }
    expect(leitura.aspectos).toHaveLength(mapa.aspectos.length);
    expect(JSON.stringify(leitura)).not.toMatch(
      /nakshatra|dasha|dosha|Score de Ação|undefined/
    );
  });

  it('preserva a incerteza solar e não cria Lua, casas ou aspectos sem hora e cidade', () => {
    const leitura = lerMapaTropical(calcularSolPorData('2024-03-20', agora));
    expect(leitura.resumo).toContain('Peixes e Áries');
    expect(leitura.resumo).toContain('não permite escolher');
    expect(leitura.planetas).toEqual([]);
    expect(leitura.ascendente).toBeNull();
    expect(leitura.aspectos).toEqual([]);
  });

  it('usa o significado do signo calculado, não a ordem dos candidatos', () => {
    const leitura = lerMapaTropical(calcularSolPorData('2000-09-05', agora));
    expect(leitura.resumo).toContain('Sol em Virgem');
    expect(leitura.resumo).toContain('discernimento e aperfeiçoamento');
    expect(leitura.resumo).not.toContain('iniciativa e autonomia');
  });

  it('mantém os planetas e não interpreta casas indisponíveis em latitude polar', () => {
    const leitura = lerMapaTropical(
      calcularMapaTropicalPorLocal(
        {
          ...entrada,
          local: {
            nome: 'Longyearbyen',
            latitude: 78.22,
            longitude: 15.65,
            fuso: 'Arctic/Longyearbyen',
          },
        },
        agora
      )
    );
    expect(leitura.ascendente).toBeNull();
    expect(leitura.planetas.every((p) => p.casa === null)).toBe(true);
    expect(leitura.limites.join(' ')).toContain('latitude polar');
  });

  it.each([NaN, Infinity, 91, -91])(
    'recusa latitude inválida %s',
    (latitude) => {
      expect(() =>
        calcularMapaTropicalPorLocal(
          { ...entrada, local: { ...entrada.local, latitude } },
          agora
        )
      ).toThrow(/Local/);
    }
  );

  it('recusa longitude e fuso inválidos', () => {
    expect(() =>
      calcularMapaTropicalPorLocal(
        { ...entrada, local: { ...entrada.local, longitude: 181 } },
        agora
      )
    ).toThrow(/Local/);
    expect(() =>
      calcularMapaTropicalPorLocal(
        { ...entrada, local: { ...entrada.local, fuso: 'Inexistente' } },
        agora
      )
    ).toThrow(/Fuso/);
  });
});
