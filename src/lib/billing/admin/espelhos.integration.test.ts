import { randomUUID } from 'node:crypto';
import type Stripe from 'stripe';
import { beforeAll, afterAll, afterEach, expect, it } from 'vitest';
import {
  criarUsuario,
  type UsuarioDeTeste,
} from '../../../../tests/integration/fixtures';
import { chamar } from '../../../../tests/integration/http';
import { executeStatement, queryRows } from '@/lib/mysql/pool';
import {
  persistirFatura,
  persistirReembolso,
  persistirVinculo,
  persistirMovimentoSaldo,
  type OrigemFinanceira,
} from './espelhos';
import { exportarFinanceiroDoTitular } from './exportacao';
import { excluirConta } from '@/lib/lgpd/conta';
import { GET as detalhe } from '@/app/api/admin/faturamento/[invoiceId]/route';
import { carregarFaturamento } from './consultas';
import { carregarSaldo } from './saldos';
import { lerFiltrosFaturamento } from './filtros';
import { GET } from '@/app/api/admin/faturamento/route';
import { POST as agir } from '@/app/api/admin/faturamento/[invoiceId]/acoes/route';

const invoiceIds: string[] = [],
  refundIds: string[] = [],
  saldoIds: string[] = [],
  fiscalIds: string[] = [];
let admin: UsuarioDeTeste, pessoa: UsuarioDeTeste;
const origem = {
  ambiente: 'test' as const,
  instante: 1706745600,
  eventoId: 'evt_' + randomUUID(),
};
const filtros = (q = '') =>
  lerFiltrosFaturamento(
    new URLSearchParams('inicio=2024-01-01&fim=2024-02-29&ambiente=test&' + q)
  );
