'use client';
import * as React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Download, RefreshCw } from 'lucide-react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useKeyedResource } from '@/hooks/use-keyed-resource';
import { padraoDoPeriodo } from '@/lib/admin/analytics/periodo';
import {
  DOMINIOS,
  percentual,
  type PainelAnalitico,
} from '@/lib/admin/analytics/definicoes';
import type { RelatorioAdministrativo } from '@/lib/admin/reports/servico';
import type { LinhaDoRelatorio } from '@/lib/admin/reports/contrato';
import { formatarValorFinanceiro } from '@/lib/billing/admin/moedas';
import {
  ESTADOS_FINANCEIROS,
  nomeDoAmbiente,
  nomeDoProvedor,
  NOMES_DE_MOVIMENTOS,
} from '@/lib/billing/admin/rotulos';
import { csvDoRelatorio } from '@/lib/admin/reports/contrato';
import { buscarJson } from '@/lib/http/transporte';
import { AdminUserExport } from './AdminUserExport';
import {
  DetalhesAnaliticos,
  RegistrosAnaliticos,
  PaginacaoAnalitica,
} from './AdminAnalyticsDetails';
const UsoTrend = dynamic(() => import('./DashboardTrend'), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full" />,
});
const FinanceTrend = dynamic(() => import('./BillingTrend'), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full" />,
});
const SELECT =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm';
const numero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const dataBr = (d: string) => d.slice(0, 10).split('-').reverse().join('/');
function baixar(nome: string, conteudo: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo })),
    a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
