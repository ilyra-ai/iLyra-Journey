'use client';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Archive, ArchiveRestore, Pencil, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { PageIntro } from '@/components/layout/PageIntro';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useKeyedResource } from '@/hooks/use-keyed-resource';
import {
  FREQUENCIAS,
  faixaDaEscala,
  inicioDaSemana,
  type DetalheDoAcompanhamento as Detalhe,
  type Frequencia,
} from '@/lib/acompanhamentos/esquema';
import { somarDias } from '@/lib/acontecimentos/analise';
import {
  dataBreve,
  numero,
} from '@/components/acontecimentos/GraficoDosAcontecimentos';
import { requisitar, erroNaPagina } from '@/components/experiencias/transporte';
import { EditorDoAcompanhamento } from './EditorDoAcompanhamento';
import { GraficoDoAcompanhamento } from './GraficoDoAcompanhamento';
import { RespostaDoPeriodo } from './RespostaDoPeriodo';

const JANELAS: Record<
  Frequencia,
  Array<{ id: string; nome: string; dias: number }>
> = {
  diaria: [
    { id: '7', nome: 'Últimos 7 dias', dias: 7 },
    { id: '30', nome: 'Últimos 30 dias', dias: 30 },
    { id: '90', nome: 'Últimos 90 dias', dias: 90 },
    { id: '365', nome: 'Últimos 365 dias', dias: 365 },
  ],
  semanal: [
    { id: '28', nome: 'Últimas 4 semanas', dias: 28 },
    { id: '84', nome: 'Últimas 12 semanas', dias: 84 },
    { id: '182', nome: 'Últimas 26 semanas', dias: 182 },
    { id: '364', nome: 'Últimas 52 semanas', dias: 364 },
  ],
};
export function rotuloDoPeriodo(frequencia: Frequencia, data: string) {
  return frequencia === 'semanal'
    ? `semana de ${dataBreve(data)}`
    : dataBreve(data);
}