function invoice(
  amount = 10000,
  extras: Record<string, unknown> = {}
): Stripe.Invoice {
  return {
    id: 'in_contrato_' + randomUUID().replaceAll('-', ''),
    object: 'invoice',
    livemode: false,
    status: 'paid',
    collection_method: 'charge_automatically',
    currency: 'brl',
    subtotal: amount,
    total: amount,
    amount_paid: amount,
    amount_due: amount,
    amount_remaining: 0,
    created: 1706659200,
    status_transitions: { paid_at: 1706745600, voided_at: null },
    parent: null,
    payments: {
      object: 'list',
      data: [],
      has_more: false,
      url: '/v1/invoice_payments',
    },
    ...extras,
  } as unknown as Stripe.Invoice;
}
async function salvar(i: Stripe.Invoice, o: OrigemFinanceira = origem) {
  const r = await persistirFatura(i, o);
  invoiceIds.push(r.id);
  return r.id;
}
function refund(
  pi: string,
  extras: Record<string, unknown> = {}
): Stripe.Refund {
  return {
    id: 're_contrato_' + randomUUID().replaceAll('-', ''),
    object: 'refund',
    currency: 'brl',
    amount: 1000,
    status: 'succeeded',
    created: 1706745600,
    payment_intent: pi,
    charge: 'ch_contrato',
    metadata: {},
    ...extras,
  } as unknown as Stripe.Refund;
}
function payment(i: Stripe.Invoice, pi: string): Stripe.InvoicePayment {
  return {
    id: 'inpay_contrato_' + randomUUID().replaceAll('-', ''),
    object: 'invoice_payment',
    currency: 'brl',
    livemode: false,
    status: 'paid',
    amount_paid: 10000,
    amount_requested: 10000,
    created: 1706745600,
    invoice: i.id,
    is_default: true,
    payment: { type: 'payment_intent', payment_intent: pi },
    status_transitions: { paid_at: 1706745600, canceled_at: null },
  };
}
beforeAll(async () => {
  admin = await criarUsuario('admin');
  pessoa = await criarUsuario();
});
afterEach(async () => {
  for (const id of invoiceIds) {
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
  }
  for (const id of refundIds)
    await executeStatement('DELETE FROM billing_refund_records WHERE id=?', [
      id,
    ]);
  for (const id of invoiceIds)
    await executeStatement('DELETE FROM billing_invoice_records WHERE id=?', [
      id,
    ]);
  for (const id of saldoIds)
    await executeStatement(
      'DELETE FROM billing_balance_records WHERE external_transaction_id=?',
      [id]
    );
  for (const id of fiscalIds)
    await executeStatement('DELETE FROM fiscal_records WHERE id=?', [id]);
  invoiceIds.length = refundIds.length = saldoIds.length = fiscalIds.length = 0;
});
afterAll(async () => {
  await executeStatement('DELETE FROM users WHERE id IN (?,?)', [
    admin.id,
    pessoa.id,
  ]);
});
it('deduplica fotografia e não retrocede com evento antigo', async () => {
  const i = invoice();
  const id = await salvar(i);
  await persistirFatura(i, origem);
  await persistirFatura(
    { ...i, status: 'open' },
    { ...origem, instante: origem.instante - 1, eventoId: 'evt_anterior' }
  );
  const [r] = await queryRows<{ status: string; n: number }>(
    'SELECT status,COUNT(*) OVER() n FROM billing_invoice_records WHERE id=?',
    [id]
  );
  expect(r).toEqual({ status: 'paid', n: 1 });
});
it('conflito no mesmo segundo exige reconciliação sem classificar ID como relógio', async () => {
  const i = invoice(),
    id = await salvar(i);
  const r = await persistirFatura(
    { ...i, status: 'open' },
    { ...origem, eventoId: 'evt_outro' }
  );
  expect(r.reconciliar).toBe(true);
  const [b] = await queryRows<{ status: string; needs_reconciliation: number }>(
    'SELECT status,needs_reconciliation FROM billing_invoice_records WHERE id=?',
    [id]
  );
  expect(b).toEqual({ status: 'paid', needs_reconciliation: 1 });
});
it('não preenche valor pago ausente com total nominal', async () => {
  const i = invoice(10000, { amount_paid: undefined });
  await salvar(i);
  const d = await carregarFaturamento(filtros());
  expect(d.resumos[0]).toMatchObject({
    valorNominal: '10000',
    valorQuitado: null,
    semValorPago: 1,
  });
});
it('separa moedas e ambientes; distingue coorte de criação do fluxo por paid_at', async () => {
  await salvar(invoice(10000));
  await salvar(invoice(20000, { currency: 'usd' }));
  await salvar(invoice(90000, { livemode: true }), {
    ...origem,
    ambiente: 'live',
  });
  const d = await carregarFaturamento(filtros());
  expect(d.resumos).toHaveLength(2);
  expect(d.resumos.map((r) => r.valorNominal).sort()).toEqual([
    '10000',
    '20000',
  ]);
  const fevereiro = await carregarFaturamento(
    filtros('inicio=2024-02-01&fim=2024-02-29')
  );
  expect(fevereiro.faturas.total).toBe(0);
  expect(fevereiro.serie.reduce((s, r) => s + Number(r.quitado ?? 0), 0)).toBe(
    30000
  );
});
it('datas UTC inclusivas e agrupamentos diário/mensal/anual usam os mesmos registros', async () => {
  await salvar(
    invoice(10000, { created: Date.parse('2024-01-31T23:59:59Z') / 1000 })
  );
  await salvar(
    invoice(20000, { created: Date.parse('2024-02-01T00:00:00Z') / 1000 })
  );
  const janeiro = await carregarFaturamento(
    filtros('inicio=2024-01-31&fim=2024-01-31&agrupamento=dia')
  );
  expect(janeiro.faturas.total).toBe(1);
  expect(janeiro.resumos[0].valorNominal).toBe('10000');
  const mensal = await carregarFaturamento(filtros('agrupamento=mes'));
  expect(mensal.serie.map((r) => r.data)).toEqual(['2024-01-01', '2024-02-01']);
  const anual = await carregarFaturamento(filtros('agrupamento=ano'));
  expect(anual.serie).toHaveLength(1);
  expect(anual.serie[0].nominal).toBe('30000');
});
it('reembolso que chega antes do vínculo é conciliado, e compartilhamento posterior desfaz inferência', async () => {
  const pi = 'pi_' + randomUUID(),
    r = await persistirReembolso(refund(pi), origem);
  refundIds.push(r.id);
  const a = invoice(),
    idA = await salvar(a);
  await persistirVinculo(idA, payment(a, pi));
  expect(
    (
      await queryRows<{ invoice_record_id: string | null }>(
        'SELECT invoice_record_id FROM billing_refund_records WHERE id=?',
        [r.id]
      )
    )[0].invoice_record_id
  ).toBe(idA);
  const b = invoice(),
    idB = await salvar(b);
  await persistirVinculo(idB, payment(b, pi));
  expect(
    (
      await queryRows<{ invoice_record_id: string | null }>(
        'SELECT invoice_record_id FROM billing_refund_records WHERE id=?',
        [r.id]
      )
    )[0].invoice_record_id
  ).toBeNull();
});
it('registra pending, failed e succeeded separadamente, sem tratar pedido como reembolso concluído', async () => {
  for (const status of ['pending', 'failed', 'succeeded']) {
    const r = await persistirReembolso(
      refund('pi_' + randomUUID(), { status }),
      origem
    );
    refundIds.push(r.id);
  }
  const d = await carregarFaturamento(filtros());
  expect(d.reembolsos[0]).toMatchObject({
    total: 3,
    pendentes: 1,
    falhos: 1,
    concluidos: 1,
    valorConcluido: '1000',
    valorPendente: '1000',
    semVinculo: 3,
  });
});
it('não soma legado fiscal duas vezes e preserva sua falta de ambiente/amount_paid', async () => {
  const i = invoice();
  const fid = randomUUID();
  fiscalIds.push(fid);
  await executeStatement(
    "INSERT INTO fiscal_records(id,provider,external_invoice_id,currency_code,amount_subtotal,amount_total,paid_at) VALUES(?,'stripe',?,'BRL',10000,10000,'2024-02-01')",
    [fid, i.id]
  );
  const legado = await carregarFaturamento(filtros('ambiente=legado'));
  expect(legado.faturas.total).toBe(1);
  expect(legado.resumos[0].valorQuitado).toBeNull();
  await salvar(i);
  const todos = await carregarFaturamento(filtros('ambiente=todos'));
  expect(todos.faturas.total).toBe(1);
  expect(todos.faturas.itens[0].legado).toBe(0);
  expect(
    (
      await queryRows<{ n: number }>(
        'SELECT COUNT(*) n FROM fiscal_records WHERE id=?',
        [fid]
      )
    )[0].n
  ).toBe(1);
});
it('movimentos de saldo mantêm bruto/taxa/líquido e inteiros exatos acima da precisão do navegador', async () => {
  for (let n = 0; n < 2; n++) {
    const id = 'txn_contrato_' + randomUUID();
    saldoIds.push(id);
    await persistirMovimentoSaldo(
      {
        id,
        source: 'ch_contrato',
        currency: 'brl',
        amount: 9007199254740000 + n,
        fee: 10,
        net: 9007199254739990 + n,
        type: 'charge',
        reporting_category: 'charge',
        status: 'available',
        created: 1706745600,
        available_on: 1706745600,
      } as Stripe.BalanceTransaction,
      'test'
    );
  }
  const d = await carregarSaldo(filtros());
  expect(d.total).toBe(2);
  expect(d.grupos[0]).toMatchObject({
    bruto: '18014398509480001',
    taxas: '20',
    liquido: '18014398509479981',
  });
});
it('rotas recusam visitante e paciente antes de ler ou reservar operação', async () => {
  expect((await chamar(GET, { usuario: null })).status).toBe(401);
  expect((await chamar(GET, { usuario: pessoa })).status).toBe(403);
  const id = await salvar(invoice());
  expect(
    (
      await chamar(agir, {
        usuario: pessoa,
        method: 'POST',
        params: { invoiceId: id },
        body: {
          requestId: randomUUID(),
          action: 'void',
          confirmation: 'in_qualquer',
        },
      })
    ).status
  ).toBe(403);
  expect(
    (
      await queryRows<{ n: number }>(
        'SELECT COUNT(*) n FROM billing_admin_operations WHERE invoice_record_id=?',
        [id]
      )
    )[0].n
  ).toBe(0);
});
it('agregados não retornam comprador, conteúdo do webhook ou dados clínicos', async () => {
  await salvar(
    invoice(10000, {
      customer_email: 'privado@exemplo.invalid',
      customer_name: 'Pessoa privada',
      metadata: { secreto: 'texto privado' },
    })
  );
  const d = await chamar(GET, {
    usuario: admin,
    path: '/api/admin/faturamento?inicio=2024-01-01&fim=2024-02-29&ambiente=test',
  });
  expect(d.status).toBe(200);
  expect(d.headers.get('cache-control')).toBe('no-store');
  expect(JSON.stringify(d.json)).not.toMatch(
    /privado@|Pessoa privada|texto privado|customer_email|customer_name|metadata/
  );
});

