'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Copy, Pause, Play, RefreshCw } from 'lucide-react';
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
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
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
import { useRotaLiberada } from '@/hooks/use-rota-liberada';
import { PlanFeatureGate } from '@/components/subscription/PlanFeatureGate';
import type { ResumoDaExperiencia } from '@/lib/experiencias/esquema';
import {
  dataBreve,
  numero,
} from '@/components/acontecimentos/GraficoDosAcontecimentos';
import { requisitar, erroNaPagina } from './transporte';
import { RelatoDoDia } from './RelatoDoDia';

export function DetalheDaExperiencia({
  id,
  voltar,
}: {
  id: string;
  voltar: () => void;
}) {
  const carregar = useCallback(
      () =>
        requisitar<ResumoDaExperiencia>(
          `/api/experiencias/${encodeURIComponent(id)}`
        ),
      [id]
    ),
    {
      data: r,
      loading,
      error,
      refresh,
    } = useKeyedResource<ResumoDaExperiencia | null>(
      id,
      carregar,
      erroNaPagina,
      null
    );
  const [ocupada, setOcupada] = useState(false),
    [falha, setFalha] = useState(''),
    [dia, setDia] = useState(''),
    [diaAberto, setDiaAberto] = useState<string | null>(null),
    focado = useRef(false),
    acionador = useRef<HTMLElement | null>(null),
    rotaLiberada = useRotaLiberada();
  useEffect(() => {
    if (r && !focado.current) {
      focado.current = true;
      document.getElementById('titulo-experiencia-aberta')?.focus();
    }
  }, [r]);
  const atualizar = async () => {
    setFalha('');
    await refresh();
  };
  const agir = async (acao: 'pausar' | 'retomar' | 'encerrar') => {
    if (!r || ocupada) return;
    setOcupada(true);
    setFalha('');
    try {
      await requisitar(`/api/experiencias/${id}`, 'POST', {
        acao,
        versao: r.experiencia.versao,
      });
      await refresh();
      requestAnimationFrame(() =>
        document.getElementById('titulo-experiencia-aberta')?.focus()
      );
    } catch (e) {
      setFalha(e instanceof Error ? e.message : 'Não foi possível atualizar.');
    } finally {
      setOcupada(false);
    }
  };
  const excluir = async () => {
    if (!r) return;
    setOcupada(true);
    setFalha('');
    try {
      await requisitar(`/api/experiencias/${id}`, 'DELETE', {
        versao: r.experiencia.versao,
      });
      voltar();
    } catch (e) {
      setFalha(e instanceof Error ? e.message : 'Não foi possível excluir.');
    } finally {
      setOcupada(false);
    }
  };
  if (error)
    return (
      <Alert variant="destructive">
        <AlertTitle>Não foi possível abrir a experiência</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : 'Tente novamente.'}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void refresh()}>
              Tentar novamente
            </Button>
            <Button variant="outline" onClick={voltar}>
              Voltar às experiências
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  if (loading && !r) return <Skeleton className="h-48 rounded-xl" />;
  if (!r) return null;
  const e = r.experiencia,
    terminouPeriodo = r.hoje > e.fim,
    dataEscolhida = dia || r.fimObservado;
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageIntro
        title={
          <span
            id="titulo-experiencia-aberta"
            tabIndex={-1}
            className="focus-visible:outline-2 focus-visible:outline-ring"
          >
            {e.titulo}
          </span>
        }
        description="Acompanhamento pessoal e revisão local dos seus registros. A proposta fica preservada; os relatos podem ser corrigidos nas datas observadas."
        actions={
          <>
            <Button
              variant="outline"
              disabled={ocupada || loading}
              onClick={voltar}
            >
              Voltar às experiências
            </Button>
            <Button
              variant="outline"
              disabled={ocupada || loading}
              onClick={() => void atualizar()}
            >
              <RefreshCw />
              Atualizar
            </Button>
          </>
        }
      />
      {falha && (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível concluir</AlertTitle>
          <AlertDescription>{falha}</AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Sua proposta</CardTitle>
            <Badge variant="secondary">
              {e.estado === 'em_curso'
                ? 'Em acompanhamento'
                : e.estado === 'pausada'
                  ? 'Pausada'
                  : 'Encerrada'}
            </Badge>
          </div>
          <CardDescription>
            Registrada em{' '}
            {new Intl.DateTimeFormat('pt-BR', {
              dateStyle: 'short',
              timeStyle: 'short',
            }).format(new Date(e.registradaEm))}{' '}
            · fuso preservado: {e.fuso}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium">Objetivo</p>
            <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
              {e.objetivo}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">Mudança escolhida</p>
            <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
              {e.mudanca}
            </p>
          </div>
          <p className="text-sm">
            Referência: {dataBreve(e.inicioReferencia)} a{' '}
            {dataBreve(e.fimReferencia)}.<br />
            Observação prevista: {dataBreve(e.inicio)} a {dataBreve(e.fim)}.
            <br />
            Sono: registro{' '}
            {e.alinhamentoSono ? 'do dia seguinte' : 'do mesmo dia'} em relação
            ao dia observado. Energia: registro do mesmo dia.
          </p>
          {e.retrospectiva && (
            <p className="text-sm text-muted-foreground">
              A proposta foi registrada depois da data de início informada.
              Considere o viés da lembrança ao revisar; não foram criados
              relatos retroativos automaticamente.
            </p>
          )}
          {e.dataEncerramento && (
            <p className="text-sm">
              Encerrada em {dataBreve(e.dataEncerramento)}
              {e.dataEncerramento < e.fim ? ' antes do fim previsto' : ''}. A
              revisão considera somente o período já observado.
            </p>
          )}
          {terminouPeriodo && e.estado !== 'encerrada' && (
            <p role="status" className="text-sm font-medium">
              O período de observação terminou. Você pode encerrar e revisar o
              que ficou registrado.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {e.estado !== 'encerrada' && !terminouPeriodo && (
              <Button
                disabled={ocupada || loading}
                onClick={() =>
                  void agir(e.estado === 'pausada' ? 'retomar' : 'pausar')
                }
              >
                {e.estado === 'pausada' ? <Play /> : <Pause />}
                {e.estado === 'pausada'
                  ? 'Retomar experiência'
                  : 'Pausar experiência'}
              </Button>
            )}
            {e.estado !== 'encerrada' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={ocupada || loading}>
                    Encerrar experiência
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-h-[calc(100%-2rem)] overflow-y-auto">
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Encerrar o acompanhamento?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      O encerramento usa a data real de hoje. Dias futuros não
                      serão contados. Você poderá revisar e corrigir relatos das
                      datas observadas; esta experiência não poderá ser
                      retomada.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>
                      Continuar acompanhando
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={() => void agir('encerrar')}>
                      Encerrar e revisar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" disabled={ocupada || loading}>
                  Excluir experiência
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-h-[calc(100%-2rem)] overflow-y-auto">
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir esta experiência?</AlertDialogTitle>
                  <AlertDialogDescription>
                    A proposta, os relatos e as pausas serão removidos. Seus
                    hábitos, metas, métricas e práticas permanecem guardados.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Manter experiência</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void excluir()}>
                    Excluir experiência
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <p className="text-sm text-muted-foreground">
            Pausar não estende o período. Qualquer dia civil tocado por uma
            pausa fica identificado e é excluído da comparação de métricas,
            mesmo que haja relato. A experiência não cria metas, pontos ou
            minutos.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Acompanhamento de um dia</CardTitle>
          <CardDescription>
            Conte como foi, inclusive se não seguiu a mudança ou se houve outras
            mudanças na rotina. Sem relato continua desconhecido.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(ev) => {
              ev.preventDefault();
              acionador.current =
                document.activeElement instanceof HTMLElement
                  ? document.activeElement
                  : null;
              setDiaAberto(dataEscolhida);
            }}
          >
            <FieldGroup className="min-w-0 flex-[1_1_12rem]">
              <Field>
                <FieldLabel htmlFor="data-relato">Dia observado</FieldLabel>
                <Input
                  id="data-relato"
                  type="date"
                  required
                  min={e.inicio}
                  max={r.fimObservado}
                  value={dataEscolhida}
                  disabled={ocupada}
                  onChange={(ev) => setDia(ev.target.value)}
                />
              </Field>
            </FieldGroup>
            <Button type="submit" disabled={ocupada || loading}>
              Abrir acompanhamento do dia
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Revisão local da Lyra</CardTitle>
          <CardDescription>
            Análise automática e descritiva de dados disponíveis. Não houve
            chamada a modelo externo e não se conclui causalidade.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex min-w-0 flex-col gap-4">
          {r.revisao.map((texto, i) => (
            <p key={i} className="break-words text-sm [overflow-wrap:anywhere]">
              {texto}
            </p>
          ))}
          <p className="text-xs text-muted-foreground">
            Atualizada em{' '}
            {new Intl.DateTimeFormat('pt-BR', {
              dateStyle: 'short',
              timeStyle: 'short',
            }).format(new Date(r.calculadaEm))}
            . Lacunas não são preenchidas e o plano limita quais métricas
            históricas podem ser lidas.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                void navigator.clipboard
                  .writeText(
                    [e.titulo, e.objetivo, e.mudanca, ...r.revisao].join('\n\n')
                  )
                  .then(() =>
                    toast.success(
                      'Revisão copiada. Você escolhe onde compartilhar.'
                    )
                  )
                  .catch(() =>
                    toast.error('Não foi possível copiar neste navegador.')
                  );
              }}
            >
              <Copy />
              Copiar revisão
            </Button>
            {rotaLiberada('/chat') && (
              <Button asChild variant="ghost">
                <Link href="/chat">Abrir conversa com a Lyra</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      <div className="grid min-w-0 gap-4 @3xl/experiencias:grid-cols-2">
        {r.comparacoes.map((c) => (
          <Card key={c.metrica}>
            <CardHeader>
              <CardTitle>{c.nome}</CardTitle>
              <CardDescription>
                {c.nReferencia} dias válidos de referência · {c.nObservacao}{' '}
                dias válidos de observação sem pausa
              </CardDescription>
            </CardHeader>
            <CardContent>
              {c.apta ? (
                <dl className="grid gap-3">
                  <div>
                    <dt className="text-sm text-muted-foreground">
                      Mediana na referência
                    </dt>
                    <dd className="text-xl font-semibold">
                      {numero(c.medianaReferencia!)} {c.unidade}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">
                      Mediana na observação
                    </dt>
                    <dd className="text-xl font-semibold">
                      {numero(c.medianaObservacao!)} {c.unidade}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">
                      Diferença descritiva (observação menos referência)
                    </dt>
                    <dd>
                      {numero(c.diferenca!)} {c.unidade}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Dados insuficientes para medianas comparativas. Este recurso
                  exige {r.criterios.referencia} dias válidos de referência e{' '}
                  {r.criterios.observacao} de observação. Isso não é um critério
                  clínico nem teste de significância.
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Registros e lacunas</CardTitle>
          <CardDescription>
            Datas são as do contexto da experiência. A coluna do sono informa a
            data efetiva de sua métrica; energia usa o mesmo dia. Origem:
            registros diários consolidados, sem atribuição inventada a um
            dispositivo.
          </CardDescription>
        </CardHeader>
        <CardContent className="min-w-0">
          <Table
            className="min-w-[48rem]"
            scrollLabel="Dados da referência e observação da experiência"
          >
            <TableCaption>
              Somente valores existentes, com suas unidades. Dias pausados não
              entram nas comparações. Métricas fora da janela do plano ficam
              indisponíveis.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Data do contexto</TableHead>
                <TableHead>Fase</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Data do sono</TableHead>
                <TableHead>Sono (min)</TableHead>
                <TableHead>Energia (1–5)</TableHead>
                <TableHead>Acompanhamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {r.linhas.map((l) => (
                <TableRow key={`${l.fase}:${l.data}`}>
                  <TableCell className="whitespace-nowrap">
                    {dataBreve(l.data)}
                  </TableCell>
                  <TableCell>
                    {l.fase === 'referencia' ? 'Referência' : 'Observação'}
                  </TableCell>
                  <TableCell>
                    {l.foraDoHistorico
                      ? 'Fora do histórico'
                      : l.pausado
                        ? 'Dia pausado'
                        : 'Disponível'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {dataBreve(l.dataSono)}
                  </TableCell>
                  <TableCell>
                    {l.sono === null ? 'Sem valor válido' : numero(l.sono)}
                  </TableCell>
                  <TableCell>
                    {l.energia === null
                      ? 'Sem valor válido'
                      : numero(l.energia)}
                  </TableCell>
                  <TableCell>
                    {l.fase === 'referencia'
                      ? 'Não se aplica'
                      : l.nota
                        ? l.nota.seguiu === 'sim'
                          ? 'Seguiu'
                          : l.nota.seguiu === 'parcial'
                            ? 'Parcialmente'
                            : l.nota.seguiu === 'nao'
                              ? 'Não seguiu'
                              : 'Relato sem informar seguimento'
                        : 'Sem relato'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Seus relatos</CardTitle>
          <CardDescription>
            Percepção sobre a mudança na sua escala pessoal: 1 muito
            desconfortável, 5 muito confortável. Não é uma medição clínica.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {r.relatos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ainda não há relatos. Nenhum dia foi marcado automaticamente como
              seguido ou não seguido.
            </p>
          ) : (
            r.relatos.map((n) => (
              <div
                key={n.idRelato}
                className="rounded-xl border border-border p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-medium">{dataBreve(n.data)}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={ocupada}
                    onClick={() => {
                      acionador.current =
                        document.activeElement instanceof HTMLElement
                          ? document.activeElement
                          : null;
                      setDiaAberto(n.data);
                    }}
                    aria-label={`Editar relato de ${dataBreve(n.data)}`}
                  >
                    Revisar relato
                  </Button>
                </div>
                <p className="text-sm">
                  Mudança:{' '}
                  {n.seguiu === 'sim'
                    ? 'seguida'
                    : n.seguiu === 'parcial'
                      ? 'parcialmente seguida'
                      : n.seguiu === 'nao'
                        ? 'não seguida'
                        : 'não informado'}{' '}
                  · Percepção: {n.percepcao ?? 'não informada'}
                  {n.percepcao !== null ? ' de 5' : ''}
                </p>
                {n.nota && (
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">
                    {n.nota}
                  </p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
      {r.pausas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pausas registradas</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-2 text-sm">
              {r.pausas.map((p) => (
                <li key={p.id}>
                  {dataBreve(p.inicio)} a {p.fim ? dataBreve(p.fim) : 'agora'};
                  iniciada em{' '}
                  {new Intl.DateTimeFormat('pt-BR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  }).format(new Date(p.iniciadaEm))}
                  .
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      <div
        className="flex flex-wrap gap-2"
        aria-label="Práticas e registros existentes"
      >
        {rotaLiberada('/') && (
          <PlanFeatureGate features={['daily_checkin']} ocultar>
            <Button asChild variant="outline">
              <Link href="/">Abrir check-in</Link>
            </Button>
          </PlanFeatureGate>
        )}
        {rotaLiberada('/goals') && (
          <Button asChild variant="outline">
            <Link href="/goals">Abrir metas</Link>
          </Button>
        )}
        {rotaLiberada('/profile') && (
          <Button asChild variant="outline">
            <Link href="/profile">Abrir hábitos no perfil</Link>
          </Button>
        )}
        {rotaLiberada('/semana') && (
          <Button asChild variant="outline">
            <Link href="/semana">Ver minha semana</Link>
          </Button>
        )}
        {rotaLiberada('/acontecimentos') && (
          <Button asChild variant="outline">
            <Link href="/acontecimentos">Ver acontecimentos</Link>
          </Button>
        )}
      </div>
      <Dialog
        open={diaAberto !== null}
        onOpenChange={(v) => {
          if (!v && !ocupada) setDiaAberto(null);
        }}
      >
        <DialogContent
          className="flex max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-2xl flex-col overflow-hidden"
          onCloseAutoFocus={(ev) => {
            ev.preventDefault();
            const alvo =
              acionador.current?.isConnected &&
              !acionador.current.hasAttribute('disabled')
                ? acionador.current
                : document.getElementById('titulo-experiencia-aberta');
            alvo?.focus();
          }}
        >
          <DialogHeader className="shrink-0">
            <DialogTitle>
              Acompanhamento de {diaAberto ? dataBreve(diaAberto) : ''}
            </DialogTitle>
            <DialogDescription>
              Registre apenas o que você percebeu. Relatos durante pausas ficam
              guardados, mas o dia não entra na comparação das métricas.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 overflow-y-auto">
            {diaAberto && (
              <RelatoDoDia
                key={`${diaAberto}:${r.relatos.find((n) => n.data === diaAberto)?.versao ?? 0}`}
                id={id}
                data={diaAberto}
                inicial={r.relatos.find((n) => n.data === diaAberto) ?? null}
                ocupada={ocupada}
                ocupar={setOcupada}
                salvo={async () => {
                  setDiaAberto(null);
                  await refresh();
                  toast.success('Acompanhamento atualizado.');
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
