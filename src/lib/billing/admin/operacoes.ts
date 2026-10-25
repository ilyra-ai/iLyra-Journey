import { createHash } from 'node:crypto';
import Stripe from 'stripe';
import { z } from 'zod';
import { HttpError } from '@/lib/http-error';
import { executeStatement, queryRows, withTransaction } from '@/lib/mysql/pool';
import {
  faturaLocal,
  reconciliarFatura,
  pagamentoReembolsavel,
  OPCOES_DE_LEITURA,
  contextoFinanceiro,
  reconciliarReembolso,
} from './provedor';
import {
  marcarRascunhoExcluido,
  type OrigemFinanceira,
  idExterno,
} from './espelhos';

export const operacaoSchema = z
  .object({
    requestId: z.uuid(),
    action: z.enum([
      'void',
      'delete_draft',
      'finalize',
      'send',
      'uncollectible',
      'refund',
      'cancel_refund',
      'cancel_subscription_at_period_end',
      'resume_subscription',
    ]),
    confirmation: z.string().min(1).max(255),
    amount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
    paymentId: z
      .string()
      .regex(/^[a-zA-Z0-9_]+$/)
      .max(255)
      .optional(),
    refundId: z
      .string()
      .regex(/^re_[a-zA-Z0-9_]+$/)
      .max(255)
      .optional(),
    reason: z
      .enum(['requested_by_customer', 'duplicate', 'fraudulent'])
      .default('requested_by_customer'),
  })
  .strict()
  .superRefine((v, c) => {
    if (v.action === 'refund' && (!v.amount || !v.paymentId))
      c.addIssue({
        code: 'custom',
        message: 'Informe o pagamento e o valor exato do reembolso.',
      });
    if (v.action === 'cancel_refund' && !v.refundId)
      c.addIssue({
        code: 'custom',
        message: 'Identifique o reembolso que será cancelado.',
      });
    if (
      v.action !== 'refund' &&
      (v.amount !== undefined || v.paymentId !== undefined)
    )
      c.addIssue({
        code: 'custom',
        message: 'Esta ação não recebe valor ou pagamento.',
      });
    if (v.action !== 'cancel_refund' && v.refundId !== undefined)
      c.addIssue({
        code: 'custom',
        message: 'Esta ação não recebe identificador de reembolso.',
      });
  });
