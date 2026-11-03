#!/usr/bin/env node
/** Conferência HTTP real da identidade, sem alterar provedores ou contas existentes. */
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';

const origem = process.env.APP_BASE_URL || 'http://localhost:3000';
assert(['localhost', '127.0.0.1'].includes(new URL(origem).hostname));
const contas = [];

async function chamar(pessoa, caminho, metodo = 'GET', corpo) {
  const resposta = await fetch(new URL(caminho, origem), {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(pessoa?.cookie ? { Cookie: pessoa.cookie } : {}),
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
    signal: AbortSignal.timeout(180_000),
  });
  const dados = await resposta.json();
  const cookie = resposta.headers.get('set-cookie');
  if (pessoa && cookie) pessoa.cookie = cookie.split(';')[0];
  return { status: resposta.status, dados };
}

async function exigir(pessoa, caminho, metodo = 'GET', corpo, status = 200) {
  const resposta = await chamar(pessoa, caminho, metodo, corpo);
  assert.equal(
    resposta.status,
    status,
    `${metodo} ${caminho}: ${resposta.status}`
  );
  return resposta.dados;
}

try {
  assert.equal(
    (
      await chamar(null, '/api/functions/ask-ai-assistant', 'POST', {
        query: 'Quem é você?',
      })
    ).status,
    401
  );
  for (const nome of ['Ana', 'Bruno']) {
    const pessoa = {
      cookie: '',
      senha: randomBytes(32).toString('base64url'),
      email: `qa-identidade-${randomUUID()}@teste.lyra.local`,
    };
    const registro = await exigir(pessoa, '/api/auth/register', 'POST', {
      email: pessoa.email,
      password: pessoa.senha,
      firstName: nome,
      nickname: `Apelido ${nome}`,
      acceptTerms: true,
    });
    pessoa.id = registro.session.user.id;
    contas.push(pessoa);
    await exigir(pessoa, '/api/auth/login', 'POST', {
      email: pessoa.email,
      password: pessoa.senha,
    });
    const pedido = {
      query: 'Quem é seu criador?',
      conversationId: randomUUID(),
      turnId: randomUUID(),
      privacyMode: true,
    };
    const origemLyra = await exigir(
      pessoa,
      '/api/functions/ask-ai-assistant',
      'POST',
      pedido
    );
    assert.match(origemLyra.response, /^💖 /u);
    assert.match(origemLyra.response, /Douglas Mosken/u);
    assert.match(origemLyra.response, /narrativa de origem/u);
    const gravada = await exigir(
      pessoa,
      `/api/chat/conversas/${pedido.conversationId}`
    );
    assert.equal(gravada.turnos[0].resposta, origemLyra.response);
    assert.equal(
      (await exigir(pessoa, '/api/functions/ask-ai-assistant', 'POST', pedido))
        .response,
      origemLyra.response
    );
    const saudacao = await exigir(
      pessoa,
      '/api/functions/ask-ai-assistant',
      'POST',
      { query: 'Olá!', privacyMode: true }
    );
    assert(saudacao.response.includes('Olá, xuxu!'));
    assert.doesNotMatch(saudacao.response, /meu pai|meu criador|Yogue/u);
    const filtros = [{ type: 'eq', column: 'id', value: pessoa.id }];
    const parametros = new URLSearchParams({
      select: 'id,nickname',
      filters: JSON.stringify(filtros),
    });
    const lerPerfil = async () =>
      (await exigir(pessoa, `/api/data/profiles?${parametros}`)).data[0];
    const mudarApelido = async (nickname) =>
      exigir(pessoa, '/api/data/profiles', 'PATCH', {
        values: { nickname },
        filters: filtros,
      });
    assert.equal((await lerPerfil()).nickname, `Apelido ${nome}`);
    await mudarApelido('Flor do Dia');
    assert.equal((await lerPerfil()).nickname, 'Flor do Dia');
    await exigir(pessoa, '/api/functions/ask-ai-assistant', 'POST', {
      query: 'Não me chame de xuxu.',
      privacyMode: true,
    });
    const comApelido = await exigir(
      pessoa,
      '/api/functions/ask-ai-assistant',
      'POST',
      { query: 'Olá!', privacyMode: true }
    );
    assert(comApelido.response.includes('Olá, Flor do Dia!'));
    await mudarApelido(null);
    assert.equal((await lerPerfil()).nickname, null);
    await exigir(pessoa, '/api/functions/ask-ai-assistant', 'POST', {
      query: 'Não me chame de xuxu, me chame pelo meu nome.',
      privacyMode: true,
    });
    const peloNome = await exigir(
      pessoa,
      '/api/functions/ask-ai-assistant',
      'POST',
      {
        query: 'Olá!',
        conversationId: randomUUID(),
        turnId: randomUUID(),
        privacyMode: true,
      }
    );
    assert(peloNome.response.includes(`Olá, ${nome}!`));
    assert.doesNotMatch(peloNome.response, /\bxuxu(?:zinho)?\b/iu);
    await exigir(pessoa, '/api/functions/ask-ai-assistant', 'POST', {
      query: 'Me chame de Flor.',
      privacyMode: true,
    });
    await exigir(pessoa, '/api/auth/login', 'POST', {
      email: pessoa.email,
      password: pessoa.senha,
    });
    const apelido = await exigir(
      pessoa,
      '/api/functions/ask-ai-assistant',
      'POST',
      { query: 'Olá!', privacyMode: true }
    );
    assert(apelido.response.includes('Olá, Flor!'));
    await exigir(pessoa, '/api/functions/ask-ai-assistant', 'POST', {
      query: 'Pode voltar a me chamar de xuxu.',
      privacyMode: true,
    });
    const carinho = await exigir(
      pessoa,
      '/api/functions/ask-ai-assistant',
      'POST',
      { query: 'Olá!', privacyMode: true }
    );
    assert(carinho.response.includes('Olá, xuxu!'));
    const semEmoji = await exigir(
      pessoa,
      '/api/functions/ask-ai-assistant',
      'POST',
      { query: 'Quem é seu criador? Responda sem emojis.', privacyMode: true }
    );
    assert.doesNotMatch(semEmoji.response, /^\p{Extended_Pictographic}/u);
    pessoa.conversa = pedido.conversationId;
    console.log(
      `[identidade:qa] ${nome}: cadastro, login, identidade, expressão, nome do titular e histórico real conferidos.`
    );
  }
  await exigir(
    contas[1],
    `/api/chat/conversas/${contas[0].conversa}`,
    'GET',
    undefined,
    404
  );
  console.log('[identidade:qa] Isolamento entre contas confirmado.');
} catch (erro) {
  console.error(
    `[identidade:qa] ${erro instanceof Error ? erro.message : 'Falha de verificação.'}`
  );
  process.exitCode = 1;
} finally {
  for (const pessoa of contas) {
    const excluida = await chamar(pessoa, '/api/account', 'DELETE', {
      currentPassword: pessoa.senha,
      confirmation: 'EXCLUIR MINHA CONTA',
    });
    if (excluida.status !== 200) {
      console.error(
        `[identidade:qa] Exclusão da conta temporária ${pessoa.id} retornou ${excluida.status}.`
      );
      process.exitCode = 1;
    }
  }
  console.log('[identidade:qa] Limpeza das contas temporárias encerrada.');
}
