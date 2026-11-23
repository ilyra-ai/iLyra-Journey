import { describe, expect, it } from 'vitest';

import {
  anguloDaLongitude,
  casaPorSignoInteiro,
  CENTRO,
  pontoNaRoda,
  raiosSemSobreposicao,
} from './astrolabio';

describe('geometria do Astrolábio Vivo (tarefa 186)', () => {
  it('o Lagna fica às 9 horas e o zodíaco avança no sentido anti-horário', () => {
    expect(anguloDaLongitude(100, 100)).toBe(180);
    // 90° depois do Lagna: às 6 horas (embaixo), como nos mapas impressos.
    expect(anguloDaLongitude(190, 100)).toBe(270);
    expect(anguloDaLongitude(10, 100)).toBe(90);
    expect(anguloDaLongitude(359, 0)).toBe(179);
  });

  it('converte para coordenadas SVG com o y para baixo', () => {
    expect(pontoNaRoda(100, 180)).toEqual({ x: CENTRO - 100, y: CENTRO });
    expect(pontoNaRoda(100, 90)).toEqual({ x: CENTRO, y: CENTRO - 100 });
    expect(pontoNaRoda(100, 270)).toEqual({ x: CENTRO, y: CENTRO + 100 });
  });

  it('casas por signo inteiro contam a partir do signo do Lagna', () => {
    expect(casaPorSignoInteiro(4, 4)).toBe(1);
    expect(casaPorSignoInteiro(5, 4)).toBe(2);
    expect(casaPorSignoInteiro(3, 4)).toBe(12);
    expect(casaPorSignoInteiro(0, 11)).toBe(2);
  });

  it('planetas próximos descem um degrau para os rótulos não colarem', () => {
    // Sol e Mercúrio a 3°, Vênus longe.
    const [sol, mercurio, venus] = raiosSemSobreposicao([100, 103, 250]);
    expect(sol).toBe(118);
    expect(mercurio).toBe(92);
    expect(venus).toBe(118);
    // Quatro colados: quatro degraus, depois recomeça.
    expect(raiosSemSobreposicao([10, 12, 14, 16, 18])).toEqual([
      118, 92, 66, 40, 118,
    ]);
  });
});
