import { describe, expect, it } from 'vitest';

import { HttpError } from '@/lib/http-error';

import {
  descobrirVisitante,
  esquemaDoVisitante,
  hojeNoBrasil,
  IDADE_MINIMA_DA_DESCOBERTA,
} from './visitante';

// 21/11/2026 às 02:00 UTC ainda é 20/11/2026 em São Paulo (23:00).
const NOITE_DE_20_EM_SP = new Date('2026-11-21T02:00:00.000Z');
const TARDE_DE_21_EM_SP = new Date('2026-11-21T18:00:00.000Z');

function status(funcao: () => unknown) {
  try {
    funcao();
  } catch (erro) {
    return erro instanceof HttpError ? erro.statusCode : 'outro';
  }
  return 'sem erro';
}

describe('Experimente Grátis: visitante sem conta (tarefas 155 e 157)', () => {
  it('o dia que conta é o civil de São Paulo, não o UTC', () => {
    expect(hojeNoBrasil(NOITE_DE_20_EM_SP).toISOString()).toBe(
      '2026-11-20T00:00:00.000Z'
    );
    expect(hojeNoBrasil(TARDE_DE_21_EM_SP).toISOString()).toBe(
      '2026-11-21T00:00:00.000Z'
    );
  });

  it('aceita quem completa 13 anos hoje e recusa quem completa amanhã', () => {
    expect(IDADE_MINIMA_DA_DESCOBERTA).toBe(13);
    const visitante = { nome: 'Ana Teste', dataDeNascimento: '2013-11-21' };
    // Em UTC já seria 21/11; em São Paulo ainda é 20/11: faltam horas.
    expect(status(() => descobrirVisitante(visitante, NOITE_DE_20_EM_SP))).toBe(
      403
    );
    expect(status(() => descobrirVisitante(visitante, TARDE_DE_21_EM_SP))).toBe(
      'sem erro'
    );
    expect(
      status(() =>
        descobrirVisitante(
          { nome: 'Ana Teste', dataDeNascimento: '2013-11-22' },
          TARDE_DE_21_EM_SP
        )
      )
    ).toBe(403);
  });

  it('recusa menores com a mesma mensagem, sem repetir a data', () => {
    for (const dataDeNascimento of ['2020-05-10', '2014-01-01', '2026-11-01']) {
      try {
        descobrirVisitante(
          { nome: 'Ana Teste', dataDeNascimento },
          TARDE_DE_21_EM_SP
        );
        expect.unreachable('menor de 13 anos aceito');
      } catch (erro) {
        expect(erro).toBeInstanceOf(HttpError);
        expect((erro as HttpError).message).toBe(
          'A experiência da Lyra é para quem tem 13 anos ou mais.'
        );
        expect((erro as HttpError).message).not.toContain(dataDeNascimento);
      }
    }
  });

  it('recusa data inexistente, futura ou fora do intervalo com 422', () => {
    for (const dataDeNascimento of ['1990-02-30', '2030-01-01', '1899-12-31']) {
      expect(
        status(() =>
          descobrirVisitante(
            { nome: 'Ana Teste', dataDeNascimento },
            TARDE_DE_21_EM_SP
          )
        )
      ).toBe(422);
    }
  });

  it('devolve só o primeiro nome e a leitura ocidental, sem o nome completo', () => {
    const resultado = descobrirVisitante(
      { nome: 'Ana Maria Teste', dataDeNascimento: '1990-07-15' },
      TARDE_DE_21_EM_SP
    );
    expect(resultado.primeiroNome).toBe('Ana');
    expect(JSON.stringify(resultado)).not.toContain('Maria Teste');
    expect(JSON.stringify(resultado)).not.toContain('1990-07-15');
    expect(resultado.sol.signo).toBe('Câncer');
    expect(resultado.leitura.tipo).toBe('ocidental');
    expect(resultado.leitura.resumo).toContain('Sol em Câncer');
  });

  it('na troca de signo mostra os signos possíveis, sem escolher um', () => {
    // 20/03/2000: o Sol entrou em Áries às 07:35 UTC.
    const resultado = descobrirVisitante(
      { nome: 'Ana Teste', dataDeNascimento: '2000-03-20' },
      TARDE_DE_21_EM_SP
    );
    expect(resultado.sol.signo).toBeNull();
    expect(resultado.sol.signosPossiveis).toEqual(['Peixes', 'Áries']);
  });

  it('valida o nome completo e recusa campos extras', () => {
    const valido = { nome: 'Ana Teste', dataDeNascimento: '1990-07-15' };
    expect(esquemaDoVisitante.safeParse(valido).success).toBe(true);
    expect(
      esquemaDoVisitante.safeParse({ ...valido, nome: "D'Ávila São-João" })
        .success
    ).toBe(true);
    for (const nome of [
      'Ana',
      'Ana 2',
      '<script>x</script> y',
      'a'.repeat(121),
    ]) {
      expect(esquemaDoVisitante.safeParse({ ...valido, nome }).success).toBe(
        false
      );
    }
    expect(
      esquemaDoVisitante.safeParse({ ...valido, email: 'x@y.z' }).success
    ).toBe(false);
  });
});
