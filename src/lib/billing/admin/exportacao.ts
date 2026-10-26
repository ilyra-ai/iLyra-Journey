import { queryRows, withTransaction } from '@/lib/mysql/pool';

/** Vinculação comprovada, sem inferir titular por nome, e-mail ou chave em uso.
 * Registros fiscais antigos não guardam ambiente: na ausência do vínculo de
 * cliente, só se admite uma referência externa sem ambiguidade entre ambientes.
 */
const FATURAS_DO_TITULAR = `WITH minhas_faturas AS (
  SELECT i.* FROM billing_invoice_records i WHERE
  EXISTS (
    SELECT 1 FROM fiscal_records f
    WHERE f.user_id=? AND f.provider=i.provider AND f.external_invoice_id=i.external_invoice_id
    AND (
      EXISTS (SELECT 1 FROM billing_customers c WHERE c.user_id=f.user_id
        AND c.provider=f.provider AND c.external_customer_id=f.external_customer_id AND c.environment=i.environment)
      OR (NOT EXISTS (SELECT 1 FROM billing_customers c WHERE c.user_id=f.user_id
        AND c.provider=f.provider AND c.external_customer_id=f.external_customer_id)
        AND NOT EXISTS (SELECT 1 FROM billing_invoice_records outra WHERE outra.provider=i.provider
        AND outra.external_invoice_id=i.external_invoice_id AND outra.environment<>i.environment))
    )
  ) OR EXISTS (
    SELECT 1 FROM user_subscriptions s
    WHERE s.user_id=? AND s.source=i.provider AND s.external_subscription_id=i.external_subscription_id
    AND EXISTS (SELECT 1 FROM billing_customers c WHERE c.user_id=s.user_id AND c.provider=s.source
      AND c.external_customer_id=s.external_customer_id AND c.environment=i.environment)
  )
)`;

export async function exportarFinanceiroDoTitular(userId: string) {
  return withTransaction(async (connection) => {
    const parametros = [userId, userId];
    const faturas = await queryRows(
      `${FATURAS_DO_TITULAR} SELECT id,provider,environment,external_invoice_id,invoice_number,
        external_subscription_id,currency_code,status,collection_method,
        CAST(amount_subtotal AS CHAR) amount_subtotal,CAST(amount_total AS CHAR) amount_total,
        CAST(amount_paid AS CHAR) amount_paid,CAST(amount_due AS CHAR) amount_due,
        CAST(amount_remaining AS CHAR) amount_remaining,provider_created_at,paid_at,due_at,voided_at,
        needs_reconciliation,synced_at FROM minhas_faturas ORDER BY provider_created_at,id`,
      parametros,
      connection
    );
    const pagamentos = await queryRows(
      `${FATURAS_DO_TITULAR} SELECT p.invoice_record_id,p.payment_kind,p.external_payment_id,
        p.external_invoice_payment_id,CAST(p.amount_paid AS CHAR) amount_paid
        FROM billing_invoice_payments p JOIN minhas_faturas i ON i.id=p.invoice_record_id
        ORDER BY p.invoice_record_id,p.external_invoice_payment_id`,
      parametros,
      connection
    );
    const reembolsos = await queryRows(
      `${FATURAS_DO_TITULAR} SELECT r.invoice_record_id,r.provider,r.environment,r.external_refund_id,
        r.currency_code,CAST(r.amount AS CHAR) amount,r.status,r.provider_created_at,r.needs_reconciliation,r.synced_at
        FROM billing_refund_records r JOIN minhas_faturas i ON i.id=r.invoice_record_id
        ORDER BY r.provider_created_at,r.id`,
      parametros,
      connection
    );
    const operacoes = await queryRows(
      `${FATURAS_DO_TITULAR} SELECT o.invoice_record_id,o.action,o.status,o.created_at,o.completed_at
        FROM billing_admin_operations o JOIN minhas_faturas i ON i.id=o.invoice_record_id
        ORDER BY o.created_at,o.request_id`,
      parametros,
      connection
    );
    return { faturas, pagamentos, reembolsos, operacoes };
  });
}
