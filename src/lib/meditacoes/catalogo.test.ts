import { describe, expect, it } from 'vitest';
import {
  FAIXAS_DE_DURACAO,
  FINALIDADES,
  PRATICAS,
  faixaDaPratica,
  passoNoTempo,
  praticaPorId,
} from './catalogo';

describe('catálogo de práticas guiadas', () => {
  it('tem identificadores únicos, roteiro em ordem e passos dentro da duração', () => {
    expect(new Set(PRATICAS.map((p) => p.id)).size).toBe(PRATICAS.length);
    for (const p of PRATICAS) {
      expect(p.id).toMatch(/^[a-z0-9-]{1,40}$/);
      expect(p.minutos).toBeGreaterThanOrEqual(1);
      expect(p.minutos).toBeLessThanOrEqual(60);
      expect(Object.keys(FINALIDADES)).toContain(p.finalidade);
      expect(p.passos[0].inicio).toBe(0);
      for (let i = 1; i < p.passos.length; i++) {
        // Pelo menos 15 s entre passos para a fala não atropelar o seguinte.
        expect(
          p.passos[i].inicio - p.passos[i - 1].inicio
        ).toBeGreaterThanOrEqual(15);
      }
      expect(p.passos.at(-1)!.inicio).toBeLessThan(p.minutos * 60 - 10);
      for (const s of p.passos)
        expect(s.texto.trim().length).toBeGreaterThan(20);
    }
  });
  it('cobre todas as finalidades e faixas de duração do filtro', () => {
    expect(new Set(PRATICAS.map((p) => p.finalidade))).toEqual(
      new Set(Object.keys(FINALIDADES))
    );
    expect(new Set(PRATICAS.map(faixaDaPratica))).toEqual(
      new Set(Object.keys(FAIXAS_DE_DURACAO))
    );
  });
  it('localiza a prática e o passo pelo tempo decorrido', () => {
    const p = praticaPorId('pausa-de-tres-minutos')!;
    expect(passoNoTempo(p, 0)).toBe(0);
    expect(passoNoTempo(p, 19)).toBe(0);
    expect(passoNoTempo(p, 20)).toBe(1);
    expect(passoNoTempo(p, 999)).toBe(p.passos.length - 1);
    expect(praticaPorId('inexistente')).toBeNull();
  });
});
