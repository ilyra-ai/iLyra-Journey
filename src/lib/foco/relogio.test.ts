import { describe, it, expect } from 'vitest';
import { tempoDecorrido, mostrarTempo } from './relogio';
describe('relógio de foco sem contagem de ticks', () => {
  it('usa diferença civil mais o acumulado, sem contar tempo pausado', () => {
    expect(
      tempoDecorrido(
        2000,
        '2026-10-29 12:00:00.000',
        new Date('2026-10-29T12:00:05Z'),
        60
      )
    ).toBe(7000);
    expect(
      tempoDecorrido(2000, null, new Date('2026-10-29T12:00:05Z'), 60)
    ).toBe(2000);
  });
  it('limita ao alvo e não cria duração negativa diante de recuo do relógio', () => {
    expect(
      tempoDecorrido(
        0,
        '2026-10-29 12:00:00',
        new Date('2026-10-30T12:00:00Z'),
        60
      )
    ).toBe(60000);
    expect(
      tempoDecorrido(
        2000,
        '2026-10-29 12:00:00',
        new Date('2026-10-29T11:59:00Z'),
        60
      )
    ).toBe(2000);
  });
  it('arredonda o restante para cima sem anunciar zero antes do fim', () => {
    expect(mostrarTempo(1)).toBe('00:01');
    expect(mostrarTempo(60000)).toBe('01:00');
    expect(mostrarTempo(0)).toBe('00:00');
    expect(mostrarTempo(-1)).toBe('00:00');
  });
});
