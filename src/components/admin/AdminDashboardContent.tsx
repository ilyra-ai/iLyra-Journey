'use client';
import { MeiosDePagamento } from './MeiosDePagamento';
import { AdminFiscalRecordsContent } from './AdminFiscalRecordsContent';
import { AdminBillingContent } from './AdminBillingContent';
import * as React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Activity,
  ArrowUpRight,
  CheckCircle,
  RefreshCw,
  UserPlus,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/context/AuthContext';
import { useKeyedResource } from '@/hooks/use-keyed-resource';
import {
  DOMINIOS,
  percentual,
  variacao,
  type FiltrosAnaliticos,
  type PaginaDetalhes,
  type PainelAnalitico,
} from '@/lib/admin/analytics/definicoes';
import { padraoDoPeriodo } from '@/lib/admin/analytics/periodo';
import { AdminDashboardTabs } from './AdminDashboardTabs';
const Trend = dynamic(() => import('./DashboardTrend'), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full" />,
});
const FALHA = null;
const INTEIRO = new Intl.NumberFormat('pt-BR');
const DECIMAL = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const DATA = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'UTC',
  dateStyle: 'short',
});
const HORA = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'UTC',
  dateStyle: 'short',
  timeStyle: 'short',
});
const campoSelect =
  'h-10 max-w-full rounded-md border border-input bg-background px-3 text-sm';
