#!/usr/bin/env node
/** QA real: HTTP → MySQL → Graphiti → modelo configurado → recuperação. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { setTimeout as esperar } from 'node:timers/promises';

const origem = process.env.APP_BASE_URL || 'http://localhost:3000';
assert(
  ['localhost', '127.0.0.1'].includes(new URL(origem).hostname),
  'Execute a conferência no app local.'
);
const contas = [];
let admin;
let configuracaoOriginal;
let memoriaParada = false;

function controlarMemoria(acao) {
  execFileSync(
    'docker',
    ['compose', '--env-file', '.env.local', acao, 'memoria'],
    { stdio: 'pipe', timeout: 60_000 }
  );
  memoriaParada = acao === 'stop';
}

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
  if (resposta.headers.get('set-cookie') && pessoa)
    pessoa.cookie = resposta.headers.get('set-cookie').split(';')[0];
  return { status: resposta.status, dados };
}

async function exigir(pessoa, caminho, metodo = 'GET', corpo, esperado = 200) {
  const resposta = await chamar(pessoa, caminho, metodo, corpo);
  assert.equal(
    resposta.status,
    esperado,
    `${metodo} ${caminho} respondeu ${resposta.status}.`
  );
  return resposta.dados;
}

async function criarPessoa() {
  const pessoa = { senha: randomBytes(32).toString('base64url'), cookie: '' };
  const dados = await exigir(pessoa, '/api/auth/register', 'POST', {
    email: `qa-memoria-${randomUUID()}@teste.lyra.local`,
    password: pessoa.senha,
    firstName: 'Conferência Graphiti',
    acceptTerms: true,
  });
  pessoa.id = dados.session.user.id;
  contas.push(pessoa);
  await exigir(pessoa, '/api/memoria', 'POST', {
    acao: 'configurar',
    ativa: true,
    nuvem: false,
  });
  return pessoa;
}

async function aguardarRelatos(pessoa, quantidade) {
  const limite = Date.now() + 12 * 60_000;
  let anterior = '';
  while (Date.now() < limite) {
    const estado = await exigir(pessoa, '/api/memoria');
    const resumo = JSON.stringify({
      prontos: Number(estado.prontos),
      fila: Number(estado.fila),
      erros: Number(estado.erros),
      disponivel: estado.disponivel,
    });
    if (resumo !== anterior) console.log(`[memoria:qa] ${resumo}`);
    anterior = resumo;
    if (Number(estado.prontos) >= quantidade) return estado;
    await esperar(5000);
  }
  throw new Error('A extração real não terminou dentro de 12 minutos.');
}

function mensagem(query, privada = false) {
  return {
    query,
    conversationId: randomUUID(),
    turnId: randomUUID(),
    privacyMode: privada,
  };
}

try {
  assert.equal((await chamar(null, '/api/memoria')).status, 401);
  const pessoa = await criarPessoa();
  const outra = await criarPessoa();
  await exigir(pessoa, '/api/memoria', 'POST', {
    acao: 'relato',
    texto: 'Minha gata se chama Aurora. Moro em Curitiba.',
  });
  const estado = await aguardarRelatos(pessoa, 1);
  const fato = estado.fatos.find((item) => /Aurora/iu.test(item.fact));
  assert(fato, 'A extração precisa guardar o nome relatado.');
  assert(
    fato.origens.some((item) => item.texto.includes('Aurora')),
    'A lembrança precisa apontar para o relato original do titular.'
  );
  assert.equal((await exigir(outra, '/api/memoria')).fatos.length, 0);
  assert.equal(
    (
      await chamar(outra, '/api/memoria', 'POST', {
        acao: 'relato',
        texto: 'Outra lembrança.',
        corrige: fato.uuid,
      })
    ).status,
    404
  );
  console.log(
    '[memoria:qa] Extração real, origem do relato e isolamento entre duas contas conferidos.'
  );

  for (const texto of [
    'Meu objetivo é aprender a tocar violão.',
    'Prefiro ler livros de aventura no fim de semana.',
  ]) {
    await exigir(pessoa, '/api/memoria', 'POST', { acao: 'relato', texto });
  }
  await exigir(outra, '/api/memoria', 'POST', {
    acao: 'relato',
    texto: 'Meu passatempo preferido é desenhar paisagens.',
  });
  await aguardarRelatos(outra, 1);
  assert(
    Number((await exigir(pessoa, '/api/memoria')).prontos) < 3,
    'A segunda pessoa precisa avançar antes de terminar a fila da primeira.'
  );
  await aguardarRelatos(pessoa, 3);
  console.log(
    '[memoria:qa] Alternância real entre titulares conferida, sem monopolizar a fila.'
  );

  const primeira = await exigir(
    pessoa,
    '/api/functions/ask-ai-assistant',
    'POST',
    mensagem('Você lembra o nome da minha gata? Responda em uma frase.')
  );
  assert.match(
    primeira.response,
    /Aurora/iu,
    'O modelo precisa receber a memória em uma conversa nova.'
  );

  execFileSync(
    'docker',
    ['compose', '--env-file', '.env.local', 'restart', 'memoria', 'falkordb'],
    { stdio: 'pipe', timeout: 60_000 }
  );
  for (let tentativa = 0; tentativa < 30; tentativa++) {
    await esperar(2000);
    try {
      const pronto = await fetch(`${process.env.LYRA_MEMORIA_URL}/saude`);
      if (pronto.ok) break;
    } catch {
      /* O processo ainda está iniciando. */
    }
  }
  assert(
    (await exigir(pessoa, '/api/memoria')).fatos.some(
      (item) => item.uuid === fato.uuid
    ),
    'A lembrança precisa sobreviver ao reinício dos serviços.'
  );
  console.log(
    '[memoria:qa] Recuperação em conversa nova e persistência após reiniciar conferidas.'
  );

  await exigir(pessoa, '/api/memoria', 'POST', {
    acao: 'relato',
    corrige: fato.uuid,
    texto: 'Correção: minha gata agora se chama Brisa, em vez de Aurora.',
  });
  const corrigida = await aguardarRelatos(pessoa, 5);
  assert(
    corrigida.fatos.some((item) => /Brisa/iu.test(item.fact)),
    'A informação corrigida precisa aparecer na memória.'
  );
  assert(
    !corrigida.fatos.some((item) => item.uuid === fato.uuid),
    'O fato substituído precisa sair da lista de lembranças atuais.'
  );
  const exportacao = await exigir(pessoa, '/api/account/export');
  assert(exportacao.memoria_graphiti.nos.length > 0);
  assert(exportacao.memory_episodes.length >= 3);

  // Troca real para o Motor Lyra, com restauração da configuração completa e
  // sem ler, imprimir ou regravar as chaves cifradas dos provedores.
  admin = { cookie: '' };
  await exigir(admin, '/api/auth/login', 'POST', {
    email: process.env.ADMIN_BOOTSTRAP_EMAIL,
    password: process.env.ADMIN_BOOTSTRAP_PASSWORD,
  });
  const publica = await exigir(admin, '/api/admin/ia');
  configuracaoOriginal = {
    provedores: publica.provedores.map(
      ({ preset, baseUrl, modelos, tempoMaximoSegundos, temperatura }) => ({
        preset,
        baseUrl,
        modelos,
        tempoMaximoSegundos,
        temperatura,
      })
    ),
    ordem: publica.ordem,
  };
  await exigir(admin, '/api/admin/ia', 'PUT', {
    ...configuracaoOriginal,
    ordem: [{ tipo: 'lyra' }],
  });
  try {
    const resposta = await exigir(
      pessoa,
      '/api/functions/ask-ai-assistant',
      'POST',
      mensagem('Você lembra o nome atual da minha gata?')
    );
    assert.match(resposta.response, /Brisa/iu);
    const privada = await exigir(
      pessoa,
      '/api/functions/ask-ai-assistant',
      'POST',
      mensagem('Você lembra o nome da minha gata?', true)
    );
    assert.doesNotMatch(privada.response, /Aurora|Brisa/iu);
  } finally {
    await exigir(admin, '/api/admin/ia', 'PUT', configuracaoOriginal);
    configuracaoOriginal = null;
  }
  console.log(
    '[memoria:qa] Correção temporal, exportação, troca para o Motor Lyra e modo privado conferidos.'
  );
  controlarMemoria('stop');
  const antesDaFalha = await exigir(pessoa, '/api/memoria');
  assert.equal(antesDaFalha.disponivel, false);
  await exigir(pessoa, '/api/memoria', 'POST', {
    acao: 'relato',
    texto: 'Meu objetivo pessoal é cultivar uma horta.',
  });
  let falhaRegistrada = false;
  for (let tentativa = 0; tentativa < 20; tentativa++) {
    const estado = await exigir(pessoa, '/api/memoria');
    if (Number(estado.erros) > 0) {
      falhaRegistrada = true;
      break;
    }
    await esperar(5000);
  }
  assert(
    falhaRegistrada,
    'A indisponibilidade precisa manter o relato para retentativa.'
  );
  controlarMemoria('start');
  await aguardarRelatos(
    pessoa,
    Number(antesDaFalha.prontos) + Number(antesDaFalha.fila) + 1
  );
  console.log(
    '[memoria:qa] Indisponibilidade real e recuperação automática da fila conferidas.'
  );

  controlarMemoria('stop');
  await exigir(pessoa, '/api/memoria', 'DELETE', undefined, 202);
  const pendente = await exigir(pessoa, '/api/memoria');
  assert.equal(pendente.ativa, false);
  assert.equal(pendente.apagando, true);
  assert.equal(pendente.fatos.length, 0);
  controlarMemoria('start');
  let vazia;
  for (let tentativa = 0; tentativa < 30; tentativa++) {
    vazia = await exigir(pessoa, '/api/memoria');
    if (!vazia.apagando) break;
    await esperar(2000);
  }
  assert.equal(
    vazia.apagando,
    false,
    'A exclusão pendente precisa terminar quando o serviço voltar.'
  );
  assert.equal(vazia.ativa, false);
  assert.equal(
    Number(vazia.prontos) + Number(vazia.fila) + Number(vazia.erros),
    0
  );
  assert.equal(vazia.fatos.length, 0);
  console.log(
    '[memoria:qa] Exclusão pendente, revogação imediata e remoção final do grafo e dos relatos confirmadas.'
  );
} catch (erro) {
  console.error(
    `[memoria:qa] ${erro instanceof Error ? erro.message : 'Falha de verificação.'}`
  );
  process.exitCode = 1;
} finally {
  if (memoriaParada) controlarMemoria('start');
  if (configuracaoOriginal && admin)
    await exigir(admin, '/api/admin/ia', 'PUT', configuracaoOriginal);
  for (const pessoa of contas) {
    let apagada = false;
    for (let tentativa = 0; tentativa < 70; tentativa++) {
      const resposta = await chamar(pessoa, '/api/account', 'DELETE', {
        currentPassword: pessoa.senha,
        confirmation: 'EXCLUIR MINHA CONTA',
      });
      if (resposta.status === 200) {
        apagada = true;
        break;
      }
      await esperar(2000);
    }
    if (!apagada) {
      console.error(
        `[memoria:qa] A conta temporária ${pessoa.id} precisa ter sua exclusão concluída.`
      );
      process.exitCode = 1;
    }
  }
  console.log('[memoria:qa] Limpeza das contas temporárias encerrada.');
}
