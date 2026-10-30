'use client';
import { useCallback, useId, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { PageIntro } from '@/components/layout/PageIntro';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useAuth } from '@/context/AuthContext';
import { useKeyedResource } from '@/hooks/use-keyed-resource';
import { somarDias } from '@/lib/acontecimentos/analise';
import {
  JANELA_MAXIMA,
  ORIGENS,
  type ItemDaLinhaDoTempo,
  type LinhaDoTempo,
} from '@/lib/linha-do-tempo/esquema';
import { requisitar, erroNaPagina } from '@/components/experiencias/transporte';

const PERIODOS = [
  { dias: 1, nome: 'Somente este dia' },
  { dias: 7, nome: '7 dias até este dia' },
  { dias: 14, nome: '14 dias até este dia' },
  { dias: JANELA_MAXIMA, nome: `${JANELA_MAXIMA} dias até este dia` },
] as const;
const dataValida = (v: string | null) =>
  v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : null;
function diaPorExtenso(data: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${data}T12:00:00Z`));
}
const dataCurta = (s: string) => s.split('-').reverse().join('/');
/** Consulta da API: a janela nunca começa antes do histórico do plano. */
function urlDaConsulta(p: {
  dia: string;
  dias: number;
  filtro: string | null;
  corte: string | null;
  pagina: number;
}) {
  let inicio = somarDias(p.dia, -(p.dias - 1));
  if (p.corte && inicio < p.corte) inicio = p.corte;
  if (inicio > p.dia) inicio = p.dia;
  const q = new URLSearchParams({
    inicio,
    fim: p.dia,
    pagina: String(p.pagina),
  });
  if (p.filtro) q.set('assuntos', p.filtro);
  return `/api/linha-do-tempo?${q.toString()}`;
}

function Item({ i }: { i: ItemDaLinhaDoTempo }) {
  return (
    <li className="relative flex min-w-0 gap-3 pb-5 last:pb-0">
      <div className="flex w-16 shrink-0 flex-col items-end pt-0.5 text-right">
        <span className="text-sm font-semibold tabular-nums">
          {i.hora ?? (
            <span className="text-xs font-normal text-muted-foreground">
              No dia
            </span>
          )}
        </span>
      </div>
      <div
        aria-hidden="true"
        className="relative flex w-3 shrink-0 justify-center before:absolute before:top-0 before:bottom-[-1.25rem] before:w-px before:bg-border"
      >
        <span className="relative mt-1.5 size-2.5 rounded-full border-2 border-primary bg-card" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-lg border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{ORIGENS[i.origem].nome}</Badge>
        </div>
        <h4 className="font-semibold break-words [overflow-wrap:anywhere]">
          {i.titulo}
        </h4>
        <p className="text-sm break-words text-muted-foreground [overflow-wrap:anywhere]">
          {i.resumo}
        </p>
        {i.detalhes.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-primary focus-visible:outline-2 focus-visible:outline-ring">
              Ver detalhes
            </summary>
            <dl className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-[auto_1fr]">
              {i.detalhes.map((d) => (
                <div key={d.rotulo} className="contents">
                  <dt className="text-muted-foreground">{d.rotulo}</dt>
                  <dd className="break-words [overflow-wrap:anywhere]">
                    {d.valor}
                  </dd>
                </div>
              ))}
            </dl>
          </details>
        )}
        <Link
          href={i.destino}
          className="inline-flex w-fit items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
        >
          Abrir a origem
          <span className="sr-only">: {i.titulo}</span>
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </li>
  );
}

function Conteudo({ hoje, corte }: { hoje: string; corte: string | null }) {
  const router = useRouter(),
    q = useSearchParams(),
    ids = useId(),
    diaNaUrl = dataValida(q.get('dia')),
    dia =
      diaNaUrl && diaNaUrl <= hoje && (!corte || diaNaUrl >= corte)
        ? diaNaUrl
        : hoje,
    dias = PERIODOS.find((p) => String(p.dias) === q.get('dias'))?.dias ?? 1,
    filtro = q.get('assuntos'),
    [paginas, setPaginas] = useState(1),
    [extra, setExtra] = useState<ItemDaLinhaDoTempo[]>([]),
    [carregandoMais, setCarregandoMais] = useState(false),
    [falhaMais, setFalhaMais] = useState('');
  const navegar = (alteracoes: Record<string, string | null>) => {
    const p = new URLSearchParams(q.toString());
    for (const [k, v] of Object.entries(alteracoes))
      if (v === null) p.delete(k);
      else p.set(k, v);
    setPaginas(1);
    setExtra([]);
    setFalhaMais('');
    router.replace(`/linha-do-tempo?${p.toString()}`, { scroll: false });
  };
  const carregar = useCallback(
      () =>
        requisitar<LinhaDoTempo>(
          urlDaConsulta({ dia, dias, filtro, corte, pagina: 0 })
        ),
      [dia, dias, filtro, corte]
    ),
    { data, loading, error, refresh } = useKeyedResource<LinhaDoTempo | null>(
      `${dia}:${dias}:${filtro ?? ''}`,
      carregar,
      erroNaPagina,
      null
    );
  const maisItens = async () => {
    if (!data || data.proximaPagina === null) return;
    setCarregandoMais(true);
    setFalhaMais('');
    try {
      const r = await requisitar<LinhaDoTempo>(
        urlDaConsulta({ dia, dias, filtro, corte, pagina: paginas })
      );
      setExtra((e) => [...e, ...r.itens]);
      setPaginas((p) => p + 1);
    } catch (e) {
      setFalhaMais(
        e instanceof Error ? e.message : 'Não foi possível carregar mais.'
      );
    } finally {
      setCarregandoMais(false);
    }
  };
  const itens = data ? [...data.itens, ...extra] : [],
    porDia = new Map<string, ItemDaLinhaDoTempo[]>();
  for (const i of itens) porDia.set(i.data, [...(porDia.get(i.data) ?? []), i]);
  const temMais =
      data !== null && itens.length < data.total && data.proximaPagina !== null,
    assuntosVisiveis = data?.assuntos.filter((a) => a.disponivel) ?? [],
    selecionados =
      data?.assuntos.filter((a) => a.selecionado).map((a) => a.id) ?? [];
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageIntro
        title="Minha linha do tempo"
        description="Escolha um dia e encontre juntos seus registros, práticas, metas e acontecimentos, cada um com a origem identificada."
        actions={
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => {
              setPaginas(1);
              setExtra([]);
              void refresh();
            }}
          >
            <RefreshCw />
            Atualizar
          </Button>
        }
      />
      <Card>
        <CardContent className="flex flex-col gap-5 pt-6">
          <div className="grid gap-4 sm:grid-cols-2 @3xl/linha:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <Field>
              <FieldLabel htmlFor={`${ids}-dia`}>Dia</FieldLabel>
              <Input
                id={`${ids}-dia`}
                type="date"
                value={dia}
                min={corte ?? undefined}
                max={hoje}
                onChange={(e) => {
                  const v = dataValida(e.target.value);
                  if (v && v <= hoje && (!corte || v >= corte))
                    navegar({ dia: v });
                }}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${ids}-periodo`}>Período</FieldLabel>
              <Select
                value={String(dias)}
                onValueChange={(v) => {
                  if (PERIODOS.some((p) => String(p.dias) === v))
                    navegar({ dias: v === '1' ? null : v });
                }}
              >
                <SelectTrigger id={`${ids}-periodo`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {PERIODOS.map((p) => (
                      <SelectItem key={p.dias} value={String(p.dias)}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <div className="flex min-w-0 flex-wrap items-end gap-2 sm:col-span-2 @3xl/linha:col-span-1">
              <Button
                variant="outline"
                className="min-w-0 flex-1 sm:flex-none"
                disabled={Boolean(corte && somarDias(dia, -1) < corte)}
                onClick={() => navegar({ dia: somarDias(dia, -1) })}
              >
                <ChevronLeft />
                Dia anterior
              </Button>
              <Button
                variant="outline"
                className="min-w-0 flex-1 sm:flex-none"
                disabled={dia >= hoje}
                onClick={() =>
                  navegar({
                    dia: somarDias(dia, 1) === hoje ? null : somarDias(dia, 1),
                  })
                }
              >
                Próximo dia
                <ChevronRight />
              </Button>
            </div>
          </div>
          {data && (
            <div className="flex flex-col gap-2">
              <p id={`${ids}-assuntos`} className="text-sm font-medium">
                Assuntos
              </p>
              <ToggleGroup
                type="multiple"
                aria-labelledby={`${ids}-assuntos`}
                value={selecionados}
                onValueChange={(v) => {
                  const validos = v.filter((a) =>
                    assuntosVisiveis.some((x) => x.id === a)
                  );
                  if (!validos.length) return;
                  navegar({
                    assuntos:
                      validos.length === assuntosVisiveis.length
                        ? null
                        : validos.join(','),
                  });
                }}
                className="flex flex-wrap justify-start gap-2"
              >
                {assuntosVisiveis.map((a) => (
                  <ToggleGroupItem
                    key={a.id}
                    value={a.id}
                    variant="outline"
                    className="h-auto gap-2 px-3 py-1.5 data-[state=on]:border-primary data-[state=on]:bg-primary/8"
                  >
                    {a.nome}
                    <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums">
                      {a.total}
                    </span>
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <p className="text-xs text-muted-foreground">
                Mantenha ao menos um assunto selecionado. Fuso do perfil{' '}
                {data.fuso}
                {data.corte
                  ? ` · histórico do plano desde ${dataCurta(data.corte)}`
                  : ''}
                .
                {data.origensIndisponiveis.length > 0 &&
                  ` Origens fora do seu plano não aparecem: ${data.origensIndisponiveis.map((o) => ORIGENS[o].nome).join(', ')}.`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      {error && !data ? (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível carregar sua linha do tempo</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Tente novamente.'}
            <Button variant="outline" onClick={() => void refresh()}>
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      ) : !data ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (
        <section
          aria-labelledby={`${ids}-resultado`}
          aria-busy={loading}
          className="flex min-w-0 flex-col gap-6"
        >
          <h3 id={`${ids}-resultado`} className="sr-only">
            Itens da linha do tempo
          </h3>
          <p role="status" className="text-sm text-muted-foreground">
            {data.total === 0
              ? 'Nenhum registro encontrado neste período.'
              : `${data.total} ${data.total === 1 ? 'item' : 'itens'} de ${dataCurta(data.inicio)} a ${dataCurta(data.fim)}${itens.length < data.total ? ` · mostrando ${itens.length}` : ''}.`}
          </p>
          {data.total === 0 && (
            <Card>
              <CardContent className="flex flex-col gap-2 pt-6 text-sm text-muted-foreground">
                <p>
                  Não há registros dos assuntos escolhidos neste período. Um dia
                  sem registro não significa que nada aconteceu.
                </p>
                <p>
                  Experimente outro dia, um período maior ou outros assuntos.
                </p>
              </CardContent>
            </Card>
          )}
          {[...porDia.entries()].map(([d, lista]) => (
            <section
              key={d}
              aria-labelledby={`${ids}-dia-${d}`}
              className="flex min-w-0 flex-col gap-3"
            >
              <h3
                id={`${ids}-dia-${d}`}
                className="flex items-center gap-2 text-base font-semibold first-letter:uppercase"
              >
                <Clock className="size-4 text-primary" aria-hidden="true" />
                {diaPorExtenso(d)}
              </h3>
              <ol className="flex min-w-0 flex-col">
                {lista.map((i) => (
                  <Item key={i.chave} i={i} />
                ))}
              </ol>
            </section>
          ))}
          {falhaMais && (
            <Alert variant="destructive">
              <AlertTitle>Não foi possível carregar mais itens</AlertTitle>
              <AlertDescription>{falhaMais}</AlertDescription>
            </Alert>
          )}
          {temMais && (
            <Button
              variant="outline"
              className="self-center"
              disabled={carregandoMais}
              onClick={() => void maisItens()}
            >
              {carregandoMais ? 'Carregando…' : 'Carregar mais itens'}
            </Button>
          )}
        </section>
      )}
    </div>
  );
}

/** Página da linha do tempo: o dia de hoje vem do servidor, no fuso do perfil. */
export function LinhaDoTempoPessoal() {
  const { session } = useAuth(),
    inicial = useCallback(
      () => requisitar<LinhaDoTempo>('/api/linha-do-tempo'),
      []
    ),
    { data, error, refresh } = useKeyedResource<LinhaDoTempo | null>(
      session?.user.id ?? null,
      inicial,
      erroNaPagina,
      null
    );
  if (error && !data)
    return (
      <Alert variant="destructive">
        <AlertTitle>Não foi possível abrir sua linha do tempo</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : 'Tente novamente.'}
          <Button variant="outline" onClick={() => void refresh()}>
            Tentar novamente
          </Button>
        </AlertDescription>
      </Alert>
    );
  if (!data) return <Skeleton className="h-64 rounded-xl" />;
  return <Conteudo hoje={data.hoje} corte={data.corte} />;
}
