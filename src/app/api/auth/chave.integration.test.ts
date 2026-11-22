import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  assinar,
  novoAutenticador,
  registrar,
  type Autenticador,
} from '../../../../tests/integration/autenticador';
import {
  criarUsuario,
  type UsuarioDeTeste,
} from '../../../../tests/integration/fixtures';
import {
  chamar,
  cookieJar,
  entrarComo,
} from '../../../../tests/integration/http';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { executeStatement, queryRows } from '@/lib/mysql/pool';

import { GET as LISTAR } from '../account/chaves/route';
import {
  DELETE as REVOGAR,
  PATCH as RENOMEAR,
} from '../account/chaves/[id]/route';
import { POST as LOGIN } from './chave/login/route';
import { POST as OPCOES_DE_LOGIN } from './chave/login/opcoes/route';
import { POST as REGISTRO } from './chave/registro/route';
import { POST as OPCOES_DE_REGISTRO } from './chave/registro/opcoes/route';

/**
 * Endereço público do app neste teste: as rotas tiram dele a origem e o
 * RP ID esperados, como em produção.
 */
const ORIGEM = 'https://app.lyra.test';
const origem = () => ORIGEM;

beforeAll(() => {
  vi.stubEnv('APP_BASE_URL', ORIGEM);
});
afterAll(() => {
  vi.unstubAllEnvs();
});

function cookieDoDesafio(resposta: { headers: Headers }) {
  const valor = /lyra_chave_de_acesso=([^;]+)/.exec(
    resposta.headers.get('set-cookie') ?? ''
  )?.[1];
  expect(valor).toBeTruthy();
  return `lyra_chave_de_acesso=${valor}`;
}

async function criarChave(usuario: UsuarioDeTeste, a: Autenticador) {
  const opcoes = await chamar(OPCOES_DE_REGISTRO, {
    usuario,
    method: 'POST',
  });
  expect(opcoes.status).toBe(200);
  const json = opcoes.json as {
    opcoes: { challenge: string; rp: { id: string }; user: { id: string } };
  };
  return chamar(REGISTRO, {
    usuario,
    method: 'POST',
    headers: { cookie: cookieDoDesafio(opcoes) },
    body: {
      nome: 'Notebook de teste',
      resposta: registrar(a, json.opcoes, origem()),
    },
  });
}

async function entrarComChave(
  a: Autenticador,
  extra: { contadorForcado?: number; origem?: string } = {}
) {
  await entrarComo(null);
  const opcoes = await chamar(OPCOES_DE_LOGIN, {
    method: 'POST',
    headers: { 'x-forwarded-for': '203.0.113.90' },
  });
  expect(opcoes.status).toBe(200);
  const json = opcoes.json as { opcoes: { challenge: string; rpId: string } };
  expect(json.opcoes).not.toHaveProperty('allowCredentials.0');
  const resposta = assinar(a, json.opcoes, extra.origem ?? origem(), extra);
  const cookie = cookieDoDesafio(opcoes);
  const login = await chamar(LOGIN, {
    method: 'POST',
    headers: { cookie, 'x-forwarded-for': '203.0.113.90' },
    body: { resposta },
  });
  return {
    login,
    repetir: () =>
      chamar(LOGIN, {
        method: 'POST',
        headers: { cookie, 'x-forwarded-for': '203.0.113.90' },
        body: { resposta },
      }),
  };
}

describe('chaves de acesso: registro (tarefa 167)', () => {
  it('cria a chave só com sessão e guarda apenas a chave pública', async () => {
    const pessoa = await criarUsuario();
    expect(
      (await chamar(OPCOES_DE_REGISTRO, { usuario: null, method: 'POST' }))
        .status
    ).toBe(401);
    const a = novoAutenticador();
    const criada = await criarChave(pessoa, a);
    expect(criada.status).toBe(201);
    const [linha] = await queryRows<{
      credencial_id: string;
      contador: number;
      nome: string;
      revogada_em: Date | null;
    }>(
      'SELECT credencial_id, contador, nome, revogada_em FROM chaves_de_acesso WHERE user_id = ?',
      [pessoa.id]
    );
    expect(linha).toMatchObject({
      credencial_id: a.credencialId.toString('base64url'),
      nome: 'Notebook de teste',
      revogada_em: null,
    });
    // A mesma credencial não é cadastrada duas vezes.
    expect((await criarChave(pessoa, a)).status).toBe(409);
  });

  it('recusa desafio repetido e resposta sem verificação do usuário', async () => {
    const pessoa = await criarUsuario();
    const opcoes = await chamar(OPCOES_DE_REGISTRO, {
      usuario: pessoa,
      method: 'POST',
    });
    const json = opcoes.json as {
      opcoes: { challenge: string; rp: { id: string }; user: { id: string } };
    };
    const cookie = cookieDoDesafio(opcoes);
    const semUv = await chamar(REGISTRO, {
      usuario: pessoa,
      method: 'POST',
      headers: { cookie },
      body: {
        nome: 'x',
        resposta: registrar(novoAutenticador(), json.opcoes, origem(), {
          verificarUsuario: false,
        }),
      },
    });
    expect(semUv.status).toBe(400);
    // O desafio foi gasto na primeira tentativa.
    const repetido = await chamar(REGISTRO, {
      usuario: pessoa,
      method: 'POST',
      headers: { cookie },
      body: {
        nome: 'x',
        resposta: registrar(novoAutenticador(), json.opcoes, origem()),
      },
    });
    expect(repetido.status).toBe(400);
    expect((repetido.json as { error: string }).error).toMatch(/expirou/);
  });

  it('o desafio de uma conta não serve para outra', async () => {
    const dona = await criarUsuario();
    const outra = await criarUsuario();
    const opcoes = await chamar(OPCOES_DE_REGISTRO, {
      usuario: dona,
      method: 'POST',
    });
    const json = opcoes.json as {
      opcoes: { challenge: string; rp: { id: string }; user: { id: string } };
    };
    const resposta = await chamar(REGISTRO, {
      usuario: outra,
      method: 'POST',
      headers: { cookie: cookieDoDesafio(opcoes) },
      body: {
        nome: 'x',
        resposta: registrar(novoAutenticador(), json.opcoes, origem()),
      },
    });
    expect(resposta.status).toBe(400);
  });
});

