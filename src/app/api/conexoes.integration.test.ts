import { describe, expect, it } from 'vitest';

import {
  criarUsuario,
  definirDireito,
} from '../../../tests/integration/fixtures';
import { chamar } from '../../../tests/integration/http';
import type { ConexaoDaAlma } from '@/lib/conexoes/sinastria';
import { executeStatement, queryRows } from '@/lib/mysql/pool';

import { POST } from './conexoes/route';

const PEDIDO = {
  outra: { apelido: 'Rafa', data: '1992-08-15' },
  consentimento: true,
};

async function comNascimento(data: string) {
  const pessoa = await criarUsuario();
  await executeStatement('UPDATE profiles SET birth_date = ? WHERE id = ?', [
    data,
    pessoa.id,
  ]);
  return pessoa;
}

describe('Conexões da Alma: rota (tarefa 166)', () => {
  it('exige sessão e devolve a leitura dos Sóis sem cache, com os dados do perfil', async () => {
    expect(
      (await chamar(POST, { usuario: null, method: 'POST', body: PEDIDO }))
        .status
    ).toBe(401);
    const pessoa = await comNascimento('1990-04-10');
    const resposta = await chamar(POST, {
      usuario: pessoa,
      method: 'POST',
      body: PEDIDO,
    });
    expect(resposta.status).toBe(200);
    expect(resposta.headers.get('cache-control')).toContain('no-store');
    const conexao = resposta.json as ConexaoDaAlma;
    expect(conexao.nivel).toBe('solar');
    expect(conexao.pessoas.map((p) => [p.rotulo, p.sol.signo])).toEqual([
      ['Você', 'Áries'],
      ['Rafa', 'Leão'],
    ]);
  });

  it('nada da outra pessoa é gravado no banco', async () => {
    const pessoa = await comNascimento('1990-04-10');
    const antes = await queryRows<{ total: number }>(
      `SELECT COUNT(*) AS total FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()`
    );
    await chamar(POST, {
      usuario: pessoa,
      method: 'POST',
      body: {
        ...PEDIDO,
        outra: { ...PEDIDO.outra, apelido: 'Apelido-Unico-166' },
      },
    });
    // Procura o apelido em todas as colunas de texto das tabelas do usuário.
    const colunas = await queryRows<{
      TABLE_NAME: string;
      COLUMN_NAME: string;
    }>(
      `SELECT c.TABLE_NAME, c.COLUMN_NAME
         FROM information_schema.COLUMNS c
         JOIN information_schema.COLUMNS u
           ON u.TABLE_SCHEMA = c.TABLE_SCHEMA AND u.TABLE_NAME = c.TABLE_NAME
          AND u.COLUMN_NAME = 'user_id'
        WHERE c.TABLE_SCHEMA = DATABASE()
          AND c.DATA_TYPE IN ('varchar','text','mediumtext','longtext','json')`
    );
    for (const { TABLE_NAME, COLUMN_NAME } of colunas) {
      const [achou] = await queryRows<{ total: number }>(
        `SELECT COUNT(*) AS total FROM \`${TABLE_NAME}\`
          WHERE user_id = ? AND CAST(\`${COLUMN_NAME}\` AS CHAR) LIKE ?`,
        [pessoa.id, '%Apelido-Unico-166%']
      );
      expect(Number(achou.total), `${TABLE_NAME}.${COLUMN_NAME}`).toBe(0);
    }
    expect(antes[0].total).toBeGreaterThan(0);
  });

  it('sem data no perfil pede a data; o ajuste só para a leitura resolve', async () => {
    const pessoa = await criarUsuario();
    const semData = await chamar(POST, {
      usuario: pessoa,
      method: 'POST',
      body: PEDIDO,
    });
    expect(semData.status).toBe(422);
    const ajustada = await chamar(POST, {
      usuario: pessoa,
      method: 'POST',
      body: { ...PEDIDO, titular: { data: '1988-01-20' } },
    });
    expect(ajustada.status).toBe(200);
    // O ajuste não muda o perfil.
    const [perfil] = await queryRows<{ birth_date: string | null }>(
      'SELECT birth_date FROM profiles WHERE id = ?',
      [pessoa.id]
    );
    expect(perfil.birth_date).toBeNull();
  });

  it('recusa sem consentimento, campo a mais, menor de idade e cidade inexistente', async () => {
    const pessoa = await comNascimento('1990-04-10');
    const pedir = (body: unknown) =>
      chamar(POST, { usuario: pessoa, method: 'POST', body });
    expect((await pedir({ outra: PEDIDO.outra })).status).toBe(400);
    expect(
      (
        await pedir({
          ...PEDIDO,
          outra: { ...PEDIDO.outra, nomeCompleto: 'Fulano de Tal' },
        })
      ).status
    ).toBe(400);
    expect(
      (await pedir({ ...PEDIDO, outra: { data: '2012-03-03' } })).status
    ).toBe(422);
    expect(
      (
        await pedir({
          ...PEDIDO,
          outra: { data: '1992-08-15', hora: '10:00', cidadeId: 999999999 },
        })
      ).status
    ).toBe(422);
  });

  it('sem o recurso no plano, recusa com 403 antes de ler os dados', async () => {
    const restaurar = await definirDireito('care', 'vedic_insights', {
      enabled: false,
    });
    try {
      const pessoa = await comNascimento('1990-04-10');
      const resposta = await chamar(POST, {
        usuario: pessoa,
        method: 'POST',
        body: PEDIDO,
      });
      expect(resposta.status).toBe(403);
    } finally {
      await restaurar();
    }
  });
});
