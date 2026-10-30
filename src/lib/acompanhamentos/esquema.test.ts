import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  MODELOS_DE_ESCALA,
  acompanhamentoSchema,
  escalaNormalizada,
  escalaSchema,
  inicioDaSemana,
  mesmaEscala,
  pontosDaEscala,
  registroSchema,
  rotuloDoValor,
} from './esquema';

describe('contrato dos acompanhamentos pessoais', () => {
  it('aceita os modelos oferecidos na interface', () => {
    for (const m of MODELOS_DE_ESCALA)
      expect(escalaSchema.safeParse(m.escala).success).toBe(true);
  });
  it('exige rótulos nos extremos, pontos válidos e rótulo único por ponto', () => {
    const casos = [
      { minimo: 1, maximo: 1, rotulos: [{ valor: 1, rotulo: 'a' }] },
      { minimo: 2, maximo: 5, rotulos: [] },
      { minimo: 0, maximo: 11, rotulos: [] },
      { minimo: 1, maximo: 5, rotulos: [{ valor: 1, rotulo: 'Baixa' }] },
      {
        minimo: 1,
        maximo: 5,
        rotulos: [
          { valor: 1, rotulo: '   ' },
          { valor: 5, rotulo: 'Alta' },
        ],
      },
      {
        minimo: 1,
        maximo: 3,
        rotulos: [
          { valor: 1, rotulo: 'a' },
          { valor: 1, rotulo: 'b' },
          { valor: 3, rotulo: 'c' },
        ],
      },
      {
        minimo: 1,
        maximo: 3,
        rotulos: [
          { valor: 1, rotulo: 'a' },
          { valor: 3, rotulo: 'c' },
          { valor: 0, rotulo: 'fora' },
        ],
      },
      {
        minimo: 1,
        maximo: 3,
        rotulos: [
          { valor: 1, rotulo: 'a' },
          { valor: 3, rotulo: 'x'.repeat(41) },
        ],
      },
    ];
    for (const c of casos)
      expect(escalaSchema.safeParse(c).success).toBe(false);
  });
  it('explica em pt-BR um ponto inválido, inclusive maior ponto zerado', () => {
    const r = escalaSchema.safeParse({
      minimo: 0,
      maximo: 0,
      rotulos: [{ valor: 0, rotulo: 'Não' }],
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.message)).toContain(
      'O maior ponto deve ficar entre 1 e 10.'
    );
    const m = escalaSchema.safeParse({ minimo: 2, maximo: 5, rotulos: [] });
    expect(m.error?.issues[0].message).toBe('O menor ponto deve ser 0 ou 1.');
  });
  it('recusa campos extras e nomes vazios ou longos', () => {
    const base = {
      pedidoId: randomUUID(),
      nome: 'Motivação',
      descricao: '',
      frequencia: 'diaria',
      escala: MODELOS_DE_ESCALA[0].escala,
    };
    expect(acompanhamentoSchema.safeParse(base).success).toBe(true);
    expect(
      acompanhamentoSchema.safeParse({ ...base, nome: '  ' }).success
    ).toBe(false);
    expect(
      acompanhamentoSchema.safeParse({ ...base, nome: 'x'.repeat(61) }).success
    ).toBe(false);
    expect(
      acompanhamentoSchema.safeParse({ ...base, frequencia: 'mensal' }).success
    ).toBe(false);
    expect(acompanhamentoSchema.safeParse({ ...base, extra: 1 }).success).toBe(
      false
    );
    expect(
      registroSchema.safeParse({
        idRegistro: randomUUID(),
        data: '2026-10-29',
        valor: 3.5,
        nota: '',
        versao: 0,
      }).success
    ).toBe(false);
  });
  it('calcula a segunda-feira da semana civil', () => {
    expect(inicioDaSemana('2026-10-26')).toBe('2026-10-26');
    expect(inicioDaSemana('2026-10-29')).toBe('2026-10-26');
    expect(inicioDaSemana('2026-11-01')).toBe('2026-10-26');
    expect(inicioDaSemana('2027-01-01')).toBe('2026-12-28');
  });
  it('mostra rótulo ou número e compara escalas sem depender da ordem', () => {
    const e = MODELOS_DE_ESCALA.find((m) => m.id === 'dez')!.escala;
    expect(pontosDaEscala(e)).toHaveLength(11);
    expect(rotuloDoValor(e, 0)).toBe('0 · Nada');
    expect(rotuloDoValor(e, 7)).toBe('7');
    const invertida = { ...e, rotulos: [...e.rotulos].reverse() };
    expect(mesmaEscala(e, invertida)).toBe(true);
    expect(
      mesmaEscala(e, {
        ...e,
        rotulos: [...e.rotulos, { valor: 5, rotulo: '' }],
      })
    ).toBe(true);
    expect(mesmaEscala(e, { ...e, maximo: 9 })).toBe(false);
    expect(
      escalaNormalizada({
        minimo: 1,
        maximo: 3,
        rotulos: [
          { valor: 3, rotulo: 'c' },
          { valor: 2, rotulo: '' },
          { valor: 1, rotulo: 'a' },
        ],
      }).rotulos
    ).toEqual([
      { valor: 1, rotulo: 'a' },
      { valor: 3, rotulo: 'c' },
    ]);
  });
});
