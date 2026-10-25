import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import Stripe from 'stripe';
import { getStripeApiVersion } from '@/lib/billing/config';

/**
 * Contrato HTTP local de testes, explicitamente sem transações reais na Stripe.
 * A SDK real faz/verifica requests e a aplicação usa o MySQL isolado real.
 * Nenhum endpoint alternativo é configurável no código de produção.
 */
export async function iniciarContratoStripe(
  chave = 'sk_test_contrato_http_local'
) {
  const faturas = new Map<string, Record<string, unknown>>();
  type Entrada = {
    method: string;
    url: URL;
    body: URLSearchParams;
    idempotencyKey: string | null;
  };
  type Saida = { status: number; body: Record<string, unknown> };
  let handler: ((entrada: Entrada) => Promise<Saida | undefined>) | null = null;
  const requests: Entrada[] = [];
  const server = createServer(async (req, res) => {
    try {
      const partes: Buffer[] = [];
      for await (const chunk of req) partes.push(Buffer.from(chunk));
      const entrada: Entrada = {
        method: req.method ?? 'GET',
        url: new URL(req.url ?? '/', 'http://127.0.0.1'),
        body: new URLSearchParams(Buffer.concat(partes).toString()),
        idempotencyKey:
          typeof req.headers['idempotency-key'] === 'string'
            ? req.headers['idempotency-key']
            : null,
      };
      requests.push(entrada);
      let resposta = await handler?.(entrada);
      if (!resposta) {
        const id = entrada.url.pathname.match(/^\/v1\/invoices\/([^/]+)$/)?.[1];
        const invoice = id ? faturas.get(decodeURIComponent(id)) : undefined;
        if (entrada.method === 'GET' && invoice)
          resposta = { status: 200, body: invoice };
        else if (
          entrada.method === 'GET' &&
          entrada.url.pathname === '/v1/invoice_payments'
        )
          resposta = {
            status: 200,
            body: {
              object: 'list',
              data: [],
              has_more: false,
              url: '/v1/invoice_payments',
            },
          };
        else if (
          entrada.method === 'GET' &&
          entrada.url.pathname === '/v1/account'
        )
          resposta = {
            status: 200,
            body: {
              id: 'acct_contrato_local',
              object: 'account',
              country: 'BR',
              default_currency: 'brl',
            },
          };
        else
          resposta = {
            status: 404,
            body: {
              error: {
                type: 'invalid_request_error',
                code: 'resource_missing',
                message: 'Recurso não encontrado no contrato HTTP local.',
              },
            },
          };
      }
      res.writeHead(resposta.status, {
        'content-type': 'application/json',
        'request-id': 'req_contrato_local',
      });
      res.end(JSON.stringify(resposta.body));
    } catch {
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({
          error: {
            type: 'api_error',
            message: 'Falha no contrato HTTP local.',
          },
        })
      );
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const porta = (server.address() as AddressInfo).port;
  const cliente = new Stripe(chave, {
    apiVersion: getStripeApiVersion(),
    host: '127.0.0.1',
    port: porta,
    protocol: 'http',
    maxNetworkRetries: 0,
  });
  const globalStripe = globalThis as typeof globalThis & {
    __lyraStripeClient?: { chave: string; cliente: Stripe };
  };
  const anterior = globalStripe.__lyraStripeClient;
  globalStripe.__lyraStripeClient = { chave, cliente };
  return {
    faturas,
    requests,
    cliente,
    handle: (fn: NonNullable<typeof handler>) => {
      handler = fn;
    },
    close: async () => {
      globalStripe.__lyraStripeClient = anterior;
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((e) => (e ? reject(e) : resolve()))
      );
    },
  };
}
