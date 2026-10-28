import { randomUUID } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { rotinaSchema, acaoDaRotinaSchema } from './esquema';
const passo = () => ({
  id: randomUUID(),
  titulo: 'Uma pausa',
  minutos: null,
  atividade: 'livre',
  habitoId: null,
});
const rotina = () => ({
  titulo: 'Minha manhã',
  dias: [5, 1],
  passos: [passo()],
});
describe('contratos das rotinas pessoais', () => {
  it('normaliza nome e ordena os dias sem alterar a ordem dos passos', () => {
    const d = rotina();
    d.titulo = '  Minha manhã  ';
    d.passos.push(passo());
    expect(rotinaSchema.parse(d)).toEqual({
      ...d,
      titulo: 'Minha manhã',
      dias: [1, 5],
    });
  });
  it('recusa campos de titular e dados desconhecidos', () => {
    expect(
      rotinaSchema.safeParse({ ...rotina(), userId: randomUUID() }).success
    ).toBe(false);
  });
  it('exige passos, título e frequência com dias únicos', () => {
    for (const patch of [
      { passos: [] },
      { titulo: ' ' },
      { dias: [] },
      { dias: [1, 1] },
    ])
      expect(rotinaSchema.safeParse({ ...rotina(), ...patch }).success).toBe(
        false
      );
  });
  it('recusa UUIDs de passos repetidos e mais de vinte passos', () => {
    const p = passo();
    expect(
      rotinaSchema.safeParse({ ...rotina(), passos: [p, p] }).success
    ).toBe(false);
    expect(
      rotinaSchema.safeParse({
        ...rotina(),
        passos: Array.from({ length: 21 }, passo),
      }).success
    ).toBe(false);
  });
  it('aceita previsão opcional sem aceitar duração falsa ou fracionada', () => {
    for (const minutos of [0, -1, 181, 1.5])
      expect(
        rotinaSchema.safeParse({
          ...rotina(),
          passos: [{ ...passo(), minutos }],
        }).success
      ).toBe(false);
    expect(
      rotinaSchema.safeParse({
        ...rotina(),
        passos: [{ ...passo(), minutos: 5 }],
      }).success
    ).toBe(true);
  });
  it('exige referência somente para passos associados a hábitos', () => {
    expect(
      rotinaSchema.safeParse({
        ...rotina(),
        passos: [{ ...passo(), atividade: 'habito' }],
      }).success
    ).toBe(false);
    expect(
      rotinaSchema.safeParse({
        ...rotina(),
        passos: [{ ...passo(), habitoId: randomUUID() }],
      }).success
    ).toBe(false);
    expect(
      rotinaSchema.safeParse({
        ...rotina(),
        passos: [{ ...passo(), atividade: 'habito', habitoId: randomUUID() }],
      }).success
    ).toBe(true);
  });
  it('exige versão e passo para conclusão, sem permitir estados arbitrários', () => {
    for (const x of [
      { acao: 'concluir', versao: 1 },
      { acao: 'pausar', versao: 0 },
      { acao: 'inventar', versao: 1 },
      { acao: 'retomar', versao: 1, passoId: randomUUID() },
    ])
      expect(acaoDaRotinaSchema.safeParse(x).success).toBe(false);
    expect(
      acaoDaRotinaSchema.safeParse({
        acao: 'pular',
        versao: 2,
        passoId: randomUUID(),
      }).success
    ).toBe(true);
  });
});
