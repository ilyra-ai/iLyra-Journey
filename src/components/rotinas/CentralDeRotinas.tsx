'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Pause,
  Play,
  Plus,
  RefreshCw,
  SkipForward,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageIntro } from '@/components/layout/PageIntro';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useAuth } from '@/context/AuthContext';
import { useKeyedResource } from '@/hooks/use-keyed-resource';
import { useAccountSubscription } from '@/hooks/use-account-subscription';
import { useIsAdmin } from '@/hooks/use-is-admin';
import { isPlanFeatureEnabled } from '@/lib/plans/access';
import { buscarJson } from '@/lib/http/transporte';
import { DIAS } from '@/lib/lembretes/esquema';
import {
  LIMITE_DE_ROTINAS,
  LIMITE_DE_PASSOS,
  PRATICAS,
  rotinaSchema,
  type Passo,
  type Rotina,
  type DadosDaRotina,
  type CentralDeRotinas as Central,
  type Execucao,
} from '@/lib/rotinas/esquema';

async function requisitar<T>(
  url: string,
  method = 'GET',
  body?: unknown
): Promise<T> {
  const r = await buscarJson(url, {
    method,
    cache: 'no-store',
    ...(body === undefined
      ? {}
      : {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
  });
  if (!r.ok) throw new Error(r.falha.message);
  return r.corpo as T;
}
function erroNaPagina() {
  /* A falha é apresentada com uma ação de atualizar. */
}
const carregar = () => requisitar<Central>('/api/rotinas');
const novoPasso = (
  titulo = '',
  atividade: Passo['atividade'] = 'livre',
  habitoId: string | null = null
): Passo => ({
  id: crypto.randomUUID(),
  titulo,
  minutos: null,
  atividade,
  habitoId,
});
function Editor({
  inicial,
  habitos,
  permitida,
  salvar,
  ocupada,
}: {
  inicial: DadosDaRotina;
  habitos: Central['habitos'];
  permitida: (p: Passo['atividade']) => boolean;
  salvar: (d: DadosDaRotina) => Promise<void>;
  ocupada: boolean;
}) {
  const [dados, setDados] = useState(inicial),
    [erro, setErro] = useState(''),
    [anuncio, setAnuncio] = useState('');
  const alterar = (id: string, p: Partial<Passo>) =>
    setDados((d) => ({
      ...d,
      passos: d.passos.map((x) => (x.id === id ? { ...x, ...p } : x)),
    }));
  const mover = (i: number, delta: number) => {
    setDados((d) => {
      const passos = [...d.passos];
      [passos[i], passos[i + delta]] = [passos[i + delta], passos[i]];
      return { ...d, passos };
    });
    setAnuncio(`Passo movido para a posição ${i + delta + 1}.`);
    requestAnimationFrame(() =>
      document.getElementById(`titulo-passo-${dados.passos[i].id}`)?.focus()
    );
  };
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        const r = rotinaSchema.safeParse(dados);
        if (!r.success) {
          setErro(r.error.issues[0].message);
          return;
        }
        setErro('');
        void salvar(r.data).catch((e) =>
          setErro(e instanceof Error ? e.message : 'Não foi possível salvar.')
        );
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="titulo-rotina">Nome da rotina</FieldLabel>
          <Input
            id="titulo-rotina"
            value={dados.titulo}
            maxLength={100}
            required
            disabled={ocupada}
            onChange={(e) => setDados({ ...dados, titulo: e.target.value })}
          />
        </Field>
        <FieldSet>
          <FieldLegend>Dias sugeridos</FieldLegend>
          <FieldDescription>
            A frequência organiza sua rotina. Você escolhe quando começar; ela
            não é iniciada automaticamente.
          </FieldDescription>
          <ToggleGroup
            type="multiple"
            aria-label="Dias da rotina"
            value={dados.dias.map(String)}
            onValueChange={(v) => setDados({ ...dados, dias: v.map(Number) })}
            className="flex flex-wrap justify-start"
            disabled={ocupada}
          >
            {DIAS.map((d, i) => (
              <ToggleGroupItem
                key={d}
                value={String(i)}
                aria-label={d}
                className="min-h-10 min-w-10"
              >
                {d}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </FieldSet>
      </FieldGroup>
      <p role="status" className="sr-only">
        {anuncio}
      </p>
      <ol className="flex flex-col gap-4">
        {dados.passos.map((p, i) => (
          <li key={p.id} className="rounded-xl border border-border p-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`titulo-passo-${p.id}`}>
                  Passo {i + 1}
                </FieldLabel>
                <Input
                  id={`titulo-passo-${p.id}`}
                  value={p.titulo}
                  maxLength={120}
                  required
                  disabled={ocupada}
                  onChange={(e) => alterar(p.id, { titulo: e.target.value })}
                />
              </Field>
              <div className="grid min-w-0 gap-4 @lg/editor-rotina:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor={`pratica-${p.id}`}>
                    Prática associada
                  </FieldLabel>
                  <Select
                    value={p.atividade}
                    disabled={ocupada}
                    onValueChange={(v) =>
                      alterar(p.id, {
                        atividade: v as Passo['atividade'],
                        habitoId: null,
                      })
                    }
                  >
                    <SelectTrigger id={`pratica-${p.id}`} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {Object.entries(PRATICAS).map(([k, v]) => (
                          <SelectItem
                            key={k}
                            value={k}
                            disabled={
                              !permitida(k as Passo['atividade']) ||
                              (k === 'habito' && habitos.length === 0)
                            }
                          >
                            {v.nome}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor={`minutos-${p.id}`}>
                    Minutos previstos (opcional)
                  </FieldLabel>
                  <Input
                    id={`minutos-${p.id}`}
                    type="number"
                    min={1}
                    max={180}
                    step={1}
                    value={p.minutos ?? ''}
                    disabled={ocupada}
                    onChange={(e) =>
                      alterar(p.id, {
                        minutos:
                          e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                  />
                </Field>
              </div>
              {p.atividade === 'habito' && (
                <Field>
                  <FieldLabel htmlFor={`habito-${p.id}`}>Seu hábito</FieldLabel>
                  <Select
                    value={p.habitoId ?? ''}
                    disabled={ocupada}
                    onValueChange={(v) => alterar(p.id, { habitoId: v })}
                  >
                    <SelectTrigger id={`habito-${p.id}`} className="w-full">
                      <SelectValue placeholder="Escolha um hábito ativo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {habitos.map((h) => (
                          <SelectItem key={h.id} value={h.id}>
                            {h.nome}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={ocupada || i === 0}
                  onClick={() => mover(i, -1)}
                  aria-label={`Mover passo ${i + 1} para cima`}
                >
                  <ArrowUp />
                  Subir
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={ocupada || i === dados.passos.length - 1}
                  onClick={() => mover(i, 1)}
                  aria-label={`Mover passo ${i + 1} para baixo`}
                >
                  <ArrowDown />
                  Descer
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={ocupada || dados.passos.length === 1}
                  onClick={() => {
                    setDados((d) => ({
                      ...d,
                      passos: d.passos.filter((x) => x.id !== p.id),
                    }));
                    setAnuncio('Passo removido.');
                    requestAnimationFrame(() =>
                      document.getElementById('adicionar-passo')?.focus()
                    );
                  }}
                  aria-label={`Remover passo ${i + 1}`}
                >
                  <Trash2 />
                  Remover
                </Button>
              </div>
            </FieldGroup>
          </li>
        ))}
      </ol>
      <Button
        id="adicionar-passo"
        type="button"
        variant="outline"
        disabled={ocupada || dados.passos.length >= LIMITE_DE_PASSOS}
        onClick={() => {
          const p = novoPasso();
          setDados((d) => ({ ...d, passos: [...d.passos, p] }));
          requestAnimationFrame(() =>
            document.getElementById(`titulo-passo-${p.id}`)?.focus()
          );
        }}
      >
        <Plus />
        Acrescentar passo
      </Button>
      {habitos.length > 0 && (
        <FieldSet>
          <FieldLegend>Reaproveitar um hábito</FieldLegend>
          <div className="flex flex-wrap gap-2">
            {habitos.slice(0, 5).map((h) => (
              <Button
                key={h.id}
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto whitespace-normal text-left"
                disabled={ocupada || dados.passos.length >= LIMITE_DE_PASSOS}
                onClick={() => {
                  setDados((d) => ({
                    ...d,
                    passos: [...d.passos, novoPasso(h.nome, 'habito', h.id)],
                  }));
                  setAnuncio(`Hábito ${h.nome} acrescentado.`);
                }}
              >
                Usar hábito: {h.nome}
              </Button>
            ))}
          </div>
        </FieldSet>
      )}
      <p className="text-sm text-muted-foreground">
        Os minutos são uma previsão. Marcar um passo não registra uma prática,
        minutos, pontuação ou progresso nas metas. Use a prática associada para
        fazer o registro real.
      </p>
      {erro && (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      )}
      <Button type="submit" disabled={ocupada}>
        {ocupada ? 'Salvando…' : 'Salvar rotina'}
      </Button>
    </form>
  );
}

export function CentralDeRotinas() {
  const { session } = useAuth(),
    { data: assinatura, loading: carregandoPlano } = useAccountSubscription(),
    admin = useIsAdmin();
  const liberada = admin || isPlanFeatureEnabled(assinatura, 'personal_habits');
  const permitida = useCallback(
    (a: Passo['atividade']) => {
      const r = PRATICAS[a].recurso;
      return !r || admin || isPlanFeatureEnabled(assinatura, r);
    },
    [admin, assinatura]
  );
  const { data, loading, error, refresh } = useKeyedResource<Central | null>(
    session && liberada ? session.user.id : null,
    carregar,
    erroNaPagina,
    null
  );
  const [editor, setEditor] = useState<{
      rotina: Rotina | null;
      dados: DadosDaRotina;
    } | null>(null),
    [ocupada, setOcupada] = useState(false),
    [falha, setFalha] = useState('');
  const acionador = useRef<HTMLElement | null>(null),
    nova = useRef<HTMLButtonElement>(null),
    idsInicio = useRef<Record<string, string>>({});
  useEffect(() => {
    const atualizar = () => {
      if (liberada && !editor) void refresh();
    };
    window.addEventListener('focus', atualizar);
    return () => window.removeEventListener('focus', atualizar);
  }, [liberada, editor, refresh]);
  const abrir = (dados: DadosDaRotina, rotina: Rotina | null = null) => {
    acionador.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setEditor({
      dados: {
        titulo: dados.titulo,
        dias: [...dados.dias],
        passos: dados.passos.map((p) => ({ ...p })),
      },
      rotina,
    });
  };
  const executar = async (acao: () => Promise<unknown>, foco?: string) => {
    if (ocupada) return;
    setOcupada(true);
    setFalha('');
    try {
      await acao();
      await refresh();
      if (foco)
        requestAnimationFrame(() => document.getElementById(foco)?.focus());
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Não foi possível concluir.';
      setFalha(msg);
      toast.error(msg);
    } finally {
      setOcupada(false);
    }
  };
  const iniciar = (r: Rotina) =>
    void executar(async () => {
      idsInicio.current[r.id] ??= crypto.randomUUID();
      await requisitar<Execucao>(`/api/rotinas/${r.id}/iniciar`, 'POST', {
        idExecucao: idsInicio.current[r.id],
        versao: r.versao,
      });
      delete idsInicio.current[r.id];
    }, `rotina-titulo-${r.id}`);
  const agir = (
    e: Execucao,
    acao: 'pausar' | 'retomar' | 'concluir' | 'pular',
    passoId?: string
  ) =>
    void executar(
      () =>
        requisitar(`/api/rotinas/execucoes/${e.id}`, 'POST', {
          acao,
          versao: e.versao,
          ...(passoId ? { passoId } : {}),
        }),
      `rotina-titulo-${e.rotinaId}`
    );
  if (carregandoPlano) return <Skeleton className="h-40 rounded-xl" />;
  if (!liberada)
    return (
      <Alert>
        <AlertTitle>Rotinas indisponíveis no seu plano</AlertTitle>
        <AlertDescription>
          O recurso de hábitos pessoais precisa estar habilitado para usar suas
          rotinas.
        </AlertDescription>
      </Alert>
    );
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageIntro
        title="Minhas rotinas"
        description="Pequenos passos na sua ordem. Comece quando fizer sentido, pause e retome sem perder o caminho."
        actions={
          <>
            <Button
              variant="outline"
              disabled={loading || ocupada}
              onClick={() => void refresh()}
            >
              <RefreshCw />
              Atualizar
            </Button>
            <Button
              ref={nova}
              disabled={
                ocupada ||
                loading ||
                (data?.rotinas.length ?? 0) >= LIMITE_DE_ROTINAS
              }
              onClick={() =>
                abrir({
                  titulo: '',
                  dias: [0, 1, 2, 3, 4, 5, 6],
                  passos: [novoPasso()],
                })
              }
            >
              <Plus />
              Criar rotina
            </Button>
          </>
        }
      />
      {(error || falha) && (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível atualizar</AlertTitle>
          <AlertDescription>
            {falha ||
              (error instanceof Error ? error.message : 'Tente novamente.')}
            <Button
              variant="outline"
              onClick={() => {
                setFalha('');
                void refresh();
              }}
            >
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {loading && !data && <Skeleton className="h-48 rounded-xl" />}
      {data && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {data.rotinas.length} de {LIMITE_DE_ROTINAS} rotinas · até{' '}
              {LIMITE_DE_PASSOS} passos por rotina
            </p>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Concluir um passo é seu registro da sequência. Minutos e metas
              continuam sendo registrados nas práticas, sem contagem duplicada.
            </p>
          </div>
          {data.rotinas.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Seu ritmo começa com um passo</CardTitle>
                <CardDescription>
                  Crie uma sequência ou adapte uma sugestão. Nenhuma atividade é
                  obrigatória.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    abrir({
                      titulo: 'Minha manhã',
                      dias: [0, 1, 2, 3, 4, 5, 6],
                      passos: [
                        permitida('checkin')
                          ? novoPasso('Registrar como acordei', 'checkin')
                          : novoPasso('Perceber como acordei'),
                        novoPasso('Escolher um pequeno cuidado para hoje'),
                      ],
                    })
                  }
                >
                  Adaptar Minha manhã
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    abrir({
                      titulo: 'Preparar para dormir',
                      dias: [0, 1, 2, 3, 4, 5, 6],
                      passos: [
                        novoPasso('Diminuir o ritmo'),
                        permitida('respiracao')
                          ? novoPasso(
                              'Fazer uma pausa de respiração',
                              'respiracao'
                            )
                          : novoPasso('Reservar um momento tranquilo'),
                      ],
                    })
                  }
                >
                  Adaptar Preparar para dormir
                </Button>
              </CardContent>
            </Card>
          )}
          <div
            id="lista-rotinas"
            tabIndex={-1}
            role="region"
            aria-label="Suas rotinas"
            className="grid min-w-0 gap-5 focus-visible:outline-2 focus-visible:outline-ring @4xl/rotinas:grid-cols-2"
          >
            {data.rotinas.map((r) => {
              const e = r.execucao,
                ativa = e && e.estado !== 'encerrada',
                pendente = e?.passos.find((p) => p.estado === 'pendente'),
                concluidos =
                  e?.passos.filter((p) => p.estado === 'concluido').length ?? 0,
                pulados =
                  e?.passos.filter((p) => p.estado === 'pulado').length ?? 0;
              return (
                <Card
                  key={r.id}
                  className="min-w-0"
                  aria-label={`Rotina ${r.titulo}`}
                >
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle
                        id={`rotina-titulo-${r.id}`}
                        tabIndex={-1}
                        className="break-words focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-ring [overflow-wrap:anywhere]"
                      >
                        {r.titulo}
                      </CardTitle>
                      {e && (
                        <Badge variant="secondary">
                          {e.estado === 'em_curso'
                            ? 'Em curso'
                            : e.estado === 'pausada'
                              ? 'Pausada'
                              : 'Encerrada'}
                        </Badge>
                      )}
                    </div>
                    <CardDescription>
                      {r.dias.map((d) => DIAS[d]).join(' · ')} ·{' '}
                      {r.passos.length} passos
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    {e ? (
                      <>
                        <p className="text-sm text-muted-foreground">
                          Execução iniciada em{' '}
                          {new Intl.DateTimeFormat('pt-BR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          }).format(new Date(e.iniciadaEm))}
                          . Os passos desta execução são preservados após
                          edições.
                        </p>
                        <div role="status" className="text-sm">
                          <p>
                            {concluidos} concluídos · {pulados} pulados ·{' '}
                            {e.passos.length - concluidos - pulados} pendentes
                          </p>
                          <Progress
                            value={
                              ((concluidos + pulados) / e.passos.length) * 100
                            }
                            aria-label="Passos tratados na execução"
                            aria-valuetext={`${concluidos} concluídos e ${pulados} pulados, de ${e.passos.length} passos`}
                          />
                        </div>
                        <ol className="flex flex-col gap-3">
                          {e.passos.map((p, i) => (
                            <li
                              key={p.id}
                              className="rounded-xl border border-border p-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="min-w-0 break-words font-medium [overflow-wrap:anywhere]">
                                  {i + 1}. {p.titulo}
                                </p>
                                <Badge
                                  variant={
                                    p.estado === 'pendente'
                                      ? 'outline'
                                      : 'secondary'
                                  }
                                >
                                  {p.estado === 'concluido'
                                    ? 'Concluído'
                                    : p.estado === 'pulado'
                                      ? 'Pulado'
                                      : 'Pendente'}
                                </Badge>
                              </div>
                              {p.minutos && (
                                <p className="mt-1 text-sm text-muted-foreground">
                                  Previsão: {p.minutos} min
                                </p>
                              )}
                              {p.id === pendente?.id &&
                                e.estado === 'em_curso' && (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {PRATICAS[p.atividade].destino &&
                                      permitida(p.atividade) && (
                                        <Button
                                          asChild
                                          variant="outline"
                                          size="sm"
                                        >
                                          <Link
                                            href={
                                              PRATICAS[p.atividade].destino!
                                            }
                                          >
                                            Abrir {PRATICAS[p.atividade].nome}
                                          </Link>
                                        </Button>
                                      )}
                                    <Button
                                      size="sm"
                                      disabled={ocupada || loading}
                                      onClick={() => agir(e, 'concluir', p.id)}
                                    >
                                      <Check />
                                      Concluir passo {i + 1}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      disabled={ocupada || loading}
                                      onClick={() => agir(e, 'pular', p.id)}
                                    >
                                      <SkipForward />
                                      Pular passo {i + 1}
                                    </Button>
                                  </div>
                                )}
                            </li>
                          ))}
                        </ol>
                        {e.estado === 'encerrada' && (
                          <p role="status" className="text-sm font-medium">
                            {pulados
                              ? 'Execução encerrada com passos pulados.'
                              : 'Você concluiu todos os passos desta execução.'}{' '}
                            Os registros das práticas permanecem separados.
                          </p>
                        )}
                      </>
                    ) : (
                      <ol className="list-inside list-decimal space-y-2 text-sm">
                        {r.passos.map((p) => (
                          <li
                            key={p.id}
                            className="break-words [overflow-wrap:anywhere]"
                          >
                            {p.titulo}
                            {p.minutos ? ` · previsão ${p.minutos} min` : ''}
                          </li>
                        ))}
                      </ol>
                    )}
                  </CardContent>
                  <CardFooter className="flex flex-wrap gap-2">
                    {ativa ? (
                      <Button
                        disabled={ocupada || loading}
                        onClick={() =>
                          agir(e, e.estado === 'pausada' ? 'retomar' : 'pausar')
                        }
                      >
                        {e.estado === 'pausada' ? <Play /> : <Pause />}
                        {e.estado === 'pausada'
                          ? 'Retomar rotina'
                          : 'Pausar rotina'}
                      </Button>
                    ) : (
                      <Button
                        disabled={ocupada || loading}
                        onClick={() => iniciar(r)}
                      >
                        <Play />
                        {e ? 'Iniciar outra execução' : 'Iniciar rotina'}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      disabled={ocupada || loading}
                      onClick={() => abrir(r, r)}
                    >
                      Editar rotina
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" disabled={ocupada || loading}>
                          <Trash2 />
                          Excluir rotina
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Excluir {r.titulo}?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            A rotina e suas execuções serão excluídas. Hábitos,
                            práticas e metas existentes permanecem guardados.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Manter rotina</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() =>
                              void executar(
                                () =>
                                  requisitar(`/api/rotinas/${r.id}`, 'DELETE', {
                                    versao: r.versao,
                                  }),
                                'lista-rotinas'
                              )
                            }
                          >
                            Excluir rotina
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </>
      )}
      <Dialog
        open={editor !== null}
        onOpenChange={(v) => {
          if (!v && !ocupada) setEditor(null);
        }}
      >
        <DialogContent
          className="@container/editor-rotina flex max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-2xl flex-col overflow-hidden"
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            const elemento =
              acionador.current?.isConnected &&
              !acionador.current.hasAttribute('disabled')
                ? acionador.current
                : nova.current && !nova.current.disabled
                  ? nova.current
                  : document.getElementById('lista-rotinas');
            elemento?.focus();
          }}
        >
          <DialogHeader className="shrink-0">
            <DialogTitle>
              {editor?.rotina ? 'Editar rotina' : 'Criar rotina'}
            </DialogTitle>
            <DialogDescription>
              Escolha os passos, a ordem e os dias. Edições valem para as
              próximas execuções.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 overflow-y-auto">
            {editor && (
              <Editor
                inicial={editor.dados}
                habitos={data?.habitos ?? []}
                permitida={permitida}
                ocupada={ocupada}
                salvar={async (d) => {
                  setOcupada(true);
                  try {
                    await requisitar(
                      editor.rotina
                        ? `/api/rotinas/${editor.rotina.id}`
                        : '/api/rotinas',
                      editor.rotina ? 'PUT' : 'POST',
                      {
                        ...d,
                        ...(editor.rotina
                          ? { versao: editor.rotina.versao }
                          : {}),
                      }
                    );
                    setEditor(null);
                    await refresh();
                    toast.success('Rotina salva.');
                  } finally {
                    setOcupada(false);
                  }
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
