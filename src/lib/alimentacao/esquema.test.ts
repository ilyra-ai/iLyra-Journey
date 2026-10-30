import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { edicaoSchema, refeicaoSchema } from './esquema';

const base = () => ({
  id: randomUUID(),
  data: '2026-10-29',
  hora: '07:45',
  tipo: 'cafe',
  descricao: 'Fruta',
  porcao: null,
  percepcao: null,
  nota: '',
});
describe('contrato do diário alimentar', () => {
  it('aceita registro mínimo e campos opcionais nulos', () => {
    expect(refeicaoSchema.safeParse(base()).success).toBe(true);
    expect(
      refeicaoSchema.safeParse({ ...base(), porcao: 'grande', percepcao: 5 })
        .success
    ).toBe(true);
  });
  it('recusa horário, tipo, porção, percepção e campos extras inválidos em pt-BR', () => {
    const casos: Array<[Record<string, unknown>, string]> = [
      [{ hora: '7:45' }, 'Informe o horário no formato HH:MM.'],
      [{ hora: '24:00' }, 'Informe o horário no formato HH:MM.'],
      [{ tipo: 'ceia' }, 'Escolha o tipo de registro.'],
      [{ porcao: 'enorme' }, 'Porção inválida.'],
      [{ percepcao: 0 }, 'Percepção inválida.'],
      [{ descricao: 'x'.repeat(501) }, 'Use até 500 caracteres na descrição.'],
    ];
    for (const [extra, msg] of casos) {
      const r = refeicaoSchema.safeParse({ ...base(), ...extra });
      expect(r.success).toBe(false);
      expect(r.error?.issues[0].message).toBe(msg);
    }
    expect(refeicaoSchema.safeParse({ ...base(), kcal: 300 }).success).toBe(
      false
    );
    const edicao = { ...base(), versao: 0 } as Record<string, unknown>;
    delete edicao.id;
    expect(edicaoSchema.safeParse(edicao).success).toBe(false);
    expect(edicaoSchema.safeParse({ ...edicao, versao: 1 }).success).toBe(true);
  });
});
