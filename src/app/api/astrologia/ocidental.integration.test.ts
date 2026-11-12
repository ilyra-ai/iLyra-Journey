import { beforeAll, describe, expect, it } from 'vitest';
import { executeStatement, queryRows } from '@/lib/mysql/pool';
import { GET } from './ocidental/route';
import { chamar } from '../../../../tests/integration/http';
import {
  criarUsuario,
  type UsuarioDeTeste,
} from '../../../../tests/integration/fixtures';

describe('Mapa ocidental privado com perfil real', () => {
  let titular: UsuarioDeTeste;
  let outro: UsuarioDeTeste;
  beforeAll(async () => {
    titular = await criarUsuario();
    outro = await criarUsuario();
    await executeStatement(
      `UPDATE profiles SET birth_date='1990-12-01', birth_time='10:30',
       birth_location='São Paulo', birth_latitude=-23.5505,
       birth_longitude=-46.6333, birth_timezone='America/Sao_Paulo' WHERE id=?`,
      [titular.id]
    );
  });

  it('recusa acesso anônimo', async () => {
    expect((await chamar(GET, { usuario: null })).status).toBe(401);
  });

  it('calcula posições e leitura do próprio titular, sem cache público', async () => {
    const resposta = await chamar(GET, { usuario: titular });
    expect(resposta.status).toBe(200);
    expect(resposta.headers.get('Cache-Control')).toBe('private, no-store');
    expect(resposta.json).toMatchObject({
      mapa: {
        zodiaco: 'tropical',
        nascimento: { instanteUtc: '1990-12-01T12:30:00.000Z' },
      },
      leitura: { tipo: 'ocidental', natureza: 'interpretacao-simbolica' },
    });
  });

  it('não permite selecionar o mapa de outra conta por parâmetro', async () => {
    const resposta = await chamar(GET, {
      usuario: outro,
      path: `/api/astrologia/ocidental?userId=${titular.id}`,
    });
    expect(resposta.status).toBe(200);
    expect(resposta.json).toMatchObject({
      mapa: null,
      leitura: null,
      faltando: ['data'],
    });
  });

  it('reutiliza a base privada e recalcula quando o nascimento muda', async () => {
    const pessoa = await criarUsuario();
    await executeStatement(
      `UPDATE profiles SET birth_date='1990-12-01', birth_time='10:30',
       birth_location='São Paulo', birth_latitude=-23.5505,
       birth_longitude=-46.6333, birth_timezone='America/Sao_Paulo' WHERE id=?`,
      [pessoa.id]
    );
    const revisao = async () => {
      const [base] = await queryRows<{ revision: string | number }>(
        "SELECT revision FROM astrological_natal_bases WHERE user_id=? AND method='ocidental-tropical'",
        [pessoa.id]
      );
      return Number(base?.revision);
    };
    const respostas = await Promise.all(
      Array.from({ length: 4 }, () => chamar(GET, { usuario: pessoa }))
    );
    for (const resposta of respostas) {
      expect(resposta.status).toBe(200);
      expect(resposta.json).toEqual(respostas[0].json);
    }
    expect(await revisao()).toBe(1);

    await executeStatement(
      "UPDATE profiles SET birth_time='13:00' WHERE id=?",
      [pessoa.id]
    );
    const atualizada = await chamar(GET, { usuario: pessoa });
    expect(atualizada.status).toBe(200);
    expect(atualizada.json).toMatchObject({
      mapa: { nascimento: { instanteUtc: '1990-12-01T15:00:00.000Z' } },
    });
    expect(await revisao()).toBe(2);
  });

  it('recusa ocorrência inválida e exige desambiguação do horário repetido', async () => {
    expect(
      (
        await chamar(GET, {
          usuario: titular,
          path: '/api/astrologia/ocidental?ocorrencia=invalida',
        })
      ).status
    ).toBe(400);
    await executeStatement(
      "UPDATE profiles SET birth_date='2019-02-16', birth_time='23:30' WHERE id=?",
      [titular.id]
    );
    expect((await chamar(GET, { usuario: titular })).status).toBe(422);
    expect(
      (
        await chamar(GET, {
          usuario: titular,
          path: '/api/astrologia/ocidental?ocorrencia=posterior',
        })
      ).status
    ).toBe(200);
  });
});
