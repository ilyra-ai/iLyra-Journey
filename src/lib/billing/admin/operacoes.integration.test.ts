import { randomUUID } from 'node:crypto';
import type Stripe from 'stripe';
import { beforeAll, beforeEach, afterAll, afterEach, expect, it } from 'vitest';
import { iniciarContratoStripe } from '../../../../tests/support/contrato-http-stripe';
import {
  criarUsuario,
  type UsuarioDeTeste,
} from '../../../../tests/integration/fixtures';
import { executeStatement, queryRows } from '@/lib/mysql/pool';
import { persistirFatura, persistirReembolso } from './espelhos';
import { executarOperacao, type OperacaoFinanceira } from './operacoes';
import { sincronizarPagina } from './sincronizacao';

// A SDK real conversa por HTTP com um contrato local de testes. O MySQL é real
// e isolado. Isto não comprova cobrança ou reembolso no ambiente oficial Stripe.
let transporte: Awaited<ReturnType<typeof iniciarContratoStripe>>,
  admin: UsuarioDeTeste;
const key = 'sk_test_contrato_http_local',
  original = process.env.STRIPE_SECRET_KEY;
const locais: string[] = [],
  syncIds: string[] = [];
let data: Record<string, unknown>,
  pagamento: Record<string, unknown>,
  refunds: Record<string, unknown>[],
  balances: Record<string, unknown>[];
let falhaRefund = false,
  falhaDelete = false,
  compartilhado = false,
  conta = 'acct_contrato_local',
  atraso = 0;
