import { describe, expect, it } from 'vitest';

import { criarUsuario } from '../../../../tests/integration/fixtures';
import { chamar } from '../../../../tests/integration/http';
import { executeStatement } from '@/lib/mysql/pool';

import { GET } from './qualidade/route';

interface Resposta {
  calculos: { aprovado: boolean; total: number; reprovadas: number };
  ia: {
    modelos: Array<{
      modelo: string;
      chamadas: number;
      falhas: number;
      latenciaP50: number | null;
      latenciaP95: number | null;
    }>;
  };
}

describe('centro de qualidade (tarefa 183)', () => {
  it('só administradores; período fora da lista é recusado', async () => {
    const pessoa = await criarUsuario();
    const admin = await criarUsuario('admin');
    expect((await chamar(GET, { usuario: null })).status).toBe(401);
    expect((await chamar(GET, { usuario: pessoa })).status).toBe(403);
    expect(
      (
        await chamar(GET, {
          usuario: admin,
          path: '/api/admin/qualidade?dias=5',
        })
      ).status
    ).toBe(400);
  });

  it('roda as verificações do Motor e lê falhas e latência do registro', async () => {
    const admin = await criarUsuario('admin');
    const modelo = `modelo-qualidade-${crypto.randomUUID().slice(0, 8)}`;
    // 10 chamadas: 9 concluídas (100 a 900 ms) e 1 falha sem latência útil.
    for (let i = 1; i <= 9; i += 1)
      await executeStatement(
        `INSERT INTO ia_uso (rotulo, provedor, modelo, local, resultado, milissegundos)
         VALUES ('teste', 'teste', ?, TRUE, 'ok', ?)`,
        [modelo, i * 100]
      );
    await executeStatement(
      `INSERT INTO ia_uso (rotulo, provedor, modelo, local, resultado, milissegundos)
       VALUES ('teste', 'teste', ?, TRUE, 'falhou', 30000)`,
      [modelo]
    );
    const resposta = await chamar(GET, {
      usuario: admin,
      path: '/api/admin/qualidade?dias=7',
    });
    expect(resposta.status).toBe(200);
    const corpo = resposta.json as Resposta;
    expect(corpo.calculos).toMatchObject({ aprovado: true, reprovadas: 0 });
    expect(corpo.calculos.total).toBe(37);
    const linha = corpo.ia.modelos.find((m) => m.modelo === modelo);
    expect(linha).toMatchObject({
      chamadas: 10,
      falhas: 1,
      latenciaP50: 500,
      latenciaP95: 900,
    });
    await executeStatement('DELETE FROM ia_uso WHERE modelo = ?', [modelo]);
  });
});
