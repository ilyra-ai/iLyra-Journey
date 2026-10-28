'use client';
import { useCallback, useRef, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { useKeyedResource } from '@/hooks/use-keyed-resource';
import { buscarJson } from '@/lib/http/transporte';
import {
  periodoSchema,
  marcadorSchema,
  diaSchema,
  LIMITE_DE_MARCADORES,
  type Marcador,
  type DiaDeAcontecimentos,
  type CentralDeAcontecimentos as Central,
  type Comparacao,
} from '@/lib/acontecimentos/esquema';
import {
  GraficoDosAcontecimentos,
  dataBreve,
  numero,
} from './GraficoDosAcontecimentos';
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
  /* Falhas aparecem junto da operação com retentativa. */
}
function Falha({ erro }: { erro: unknown }) {
  return (
    <p role="alert" className="text-sm text-destructive">
      {erro instanceof Error ? erro.message : String(erro)}
    </p>
  );
}

function FormularioDoDia({
  data,
  inicial,
  marcadores,
  aoSalvar,
  aoOcupar,
}: {
  data: string;
  inicial: DiaDeAcontecimentos | null;
  marcadores: Marcador[];
  aoSalvar: () => Promise<void>;
  aoOcupar: (ocupada: boolean) => void;
}) {
  const [selecionados, setSelecionados] = useState(inicial?.marcadores ?? []),
    [nota, setNota] = useState(inicial?.nota ?? ''),
    [confirmado, setConfirmado] = useState(false),
    [ocupada, setOcupadaLocal] = useState(false),
    [erro, setErro] = useState('');
  const setOcupada = (valor: boolean) => {
    setOcupadaLocal(valor);
    aoOcupar(valor);
  };
  const excluir = async () => {
    setOcupada(true);
    setErro('');
    try {
      await requisitar(`/api/acontecimentos/dias/${data}`, 'DELETE', {
        versao: inicial!.versao,
      });
      await aoSalvar();
      toast.success('Registro de acontecimentos removido.');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível excluir.');
    } finally {
      setOcupada(false);
    }
  };
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        const r = diaSchema.safeParse({
          data,
          marcadores: selecionados,
          nota,
          confirmado,
          versao: inicial?.versao ?? 0,
        });
        if (!r.success) {
          setErro(r.error.issues[0].message);
          return;
        }
        setOcupada(true);
        setErro('');
        void requisitar(`/api/acontecimentos/dias/${data}`, 'PUT', r.data)
          .then(async () => {
            await aoSalvar();
            toast.success('Acontecimentos do dia salvos.');
          })
          .catch((e) =>
            setErro(e instanceof Error ? e.message : 'Não foi possível salvar.')
          )
          .finally(() => setOcupada(false));
      }}
    >
      {inicial && !inicial.confirmado && (
        <Alert>
          <AlertTitle>Revisão necessária</AlertTitle>
          <AlertDescription>
            Um marcador usado neste dia foi excluído. Revise a seleção e
            confirme novamente antes de usar o dia na comparação.
          </AlertDescription>
        </Alert>
      )}
      <FieldSet>
        <FieldLegend>Quais destes marcadores ocorreram?</FieldLegend>
        <p className="text-sm text-muted-foreground">
          Marque apenas o que ocorreu. Se nenhum destes marcadores ocorreu,
          deixe a seleção vazia e confirme a revisão. Um dia não registrado
          permanece desconhecido.
        </p>
        <div className="flex flex-col gap-3">
          {marcadores.map((m) => (
            <Field key={m.id} orientation="horizontal">
              <Checkbox
                id={`dia-marcador-${m.id}`}
                disabled={ocupada}
                checked={selecionados.includes(m.id)}
                onCheckedChange={(v) =>
                  setSelecionados((a) =>
                    v === true ? [...a, m.id] : a.filter((id) => id !== m.id)
                  )
                }
              />
              <FieldLabel
                htmlFor={`dia-marcador-${m.id}`}
                className="break-words [overflow-wrap:anywhere]"
              >
                {m.nome}
              </FieldLabel>
            </Field>
          ))}
          {marcadores.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Você pode criar seus marcadores na página e voltar a este dia.
            </p>
          )}
        </div>
      </FieldSet>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="nota-acontecimentos">
            Nota do dia (opcional)
          </FieldLabel>
          <Textarea
            id="nota-acontecimentos"
            maxLength={1000}
            rows={4}
            value={nota}
            disabled={ocupada}
            onChange={(e) => setNota(e.target.value)}
          />
        </Field>
        <Field orientation="horizontal">
          <Checkbox
            id="confirmar-acontecimentos"
            checked={confirmado}
            disabled={ocupada}
            onCheckedChange={(v) => {
              setConfirmado(v === true);
              setErro('');
            }}
          />
          <FieldLabel htmlFor="confirmar-acontecimentos">
            Revisei os acontecimentos deste dia, inclusive os marcadores não
            selecionados.
          </FieldLabel>
        </Field>
      </FieldGroup>
      {erro && <Falha erro={erro} />}
      <Button type="submit" disabled={ocupada}>
        {ocupada ? 'Salvando…' : 'Salvar acontecimentos'}
      </Button>
      {inicial && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="ghost" disabled={ocupada}>
              Excluir registro deste dia
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="max-h-[calc(100%-2rem)] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle>
                Excluir os acontecimentos deste dia?
              </AlertDialogTitle>
              <AlertDialogDescription>
                A seleção e a nota serão removidas. Suas métricas e práticas
                permanecem guardadas. O dia ficará sem revisão na comparação.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Manter registro</AlertDialogCancel>
              <AlertDialogAction onClick={() => void excluir()}>
                Excluir registro
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </form>
  );
}
function FichaDoDia({
  data,
  marcadores,
  aoSalvar,
  aoOcupar,
}: {
  data: string;
  marcadores: Marcador[];
  aoSalvar: () => Promise<void>;
  aoOcupar: (ocupada: boolean) => void;
}) {
  const carregar = useCallback(
    () =>
      requisitar<{ dia: DiaDeAcontecimentos | null }>(
        `/api/acontecimentos/dias/${data}`
      ),
    [data]
  );
  const {
    data: resposta,
    loading,
    error,
    refresh,
  } = useKeyedResource<{ dia: DiaDeAcontecimentos | null } | null>(
    data,
    carregar,
    erroNaPagina,
    null
  );
  if (loading) return <p role="status">Carregando o registro do dia…</p>;
  if (error)
    return (
      <div className="flex flex-col gap-3">
        <Falha erro={error} />
        <Button variant="outline" onClick={() => void refresh()}>
          Tentar novamente
        </Button>
      </div>
    );
  if (!resposta) return null;
  return (
    <FormularioDoDia
      key={`${data}:${resposta.dia?.versao ?? 0}`}
      data={data}
      inicial={resposta.dia}
      marcadores={marcadores}
      aoSalvar={aoSalvar}
      aoOcupar={aoOcupar}
    />
  );
}
function FormularioDoMarcador({
  inicial,
  aoSalvar,
  aoOcupar,
}: {
  inicial: Marcador | null;
  aoSalvar: () => Promise<void>;
  aoOcupar: (ocupada: boolean) => void;
}) {
  const [nome, setNome] = useState(inicial?.nome ?? ''),
    [ocupada, setOcupadaLocal] = useState(false),
    [erro, setErro] = useState('');
  const setOcupada = (valor: boolean) => {
    setOcupadaLocal(valor);
    aoOcupar(valor);
  };
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const p = marcadorSchema.safeParse({ nome });
        if (!p.success) {
          setErro(p.error.issues[0].message);
          return;
        }
        setOcupada(true);
        setErro('');
        void requisitar(
          inicial
            ? `/api/acontecimentos/marcadores/${inicial.id}`
            : '/api/acontecimentos/marcadores',
          inicial ? 'PUT' : 'POST',
          { nome: p.data.nome, ...(inicial ? { versao: inicial.versao } : {}) }
        )
          .then(async () => {
            await aoSalvar();
            toast.success('Marcador salvo.');
          })
          .catch((e) =>
            setErro(e instanceof Error ? e.message : 'Não foi possível salvar.')
          )
          .finally(() => setOcupada(false));
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="nome-marcador">Nome do marcador</FieldLabel>
          <Input
            id="nome-marcador"
            value={nome}
            required
            maxLength={80}
            disabled={ocupada}
            onChange={(e) => setNome(e.target.value)}
          />
        </Field>
      </FieldGroup>
      {erro && <Falha erro={erro} />}
      <Button type="submit" disabled={ocupada}>
        {ocupada ? 'Salvando…' : 'Salvar marcador'}
      </Button>
    </form>
  );
}

