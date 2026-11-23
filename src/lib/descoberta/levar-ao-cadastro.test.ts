import { afterEach, describe, expect, it } from 'vitest';

import {
  esquecerLeituraPendente,
  guardarParaOCadastro,
  retirarParaOCadastro,
  separarNome,
  VALIDADE_MS,
  verParaOCadastro,
} from './levar-ao-cadastro';

const LEITURA = { nome: 'Ana Maria Souza', dataDeNascimento: '2000-08-10' };

afterEach(() => esquecerLeituraPendente());

describe('levar a leitura gratuita para o cadastro (tarefa 188)', () => {
  it('sem pedido da pessoa, não há nada guardado', () => {
    expect(verParaOCadastro()).toBeNull();
    expect(retirarParaOCadastro()).toBeNull();
  });

  it('o cadastro lê sem consumir; o onboarding retira uma vez só', () => {
    guardarParaOCadastro(LEITURA, 1_000);
    expect(verParaOCadastro(2_000)).toEqual(LEITURA);
    expect(verParaOCadastro(2_000)).toEqual(LEITURA);
    expect(retirarParaOCadastro(3_000)).toEqual(LEITURA);
    expect(retirarParaOCadastro(3_000)).toBeNull();
  });

  it('vence em 30 minutos e some ao sair da conta', () => {
    guardarParaOCadastro(LEITURA, 0);
    expect(verParaOCadastro(VALIDADE_MS - 1)).toEqual(LEITURA);
    expect(verParaOCadastro(VALIDADE_MS)).toBeNull();
    guardarParaOCadastro(LEITURA, 0);
    esquecerLeituraPendente();
    expect(verParaOCadastro(1)).toBeNull();
  });

  it('separa nome e sobrenome do nome completo', () => {
    expect(separarNome('  Ana   Maria Souza ')).toEqual({
      primeiro: 'Ana',
      sobrenome: 'Maria Souza',
    });
    expect(separarNome('')).toEqual({ primeiro: '', sobrenome: '' });
  });
});
