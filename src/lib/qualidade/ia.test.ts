import { describe, expect, it } from 'vitest';

import { percentil } from './ia';

describe('percentil da latência (tarefa 183)', () => {
  it('usa o posto mais próximo sobre valores ordenados', () => {
    const dez = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
    expect(percentil(dez, 50)).toBe(500);
    expect(percentil(dez, 95)).toBe(1000);
    expect(percentil([42], 95)).toBe(42);
    expect(percentil([], 50)).toBeNull();
  });
});