const suffix = () => randomUUID().replaceAll('-', '');
const req = (
  action: OperacaoFinanceira['action'],
  extra: Partial<OperacaoFinanceira> = {}
): OperacaoFinanceira => ({
  requestId: randomUUID(),
  action,
  confirmation: String(data.id),
  reason: 'requested_by_customer',
  ...extra,
});
async function caso(status = 'paid', environment: 'test' | 'live' = 'test') {
  const id = 'in_contrato_' + suffix(),
    pi = 'pi_contrato_' + suffix(),
    charge = 'ch_contrato_' + suffix();
  pagamento = {
    id: 'inpay_contrato_' + suffix(),
    object: 'invoice_payment',
    invoice: id,
    livemode: false,
    currency: 'brl',
    created: 1706745600,
    status: 'paid',
    amount_paid: 10000,
    amount_requested: 10000,
    is_default: true,
    payment: { type: 'payment_intent', payment_intent: pi },
    status_transitions: { paid_at: 1706745600, canceled_at: null },
  };
  data = {
    id,
    object: 'invoice',
    livemode: false,
    status,
    collection_method: 'send_invoice',
    currency: 'brl',
    subtotal: 10000,
    total: 10000,
    amount_paid: status === 'paid' ? 10000 : 0,
    amount_due: 10000,
    amount_remaining: status === 'paid' ? 0 : 10000,
    created: 1706659200,
    status_transitions: {
      paid_at: status === 'paid' ? 1706745600 : null,
      voided_at: null,
    },
    parent: {
      type: 'subscription_details',
      subscription_details: { subscription: 'sub_contrato', metadata: {} },
    },
    payments: {
      object: 'list',
      data: status === 'paid' ? [pagamento] : [],
      has_more: false,
      url: '/v1/invoice_payments',
    },
    _pi: pi,
    _charge: charge,
  };
  transporte.faturas.set(id, data);
  const local = await persistirFatura(data as unknown as Stripe.Invoice, {
    ambiente: environment,
    instante: 0,
    canonica: true,
  });
  locais.push(local.id);
  return local.id;
}
beforeAll(async () => {
  process.env.STRIPE_SECRET_KEY = key;
  transporte = await iniciarContratoStripe(key);
  admin = await criarUsuario('admin');
  transporte.handle(async (r) => {
    const path = r.url.pathname;
    if (path === '/v1/account')
      return {
        status: 200,
        body: {
          id: conta,
          object: 'account',
          country: 'BR',
          default_currency: 'brl',
        },
      };
    if (atraso && r.method !== 'GET')
      await new Promise((resolve) => setTimeout(resolve, atraso));
    if (path === '/v1/invoices' && r.method === 'GET')
      return {
        status: 200,
        body: {
          object: 'list',
          data: [...transporte.faturas.values()],
          has_more: false,
          url: path,
        },
      };
    if (path === '/v1/invoice_payments' && r.method === 'GET')
      return {
        status: 200,
        body: {
          object: 'list',
          data: compartilhado
            ? [
                pagamento,
                { ...pagamento, id: 'inpay_outro', invoice: 'in_outra_fatura' },
              ]
            : [pagamento],
          has_more: false,
          url: path,
        },
      };
    if (path === '/v1/payment_intents/' + data?._pi)
      return {
        status: 200,
        body: {
          id: data._pi,
          object: 'payment_intent',
          latest_charge: data._charge,
          status: 'succeeded',
          currency: 'brl',
          amount_received: 10000,
        },
      };
    if (path === '/v1/charges/' + data?._charge)
      return {
        status: 200,
        body: {
          id: data._charge,
          object: 'charge',
          paid: true,
          captured: true,
          currency: 'brl',
          amount: 10000,
          amount_refunded: refunds
            .filter((f) => !['failed', 'canceled'].includes(String(f.status)))
            .reduce((n, f) => n + Number(f.amount), 0),
        },
      };
    if (path === '/v1/refunds' && r.method === 'GET')
      return {
        status: 200,
        body: { object: 'list', data: refunds, has_more: false, url: path },
      };
    if (path === '/v1/refunds' && r.method === 'POST') {
      const op = r.body.get('metadata[lyra_finance_operation]');
      let refund = refunds.find(
        (f) =>
          (f.metadata as Record<string, string>).lyra_finance_operation === op
      );
      if (!refund) {
        refund = {
          id: 're_contrato_' + suffix(),
          object: 'refund',
          amount: Number(r.body.get('amount')),
          currency: 'brl',
          status: 'succeeded',
          created: 1706745600,
          charge: data._charge,
          payment_intent: data._pi,
          metadata: { lyra_finance_operation: op, lyra_invoice_id: data.id },
        };
        refunds.push(refund);
      }
      if (falhaRefund)
        return {
          status: 500,
          body: {
            error: {
              type: 'api_error',
              message:
                'Resultado ambíguo controlado após persistir refund no contrato.',
            },
          },
        };
      return { status: 200, body: refund };
    }
    const rid = path.match(/^\/v1\/refunds\/(re_[a-zA-Z0-9_]+)(\/cancel)?$/);
    if (rid) {
      const refund = refunds.find((f) => f.id === rid[1]);
      if (refund) {
        if (r.method === 'POST' && rid[2]) refund.status = 'canceled';
        return { status: 200, body: refund };
      }
    }
    if (path === '/v1/balance_transactions')
      return {
        status: 200,
        body: { object: 'list', data: balances, has_more: false, url: path },
      };
    if (path === '/v1/subscriptions/sub_contrato') {
      const cancel = r.body.get('cancel_at_period_end') === 'true';
      return {
        status: 200,
        body: {
          id: 'sub_contrato',
          object: 'subscription',
          livemode: false,
          status: 'active',
          cancel_at_period_end: cancel,
        },
      };
    }
    const invoice = path.match(
      /^\/v1\/invoices\/([^/]+)(?:\/(void|finalize|mark_uncollectible|send))?$/
    );
    if (invoice && r.method === 'DELETE') {
      transporte.faturas.delete(invoice[1]);
      if (falhaDelete)
        return {
          status: 500,
          body: {
            error: {
              type: 'api_error',
              message: 'Resultado ambíguo controlado após excluir rascunho.',
            },
          },
        };
      return {
        status: 200,
        body: { id: invoice[1], object: 'invoice', deleted: true },
      };
    }
    if (invoice && r.method === 'POST' && invoice[2]) {
      data.status = (
        {
          void: 'void',
          finalize: 'open',
          mark_uncollectible: 'uncollectible',
          send: 'open',
        } as Record<string, string>
      )[invoice[2]];
      return { status: 200, body: data };
    }
    return undefined;
  });
});
beforeEach(() => {
  refunds = [];
  balances = [];
  falhaRefund = falhaDelete = compartilhado = false;
  conta = 'acct_contrato_local';
  atraso = 0;
  transporte.requests.length = 0;
  transporte.faturas.clear();
});
afterEach(async () => {
  for (const id of locais) {
    await executeStatement(
      'DELETE FROM billing_admin_operations WHERE invoice_record_id=?',
      [id]
    );
    await executeStatement(
      'DELETE FROM billing_refund_records WHERE invoice_record_id=?',
      [id]
    );
    await executeStatement(
      'DELETE FROM billing_invoice_payments WHERE invoice_record_id=?',
      [id]
    );
    await executeStatement('DELETE FROM billing_invoice_records WHERE id=?', [
      id,
    ]);
  }
  for (const id of syncIds)
    await executeStatement('DELETE FROM billing_admin_sync_runs WHERE id=?', [
      id,
    ]);
  for (const b of balances)
    await executeStatement(
      'DELETE FROM billing_balance_records WHERE external_transaction_id=?',
      [b.id]
    );
  locais.length = syncIds.length = 0;
});
afterAll(async () => {
  await transporte?.close();
  if (original === undefined) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY = original;
  await executeStatement('DELETE FROM users WHERE id=?', [admin.id]);
});
it('reembolso usa API real da SDK, valor exato, metadata e chave de idempotência; repetir retorna mesmo resultado', async () => {
  const id = await caso(),
    p = req('refund', { amount: 1000, paymentId: String(pagamento.id) });
  const a = await executarOperacao(id, admin.id, p);
  const b = await executarOperacao(id, admin.id, p);
  expect(b).toEqual(a);
  expect(refunds).toHaveLength(1);
  expect(
    transporte.requests.filter(
      (r) => r.method === 'POST' && r.url.pathname === '/v1/refunds'
    )
  ).toHaveLength(1);
  const post = transporte.requests.find(
    (r) => r.method === 'POST' && r.url.pathname === '/v1/refunds'
  )!;
  expect(post.idempotencyKey).toBe('lyra-finance-' + p.requestId);
  expect(post.body.get('amount')).toBe('1000');
  const [local] = await queryRows<{ status: string }>(
    'SELECT status FROM billing_invoice_records WHERE id=?',
    [id]
  );
  expect(local.status).toBe('paid');
});
it('recupera resultado ambíguo pelo metadado do pedido sem criar outro reembolso', async () => {
  const id = await caso(),
    p = req('refund', { amount: 1000, paymentId: String(pagamento.id) });
  falhaRefund = true;
  await expect(executarOperacao(id, admin.id, p)).rejects.toMatchObject({
    statusCode: 503,
  });
  expect(refunds).toHaveLength(1);
  const chamadas = transporte.requests.filter(
    (r) => r.method === 'POST' && r.url.pathname === '/v1/refunds'
  ).length;
  falhaRefund = false;
  const result = await executarOperacao(id, admin.id, p);
  expect(result.providerObjectId).toBe(refunds[0].id);
  expect(refunds).toHaveLength(1);
  expect(
    transporte.requests.filter(
      (r) => r.method === 'POST' && r.url.pathname === '/v1/refunds'
    )
  ).toHaveLength(chamadas);
  expect(
    (
      await queryRows<{ status: string }>(
        'SELECT status FROM billing_admin_operations WHERE request_id=?',
        [p.requestId]
      )
    )[0].status
  ).toBe('succeeded');
});
it('reserva bloqueia concorrência e reaproveitamento de nonce com outro valor', async () => {
  const id = await caso(),
    p = req('refund', { amount: 1000, paymentId: String(pagamento.id) });
  atraso = 60;
  const result = await Promise.allSettled([
    executarOperacao(id, admin.id, p),
    executarOperacao(
      id,
      admin.id,
      req('refund', { amount: 1000, paymentId: String(pagamento.id) })
    ),
  ]);
  expect(result.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  expect(refunds).toHaveLength(1);
  const sucesso = result.find((r) => r.status === 'fulfilled');
  if (sucesso?.status === 'fulfilled') {
    const originalPedido = await queryRows<{ parameters: OperacaoFinanceira }>(
      'SELECT parameters FROM billing_admin_operations WHERE request_id=?',
      [sucesso.value.requestId]
    );
    await expect(
      executarOperacao(id, admin.id, {
        ...originalPedido[0].parameters,
        amount: 2000,
      })
    ).rejects.toMatchObject({ statusCode: 409 });
  }
});
it.each(['draft', 'void'])(
  'recusa reembolso de fatura %s antes de mutar no provedor',
  async (status) => {
    const id = await caso(status);
    await expect(
      executarOperacao(
        id,
        admin.id,
        req('refund', { amount: 1000, paymentId: String(pagamento.id) })
      )
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(refunds).toHaveLength(0);
  }
);
it('recusa valor acima do saldo, pagamento de outra fatura e pagamento compartilhado', async () => {
  const id = await caso();
  await expect(
    executarOperacao(
      id,
      admin.id,
      req('refund', { amount: 10001, paymentId: String(pagamento.id) })
    )
  ).rejects.toMatchObject({ statusCode: 409 });
  await expect(
    executarOperacao(
      id,
      admin.id,
      req('refund', { amount: 1000, paymentId: 'inpay_outra' })
    )
  ).rejects.toMatchObject({ statusCode: 409 });
  compartilhado = true;
  await expect(
    executarOperacao(
      id,
      admin.id,
      req('refund', { amount: 1000, paymentId: String(pagamento.id) })
    )
  ).rejects.toMatchObject({ statusCode: 409 });
  expect(refunds).toHaveLength(0);
});
it('cancelamento anula fatura aberta; valores e histórico permanecem', async () => {
  const id = await caso('open');
  const result = await executarOperacao(id, admin.id, req('void'));
  expect(result.providerStatus).toBe('void');
  expect(
    (
      await queryRows<{ status: string; amount_total: number }>(
        'SELECT status,amount_total FROM billing_invoice_records WHERE id=?',
        [id]
      )
    )[0]
  ).toEqual({ status: 'void', amount_total: 10000 });
});
it('retoma exclusão de rascunho após 404 na mesma conta, preservando a linha local', async () => {
  const id = await caso('draft'),
    p = req('delete_draft');
  falhaDelete = true;
  await expect(executarOperacao(id, admin.id, p)).rejects.toMatchObject({
    statusCode: 503,
  });
  const chamadas = transporte.requests.filter(
    (r) => r.method === 'DELETE'
  ).length;
  falhaDelete = false;
  expect((await executarOperacao(id, admin.id, p)).providerStatus).toBe(
    'deleted'
  );
  expect(transporte.requests.filter((r) => r.method === 'DELETE')).toHaveLength(
    chamadas
  );
  expect(
    (
      await queryRows<{ status: string }>(
        'SELECT status FROM billing_invoice_records WHERE id=?',
        [id]
      )
    )[0].status
  ).toBe('deleted');
});
it('não retoma operação em outra conta da Stripe', async () => {
  const id = await caso(),
    p = req('refund', { amount: 1000, paymentId: String(pagamento.id) });
  falhaRefund = true;
  await expect(executarOperacao(id, admin.id, p)).rejects.toBeDefined();
  falhaRefund = false;
  conta = 'acct_outra';
  await expect(executarOperacao(id, admin.id, p)).rejects.toMatchObject({
    statusCode: 409,
  });
  expect(refunds).toHaveLength(1);
});
it('finalização não liga cobrança automática; inadimplência e envio têm ações próprias', async () => {
  const id = await caso('draft');
  expect(
    (await executarOperacao(id, admin.id, req('finalize'))).providerStatus
  ).toBe('open');
  expect(
    transporte.requests
      .find((r) => r.url.pathname.endsWith('/finalize'))
      ?.body.get('auto_advance')
  ).toBe('false');
  expect(
    (await executarOperacao(id, admin.id, req('send'))).providerStatus
  ).toBe('open');
  expect(
    (await executarOperacao(id, admin.id, req('uncollectible'))).providerStatus
  ).toBe('uncollectible');
});
it('cancelamento da renovação preserva status real ativo e registra efeito separado', async () => {
  const id = await caso();
  const r = await executarOperacao(
    id,
    admin.id,
    req('cancel_subscription_at_period_end')
  );
  expect(r).toMatchObject({
    providerStatus: 'active',
    cancelAtPeriodEnd: true,
  });
  expect(
    (await executarOperacao(id, admin.id, req('resume_subscription')))
      .cancelAtPeriodEnd
  ).toBe(false);
});
it('cancelamento de refund só aceita requires_action', async () => {
  const id = await caso();
  const r = {
    id: 're_contrato_' + suffix(),
    object: 'refund',
    amount: 1000,
    currency: 'brl',
    created: 1706745600,
    payment_intent: data._pi,
    charge: data._charge,
    status: 'requires_action',
    metadata: {},
  };
  refunds.push(r);
  await persistirReembolso(
    r as unknown as Stripe.Refund,
    { ambiente: 'test', instante: 0, canonica: true },
    id
  );
  expect(
    (
      await executarOperacao(
        id,
        admin.id,
        req('cancel_refund', { refundId: String(r.id) })
      )
    ).providerStatus
  ).toBe('canceled');
});
it('ambiente diferente e confirmação incorreta são recusados sem mutação externa', async () => {
  const id = await caso('paid', 'live');
  await expect(
    executarOperacao(id, admin.id, req('void'))
  ).rejects.toMatchObject({ statusCode: 409 });
  await expect(
    executarOperacao(
      id,
      admin.id,
      req('void', { confirmation: 'in_incorreta' })
    )
  ).rejects.toMatchObject({ statusCode: 400 });
  expect(transporte.requests.filter((r) => r.method !== 'GET')).toHaveLength(0);
});
it('sincroniza faturas, pagamentos, refunds e bruto/taxas/líquido com corte temporal e retomada por fase', async () => {
  const id = await caso();
  const r = {
    id: 're_sync_' + suffix(),
    object: 'refund',
    amount: 1000,
    currency: 'brl',
    created: 1706745600,
    payment_intent: data._pi,
    charge: data._charge,
    status: 'succeeded',
    metadata: {},
  };
  refunds.push(r);
  balances.push({
    id: 'txn_sync_' + suffix(),
    object: 'balance_transaction',
    amount: 10000,
    fee: 300,
    net: 9700,
    currency: 'brl',
    type: 'charge',
    reporting_category: 'charge',
    status: 'available',
    created: 1706745600,
    available_on: 1706745600,
    source: data._charge,
  });
  let run = await sincronizarPagina({ ambiente: 'test' }, admin.id);
  syncIds.push(run.id);
  expect(run.stage).toBe('payments');
  run = await sincronizarPagina({ ambiente: 'test', runId: run.id }, admin.id);
  expect(run.stage).toBe('refunds');
  run = await sincronizarPagina({ ambiente: 'test', runId: run.id }, admin.id);
  expect(run.stage).toBe('balances');
  run = await sincronizarPagina({ ambiente: 'test', runId: run.id }, admin.id);
  expect(run).toMatchObject({
    stage: 'completed',
    imported_invoices: 1,
    imported_payments: 1,
    imported_refunds: 1,
    imported_balances: 1,
  });
  expect(run.completed_at).toBeTruthy();
  for (const path of [
    '/v1/invoices',
    '/v1/invoice_payments',
    '/v1/refunds',
    '/v1/balance_transactions',
  ])
    expect(
      transporte.requests
        .find((r) => r.url.pathname === path)
        ?.url.searchParams.has('created[lt]')
    ).toBe(true);
  expect(
    (
      await queryRows<{ net: number }>(
        'SELECT net FROM billing_balance_records WHERE external_transaction_id=?',
        [balances[0].id]
      )
    )[0].net
  ).toBe(9700);
  expect(
    (
      await queryRows<{ invoice_record_id: string }>(
        'SELECT invoice_record_id FROM billing_refund_records WHERE external_refund_id=?',
        [r.id]
      )
    )[0].invoice_record_id
  ).toBe(id);
});
