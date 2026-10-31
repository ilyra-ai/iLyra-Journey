import { describe, expect, it } from 'vitest';
import { avaliacaoSchema, exemplosDoTreino } from './esquema';

describe('exemplos do treino por feedback (tarefa 90)', () => {
  it('aprovada é desejável, reprovada é indesejável e a resposta ideal entra como desejável', () => {
    expect(
      exemplosDoTreino([
        { pergunta: 'A?', resposta: 'Boa.', nota: 1, correcao: null },
        { pergunta: 'B?', resposta: 'Vaga.', nota: -1, correcao: 'Clara.' },
        { pergunta: 'C?', resposta: 'Ruim.', nota: -1, correcao: null },
      ])
    ).toEqual([
      { pergunta: 'A?', resposta: 'Boa.', desejavel: true },
      { pergunta: 'B?', resposta: 'Vaga.', desejavel: false },
      { pergunta: 'B?', resposta: 'Clara.', desejavel: true },
      { pergunta: 'C?', resposta: 'Ruim.', desejavel: false },
    ]);
  });

  it('aceita só nota 1 ou -1 e recusa campos extras', () => {
    const turnoId = '6f9a1c62-6a8e-4c1e-9a55-2f1a0e0b7d10';
    expect(
      avaliacaoSchema.safeParse({ turnoId, nota: 1, correcao: null }).success
    ).toBe(true);
    expect(
      avaliacaoSchema.safeParse({ turnoId, nota: 0, correcao: null }).success
    ).toBe(false);
    expect(
      avaliacaoSchema.safeParse({
        turnoId,
        nota: -1,
        correcao: 'x',
        pergunta: 'forjada',
      }).success
    ).toBe(false);
  });
});
