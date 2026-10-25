import { randomUUID } from 'node:crypto';
import type Stripe from 'stripe';
import {
  credenciaisDoStripe,
  type AmbienteDePagamento,
} from '@/lib/pagamentos/credenciais';
import { getStripeClient } from '@/lib/billing/stripe';
import { HttpError } from '@/lib/http-error';
import { queryRows, withTransaction } from '@/lib/mysql/pool';
import {
  persistirFatura,
  persistirReembolso,
  persistirVinculo,
  type FaturaFinanceira,
  type OrigemFinanceira,
  idExterno,
} from './espelhos';

export const OPCOES_DE_LEITURA: Stripe.RequestOptions = {
  timeout: 15_000,
  maxNetworkRetries: 1,
};
export async function contextoFinanceiro(ambiente: AmbienteDePagamento) {
  const config = await credenciaisDoStripe();
  if (!config.chaveSecreta)
    throw new HttpError(
      'Configure a Stripe no ambiente correspondente para consultar ou operar no provedor.',
      503
    );
  if (config.ambiente !== ambiente)
    throw new HttpError(
      'O ambiente selecionado não corresponde às chaves em uso. Confira Pagamentos antes de operar.',
      409
    );
  return {
    stripe: await getStripeClient({ chaveSecreta: config.chaveSecreta }),
    ambiente,
  };
}
export async function faturaLocal(id: string) {
  const [fatura] = await queryRows<FaturaFinanceira>(
    'SELECT * FROM billing_invoice_records WHERE id=?',
    [id]
  );
  if (!fatura) throw new HttpError('Fatura não encontrada.', 404);
  return fatura;
}
function conferirAmbiente(
  objeto: { livemode: boolean },
  ambiente: AmbienteDePagamento
) {
  if (objeto.livemode !== (ambiente === 'live'))
    throw new HttpError(
      'O provedor devolveu um objeto de outro ambiente.',
      502
    );
}
export async function reconciliarFatura(
  invoiceId: string,
  ambiente: AmbienteDePagamento,
  evento?: OrigemFinanceira
) {
  const { stripe } = await contextoFinanceiro(ambiente);
  const origem: OrigemFinanceira = {
    ambiente,
    instante: evento?.instante ?? 0,
    eventoId: evento?.eventoId,
    canonica: true,
  };
  // A leitura do provedor ocorre sob a trava da própria fatura. Assim uma
  // resposta antiga de outra requisição não sobrescreve um webhook mais novo.
  const { invoice, local } = await withTransaction(async (db) => {
    await db.execute(
      "INSERT INTO billing_invoice_records(id,provider,environment,external_invoice_id,status) VALUES(?,'stripe',?,?,'desconhecido') ON DUPLICATE KEY UPDATE id=billing_invoice_records.id",
      [randomUUID(), ambiente, invoiceId]
    );
    await db.query(
      "SELECT id FROM billing_invoice_records WHERE environment=? AND external_invoice_id=? AND provider='stripe' FOR UPDATE",
      [ambiente, invoiceId]
    );
    const invoice = await stripe.invoices.retrieve(
      invoiceId,
      {},
      OPCOES_DE_LEITURA
    );
    conferirAmbiente(invoice, ambiente);
    const local = await persistirFatura(invoice, origem, db);
    return { invoice, local };
  });
  let pagamentos = invoice.payments?.data ?? [];
  if (!invoice.payments || invoice.payments.has_more) {
    pagamentos = [];
    let cursor: string | undefined;
    // Limite de segurança explícito: nunca tratar a primeira página como lista completa.
    for (let pagina = 0; pagina < 100; pagina++) {
      const lista = await stripe.invoicePayments.list(
        {
          invoice: invoice.id,
          status: 'paid',
          limit: 100,
          ...(cursor ? { starting_after: cursor } : {}),
        },
        OPCOES_DE_LEITURA
      );
      for (const p of lista.data) conferirAmbiente(p, ambiente);
      pagamentos.push(...lista.data);
      if (!lista.has_more) break;
      cursor = lista.data.at(-1)?.id;
      if (!cursor || pagina === 99)
        throw new HttpError(
          'A fatura excede o limite de pagamentos desta consulta. Use o provedor para conferir a lista integral.',
          409
        );
    }
  }
  for (const p of pagamentos) await persistirVinculo(local.id, p);
  return { invoice, local: await faturaLocal(local.id), pagamentos, stripe };
}
export async function reconciliarReembolso(
  refundId: string,
  ambiente: AmbienteDePagamento,
  invoiceId?: string,
  evento?: OrigemFinanceira
) {
  const { stripe } = await contextoFinanceiro(ambiente);
  return withTransaction(async (db) => {
    await db.execute(
      "INSERT INTO billing_refund_records(id,provider,environment,external_refund_id,status) VALUES(?,'stripe',?,?,'desconhecido') ON DUPLICATE KEY UPDATE id=billing_refund_records.id",
      [randomUUID(), ambiente, refundId]
    );
    await db.query(
      "SELECT id FROM billing_refund_records WHERE environment=? AND external_refund_id=? AND provider='stripe' FOR UPDATE",
      [ambiente, refundId]
    );
    const refund = await stripe.refunds.retrieve(
      refundId,
      {},
      OPCOES_DE_LEITURA
    );
    const local = await persistirReembolso(
      refund,
      {
        ambiente,
        instante: evento?.instante ?? 0,
        eventoId: evento?.eventoId,
        canonica: true,
      },
      invoiceId,
      db
    );
    return { refund, local };
  });
}
/** Usado pelo webhook assinado, sem nova coleta de comprador ou dados clínicos. */
export async function receberEventoFinanceiro(event: Stripe.Event) {
  const ambiente: AmbienteDePagamento = event.livemode ? 'live' : 'test';
  const origem: OrigemFinanceira = {
    ambiente,
    instante: event.created,
    eventoId: event.id,
  };
  if (
    event.type.startsWith('invoice.') &&
    event.type !== 'invoice.upcoming' &&
    event.type !== 'invoice.deleted'
  ) {
    const invoice = event.data.object;
    if (invoice.object !== 'invoice') return;
    const [anterior] = await queryRows<{ status: string }>(
      "SELECT status FROM billing_invoice_records WHERE provider='stripe' AND environment=? AND external_invoice_id=?",
      [ambiente, invoice.id]
    );
    if (anterior?.status === 'deleted') return;
    await reconciliarFatura(invoice.id, ambiente, origem);
  } else if (event.type === 'invoice.deleted') {
    const invoice = event.data.object;
    if (invoice.object !== 'invoice') return;
    await persistirFatura(invoice, origem);
    await withTransaction(async (db) => {
      await db.execute(
        "UPDATE billing_invoice_records SET status='deleted',needs_reconciliation=FALSE,source_event_created=?,source_event_id=?,synced_at=UTC_TIMESTAMP(3) WHERE environment=? AND external_invoice_id=? AND source_event_created<=?",
        [event.created, event.id, ambiente, invoice.id, event.created]
      );
    });
  } else if (
    ['refund.created', 'refund.updated', 'refund.failed'].includes(event.type)
  ) {
    const refund = event.data.object;
    if (refund.object !== 'refund') return;
    await reconciliarReembolso(refund.id, ambiente, undefined, origem);
  }
}
/** Garante que um reembolso solicitado não alcance saldo de outra fatura. */
export async function pagamentoReembolsavel(
  invoice: Stripe.Invoice,
  pagamentos: Stripe.InvoicePayment[],
  paymentId: string,
  stripe: Stripe
) {
  const pagamento = pagamentos.find(
    (p) => p.id === paymentId && p.status === 'paid'
  );
  if (!pagamento)
    throw new HttpError('Pagamento não encontrado nesta fatura.', 409);
  const tipo = pagamento.payment.type;
  const referencia =
    tipo === 'payment_intent'
      ? idExterno(pagamento.payment.payment_intent)
      : tipo === 'charge'
        ? idExterno(pagamento.payment.charge)
        : null;
  if (!referencia)
    throw new HttpError(
      'Este pagamento não oferece reembolso automático por esta integração. Confira o registro no provedor.',
      409
    );
  if (tipo === 'payment_intent') {
    const relacionados = await stripe.invoicePayments.list(
      {
        payment: { payment_intent: referencia, type: 'payment_intent' },
        status: 'paid',
        limit: 100,
      },
      OPCOES_DE_LEITURA
    );
    if (
      relacionados.has_more ||
      relacionados.data.some((p) => idExterno(p.invoice) !== invoice.id)
    )
      throw new HttpError(
        'Este pagamento é compartilhado entre faturas. A alocação precisa ser revisada no provedor antes de reembolsar.',
        409
      );
  }
  const charge =
    tipo === 'charge'
      ? await stripe.charges.retrieve(referencia, {}, OPCOES_DE_LEITURA)
      : await (async () => {
          const pi = await stripe.paymentIntents.retrieve(
            referencia,
            {},
            OPCOES_DE_LEITURA
          );
          const id = idExterno(pi.latest_charge);
          if (!id)
            throw new HttpError(
              'O pagamento ainda não possui cobrança reembolsável.',
              409
            );
          return stripe.charges.retrieve(id, {}, OPCOES_DE_LEITURA);
        })();
  if (charge.currency !== invoice.currency || !charge.paid || !charge.captured)
    throw new HttpError(
      'A cobrança não corresponde à moeda ou ao estado esperado da fatura.',
      409
    );
  let reservados = 0,
    cursor: string | undefined;
  for (let pagina = 0; pagina < 100; pagina++) {
    const lista = await stripe.refunds.list(
      {
        charge: charge.id,
        limit: 100,
        ...(cursor ? { starting_after: cursor } : {}),
      },
      OPCOES_DE_LEITURA
    );
    reservados += lista.data
      .filter((r) =>
        ['pending', 'requires_action', 'succeeded'].includes(r.status ?? '')
      )
      .reduce((n, r) => n + r.amount, 0);
    if (!lista.has_more) break;
    cursor = lista.data.at(-1)?.id;
    if (!cursor || pagina === 99)
      throw new HttpError(
        'O histórico de reembolsos precisa ser conferido integralmente no provedor.',
        409
      );
  }
  const disponivel = Math.max(
    0,
    Math.min(pagamento.amount_paid ?? 0, charge.amount) -
      Math.max(charge.amount_refunded, reservados)
  );
  return { pagamento, charge, referencia, tipo, disponivel };
}