describe('chaves de acesso: login (tarefa 167)', () => {
  it('entra com a assinatura do aparelho e cria a sessão da conta certa', async () => {
    const pessoa = await criarUsuario();
    const a = novoAutenticador();
    expect((await criarChave(pessoa, a)).status).toBe(201);
    const { login, repetir } = await entrarComChave(a);
    expect(login.status).toBe(200);
    expect(
      (login.json as { session: { user: { id: string; role: string } } })
        .session.user
    ).toMatchObject({ id: pessoa.id, role: 'patient' });
    expect(cookieJar.get(SESSION_COOKIE_NAME)).toBeTruthy();
    const [uso] = await queryRows<{ contador: number; ultimo_uso_em: Date }>(
      'SELECT contador, ultimo_uso_em FROM chaves_de_acesso WHERE user_id = ?',
      [pessoa.id]
    );
    expect(Number(uso.contador)).toBe(1);
    expect(uso.ultimo_uso_em).not.toBeNull();
    // A mesma resposta assinada não entra duas vezes.
    expect((await repetir()).status).toBe(400);
  });

  it('recusa origem errada, contador que volta e chave revogada', async () => {
    const pessoa = await criarUsuario();
    const a = novoAutenticador();
    await criarChave(pessoa, a);
    const origemErrada = await entrarComChave(a, {
      origem: 'https://lyra-falsa.example',
    });
    expect(origemErrada.login.status).toBe(401);
    expect((await entrarComChave(a)).login.status).toBe(200);
    expect((await entrarComChave(a)).login.status).toBe(200);
    // Contador menor que o último visto: possível clone da credencial.
    const clone = await entrarComChave(a, { contadorForcado: 1 });
    expect(clone.login.status).toBe(401);

    await entrarComo(pessoa);
    const lista = await chamar(LISTAR, { usuario: pessoa });
    const [chave] = (lista.json as { chaves: { id: string }[] }).chaves;
    const revogada = await chamar(REVOGAR, {
      usuario: pessoa,
      method: 'DELETE',
      params: { id: chave.id },
    });
    expect(revogada.status).toBe(200);
    expect((revogada.json as { chaves: unknown[] }).chaves).toHaveLength(0);
    expect((await entrarComChave(a)).login.status).toBe(401);
  });

  it('conta bloqueada não entra; papel vem do banco, não da chave', async () => {
    const pessoa = await criarUsuario();
    const a = novoAutenticador();
    await criarChave(pessoa, a);
    await executeStatement(
      'UPDATE users SET blocked_at = UTC_TIMESTAMP() WHERE id = ?',
      [pessoa.id]
    );
    expect((await entrarComChave(a)).login.status).toBe(403);
    await executeStatement('UPDATE users SET blocked_at = NULL WHERE id = ?', [
      pessoa.id,
    ]);
    await executeStatement("UPDATE profiles SET role = 'admin' WHERE id = ?", [
      pessoa.id,
    ]);
    const { login } = await entrarComChave(a);
    expect(
      (login.json as { session: { user: { role: string } } }).session.user.role
    ).toBe('admin');
  });

  it('credencial desconhecida é recusada sem revelar contas', async () => {
    const { login } = await entrarComChave(novoAutenticador());
    expect(login.status).toBe(401);
  });
});

describe('chaves de acesso: gestão na conta (tarefa 167)', () => {
  it('renomeia e revoga só as chaves da própria conta', async () => {
    const dona = await criarUsuario();
    const outra = await criarUsuario();
    await criarChave(dona, novoAutenticador());
    const lista = await chamar(LISTAR, { usuario: dona });
    const [chave] = (lista.json as { chaves: { id: string }[] }).chaves;
    expect(
      (
        await chamar(RENOMEAR, {
          usuario: outra,
          method: 'PATCH',
          params: { id: chave.id },
          body: { nome: 'Invasor' },
        })
      ).status
    ).toBe(404);
    expect(
      (
        await chamar(REVOGAR, {
          usuario: outra,
          method: 'DELETE',
          params: { id: chave.id },
        })
      ).status
    ).toBe(404);
    const renomeada = await chamar(RENOMEAR, {
      usuario: dona,
      method: 'PATCH',
      params: { id: chave.id },
      body: { nome: 'iPhone da Ana' },
    });
    expect(
      (renomeada.json as { chaves: { nome: string }[] }).chaves[0].nome
    ).toBe('iPhone da Ana');
    expect((await chamar(LISTAR, { usuario: null })).status).toBe(401);
  });
});
