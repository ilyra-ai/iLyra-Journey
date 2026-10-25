import { expect, it } from 'vitest';
import {
  aplicarResultadoDaConexao,
  estadoDaConexao,
  VALIDADE_DA_VERIFICACAO_MS,
} from './estado-da-conexao';
it('configuração salva não é evidência de conexão; resultados expiram e permitem nova verificação', () => {
  expect(estadoDaConexao(null, false, 1000)).toBe('nao_verificada');
  expect(estadoDaConexao(null, true, 1000)).toBe('verificando');
  const resposta = { ok: true, verificadaEm: 1000 };
  expect(estadoDaConexao(resposta, false, 1001)).toBe('disponivel');
  expect(estadoDaConexao({ ok: true, verificadaEm: 1001 }, false, 1000)).toBe(
    'disponivel'
  );
  expect(
    estadoDaConexao(resposta, false, 1000 + VALIDADE_DA_VERIFICACAO_MS)
  ).toBe('expirada');
  expect(estadoDaConexao({ ...resposta, ok: false }, false, 1001)).toBe(
    'indisponivel'
  );
  expect(estadoDaConexao(resposta, true, 999999)).toBe('verificando');
});
it('uma resposta atrasada não restaura o estado de conexão que foi editada ou removida', async () => {
  let tela = {
    versaoConexao: 'conexao-original',
    modelo: 'antigo',
    resultado: 'não verificado',
  };
  let liberar: () => void = () => {};
  const pendente = new Promise<void>((resolve) => {
    liberar = resolve;
  });
  const resposta = pendente.then(() => {
    tela = aplicarResultadoDaConexao(tela, 'conexao-original', {
      resultado: 'online',
    });
  });
  tela = {
    versaoConexao: 'conexao-nova',
    modelo: 'novo',
    resultado: 'não verificado',
  };
  liberar();
  await resposta;
  expect(tela).toEqual({
    versaoConexao: 'conexao-nova',
    modelo: 'novo',
    resultado: 'não verificado',
  });
});
