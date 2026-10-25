import { randomUUID } from 'node:crypto';
import type Stripe from 'stripe';
import type { PoolConnection } from 'mysql2/promise';
import { executeStatement, queryRows, withTransaction } from '@/lib/mysql/pool';
import { HttpError } from '@/lib/http-error';
import type { AmbienteDePagamento } from '@/lib/pagamentos/credenciais';

export function idExterno(valor: string | { id: string } | null | undefined) {
  return typeof valor === 'string' ? valor : (valor?.id ?? null);
}
export function dataDoProvedor(valor: unknown) {
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0)
    return null;
  const d = new Date(valor * 1000);
  return Number.isFinite(d.getTime())
    ? d.toISOString().slice(0, 19).replace('T', ' ')
    : null;
}
function inteiroOpcional(valor: unknown) {
  if (valor === undefined || valor === null) return null;
  if (typeof valor !== 'number' || !Number.isSafeInteger(valor))
    throw new HttpError(
      'O provedor retornou um valor financeiro inválido.',
      502
    );
  return valor;
}
function moeda(valor: unknown) {
  return typeof valor === 'string' && /^[a-z]{3}$/i.test(valor)
    ? valor.toUpperCase()
    : null;
}
export interface OrigemFinanceira {
  ambiente: AmbienteDePagamento;
  instante: number;
  eventoId?: string;
  canonica?: boolean;
  leituraIniciadaEm?: string;
}
export interface FaturaFinanceira {
  id: string;
  provider: string;
  environment: AmbienteDePagamento;
  external_invoice_id: string;
  invoice_number: string | null;
  external_subscription_id: string | null;
  currency_code: string | null;
  status: string;
  collection_method: string | null;
  amount_subtotal: number | null;
  amount_total: number | null;
  amount_paid: number | null;
  amount_due: number | null;
  amount_remaining: number | null;
  provider_created_at: string | null;
  paid_at: string | null;
  due_at: string | null;
  voided_at: string | null;
  source_event_created: number;
  source_event_id: string | null;
  needs_reconciliation: number;
  synced_at: string;
}
/** Não usa total nominal para preencher amount_paid ausente em eventos legados. */
export async function persistirFatura(
  invoice: Stripe.Invoice,
  origem: OrigemFinanceira,
  db?: PoolConnection
): Promise<{ id: string; reconciliar: boolean }> {
  if (!db) return withTransaction((c) => persistirFatura(invoice, origem, c));
  const novaId = randomUUID();
  await executeStatement(
    "INSERT INTO billing_invoice_records(id,provider,environment,external_invoice_id,status) VALUES(?,'stripe',?,?,'desconhecido') ON DUPLICATE KEY UPDATE id=billing_invoice_records.id",
    [novaId, origem.ambiente, invoice.id],
    db
  );
  const [atual] = await queryRows<FaturaFinanceira>(
    "SELECT * FROM billing_invoice_records WHERE provider='stripe' AND environment=? AND external_invoice_id=? FOR UPDATE",
    [origem.ambiente, invoice.id],
    db
  );
  if (
    origem.leituraIniciadaEm &&
    atual.status !== 'desconhecido' &&
    atual.synced_at >= origem.leituraIniciadaEm
  )
    return { id: atual.id, reconciliar: Boolean(atual.needs_reconciliation) };
  if (!origem.canonica && Number(atual.source_event_created) > origem.instante)
    return { id: atual.id, reconciliar: Boolean(atual.needs_reconciliation) };
  const status = invoice.status ?? 'desconhecido';
  const pago = inteiroOpcional(invoice.amount_paid);
  // Eventos diferentes do mesmo segundo não possuem ordem cronológica por ID.
  // Se houver conflito, preserva a fotografia e exige leitura canônica da API.
  if (
    !origem.canonica &&
    atual.source_event_id &&
    atual.source_event_id !== origem.eventoId &&
    Number(atual.source_event_created) === origem.instante &&
    (atual.status !== status ||
      atual.amount_paid !== pago ||
      atual.amount_total !== inteiroOpcional(invoice.total))
  ) {
    await executeStatement(
      'UPDATE billing_invoice_records SET needs_reconciliation=TRUE WHERE id=?',
      [atual.id],
      db
    );
    return { id: atual.id, reconciliar: true };
  }
  await executeStatement(
    `UPDATE billing_invoice_records SET invoice_number=?,external_subscription_id=?,currency_code=?,status=?,collection_method=?,amount_subtotal=?,amount_total=?,amount_paid=?,amount_due=?,amount_remaining=?,provider_created_at=?,paid_at=?,due_at=?,voided_at=?,source_event_created=GREATEST(source_event_created,?),source_event_id=?,needs_reconciliation=FALSE,synced_at=UTC_TIMESTAMP(3) WHERE id=?`,
    [
      invoice.number ?? null,
      idExterno(invoice.parent?.subscription_details?.subscription),
      moeda(invoice.currency),
      status,
      invoice.collection_method ?? null,
      inteiroOpcional(invoice.subtotal),
      inteiroOpcional(invoice.total),
      pago,
      inteiroOpcional(invoice.amount_due),
      inteiroOpcional(invoice.amount_remaining),
      dataDoProvedor(invoice.created),
      dataDoProvedor(invoice.status_transitions?.paid_at),
      dataDoProvedor(invoice.due_date),
      dataDoProvedor(invoice.status_transitions?.voided_at),
      origem.instante,
      origem.eventoId ?? null,
      atual.id,
    ],
    db
  );
  for (const pagamento of invoice.payments?.data ?? [])
    await persistirVinculo(atual.id, pagamento, db);
  return { id: atual.id, reconciliar: false };
}
export async function persistirVinculo(
  invoiceId: string,
  p: Stripe.InvoicePayment,
  db?: PoolConnection
) {
  const kind = p.payment.type;
  const external =
    kind === 'payment_intent'
      ? idExterno(p.payment.payment_intent)
      : kind === 'charge'
        ? idExterno(p.payment.charge)
        : null;
  if (!external || p.status !== 'paid') return;
  await executeStatement(
    `INSERT INTO billing_invoice_payments(invoice_record_id,payment_kind,external_payment_id,external_invoice_payment_id,amount_paid) VALUES(?,?,?,?,?) AS nova ON DUPLICATE KEY UPDATE external_invoice_payment_id=nova.external_invoice_payment_id,amount_paid=nova.amount_paid`,
    [invoiceId, kind, external, p.id, inteiroOpcional(p.amount_paid)],
    db
  );
  await executeStatement(
    `UPDATE billing_refund_records r JOIN billing_invoice_records i ON i.id=? SET r.invoice_record_id=i.id,r.link_source='unique_payment' WHERE r.environment=i.environment AND r.payment_kind=? AND r.external_payment_id=? AND r.invoice_record_id IS NULL AND (SELECT COUNT(DISTINCT p.invoice_record_id) FROM billing_invoice_payments p JOIN billing_invoice_records ip ON ip.id=p.invoice_record_id WHERE ip.environment=i.environment AND p.payment_kind=? AND p.external_payment_id=?)=1`,
    [invoiceId, kind, external, kind, external],
    db
  );
  await executeStatement(
    `UPDATE billing_refund_records r JOIN billing_invoice_records i ON i.id=? SET r.invoice_record_id=NULL,r.link_source=NULL WHERE r.environment=i.environment AND r.payment_kind=? AND r.external_payment_id=? AND r.link_source='unique_payment' AND (SELECT COUNT(DISTINCT p.invoice_record_id) FROM billing_invoice_payments p JOIN billing_invoice_records ip ON ip.id=p.invoice_record_id WHERE ip.environment=i.environment AND p.payment_kind=? AND p.external_payment_id=?)>1`,
    [invoiceId, kind, external, kind, external],
    db
  );
}
export interface ReembolsoFinanceiro {
  id: string;
  environment: AmbienteDePagamento;
  external_refund_id: string;
  invoice_record_id: string | null;
  link_source: string | null;
  payment_kind: string | null;
  external_payment_id: string | null;
  currency_code: string | null;
  amount: number | null;
  status: string;
  provider_created_at: string | null;
  source_event_created: number;
  source_event_id: string | null;
  needs_reconciliation: number;
  synced_at: string;
}
/** Reembolso sem vínculo inequívoco permanece explícito, sem rateio inventado. */
export async function persistirReembolso(
  refund: Stripe.Refund,
  origem: OrigemFinanceira,
  invoiceId?: string,
  db?: PoolConnection
): Promise<{ id: string; reconciliar: boolean }> {
  if (!db)
    return withTransaction((c) =>
      persistirReembolso(refund, origem, invoiceId, c)
    );
  const pi = idExterno(refund.payment_intent),
    charge = idExterno(refund.charge),
    referencia = pi ?? charge,
    kind = pi ? 'payment_intent' : charge ? 'charge' : null;
  let vinculo = invoiceId ?? null;
  let origemDoVinculo: string | null = invoiceId ? 'operation' : null;
  let vinculoReavaliado = Boolean(invoiceId);
  if (!vinculo && referencia) {
    const rows = await queryRows<{ invoice_record_id: string }>(
      `SELECT DISTINCT p.invoice_record_id FROM billing_invoice_payments p JOIN billing_invoice_records i ON i.id=p.invoice_record_id WHERE i.environment=? AND p.payment_kind=? AND p.external_payment_id=? LIMIT 2`,
      [origem.ambiente, kind, referencia],
      db
    );
    if (rows.length) {
      vinculoReavaliado = true;
    }
    if (rows.length === 1) {
      vinculo = rows[0].invoice_record_id;
      origemDoVinculo = 'unique_payment';
    }
  }
  if (vinculo) {
    const match = await queryRows(
      'SELECT id FROM billing_invoice_records WHERE id=? AND environment=?',
      [vinculo, origem.ambiente],
      db
    );
    if (!match.length)
      throw new HttpError(
        'O reembolso não corresponde ao ambiente da fatura.',
        409
      );
  }
  const nova = randomUUID();
  await executeStatement(
    "INSERT INTO billing_refund_records(id,provider,environment,external_refund_id,status) VALUES(?,'stripe',?,?,'desconhecido') ON DUPLICATE KEY UPDATE id=billing_refund_records.id",
    [nova, origem.ambiente, refund.id],
    db
  );
  const [r] = await queryRows<ReembolsoFinanceiro>(
    "SELECT * FROM billing_refund_records WHERE provider='stripe' AND environment=? AND external_refund_id=? FOR UPDATE",
    [origem.ambiente, refund.id],
    db
  );
  if (
    origem.leituraIniciadaEm &&
    r.status !== 'desconhecido' &&
    r.synced_at >= origem.leituraIniciadaEm
  )
    return { id: r.id, reconciliar: Boolean(r.needs_reconciliation) };
  if (!invoiceId && r.link_source === 'operation' && r.invoice_record_id) {
    vinculo = r.invoice_record_id;
    origemDoVinculo = 'operation';
    vinculoReavaliado = true;
  }
  if (!origem.canonica && Number(r.source_event_created) > origem.instante)
    return { id: r.id, reconciliar: Boolean(r.needs_reconciliation) };
  if (
    !origem.canonica &&
    r.source_event_id &&
    r.source_event_id !== origem.eventoId &&
    Number(r.source_event_created) === origem.instante &&
    (r.status !== (refund.status ?? 'desconhecido') ||
      r.amount !== inteiroOpcional(refund.amount))
  ) {
    await executeStatement(
      'UPDATE billing_refund_records SET needs_reconciliation=TRUE WHERE id=?',
      [r.id],
      db
    );
    return { id: r.id, reconciliar: true };
  }
  await executeStatement(
    `UPDATE billing_refund_records SET invoice_record_id=IF(?, ?,invoice_record_id),link_source=IF(?,?,link_source),payment_kind=?,external_payment_id=?,currency_code=?,amount=?,status=?,provider_created_at=?,source_event_created=GREATEST(source_event_created,?),source_event_id=?,needs_reconciliation=FALSE,synced_at=UTC_TIMESTAMP(3) WHERE id=?`,
    [
      vinculoReavaliado,
      vinculo,
      vinculoReavaliado,
      origemDoVinculo,
      kind,
      referencia,
      moeda(refund.currency),
      inteiroOpcional(refund.amount),
      refund.status ?? 'desconhecido',
      dataDoProvedor(refund.created),
      origem.instante,
      origem.eventoId ?? null,
      r.id,
    ],
    db
  );
  return { id: r.id, reconciliar: false };
}
export async function marcarRascunhoExcluido(
  id: string,
  origem: OrigemFinanceira
) {
  await executeStatement(
    "UPDATE billing_invoice_records SET status='deleted',needs_reconciliation=FALSE,source_event_created=GREATEST(source_event_created,?),synced_at=UTC_TIMESTAMP(3) WHERE id=? AND environment=?",
    [origem.instante, id, origem.ambiente]
  );
}

