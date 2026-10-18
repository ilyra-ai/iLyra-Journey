import { afterEach, describe, expect, it, vi } from 'vitest';

import { queryRows } from '@/lib/mysql/pool';
import {
  type CredencialPublica,
  credenciaisDoStripe,
} from '@/lib/pagamentos/credenciais';

import { criarUsuario } from '../../../tests/integration/fixtures';
import { chamar } from '../../../tests/integration/http';

import * as lista from './admin/pagamentos/route';
import * as credencial from './admin/pagamentos/[provedor]/route';
import * as testar from './admin/pagamentos/[provedor]/testar/route';

// Chaves com o formato dos provedores, mas inexistentes: o teste de conexão
// usa um fetch controlado, nunca a API real.
const CHAVE_STRIPE = 'sk_test_51FormatoValidoSoParaTeste000000000000';
const WEBHOOK_STRIPE = 'whsec_SegredoDeTesteSomenteLocal0000';

const salvar = (
  provedor: string,
  corpo: Record<string, unknown>,
  usuario: Awaited<ReturnType<typeof criarUsuario>>
) =>
  chamar(credencial.PUT, {
    method: 'PUT',
    params: { provedor },
    body: corpo,
    usuario,
  });

afterEach(async () => {
  vi.restoreAllMocks();
  const admin = await criarUsuario('admin', 'Limpeza');
  for (const provedor of ['stripe', 'mercado_pago', 'paypal']) {
    await chamar(credencial.DELETE, {
      method: 'DELETE',
      params: { provedor },
      usuario: admin,
    });
  }
});

