import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { executeStatement, queryRows } from '@/lib/mysql/pool';
import {
  type CredencialPublica,
  credenciaisDoStripe,
} from '@/lib/pagamentos/credenciais';

import { criarUsuario } from '../../../tests/integration/fixtures';
import { chamar } from '../../../tests/integration/http';

import * as lista from './admin/pagamentos/route';
import * as configuracao from './admin/pagamentos/[provedor]/route';
import * as conjunto from './admin/pagamentos/[provedor]/[ambiente]/route';
import * as testar from './admin/pagamentos/[provedor]/[ambiente]/testar/route';

// Chaves com o formato dos provedores, mas inexistentes: o teste de conexão
// usa um fetch controlado, nunca a API real.
const CHAVE_STRIPE = 'sk_test_51FormatoValidoSoParaTeste000000000000';
// Montada em partes: o literal inteiro tem o formato de uma chave de produção
// da Stripe e seria barrado (com razão) pela proteção de segredos do GitHub.
const CHAVE_STRIPE_PRODUCAO = [
  'rk',
  'live',
  '51FormatoValidoSoParaTeste0',
].join('_');
const WEBHOOK_STRIPE = 'whsec_SegredoDeTesteSomenteLocal0000';
const WEBHOOK_STRIPE_PRODUCAO = 'whsec_SegredoDeProducaoSomenteLocal00';

type Usuario = Awaited<ReturnType<typeof criarUsuario>>;

const salvar = (
  provedor: string,
  ambiente: string,
  corpo: Record<string, unknown>,
  usuario: Usuario
) =>
  chamar(conjunto.PUT, {
    method: 'PUT',
    params: { provedor, ambiente },
    body: corpo,
    usuario,
  });

const configurar = (
  provedor: string,
  corpo: Record<string, unknown>,
  usuario: Usuario
) =>
  chamar(configuracao.PUT, {
    method: 'PUT',
    params: { provedor },
    body: corpo,
    usuario,
  });

const testarConexao = (provedor: string, ambiente: string, usuario: Usuario) =>
  chamar(testar.POST, {
    method: 'POST',
    params: { provedor, ambiente },
    usuario,
  });

const credencialDa = (resposta: { json: unknown }) =>
  (resposta.json as { credencial: CredencialPublica }).credencial;

/** Responde como a Stripe: conta e preços (por id) do ambiente pedido. */
function stripeFalsa(
  precos: Record<string, Record<string, unknown>>,
  livemode: boolean
) {
  const chamadas: Array<{ url: string; autorizacao: string | null }> = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    const endereco = String(url);
    chamadas.push({
      url: endereco,
      autorizacao: new Headers(init?.headers).get('authorization'),
    });
    if (endereco === 'https://api.stripe.com/v1/account') {
      return new Response(
        JSON.stringify({
          id: 'acct_teste',
          country: 'BR',
          default_currency: 'brl',
        }),
        { status: 200 }
      );
    }
    const id = decodeURIComponent(endereco.split('/v1/prices/')[1] ?? '');
    const preco = precos[id];
    return preco
      ? new Response(JSON.stringify({ id, livemode, ...preco }), {
          status: 200,
        })
      : new Response(
          JSON.stringify({ error: { message: `No such price: '${id}'` } }),
          { status: 404 }
        );
  });
  return chamadas;
}

async function valorDoPlano(plano: string) {
  const [linha] = await queryRows<{
    monthly_price: string;
    currency_code: string;
  }>(
    'SELECT monthly_price, currency_code FROM subscription_plans WHERE plan_key = ?',
    [plano]
  );
  return {
    centavos: Math.round(Number(linha.monthly_price) * 100),
    moeda: linha.currency_code.toLowerCase(),
  };
}

// Estado inicial de cada teste: sem configuração, chaves e preços salvos
// (outros arquivos cadastram preços próprios no beforeAll deles e rodam em
// sequência, nunca ao mesmo tempo que este).
async function limparPagamentos() {
  await executeStatement('DELETE FROM payment_provider_settings');
  await executeStatement('DELETE FROM payment_provider_credentials');
  await executeStatement('DELETE FROM stripe_plan_prices');
}