export type OperacaoFinanceira = z.infer<typeof operacaoSchema>;
interface OperacaoRow {
  request_id: string;
  invoice_record_id: string;
  request_hash: string;
  status: 'reserved' | 'succeeded' | 'failed' | 'uncertain';
  parameters: OperacaoFinanceira | string;
  result: ResultadoFinanceiro | string | null;
  error_code: string | null;
  created_at: string;
  lease_until: string | null;
  provider_account_id: string | null;
}
export interface ResultadoFinanceiro {
  requestId: string;
  action: string;
  providerObjectId: string;
  providerStatus: string;
  cancelAtPeriodEnd?: boolean;
}
function json<T>(v: T | string): T {
  return typeof v === 'string' ? (JSON.parse(v) as T) : v;
}
function dataUtc(v: string) {
  return Date.parse(v.replace(' ', 'T') + 'Z');
}
async function reservar(
  invoiceId: string,
  actor: string,
  p: OperacaoFinanceira
) {
  const hash = createHash('sha256')
    .update(
      JSON.stringify({
        invoiceId,
        action: p.action,
        confirmation: p.confirmation,
        amount: p.amount ?? null,
        paymentId: p.paymentId ?? null,
        refundId: p.refundId ?? null,
        reason: p.reason,
      })
    )
    .digest('hex');
  return withTransaction(async (db) => {
    await db.query(
      'SELECT id FROM billing_invoice_records WHERE id=? FOR UPDATE',
      [invoiceId]
    );
    const [atual] = await queryRows<OperacaoRow>(
      'SELECT * FROM billing_admin_operations WHERE request_id=? FOR UPDATE',
      [p.requestId],
      db
    );
    if (atual) {
      if (atual.invoice_record_id !== invoiceId || atual.request_hash !== hash)
        throw new HttpError(
          'Este identificador já pertence a outra operação. Preserve o pedido original ao retomar.',
          409
        );
      if (atual.status === 'succeeded') return { anterior: atual };
      if (atual.status === 'failed')
        throw new HttpError(
          'Esta operação foi recusada de forma definitiva. Confira os registros antes de iniciar outro pedido.',
          409
        );
      if (atual.lease_until && dataUtc(atual.lease_until) > Date.now())
        throw new HttpError(
          'A operação ainda está em andamento. Aguarde antes de retomar.',
          409
        );
      await db.execute(
        "UPDATE billing_admin_operations SET status='reserved',lease_until=DATE_ADD(UTC_TIMESTAMP(),INTERVAL 90 SECOND),error_code=NULL WHERE request_id=?",
        [p.requestId]
      );
      return { anterior: atual };
    }
    const pendentes = await queryRows(
      "SELECT request_id FROM billing_admin_operations WHERE invoice_record_id=? AND status IN ('reserved','uncertain') LIMIT 1",
      [invoiceId],
      db
    );
    if (pendentes.length)
      throw new HttpError(
        'Esta fatura possui uma operação pendente. Retome ou reconcilie o pedido existente antes de iniciar outro.',
        409
      );
    await db.execute(
      "INSERT INTO billing_admin_operations(request_id,invoice_record_id,actor_user_id,action,request_hash,parameters,status,lease_until) VALUES(?,?,?,?,?,?,'reserved',DATE_ADD(UTC_TIMESTAMP(),INTERVAL 90 SECOND))",
      [p.requestId, invoiceId, actor, p.action, hash, JSON.stringify(p)]
    );
    return { anterior: null };
  });
}
function exigirEstado(invoice: Stripe.Invoice, permitidos: string[]) {
  if (!invoice.status || !permitidos.includes(invoice.status))
    throw new HttpError(
      'O estado atual da fatura não permite esta ação. Atualize os detalhes.',
      409
    );
}
async function procurarReembolso(
  stripe: Stripe,
  referencia: { tipo: string; referencia: string },
  requestId: string
) {
  let cursor: string | undefined;
  for (let pagina = 0; pagina < 100; pagina++) {
    const r = await stripe.refunds.list(
      {
        ...(referencia.tipo === 'charge'
          ? { charge: referencia.referencia }
          : { payment_intent: referencia.referencia }),
        limit: 100,
        ...(cursor ? { starting_after: cursor } : {}),
      },
      OPCOES_DE_LEITURA
    );
    const anterior = r.data.find(
      (v) => v.metadata?.lyra_finance_operation === requestId
    );
    if (anterior) return anterior;
    if (!r.has_more) return null;
    cursor = r.data.at(-1)?.id;
    if (!cursor) break;
  }
  throw new HttpError(
    'Não foi possível conferir todo o histórico de reembolsos. Reconcilie no provedor antes de tentar novamente.',
    409
  );
}
/** A intenção é confirmada no banco ANTES de qualquer mutação no provedor. */
export async function executarOperacao(
  invoiceId: string,
  actor: string,
  entrada: OperacaoFinanceira
): Promise<ResultadoFinanceiro> {
  const p = operacaoSchema.parse(entrada),
    local = await faturaLocal(invoiceId);
  if (local.provider !== 'stripe')
    throw new HttpError(
      'Este provedor não possui cobrança integrada ao app.',
      409
    );
  if (p.confirmation !== local.external_invoice_id)
    throw new HttpError(
      'Confirme o identificador exato da fatura antes de continuar.',
      400
    );
  const reserva = await reservar(invoiceId, actor, p);
  if (reserva.anterior?.status === 'succeeded' && reserva.anterior.result)
    return json(reserva.anterior.result);
  let mutacaoIniciada = false;
  try {
    const contexto = await contextoFinanceiro(local.environment);
    const conta = await contexto.stripe.accounts.retrieveCurrent(
      {},
      OPCOES_DE_LEITURA
    );
    if (
      reserva.anterior?.provider_account_id &&
      reserva.anterior.provider_account_id !== conta.id
    )
      throw new HttpError(
        'Esta operação pertence a outra conta da Stripe. Restabeleça a conexão original para reconciliar.',
        409
      );
    await executeStatement(
      'UPDATE billing_admin_operations SET provider_account_id=? WHERE request_id=?',
      [conta.id, p.requestId]
    );
    if (
      p.action === 'delete_draft' &&
      reserva.anterior?.provider_account_id === conta.id
    ) {
      try {
        await contexto.stripe.invoices.retrieve(
          local.external_invoice_id,
          {},
          OPCOES_DE_LEITURA
        );
      } catch (erro) {
        if (
          erro instanceof Stripe.errors.StripeInvalidRequestError &&
          erro.code === 'resource_missing'
        ) {
          const resultado: ResultadoFinanceiro = {
            requestId: p.requestId,
            action: p.action,
            providerObjectId: local.external_invoice_id,
            providerStatus: 'deleted',
          };
          await marcarRascunhoExcluido(invoiceId, {
            ambiente: local.environment,
            instante: 0,
            canonica: true,
          });
          await executeStatement(
            "UPDATE billing_admin_operations SET status='succeeded',result=?,error_code=NULL,lease_until=NULL,completed_at=UTC_TIMESTAMP() WHERE request_id=?",
            [JSON.stringify(resultado), p.requestId]
          );
          return resultado;
        }
        throw erro;
      }
    }
    const { invoice, pagamentos, stripe } = await reconciliarFatura(
      local.external_invoice_id,
      local.environment
    );
    const origem: OrigemFinanceira = {
      ambiente: local.environment,
      instante: 0,
      canonica: true,
    };
    const options: Stripe.RequestOptions = {
      ...OPCOES_DE_LEITURA,
      idempotencyKey: 'lyra-finance-' + p.requestId,
    };
    let renovacaoCancelada: boolean | undefined;
    let objetoId = invoice.id,
      estado: string = invoice.status ?? 'desconhecido';
    // A janela de idempotência externa não é infinita. Recuperação de refund usa
    // também metadado da operação no provedor; não reenvia pedido antigo às cegas.
    const antiga =
      reserva.anterior &&
      Date.now() - dataUtc(reserva.anterior.created_at) > 23 * 3600000;
    switch (p.action) {
      case 'refund': {
        exigirEstado(invoice, ['paid', 'open', 'uncollectible']);
        const pagamento = await pagamentoReembolsavel(
          invoice,
          pagamentos,
          p.paymentId!,
          stripe
        );
        const anterior = await procurarReembolso(
          stripe,
          pagamento,
          p.requestId
        );
        let refund: Stripe.Refund;
        if (
          anterior &&
          (anterior.amount !== p.amount ||
            anterior.currency !== invoice.currency ||
            idExterno(anterior.charge) !== pagamento.charge.id)
        )
          throw new HttpError(
            'O reembolso encontrado não corresponde integralmente ao pedido. Confira a operação no provedor.',
            409
          );
        if (anterior) refund = anterior;
        else {
          if (antiga)
            throw new HttpError(
              'Este pedido antigo precisa de reconciliação manual no provedor; não será reenviado com uma chave expirada.',
              409
            );
          if (p.amount! > pagamento.disponivel)
            throw new HttpError(
              'O valor solicitado supera o saldo reembolsável confirmado pelo provedor.',
              409
            );
          mutacaoIniciada = true;
          refund = await stripe.refunds.create(
            {
              charge: pagamento.charge.id,
              amount: p.amount,
              reason: p.reason,
              metadata: {
                lyra_finance_operation: p.requestId,
                lyra_invoice_id: invoice.id,
              },
            },
            options
          );
        }
        await reconciliarReembolso(refund.id, local.environment, invoiceId);
        objetoId = refund.id;
        estado = refund.status ?? 'desconhecido';
        break;
      }
      case 'cancel_refund': {
        const [row] = await queryRows<{ external_refund_id: string }>(
          'SELECT external_refund_id FROM billing_refund_records WHERE invoice_record_id=? AND environment=? AND external_refund_id=?',
          [invoiceId, local.environment, p.refundId]
        );
        if (!row)
          throw new HttpError('O reembolso não pertence a esta fatura.', 409);
        const refund = await stripe.refunds.retrieve(
          row.external_refund_id,
          {},
          OPCOES_DE_LEITURA
        );
        if (refund.status !== 'requires_action' && refund.status !== 'canceled')
          throw new HttpError(
            'Só reembolso aguardando ação pode ser cancelado.',
            409
          );
        mutacaoIniciada = refund.status !== 'canceled';
        const atualizado =
          refund.status === 'canceled'
            ? refund
            : await stripe.refunds.cancel(refund.id, {}, options);
        await reconciliarReembolso(atualizado.id, local.environment, invoiceId);
        objetoId = atualizado.id;
        estado = atualizado.status ?? 'desconhecido';
        break;
      }
      case 'void': {
        if (invoice.status === 'void' && reserva.anterior) {
          estado = 'void';
          break;
        }
        exigirEstado(invoice, ['open', 'uncollectible']);
        mutacaoIniciada = true;
        const v = await stripe.invoices.voidInvoice(invoice.id, {}, options);
        await reconciliarFatura(v.id, local.environment);
        estado = v.status ?? 'desconhecido';
        break;
      }
      case 'delete_draft': {
        exigirEstado(invoice, ['draft']);
        mutacaoIniciada = true;
        await stripe.invoices.del(invoice.id, {}, options);
        await marcarRascunhoExcluido(invoiceId, origem);
        estado = 'deleted';
        break;
      }
      case 'finalize': {
        if (invoice.status === 'open' && reserva.anterior) {
          estado = 'open';
          break;
        }
        exigirEstado(invoice, ['draft']);
        mutacaoIniciada = true;
        const v = await stripe.invoices.finalizeInvoice(
          invoice.id,
          { auto_advance: false },
          options
        );
        await reconciliarFatura(v.id, local.environment);
        estado = v.status ?? 'desconhecido';
        break;
      }
      case 'send': {
        exigirEstado(invoice, ['open']);
        if (invoice.collection_method !== 'send_invoice')
          throw new HttpError(
            'Esta fatura usa cobrança automática, sem envio manual por esta ação.',
            409
          );
        if (antiga)
          throw new HttpError(
            'Confirme no provedor o envio deste pedido antigo antes de continuar.',
            409
          );
        mutacaoIniciada = true;
        const v = await stripe.invoices.sendInvoice(invoice.id, {}, options);
        await reconciliarFatura(v.id, local.environment);
        estado = v.status ?? 'desconhecido';
        break;
      }
      case 'uncollectible': {
        if (invoice.status === 'uncollectible' && reserva.anterior) {
          estado = 'uncollectible';
          break;
        }
        exigirEstado(invoice, ['open']);
        mutacaoIniciada = true;
        const v = await stripe.invoices.markUncollectible(
          invoice.id,
          {},
          options
        );
        await reconciliarFatura(v.id, local.environment);
        estado = v.status ?? 'desconhecido';
        break;
      }
      case 'cancel_subscription_at_period_end':
      case 'resume_subscription': {
        const subscriptionId = idExterno(
          invoice.parent?.subscription_details?.subscription
        );
        if (!subscriptionId)
          throw new HttpError(
            'Esta fatura não pertence a uma assinatura.',
            409
          );
        const subscription = await stripe.subscriptions.retrieve(
          subscriptionId,
          {},
          OPCOES_DE_LEITURA
        );
        if (!['active', 'trialing', 'past_due'].includes(subscription.status))
          throw new HttpError(
            'Esta assinatura não permite alterar a renovação neste estado.',
            409
          );
        mutacaoIniciada = true;
        const sub = await stripe.subscriptions.update(
          subscriptionId,
          {
            cancel_at_period_end:
              p.action === 'cancel_subscription_at_period_end',
          },
          options
        );
        objetoId = sub.id;
        estado = sub.status;
        renovacaoCancelada = sub.cancel_at_period_end;
        await executeStatement(
          "UPDATE user_subscriptions SET cancel_at_period_end=?,metadata=JSON_SET(COALESCE(metadata,JSON_OBJECT()),'$.stripe_status',?,'$.finance_operation',?) WHERE external_subscription_id=? AND source='stripe' AND status='active'",
          [sub.cancel_at_period_end ? 1 : 0, sub.status, p.requestId, sub.id]
        );
        break;
      }
    }
    const resultado: ResultadoFinanceiro = {
      requestId: p.requestId,
      action: p.action,
      providerObjectId: objetoId,
      providerStatus: estado,
      cancelAtPeriodEnd: renovacaoCancelada,
    };
    await executeStatement(
      "UPDATE billing_admin_operations SET status='succeeded',result=?,error_code=NULL,lease_until=NULL,completed_at=UTC_TIMESTAMP() WHERE request_id=?",
      [JSON.stringify(resultado), p.requestId]
    );
    return resultado;
  } catch (erro) {
    const recusaConfirmada =
      erro instanceof Stripe.errors.StripeError &&
      erro.statusCode !== undefined &&
      erro.statusCode >= 400 &&
      erro.statusCode < 500 &&
      ![409, 429].includes(erro.statusCode);
    const definitivo =
      (!mutacaoIniciada || recusaConfirmada) &&
      !(
        reserva.anterior &&
        ['uncertain', 'reserved'].includes(reserva.anterior.status)
      );
    // Um erro depois de iniciar a chamada externa pode significar que o dinheiro
    // já foi movimentado. Preserva intenção/nonce para retomar sem duplicidade.
    await executeStatement(
      'UPDATE billing_admin_operations SET status=?,error_code=?,lease_until=NULL WHERE request_id=?',
      [
        definitivo ? 'failed' : 'uncertain',
        definitivo ? 'request_rejected' : 'reconciliation_required',
        p.requestId,
      ]
    );
    if (erro instanceof HttpError) throw erro;
    throw new HttpError(
      mutacaoIniciada
        ? 'O resultado no provedor ainda precisa ser confirmado. Retome esta mesma operação; não inicie outro pedido.'
        : 'Não foi possível consultar o provedor. Confira a conexão e a configuração antes de continuar.',
      503
    );
  }
}
export async function listarOperacoes(invoiceId: string) {
  return queryRows<{
    request_id: string;
    action: string;
    status: string;
    parameters: OperacaoFinanceira;
    result: ResultadoFinanceiro | null;
    error_code: string | null;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT request_id,action,status,parameters,result,error_code,created_at,updated_at FROM billing_admin_operations WHERE invoice_record_id=? ORDER BY created_at DESC,request_id DESC LIMIT 100`,
    [invoiceId]
  );
}
