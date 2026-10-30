'use client';
import { useCallback, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BookHeart,
  Download,
  Loader2,
  Mic,
  Pencil,
  RotateCcw,
  Sparkles,
  Square,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { erroNaPagina, requisitar } from '@/components/experiencias/transporte';
import { useKeyedResource } from '@/hooks/use-keyed-resource';
import {
  type MesDoDiario,
  type Relato,
  TAMANHO_MAXIMO,
} from '@/lib/diario-pessoal/esquema';
import { CalendarioDoDiario, diaPorExtenso } from './CalendarioDoDiario';
import { type MotorDeVoz, useDitado } from './useDitado';

const SEM_MES: MesDoDiario | null = null;
const SEM_RELATOS: { relatos: Relato[] } | null = null;
const hora = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));

function Lista({ titulo, itens }: { titulo: string; itens: string[] }) {
  if (!itens.length) return null;
  return (
    <div className="min-w-0">
      <h5 className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        {titulo}
      </h5>
      <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-5 text-sm leading-relaxed text-foreground">
        {itens.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}

function Memoria({ estado }: { estado: Relato['memoria'] }) {
  if (estado === 'na_fila')
    return <Badge variant="secondary">Guardado na sua memória</Badge>;
  if (estado === 'desativada')
    return (
      <span className="text-xs text-muted-foreground">
        Memória desligada.{' '}
        <Link href="/chat" className="font-medium text-primary underline">
          Ativar em Lyra AI → Memória
        </Link>
      </span>
    );
  return null;
}

function CartaoDoRelato({
  relato,
  aoMudar,
  aoExcluir,
}: {
  relato: Relato;
  aoMudar: (r: Relato) => void;
  aoExcluir: (id: string) => void;
}) {
  const ids = useId();
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(relato.textoOriginal);
  const [ocupado, setOcupado] = useState<
    null | 'salvar' | 'analisar' | 'excluir'
  >(null);
  const [verOriginal, setVerOriginal] = useState(false);
  const [confirmar, setConfirmar] = useState(false);

  const analisar = useCallback(async () => {
    setOcupado('analisar');
    aoMudar({ ...relato, estadoDaAnalise: 'gerando', motivo: null });
    try {
      aoMudar(
        await requisitar<Relato>(
          `/api/diario-pessoal/${relato.id}/analise`,
          'POST',
          { versao: relato.versao }
        )
      );
    } catch (e) {
      aoMudar({
        ...relato,
        estadoDaAnalise: 'falhou',
        motivo: e instanceof Error ? e.message : 'A análise falhou.',
      });
    } finally {
      setOcupado(null);
    }
  }, [aoMudar, relato]);

  async function salvar() {
    setOcupado('salvar');
    try {
      const novo = await requisitar<Relato>(
        `/api/diario-pessoal/${relato.id}`,
        'PATCH',
        { versao: relato.versao, texto }
      );
      aoMudar(novo);
      setEditando(false);
      toast.success('Relato atualizado.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      setOcupado(null);
    }
  }
  async function excluir() {
    setOcupado('excluir');
    try {
      await requisitar(`/api/diario-pessoal/${relato.id}`, 'DELETE', {
        versao: relato.versao,
      });
      aoExcluir(relato.id);
      toast.success('Relato excluído do diário.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível excluir.');
      setOcupado(null);
    }
  }

  const a = relato.analise,
    mostrado =
      relato.textoOrganizado && !verOriginal
        ? relato.textoOrganizado
        : relato.textoOriginal;

  return (
    <article
      aria-labelledby={`${ids}-titulo`}
      className="flex min-w-0 flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h4
          id={`${ids}-titulo`}
          className="text-sm font-semibold text-foreground"
        >
          Relato das {hora(relato.criadoEm)}
        </h4>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            {relato.modo === 'voz'
              ? relato.motor === 'aparelho'
                ? 'Por voz · no aparelho'
                : 'Por voz · serviço do navegador'
              : 'Digitado'}
          </Badge>
          <Memoria estado={relato.memoria} />
        </div>
      </header>

      {editando ? (
        <div className="flex flex-col gap-2">
          <label htmlFor={`${ids}-texto`} className="text-sm font-medium">
            Texto do relato
          </label>
          <Textarea
            id={`${ids}-texto`}
            value={texto}
            maxLength={TAMANHO_MAXIMO}
            rows={6}
            onChange={(e) => setTexto(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Ao mudar o texto, a organização e a análise anteriores são
            descartadas e o relato pode ser analisado de novo.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={ocupado !== null || !texto.trim()}
              onClick={() => void salvar()}
            >
              {ocupado === 'salvar' ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : null}
              Salvar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={ocupado !== null}
              onClick={() => {
                setTexto(relato.textoOriginal);
                setEditando(false);
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {mostrado}
          </p>
          {relato.textoOrganizado ? (
            <button
              type="button"
              className="self-start rounded text-xs font-medium text-primary underline focus-visible:outline-2 focus-visible:outline-ring"
              aria-pressed={verOriginal}
              onClick={() => setVerOriginal((v) => !v)}
            >
              {verOriginal
                ? 'Ver o texto organizado'
                : 'Ver exatamente como foi contado'}
            </button>
          ) : null}
        </div>
      )}

      <section
        aria-label="Análise do dia"
        aria-busy={relato.estadoDaAnalise === 'gerando'}
        className="min-w-0 rounded-xl bg-muted/50 p-4"
      >
        {relato.estadoDaAnalise === 'pronta' && a ? (
          <div className="flex flex-col gap-4">
            <Lista titulo="O que você contou" itens={a.acontecimentos} />
            <Lista titulo="O que você sentiu" itens={a.percepcoes} />
            <div>
              <h5 className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                Como o dia se mostrou · leitura da Lyra
              </h5>
              <p className="mt-1.5 text-sm leading-relaxed">
                {a.caracteristicasDoDia}
              </p>
            </div>
            {a.relacaoComOMapa ? (
              <div>
                <h5 className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  Seu dia e o seu mapa · interpretação
                </h5>
                <p className="mt-1.5 text-sm leading-relaxed">
                  {a.relacaoComOMapa}
                </p>
                {relato.ceu ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Com o céu de {diaPorExtenso(relato.ceu.data)}: Lua em{' '}
                    {relato.ceu.signoDaLua}
                    {relato.ceu.estrelaPessoal
                      ? `, sua estrela do dia ${relato.ceu.estrelaPessoal.nome}`
                      : ''}
                    .
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Sem o céu deste dia guardado no seu coach, a análise não
                relacionou o relato ao mapa.
              </p>
            )}
            <Lista titulo="Padrões ao longo dos dias" itens={a.padroes} />
            {relato.autor ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                Texto organizado e análise escritos por {relato.autor.provedor}{' '}
                ({relato.autor.modelo}),{' '}
                {relato.autor.local
                  ? 'modelo local da Lyra'
                  : 'modelo em nuvem autorizado por você'}
                . É uma interpretação de autoconhecimento, não uma avaliação de
                saúde.
              </p>
            ) : null}
          </div>
        ) : relato.estadoDaAnalise === 'gerando' ? (
          <p role="status" className="flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />A
            Lyra está organizando e lendo o seu relato…
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {relato.motivo ? (
              <Alert
                variant={
                  relato.estadoDaAnalise === 'falhou'
                    ? 'destructive'
                    : 'default'
                }
              >
                <AlertTitle>
                  {relato.estadoDaAnalise === 'indisponivel'
                    ? 'Análise indisponível'
                    : 'A análise não foi concluída'}
                </AlertTitle>
                <AlertDescription>
                  {relato.motivo} Seu relato está guardado como foi contado.
                </AlertDescription>
              </Alert>
            ) : (
              <p className="text-sm text-muted-foreground">
                O relato está guardado como foi contado. A Lyra pode corrigir a
                ortografia e a pontuação e escrever a análise do dia.
              </p>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="self-start"
              disabled={ocupado !== null}
              onClick={() => void analisar()}
            >
              {relato.motivo ? (
                <RotateCcw aria-hidden="true" />
              ) : (
                <Sparkles aria-hidden="true" />
              )}
              {relato.motivo ? 'Tentar de novo' : 'Organizar e analisar'}
            </Button>
          </div>
        )}
      </section>

      {!editando ? (
        <footer className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={ocupado !== null || relato.estadoDaAnalise === 'gerando'}
            onClick={() => setEditando(true)}
          >
            <Pencil aria-hidden="true" />
            Editar texto
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            disabled={ocupado !== null || relato.estadoDaAnalise === 'gerando'}
            onClick={() => setConfirmar(true)}
          >
            <Trash2 aria-hidden="true" />
            Excluir
          </Button>
        </footer>
      ) : null}

      <AlertDialog
        open={confirmar}
        onOpenChange={(v) => {
          if (ocupado !== 'excluir') setConfirmar(v);
        }}
      >
        <AlertDialogContent className="max-h-[calc(100%-2rem)] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este relato?</AlertDialogTitle>
            <AlertDialogDescription>
              O relato e a análise saem do diário. Lembranças que a memória da
              Lyra já extraiu dele continuam na página Memória, onde podem ser
              corrigidas ou apagadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={ocupado === 'excluir'}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={ocupado === 'excluir'}
              onClick={(e) => {
                e.preventDefault();
                void excluir();
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}

function NovoRelato({
  data,
  aoCriar,
}: {
  data: string;
  aoCriar: (r: Relato) => void;
}) {
  const ids = useId();
  const [texto, setTexto] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [aceitarNavegador, setAceitarNavegador] = useState(false);
  const [falado, setFalado] = useState<MotorDeVoz | null>(null);
  const acrescentar = useCallback((trecho: string) => {
    if (!trecho) return;
    setTexto((t) => (t ? `${t.trimEnd()} ${trecho}` : trecho));
  }, []);
  const voz = useDitado(acrescentar);
  const ouvindo = voz.estado.tipo === 'ouvindo';
  const motorAtual = ouvindo
    ? (voz.estado as { motor: MotorDeVoz }).motor
    : voz.motorUsado;

  async function salvar() {
    setSalvando(true);
    const motor = falado ?? motorAtual;
    try {
      const criado = await requisitar<Relato>('/api/diario-pessoal', 'POST', {
        id: crypto.randomUUID(),
        data,
        texto: texto.trim(),
        modo: motor ? 'voz' : 'texto',
        motor: motor ?? null,
      });
      setTexto('');
      setFalado(null);
      voz.esquecerMotor();
      aoCriar(criado);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Não foi possível guardar o relato.'
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form
      className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:p-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!ouvindo && texto.trim()) void salvar();
      }}
    >
      <label htmlFor={`${ids}-relato`} className="text-sm font-semibold">
        Conte o seu dia
      </label>
      <Textarea
        id={`${ids}-relato`}
        value={texto}
        rows={5}
        maxLength={TAMANHO_MAXIMO}
        placeholder="Fale ou escreva do seu jeito: o que aconteceu, com quem, como você se sentiu."
        aria-describedby={`${ids}-ajuda ${ids}-contagem`}
        onChange={(e) => setTexto(e.target.value)}
      />
      {voz.provisorio ? (
        <p className="text-sm italic text-muted-foreground" aria-hidden="true">
          {voz.provisorio}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p id={`${ids}-ajuda`}>
          O texto fica exatamente como você contou. A Lyra só corrige a
          ortografia e a pontuação, sem acrescentar fatos.
        </p>
        <span id={`${ids}-contagem`} className="tabular-nums">
          {texto.length}/{TAMANHO_MAXIMO}
        </span>
      </div>

      <div role="status" aria-live="polite" className="text-sm">
        {voz.estado.tipo === 'ouvindo'
          ? voz.estado.motor === 'aparelho'
            ? 'Ouvindo… o reconhecimento acontece neste aparelho.'
            : 'Ouvindo… o áudio está sendo processado pelo serviço do navegador.'
          : voz.estado.tipo === 'verificando'
            ? 'Conferindo o reconhecimento de voz deste aparelho…'
            : voz.estado.tipo === 'baixando'
              ? 'Baixando a voz em português para este aparelho…'
              : ''}
      </div>
      {voz.erro ? (
        <p role="alert" className="text-sm text-destructive">
          {voz.erro}
        </p>
      ) : null}
      {voz.estado.tipo === 'sem-suporte' ? (
        <p role="alert" className="text-sm text-muted-foreground">
          Este navegador não oferece reconhecimento de voz. Digite o relato
          acima.
        </p>
      ) : null}
      {voz.estado.tipo === 'baixavel' ? (
        <div className="flex flex-col gap-2 rounded-xl bg-muted/60 p-3 text-sm">
          <p>
            Este aparelho pode reconhecer português sem enviar o áudio para
            fora, depois de baixar o pacote de voz.
          </p>
          <Button
            type="button"
            size="sm"
            className="self-start"
            onClick={() => void voz.baixar()}
          >
            <Download aria-hidden="true" />
            Baixar a voz em português
          </Button>
        </div>
      ) : null}
      {voz.estado.tipo === 'pedir-navegador' ? (
        <div className="flex flex-col gap-2 rounded-xl bg-muted/60 p-3 text-sm">
          <p>
            Este aparelho não reconhece português localmente. O serviço de voz
            do navegador processa o áudio fora do aparelho (no Chrome, pelo
            Google). Se preferir, digite o relato.
          </p>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]"
              checked={aceitarNavegador}
              onChange={(e) => setAceitarNavegador(e.target.checked)}
            />
            Entendo e quero usar o serviço de voz do navegador desta vez.
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={!aceitarNavegador}
              onClick={() => {
                setAceitarNavegador(false);
                setFalado('navegador');
                voz.iniciar('navegador');
              }}
            >
              <Mic aria-hidden="true" />
              Falar com o serviço do navegador
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={voz.cancelar}
            >
              Digitar
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {ouvindo ? (
          <Button type="button" variant="outline" onClick={voz.parar}>
            <Square aria-hidden="true" />
            Parar de ouvir
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled={
              salvando ||
              voz.estado.tipo === 'verificando' ||
              voz.estado.tipo === 'baixando'
            }
            onClick={() => {
              if (voz.motorUsado === 'aparelho') {
                setFalado('aparelho');
                voz.iniciar('aparelho');
              } else void voz.comecar().then(() => undefined);
            }}
          >
            <Mic aria-hidden="true" />
            Contar por voz
          </Button>
        )}
        <Button type="submit" disabled={salvando || ouvindo || !texto.trim()}>
          {salvando ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <BookHeart aria-hidden="true" />
          )}
          Guardar no diário
        </Button>
      </div>
    </form>
  );
}

/**
 * Diário pessoal por voz (tarefa 135): agenda mensal, relato do dia e a
 * análise da Lyra. Fica na aba "Diário" de /dia.
 */
export function DiarioPessoal() {
  const [mes, setMes] = useState<string | null>(null);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [alterados, setAlterados] = useState<{
    data: string;
    relatos: Relato[];
  } | null>(null);

  const pedirMes = useCallback(
    () =>
      requisitar<MesDoDiario>(`/api/diario-pessoal${mes ? `?mes=${mes}` : ''}`),
    [mes]
  );
  const calendario = useKeyedResource(
    `mes:${mes ?? 'atual'}`,
    pedirMes,
    erroNaPagina,
    SEM_MES
  );
  const m = calendario.data;
  const dia = selecionado ?? m?.hoje ?? null;
  const pedirDia = useCallback(
    () => requisitar<{ relatos: Relato[] }>(`/api/diario-pessoal?data=${dia}`),
    [dia]
  );
  const doDia = useKeyedResource(
    dia ? `dia:${dia}` : null,
    pedirDia,
    erroNaPagina,
    SEM_RELATOS
  );
  const relatos =
    alterados && alterados.data === dia
      ? alterados.relatos
      : (doDia.data?.relatos ?? []);
  const dias = useMemo(
    () => new Map((m?.dias ?? []).map((d) => [d.data, d.total])),
    [m]
  );

  const salvos = doDia.data?.relatos;
  const mudar = useCallback(
    (fn: (lista: Relato[]) => Relato[]) => {
      if (!dia) return;
      setAlterados((antes) => ({
        data: dia,
        relatos: fn(
          antes && antes.data === dia ? antes.relatos : (salvos ?? [])
        ),
      }));
    },
    [dia, salvos]
  );
  const substituir = useCallback(
    (novo: Relato) => mudar((l) => l.map((x) => (x.id === novo.id ? novo : x))),
    [mudar]
  );

  /** Logo depois de guardar, a Lyra organiza e analisa o relato. */
  async function analisarNovo(r: Relato) {
    substituir({ ...r, estadoDaAnalise: 'gerando' });
    try {
      substituir(
        await requisitar<Relato>(
          `/api/diario-pessoal/${r.id}/analise`,
          'POST',
          {
            versao: r.versao,
          }
        )
      );
    } catch (e) {
      substituir({
        ...r,
        estadoDaAnalise: 'falhou',
        motivo: e instanceof Error ? e.message : 'A análise falhou.',
      });
    }
  }

  return (
    <section
      id="diario"
      aria-labelledby="titulo-diario"
      className="flex flex-col gap-5"
    >
      <div className="flex flex-col gap-1">
        <h3
          id="titulo-diario"
          className="flex items-center gap-2 font-display text-xl font-semibold text-foreground"
        >
          <BookHeart className="h-5 w-5 text-primary" aria-hidden="true" />
          Diário do dia
        </h3>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Conte por voz ou por escrito como foi o seu dia. A Lyra organiza o
          texto, lê o que você contou à luz do céu do dia e do seu mapa e vai
          reconhecendo os seus padrões com o tempo.
        </p>
      </div>

      {calendario.error && !m ? (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível abrir o diário</AlertTitle>
          <AlertDescription>
            {calendario.error instanceof Error
              ? calendario.error.message
              : 'Tente novamente.'}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => void calendario.refresh()}
            >
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      ) : !m || !dia ? (
        <Skeleton className="h-80 rounded-2xl" />
      ) : (
        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
          <div className="min-w-0">
            <CalendarioDoDiario
              mes={m.mes}
              hoje={m.hoje}
              corte={m.corte}
              selecionado={dia}
              dias={dias}
              carregando={calendario.loading}
              aoMudarMes={setMes}
              aoSelecionar={(d) => {
                setSelecionado(d);
                setAlterados(null);
              }}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <h4
              className="text-base font-semibold capitalize text-foreground"
              aria-live="polite"
            >
              {diaPorExtenso(dia)}
              {dia === m.hoje ? ' · hoje' : ''}
            </h4>
            <NovoRelato
              key={dia}
              data={dia}
              aoCriar={(r) => {
                mudar((l) => [...l, r]);
                void calendario.refresh();
                toast.success('Relato guardado no diário.');
                void analisarNovo(r);
              }}
            />
            {doDia.loading && !alterados ? (
              <Skeleton className="h-40 rounded-2xl" />
            ) : doDia.error ? (
              <Alert variant="destructive">
                <AlertTitle>
                  Não foi possível abrir os relatos do dia
                </AlertTitle>
                <AlertDescription>
                  {doDia.error instanceof Error
                    ? doDia.error.message
                    : 'Tente novamente.'}
                </AlertDescription>
              </Alert>
            ) : relatos.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                Nenhum relato neste dia ainda.
              </p>
            ) : (
              relatos.map((r) => (
                <CartaoDoRelato
                  key={`${r.id}:${r.versao}`}
                  relato={r}
                  aoMudar={substituir}
                  aoExcluir={(id) => {
                    mudar((l) => l.filter((x) => x.id !== id));
                    void calendario.refresh();
                  }}
                />
              ))
            )}
          </div>
        </div>
      )}
    </section>
  );
}
