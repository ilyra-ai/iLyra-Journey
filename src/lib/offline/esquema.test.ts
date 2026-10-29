import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { operacaoSchema } from './esquema';
const base = () => ({
  id: randomUUID(),
  base: 'a'.repeat(64),
  salvoLocalEm: new Date().toISOString(),
  tipo: 'registro',
  conteudo: { data: '2026-10-28', valores: { passos: 0 } },
});
describe('contrato offline e métricas originais', () => {
  it('preserva zero real e valida a data civil sem descartar recibo antigo', () => {
    expect(operacaoSchema.parse(base()).conteudo).toEqual(base().conteudo);
    expect(
      operacaoSchema.safeParse({
        ...base(),
        conteudo: { data: '2020-02-30', valores: { passos: 1 } },
      }).success
    ).toBe(false);
    expect(
      operacaoSchema.safeParse({
        ...base(),
        conteudo: { data: '2020-02-29', valores: { passos: 1 } },
      }).success
    ).toBe(true);
  });
  it('recusa registro vazio, métricas desconhecidas e pressão incoerente', () => {
    for (const valores of [
      {},
      { desconhecida: 1 },
      { passos: -1 },
      { pressaoSistolica: 120, pressaoDiastolica: 130 },
    ])
      expect(
        operacaoSchema.safeParse({
          ...base(),
          conteudo: { data: '2026-10-28', valores },
        }).success
      ).toBe(false);
  });
  it('não aceita propriedades extras nem identificador livre', () => {
    expect(
      operacaoSchema.safeParse({ ...base(), titular: randomUUID() }).success
    ).toBe(false);
    expect(
      operacaoSchema.safeParse({ ...base(), id: 'outra-operacao' }).success
    ).toBe(false);
  });
  it('reflexão exige três escalas válidas e conserva a nota completa', () => {
    const op = {
      ...base(),
      tipo: 'reflexao',
      conteudo: {
        data: '2026-10-28',
        emocional: 1,
        corpo: 5,
        espiritual: 3,
        frase: 'Minha reflexão 🌿',
      },
    };
    expect(operacaoSchema.parse(op).conteudo).toEqual(op.conteudo);
    expect(
      operacaoSchema.safeParse({
        ...op,
        conteudo: { ...op.conteudo, corpo: 6 },
      }).success
    ).toBe(false);
  });
});