it('pagina todo o histórico e detecta pedido pendente fora da página atual', async () => {
  const id = await salvar(invoice());
  const operacoes: string[] = [],
    reembolsos: string[] = [];
  for (let n = 0; n < 125; n++) {
    const requestId = randomUUID();
    operacoes.push(requestId);
    await executeStatement(
      `INSERT INTO billing_admin_operations(request_id,invoice_record_id,actor_user_id,action,request_hash,parameters,status,created_at) VALUES(?,?,?,'void',REPEAT('a',64),JSON_OBJECT('requestId',?,'action','void'),?,?)`,
      [
        requestId,
        id,
        admin.id,
        requestId,
        n === 0 ? 'uncertain' : 'succeeded',
        new Date(1706745600000 + n * 1000),
      ]
    );
    const rid = await persistirReembolso(
      refund('pi_paginacao', { created: 1706745600 + n }),
      origem,
      id
    );
    refundIds.push(rid.id);
    reembolsos.push(rid.id);
  }
  const ler = (q = '') =>
    chamar(detalhe, {
      usuario: admin,
      params: { invoiceId: id },
      path: '/api/admin/faturamento/' + id + q,
    });
  const primeira = await ler();
  expect(primeira.status).toBe(200);
  expect(primeira.headers.get('cache-control')).toBe('no-store');
  type Historico = {
    operacoes: {
      itens: { request_id: string }[];
      total: number;
      pendentes: number;
    };
    reembolsos: { itens: { id: string }[]; total: number };
  };
  const p1 = primeira.json as Historico;
  expect(p1.operacoes).toMatchObject({ total: 125, pendentes: 1 });
  expect(p1.operacoes.itens).toHaveLength(20);
  expect(p1.operacoes.itens.some((o) => o.request_id === operacoes[0])).toBe(
    false
  );
  const todasOperacoes = p1.operacoes.itens.map((o) => o.request_id);
  const todosReembolsos = p1.reembolsos.itens.map((r) => r.id);
  for (let pagina = 2; pagina <= 7; pagina++) {
    const resposta = await ler(
      `?paginaOperacoes=${pagina}&paginaReembolsos=${pagina}`
    );
    expect(resposta.status).toBe(200);
    const p = resposta.json as Historico;
    expect(p.operacoes.itens).toHaveLength(pagina === 7 ? 5 : 20);
    expect(p.reembolsos.itens).toHaveLength(pagina === 7 ? 5 : 20);
    expect(p.operacoes.pendentes).toBe(1);
    todasOperacoes.push(...p.operacoes.itens.map((o) => o.request_id));
    todosReembolsos.push(...p.reembolsos.itens.map((r) => r.id));
  }
  expect(new Set(todasOperacoes)).toEqual(new Set(operacoes));
  expect(new Set(todosReembolsos)).toEqual(new Set(reembolsos));
  expect(todasOperacoes).toHaveLength(125);
  expect(todosReembolsos).toHaveLength(125);
  for (const q of [
    '?paginaOperacoes=0',
    '?paginaReembolsos=1.5',
    '?paginaOperacoes=10001',
    '?outra=1',
  ])
    expect((await ler(q)).status).toBe(400);
  expect(
    (await chamar(detalhe, { usuario: pessoa, params: { invoiceId: id } }))
      .status
  ).toBe(403);
});