/** Valores exatos de saldo; não mistura quitação de fatura e liquidação financeira. */
export async function persistirMovimentoSaldo(
  t: Stripe.BalanceTransaction,
  ambiente: AmbienteDePagamento
) {
  const data = dataDoProvedor(t.created),
    disponivel = dataDoProvedor(t.available_on);
  if (!data || !disponivel || !moeda(t.currency))
    throw new HttpError(
      'O movimento financeiro retornou data ou moeda inválida.',
      502
    );
  await executeStatement(
    `INSERT INTO billing_balance_records(id,provider,environment,external_transaction_id,source_id,currency_code,amount,fee,net,type,reporting_category,status,provider_created_at,available_at) VALUES(?,'stripe',?,?,?,?,?,?,?,?,?,?,?,?) AS nova ON DUPLICATE KEY UPDATE source_id=nova.source_id,currency_code=nova.currency_code,amount=nova.amount,fee=nova.fee,net=nova.net,type=nova.type,reporting_category=nova.reporting_category,status=nova.status,provider_created_at=nova.provider_created_at,available_at=nova.available_at,synced_at=UTC_TIMESTAMP(3)`,
    [
      randomUUID(),
      ambiente,
      t.id,
      idExterno(t.source),
      moeda(t.currency),
      inteiroOpcional(t.amount),
      inteiroOpcional(t.fee),
      inteiroOpcional(t.net),
      t.type,
      t.reporting_category,
      t.status,
      data,
      disponivel,
    ]
  );
}