function avisar() {
  /* A falha já tem estado acionável; não registra dados pessoais no console. */
}
async function ler<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error('Não foi possível consultar os dados.');
  return r.json() as Promise<T>;
}
function comparar(atual: number, anterior: number) {
  const v = variacao(atual, anterior);
  return v === null
    ? `Anterior: ${INTEIRO.format(anterior)} · sem base para variação percentual`
    : `Anterior: ${INTEIRO.format(anterior)} · ${v > 0 ? '+' : ''}${DECIMAL.format(v)}%`;
}
function Paginacao({
  pagina,
  total,
  mudar,
}: {
  pagina: number;
  total: number;
  mudar: (p: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
      <p className="text-sm text-muted-foreground">
        {INTEIRO.format(total)} registros · Página {pagina} de{' '}
        {Math.max(1, Math.ceil(total / 20))}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={pagina <= 1}
          onClick={() => mudar(pagina - 1)}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pagina * 20 >= total}
          onClick={() => mudar(pagina + 1)}
        >
          Próxima
        </Button>
      </div>
    </div>
  );
}
const ESTADOS: Record<string, string> = {
  concluido: 'Concluído',
  processando: 'Processando',
  erro: 'Erro',
  fila: 'Na fila',
  pronto: 'Pronto',
  pendente: 'Pendente',
  gerando: 'Gerando',
  pronta: 'Pronta',
  scheduled: 'Agendada',
  completed: 'Concluída',
  cancelled: 'Cancelada',
  canceled: 'Cancelada',
  in_progress: 'Em andamento',
  paused: 'Pausada',
};
function Registros({ dados }: { dados: PaginaDetalhes }) {
  return dados.total === 0 ? (
    <p className="py-6 text-sm text-muted-foreground">
      Nenhum registro neste período e plano.
    </p>
  ) : (
    <>
      <ul
        className="space-y-3 md:hidden"
        aria-label="Registros administrativos em cartões"
      >
        {dados.itens.map((r) => (
          <li
            key={r.id}
            className="space-y-2 rounded-lg border border-border p-4"
          >
            <p className="font-medium">{ESTADOS[r.estado] ?? r.estado}</p>
            <p className="text-sm text-muted-foreground">
              <time dateTime={r.data}>{HORA.format(new Date(r.data))} UTC</time>
            </p>
            <p className="break-all text-sm">{r.email}</p>
            <p className="text-sm text-muted-foreground">
              {DOMINIOS[r.dominio as keyof typeof DOMINIOS]?.nome ?? r.dominio}{' '}
              · {r.id.slice(-8)}
            </p>
          </li>
        ))}
      </ul>
      <div className="hidden md:block">
        <Table
          scrollLabel="Registros administrativos"
          caption="Metadados dos registros consultados"
        >
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Quando (UTC)</TableHead>
              <TableHead scope="col">Conta</TableHead>
              <TableHead scope="col">Registro</TableHead>
              <TableHead scope="col">Estado atual / evento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dados.itens.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <time dateTime={r.data}>{HORA.format(new Date(r.data))}</time>
                </TableCell>
                <TableCell className="max-w-64 break-all">{r.email}</TableCell>
                <TableCell className="max-w-64 break-all">
                  <span title={r.id}>
                    {DOMINIOS[r.dominio as keyof typeof DOMINIOS]?.nome ??
                      r.dominio}{' '}
                    · {r.id.slice(-8)}
                  </span>
                </TableCell>
                <TableCell>{ESTADOS[r.estado] ?? r.estado}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
function Detalhes({
  tipo,
  filtros,
  fechar,
}: {
  tipo: string;
  filtros: FiltrosAnaliticos;
  fechar: () => void;
}) {
  const [pagina, setPagina] = React.useState(1);
  const url =
    '/api/admin/dashboard?' +
    new URLSearchParams({ ...filtros, detalhe: tipo, pagina: String(pagina) });
  const request = React.useCallback(() => ler<PaginaDetalhes>(url), [url]);
  const { data, loading, refresh } = useKeyedResource(
    url,
    request,
    avisar,
    null
  );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) fechar();
      }}
    >
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {tipo === 'cadastros'
              ? 'Cadastros'
              : tipo === 'atividade'
                ? 'Contas com atividade registrada'
                : DOMINIOS[tipo as keyof typeof DOMINIOS].nome}
          </DialogTitle>
          <DialogDescription>
            Mesmos filtros do painel:{' '}
            {DATA.format(new Date(filtros.inicio + 'T00:00:00Z'))} a{' '}
            {DATA.format(new Date(filtros.fim + 'T00:00:00Z'))}. Somente
            metadados; nenhum conteúdo pessoal.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <p role="status">Carregando registros…</p>
        ) : !data ? (
          <div role="alert">
            <p>Não foi possível carregar os detalhes.</p>
            <Button variant="outline" onClick={() => void refresh()}>
              Tentar de novo
            </Button>
          </div>
        ) : (
          <>
            <Registros dados={data} />
            <Paginacao pagina={pagina} total={data.total} mudar={setPagina} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
function Indicador({
  titulo,
  valor,
  descricao,
  comparacao,
  icone: Icon,
  acao,
}: {
  titulo: string;
  valor: string;
  descricao: string;
  comparacao: string;
  icone: React.ElementType;
  acao?: () => void;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-muted-foreground">{titulo}</h3>
        <Icon aria-hidden className="size-4 text-primary" />
      </div>
      <p className="mt-3 font-display text-3xl font-semibold tabular-nums">
        {valor}
      </p>
      <p className="mt-2 text-sm">{descricao}</p>
      <p className="mt-2 text-sm text-muted-foreground">{comparacao}</p>
      {acao && (
        <Button
          variant="link"
          className="mt-2 h-auto max-w-full justify-start whitespace-normal p-0 text-left"
          onClick={acao}
        >
          Conferir {titulo.toLocaleLowerCase('pt-BR')}
          <ArrowUpRight aria-hidden />
        </Button>
      )}
    </Card>
  );
}
export function AdminDashboardContent() {
  return (
    <React.Suspense fallback={<Skeleton className="h-48 w-full" />}>
      <AdminDashboardTabs
        visaoGeral={<VisaoGeral />}
        abas={[
          {
            chave: 'faturamento',
            nome: 'Faturamento',
            conteudo: <AdminBillingContent />,
          },
          {
            chave: 'fiscal',
            nome: 'Fiscal',
            conteudo: <AdminFiscalRecordsContent />,
          },
          {
            chave: 'pagamentos',
            nome: 'Pagamentos',
            conteudo: <MeiosDePagamento />,
          },
        ]}
      />
    </React.Suspense>
  );
}
function VisaoGeral() {
  const { session } = useAuth();
  const [filtros, setFiltros] = React.useState(padraoDoPeriodo);
  const [rascunho, setRascunho] = React.useState(filtros);
  const [paginaEventos, setPaginaEventos] = React.useState(1);
  const [detalhe, setDetalhe] = React.useState<string | null>(null);
  const [erroFiltro, setErroFiltro] = React.useState('');
  const [metrica, setMetrica] = React.useState<
    'cadastros' | 'ativos' | 'chat' | 'metricas'
  >('cadastros');
  const url =
    '/api/admin/dashboard?' +
    new URLSearchParams({ ...filtros, paginaEventos: String(paginaEventos) });
  const [opcoes, setOpcoes] = React.useState<PainelAnalitico['opcoesPlanos']>(
    []
  );
  const request = React.useCallback(async () => {
    const resposta = await ler<PainelAnalitico>(url);
    setOpcoes(resposta.opcoesPlanos);
    return resposta;
  }, [url]);
  const { data, loading, refresh } = useKeyedResource(
    session?.user ? session.user.id + url : null,
    request,
    avisar,
    FALHA
  );
  const aplicar = (event: React.FormEvent) => {
    event.preventDefault();
    const dias =
      (Date.parse(rascunho.fim) - Date.parse(rascunho.inicio)) / 86400000 + 1;
    if (
      !Number.isFinite(dias) ||
      dias < 1 ||
      dias > 366 ||
      rascunho.fim > new Date().toISOString().slice(0, 10)
    ) {
      setErroFiltro('Escolha de 1 a 366 dias, sem datas futuras.');
      return;
    }
    setErroFiltro('');
    setPaginaEventos(1);
    setDetalhe(null);
    if (JSON.stringify(filtros) === JSON.stringify(rascunho)) void refresh();
    else setFiltros(rascunho);
  };
  const nomes = {
    cadastros: 'Novos cadastros',
    ativos: 'Contas com atividade',
    chat: 'Perguntas salvas',
    metricas: 'Registros de métricas',
  };
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>O app em perspectiva</CardTitle>
          <CardDescription>
            Compare períodos, acompanhe a operação e confira os registros por
            trás de cada número.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-end gap-3" onSubmit={aplicar}>
            <div className="min-w-0 flex-1 basis-36">
              <Label htmlFor="painel-inicio">De</Label>
              <Input
                id="painel-inicio"
                type="date"
                min="2000-01-01"
                max={new Date().toISOString().slice(0, 10)}
                required
                value={rascunho.inicio}
                onChange={(e) =>
                  setRascunho({ ...rascunho, inicio: e.target.value })
                }
              />
            </div>
            <div className="min-w-0 flex-1 basis-36">
              <Label htmlFor="painel-fim">Até</Label>
              <Input
                id="painel-fim"
                type="date"
                min="2000-01-01"
                max={new Date().toISOString().slice(0, 10)}
                required
                value={rascunho.fim}
                onChange={(e) =>
                  setRascunho({ ...rascunho, fim: e.target.value })
                }
              />
            </div>
            <div className="flex min-w-0 flex-1 basis-40 flex-col gap-2">
              <Label htmlFor="painel-plano">Plano atual</Label>
              <select
                id="painel-plano"
                className={campoSelect}
                value={rascunho.plano}
                onChange={(e) =>
                  setRascunho({ ...rascunho, plano: e.target.value })
                }
              >
                <option value="todos">Todos os planos</option>
                {(data?.opcoesPlanos ?? opcoes).map((p) => (
                  <option key={p.chave} value={p.chave}>
                    {p.nome}
                  </option>
                ))}
                <option value="sem_assinatura">Sem assinatura vigente</option>
              </select>
            </div>
            <div className="flex min-w-0 flex-1 basis-32 flex-col gap-2">
              <Label htmlFor="painel-grupo">Agrupar por</Label>
              <select
                id="painel-grupo"
                className={campoSelect}
                value={rascunho.agrupamento}
                onChange={(e) =>
                  setRascunho({
                    ...rascunho,
                    agrupamento: e.target
                      .value as FiltrosAnaliticos['agrupamento'],
                  })
                }
              >
                <option value="dia">Dia</option>
                <option value="semana">Semana</option>
                <option value="mes">Mês</option>
              </select>
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? 'Consultando…' : 'Aplicar filtros'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => void refresh()}
              aria-label="Atualizar indicadores"
            >
              <RefreshCw aria-hidden />
            </Button>
          </form>
          {erroFiltro && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {erroFiltro}
            </p>
          )}
          <p className="mt-4 text-sm text-muted-foreground">
            Datas de criação em UTC, incluindo o dia final. Administradores fora
            da população. Filtro pelo plano vigente hoje, inclusive ao consultar
            o passado.
          </p>
        </CardContent>
      </Card>
      {loading ? (
        <div role="status" aria-label="Carregando os indicadores">
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
          <Skeleton className="mt-6 h-72 w-full" />
        </div>
      ) : !data ? (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível carregar o painel</AlertTitle>
          <AlertDescription>
            Os indicadores estão indisponíveis. Confira a conexão e tente
            novamente.
          </AlertDescription>
          <Button
            className="mt-3"
            variant="outline"
            onClick={() => void refresh()}
          >
            Tentar de novo
          </Button>
        </Alert>
      ) : (
        <>
          <p role="status" className="text-sm text-muted-foreground">
            Período aplicado:{' '}
            {DATA.format(new Date(data.filtros.inicio + 'T00:00:00Z'))} a{' '}
            {DATA.format(new Date(data.filtros.fim + 'T00:00:00Z'))} · Plano:{' '}
            {data.filtros.plano === 'todos'
              ? 'Todos'
              : data.filtros.plano === 'sem_assinatura'
                ? 'Sem assinatura vigente'
                : data.opcoesPlanos.find((p) => p.chave === data.filtros.plano)
                    ?.nome}{' '}
            · Atualizado em {HORA.format(new Date(data.geradoEm))} UTC ·
            Comparação:{' '}
            {DATA.format(new Date(data.anterior.inicio + 'T00:00:00Z'))} a{' '}
            {DATA.format(new Date(data.anterior.fim + 'T00:00:00Z'))}. O dia
            atual pode estar incompleto.
          </p>
          <div className="grid gap-4 lg:grid-cols-3">
            <Indicador
              titulo="Novos cadastros"
              valor={INTEIRO.format(data.atual.cadastros)}
              descricao="Contas criadas no período e ainda existentes."
              comparacao={comparar(
                data.atual.cadastros,
                data.comparacao.cadastros
              )}
              icone={UserPlus}
              acao={() => setDetalhe('cadastros')}
            />
            <Indicador
              titulo="Contas com atividade"
              valor={INTEIRO.format(data.atual.ativos)}
              descricao="Pessoas únicas com alguma ação persistida das fontes descritas abaixo."
              comparacao={comparar(data.atual.ativos, data.comparacao.ativos)}
              icone={Activity}
              acao={() => setDetalhe('atividade')}
            />
            <Indicador
              titulo="Novos usuários com perfil pronto"
              valor={
                data.atual.cadastros
                  ? DECIMAL.format(
                      percentual(data.atual.concluidos, data.atual.cadastros)!
                    ) + '%'
                  : '—'
              }
              descricao={`${data.atual.concluidos} de ${data.atual.cadastros} cadastros do período com perfil concluído hoje.`}
              comparacao={
                data.comparacao.cadastros
                  ? `Cadastros anteriores: ${DECIMAL.format(percentual(data.comparacao.concluidos, data.comparacao.cadastros)!)}%. Não é a taxa de conclusões ocorridas no período.`
                  : 'Sem cadastros no período anterior; comparação indisponível.'
              }
              icone={CheckCircle}
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Evolução no tempo</CardTitle>
              <CardDescription>
                Contas ativas são deduplicadas dentro de cada dia, semana ou
                mês; somar os pontos pode duplicar pessoas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-col gap-2 sm:max-w-72">
                <Label htmlFor="painel-metrica">Indicador do gráfico</Label>
                <select
                  id="painel-metrica"
                  className={campoSelect}
                  value={metrica}
                  onChange={(e) => setMetrica(e.target.value as typeof metrica)}
                >
                  {Object.entries(nomes).map(([chave, nome]) => (
                    <option key={chave} value={chave}>
                      {nome}
                    </option>
                  ))}
                </select>
              </div>
              {data.serie.some((p) => p[metrica] > 0) ? (
                <Trend
                  pontos={data.serie}
                  metrica={metrica}
                  nome={nomes[metrica]}
                />
              ) : (
                <p className="rounded-lg bg-muted p-6 text-sm">
                  Nenhum registro de {nomes[metrica].toLowerCase()} no período
                  selecionado.
                </p>
              )}
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium">
                  Ver tabela dos períodos atual e anterior
                </summary>
                {[
                  { nome: 'Período atual', serie: data.serie },
                  { nome: 'Período anterior', serie: data.serieAnterior },
                ].map((g) => (
                  <div key={g.nome} className="mt-4">
                    <h3 className="mb-2 text-sm font-medium">{g.nome}</h3>
                    <Table
                      scrollLabel={`Dados temporais: ${g.nome}`}
                      caption={`Indicadores por agrupamento: ${g.nome}`}
                    >
                      <TableHeader>
                        <TableRow>
                          <TableHead scope="col">
                            Início do agrupamento
                          </TableHead>
                          {Object.values(nomes).map((n) => (
                            <TableHead key={n} scope="col">
                              {n}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {g.serie.map((p) => (
                          <TableRow key={p.data}>
                            <TableCell>
                              {DATA.format(new Date(p.data + 'T00:00:00Z'))}
                            </TableCell>
                            {(
                              [
                                'cadastros',
                                'ativos',
                                'chat',
                                'metricas',
                              ] as const
                            ).map((k) => (
                              <TableCell key={k}>
                                {INTEIRO.format(p[k])}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
                <p className="mt-2 text-sm text-muted-foreground">
                  Semanas começam na segunda-feira. Primeiro e último
                  agrupamentos podem ser parciais; ambos os períodos têm a mesma
                  quantidade de dias.
                </p>
              </details>
            </CardContent>
          </Card>
          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Base atual de contas</CardTitle>
                <CardDescription>
                  Fotografia de agora, filtrada por plano. Não é um saldo
                  histórico do período escolhido.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4">
                  {[
                    ['Contas comuns', data.base.contas],
                    ['Perfis pendentes', data.base.pendentes],
                    ['Contas bloqueadas', data.base.bloqueadas],
                    ['Sem assinatura vigente', data.base.semAssinatura],
                  ].map(([nome, n]) => (
                    <div key={nome}>
                      <dt className="text-sm text-muted-foreground">{nome}</dt>
                      <dd className="mt-1 font-display text-2xl font-semibold">
                        {INTEIRO.format(Number(n))}
                      </dd>
                    </div>
                  ))}
                </dl>
                {data.base.multiplasAssinaturas > 0 && (
                  <p role="status" className="mt-4 text-sm">
                    Atenção: {data.base.multiplasAssinaturas} contas possuem
                    mais de uma assinatura ativa. A contagem escolhe uma por
                    conta.
                  </p>
                )}
                <Button
                  asChild
                  variant="outline"
                  className="mt-5 h-auto min-h-10 max-w-full whitespace-normal text-left"
                >
                  <Link href="/admin/users">
                    Gerir usuários e acessos
                    <ArrowUpRight aria-hidden />
                  </Link>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por plano</CardTitle>
                <CardDescription>
                  {data.catalogo.planos} planos comerciais ativos no catálogo.
                  Uma conta por assinatura vigente; sem projetar receita pelo
                  preço do catálogo.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.planos.length ? (
                  <ul className="divide-y divide-border">
                    {data.planos.map((p) => (
                      <li
                        key={p.chave}
                        className="flex justify-between gap-4 py-3"
                      >
                        <span>{p.nome}</span>
                        <span className="font-medium tabular-nums">
                          {INTEIRO.format(p.contas)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma conta para este filtro.
                  </p>
                )}
                <Button
                  asChild
                  variant="outline"
                  className="mt-5 h-auto min-h-10 max-w-full whitespace-normal text-left"
                >
                  <Link href="/admin/plans">
                    Gerir planos e permissões
                    <ArrowUpRight aria-hidden />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Uso registrado por área</CardTitle>
              <CardDescription>
                Novas linhas criadas no período e ainda retidas. Erros são o
                estado atual dos registros, não a disponibilidade dos
                provedores.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul
                className="space-y-3 md:hidden"
                aria-label="Uso por área em cartões"
              >
                {data.dominios.map((d) => (
                  <li
                    key={d.chave}
                    className="rounded-lg border border-border p-4"
                  >
                    <h4 className="font-medium">{DOMINIOS[d.chave].nome}</h4>
                    <p className="mt-3 font-display text-2xl font-semibold tabular-nums">
                      {INTEIRO.format(d.registros)}{' '}
                      <span className="font-sans text-sm font-normal text-muted-foreground">
                        registros
                      </span>
                    </p>
                    <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-muted-foreground">
                          Pessoas únicas
                        </dt>
                        <dd className="font-medium">
                          {INTEIRO.format(d.pessoas)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">
                          Período anterior
                        </dt>
                        <dd className="font-medium">
                          {INTEIRO.format(d.anterior)}
                        </dd>
                      </div>
                      {['chat', 'memoria', 'imagens'].includes(d.chave) && (
                        <div>
                          <dt className="text-muted-foreground">
                            Em erro agora
                          </dt>
                          <dd className="font-medium">
                            {INTEIRO.format(d.erros)}
                          </dd>
                        </div>
                      )}
                    </dl>
                    <details className="mt-3 text-sm text-muted-foreground">
                      <summary className="cursor-pointer">
                        O que esta contagem mede
                      </summary>
                      <p className="mt-2">{DOMINIOS[d.chave].limite}</p>
                    </details>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      aria-label={`Conferir ${DOMINIOS[d.chave].nome.toLowerCase()}`}
                      onClick={() => setDetalhe(d.chave)}
                    >
                      Ver detalhes
                    </Button>
                  </li>
                ))}
              </ul>
              <div className="hidden md:block">
                <Table
                  scrollLabel="Uso registrado por área"
                  caption="Volumes e titulares por domínio no período"
                >
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col">Área</TableHead>
                      <TableHead scope="col">Registros</TableHead>
                      <TableHead scope="col">Pessoas únicas</TableHead>
                      <TableHead scope="col">Período anterior</TableHead>
                      <TableHead scope="col">Em erro</TableHead>
                      <TableHead scope="col">Conferir</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.dominios.map((d) => (
                      <TableRow key={d.chave}>
                        <TableHead
                          scope="row"
                          className="min-w-60 whitespace-normal"
                        >
                          <p>{DOMINIOS[d.chave].nome}</p>
                          <p className="mt-1 text-xs font-normal text-muted-foreground">
                            {DOMINIOS[d.chave].limite}
                          </p>
                        </TableHead>
                        <TableCell>{INTEIRO.format(d.registros)}</TableCell>
                        <TableCell>{INTEIRO.format(d.pessoas)}</TableCell>
                        <TableCell>{INTEIRO.format(d.anterior)}</TableCell>
                        <TableCell>
                          {['chat', 'memoria', 'imagens'].includes(d.chave)
                            ? INTEIRO.format(d.erros)
                            : 'Não se aplica'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            aria-label={`Conferir ${DOMINIOS[d.chave].nome.toLowerCase()}`}
                            onClick={() => setDetalhe(d.chave)}
                          >
                            Detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Linha temporal de gestão</CardTitle>
              <CardDescription>
                Cadastros, eventos de acesso e alterações de assinatura retidos,
                com os mesmos filtros do painel. Operações de catálogo
                registradas no administrador ficam fora desta população.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Registros dados={data.eventos} />
              <Paginacao
                pagina={paginaEventos}
                total={data.eventos.total}
                mudar={setPaginaEventos}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Gestão do app</CardTitle>
              <CardDescription>
                Atalhos para as ferramentas existentes. Os totais de catálogo
                são globais e atuais, independentes dos filtros acima.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    href: '/admin/content',
                    nome: 'Conteúdo',
                    texto: `${data.catalogo.dicas} dicas e ${data.catalogo.habitos} hábitos sugeridos ativos`,
                  },
                  {
                    href: '/admin/ai-config',
                    nome: 'Inteligência artificial',
                    texto: `${data.catalogo.documentos} documentos de conhecimento; conexões e testes no painel`,
                  },
                  {
                    href: '/admin/data-health',
                    nome: 'Saúde dos dados',
                    texto:
                      'Cobertura de métricas e contas sem registros recentes',
                  },
                  {
                    href: '/admin/reports',
                    nome: 'Relatórios',
                    texto: 'Consultar relatórios e exportações administrativas',
                  },
                  {
                    href: '/admin/dashboard?aba=fiscal',
                    nome: 'Registros fiscais',
                    texto: 'Conferir faturas efetivamente pagas e retidas',
                  },
                  {
                    href: '/admin/dashboard?aba=pagamentos',
                    nome: 'Meios de pagamento',
                    texto: 'Configurar provedores e conferir suas conexões',
                  },
                ].map((a) => (
                  <Link
                    key={a.href}
                    href={a.href}
                    className="rounded-lg border border-border p-4 transition-colors hover:bg-muted"
                  >
                    <span className="flex items-center justify-between gap-3 font-medium">
                      {a.nome}
                      <ArrowUpRight className="size-4 shrink-0" aria-hidden />
                    </span>
                    <span className="mt-2 block text-sm text-muted-foreground">
                      {a.texto}
                    </span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
          <details className="rounded-xl border border-border p-5">
            <summary className="cursor-pointer font-medium">
              Como interpretar os indicadores
            </summary>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <p>
                Cadastros = contas comuns criadas entre o início inclusivo e o
                dia seguinte ao fim exclusivo, em UTC. Perfis concluídos =
                estado atual dos cadastros dessa mesma coorte; não há data
                histórica de conclusão.
              </p>
              <p>
                Contas com atividade = pessoas distintas com criação de
                métricas, reflexões, respiração, perguntas salvas, avaliações,
                hábitos, agendamentos ou vínculos profissionais. Exclui
                automações de metas, leituras, planos, notificações e memória.
                Não mede visitas, login, uso efêmero ou todas as edições.
              </p>
              <p>
                Comparação = período imediatamente anterior com a mesma
                quantidade de dias. Variação = (atual − anterior) ÷ anterior ×
                100. Sem denominador, o percentual fica indisponível. Não há
                meta numérica inventada.
              </p>
              <p>
                Os agrupamentos usam o instante de criação UTC; a data local de
                um check-in ou de uma reflexão pode ser diferente. Exclusões e
                políticas de retenção reduzem contagens passadas. Zero significa
                nenhuma linha retida correspondente, não ausência comprovada de
                uso. Falha de consulta é exibida como indisponibilidade.
              </p>
              <p>
                O plano é o vigente na consulta, não o plano da época. A base
                inclui contas bloqueadas e perfis pendentes; administradores
                ficam excluídos mesmo com assinatura comercial. Catálogo e
                gestão financeira têm escopos próprios.
              </p>
              <p>
                Não inferimos satisfação, NPS, retenção, churn, receita,
                resultado de saúde ou disponibilidade externa a partir destas
                contagens. Nenhum texto de conversa, nota, resposta de avaliação
                ou valor clínico sai nesta API.
              </p>
              {Object.values(DOMINIOS).map((d) => (
                <p key={d.fonte}>
                  <strong className="text-foreground">{d.nome}:</strong> fonte{' '}
                  {d.fonte}; COUNT de linhas e COUNT DISTINCT de titulares.{' '}
                  {d.limite}
                </p>
              ))}
            </div>
          </details>
        </>
      )}
      {detalhe && (
        <Detalhes
          key={detalhe}
          tipo={detalhe}
          filtros={filtros}
          fechar={() => setDetalhe(null)}
        />
      )}
    </div>
  );
}
