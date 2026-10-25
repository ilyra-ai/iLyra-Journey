import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { executeStatement, queryRows, withTransaction } from '@/lib/mysql/pool';
import { HttpError } from '@/lib/http-error';
import {
  contextoFinanceiro,
  OPCOES_DE_LEITURA,
  reconciliarReembolso,
} from './provedor';
import {
  persistirFatura,
  persistirReembolso,
  persistirVinculo,
  persistirMovimentoSaldo,
  idExterno,
  type OrigemFinanceira,
} from './espelhos';

export const sincronizacaoSchema = z
  .object({ ambiente: z.enum(['test', 'live']), runId: z.uuid().optional() })
  .strict();
export interface SincronizacaoFinanceira {
  id: string;
  environment: 'test' | 'live';
  stage: 'invoices' | 'payments' | 'refunds' | 'balances' | 'completed';
  provider_account_id: string;
  provider_cursor: string | null;
  imported_invoices: number;
  imported_payments: number;
  imported_refunds: number;
  imported_balances: number;
  lease_until: string | null;
  lease_token: string | null;
  error_code: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}
const lerRun = async (id: string) => {
  const [row] = await queryRows<SincronizacaoFinanceira>(
    'SELECT * FROM billing_admin_sync_runs WHERE id=?',
    [id]
  );
  if (!row) throw new HttpError('Sincronização não encontrada.', 404);
  return row;
};
/** Uma página real por pedido HTTP, retomável e limitada; não mantém conexão aberta enquanto chama a Stripe. */
export async function sincronizarPagina(
  entrada: z.infer<typeof sincronizacaoSchema>,
  actor: string
) {
  const p = sincronizacaoSchema.parse(entrada),
    { stripe } = await contextoFinanceiro(p.ambiente);
  const conta = await stripe.accounts.retrieveCurrent({}, OPCOES_DE_LEITURA);
  const token = randomUUID();
  const run = await withTransaction(async (db) => {
    if (!p.runId) {
      const id = randomUUID();
      await db.execute(
        "INSERT INTO billing_admin_sync_runs(id,environment,actor_user_id,stage,provider_account_id,lease_until,lease_token) VALUES(?,?,?,'invoices',?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 90 SECOND),?)",
        [id, p.ambiente, actor, conta.id, token]
      );
      return (
        await queryRows<SincronizacaoFinanceira>(
          'SELECT * FROM billing_admin_sync_runs WHERE id=?',
          [id],
          db
        )
      )[0];
    }
    const [r] = await queryRows<SincronizacaoFinanceira>(
      'SELECT * FROM billing_admin_sync_runs WHERE id=? FOR UPDATE',
      [p.runId],
      db
    );
    if (!r) throw new HttpError('Sincronização não encontrada.', 404);
    if (r.environment !== p.ambiente || r.provider_account_id !== conta.id)
      throw new HttpError(
        'A sincronização pertence a outro ambiente ou conta da Stripe.',
        409
      );
    if (r.stage === 'completed') return r;
    if (
      r.lease_until &&
      Date.parse(r.lease_until.replace(' ', 'T') + 'Z') > Date.now()
    )
      throw new HttpError(
        'Uma página desta sincronização ainda está em andamento. Aguarde antes de retomar.',
        409
      );
    await db.execute(
      'UPDATE billing_admin_sync_runs SET lease_until=DATE_ADD(UTC_TIMESTAMP(),INTERVAL 90 SECOND),lease_token=?,error_code=NULL WHERE id=?',
      [token, r.id]
    );
    return r;
  });
  if (run.stage === 'completed') return run;
  try {
    const [clock] = await queryRows<{ agora: string }>(
      'SELECT UTC_TIMESTAMP(3) agora'
    );
    const origem: OrigemFinanceira = {
      ambiente: p.ambiente,
      instante: 0,
      canonica: true,
      leituraIniciadaEm: clock.agora,
    };
    const corte = Math.floor(
      Date.parse(run.created_at.replace(' ', 'T') + 'Z') / 1000
    );
    const criadas = { created: { lt: corte } };
    const cursor = run.provider_cursor
      ? { starting_after: run.provider_cursor }
      : {};
    if (run.stage === 'invoices') {
      const pagina = await stripe.invoices.list(
        { limit: 25, ...criadas, ...cursor },
        OPCOES_DE_LEITURA
      );
      for (const invoice of pagina.data) {
        if (invoice.livemode !== (p.ambiente === 'live'))
          throw new HttpError(
            'Uma fatura da página pertence a outro ambiente.',
            502
          );
        await persistirFatura(invoice, origem);
      }
      const proximo = pagina.data.at(-1)?.id;
      if (pagina.has_more && !proximo)
        throw new HttpError(
          'O provedor retornou paginação inconsistente.',
          502
        );
      await executeStatement(
        'UPDATE billing_admin_sync_runs SET stage=?,provider_cursor=?,imported_invoices=imported_invoices+?,lease_until=NULL,lease_token=NULL,error_code=NULL WHERE id=? AND lease_token=?',
        [
          pagina.has_more ? 'invoices' : 'payments',
          pagina.has_more ? proximo : null,
          pagina.data.length,
          run.id,
          token,
        ]
      );
    } else if (run.stage === 'payments') {
      const pagina = await stripe.invoicePayments.list(
        { limit: 25, ...criadas, status: 'paid', ...cursor },
        OPCOES_DE_LEITURA
      );
      for (const payment of pagina.data) {
        if (payment.livemode !== (p.ambiente === 'live'))
          throw new HttpError('Um pagamento pertence a outro ambiente.', 502);
        const [f] = await queryRows<{ id: string }>(
          "SELECT id FROM billing_invoice_records WHERE environment=? AND external_invoice_id=? AND provider='stripe'",
          [p.ambiente, idExterno(payment.invoice)]
        );
        if (f) await persistirVinculo(f.id, payment);
      }
      const proximo = pagina.data.at(-1)?.id;
      if (pagina.has_more && !proximo)
        throw new HttpError(
          'O provedor retornou paginação inconsistente.',
          502
        );
      await executeStatement(
        'UPDATE billing_admin_sync_runs SET stage=?,provider_cursor=?,imported_payments=imported_payments+?,lease_until=NULL,lease_token=NULL,error_code=NULL WHERE id=? AND lease_token=?',
        [
          pagina.has_more ? 'payments' : 'refunds',
          pagina.has_more ? proximo : null,
          pagina.data.length,
          run.id,
          token,
        ]
      );
    } else if (run.stage === 'refunds') {
      const pagina = await stripe.refunds.list(
        { limit: 25, ...criadas, ...cursor },
        OPCOES_DE_LEITURA
      );
      for (const refund of pagina.data)
        await persistirReembolso(refund, origem);
      const proximo = pagina.data.at(-1)?.id;
      if (pagina.has_more && !proximo)
        throw new HttpError(
          'O provedor retornou paginação inconsistente.',
          502
        );
      await executeStatement(
        'UPDATE billing_admin_sync_runs SET stage=?,provider_cursor=?,imported_refunds=imported_refunds+?,lease_until=NULL,lease_token=NULL,error_code=NULL WHERE id=? AND lease_token=?',
        [
          pagina.has_more ? 'refunds' : 'balances',
          pagina.has_more ? proximo : null,
          pagina.data.length,
          run.id,
          token,
        ]
      );
    } else {
      const pagina = await stripe.balanceTransactions.list(
        { limit: 25, ...criadas, ...cursor },
        OPCOES_DE_LEITURA
      );
      for (const t of pagina.data) await persistirMovimentoSaldo(t, p.ambiente);
      const proximo = pagina.data.at(-1)?.id;
      if (pagina.has_more && !proximo)
        throw new HttpError(
          'O provedor retornou paginação inconsistente.',
          502
        );
      await executeStatement(
        'UPDATE billing_admin_sync_runs SET stage=?,provider_cursor=?,imported_balances=imported_balances+?,completed_at=IF(?,NULL,UTC_TIMESTAMP()),lease_until=NULL,lease_token=NULL,error_code=NULL WHERE id=? AND lease_token=?',
        [
          pagina.has_more ? 'balances' : 'completed',
          pagina.has_more ? proximo : null,
          pagina.data.length,
          pagina.has_more,
          run.id,
          token,
        ]
      );
    }
    return lerRun(run.id);
  } catch (erro) {
    await executeStatement(
      "UPDATE billing_admin_sync_runs SET lease_until=NULL,lease_token=NULL,error_code='provider_sync_failed' WHERE id=? AND lease_token=?",
      [run.id, token]
    );
    if (erro instanceof HttpError) throw erro;
    throw new HttpError(
      'A atualização do provedor foi interrompida. As páginas concluídas foram preservadas; retome a mesma sincronização.',
      503
    );
  }
}
/** Atualização individual de refund para recuperação de estados ambíguos. */
export async function atualizarReembolso(id: string) {
  const [r] = await queryRows<{
    environment: 'test' | 'live';
    external_refund_id: string;
    invoice_record_id: string | null;
  }>(
    'SELECT environment,external_refund_id,invoice_record_id FROM billing_refund_records WHERE id=?',
    [id]
  );
  if (!r) throw new HttpError('Reembolso não encontrado.', 404);
  return reconciliarReembolso(
    r.external_refund_id,
    r.environment,
    r.invoice_record_id ?? undefined
  );
}
