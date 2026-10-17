import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  avisarFalhaDoBanco,
  classificarFalhaDoBanco,
  dicaParaOTerminal,
} from './diagnostico';

const erroCom = (code: string) => Object.assign(new Error(code), { code });

describe('classificarFalhaDoBanco', () => {
  it('reconhece banco fora do ar', () => {
    expect(classificarFalhaDoBanco(erroCom('ECONNREFUSED'))).toBe(
      'sem-conexao'
    );
    expect(classificarFalhaDoBanco(erroCom('ETIMEDOUT'))).toBe('sem-conexao');
    expect(classificarFalhaDoBanco(erroCom('PROTOCOL_CONNECTION_LOST'))).toBe(
      'sem-conexao'
    );
  });

  it('reconhece credencial, banco inexistente e migrations pendentes', () => {
    expect(classificarFalhaDoBanco(erroCom('ER_ACCESS_DENIED_ERROR'))).toBe(
      'acesso-negado'
    );
    expect(classificarFalhaDoBanco(erroCom('ER_BAD_DB_ERROR'))).toBe(
      'banco-inexistente'
    );
    expect(classificarFalhaDoBanco(erroCom('ER_NO_SUCH_TABLE'))).toBe(
      'sem-migrations'
    );
  });

  it('ignora erros que não são do banco', () => {
    expect(classificarFalhaDoBanco(new Error('outro'))).toBeNull();
    expect(classificarFalhaDoBanco(erroCom('ER_DUP_ENTRY'))).toBeNull();
    expect(classificarFalhaDoBanco('texto')).toBeNull();
  });
});

describe('dicaParaOTerminal', () => {
  it('mostra o destino e o comando que resolve', () => {
    vi.stubEnv('MYSQL_HOST', '127.0.0.1');
    vi.stubEnv('MYSQL_PORT', '3307');
    vi.stubEnv('MYSQL_DATABASE', 'lyra_metacare');
    const dica = dicaParaOTerminal('sem-conexao');
    expect(dica).toContain('127.0.0.1:3307/lyra_metacare');
    expect(dica).toContain('python3 run.py db');
    vi.unstubAllEnvs();
  });
});

describe('avisarFalhaDoBanco', () => {
  afterEach(() => vi.restoreAllMocks());

  it('avisa uma vez a cada 30 s por tipo de falha', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const inicio = 1_000_000_000;
    expect(avisarFalhaDoBanco('acesso-negado', inicio)).toBe(true);
    expect(avisarFalhaDoBanco('acesso-negado', inicio + 10_000)).toBe(false);
    expect(avisarFalhaDoBanco('acesso-negado', inicio + 31_000)).toBe(true);
    expect(log).toHaveBeenCalledTimes(2);
  });
});
