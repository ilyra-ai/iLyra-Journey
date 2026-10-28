import { describe, expect, it } from 'vitest';
import { escaparBuscaLiteral, pesquisaDoChatSchema } from './pesquisa-esquema';

describe('pedido de busca no histórico', () => {
  it.each([
    ['100%', '%100!%%'],
    ['a_b', '%a!_b%'],
    ['oi!', '%oi!!%'],
    ["d'água", "%d'água%"],
    ['🙂', '%🙂%'],
  ])('trata %s como texto literal', (termo, esperado) =>
    expect(escaparBuscaLiteral(termo)).toBe(esperado)
  );
  it('normaliza acentos compostos sem alterar o sentido da consulta', () =>
    expect(
      pesquisaDoChatSchema.parse({ termo: '  cafe\u0301  ' })
    ).toMatchObject({ termo: 'café', favoritos: false, cursor: null }));
  it('recusa busca vazia, longa e campos extras; permite listar favoritas', () => {
    for (const p of [
      { termo: '  ' },
      { termo: 'a'.repeat(161) },
      { termo: 'sono', user_id: 'outra pessoa' },
    ])
      expect(pesquisaDoChatSchema.safeParse(p).success).toBe(false);
    expect(pesquisaDoChatSchema.parse({ favoritos: true })).toMatchObject({
      termo: '',
      favoritos: true,
    });
  });
});