describe('Admin → Pagamentos (credenciais dos meios de pagamento)', () => {
  it('só administradores leem e gravam', async () => {
    const pessoa = await criarUsuario('patient', 'Pessoa');
    expect((await chamar(lista.GET, { usuario: null })).status).toBe(401);
    expect((await chamar(lista.GET, { usuario: pessoa })).status).toBe(403);
    const tentativa = await salvar(
      'stripe',
      {
        ambiente: 'test',
        ativo: true,
        chavePublica: null,
        segredo: CHAVE_STRIPE,
      },
      pessoa
    );
    expect(tentativa.status).toBe(403);
  });

  it('lista os três provedores e nunca devolve segredos', async () => {
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
    expect(provedores.every((p) => !p.configurado)).toBe(true);

    const salvo = await salvar(
      'stripe',
      {
        ambiente: 'test',
        ativo: true,
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
    const publico = (salvo.json as { credencial: CredencialPublica })
      .credencial;
    expect(publico).toMatchObject({
      configurado: true,
      finalDoSegredo: CHAVE_STRIPE.slice(-4),
      finalDoSegredoDoWebhook: WEBHOOK_STRIPE.slice(-4),
      checkoutIntegrado: true,
    });

    // No banco, só o texto cifrado.
    const [linha] = await queryRows<{
      secret_ciphertext: string;
      webhook_secret_ciphertext: string;
    }>(
      `SELECT secret_ciphertext, webhook_secret_ciphertext
         FROM payment_provider_credentials WHERE provider = 'stripe'`
    );
    expect(linha.secret_ciphertext.startsWith('v1.')).toBe(true);
    expect(linha.secret_ciphertext).not.toContain(CHAVE_STRIPE);
    expect(linha.webhook_secret_ciphertext).not.toContain(WEBHOOK_STRIPE);
  });

  it('recusa formato inválido e chave de outro ambiente', async () => {
    const admin = await criarUsuario('admin', 'Admin');
    const formato = await salvar(
      'stripe',
      { ambiente: 'test', ativo: true, chavePublica: null, segredo: 'abc' },
      admin
    );
    expect(formato.status).toBe(400);
    const ambiente = await salvar(
      'stripe',
      {
        ambiente: 'live',
        ativo: true,
        chavePublica: null,
        segredo: CHAVE_STRIPE,
      },
      admin
    );
    expect(ambiente.status).toBe(400);
    expect((ambiente.json as { error: string }).error).toMatch(/teste/);
    const mp = await salvar(
      'mercado_pago',
      { ambiente: 'test', ativo: true, chavePublica: null, segredo: 'token' },
      admin
    );
    expect(mp.status).toBe(400);
    const desconhecido = await salvar(
      'pix',
      { ambiente: 'test', ativo: true, chavePublica: null },
      admin
    );
    expect(desconhecido.status).toBe(404);
  });

  it('segredo em branco mantém o salvo; remover apaga', async () => {
    const admin = await criarUsuario('admin', 'Admin');
    await salvar(
      'paypal',
      {
        ambiente: 'test',
        ativo: true,
        chavePublica: 'ClientIdDeTesteDoPayPal_0001',
        segredo: 'ClientSecretDeTesteDoPayPal_0001',
      },
      admin
    );
    const mantido = await salvar(
      'paypal',
      {
        ambiente: 'test',
        ativo: false,
        chavePublica: 'ClientIdDeTesteDoPayPal_0001',
        segredo: '',
      },
      admin
    );
    expect(
      (mantido.json as { credencial: CredencialPublica }).credencial
    ).toMatchObject({ temSegredo: true, finalDoSegredo: '0001', ativo: false });

    const apagado = await salvar(
      'paypal',
      {
        ambiente: 'test',
        ativo: false,
        chavePublica: 'ClientIdDeTesteDoPayPal_0001',
        removerSegredo: true,
      },
      admin
    );
    expect(
      (apagado.json as { credencial: CredencialPublica }).credencial.temSegredo
    ).toBe(false);
  });

  it('a Stripe usa as chaves do painel ativas e, sem elas, as do ambiente', async () => {
    const admin = await criarUsuario('admin', 'Admin');
    const ambiente = await credenciaisDoStripe();
    expect(ambiente.origem).toBe('ambiente');

    await salvar(
      'stripe',
      {
        ambiente: 'test',
        ativo: true,
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
    });

    await salvar(
      'stripe',
      { ambiente: 'test', ativo: false, chavePublica: null },
      admin
    );
    expect((await credenciaisDoStripe()).origem).toBe('ambiente');
  });

  it('testar conexão chama a API do provedor e grava o resultado', async () => {
    const admin = await criarUsuario('admin', 'Admin');
    await salvar(
      'stripe',
      {
        ambiente: 'test',
        ativo: true,
        chavePublica: null,
        segredo: CHAVE_STRIPE,
      },
      admin
    );
    const chamadas: Array<{ url: string; autorizacao: string | null }> = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      chamadas.push({
        url: String(url),
        autorizacao: new Headers(init?.headers).get('authorization'),
      });
      return new Response(
        JSON.stringify({
          id: 'acct_teste',
          country: 'BR',
          default_currency: 'brl',
        }),
        { status: 200 }
      );
    });
    const ok = await chamar(testar.POST, {
      method: 'POST',
      params: { provedor: 'stripe' },
      usuario: admin,
    });
    expect(ok.status).toBe(200);
    expect(ok.json).toMatchObject({
      resultado: { ok: true },
      credencial: { ultimoTeste: { ok: true } },
    });
    expect(chamadas[0]).toEqual({
      url: 'https://api.stripe.com/v1/account',
      autorizacao: `Bearer ${CHAVE_STRIPE}`,
    });

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'Invalid API Key' } }), {
        status: 401,
      })
    );
    const recusado = await chamar(testar.POST, {
      method: 'POST',
      params: { provedor: 'stripe' },
      usuario: admin,
    });
    expect(recusado.json).toMatchObject({
      resultado: { ok: false, mensagem: expect.stringMatching(/recusou/) },
    });

    // PayPal em sandbox: OAuth com Client ID e secret no endereço de testes.
    await salvar(
      'paypal',
      {
        ambiente: 'test',
        ativo: true,
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
    const paypal = await chamar(testar.POST, {
      method: 'POST',
      params: { provedor: 'paypal' },
      usuario: admin,
    });
    expect(paypal.json).toMatchObject({ resultado: { ok: true } });
    expect(urlDoPayPal).toBe(
      'https://api-m.sandbox.paypal.com/v1/oauth2/token'
    );
  });
});
