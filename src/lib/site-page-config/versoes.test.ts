import { describe, expect, it } from 'vitest';

import { diferencas, jsonCanonico } from './versoes';

describe('versões publicadas: comparação (tarefa 184)', () => {
  it('JSON canônico ignora a ordem das chaves', () => {
    expect(jsonCanonico({ b: 1, a: { d: 2, c: [3, 4] } })).toBe(
      jsonCanonico({ a: { c: [3, 4], d: 2 }, b: 1 })
    );
    expect(jsonCanonico({ a: [1, 2] })).not.toBe(jsonCanonico({ a: [2, 1] }));
  });

  it('lista adicionado, alterado e removido por caminho legível', () => {
    const antes = { hero: { title: 'Olá', cta: 'Entrar' }, old: true };
    const depois = { hero: { title: 'Oi', cta: 'Entrar' }, novo: 1 };
    expect(diferencas(antes, depois)).toEqual([
      { caminho: 'hero.title', tipo: 'alterado', antes: 'Olá', depois: 'Oi' },
      { caminho: 'novo', tipo: 'adicionado', antes: undefined, depois: 1 },
      { caminho: 'old', tipo: 'removido', antes: true, depois: undefined },
    ]);
  });

  it('itens com href ou id são comparados pela identidade, não pela posição', () => {
    const a = {
      items: [
        { href: '/a', label: 'A' },
        { href: '/b', label: 'B' },
      ],
    };
    const reordenado = {
      items: [
        { href: '/b', label: 'B' },
        { href: '/a', label: 'A' },
      ],
    };
    expect(diferencas(a, reordenado)).toEqual([]);
    const renomeado = {
      items: [
        { href: '/a', label: 'A' },
        { href: '/b', label: 'Bê' },
      ],
    };
    expect(diferencas(a, renomeado)).toEqual([
      {
        caminho: 'items[/b].label',
        tipo: 'alterado',
        antes: 'B',
        depois: 'Bê',
      },
    ]);
  });

  it('sem mudança, lista vazia', () => {
    expect(diferencas({ a: 1 }, { a: 1 })).toEqual([]);
  });
});