it('exporta somente os espelhos vinculados ao titular e preserva finanças ao excluir a conta', async () => {
  const titular = await criarUsuario();
  try {
    const minha = invoice(),
      outra = invoice();
    const minhaId = await salvar(minha);
    const outraId = await salvar(outra);
    for (const [fatura, dono] of [
      [minha, titular],
      [outra, pessoa],
    ] as const) {
      const fiscalId = randomUUID();
      fiscalIds.push(fiscalId);
      await executeStatement(
        `INSERT INTO fiscal_records(id,provider,external_invoice_id,user_id,currency_code,amount_subtotal,amount_total,paid_at) VALUES(?,'stripe',?,?,'BRL',10000,10000,'2024-02-01')`,
        [fiscalId, fatura.id, dono.id]
      );
    }
    await persistirVinculo(minhaId, payment(minha, 'pi_exportacao_' + minhaId));
    const r = await persistirReembolso(
      refund('pi_exportacao_' + minhaId),
      origem,
      minhaId
    );
    refundIds.push(r.id);
    const requestId = randomUUID();
    await executeStatement(
      `INSERT INTO billing_admin_operations(request_id,invoice_record_id,actor_user_id,action,request_hash,parameters,status) VALUES(?,?,?,'refund',REPEAT('b',64),JSON_OBJECT('requestId',?),'succeeded')`,
      [requestId, minhaId, titular.id, requestId]
    );
    const dados = await exportarFinanceiroDoTitular(titular.id);
    expect(dados.faturas.map((f) => f.id)).toEqual([minhaId]);
    expect(dados.faturas[0].amount_paid).toBe('10000');
    expect(dados.pagamentos).toHaveLength(1);
    expect(dados.reembolsos).toHaveLength(1);
    expect(dados.operacoes).toHaveLength(1);
    expect(JSON.stringify(dados)).not.toMatch(
      /actor_user_id|request_hash|parameters|provider_account_id|buyer_email/
    );
    expect(
      (await exportarFinanceiroDoTitular(pessoa.id)).faturas.map((f) => f.id)
    ).toEqual([outraId]);
    await excluirConta(titular.id);
    expect(
      (
        await queryRows(
          'SELECT actor_user_id FROM billing_admin_operations WHERE request_id=?',
          [requestId]
        )
      )[0].actor_user_id
    ).toBeNull();
    expect(
      (
        await queryRows(
          'SELECT user_id FROM fiscal_records WHERE external_invoice_id=?',
          [minha.id]
        )
      )[0].user_id
    ).toBeNull();
    expect(
      await queryRows('SELECT id FROM billing_invoice_records WHERE id=?', [
        minhaId,
      ])
    ).toHaveLength(1);
    expect(
      (await exportarFinanceiroDoTitular(pessoa.id)).faturas.map((f) => f.id)
    ).toEqual([outraId]);
  } finally {
    await executeStatement('DELETE FROM users WHERE id=?', [titular.id]);
  }
});
it('exporta fatura ainda sem registro fiscal por assinatura e ambiente comprovados, recusando ambiguidade do legado', async () => {
  const i = invoice(5000, {
    status: 'open',
    parent: {
      subscription_details: { subscription: 'sub_exportacao_' + randomUUID() },
    },
  });
  const id = await salvar(i);
  const cid = 'cus_exportacao_' + randomUUID();
  const subId = i.parent!.subscription_details!.subscription;
  await executeStatement(
    `INSERT INTO billing_customers(id,user_id,provider,environment,external_customer_id) VALUES(?,?,'stripe','test',?)`,
    [randomUUID(), pessoa.id, cid]
  );
  await executeStatement(
    `INSERT INTO user_subscriptions(id,user_id,plan_id,status,source,external_customer_id,external_subscription_id,current_period_end) SELECT ?,?,id,'active','stripe',?,?,'2027-01-01' FROM subscription_plans WHERE plan_key='free'`,
    [randomUUID(), pessoa.id, cid, subId]
  );
  try {
    expect(
      (await exportarFinanceiroDoTitular(pessoa.id)).faturas.map((f) => f.id)
    ).toContain(id);
    const fiscalId = randomUUID();
    fiscalIds.push(fiscalId);
    await executeStatement(
      `INSERT INTO fiscal_records(id,provider,external_invoice_id,user_id,currency_code,amount_subtotal,amount_total,paid_at) VALUES(?,'stripe',?,?,'BRL',10000,10000,'2024-02-01')`,
      [fiscalId, i.id, admin.id]
    );
    const liveId = await salvar(
      { ...i, livemode: true },
      { ...origem, ambiente: 'live' }
    );
    expect((await exportarFinanceiroDoTitular(admin.id)).faturas).toHaveLength(
      0
    );
    const minhas = (await exportarFinanceiroDoTitular(pessoa.id)).faturas.map(
      (f) => f.id
    );
    expect(minhas).toContain(id);
    expect(minhas).not.toContain(liveId);
  } finally {
    await executeStatement(
      'DELETE FROM user_subscriptions WHERE external_subscription_id=?',
      [subId]
    );
    await executeStatement(
      'DELETE FROM billing_customers WHERE external_customer_id=?',
      [cid]
    );
  }
});
