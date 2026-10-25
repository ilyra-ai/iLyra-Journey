'use client';
import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useKeyedResource } from '@/hooks/use-keyed-resource';
import {
  formatarValorFinanceiro,
  valorEmUnidades,
  casasDaMoeda,
} from '@/lib/billing/admin/moedas';
import {
  ACOES_FINANCEIRAS,
  ESTADOS_FINANCEIROS,
  nomeDoAmbiente,
} from '@/lib/billing/admin/rotulos';
import type { carregarDetalheFinanceiro } from '@/lib/billing/admin/consultas';
import type {
  OperacaoFinanceira,
  ResultadoFinanceiro,
} from '@/lib/billing/admin/operacoes';
import { consultarFinanceiro } from './billing-http';
type Detalhe = Awaited<ReturnType<typeof carregarDetalheFinanceiro>>;
type Acao = OperacaoFinanceira['action'];
const avisar = () => {};
const dataUTC = (v: string | null) =>
  v
    ? new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'UTC',
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date(v.replace(' ', 'T') + 'Z'))
    : 'Não informada';
function textoDecimal(v: number, moeda: string) {
  const d = BigInt(10) ** BigInt(casasDaMoeda(moeda)),
    n = BigInt(v);
  return (
    (n / d).toString() +
    (d > BigInt(1)
      ? ',' + (n % d).toString().padStart(casasDaMoeda(moeda), '0')
      : '')
  );
}
function Confirmar({
  detalhe,
  tipo,
  anterior,
  fechar,
  executar,
  ocupado,
}: {
  detalhe: Detalhe;
  tipo: Acao;
  anterior?: OperacaoFinanceira;
  fechar: () => void;
  executar: (p: OperacaoFinanceira) => Promise<void>;
  ocupado: boolean;
}) {
  const f = detalhe.fatura,
    uid = React.useId();
  const [confirmation, setConfirmation] = React.useState('');
  const [requestId] = React.useState(() => crypto.randomUUID());
  const [amount, setAmount] = React.useState(
    anterior?.amount && f.currency_code
      ? textoDecimal(anterior.amount, f.currency_code)
      : ''
  );
  const [paymentId, setPaymentId] = React.useState(
    anterior?.paymentId ??
      detalhe.pagamentos[0]?.external_invoice_payment_id ??
      ''
  );
  const [reason, setReason] = React.useState<OperacaoFinanceira['reason']>(
    anterior?.reason ?? 'requested_by_customer'
  );
  const [erro, setErro] = React.useState('');
  const meta = ACOES_FINANCEIRAS[tipo],
    moeda = f.currency_code ?? '';
  async function enviar(event: React.MouseEvent) {
    event.preventDefault();
    const n = tipo === 'refund' ? valorEmUnidades(amount, moeda) : undefined;
    if (confirmation !== f.external_invoice_id) {
      setErro('Digite o identificador exato da fatura para confirmar.');
      return;
    }
    if (tipo === 'refund' && (!n || !paymentId)) {
      setErro(
        'Escolha o pagamento e informe um valor válido na moeda da fatura.'
      );
      return;
    }
    setErro('');
    const p: OperacaoFinanceira = anterior ?? {
      requestId,
      action: tipo,
      confirmation,
      reason,
      ...(tipo === 'refund' ? { amount: n!, paymentId } : {}),
    };
    await executar(p);
  }
  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !ocupado) fechar();
      }}
    >
      <AlertDialogContent className="max-h-[90dvh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>{meta.nome}</AlertDialogTitle>
          <AlertDialogDescription>
            {meta.efeito} Ambiente:{' '}
            <strong>{nomeDoAmbiente(f.environment)}</strong>.{' '}
            {anterior &&
              'O mesmo identificador será usado em todas as tentativas deste pedido.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {tipo === 'refund' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={uid + '-payment'}>Pagamento desta fatura</Label>
              <select
                id={uid + '-payment'}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                disabled={Boolean(anterior) || ocupado}
                value={paymentId}
                onChange={(e) => setPaymentId(e.target.value)}
              >
                {detalhe.pagamentos.map((p, i) => (
                  <option
                    key={p.external_invoice_payment_id}
                    value={p.external_invoice_payment_id}
                  >
                    Pagamento {i + 1} ·{' '}
                    {formatarValorFinanceiro(p.amount_paid, moeda)} ·{' '}
                    {p.external_invoice_payment_id.slice(-8)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={uid + '-amount'}>
                Valor a reembolsar ({moeda})
              </Label>
              <Input
                id={uid + '-amount'}
                inputMode="decimal"
                autoComplete="off"
                value={amount}
                disabled={Boolean(anterior) || ocupado}
                onChange={(e) => setAmount(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Digite sem separador de milhar. O saldo disponível será
                conferido no provedor antes de enviar.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor={uid + '-reason'}>Motivo</Label>
              <select
                id={uid + '-reason'}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                disabled={Boolean(anterior) || ocupado}
                value={reason}
                onChange={(e) => setReason(e.target.value as typeof reason)}
              >
                <option value="requested_by_customer">
                  Solicitação do cliente
                </option>
                <option value="duplicate">Cobrança duplicada</option>
                <option value="fraudulent">Fraude</option>
              </select>
            </div>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor={uid + '-confirmation'}>
            Para confirmar, digite o identificador abaixo
          </Label>
          <p className="break-all rounded-md bg-muted p-3 text-sm">
            {f.external_invoice_id}
          </p>
          <Input
            id={uid + '-confirmation'}
            autoComplete="off"
            value={confirmation}
            disabled={ocupado}
            onChange={(e) => setConfirmation(e.target.value)}
          />
        </div>
        {erro && (
          <p role="alert" className="text-sm text-destructive">
            {erro}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={ocupado}>Voltar</AlertDialogCancel>
          <AlertDialogAction
            disabled={ocupado || confirmation !== f.external_invoice_id}
            onClick={(e) => void enviar(e)}
          >
            {ocupado ? 'Conferindo no provedor…' : 'Confirmar operação'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
export function BillingInvoiceDialog({
  id,
  fechar,
  alterado,
  configurada,
  ambienteEmUso,
}: {
  id: string;
  fechar: () => void;
  alterado: () => void;
  configurada: boolean;
  ambienteEmUso: string;
}) {
  const url = '/api/admin/faturamento/' + id;
  const request = React.useCallback(
    () => consultarFinanceiro<Detalhe>(url),
    [url]
  );
  const { data, loading, refresh } = useKeyedResource(
    url,
    request,
    avisar,
    null
  );
  const [busy, setBusy] = React.useState(false),
    [erro, setErro] = React.useState(''),
    [acao, setAcao] = React.useState<{
      tipo: Acao;
      anterior?: OperacaoFinanceira;
    } | null>(null);
  async function conferir() {
    setBusy(true);
    setErro('');
    try {
      await consultarFinanceiro<Detalhe>(url + '/reconciliar', {});
      await refresh();
      alterado();
      toast.success('Fatura conferida no provedor.');
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : 'Não foi possível conferir a fatura.'
      );
    } finally {
      setBusy(false);
    }
  }
  async function executar(p: OperacaoFinanceira) {
    setBusy(true);
    setErro('');
    try {
      const r = await consultarFinanceiro<ResultadoFinanceiro>(
        url + '/acoes',
        p
      );
      toast.success(
        `Pedido confirmado no provedor: ${ESTADOS_FINANCEIROS[r.providerStatus] ?? r.providerStatus}.`
      );
      setAcao(null);
      await refresh();
      alterado();
    } catch (e) {
      setAcao(null);
      setErro(
        e instanceof Error
          ? e.message
          : 'Não foi possível confirmar a operação.'
      );
      await refresh();
      alterado();
    } finally {
      setBusy(false);
    }
  }
  const f = data?.fatura;
  const podeOperar = Boolean(
    f &&
    configurada &&
    f.environment === ambienteEmUso &&
    !f.needs_reconciliation
  );
  const pendente = data?.operacoes.some((o) =>
    ['reserved', 'uncertain'].includes(o.status)
  );
  const acoes: Acao[] = f
    ? [
        ...(f.status === 'draft'
          ? (['finalize', 'delete_draft'] as Acao[])
          : []),
        ...(['open', 'uncollectible'].includes(f.status)
          ? (['void'] as Acao[])
          : []),
        ...(f.status === 'open' ? (['uncollectible'] as Acao[]) : []),
        ...(f.status === 'open' && f.collection_method === 'send_invoice'
          ? (['send'] as Acao[])
          : []),
        ...(data?.pagamentos.length &&
        ['paid', 'open', 'uncollectible'].includes(f.status) &&
        f.currency_code
          ? (['refund'] as Acao[])
          : []),
        ...(f.external_subscription_id
          ? ([
              'cancel_subscription_at_period_end',
              'resume_subscription',
            ] as Acao[])
          : []),
      ]
    : [];
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) fechar();
      }}
    >
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto sm:max-w-4xl"
        onEscapeKeyDown={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Detalhes da fatura</DialogTitle>
          <DialogDescription>
            Valores e estado da última conferência, com histórico preservado.
            Todas as datas são UTC.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <p role="status">Carregando a fatura…</p>
        ) : !data || !f ? (
          <div role="alert">
            <p>Não foi possível consultar a fatura.</p>
            <Button variant="outline" onClick={() => void refresh()}>
              Tentar de novo
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-lg border border-border p-4">
              <p className="font-medium">
                {f.invoice_number ?? 'Fatura sem número informado'} ·{' '}
                {ESTADOS_FINANCEIROS[f.status] ?? f.status}
              </p>
              <p className="mt-2 break-all text-sm text-muted-foreground">
                {f.external_invoice_id}
              </p>
              <p className="mt-2 text-sm">
                {nomeDoAmbiente(f.environment)} · Última conferência:{' '}
                {dataUTC(f.synced_at)}
              </p>
              <dl className="mt-4 grid gap-4 sm:grid-cols-3">
                {[
                  ['Valor nominal', f.amount_total],
                  ['Valor quitado', f.amount_paid],
                  ['Restante na fatura', f.amount_remaining],
                ].map(([nome, v]) => (
                  <div key={String(nome)}>
                    <dt className="text-sm text-muted-foreground">{nome}</dt>
                    <dd className="mt-1 font-medium">
                      {formatarValorFinanceiro(
                        v as number | null,
                        f.currency_code
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-sm text-muted-foreground">
                Criada: {dataUTC(f.provider_created_at)} · Quitada:{' '}
                {dataUTC(f.paid_at)}
              </p>
            </div>
            {erro && (
              <p
                role="alert"
                className="rounded-lg border border-destructive p-3 text-sm text-destructive"
              >
                {erro}
              </p>
            )}
            {!podeOperar && (
              <p role="status" className="rounded-lg bg-muted p-4 text-sm">
                {f.needs_reconciliation
                  ? 'Esta fotografia precisa de conferência antes de operar.'
                  : 'Para operar, as chaves da Stripe precisam estar disponíveis e no mesmo ambiente da fatura.'}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={
                  busy ||
                  !configurada ||
                  f.environment !== ambienteEmUso ||
                  f.status === 'deleted'
                }
                onClick={() => void conferir()}
              >
                {busy ? 'Conferindo…' : 'Conferir no provedor'}
              </Button>
              <Button asChild variant="outline">
                <a
                  href={`https://dashboard.stripe.com/${f.environment === 'test' ? 'test/' : ''}invoices/${encodeURIComponent(f.external_invoice_id)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir na Stripe
                </a>
              </Button>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Ações financeiras</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  Cancelar ou reembolsar uma fatura preserva a assinatura. A
                  renovação tem ações próprias e exige confirmação.
                </p>
                {pendente && (
                  <p role="status" className="mb-4 text-sm">
                    Há um pedido em processamento ou com resultado a conferir.
                    Retome o mesmo pedido no histórico abaixo.
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {acoes.map((a) => (
                    <Button
                      key={a}
                      size="sm"
                      variant="outline"
                      className="h-auto min-h-9 max-w-full whitespace-normal text-left"
                      disabled={!podeOperar || busy || pendente}
                      onClick={() => setAcao({ tipo: a })}
                    >
                      {ACOES_FINANCEIRAS[a].nome}
                    </Button>
                  ))}
                </div>
                {acoes.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Este estado não oferece outras ações por aqui.
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Reembolsos vinculados</CardTitle>
              </CardHeader>
              <CardContent>
                {data.reembolsos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum reembolso vinculado foi importado. A atualização
                    completa também mostra os registros ainda sem vínculo.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {data.reembolsos.map((r) => (
                      <li key={r.id} className="space-y-2 py-3">
                        <p className="font-medium">
                          {formatarValorFinanceiro(r.amount, r.currency_code)} ·{' '}
                          {ESTADOS_FINANCEIROS[r.status] ?? r.status}
                        </p>
                        <p className="break-all text-sm text-muted-foreground">
                          {r.external_refund_id} ·{' '}
                          {dataUTC(r.provider_created_at)}
                        </p>
                        {r.status === 'requires_action' && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!podeOperar || busy || pendente}
                            onClick={() =>
                              setAcao({
                                tipo: 'cancel_refund',
                                anterior: {
                                  requestId: crypto.randomUUID(),
                                  action: 'cancel_refund',
                                  confirmation: f.external_invoice_id,
                                  refundId: r.external_refund_id,
                                  reason: 'requested_by_customer',
                                },
                              })
                            }
                          >
                            Cancelar este reembolso
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Histórico de operações</CardTitle>
              </CardHeader>
              <CardContent>
                {data.operacoes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma operação administrativa registrada nesta fatura.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {data.operacoes.map((o) => (
                      <li key={o.request_id} className="space-y-2 py-3">
                        <p className="font-medium">
                          {ACOES_FINANCEIRAS[o.action as Acao]?.nome ??
                            'Operação financeira'}{' '}
                          · {ESTADOS_FINANCEIROS[o.status] ?? o.status}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {dataUTC(o.created_at)} · Pedido{' '}
                          {o.request_id.slice(-8)}
                        </p>
                        {['reserved', 'uncertain'].includes(o.status) && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={
                              busy ||
                              !configurada ||
                              f.environment !== ambienteEmUso
                            }
                            onClick={() =>
                              setAcao({
                                tipo: o.parameters.action,
                                anterior: o.parameters,
                              })
                            }
                          >
                            Retomar o mesmo pedido
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-4 text-xs text-muted-foreground">
                  Até 100 operações e reembolsos por fatura nesta consulta. O
                  registro completo permanece preservado no servidor.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
        {acao && data && (
          <Confirmar
            detalhe={data}
            tipo={acao.tipo}
            anterior={acao.anterior}
            ocupado={busy}
            fechar={() => setAcao(null)}
            executar={executar}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