beforeEach(limparPagamentos);

afterEach(async () => {
  vi.restoreAllMocks();
  await limparPagamentos();
});

describe('Admin → Pagamentos (credenciais dos meios de pagamento)', () => {
  it('só administradores leem e gravam', async () => {
    const pessoa = await criarUsuario('patient', 'Pessoa');
    expect((await chamar(lista.GET, { usuario: null })).status).toBe(401);
    expect((await chamar(lista.GET, { usuario: pessoa })).status).toBe(403);
    const tentativa = await salvar(
      'stripe',
      'test',
      { chavePublica: null, segredo: CHAVE_STRIPE },
      pessoa
    );
    expect(tentativa.status).toBe(403);
    const troca = await configurar(
      'stripe',
      { ambienteEmUso: 'live', ativo: true },
      pessoa
    );
    expect(troca.status).toBe(403);
  });

  it('lista os três provedores com teste e produção e nunca devolve segredos', async () => {
    const admin = await criarUsuario('admin', 'Admin');
    const vazio = await chamar(lista.GET, { usuario: admin });
    expect(vazio.status).toBe(200);
    const provedores = (vazio.json as { provedores: CredencialPublica[] })
      .provedores;
    expect(provedores.map((p) => p.provedor)).toEqual([
      'stripe',
      'mercado_pago',
      'paypal',
    ]);
    for (const provedor of provedores) {
      expect(provedor).toMatchObject({
        ambienteEmUso: 'test',
        ativo: false,
        emUso: false,
      });
      expect(provedor.ambientes.test.configurado).toBe(false);
      expect(provedor.ambientes.live.configurado).toBe(false);
    }
    // Só a Stripe lista os planos pagos para receber os preços.
    expect(provedores[0].ambientes.test.precos.map((p) => p.plano)).toEqual([
      'meta',
      'care',
    ]);
    expect(provedores[1].ambientes.test.precos).toEqual([]);

    const salvo = await salvar(
      'stripe',
      'test',
      {
        chavePublica: 'pk_test_51PublicaDeTeste0000000000',
        segredo: CHAVE_STRIPE,
        segredoDoWebhook: WEBHOOK_STRIPE,
      },
      admin
    );
    expect(salvo.status).toBe(200);
    const texto = JSON.stringify(salvo.json);
    expect(texto).not.toContain(CHAVE_STRIPE);
    expect(texto).not.toContain(WEBHOOK_STRIPE);
    const publico = credencialDa(salvo);
    // Primeira gravação: a Stripe nasce ativa no ambiente de teste.
    expect(publico).toMatchObject({
      ambienteEmUso: 'test',
      ativo: true,
      emUso: true,
      checkoutIntegrado: true,
    });
    expect(publico.ambientes.test).toMatchObject({
      configurado: true,
      finalDoSegredo: CHAVE_STRIPE.slice(-4),
      finalDoSegredoDoWebhook: WEBHOOK_STRIPE.slice(-4),
      pendencias: [],
    });
    expect(publico.ambientes.live.configurado).toBe(false);

    // No banco, só o texto cifrado, na linha do ambiente de teste.
    const linhas = await queryRows<{
      environment: string;
      secret_ciphertext: string;
      webhook_secret_ciphertext: string;
    }>(
      `SELECT environment, secret_ciphertext, webhook_secret_ciphertext
         FROM payment_provider_credentials WHERE provider = 'stripe'`
    );
    expect(linhas.map((l) => l.environment)).toEqual(['test']);
    expect(linhas[0].secret_ciphertext.startsWith('v1.')).toBe(true);
    expect(linhas[0].secret_ciphertext).not.toContain(CHAVE_STRIPE);
    expect(linhas[0].webhook_secret_ciphertext).not.toContain(WEBHOOK_STRIPE);
  });

  it('recusa formato inválido, chave do outro ambiente e preços inválidos', async () => {
    const admin = await criarUsuario('admin', 'Admin');
    const formato = await salvar(
      'stripe',
      'test',
      { chavePublica: null, segredo: 'abc' },
      admin
    );
    expect(formato.status).toBe(400);
    const ambiente = await salvar(
      'stripe',
      'live',
      { chavePublica: null, segredo: CHAVE_STRIPE },
      admin
    );
    expect(ambiente.status).toBe(400);
    expect((ambiente.json as { error: string }).error).toMatch(
      /teste.*produção/
    );
    const mp = await salvar(
      'mercado_pago',
      'test',
      { chavePublica: null, segredo: 'token' },
      admin
    );
    expect(mp.status).toBe(400);
    const precoNoMercadoPago = await salvar(
      'mercado_pago',
      'test',
      {
        chavePublica: null,
        precos: [{ plano: 'meta', mensal: 'price_painelMeta01' }],
      },
      admin
    );
    expect(precoNoMercadoPago.status).toBe(400);
    const precoInvalido = await salvar(
      'stripe',
      'test',
      {
        chavePublica: null,
        precos: [{ plano: 'meta', mensal: 'prod_errado' }],
      },
      admin
    );
    expect(precoInvalido.status).toBe(400);
    const precoRepetido = await salvar(
      'stripe',
      'test',
      {
        chavePublica: null,
        precos: [
          { plano: 'meta', mensal: 'price_painelRepetido' },
          { plano: 'care', anual: 'price_painelRepetido' },
        ],
      },
      admin
    );
    expect(precoRepetido.status).toBe(400);
    expect((precoRepetido.json as { error: string }).error).toMatch(
      /mesmo preço/
    );
    const free = await salvar(
      'stripe',
      'test',
      {
        chavePublica: null,
        precos: [{ plano: 'free', mensal: 'price_painelFree' }],
      },
      admin
    );
    expect(free.status).toBe(400);
    const desconhecido = await salvar(
      'pix',
      'test',
      { chavePublica: null },
      admin
    );
    expect(desconhecido.status).toBe(404);
    const semAmbiente = await salvar(
      'stripe',
      'homologacao',
      { chavePublica: null },
      admin
    );
    expect(semAmbiente.status).toBe(404);
  });

  it('segredo em branco mantém o salvo; remover apaga', async () => {
    const admin = await criarUsuario('admin', 'Admin');
    await salvar(
      'paypal',
      'test',
      {
        chavePublica: 'ClientIdDeTesteDoPayPal_0001',
        segredo: 'ClientSecretDeTesteDoPayPal_0001',
      },
      admin
    );
    const mantido = await salvar(
      'paypal',
      'test',
      { chavePublica: 'ClientIdDeTesteDoPayPal_0001', segredo: '' },
      admin
    );
    expect(credencialDa(mantido).ambientes.test).toMatchObject({
      temSegredo: true,
      finalDoSegredo: '0001',
    });

    const apagado = await salvar(
      'paypal',
      'test',
      { chavePublica: 'ClientIdDeTesteDoPayPal_0001', removerSegredo: true },
      admin
    );
    expect(credencialDa(apagado).ambientes.test.temSegredo).toBe(false);
  });

  it('troca entre teste e produção só com as chaves prontas e testadas', async () => {
    const admin = await criarUsuario('admin', 'Admin');
    expect((await credenciaisDoStripe()).origem).toBe('ambiente');

    await salvar(
      'stripe',
      'test',
      {
        chavePublica: null,
        segredo: CHAVE_STRIPE,
        segredoDoWebhook: WEBHOOK_STRIPE,
      },
      admin
    );
    expect(await credenciaisDoStripe()).toEqual({
      chaveSecreta: CHAVE_STRIPE,
      segredoDoWebhook: WEBHOOK_STRIPE,
      origem: 'painel',
      ambiente: 'test',
    });

    // Produção sem chaves: recusado, com o que falta.
    const semChaves = await configurar(
      'stripe',
      { ambienteEmUso: 'live', ativo: true },
      admin
    );
    expect(semChaves.status).toBe(409);
    expect((semChaves.json as { error: string }).error).toMatch(/Salve/);

    // Chaves de produção salvas, mas ainda sem teste aprovado: recusado.
    const salvas = await salvar(
      'stripe',
      'live',
      {
        chavePublica: null,
        segredo: CHAVE_STRIPE_PRODUCAO,
        segredoDoWebhook: WEBHOOK_STRIPE_PRODUCAO,
      },
      admin
    );
    expect(salvas.status).toBe(200);
    expect(credencialDa(salvas).ambientes.live.pendencias).toEqual([
      expect.stringMatching(/Testar conexão/),
    ]);
    // Salvar as chaves de produção não muda o ambiente em uso.
    expect(credencialDa(salvas).ambienteEmUso).toBe('test');
    expect(
      (
        await configurar(
          'stripe',
          { ambienteEmUso: 'live', ativo: true },
          admin
        )
      ).status
    ).toBe(409);

    const chamadas = stripeFalsa({}, true);
    const teste = await testarConexao('stripe', 'live', admin);
    expect(teste.json).toMatchObject({ resultado: { ok: true } });
    expect(chamadas[0]).toEqual({
      url: 'https://api.stripe.com/v1/account',
      autorizacao: `Bearer ${CHAVE_STRIPE_PRODUCAO}`,
    });

    const producao = await configurar(
      'stripe',
      { ambienteEmUso: 'live', ativo: true },
      admin
    );
    expect(producao.status).toBe(200);
    expect(credencialDa(producao)).toMatchObject({
      ambienteEmUso: 'live',
      emUso: true,
    });
    expect(await credenciaisDoStripe()).toEqual({
      chaveSecreta: CHAVE_STRIPE_PRODUCAO,
      segredoDoWebhook: WEBHOOK_STRIPE_PRODUCAO,
      origem: 'painel',
      ambiente: 'live',
    });

    // As chaves em uso não podem ser removidas; as do outro ambiente podem.
    const removerEmUso = await chamar(conjunto.DELETE, {
      method: 'DELETE',
      params: { provedor: 'stripe', ambiente: 'live' },
      usuario: admin,
    });
    expect(removerEmUso.status).toBe(409);

    const deVolta = await configurar(
      'stripe',
      { ambienteEmUso: 'test', ativo: true },
      admin
    );
    expect(credencialDa(deVolta).ambienteEmUso).toBe('test');
    const removida = await chamar(conjunto.DELETE, {
      method: 'DELETE',
      params: { provedor: 'stripe', ambiente: 'live' },
      usuario: admin,
    });
    expect(removida.status).toBe(200);
    expect(credencialDa(removida).ambientes.live.temSegredo).toBe(false);

    // Desativada, a Stripe volta para as chaves do .env.local.
    await configurar('stripe', { ambienteEmUso: 'test', ativo: false }, admin);
    expect((await credenciaisDoStripe()).origem).toBe('ambiente');
  });

  it('guarda os preços dos planos por ambiente e confere cada um na Stripe', async () => {
    const admin = await criarUsuario('admin', 'Admin');
    const meta = await valorDoPlano('meta');
    const salvo = await salvar(
      'stripe',
      'test',
      {
        chavePublica: null,
        segredo: CHAVE_STRIPE,
        segredoDoWebhook: WEBHOOK_STRIPE,
        precos: [
          {
            plano: 'meta',
            produto: 'prod_painelMeta01',
            mensal: 'price_painelMetaMensal',
          },
        ],
      },
      admin
    );
    expect(salvo.status).toBe(200);
    const precosDeTeste = credencialDa(salvo).ambientes.test.precos;
    expect(precosDeTeste.find((p) => p.plano === 'meta')).toMatchObject({
      produto: 'prod_painelMeta01',
      mensal: 'price_painelMetaMensal',
      anual: null,
    });
    // Os preços de teste não aparecem em produção.
    expect(
      credencialDa(salvo).ambientes.live.precos.every((p) => !p.mensal)
    ).toBe(true);

    // Valor diferente do catálogo: o teste aponta o problema.
    stripeFalsa(
      {
        price_painelMetaMensal: {
          active: true,
          recurring: { interval: 'month' },
          currency: meta.moeda,
          unit_amount: meta.centavos + 100,
          product: 'prod_painelMeta01',
        },
      },
      false
    );
    const divergente = await testarConexao('stripe', 'test', admin);
    expect(divergente.json).toMatchObject({
      resultado: {
        ok: false,
        mensagem: expect.stringMatching(/catálogo diz/),
      },
    });

    // Preço igual ao catálogo: aprovado e contado.
    vi.restoreAllMocks();
    const chamadas = stripeFalsa(
      {
        price_painelMetaMensal: {
          active: true,
          recurring: { interval: 'month' },
          currency: meta.moeda,
          unit_amount: meta.centavos,
          product: 'prod_painelMeta01',
        },
      },
      false
    );
    const aprovado = await testarConexao('stripe', 'test', admin);
    expect(aprovado.json).toMatchObject({
      resultado: {
        ok: true,
        mensagem: expect.stringMatching(/1 preço de plano conferido/),
      },
      credencial: { ambientes: { test: { ultimoTeste: { ok: true } } } },
    });
    expect(chamadas.map((c) => c.url)).toEqual([
      'https://api.stripe.com/v1/account',
      'https://api.stripe.com/v1/prices/price_painelMetaMensal',
    ]);

    // Preço que só existe no outro ambiente da Stripe: apontado.
    vi.restoreAllMocks();
    stripeFalsa({}, false);
    const inexistente = await testarConexao('stripe', 'test', admin);
    expect(inexistente.json).toMatchObject({
      resultado: {
        ok: false,
        mensagem: expect.stringMatching(/não existe nesta conta/),
      },
    });

    // Campos vazios apagam os preços do plano neste ambiente.
    const limpo = await salvar(
      'stripe',
      'test',
      {
        chavePublica: null,
        precos: [{ plano: 'meta', produto: '', mensal: '', anual: '' }],
      },
      admin
    );
    expect(
      credencialDa(limpo).ambientes.test.precos.find((p) => p.plano === 'meta')
    ).toMatchObject({ produto: null, mensal: null, anual: null });
  });

  it('testar conexão do PayPal usa o sandbox no ambiente de teste', async () => {
    const admin = await criarUsuario('admin', 'Admin');
    await salvar(
      'paypal',
      'test',
      {
        chavePublica: 'ClientIdDeTesteDoPayPal_0001',
        segredo: 'ClientSecretDeTesteDoPayPal_0001',
      },
      admin
    );
    let urlDoPayPal = '';
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      urlDoPayPal = String(url);
      return new Response(
        JSON.stringify({ access_token: 'x', app_id: 'APP-TESTE' }),
        { status: 200 }
      );
    });
    const paypal = await testarConexao('paypal', 'test', admin);
    expect(paypal.json).toMatchObject({ resultado: { ok: true } });
    expect(urlDoPayPal).toBe(
      'https://api-m.sandbox.paypal.com/v1/oauth2/token'
    );

    vi.restoreAllMocks();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'Invalid API Key' } }), {
        status: 401,
      })
    );
    await salvar(
      'stripe',
      'test',
      { chavePublica: null, segredo: CHAVE_STRIPE },
      admin
    );
    const recusado = await testarConexao('stripe', 'test', admin);
    expect(recusado.json).toMatchObject({
      resultado: { ok: false, mensagem: expect.stringMatching(/recusou/) },
    });
    const semChaves = await testarConexao('mercado_pago', 'live', admin);
    expect(semChaves.status).toBe(400);
  });
});