function Conteudo({
  dados,
  atualizar,
  aplicar,
}: {
  dados: Central;
  atualizar: () => Promise<unknown>;
  aplicar: (p: { inicio: string; fim: string }) => void;
}) {
  const [dia, setDia] = useState(dados.hoje),
    [diaAberto, setDiaAberto] = useState<string | null>(null),
    [editor, setEditor] = useState<{ marcador: Marcador | null } | null>(null),
    [inicio, setInicio] = useState(dados.inicio),
    [fim, setFim] = useState(dados.fim),
    [marcadorId, setMarcadorId] = useState(''),
    [metrica, setMetrica] = useState<'sono' | 'energia'>('sono'),
    [deslocamento, setDeslocamento] = useState<0 | 1>(1),
    [comparacao, setComparacao] = useState<Comparacao | null>(null),
    [ocupada, setOcupada] = useState(false),
    [erro, setErro] = useState('');
  const acionador = useRef<HTMLElement | null>(null),
    marcadorAtual = dados.marcadores.some((m) => m.id === marcadorId)
      ? marcadorId
      : (dados.marcadores[0]?.id ?? '');
  const capturar = () => {
    acionador.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
  };
  const devolver = (e: Event) => {
    e.preventDefault();
    const alvo =
      acionador.current?.isConnected &&
      !acionador.current.hasAttribute('disabled')
        ? acionador.current
        : document.getElementById('diario-acontecimentos');
    alvo?.focus();
  };
  const aposSalvar = async () => {
    setDiaAberto(null);
    setEditor(null);
    setComparacao(null);
    await atualizar();
  };
  const excluirMarcador = async (m: Marcador) => {
    setOcupada(true);
    setErro('');
    try {
      await requisitar(`/api/acontecimentos/marcadores/${m.id}`, 'DELETE', {
        versao: m.versao,
      });
      setComparacao(null);
      await atualizar();
      requestAnimationFrame(() =>
        document.getElementById('gerenciar-marcadores')?.focus()
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível excluir.');
    } finally {
      setOcupada(false);
    }
  };
  return (
    <div
      id="diario-acontecimentos"
      tabIndex={-1}
      className="flex min-w-0 flex-col gap-6 focus-visible:outline-2 focus-visible:outline-ring"
    >
      <PageIntro
        title="Acontecimentos"
        description="Guarde o contexto do seu dia e observe seus registros de sono e energia, com as lacunas à vista."
        actions={
          <Button
            variant="outline"
            disabled={ocupada}
            onClick={() => {
              setComparacao(null);
              void atualizar();
            }}
          >
            <RefreshCw />
            Atualizar
          </Button>
        }
      />
      <p className="text-sm text-muted-foreground">
        Hoje: {dataBreve(dados.hoje)} · fuso do perfil: {dados.fuso}.
        {dados.corte
          ? ` Histórico disponível desde ${dataBreve(dados.corte)}.`
          : ' Consulte até 366 dias por vez.'}
      </p>
      {erro && <Falha erro={erro} />}
      <Card>
        <CardHeader>
          <CardTitle>Revisar um dia</CardTitle>
          <CardDescription>
            Os marcadores representam seu relato. Não são medidos por sensores
            nem deduzidos das suas métricas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              capturar();
              setDiaAberto(dia);
            }}
          >
            <FieldGroup className="min-w-0 flex-[1_1_12rem]">
              <Field>
                <FieldLabel htmlFor="data-acontecimento">
                  Dia dos acontecimentos
                </FieldLabel>
                <Input
                  id="data-acontecimento"
                  type="date"
                  required
                  min={dados.corte ?? undefined}
                  max={dados.hoje}
                  value={dia}
                  onChange={(e) => setDia(e.target.value)}
                />
              </Field>
            </FieldGroup>
            <Button type="submit" disabled={ocupada}>
              Revisar dia
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card id="gerenciar-marcadores" tabIndex={-1}>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Seus marcadores</CardTitle>
            <Button
              size="sm"
              disabled={
                ocupada || dados.marcadores.length >= LIMITE_DE_MARCADORES
              }
              onClick={() => {
                capturar();
                setEditor({ marcador: null });
              }}
            >
              <Plus />
              Criar marcador
            </Button>
          </div>
          <CardDescription>
            {dados.marcadores.length} de {LIMITE_DE_MARCADORES}. Use nomes que
            façam sentido para você, como viagem ou café tarde.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {dados.marcadores.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum marcador criado. Seus dias podem ser revisados sem seleção;
              a comparação começa quando houver um marcador e registros
              suficientes.
            </p>
          )}
          {dados.marcadores.map((m) => (
            <div
              key={m.id}
              className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3"
            >
              <p className="min-w-0 break-words font-medium [overflow-wrap:anywhere]">
                {m.nome}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={ocupada}
                  aria-label={`Editar marcador ${m.nome}`}
                  onClick={() => {
                    capturar();
                    setEditor({ marcador: m });
                  }}
                >
                  Editar
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={ocupada}
                      aria-label={`Excluir marcador ${m.nome}`}
                    >
                      Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-h-[calc(100%-2rem)] overflow-y-auto">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir {m.nome}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        O marcador será retirado dos dias em que foi usado.
                        Esses dias precisarão ser revisados e confirmados
                        novamente para evitar que a exclusão seja interpretada
                        como ausência do acontecimento. Notas e métricas
                        permanecem guardadas.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Manter marcador</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => void excluirMarcador(m)}
                      >
                        Excluir marcador
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Período dos registros</CardTitle>
          <CardDescription>
            Aplicado: {dataBreve(dados.inicio)} a {dataBreve(dados.fim)}. A
            comparação e a lista abaixo usam este período.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4 @lg/acontecimentos:flex-row @lg/acontecimentos:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              const p = periodoSchema.safeParse({ inicio, fim });
              if (!p.success) {
                setErro(p.error.issues[0].message);
                return;
              }
              setErro('');
              setComparacao(null);
              aplicar(p.data);
            }}
          >
            <FieldGroup className="min-w-0 flex-1">
              <Field>
                <FieldLabel htmlFor="inicio-eventos">Início</FieldLabel>
                <Input
                  id="inicio-eventos"
                  type="date"
                  required
                  min={dados.corte ?? undefined}
                  max={dados.hoje}
                  value={inicio}
                  onChange={(e) => setInicio(e.target.value)}
                />
              </Field>
            </FieldGroup>
            <FieldGroup className="min-w-0 flex-1">
              <Field>
                <FieldLabel htmlFor="fim-eventos">Fim</FieldLabel>
                <Input
                  id="fim-eventos"
                  type="date"
                  required
                  min={inicio}
                  max={dados.hoje}
                  value={fim}
                  onChange={(e) => setFim(e.target.value)}
                />
              </Field>
            </FieldGroup>
            <Button variant="outline" type="submit" disabled={ocupada}>
              Aplicar período
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Explorar os registros</CardTitle>
          <CardDescription>
            A comparação descreve seus dias revisados. Não demonstra causa, não
            separa todos os outros fatores e não substitui avaliação individual.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex min-w-0 flex-col gap-5">
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              setOcupada(true);
              setErro('');
              setComparacao(null);
              void requisitar<Comparacao>(
                '/api/acontecimentos/comparar',
                'POST',
                {
                  inicio: dados.inicio,
                  fim: dados.fim,
                  marcadorId: marcadorAtual,
                  metrica,
                  deslocamento,
                }
              )
                .then(setComparacao)
                .catch((e) =>
                  setErro(
                    e instanceof Error
                      ? e.message
                      : 'Não foi possível comparar.'
                  )
                )
                .finally(() => setOcupada(false));
            }}
          >
            <FieldGroup>
              <div className="grid min-w-0 gap-4 @2xl/acontecimentos:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="marcador-comparacao">
                    Marcador
                  </FieldLabel>
                  <Select
                    value={marcadorAtual}
                    disabled={ocupada || !dados.marcadores.length}
                    onValueChange={(v) => {
                      setMarcadorId(v);
                      setComparacao(null);
                    }}
                  >
                    <SelectTrigger id="marcador-comparacao" className="w-full">
                      <SelectValue placeholder="Escolha um marcador" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {dados.marcadores.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.nome}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="metrica-eventos">
                    Métrica existente
                  </FieldLabel>
                  <Select
                    value={metrica}
                    disabled={ocupada}
                    onValueChange={(v) => {
                      setMetrica(v as 'sono' | 'energia');
                      setDeslocamento(v === 'sono' ? 1 : 0);
                      setComparacao(null);
                    }}
                  >
                    <SelectTrigger id="metrica-eventos" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="sono">
                          Sono da última noite (min)
                        </SelectItem>
                        <SelectItem value="energia">
                          Energia percebida (1–5)
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="intervalo-eventos">
                    Quando olhar a métrica
                  </FieldLabel>
                  <Select
                    value={String(deslocamento)}
                    disabled={ocupada}
                    onValueChange={(v) => {
                      setDeslocamento(Number(v) as 0 | 1);
                      setComparacao(null);
                    }}
                  >
                    <SelectTrigger id="intervalo-eventos" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="0">No mesmo dia</SelectItem>
                        <SelectItem value="1">No dia seguinte</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </FieldGroup>
            <p className="text-sm text-muted-foreground">
              O sono registrado é o da última noite. Para relacionar um
              acontecimento da tarde ou noite com o descanso posterior, observe
              a métrica do dia seguinte. Isso não comprova influência.
            </p>
            <Button
              type="submit"
              disabled={ocupada || !marcadorAtual || !dados.comparacaoPermitida}
            >
              {ocupada ? 'Comparando…' : 'Comparar período aplicado'}
            </Button>
            {!dados.comparacaoPermitida && (
              <p className="text-sm text-muted-foreground">
                O histórico de métricas precisa estar habilitado no plano para
                comparar.
              </p>
            )}
          </form>
          {comparacao && (
            <section
              className="flex min-w-0 flex-col gap-5"
              aria-label="Resultado da comparação"
            >
              <div>
                <h3 className="font-semibold">
                  {comparacao.marcador} e {comparacao.nomeMetrica}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {dataBreve(comparacao.pedido.inicio)} a{' '}
                  {dataBreve(comparacao.pedido.fim)} · métrica{' '}
                  {comparacao.pedido.deslocamento
                    ? 'do dia seguinte'
                    : 'do mesmo dia'}{' '}
                  · calculado em{' '}
                  {new Intl.DateTimeFormat('pt-BR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  }).format(new Date(comparacao.calculadaEm))}
                </p>
              </div>
              <p role="status" className="text-sm">
                {comparacao.qualidade.paresValidos} pares válidos de{' '}
                {comparacao.qualidade.dias} dias · {comparacao.qualidade.com}{' '}
                com marcador · {comparacao.qualidade.sem} sem marcador em dia
                revisado · cobertura{' '}
                {numero(comparacao.qualidade.cobertura * 100)}%
              </p>
              {comparacao.resumo ? (
                <>
                  <div className="grid gap-3 @lg/acontecimentos:grid-cols-2">
                    <div className="rounded-xl border border-border p-4">
                      <p className="text-sm text-muted-foreground">
                        Mediana com marcador
                      </p>
                      <p className="text-xl font-semibold">
                        {numero(comparacao.resumo.medianaCom)}{' '}
                        {comparacao.unidade}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border p-4">
                      <p className="text-sm text-muted-foreground">
                        Mediana sem marcador, em dias revisados
                      </p>
                      <p className="text-xl font-semibold">
                        {numero(comparacao.resumo.medianaSem)}{' '}
                        {comparacao.unidade}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm">
                    {comparacao.resumo.diferenca === 0
                      ? 'As medianas deste recorte são iguais. Isso não prova ausência de associação.'
                      : `Diferença descritiva entre medianas: ${numero(comparacao.resumo.diferenca)} ${comparacao.unidade} (com menos sem marcador).`}
                  </p>
                  {comparacao.resumo.contraditorio && (
                    <Alert>
                      <AlertTitle>
                        Direções diferentes dentro do período
                      </AlertTitle>
                      <AlertDescription>
                        As diferenças entre os grupos têm sinais opostos nas
                        duas metades do período. Este recorte não sustenta um
                        padrão consistente.
                      </AlertDescription>
                    </Alert>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Em {comparacao.resumo.outrosMarcadoresEm} dias com este
                    marcador houve também outros marcadores. Rotina, registro
                    incompleto, acaso e outros fatores podem explicar
                    diferenças. Nenhum fator foi isolado ou ajustado.
                  </p>
                </>
              ) : (
                <Alert>
                  <AlertTitle>Dados insuficientes para comparar</AlertTitle>
                  <AlertDescription>
                    <ul className="list-inside list-disc space-y-1">
                      {comparacao.qualidade.motivos.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
              <p className="text-sm text-muted-foreground">
                Critérios deste recurso: pelo menos 14 pares abrangendo 14 dias,
                cinco dias em cada grupo e 70% de cobertura. São limites de
                apresentação do app, não garantia científica nem teste de
                significância.
              </p>
              <GraficoDosAcontecimentos dados={comparacao} />
            </section>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Dias registrados no período aplicado</CardTitle>
          <CardDescription>
            Sem registro não significa que nenhum acontecimento ocorreu.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {dados.dias.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum dia revisado neste período.
            </p>
          ) : (
            dados.dias.map((d) => (
              <div
                key={d.data}
                className="flex min-w-0 flex-wrap items-start justify-between gap-3 rounded-xl border border-border p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{dataBreve(d.data)}</p>
                  <Badge variant={d.confirmado ? 'secondary' : 'outline'}>
                    {d.confirmado ? 'Revisado' : 'Revisão necessária'}
                  </Badge>
                  <p className="mt-2 break-words text-sm [overflow-wrap:anywhere]">
                    {d.marcadores
                      .map(
                        (id) => dados.marcadores.find((m) => m.id === id)?.nome
                      )
                      .filter(Boolean)
                      .join(' · ') || 'Nenhum destes marcadores selecionado'}
                  </p>
                  {d.nota && (
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">
                      {d.nota}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    capturar();
                    setDiaAberto(d.data);
                  }}
                  disabled={ocupada}
                  aria-label={`Revisar acontecimentos de ${dataBreve(d.data)}`}
                >
                  Revisar
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <Dialog
        open={diaAberto !== null}
        onOpenChange={(v) => {
          if (!v && !ocupada) setDiaAberto(null);
        }}
      >
        <DialogContent
          className="flex max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-2xl flex-col overflow-hidden"
          onCloseAutoFocus={devolver}
        >
          <DialogHeader className="shrink-0">
            <DialogTitle>
              Acontecimentos de {diaAberto ? dataBreve(diaAberto) : ''}
            </DialogTitle>
            <DialogDescription>
              Confirme sua seleção para distinguir um dia revisado de um dia
              desconhecido.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 overflow-y-auto">
            {diaAberto && (
              <FichaDoDia
                key={diaAberto}
                data={diaAberto}
                marcadores={dados.marcadores}
                aoSalvar={aposSalvar}
                aoOcupar={setOcupada}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={editor !== null}
        onOpenChange={(v) => {
          if (!v && !ocupada) setEditor(null);
        }}
      >
        <DialogContent onCloseAutoFocus={devolver}>
          <DialogHeader>
            <DialogTitle>
              {editor?.marcador ? 'Editar marcador' : 'Criar marcador'}
            </DialogTitle>
            <DialogDescription>
              Este nome é pessoal e aparece nos dias em que você o selecionar.
            </DialogDescription>
          </DialogHeader>
          {editor && (
            <FormularioDoMarcador
              inicial={editor.marcador}
              aoSalvar={aposSalvar}
              aoOcupar={setOcupada}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
export function CentralDeAcontecimentos() {
  const { session } = useAuth(),
    [periodo, setPeriodo] = useState<{ inicio: string; fim: string } | null>(
      null
    );
  const carregar = useCallback(
    () =>
      requisitar<Central>(
        `/api/acontecimentos${periodo ? `?${new URLSearchParams(periodo)}` : ''}`
      ),
    [periodo]
  );
  const { data, loading, error, refresh } = useKeyedResource<Central | null>(
    session ? `${session.user.id}:${JSON.stringify(periodo)}` : null,
    carregar,
    erroNaPagina,
    null
  );
  if (error)
    return (
      <Alert variant="destructive">
        <AlertTitle>Não foi possível carregar os acontecimentos</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : 'Tente novamente.'}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void refresh()}>
              Tentar novamente
            </Button>
            {periodo && (
              <Button variant="outline" onClick={() => setPeriodo(null)}>
                Voltar ao período inicial
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  if (loading && !data) return <Skeleton className="h-48 rounded-xl" />;
  if (!data) return null;
  return (
    <Conteudo
      key={`${session?.user.id}:${data.inicio}:${data.fim}`}
      dados={data}
      atualizar={refresh}
      aplicar={setPeriodo}
    />
  );
}
