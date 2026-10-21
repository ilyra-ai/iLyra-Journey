import { randomBytes, randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { runSelectQuery, runUpdateQuery } from '@/lib/mysql/data-api';
import { queryRows } from '@/lib/mysql/pool';
import { exportarDadosDoTitular } from '@/lib/lgpd/conta';
import { criarUsuario } from '../../../tests/integration/fixtures';
import { chamar } from '../../../tests/integration/http';
import { POST as cadastrar } from './auth/register/route';
import { POST as conversar } from './functions/ask-ai-assistant/route';

describe('CRUD real do apelido e uso no Motor Lyra', () => {
  it('cria no cadastro, lê, altera e remove sem apagar o perfil', async () => {
    const email = `apelido-${randomUUID()}@teste.lyra.local`;
    const resposta = await chamar(cadastrar, {
      usuario: null,
      method: 'POST',
      headers: { 'x-forwarded-for': '10.82.33.1' },
      body: {
        email,
        password: randomBytes(24).toString('base64url'),
        firstName: 'Ana',
        nickname: '  Aninha  ',
        acceptTerms: true,
      },
    });
    expect(resposta.status).toBe(200);
    const [{ id }] = await queryRows<{ id: string }>(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    const pessoa = await criarUsuario('patient', 'Bruno');
    const consultar = () =>
      queryRows<{ nickname: string | null }>(
        'SELECT nickname FROM profiles WHERE id = ?',
        [id]
      );
    expect((await consultar())[0].nickname).toBe('Aninha');
    // Sessão real assinada pelo helper de integração, com o titular cadastrado.
    const dono = {
      ...pessoa,
      id,
      email,
      session: {
        ...pessoa.session,
        user: { ...pessoa.session.user, id, email },
      },
    };
    const ler = await runSelectQuery({
      table: 'profiles',
      select: 'id,nickname',
      filters: [{ type: 'eq', column: 'id', value: id }],
      orders: [],
      session: dono.session,
    });
    expect(JSON.stringify(ler.data)).toContain('Aninha');
    const alterar = (nickname: unknown, titular = dono, alvo = id) =>
      runUpdateQuery({
        table: 'profiles',
        values: { nickname },
        filters: [{ type: 'eq', column: 'id', value: alvo }],
        session: titular.session,
      });
    await alterar('Flor');
    expect((await consultar())[0].nickname).toBe('Flor');
    await alterar('Intrusão', pessoa);
    expect((await consultar())[0].nickname).toBe('Flor');
    await expect(alterar('a'.repeat(81))).rejects.toThrow();
    await expect(alterar('<script>')).rejects.toThrow();
    await expect(alterar(123)).rejects.toThrow();

    const perguntar = async (query: string) => {
      const retorno = await chamar(conversar, {
        usuario: dono,
        method: 'POST',
        body: { query, privacyMode: true },
      });
      expect(retorno.status).toBe(200);
      return (retorno.json as { response: string }).response;
    };
    expect(await perguntar('Olá!')).toContain('Olá, xuxu!');
    expect(await perguntar('Não me chame de xuxu.')).toContain(
      'Combinado, Flor.'
    );
    expect(await perguntar('Olá!')).toContain('Olá, Flor!');
    await alterar('Estrela');
    expect(await perguntar('Olá!')).toContain('Olá, Estrela!');
    expect((await exportarDadosDoTitular(id)).perfil?.nickname).toBe('Estrela');
    await alterar(null);
    expect((await consultar())[0].nickname).toBeNull();
    expect(await perguntar('Olá!')).toContain('Olá, Ana!');
    await alterar('   ');
    expect((await consultar())[0].nickname).toBeNull();
    const outro = await runSelectQuery({
      table: 'profiles',
      select: 'id,nickname',
      filters: [{ type: 'eq', column: 'id', value: id }],
      orders: [],
      session: pessoa.session,
    });
    expect(outro.data).toEqual([]);
  });

  it('recusa apelido inválido no cadastro antes de criar a conta', async () => {
    const email = `apelido-invalido-${randomUUID()}@teste.lyra.local`;
    const resposta = await chamar(cadastrar, {
      usuario: null,
      method: 'POST',
      body: {
        email,
        password: randomBytes(24).toString('base64url'),
        nickname: 'x'.repeat(81),
        acceptTerms: true,
      },
    });
    expect(resposta.status).toBe(400);
    expect(
      await queryRows('SELECT id FROM users WHERE email = ?', [email])
    ).toHaveLength(0);
  });
});