export function DetalheDoAcompanhamento({
  id,
  voltar,
}: {
  id: string;
  voltar: () => void;
}) {
  const ids = useId(),
    [janela, setJanela] = useState<{ inicio: string; fim: string } | null>(
      null
    ),
    [janelaId, setJanelaId] = useState(''),
    carregar = useCallback(
      () =>
        requisitar<Detalhe>(
          `/api/acompanhamentos/${encodeURIComponent(id)}${
            janela ? `?inicio=${janela.inicio}&fim=${janela.fim}` : ''
          }`
        ),
      [id, janela]
    ),
    {
      data: d,
      loading,
      error,
      refresh,
    } = useKeyedResource<Detalhe | null>(
      `${id}:${janela?.inicio ?? ''}:${janela?.fim ?? ''}`,
      carregar,
      erroNaPagina,
      null,
      carregar,
      true
    ),
    [ocupada, setOcupada] = useState(false),
    [falha, setFalha] = useState(''),
    [editor, setEditor] = useState(false),
    [periodo, setPeriodo] = useState(''),
    focado = useRef(false);
  useEffect(() => {
    if (d && !focado.current) {
      focado.current = true;
      document.getElementById('titulo-acompanhamento-aberto')?.focus();
    }
  }, [d]);
  const agir = async (acao: 'arquivar' | 'restaurar') => {
    if (!d || ocupada) return;
    setOcupada(true);
    setFalha('');
    try {
      await requisitar(`/api/acompanhamentos/${id}`, 'POST', {
        acao,
        versao: d.acompanhamento.versao,
      });
      await refresh();
      toast.success(
        acao === 'arquivar'
          ? 'Acompanhamento arquivado. As respostas foram preservadas.'
          : 'Acompanhamento restaurado.'
      );
      requestAnimationFrame(() =>
        document.getElementById('titulo-acompanhamento-aberto')?.focus()
      );
    } catch (e) {
      setFalha(e instanceof Error ? e.message : 'Não foi possível atualizar.');
    } finally {
      setOcupada(false);
    }
  };
  const excluir = async () => {
    if (!d) return;
    setOcupada(true);
    setFalha('');
    try {
      await requisitar(`/api/acompanhamentos/${id}`, 'DELETE', {
        versao: d.acompanhamento.versao,
      });
      toast.success('Acompanhamento excluído com todas as respostas.');
      voltar();
    } catch (e) {
      setFalha(e instanceof Error ? e.message : 'Não foi possível excluir.');
    } finally {
      setOcupada(false);
    }
  };
  if (error && !d)
    return (
      <Alert variant="destructive">
        <AlertTitle>Não foi possível abrir o acompanhamento</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : 'Tente novamente.'}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void refresh()}>
              Tentar novamente
            </Button>
            <Button variant="outline" onClick={voltar}>
              Voltar aos acompanhamentos
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  if (!d) return <Skeleton className="h-64 rounded-xl" />;
  const a = d.acompanhamento,
    def = a.definicao,
    frequencia = def.frequencia,
    escolhido = periodo || a.periodoAtual,
    registroEscolhido = d.registros.find((r) => r.data === escolhido) ?? null,
    porData = new Map(d.registros.map((r) => [r.data, r])),
    linhas = Array.from(
      new Set([...d.periodos, ...d.registros.map((r) => r.data)])
    ).sort((x, y) => (x < y ? 1 : -1)),
    sequencia = new Map(d.definicoes.map((x) => [x.id, x.sequencia])),
    minimoPermitido = d.corte ?? undefined,
    semanas = Array.from({ length: 12 }, (_, i) =>
      somarDias(inicioDaSemana(d.hoje), -7 * i)
    ).filter((s) => !d.corte || s >= d.corte),
    janelasDisponiveis = JANELAS[frequencia];
  const escolherJanela = (v: string) => {
    const j = janelasDisponiveis.find((x) => x.id === v);
    if (!j) return;
    let inicio =
      frequencia === 'semanal'
        ? somarDias(inicioDaSemana(d.hoje), -(j.dias - 7))
        : somarDias(d.hoje, -(j.dias - 1));
    if (d.corte && inicio < d.corte) inicio = d.corte;
    setJanelaId(v);
    setJanela({ inicio, fim: d.hoje });
  };
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageIntro
        title={
          <span
            id="titulo-acompanhamento-aberto"
            tabIndex={-1}
            className="break-words [overflow-wrap:anywhere] focus-visible:outline-2 focus-visible:outline-ring"
          >
            {a.nome}
          </span>
        }
        description={
          a.descricao ||
          'Seu acompanhamento pessoal: responda no seu ritmo e veja como suas percepções evoluem.'
        }
        actions={
          <>
            <Button variant="outline" disabled={ocupada} onClick={voltar}>
              Voltar aos acompanhamentos
            </Button>
            <Button
              variant="outline"
              disabled={ocupada || loading}
              onClick={() => {
                setFalha('');
                void refresh();
              }}
            >
              <RefreshCw />
              Atualizar
            </Button>
          </>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{FREQUENCIAS[frequencia].nome}</Badge>
        <Badge variant="secondary">Escala {faixaDaEscala(def.escala)}</Badge>
        {d.definicoes.length > 1 && (
          <Badge variant="outline">
            {d.definicoes.length} versões da escala
          </Badge>
        )}
        {a.arquivado && <Badge variant="outline">Arquivado</Badge>}
        <span className="text-sm text-muted-foreground">
          Hoje {dataBreve(d.hoje)} · fuso do perfil {d.fuso}
          {d.corte ? ` · histórico do plano desde ${dataBreve(d.corte)}` : ''}
        </span>
      </div>
      {falha && (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível concluir</AlertTitle>
          <AlertDescription>{falha}</AlertDescription>
        </Alert>
      )}
      {error !== null && (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível atualizar os dados</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Tente novamente.'}
          </AlertDescription>
        </Alert>
      )}
      <div className="grid min-w-0 gap-6 @5xl/acompanhamentos:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Responder</CardTitle>
            <CardDescription>
              {frequencia === 'semanal'
                ? 'Uma resposta por semana, registrada na segunda-feira.'
                : 'Uma resposta por dia. Você pode completar dias anteriores.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {a.arquivado ? (
              <Alert>
                <AlertTitle>Acompanhamento arquivado</AlertTitle>
                <AlertDescription>
                  As respostas continuam disponíveis para consulta. Restaure o
                  acompanhamento para registrar novas respostas.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {frequencia === 'semanal' ? (
                  <Field>
                    <FieldLabel htmlFor={`${ids}-semana`}>Semana</FieldLabel>
                    <Select
                      value={escolhido}
                      disabled={ocupada}
                      onValueChange={setPeriodo}
                    >
                      <SelectTrigger id={`${ids}-semana`} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {semanas.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s === a.periodoAtual
                                ? `Esta semana (${dataBreve(s)})`
                                : `Semana de ${dataBreve(s)}`}
                              {porData.has(s) ? ' · respondida' : ''}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                ) : (
                  <Field>
                    <FieldLabel htmlFor={`${ids}-dia`}>Dia</FieldLabel>
                    <Input
                      id={`${ids}-dia`}
                      type="date"
                      value={escolhido}
                      min={minimoPermitido}
                      max={d.hoje}
                      disabled={ocupada}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v && v <= d.hoje && (!d.corte || v >= d.corte))
                          setPeriodo(v);
                      }}
                    />
                  </Field>
                )}
                {!d.registros.some((r) => r.data === escolhido) &&
                  (escolhido < d.inicio || escolhido > d.fim) && (
                    <p className="text-sm text-muted-foreground">
                      Este período está fora da janela exibida abaixo; uma
                      resposta existente aparecerá ao ampliar a janela.
                    </p>
                  )}
                <RespostaDoPeriodo
                  key={`${escolhido}:${registroEscolhido?.versao ?? 0}:${def.id}`}
                  id={id}
                  nome={a.nome}
                  data={escolhido}
                  rotuloDoPeriodo={rotuloDoPeriodo(frequencia, escolhido)}
                  escala={def.escala}
                  inicial={registroEscolhido}
                  ocupada={ocupada}
                  ocupar={setOcupada}
                  salvo={async (m) => {
                    await refresh();
                    toast.success(m);
                  }}
                />
              </>
            )}
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex flex-col gap-1.5">
                <CardTitle>Evolução</CardTitle>
                <CardDescription>
                  {dataBreve(d.inicio)} a {dataBreve(d.fim)}
                </CardDescription>
              </div>
              <Field className="w-full sm:w-56">
                <FieldLabel htmlFor={`${ids}-janela`}>
                  Período exibido
                </FieldLabel>
                <Select
                  value={janelaId || janelasDisponiveis[1].id}
                  disabled={loading}
                  onValueChange={escolherJanela}
                >
                  <SelectTrigger id={`${ids}-janela`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {janelasDisponiveis.map((j) => (
                        <SelectItem key={j.id} value={j.id}>
                          {j.nome}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-5" aria-busy={loading}>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['Respostas', String(d.registros.length)],
                ['Sem registro', String(d.semRegistro)],
                [
                  'Mediana (escala atual)',
                  (() => {
                    const r = d.resumos.find((x) => x.definicaoId === def.id);
                    return r?.mediana === null || r === undefined
                      ? '—'
                      : numero(r.mediana);
                  })(),
                ],
                ['Total no histórico', String(a.registros)],
              ].map(([t, v]) => (
                <div
                  key={t}
                  className="flex min-w-0 flex-col gap-1 rounded-lg border border-border p-3"
                >
                  <dt className="text-xs text-muted-foreground">{t}</dt>
                  <dd className="text-xl font-semibold tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
            <GraficoDoAcompanhamento dados={d} />
            {d.resumos.length > 1 && (
              <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                {d.resumos.map((r) => {
                  const definicao = d.definicoes.find(
                    (x) => x.id === r.definicaoId
                  )!;
                  return (
                    <li key={r.definicaoId}>
                      Versão {r.sequencia} da escala (
                      {faixaDaEscala(definicao.escala)},{' '}
                      {FREQUENCIAS[definicao.frequencia].nome.toLowerCase()}):{' '}
                      {r.respostas}{' '}
                      {r.respostas === 1 ? 'resposta' : 'respostas'}
                      {r.mediana !== null &&
                        ` · mediana ${numero(r.mediana)} · de ${r.minimo} a ${r.maximo}`}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Histórico de respostas</CardTitle>
          <CardDescription>
            Cada período mostra a resposta com o rótulo da escala em que foi
            dada. Sem registro significa que não houve resposta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {linhas.length ? (
            <Table
              className="min-w-[40rem]"
              scrollLabel="Tabela do histórico de respostas"
            >
              <TableCaption>
                Relatos pessoais da própria conta, sem conversão entre escalas.
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Resposta</TableHead>
                  <TableHead>Escala</TableHead>
                  <TableHead>Nota</TableHead>
                  <TableHead>
                    <span className="sr-only">Ações</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((data) => {
                  const r = porData.get(data),
                    freq =
                      r &&
                      d.definicoes.find((x) => x.id === r.definicaoId)
                        ?.frequencia;
                  return (
                    <TableRow key={data}>
                      <TableCell className="whitespace-nowrap">
                        {rotuloDoPeriodo(freq ?? frequencia, data)}
                      </TableCell>
                      <TableCell>
                        {r ? (
                          r.rotulo
                        ) : (
                          <span className="text-muted-foreground">
                            Sem registro
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {r
                          ? r.definicaoAnterior
                            ? `Versão ${sequencia.get(r.definicaoId)} (anterior)`
                            : 'Atual'
                          : '—'}
                      </TableCell>
                      <TableCell className="max-w-72 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                        {r?.nota || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {!a.arquivado &&
                          (frequencia === 'diaria' ||
                            inicioDaSemana(data) === data) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={ocupada}
                              onClick={() => {
                                setPeriodo(data);
                                requestAnimationFrame(() =>
                                  document
                                    .getElementById(
                                      frequencia === 'semanal'
                                        ? `${ids}-semana`
                                        : `${ids}-dia`
                                    )
                                    ?.focus()
                                );
                              }}
                            >
                              {r ? 'Editar' : 'Responder'}
                              <span className="sr-only">
                                {' '}
                                {rotuloDoPeriodo(frequencia, data)}
                              </span>
                            </Button>
                          )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum período acompanhado nesta janela.
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Organizar</CardTitle>
          <CardDescription>
            Edite nome, escala ou frequência, arquive para pausar sem perder as
            respostas ou exclua definitivamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={ocupada}
            onClick={() => setEditor(true)}
          >
            <Pencil />
            Editar acompanhamento
          </Button>
          <Button
            variant="outline"
            disabled={ocupada}
            onClick={() => void agir(a.arquivado ? 'restaurar' : 'arquivar')}
          >
            {a.arquivado ? <ArchiveRestore /> : <Archive />}
            {a.arquivado ? 'Restaurar' : 'Arquivar'}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" disabled={ocupada}>
                Excluir acompanhamento
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-h-[calc(100%-2rem)] overflow-y-auto">
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir “{a.nome}”?</AlertDialogTitle>
                <AlertDialogDescription>
                  O acompanhamento, todas as versões da escala e as{' '}
                  {a.registros} respostas serão removidos definitivamente.
                  Métricas, metas e demais registros permanecem. Para guardar as
                  respostas, prefira arquivar.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Manter acompanhamento</AlertDialogCancel>
                <AlertDialogAction onClick={() => void excluir()}>
                  Excluir definitivamente
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
      <Dialog
        open={editor}
        onOpenChange={(v) => {
          if (!ocupada) setEditor(v);
        }}
      >
        <DialogContent className="flex max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-2xl flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>Editar acompanhamento</DialogTitle>
            <DialogDescription>
              Nome e descrição são atualizados em todas as respostas. Uma nova
              escala ou frequência vale para as próximas respostas.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 overflow-y-auto">
            <EditorDoAcompanhamento
              key={`${a.id}:${a.versao}`}
              atual={a}
              ocupada={ocupada}
              ocupar={setOcupada}
              concluido={() => {
                setEditor(false);
                void refresh().then(() =>
                  toast.success('Acompanhamento atualizado.')
                );
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
