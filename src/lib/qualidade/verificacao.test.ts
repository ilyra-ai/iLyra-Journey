import { describe, expect, it } from 'vitest';

import { verificarCalculos } from './verificacao';

/**
 * Regra de publicação (tarefa 183): os gates rodam este teste, então uma
 * mudança que tire o Motor das referências independentes não chega à main.
 */
describe('centro de qualidade: verificações do Motor', () => {
  const resultado = verificarCalculos();

  it('todas as verificações ficam dentro da tolerância', () => {
    const reprovadas = resultado.verificacoes.filter((v) => !v.aprovado);
    expect(reprovadas).toEqual([]);
    expect(resultado.aprovado).toBe(true);
  });

  it('cobre sideral, tropical e Vimshottari, com fonte e tolerância', () => {
    const grupos = new Set(resultado.verificacoes.map((v) => v.grupo));
    expect([...grupos].sort()).toEqual(['sideral', 'tropical', 'vimshottari']);
    expect(resultado.total).toBe(resultado.verificacoes.length);
    // 2 casos siderais × (ayanamsha, Lagna e 8 grahas) + 13 tropicais + 4 do
    // Vimshottari: tirar uma referência sem querer reprova aqui.
    expect(resultado.total).toBe(37);
    for (const v of resultado.verificacoes) {
      expect(v.tolerancia).toBeGreaterThan(0);
      expect(['swiss', 'jpl']).toContain(v.fonte);
      expect(Number.isFinite(v.obtido)).toBe(true);
    }
  });

  it('é reprodutível: a mesma versão dá o mesmo resultado', () => {
    expect(verificarCalculos()).toEqual(resultado);
  });
});
