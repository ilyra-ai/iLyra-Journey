'use client';
import * as React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { useKeyedResource } from '@/hooks/use-keyed-resource';
import { formatarValorFinanceiro } from '@/lib/billing/admin/moedas';
import {
  ESTADOS_FINANCEIROS,
  NOMES_DE_MOVIMENTOS,
  nomeDoAmbiente,
  nomeDoProvedor,
} from '@/lib/billing/admin/rotulos';
import type { FiltrosFaturamento } from '@/lib/billing/admin/filtros';
import type {
  PainelDeFaturamento,
  FaturaListada,
} from '@/lib/billing/admin/consultas';
import type {
  PainelDeSaldo,
  MovimentoDeSaldo,
} from '@/lib/billing/admin/saldos';
import type { SincronizacaoFinanceira } from '@/lib/billing/admin/sincronizacao';
import { consultarFinanceiro } from './billing-http';
import { BillingInvoiceDialog } from './BillingInvoiceDialog';
const Trend = dynamic(() => import('./BillingTrend'), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full" />,
});
const avisar = () => {};
const campo =
  'h-10 max-w-full rounded-md border border-input bg-background px-3 text-sm';
const N = new Intl.NumberFormat('pt-BR');
const DIA = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'UTC',
  dateStyle: 'short',
});
const HORA = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'UTC',
  dateStyle: 'short',
  timeStyle: 'short',
});
function dataUTC(v: string | null) {
  return v ? HORA.format(new Date(v.replace(' ', 'T') + 'Z')) : 'Não informada';
}
function url(f: FiltrosFaturamento, pagina: number) {
  const p = new URLSearchParams({
    inicio: f.inicio,
    fim: f.fim,
    ambiente: f.ambiente,
    provedor: f.provedor,
    agrupamento: f.agrupamento,
    estado: f.estado,
    pagina: String(pagina),
  });
  if (f.moeda) p.set('moeda', f.moeda);
  return p;
}
function padrao(): FiltrosFaturamento {
  return {
    inicio: new Date(Date.now() - 364 * 86400000).toISOString().slice(0, 10),
    fim: new Date().toISOString().slice(0, 10),
    ambiente: 'live',
    provedor: 'todos',
    agrupamento: 'mes',
    estado: 'todos',
    pagina: 1,
  };
}
function Paginacao({
  pagina,
  total,
  mudar,
  nome,
}: {
  pagina: number;
  total: number;
  mudar: (v: number) => void;
  nome: string;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        {N.format(total)} registros · Página {pagina} de{' '}
        {Math.max(1, Math.ceil(total / 20))}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          aria-label={`Página anterior de ${nome}`}
          disabled={pagina <= 1}
          onClick={() => mudar(pagina - 1)}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          aria-label={`Próxima página de ${nome}`}
          disabled={pagina * 20 >= total}
          onClick={() => mudar(pagina + 1)}
        >
          Próxima
        </Button>
      </div>
    </div>
  );
}
function DadosFatura({
  r,
  abrir,
}: {
  r: FaturaListada;
  abrir: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="font-medium">{r.numero ?? r.externa}</p>
      <p className="break-all text-sm text-muted-foreground">{r.externa}</p>
      <p className="text-sm">
        {nomeDoProvedor(r.provedor)} · {nomeDoAmbiente(r.ambiente)} ·{' '}
        {ESTADOS_FINANCEIROS[r.estado] ?? r.estado}
      </p>
      <dl className="grid grid-cols-2 gap-3 pt-2 text-sm">
        <div>
          <dt className="text-muted-foreground">Valor nominal</dt>
          <dd className="mt-1 font-medium">
            {formatarValorFinanceiro(r.total, r.moeda)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Valor quitado</dt>
          <dd className="mt-1 font-medium">
            {formatarValorFinanceiro(r.pago, r.moeda)}
          </dd>
        </div>
      </dl>
      <p className="text-sm text-muted-foreground">
        {r.legado ? 'Quitação do legado' : 'Criação'}:{' '}
        {dataUTC(r.criada ?? r.quitada)}
      </p>
      {r.legado ? (
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/dashboard?aba=fiscal">Registros fiscais</Link>
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          aria-label={`Detalhes da fatura ${r.numero ?? r.externa}`}
          onClick={() => abrir(r.id)}
        >
          Detalhes e ações
        </Button>
      )}
    </div>
  );
}
function ListaFaturas({
  data,
  abrir,
}: {
  data: PainelDeFaturamento['faturas'];
  abrir: (id: string) => void;
}) {
  if (!data.itens.length)
    return (
      <p className="py-6 text-sm text-muted-foreground">
        Nenhuma fatura importada corresponde aos filtros e à página atual.
        Confira a atualização do histórico antes de interpretar ausência como
        faturamento zero.
      </p>
    );
  return (
    <>
      <ul className="space-y-3 md:hidden" aria-label="Faturas em cartões">
        {data.itens.map((r) => (
          <li key={r.id} className="rounded-lg border border-border p-4">
            <DadosFatura r={r} abrir={abrir} />
          </li>
        ))}
      </ul>
      <div className="hidden md:block">
        <Table
          scrollLabel="Faturas importadas"
          caption="Faturas por criação; legado fiscal por quitação"
        >
          <TableHeader>
            <TableRow>
              {[
                'Fatura',
                'Ambiente / provedor',
                'Estado',
                'Valor nominal',
                'Valor quitado',
                'Criação / legado',
                'Conferir',
              ].map((t) => (
                <TableHead key={t} scope="col">
                  {t}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.itens.map((r) => (
              <TableRow key={r.id}>
                <TableHead scope="row" className="max-w-64 break-all">
                  {r.numero ?? r.externa}
                </TableHead>
                <TableCell>
                  {nomeDoAmbiente(r.ambiente)} · {nomeDoProvedor(r.provedor)}
                </TableCell>
                <TableCell>
                  {ESTADOS_FINANCEIROS[r.estado] ?? r.estado}
                  {Boolean(r.needs_reconciliation) && (
                    <p className="text-xs text-muted-foreground">A conferir</p>
                  )}
                </TableCell>
                <TableCell>
                  {formatarValorFinanceiro(r.total, r.moeda)}
                </TableCell>
                <TableCell>
                  {formatarValorFinanceiro(r.pago, r.moeda)}
                </TableCell>
                <TableCell>{dataUTC(r.criada ?? r.quitada)}</TableCell>
                <TableCell>
                  {r.legado ? (
                    <Button asChild variant="outline" size="sm">
                      <Link href="/admin/dashboard?aba=fiscal">Fiscal</Link>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Detalhes da fatura ${r.numero ?? r.externa}`}
                      onClick={() => abrir(r.id)}
                    >
                      Detalhes
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
function ListaSaldos({ itens }: { itens: MovimentoDeSaldo[] }) {
  if (!itens.length)
    return (
      <p className="py-6 text-sm text-muted-foreground">
        Nenhum movimento de saldo foi importado para este recorte. Isso não
        informa o saldo atual da conta.
      </p>
    );
  return (
    <>
      <ul
        className="space-y-3 md:hidden"
        aria-label="Movimentos de saldo em cartões"
      >
        {itens.map((r) => (
          <li
            key={r.id}
            className="space-y-2 rounded-lg border border-border p-4"
          >
            <p className="font-medium">
              {NOMES_DE_MOVIMENTOS[r.tipo] ?? 'Outro movimento'} ·{' '}
              {nomeDoAmbiente(r.ambiente)}
            </p>
            <p className="text-sm text-muted-foreground">
              {dataUTC(r.data)} UTC ·{' '}
              {ESTADOS_FINANCEIROS[r.estado] ?? r.estado}
            </p>
            <dl className="grid gap-2 text-sm">
              {[
                ['Bruto', r.bruto],
                ['Taxas', r.taxas],
                ['Líquido', r.liquido],
              ].map(([n, v]) => (
                <div key={n} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{n}</dt>
                  <dd className="font-medium">
                    {formatarValorFinanceiro(v, r.moeda)}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="break-all text-xs text-muted-foreground">
              {r.externa}
            </p>
          </li>
        ))}
      </ul>
      <div className="hidden md:block">
        <Table
          scrollLabel="Movimentos de saldo da Stripe"
          caption="Valores exatos de bruto, taxas e líquido do provedor"
        >
          <TableHeader>
            <TableRow>
              {[
                'Data UTC',
                'Movimento',
                'Ambiente',
                'Bruto',
                'Taxas',
                'Líquido',
                'Disponibilidade',
              ].map((t) => (
                <TableHead scope="col" key={t}>
                  {t}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {itens.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{dataUTC(r.data)}</TableCell>
                <TableHead scope="row">
                  <p>{NOMES_DE_MOVIMENTOS[r.tipo] ?? 'Outro movimento'}</p>
                  <p className="mt-1 max-w-64 break-all text-xs font-normal text-muted-foreground">
                    {r.externa} · {r.tipo}
                  </p>
                </TableHead>
                <TableCell>{nomeDoAmbiente(r.ambiente)}</TableCell>
                <TableCell>
                  {formatarValorFinanceiro(r.bruto, r.moeda)}
                </TableCell>
                <TableCell>
                  {formatarValorFinanceiro(r.taxas, r.moeda)}
                </TableCell>
                <TableCell>
                  {formatarValorFinanceiro(r.liquido, r.moeda)}
                </TableCell>
                <TableCell>
                  {ESTADOS_FINANCEIROS[r.estado] ?? r.estado}
                  <p className="text-xs text-muted-foreground">
                    {dataUTC(r.disponivelEm)}
                  </p>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
function Evolucao({
  financeiro,
  saldo,
}: {
  financeiro: PainelDeFaturamento;
  saldo: PainelDeSaldo;
}) {
  const [fonte, setFonte] = React.useState<
    'nominal' | 'quitado' | 'reembolsado' | 'bruto' | 'taxas' | 'liquido'
  >('quitado');
  const base = ['bruto', 'taxas', 'liquido'].includes(fonte)
    ? saldo.serie.map((s) => ({ ...s, provedor: 'stripe' }))
    : financeiro.serie;
  const grupos = [
    ...new Set(
      base.map((s) => [s.ambiente, s.provedor, s.moeda ?? ''].join('|'))
    ),
  ];
  const [grupo, setGrupo] = React.useState('');
  const atual = grupos.includes(grupo) ? grupo : (grupos[0] ?? '');
  const [ambiente, , moeda] = atual.split('|');
  const pontos = base
    .filter((s) => [s.ambiente, s.provedor, s.moeda ?? ''].join('|') === atual)
    .map((s) => ({
      data: s.data,
      valor: (s as unknown as Record<string, string | null>)[fonte],
    }));
  const nomes = {
    nominal: 'Valor nominal de faturas criadas',
    quitado: 'Quitação na data do pagamento',
    reembolsado: 'Reembolsos concluídos na própria data',
    bruto: 'Movimentos brutos de saldo',
    taxas: 'Taxas dos movimentos',
    liquido: 'Variação líquida do saldo',
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução financeira</CardTitle>
        <CardDescription>
          Valor nominal por criação, quitação por pagamento, reembolso na sua
          data e movimentos na data do saldo. Cada fonte tem seu próprio relógio
          UTC.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="financeiro-indicador">O que acompanhar</Label>
            <select
              id="financeiro-indicador"
              className={campo}
              value={fonte}
              onChange={(e) => setFonte(e.target.value as typeof fonte)}
            >
              {Object.entries(nomes).map(([v, n]) => (
                <option key={v} value={v}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="financeiro-serie">Ambiente, provedor e moeda</Label>
            <select
              id="financeiro-serie"
              className={campo}
              value={atual}
              onChange={(e) => setGrupo(e.target.value)}
            >
              {grupos.length ? (
                grupos.map((g) => {
                  const [a, p, m] = g.split('|');
                  return (
                    <option key={g} value={g}>
                      {nomeDoAmbiente(a)} · {nomeDoProvedor(p)} ·{' '}
                      {m || 'Moeda não informada'}
                    </option>
                  );
                })
              ) : (
                <option value="">Sem série importada</option>
              )}
            </select>
          </div>
        </div>
        {pontos.some((p) => p.valor !== null) && moeda ? (
          <Trend pontos={pontos} nome={nomes[fonte]} moeda={moeda} />
        ) : (
          <p className="rounded-lg bg-muted p-5 text-sm">
            Não há valores importados para desenhar esta série. Confira as
            fontes e a atualização do histórico.
          </p>
        )}
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium">
            Ver valores exatos da série
          </summary>
          {pontos.length ? (
            <div className="mt-4">
              <Table
                scrollLabel="Valores exatos da evolução financeira"
                caption={`${nomes[fonte]}: ${nomeDoAmbiente(ambiente)} ${moeda}`}
              >
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Início do agrupamento UTC</TableHead>
                    <TableHead scope="col">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pontos.map((p) => (
                    <TableRow key={p.data}>
                      <TableCell>
                        {DIA.format(new Date(p.data + 'T00:00:00Z'))}
                      </TableCell>
                      <TableCell>
                        {formatarValorFinanceiro(p.valor, moeda)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Sem registros nesta série.
            </p>
          )}
        </details>
        <p className="mt-3 text-xs text-muted-foreground">
          Intervalos sem valor conhecido ficam sem traço. Primeiro e último
          agrupamentos podem ser parciais. Moedas e ambientes são apresentados
          separadamente.
        </p>
      </CardContent>
    </Card>
  );
}
export function AdminBillingContent() {
  const [filtros, setFiltros] = React.useState(padrao),
    [draft, setDraft] = React.useState(filtros);
  const [paginaFaturas, setPaginaFaturas] = React.useState(1),
    [paginaSaldo, setPaginaSaldo] = React.useState(1);
  const [fatura, setFatura] = React.useState<string | null>(null),
    [erro, setErro] = React.useState('');
  const [syncing, setSyncing] = React.useState(false),
    [pausando, setPausando] = React.useState(false),
    [progresso, setProgresso] = React.useState<SincronizacaoFinanceira | null>(
      null
    );
  const pausa = React.useRef(false);
  const key = url(filtros, paginaFaturas).toString() + '|' + paginaSaldo;
  const request = React.useCallback(async () => {
    const [financeiro, saldo] = await Promise.all([
      consultarFinanceiro<PainelDeFaturamento>(
        '/api/admin/faturamento?' + url(filtros, paginaFaturas)
      ),
      consultarFinanceiro<PainelDeSaldo>(
        '/api/admin/faturamento/saldos?' + url(filtros, paginaSaldo)
      ),
    ]);
    return { financeiro, saldo };
  }, [filtros, paginaFaturas, paginaSaldo]);
  const { data, loading, refresh } = useKeyedResource(
    key,
    request,
    avisar,
    null
  );
  const moedas = [
    ...new Set(
      [
        draft.moeda,
        ...(data?.financeiro.resumos.map((r) => r.moeda) ?? []),
        ...(data?.saldo.grupos.map((r) => r.moeda) ?? []),
      ].filter((s): s is string => Boolean(s))
    ),
  ].sort();
  function aplicar(e: React.FormEvent) {
    e.preventDefault();
    const dias =
      (Date.parse(draft.fim) - Date.parse(draft.inicio)) / 86400000 + 1;
    if (
      !Number.isFinite(dias) ||
      dias < 1 ||
      dias > 3660 ||
      (draft.agrupamento === 'dia' && dias > 366) ||
      draft.fim > new Date().toISOString().slice(0, 10)
    ) {
      setErro(
        'Confira as datas: até 366 dias na visão diária ou aproximadamente 10 anos nas visões mensal e anual.'
      );
      return;
    }
    setErro('');
    setFatura(null);
    if (
      JSON.stringify(draft) === JSON.stringify(filtros) &&
      paginaFaturas === 1 &&
      paginaSaldo === 1
    )
      void refresh();
    else {
      setPaginaFaturas(1);
      setPaginaSaldo(1);
      setFiltros(draft);
    }
  }
  async function sincronizar() {
    if (!data) return;
    setSyncing(true);
    setPausando(false);
    pausa.current = false;
    setErro('');
    const ambiente = data.financeiro.conexao.ambiente as 'test' | 'live';
    let id = data.financeiro.sincronizacoes.find(
      (r) => r.environment === ambiente && r.stage !== 'completed'
    )?.id;
    try {
      while (!pausa.current) {
        const run = await consultarFinanceiro<SincronizacaoFinanceira>(
          '/api/admin/faturamento/sincronizar',
          { ambiente, ...(id ? { runId: id } : {}) }
        );
        id = run.id;
        setProgresso(run);
        if (run.stage === 'completed') {
          toast.success('Histórico financeiro atualizado.');
          break;
        }
      }
    } catch (e) {
      setErro(
        e instanceof Error
          ? e.message
          : 'Não foi possível atualizar o histórico.'
      );
    } finally {
      setSyncing(false);
      setPausando(false);
      await refresh();
    }
  }
  const fn = data?.financeiro;
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Faturamento com origem conferível</CardTitle>
          <CardDescription>
            Faturas, reembolsos, taxas e movimentos de saldo. Os valores de
            moedas e ambientes diferentes permanecem separados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={aplicar}
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          >
            {(['inicio', 'fim'] as const).map((k) => (
              <div key={k} className="min-w-0 space-y-2">
                <Label htmlFor={'fat-' + k}>
                  {k === 'inicio' ? 'De' : 'Até'}
                </Label>
                <Input
                  id={'fat-' + k}
                  type="date"
                  min="2000-01-01"
                  max={new Date().toISOString().slice(0, 10)}
                  required
                  value={draft[k]}
                  onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                />
              </div>
            ))}
            <div className="flex min-w-0 flex-col gap-2">
              <Label htmlFor="fat-ambiente">Ambiente</Label>
              <select
                id="fat-ambiente"
                className={campo}
                value={draft.ambiente}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    ambiente: e.target.value as typeof draft.ambiente,
                  })
                }
              >
                <option value="live">Produção</option>
                <option value="test">Teste</option>
                <option value="legado">Legado sem ambiente</option>
                <option value="todos">Todos, separados</option>
              </select>
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <Label htmlFor="fat-provedor">Provedor</Label>
              <select
                id="fat-provedor"
                className={campo}
                value={draft.provedor}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    provedor: e.target.value as typeof draft.provedor,
                  })
                }
              >
                <option value="todos">Todos</option>
                <option value="stripe">Stripe</option>
                <option value="mercado_pago">Mercado Pago</option>
                <option value="paypal">PayPal</option>
              </select>
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <Label htmlFor="fat-moeda">Moeda</Label>
              <select
                id="fat-moeda"
                className={campo}
                value={draft.moeda ?? ''}
                onChange={(e) =>
                  setDraft({ ...draft, moeda: e.target.value || undefined })
                }
              >
                <option value="">Todas, separadas</option>
                {moedas.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <Label htmlFor="fat-grupo">Agrupar por</Label>
              <select
                id="fat-grupo"
                className={campo}
                value={draft.agrupamento}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    agrupamento: e.target.value as typeof draft.agrupamento,
                  })
                }
              >
                <option value="dia">Dia</option>
                <option value="mes">Mês</option>
                <option value="ano">Ano</option>
              </select>
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <Label htmlFor="fat-estado">Estado das faturas</Label>
              <select
                id="fat-estado"
                className={campo}
                value={draft.estado}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    estado: e.target.value as typeof draft.estado,
                  })
                }
              >
                <option value="todos">Todos</option>
                {[
                  'draft',
                  'open',
                  'paid',
                  'void',
                  'uncollectible',
                  'deleted',
                  'desconhecido',
                ].map((s) => (
                  <option key={s} value={s}>
                    {ESTADOS_FINANCEIROS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <Button type="submit" disabled={loading || syncing}>
                Aplicar filtros
              </Button>
              <Button
                variant="outline"
                type="button"
                disabled={loading || syncing}
                onClick={() => void refresh()}
              >
                Recarregar
              </Button>
            </div>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            UTC, com o dia final incluído. O estado filtra somente faturas;
            reembolsos e saldo têm seus próprios estados e datas.
          </p>
        </CardContent>
      </Card>
      {erro && (
        <Alert variant="destructive">
          <AlertTitle>Confira a consulta</AlertTitle>
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}
      {loading ? (
        <div role="status" aria-label="Carregando o faturamento">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="mt-6 h-72 w-full" />
        </div>
      ) : !data || !fn ? (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível carregar o faturamento</AlertTitle>
          <AlertDescription>
            Os valores estão indisponíveis. A falha não será apresentada como
            faturamento zero.
          </AlertDescription>
          <Button
            variant="outline"
            className="mt-3"
            onClick={() => void refresh()}
          >
            Tentar de novo
          </Button>
        </Alert>
      ) : (
        <>
          <p role="status" className="text-sm text-muted-foreground">
            Período aplicado:{' '}
            {DIA.format(new Date(fn.filtros.inicio + 'T00:00:00Z'))} a{' '}
            {DIA.format(new Date(fn.filtros.fim + 'T00:00:00Z'))} ·{' '}
            {nomeDoAmbiente(
              fn.filtros.ambiente === 'todos' ? 'todos' : fn.filtros.ambiente
            )}{' '}
            · Consulta em {HORA.format(new Date(fn.atualizadoEm))} UTC.
          </p>
          <Card>
            <CardHeader>
              <CardTitle>Atualização do histórico</CardTitle>
              <CardDescription>
                Somente a Stripe tem cobrança integrada ao app. Mercado Pago e
                PayPal continuam com configuração e teste de conexão; registros
                fiscais legados permanecem consultáveis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">
                {fn.conexao.configurada
                  ? 'Chave da API disponível'
                  : 'Chave da Stripe não configurada'}{' '}
                · Ambiente em uso: {nomeDoAmbiente(fn.conexao.ambiente)} ·
                Webhook{' '}
                {fn.conexao.webhookConfigurado
                  ? 'com segredo configurado'
                  : 'sem segredo configurado'}
                .
              </p>
              <p className="text-sm text-muted-foreground">
                A atualização lê páginas reais de faturas, pagamentos,
                reembolsos e movimentos até o instante em que começou. Pode ser
                pausada e retomada. Dados ainda não importados não são
                considerados ausência de transações.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={!fn.conexao.configurada || syncing}
                  onClick={() => void sincronizar()}
                >
                  {syncing
                    ? 'Atualizando…'
                    : `Atualizar conta da Stripe (${nomeDoAmbiente(fn.conexao.ambiente)})`}
                </Button>
                {syncing && (
                  <Button
                    variant="outline"
                    disabled={pausando}
                    onClick={() => {
                      pausa.current = true;
                      setPausando(true);
                    }}
                  >
                    {pausando ? 'Pausando…' : 'Pausar após esta página'}
                  </Button>
                )}
                <Button asChild variant="outline">
                  <Link href="/admin/payments">Configurar pagamentos</Link>
                </Button>
              </div>
              {progresso && (
                <p role="status" className="text-sm">
                  {progresso.stage === 'completed'
                    ? 'Concluída'
                    : 'Páginas processadas'}
                  : {N.format(progresso.imported_invoices)} faturas,{' '}
                  {N.format(progresso.imported_payments)} pagamentos,{' '}
                  {N.format(progresso.imported_refunds)} reembolsos e{' '}
                  {N.format(progresso.imported_balances)} movimentos.
                </p>
              )}
              {fn.sincronizacoes.length ? (
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {fn.sincronizacoes.slice(0, 3).map((r) => (
                    <li key={r.id}>
                      {nomeDoAmbiente(r.environment)} ·{' '}
                      {r.stage === 'completed'
                        ? 'Leitura concluída'
                        : 'Leitura parcial, retomável'}{' '}
                      · Início {dataUTC(r.created_at)} UTC ·{' '}
                      {r.completed_at
                        ? 'Fim ' + dataUTC(r.completed_at) + ' UTC'
                        : 'Ainda sem conclusão'}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhuma leitura completa da conta foi registrada. O histórico
                  disponível pode estar incompleto.
                </p>
              )}
            </CardContent>
          </Card>
          <section aria-labelledby="fat-faturas-criadas" className="space-y-4">
            <h3
              id="fat-faturas-criadas"
              className="font-display text-lg font-semibold"
            >
              Faturas criadas no período
            </h3>
            <p className="text-sm text-muted-foreground">
              Estado e quitação acumulada dessas faturas na última conferência.
              No legado, o período usa a data de quitação, pois a criação não
              foi registrada. Totais nominais incluem rascunhos e cancelamentos.
            </p>
            {fn.resumos.length ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {fn.resumos.map((r) => (
                  <Card key={[r.ambiente, r.provedor, r.moeda].join('|')}>
                    <CardHeader>
                      <CardTitle>
                        {nomeDoProvedor(r.provedor)} ·{' '}
                        {r.moeda ?? 'Moeda não informada'}
                      </CardTitle>
                      <CardDescription>
                        {nomeDoAmbiente(r.ambiente)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <dl className="grid gap-4 sm:grid-cols-2">
                        {[
                          ['Faturas', N.format(r.faturas)],
                          [
                            'Valor nominal',
                            formatarValorFinanceiro(r.valorNominal, r.moeda),
                          ],
                          [
                            'Quitação acumulada',
                            formatarValorFinanceiro(r.valorQuitado, r.moeda),
                          ],
                          [
                            'Saldo de faturas abertas',
                            formatarValorFinanceiro(r.saldoAberto, r.moeda),
                          ],
                        ].map(([n, v]) => (
                          <div key={n}>
                            <dt className="text-sm text-muted-foreground">
                              {n}
                            </dt>
                            <dd className="mt-1 font-display text-xl font-semibold">
                              {v}
                            </dd>
                          </div>
                        ))}
                      </dl>
                      <p className="mt-4 text-sm text-muted-foreground">
                        {r.quitadas} quitadas · {r.abertas} abertas ·{' '}
                        {r.vencidas} vencidas · {r.canceladas} canceladas ·{' '}
                        {r.rascunhos} rascunhos · {r.inadimplentes} em
                        inadimplência assumida · {r.excluidas} rascunhos
                        excluídos
                      </p>
                      {(r.semValorPago > 0 ||
                        r.semValorTotal > 0 ||
                        r.pendentesConciliacao > 0) && (
                        <p className="mt-3 text-sm text-muted-foreground">
                          Cobertura parcial: {r.semValorPago} sem valor pago,{' '}
                          {r.semValorTotal} sem total e {r.pendentesConciliacao}{' '}
                          aguardando conciliação.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="rounded-lg bg-muted p-5 text-sm">
                Nenhuma fatura importada neste recorte. Confira a cobertura do
                histórico antes de concluir que não houve faturamento.
              </p>
            )}
          </section>
          <Card>
            <CardHeader>
              <CardTitle>Reembolsos no período</CardTitle>
              <CardDescription>
                Data de criação do reembolso, sem herdar o período ou o estado
                da fatura. Pedido pendente não é devolução concluída.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {fn.reembolsos.length ? (
                <ul className="grid gap-4 lg:grid-cols-2">
                  {fn.reembolsos.map((r) => (
                    <li
                      key={[r.ambiente, r.provedor, r.moeda].join('|')}
                      className="space-y-2 rounded-lg border border-border p-4"
                    >
                      <p className="font-medium">
                        {nomeDoProvedor(r.provedor)} ·{' '}
                        {nomeDoAmbiente(r.ambiente)} ·{' '}
                        {r.moeda ?? 'Moeda não informada'}
                      </p>
                      <p>
                        Concluídos:{' '}
                        {formatarValorFinanceiro(r.valorConcluido, r.moeda)} ·{' '}
                        {r.concluidos} registros
                      </p>
                      <p className="text-sm">
                        Pendentes:{' '}
                        {formatarValorFinanceiro(r.valorPendente, r.moeda)} ·
                        Falhos: {r.falhos} · Cancelados: {r.cancelados}
                      </p>
                      {r.semVinculo > 0 && (
                        <p className="text-sm text-muted-foreground">
                          {r.semVinculo} sem vínculo inequívoco com uma fatura;
                          nenhum rateio foi inventado.
                        </p>
                      )}
                      {r.semValor > 0 && (
                        <p className="text-sm text-muted-foreground">
                          {r.semValor} sem valor informado; soma parcial.
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum reembolso foi importado para este recorte.
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Bruto, taxas e líquido no saldo da Stripe</CardTitle>
              <CardDescription>
                Movimentos reais do provedor, incluindo repasses e ajustes com
                seus sinais. Líquido = bruto menos taxas por movimento. A soma é
                variação do saldo, não lucro ou receita contábil.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.saldo.grupos.length ? (
                <ul className="grid gap-3 md:grid-cols-2">
                  {data.saldo.grupos.map((r) => (
                    <li
                      key={[
                        r.ambiente,
                        r.moeda,
                        r.tipo,
                        r.categoria,
                        r.estado,
                      ].join('|')}
                      className="rounded-lg border border-border p-4"
                    >
                      <p className="font-medium">
                        {NOMES_DE_MOVIMENTOS[r.tipo] ?? 'Outro movimento'} ·{' '}
                        {r.moeda}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {nomeDoAmbiente(r.ambiente)} ·{' '}
                        {ESTADOS_FINANCEIROS[r.estado] ?? r.estado} ·{' '}
                        {r.movimentos} movimentos
                      </p>
                      <dl className="mt-3 space-y-2 text-sm">
                        {[
                          ['Bruto', r.bruto],
                          ['Taxas', r.taxas],
                          ['Líquido', r.liquido],
                        ].map(([n, v]) => (
                          <div
                            key={n}
                            className="flex flex-wrap justify-between gap-2"
                          >
                            <dt className="text-muted-foreground">{n}</dt>
                            <dd className="font-medium">
                              {formatarValorFinanceiro(v, r.moeda)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum movimento importado. O líquido e as taxas estão sem
                  cobertura neste recorte, não em zero confirmado.
                </p>
              )}
            </CardContent>
          </Card>
          <Evolucao financeiro={fn} saldo={data.saldo} />
          <Card>
            <CardHeader>
              <CardTitle>Faturas e ações</CardTitle>
              <CardDescription>
                Confira os valores de origem e o estado antes de cancelar,
                reembolsar ou alterar a renovação. Registros fiscais são
                preservados.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ListaFaturas data={fn.faturas} abrir={setFatura} />
              <Paginacao
                pagina={paginaFaturas}
                total={fn.faturas.total}
                mudar={setPaginaFaturas}
                nome="faturas"
              />
              {fn.semData > 0 && (
                <p className="mt-3 text-sm text-muted-foreground">
                  {fn.semData} faturas sem data de criação ou quitação ficam
                  fora dos recortes temporais.
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Movimentos de saldo</CardTitle>
              <CardDescription>
                Valores exatos e identificação do registro na Stripe.
                Disponibilidade é o último estado importado; não informa o saldo
                bancário atual.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ListaSaldos itens={data.saldo.itens} />
              <Paginacao
                pagina={paginaSaldo}
                total={data.saldo.total}
                mudar={setPaginaSaldo}
                nome="movimentos"
              />
            </CardContent>
          </Card>
          <details className="rounded-xl border border-border p-5">
            <summary className="cursor-pointer font-medium">
              Fontes, fórmulas e limites
            </summary>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <p>
                Faturas e pagamentos vêm da API e dos webhooks autenticados da
                Stripe. O registro fiscal original é uma fonte histórica
                separada; sem prova de ambiente permanece como legado. A mesma
                fatura não é contada duas vezes.
              </p>
              <p>
                Valor nominal é a soma do total das faturas criadas no
                intervalo, inclusive rascunhos e canceladas. Quitação acumulada
                é o amount_paid dessas mesmas faturas no último estado recebido.
                A série de quitação usa paid_at; a série de refund usa a data do
                próprio reembolso. Créditos podem quitar uma fatura sem nova
                entrada de dinheiro.
              </p>
              <p>
                Movimentos de saldo fornecem amount, fee e net diretamente.
                Repasses, transferências, contestação e ajustes têm sinais
                próprios e permanecem identificados. Não somamos valor de fatura
                com movimento de saldo, nem moedas ou ambientes diferentes.
              </p>
              <p>
                Data inicial inclusiva e dia seguinte à data final exclusivo, em
                UTC. Visões por dia, mês ou ano; hoje e os agrupamentos de borda
                podem estar incompletos. Dados ausentes não viram valor pago
                fictício. Intervalos ainda não importados não são histórico
                comprovado.
              </p>
              <p>
                Operações exigem confirmação, administrador e estado/ambiente
                validados no provedor. A intenção é persistida antes da chamada.
                Pedido com resultado ambíguo é retomado pelo mesmo
                identificador. Reembolso e cancelamento de fatura não encerram
                assinatura; renovação tem controle próprio.
              </p>
            </div>
          </details>
        </>
      )}
      {fatura && fn && (
        <BillingInvoiceDialog
          id={fatura}
          fechar={() => setFatura(null)}
          alterado={() => void refresh()}
          configurada={fn.conexao.configurada}
          ambienteEmUso={fn.conexao.ambiente}
        />
      )}
    </div>
  );
}