interface Filtros {
  tipo: 'uso' | 'financeiro';
  inicio: string;
  fim: string;
  agrupamento: string;
  plano: string;
  ambiente: string;
  provedor: string;
  moeda: string;
  estado: string;
}
function padrao(): Filtros {
  return {
    ...padraoDoPeriodo(),
    tipo: 'uso',
    ambiente: 'todos',
    provedor: 'todos',
    moeda: '',
    estado: 'todos',
  };
}
function parametros(
  f: Filtros,
  eventos: number,
  faturas: number,
  saldos: number
) {
  const q = new URLSearchParams({
    tipo: f.tipo,
    inicio: f.inicio,
    fim: f.fim,
    agrupamento: f.agrupamento,
  });
  if (f.tipo === 'uso') {
    q.set('plano', f.plano);
    q.set('paginaEventos', String(eventos));
  } else {
    q.set('ambiente', f.ambiente);
    q.set('provedor', f.provedor);
    q.set('estado', f.estado);
    if (f.moeda) q.set('moeda', f.moeda);
    q.set('pagina', String(faturas));
    q.set('paginaSaldos', String(saldos));
  }
  return q;
}
function Campo({
  id,
  nome,
  children,
}: {
  id: string;
  nome: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id}>{nome}</Label>
      {children}
    </div>
  );
}
function valor(l: LinhaDoRelatorio | undefined) {
  if (!l) return 'Sem linha na consulta';
  if (l.valor === null) return 'Não informado';
  if (l.unidade === 'unidades mínimas')
    return formatarValorFinanceiro(l.valor, l.moeda || null);
  return `${numero.format(Number(l.valor))}${l.unidade === '%' ? '%' : ''}`;
}
function comparaveis(linhas: LinhaDoRelatorio[]) {
  const grupos = new Map<
    string,
    { atual?: LinhaDoRelatorio; anterior?: LinhaDoRelatorio }
  >();
  for (const l of linhas) {
    if (l.secao.startsWith('Evolução') || l.periodo === 'fotografia') continue;
    const chave = [l.secao, l.indicador, l.ambiente, l.provedor, l.moeda].join(
      '|'
    );
    const g = grupos.get(chave) ?? {};
    g[l.periodo === 'anterior' ? 'anterior' : 'atual'] = l;
    grupos.set(chave, g);
  }
  return [...grupos.values()];
}
function IndicadoresComparados({ linhas }: { linhas: LinhaDoRelatorio[] }) {
  const [busca, setBusca] = React.useState(''),
    [pagina, setPagina] = React.useState(1);
  const grupos = comparaveis(linhas).filter((g) => {
    const l = g.atual ?? g.anterior!;
    return `${l.indicador} ${l.secao} ${l.moeda} ${l.ambiente}`
      .toLocaleLowerCase('pt-BR')
      .includes(busca.toLocaleLowerCase('pt-BR'));
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Comparação dos indicadores</CardTitle>
        <CardDescription>
          Mesmo intervalo de duração. Valores monetários em grupos separados;
          nenhuma soma entre moedas. Busca apenas nesta tabela; os arquivos
          contêm o recorte completo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Campo id="rel-busca" nome="Buscar indicador">
          <Input
            id="rel-busca"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(1);
            }}
          />
        </Campo>
        {grupos.length === 0 ? (
          <p>Nenhum indicador para este recorte.</p>
        ) : (
          <>
            <ul className="space-y-3 lg:hidden">
              {grupos.slice((pagina - 1) * 20, pagina * 20).map((g, n) => {
                const l = g.atual ?? g.anterior!;
                return (
                  <li key={n} className="space-y-2 rounded-lg border p-4">
                    <p className="font-medium">{l.indicador}</p>
                    <p className="text-sm text-muted-foreground">
                      {l.secao} · {l.ambiente && nomeDoAmbiente(l.ambiente)}{' '}
                      {l.moeda} {l.provedor && nomeDoProvedor(l.provedor)}
                    </p>
                    <dl className="grid gap-2 text-sm">
                      <div>
                        <dt>Atual</dt>
                        <dd className="break-words font-semibold">
                          {valor(g.atual)}
                        </dd>
                      </div>
                      <div>
                        <dt>Anterior</dt>
                        <dd className="break-words">{valor(g.anterior)}</dd>
                      </div>
                    </dl>
                    <details className="text-sm">
                      <summary className="cursor-pointer">
                        Origem e definição
                      </summary>
                      <p className="mt-2">{l.limite}</p>
                      <p className="mt-1 break-all text-muted-foreground">
                        {l.origem} · {l.unidade}
                      </p>
                    </details>
                  </li>
                );
              })}
            </ul>
            <div className="hidden lg:block">
              <Table
                caption="Indicadores no período atual e anterior"
                scrollLabel="Comparação dos indicadores"
              >
                <TableHeader>
                  <TableRow>
                    <TableHead>Indicador / grupo</TableHead>
                    <TableHead>Atual</TableHead>
                    <TableHead>Anterior</TableHead>
                    <TableHead>Definição e origem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grupos.slice((pagina - 1) * 20, pagina * 20).map((g, n) => {
                    const l = g.atual ?? g.anterior!;
                    return (
                      <TableRow key={n}>
                        <TableCell>
                          <p className="font-medium">{l.indicador}</p>
                          <p className="text-xs text-muted-foreground">
                            {l.secao} ·{' '}
                            {l.ambiente && nomeDoAmbiente(l.ambiente)} {l.moeda}{' '}
                            {l.provedor && nomeDoProvedor(l.provedor)}
                          </p>
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-semibold">
                          {valor(g.atual)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {valor(g.anterior)}
                        </TableCell>
                        <TableCell className="max-w-md text-sm">
                          <p>{l.limite}</p>
                          <p className="mt-1 break-all text-xs text-muted-foreground">
                            {l.origem} · {l.unidade}
                          </p>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <PaginacaoAnalitica
              pagina={pagina}
              total={grupos.length}
              mudar={setPagina}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
function EvolucaoDoUso({ dados }: { dados: PainelAnalitico }) {
  const [metrica, setMetrica] = React.useState<
      'cadastros' | 'ativos' | 'chat' | 'metricas'
    >('ativos'),
    [periodo, setPeriodo] = React.useState('atual');
  const nomes = {
      cadastros: 'Cadastros',
      ativos: 'Pessoas com atividade',
      chat: 'Perguntas salvas',
      metricas: 'Registros de métricas',
    },
    pontos = periodo === 'atual' ? dados.serie : dados.serieAnterior;
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Evolução do uso</CardTitle>
        <CardDescription>
          Pessoas distintas no agrupamento final. A série anterior usa as
          próprias datas, sem deslocar registros para o período atual.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo id="rel-metrica-uso" nome="Indicador">
            <select
              id="rel-metrica-uso"
              className={SELECT}
              value={metrica}
              onChange={(e) => setMetrica(e.target.value as typeof metrica)}
            >
              {Object.entries(nomes).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Campo>
          <Campo id="rel-periodo-uso" nome="Período da série">
            <select
              id="rel-periodo-uso"
              className={SELECT}
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
            >
              <option value="atual">Atual</option>
              <option value="anterior">Anterior</option>
            </select>
          </Campo>
        </div>
        <UsoTrend pontos={pontos} metrica={metrica} nome={nomes[metrica]} />
        <details>
          <summary className="cursor-pointer text-sm font-medium">
            Conferir os dados do gráfico
          </summary>
          <Table
            caption="Valores exatos da série de uso"
            scrollLabel="Dados da evolução de uso"
          >
            <TableHeader>
              <TableRow>
                <TableHead>Início do agrupamento (UTC)</TableHead>
                <TableHead>{nomes[metrica]}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pontos.map((p) => (
                <TableRow key={p.data}>
                  <TableCell>{dataBr(p.data)}</TableCell>
                  <TableCell>{numero.format(p[metrica])}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </details>
      </CardContent>
    </Card>
  );
}
function EvolucaoFinanceira({ linhas }: { linhas: LinhaDoRelatorio[] }) {
  const todas = linhas.filter(
    (l) => l.secao.startsWith('Evolução') && l.unidade === 'unidades mínimas'
  );
  const opcoes = [
    ...new Set(
      todas.map((l) =>
        [l.secao, l.indicador, l.ambiente, l.moeda, l.periodo].join('|')
      )
    ),
  ];
  const [escolha, setEscolha] = React.useState('');
  const atual = opcoes.includes(escolha) ? escolha : opcoes[0];
  const pontos = todas.filter(
    (l) =>
      [l.secao, l.indicador, l.ambiente, l.moeda, l.periodo].join('|') === atual
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Evolução financeira</CardTitle>
        <CardDescription>
          Nominal por criação da fatura, quitação por pagamento, refund por
          criação e saldo por movimento. Fontes distintas, sem soma entre elas.
          Lacunas não viram valores medidos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!pontos.length ? (
          <p>Não há série financeira importada para este recorte.</p>
        ) : (
          <>
            <Campo
              id="rel-serie-financeira"
              nome="Indicador, moeda, ambiente e período"
            >
              <select
                id="rel-serie-financeira"
                className={SELECT}
                value={atual}
                onChange={(e) => setEscolha(e.target.value)}
              >
                {opcoes.map((o) => (
                  <option key={o} value={o}>
                    {(() => {
                      const [, indicador, ambiente, moeda, periodo] =
                        o.split('|');
                      return `${indicador} · ${nomeDoAmbiente(ambiente)} · ${moeda || 'Moeda não informada'} · ${periodo === 'atual' ? 'Período consultado' : 'Período anterior'}`;
                    })()}
                  </option>
                ))}
              </select>
            </Campo>
            <FinanceTrend
              pontos={pontos.map((p) => ({
                data: p.data,
                valor: p.valor === null ? null : String(p.valor),
              }))}
              moeda={pontos[0].moeda}
              nome={pontos[0].indicador}
            />
            <details>
              <summary className="cursor-pointer text-sm font-medium">
                Conferir os dados do gráfico
              </summary>
              <Table
                caption="Valores financeiros exatos"
                scrollLabel="Dados da evolução financeira"
              >
                <TableHeader>
                  <TableRow>
                    <TableHead>Agrupamento (UTC)</TableHead>
                    <TableHead>Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pontos.map((p) => (
                    <TableRow key={p.data}>
                      <TableCell>{dataBr(p.data)}</TableCell>
                      <TableCell>{valor(p)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </details>
          </>
        )}
      </CardContent>
    </Card>
  );
}
export function AdminReportsContent() {
  const [rascunho, setRascunho] = React.useState(padrao),
    [filtros, setFiltros] = React.useState(padrao);
  const [paginaEventos, setPaginaEventos] = React.useState(1),
    [paginaFaturas, setPaginaFaturas] = React.useState(1),
    [paginaSaldos, setPaginaSaldos] = React.useState(1),
    [detalhe, setDetalhe] = React.useState<string | null>(null),
    [erro, setErro] = React.useState('');
  const url =
    '/api/admin/reports?' +
    parametros(filtros, paginaEventos, paginaFaturas, paginaSaldos);
  const request = React.useCallback(async () => {
    const r = await buscarJson(url, { cache: 'no-store' });
    if (!r.ok) throw new Error(r.falha.message);
    if (!r.corpo)
      throw new Error('O relatório não veio completo. Tente de novo.');
    return r.corpo as RelatorioAdministrativo;
  }, [url]);
  const avisar = React.useCallback(
    (e: unknown) =>
      setErro(
        e instanceof Error ? e.message : 'Não foi possível consultar os dados.'
      ),
    []
  );
  const { data, loading, refresh } =
    useKeyedResource<RelatorioAdministrativo | null>(
      url,
      request,
      avisar,
      null
    );
  // Mantém o catálogo real de planos ao alternar para a análise financeira.
  const [planosDisponiveis, setPlanosDisponiveis] = React.useState<
    PainelAnalitico['opcoesPlanos']
  >([]);
  const planosConsultados =
    data?.tipo === 'uso' ? data.dados.opcoesPlanos : null;
  if (planosConsultados && planosConsultados !== planosDisponiveis)
    setPlanosDisponiveis(planosConsultados);
  const mudar = (parcial: Partial<Filtros>) =>
    setRascunho((r) => ({ ...r, ...parcial }));
  const aplicar = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErro('');
    setFiltros(rascunho);
    setPaginaEventos(1);
    setPaginaFaturas(1);
    setPaginaSaldos(1);
    setDetalhe(null);
  };
  const financeiro = rascunho.tipo === 'financeiro';
  const exportar = (tipo: 'csv' | 'json') => {
    if (!data) return;
    const e = data.exportacao;
    const conteudo =
      tipo === 'json' ? JSON.stringify(e, null, 2) : csvDoRelatorio(e);
    baixar(
      `lyra-indicadores-${e.tipo}-${e.filtros.inicio}-${e.filtros.fim}.${tipo}`,
      conteudo,
      tipo === 'json'
        ? 'application/json;charset=utf-8'
        : 'text/csv;charset=utf-8'
    );
  };
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle as="h2">Explorar e comparar</CardTitle>
          <CardDescription>
            Investigue os indicadores, confira a origem e baixe o mesmo recorte
            em CSV ou JSON. A gestão de cobranças e contas continua nas páginas
            próprias.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={aplicar}
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            <Campo id="rel-tipo" nome="Relatório">
              <select
                id="rel-tipo"
                className={SELECT}
                value={rascunho.tipo}
                onChange={(e) =>
                  mudar({
                    tipo: e.target.value as Filtros['tipo'],
                    agrupamento:
                      e.target.value === 'uso' && rascunho.agrupamento === 'ano'
                        ? 'mes'
                        : e.target.value === 'financeiro' &&
                            rascunho.agrupamento === 'semana'
                          ? 'mes'
                          : rascunho.agrupamento,
                  })
                }
              >
                <option value="uso">Uso e contas</option>
                <option value="financeiro">Financeiro</option>
              </select>
            </Campo>
            <Campo id="rel-inicio" nome="De (UTC)">
              <Input
                id="rel-inicio"
                type="date"
                required
                value={rascunho.inicio}
                onChange={(e) => mudar({ inicio: e.target.value })}
              />
            </Campo>
            <Campo id="rel-fim" nome="Até (UTC)">
              <Input
                id="rel-fim"
                type="date"
                required
                value={rascunho.fim}
                onChange={(e) => mudar({ fim: e.target.value })}
              />
            </Campo>
            <Campo id="rel-grupo" nome="Agrupar por">
              <select
                id="rel-grupo"
                className={SELECT}
                value={rascunho.agrupamento}
                onChange={(e) => mudar({ agrupamento: e.target.value })}
              >
                <option value="dia">Dia</option>
                {!financeiro && <option value="semana">Semana</option>}
                <option value="mes">Mês</option>
                {financeiro && <option value="ano">Ano</option>}
              </select>
            </Campo>
            {financeiro ? (
              <>
                <Campo id="rel-ambiente" nome="Ambiente financeiro">
                  <select
                    id="rel-ambiente"
                    className={SELECT}
                    value={rascunho.ambiente}
                    onChange={(e) => mudar({ ambiente: e.target.value })}
                  >
                    <option value="todos">Todos, separados</option>
                    <option value="test">Teste</option>
                    <option value="live">Produção</option>
                    <option value="legado">Legado sem ambiente</option>
                  </select>
                </Campo>
                <Campo id="rel-provedor" nome="Provedor">
                  <select
                    id="rel-provedor"
                    className={SELECT}
                    value={rascunho.provedor}
                    onChange={(e) => mudar({ provedor: e.target.value })}
                  >
                    <option value="todos">Todos</option>
                    <option value="stripe">Stripe</option>
                    <option value="mercado_pago">Mercado Pago</option>
                    <option value="paypal">PayPal</option>
                  </select>
                </Campo>
                <Campo id="rel-moeda" nome="Moeda (vazio inclui todas)">
                  <Input
                    id="rel-moeda"
                    value={rascunho.moeda}
                    maxLength={3}
                    pattern="[A-Z]{3}|"
                    placeholder="BRL"
                    onChange={(e) =>
                      mudar({ moeda: e.target.value.toUpperCase() })
                    }
                  />
                </Campo>
                <Campo id="rel-estado" nome="Estado da fatura">
                  <select
                    id="rel-estado"
                    className={SELECT}
                    value={rascunho.estado}
                    onChange={(e) => mudar({ estado: e.target.value })}
                  >
                    {[
                      'todos',
                      'draft',
                      'open',
                      'paid',
                      'void',
                      'uncollectible',
                      'deleted',
                      'desconhecido',
                    ].map((v) => (
                      <option key={v} value={v}>
                        {v === 'todos'
                          ? 'Todos'
                          : (ESTADOS_FINANCEIROS[v] ?? v)}
                      </option>
                    ))}
                  </select>
                </Campo>
              </>
            ) : (
              <Campo id="rel-plano" nome="Plano vigente">
                <select
                  id="rel-plano"
                  className={SELECT}
                  value={rascunho.plano}
                  onChange={(e) => mudar({ plano: e.target.value })}
                >
                  <option value="todos">Todos os planos</option>
                  {planosDisponiveis.map((p) => (
                    <option key={p.chave} value={p.chave}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </Campo>
            )}
            <div className="flex flex-wrap items-end gap-2 sm:col-span-2 xl:col-span-4">
              <Button type="submit" disabled={loading}>
                Gerar relatório
              </Button>
              <Button
                variant="outline"
                disabled={loading}
                onClick={() => {
                  setErro('');
                  void refresh();
                }}
              >
                <RefreshCw aria-hidden />
                Atualizar
              </Button>
              <Button
                variant="outline"
                disabled={loading || !data}
                onClick={() => exportar('csv')}
              >
                <Download aria-hidden />
                Indicadores CSV
              </Button>
              <Button
                variant="outline"
                disabled={loading || !data}
                onClick={() => exportar('json')}
              >
                <Download aria-hidden />
                Indicadores JSON
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      {loading ? (
        <div role="status" aria-label="Gerando relatório" className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : !data ? (
        <Card role="alert">
          <CardHeader>
            <CardTitle as="h2">Não foi possível gerar o relatório</CardTitle>
            <CardDescription>
              {erro || 'Confira os filtros e tente de novo.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void refresh()}>Tentar de novo</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <p role="status" className="rounded-lg bg-muted p-4 text-sm">
            Relatório consultado:{' '}
            {data.tipo === 'uso' ? 'Uso e contas' : 'Financeiro'} ·{' '}
            {dataBr(data.exportacao.filtros.inicio)} a{' '}
            {dataBr(data.exportacao.filtros.fim)} · Anterior:{' '}
            {dataBr(data.exportacao.anterior.inicio)} a{' '}
            {dataBr(data.exportacao.anterior.fim)} · UTC. Gerado em{' '}
            {new Date(data.exportacao.geradoEm).toLocaleString('pt-BR', {
              timeZone: 'UTC',
            })}
            . Os arquivos preservam este resultado, sem fazer outra consulta.
          </p>
          {data.tipo === 'uso' ? (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  [
                    'Cadastros retidos',
                    numero.format(data.dados.atual.cadastros),
                    'cadastros',
                  ],
                  [
                    'Pessoas com atividade',
                    numero.format(data.dados.atual.ativos),
                    'atividade',
                  ],
                  [
                    'Perfis completos entre os cadastros',
                    data.dados.atual.cadastros
                      ? numero.format(
                          percentual(
                            data.dados.atual.concluidos,
                            data.dados.atual.cadastros
                          )!
                        ) + '%'
                      : 'Sem cadastros no período',
                    'cadastros',
                  ],
                ].map(([nome, v, t]) => (
                  <Card key={nome}>
                    <CardHeader>
                      <CardTitle as="h2" className="text-sm">
                        {nome}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-semibold tabular-nums">{v}</p>
                      <Button
                        variant="link"
                        className="mt-3 h-auto whitespace-normal p-0"
                        onClick={() => setDetalhe(t)}
                      >
                        Conferir registros
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <EvolucaoDoUso dados={data.dados} />
              <Card>
                <CardHeader>
                  <CardTitle as="h2">Adoção por área</CardTitle>
                  <CardDescription>
                    Criações retidas, titulares distintos e estado atual dos
                    erros. Não são valores clínicos, entrega de notificações ou
                    comprovação de inferência de IA.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {data.dados.dominios.map((d) => (
                      <li key={d.chave} className="rounded-lg border p-4">
                        <p className="font-medium">{DOMINIOS[d.chave].nome}</p>
                        <p className="mt-2 text-sm">
                          {numero.format(d.registros)}{' '}
                          {d.registros === 1 ? 'registro' : 'registros'} ·{' '}
                          {numero.format(d.pessoas)}{' '}
                          {d.pessoas === 1 ? 'pessoa' : 'pessoas'}
                        </p>
                        <Button
                          variant="link"
                          className="mt-2 h-auto p-0"
                          onClick={() => setDetalhe(d.chave)}
                        >
                          Conferir registros
                        </Button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <p className="rounded-lg border border-warning bg-warning-light p-4 text-sm">
                Cobertura da conta:{' '}
                {data.faturas.sincronizacoes.some(
                  (r) => r.stage === 'completed'
                )
                  ? 'há uma sincronização completa registrada; eventos posteriores dependem do webhook e das atualizações.'
                  : 'nenhuma sincronização completa registrada. Ausência local não comprova ausência de transações.'}{' '}
                Quitação e estado das faturas selecionadas são acumulados
                atuais. Variação de saldo não é lucro. O estado da fatura não
                filtra refunds ou saldo; o plano do uso não filtra finanças.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle as="h2">Faturas no recorte</CardTitle>
                  </CardHeader>
                  <CardContent className="text-3xl font-semibold">
                    {numero.format(data.faturas.faturas.total)}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle as="h2">
                      Movimentos de saldo no recorte
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-3xl font-semibold">
                    {numero.format(data.saldos.total)}
                  </CardContent>
                </Card>
              </div>
              <EvolucaoFinanceira linhas={data.exportacao.linhas} />
            </>
          )}
          <IndicadoresComparados
            key={JSON.stringify(filtros)}
            linhas={data.exportacao.linhas}
          />
          {data.tipo === 'uso' ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle as="h2">Fotografia da base e catálogo</CardTitle>
                  <CardDescription>
                    Estado atual, independente da data de cadastro. O catálogo é
                    global.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {data.exportacao.linhas
                      .filter((l) => l.periodo === 'fotografia')
                      .map((l, n) => (
                        <div key={n} className="rounded-lg border p-4">
                          <dt className="text-sm text-muted-foreground">
                            {l.indicador}
                          </dt>
                          <dd className="mt-2 text-xl font-semibold">
                            {valor(l)}
                          </dd>
                        </div>
                      ))}
                  </dl>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle as="h2">Linha temporal administrativa</CardTitle>
                  <CardDescription>
                    Metadados de cadastro e gestão retidos, sem textos privados.
                    Os indicadores exportados não incluem dados pessoais desta
                    lista.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RegistrosAnaliticos dados={data.dados.eventos} />
                  <PaginacaoAnalitica
                    pagina={paginaEventos}
                    total={data.dados.eventos.total}
                    mudar={setPaginaEventos}
                  />
                </CardContent>
              </Card>
              {detalhe && (
                <DetalhesAnaliticos
                  key={detalhe}
                  tipo={detalhe}
                  filtros={data.dados.filtros}
                  fechar={() => setDetalhe(null)}
                />
              )}
            </>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle as="h2">Faturas de origem</CardTitle>
                  <CardDescription>
                    Somente leitura. As operações ficam na aba Faturamento;
                    documentos fiscais permanecem imutáveis.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="grid gap-3 md:grid-cols-2">
                    {data.faturas.faturas.itens.map((f) => (
                      <li
                        key={f.id}
                        className="space-y-2 rounded-lg border p-4"
                      >
                        <p className="break-all font-medium">
                          {f.numero ?? f.externa}
                        </p>
                        <p className="break-all text-sm text-muted-foreground">
                          {f.externa}
                        </p>
                        <p className="text-sm">
                          {nomeDoAmbiente(f.ambiente)} ·{' '}
                          {ESTADOS_FINANCEIROS[f.estado] ?? f.estado}
                        </p>
                        <p className="text-sm">
                          Nominal: {formatarValorFinanceiro(f.total, f.moeda)} ·
                          Quitado: {formatarValorFinanceiro(f.pago, f.moeda)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {f.criada
                            ? 'Criação: ' + dataBr(f.criada)
                            : 'Quitação do legado: ' +
                              (f.quitada ? dataBr(f.quitada) : 'Não informada')}
                        </p>
                      </li>
                    ))}
                  </ul>
                  {!data.faturas.faturas.total && (
                    <p>Nenhuma fatura importada neste recorte.</p>
                  )}
                  <PaginacaoAnalitica
                    pagina={paginaFaturas}
                    total={data.faturas.faturas.total}
                    mudar={setPaginaFaturas}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle as="h2">Movimentos de saldo de origem</CardTitle>
                  <CardDescription>
                    Fonte dos valores brutos, tarifas e variação de saldo.
                    Inclui repasses e ajustes com seus sinais.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="grid gap-3 md:grid-cols-2">
                    {data.saldos.itens.map((m) => (
                      <li
                        key={m.id}
                        className="space-y-2 rounded-lg border p-4"
                      >
                        <p className="break-all font-medium">{m.externa}</p>
                        <p className="text-sm">
                          {nomeDoAmbiente(m.ambiente)} ·{' '}
                          {NOMES_DE_MOVIMENTOS[m.tipo] ?? 'Outro movimento'} ·{' '}
                          {NOMES_DE_MOVIMENTOS[m.categoria] ?? m.categoria} ·{' '}
                          {ESTADOS_FINANCEIROS[m.estado] ?? m.estado}
                        </p>
                        <p className="text-sm">
                          Bruto: {formatarValorFinanceiro(m.bruto, m.moeda)} ·
                          Tarifas: {formatarValorFinanceiro(m.taxas, m.moeda)}
                        </p>
                        <p className="text-sm font-medium">
                          Líquido: {formatarValorFinanceiro(m.liquido, m.moeda)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Criado: {dataBr(m.data)} · Disponível:{' '}
                          {dataBr(m.disponivelEm)} UTC
                        </p>
                        <p className="break-all text-xs text-muted-foreground">
                          Origem: {m.origem ?? 'Não informada'}
                        </p>
                      </li>
                    ))}
                  </ul>
                  {!data.saldos.total && (
                    <p>Nenhum movimento importado neste recorte.</p>
                  )}
                  <PaginacaoAnalitica
                    pagina={paginaSaldos}
                    total={data.saldos.total}
                    mudar={setPaginaSaldos}
                  />
                </CardContent>
              </Card>
            </>
          )}
          <details className="rounded-xl border bg-card p-5">
            <summary className="cursor-pointer font-medium">
              Definições e limites da análise
            </summary>
            <div className="mt-4 space-y-3 text-sm">
              <p>
                Uso: sem administradores, plano vigente e registros persistidos.
                Atividade usa oito fontes de ações; exclui navegação e chat
                efêmero. A conclusão do perfil é o estado atual das contas
                criadas no período. Exclusões reduzem o histórico; leituras e
                notificações têm retenção de até 90 dias. Conhecimento não
                significa RLHF.
              </p>
              <p>
                Financeiro: fatura, quitação, reembolso, saldo e registro fiscal
                são entidades distintas. Moedas e ambientes não são somados.
                Legado sem prova de ambiente permanece separado. Valores
                desconhecidos ficam não informados. Não há cálculo de MRR,
                lucro, churn, conversão de visitantes ou uptime sem as fontes
                necessárias.
              </p>
              <p>
                As seções usam consultas canônicas do dashboard e Faturamento.
                Atualizações concorrentes podem ocorrer entre fontes; os
                arquivos registram início/fim da leitura e não prometem uma
                fotografia atômica de toda a plataforma. O relatório não executa
                operações financeiras nem cria rastreamento clínico.
              </p>
            </div>
          </details>
        </>
      )}
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/admin/dashboard">Visão geral e gestão</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/dashboard?aba=faturamento">Gerir faturamento</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/data-health">Saúde dos dados</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/users">Gerir usuários</Link>
        </Button>
      </div>
      <AdminUserExport />
    </div>
  );
}
