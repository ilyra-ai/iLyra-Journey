'use client';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { Pause, Play, RefreshCw, Square, Timer } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useAuth } from '@/context/AuthContext';
import { useKeyedResource } from '@/hooks/use-keyed-resource';
import {
  FAIXAS_DE_DURACAO,
  FINALIDADES,
  PRATICAS,
  faixaDaPratica,
  passoNoTempo,
  praticaPorId,
  type FaixaDeDuracao,
  type Finalidade,
  type Pratica,
} from '@/lib/meditacoes/catalogo';
import type {
  CentralDeMeditacoes as Central,
  SessaoDeMeditacao,
} from '@/lib/meditacoes/esquema';
import { mostrarTempo } from '@/lib/foco/relogio';
import {
  LEITURA_INICIAL,
  assinarLeitura,
  estadoDaLeitura,
  iniciarLeituraDaResposta,
  pararLeituraDaResposta,
  pausarLeitura,
  retomarLeitura,
} from '@/lib/voz/controlador';
import { requisitar, erroNaPagina } from '@/components/experiencias/transporte';

type CentralRecebida = Central & { recebida: number };
const carregar = async (): Promise<CentralRecebida> => ({
  ...(await requisitar<Central>('/api/meditacoes')),
  recebida: performance.now(),
});
const servidor = () => LEITURA_INICIAL;
const ESTADOS: Record<SessaoDeMeditacao['estado'], string> = {
  running: 'Em andamento',
  paused: 'Pausada',
  completed: 'Concluída',
  ended: 'Interrompida',
};

/**
 * Tempo decorrido desenhado com relógio monotônico a partir do valor do
 * servidor, recebido em `recebida` (performance.now() no momento da resposta).
 */
function useDecorrido(s: SessaoDeMeditacao | null, recebida: number) {
  const [agora, setAgora] = useState(recebida);
  useEffect(() => {
    if (s?.estado !== 'running') return;
    const t = setInterval(() => setAgora(performance.now()), 250);
    return () => clearInterval(t);
  }, [s?.estado, s?.id]);
  if (!s) return 0;
  return s.estado === 'running'
    ? Math.min(
        s.alvoSegundos * 1000,
        s.decorridoMs + Math.max(0, agora - recebida)
      )
    : s.decorridoMs;
}

function Reprodutor({
  pratica,
  sessao,
  recebida,
  ocupada,
  agir,
  iniciar,
  fechar,
}: {
  pratica: Pratica;
  sessao: SessaoDeMeditacao | null;
  recebida: number;
  ocupada: boolean;
  agir: (acao: 'pausar' | 'retomar' | 'encerrar') => Promise<void>;
  iniciar: () => Promise<void>;
  fechar: () => void;
}) {
  const ids = useId(),
    voz = useSyncExternalStore(assinarLeitura, estadoDaLeitura, servidor),
    [narrar, setNarrar] = useState(true),
    decorrido = useDecorrido(sessao, recebida),
    alvo = pratica.minutos * 60 * 1000,
    passo = passoNoTempo(pratica, decorrido / 1000),
    falado = useRef<string | null>(null),
    rodando = sessao?.estado === 'running',
    alcancado = sessao !== null && decorrido >= alvo,
    narracaoAtiva = narrar && voz.disponivel;
  const chave = sessao ? `meditacao:${sessao.id}:${passo}` : null;
  // Fala o passo atual quando ele começa, uma vez por passo.
  useEffect(() => {
    if (!sessao || !rodando || !narracaoAtiva || alcancado || !chave) return;
    if (falado.current === chave) return;
    falado.current = chave;
    iniciarLeituraDaResposta(chave, pratica.passos[passo].texto);
  }, [sessao, rodando, narracaoAtiva, alcancado, chave, pratica, passo]);
  // Ao sair da prática, desligar a narração ou desmontar, a fala para.
  useEffect(() => {
    if (!narracaoAtiva && chave) pararLeituraDaResposta(chave);
  }, [narracaoAtiva, chave]);
  useEffect(
    () => () => {
      if (falado.current) pararLeituraDaResposta(falado.current);
    },
    []
  );
  const pausarOuRetomar = async (acao: 'pausar' | 'retomar') => {
    if (acao === 'pausar') pausarLeitura();
    await agir(acao);
    if (acao === 'retomar' && narracaoAtiva) retomarLeitura();
  };
  return (
    <Card className="min-w-0 border-primary/40">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{FINALIDADES[pratica.finalidade]}</Badge>
          <Badge variant="outline">{pratica.minutos} min</Badge>
          {sessao && <Badge variant="outline">{ESTADOS[sessao.estado]}</Badge>}
        </div>
        <CardTitle
          id="titulo-pratica-aberta"
          tabIndex={-1}
          className="focus-visible:outline-2 focus-visible:outline-ring"
        >
          {pratica.titulo}
        </CardTitle>
        <CardDescription>{pratica.descricao}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm tabular-nums">
            <span>
              <span className="sr-only">Tempo decorrido: </span>
              {mostrarTempo(decorrido)}
            </span>
            <span className="text-muted-foreground">
              <span className="sr-only">Duração total: </span>
              {mostrarTempo(alvo)}
            </span>
          </div>
          <Progress
            value={Math.round((decorrido / alvo) * 100)}
            aria-label="Progresso da prática"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
          <div className="flex items-center gap-3">
            <Switch
              id={`${ids}-narrar`}
              checked={narrar && voz.disponivel}
              disabled={!voz.disponivel}
              onCheckedChange={(v) => setNarrar(v)}
            />
            <Label htmlFor={`${ids}-narrar`}>Narração por voz</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            {voz.disponivel
              ? `Voz local do dispositivo: ${voz.voz} (${voz.idioma}).`
              : 'Nenhuma voz local em português neste dispositivo. Siga pela transcrição; o tempo continua sendo registrado.'}
          </p>
        </div>
        {voz.estado === 'erro' && voz.erro && narracaoAtiva && (
          <Alert>
            <AlertTitle>A narração não pôde continuar</AlertTitle>
            <AlertDescription>
              {voz.erro} A prática segue pela transcrição.
            </AlertDescription>
          </Alert>
        )}
        <div className="flex flex-wrap gap-2">
          {!sessao ? (
            <Button disabled={ocupada} onClick={() => void iniciar()}>
              <Play />
              Começar prática
            </Button>
          ) : (
            <>
              {sessao.estado === 'running' && !alcancado && (
                <Button
                  variant="outline"
                  disabled={ocupada}
                  onClick={() => void pausarOuRetomar('pausar')}
                >
                  <Pause />
                  Pausar
                </Button>
              )}
              {sessao.estado === 'paused' && (
                <Button
                  disabled={ocupada}
                  onClick={() => void pausarOuRetomar('retomar')}
                >
                  <Play />
                  Retomar
                </Button>
              )}
              <Button
                variant={alcancado ? 'default' : 'ghost'}
                disabled={ocupada}
                onClick={() => {
                  pausarLeitura();
                  void agir('encerrar');
                }}
              >
                <Square />
                {alcancado ? 'Concluir prática' : 'Interromper e registrar'}
              </Button>
            </>
          )}
          {!sessao && (
            <Button variant="ghost" disabled={ocupada} onClick={fechar}>
              Voltar à biblioteca
            </Button>
          )}
        </div>
        {alcancado && (
          <p role="status" className="text-sm">
            A duração da prática foi alcançada. Confirme para registrar{' '}
            {pratica.minutos} min na sua meditação do dia.
          </p>
        )}
        {sessao && !alcancado && (
          <p className="text-xs text-muted-foreground">
            Só minutos inteiros realizados entram na meditação do dia, uma única
            vez. Pausas não contam. Ao retomar, o trecho em andamento pode ser
            repetido.
          </p>
        )}
        <section aria-labelledby={`${ids}-transcricao`} className="min-w-0">
          <h3 id={`${ids}-transcricao`} className="mb-2 font-semibold">
            Transcrição
          </h3>
          <ol className="flex flex-col gap-2">
            {pratica.passos.map((p, i) => {
              const atual = sessao !== null && i === passo && !alcancado;
              return (
                <li
                  key={p.inicio}
                  aria-current={atual ? 'step' : undefined}
                  className={
                    atual
                      ? 'rounded-lg border border-primary bg-primary/8 p-3'
                      : 'rounded-lg border border-transparent p-3'
                  }
                >
                  <span className="mr-2 text-xs font-semibold tabular-nums text-muted-foreground">
                    {mostrarTempo(p.inicio * 1000)}
                  </span>
                  <span className="text-sm leading-relaxed">{p.texto}</span>
                </li>
              );
            })}
          </ol>
        </section>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          Roteiro próprio do Lyra MetaCare (versão {pratica.versao}). Prática de
          bem-estar e relaxamento; não substitui cuidado profissional de saúde.
        </p>
      </CardFooter>
    </Card>
  );
}

export function CentralDeMeditacoes() {
  const { session } = useAuth(),
    { data, loading, error, refresh } =
      useKeyedResource<CentralRecebida | null>(
        session?.user.id ?? null,
        carregar,
        erroNaPagina,
        null,
        carregar,
        true
      ),
    [selecionada, setSelecionada] = useState<string | null>(null),
    [duracao, setDuracao] = useState<FaixaDeDuracao | 'todas'>('todas'),
    [finalidade, setFinalidade] = useState<Finalidade | 'todas'>('todas'),
    [ocupada, setOcupada] = useState(false),
    [falha, setFalha] = useState('');
  // Ao voltar à aba, o estado real é conferido no servidor.
  const atualizar = useCallback(() => void refresh(), [refresh]);
  useEffect(() => {
    const visivel = () => {
      if (document.visibilityState === 'visible') atualizar();
    };
    document.addEventListener('visibilitychange', visivel);
    return () => document.removeEventListener('visibilitychange', visivel);
  }, [atualizar]);
  const ativa = data?.ativa ?? null,
    praticaAberta = ativa
      ? praticaPorId(ativa.pratica)
      : selecionada
        ? praticaPorId(selecionada)
        : null;
  const executar = async (f: () => Promise<unknown>, sucesso?: string) => {
    setOcupada(true);
    setFalha('');
    try {
      await f();
      await refresh();
      if (sucesso) toast.success(sucesso);
      requestAnimationFrame(() =>
        document.getElementById('titulo-pratica-aberta')?.focus()
      );
    } catch (e) {
      setFalha(e instanceof Error ? e.message : 'Não foi possível concluir.');
      await refresh();
    } finally {
      setOcupada(false);
    }
  };
  const lista = PRATICAS.filter(
    (p) =>
      (duracao === 'todas' || faixaDaPratica(p) === duracao) &&
      (finalidade === 'todas' || p.finalidade === finalidade)
  );
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageIntro
        title="Meditações guiadas"
        description="Escolha uma prática pela duração e pelo objetivo, acompanhe a narração ou a transcrição e registre só o tempo que você realmente praticou."
        actions={
          <Button
            variant="outline"
            disabled={loading || ocupada}
            onClick={() => {
              setFalha('');
              void refresh();
            }}
          >
            <RefreshCw />
            Atualizar
          </Button>
        }
      />
      {falha && (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível concluir</AlertTitle>
          <AlertDescription>{falha}</AlertDescription>
        </Alert>
      )}
      {error && !data ? (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível carregar suas práticas</AlertTitle>
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
        <>
          {praticaAberta && (
            <Reprodutor
              key={ativa?.id ?? praticaAberta.id}
              pratica={praticaAberta}
              sessao={ativa}
              recebida={data.recebida}
              ocupada={ocupada}
              iniciar={() =>
                executar(
                  () =>
                    requisitar('/api/meditacoes', 'POST', {
                      id: crypto.randomUUID(),
                      pratica: praticaAberta.id,
                      versao: praticaAberta.versao,
                    }),
                  'Prática iniciada.'
                )
              }
              agir={(acao) =>
                executar(
                  () =>
                    requisitar(`/api/meditacoes/${ativa!.id}`, 'POST', {
                      acao,
                      versao: ativa!.versao,
                    }),
                  acao === 'encerrar'
                    ? 'Prática registrada.'
                    : acao === 'pausar'
                      ? 'Prática pausada.'
                      : 'Prática retomada.'
                ).then(() => {
                  if (acao === 'encerrar') setSelecionada(null);
                })
              }
              fechar={() => setSelecionada(null)}
            />
          )}
          {!ativa && (
            <section
              aria-labelledby="titulo-biblioteca"
              className="flex min-w-0 flex-col gap-4"
            >
              <h3 id="titulo-biblioteca" className="text-base font-semibold">
                Biblioteca
              </h3>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <p id="filtro-duracao" className="text-sm font-medium">
                    Duração
                  </p>
                  <ToggleGroup
                    type="single"
                    aria-labelledby="filtro-duracao"
                    value={duracao}
                    onValueChange={(v) =>
                      v && setDuracao(v as FaixaDeDuracao | 'todas')
                    }
                    className="flex flex-wrap justify-start gap-2"
                  >
                    <ToggleGroupItem
                      value="todas"
                      variant="outline"
                      className="data-[state=on]:border-primary data-[state=on]:bg-primary/8"
                    >
                      Todas
                    </ToggleGroupItem>
                    {(Object.keys(FAIXAS_DE_DURACAO) as FaixaDeDuracao[]).map(
                      (f) => (
                        <ToggleGroupItem
                          key={f}
                          value={f}
                          variant="outline"
                          className="data-[state=on]:border-primary data-[state=on]:bg-primary/8"
                        >
                          {FAIXAS_DE_DURACAO[f].nome}
                        </ToggleGroupItem>
                      )
                    )}
                  </ToggleGroup>
                </div>
                <div className="flex flex-col gap-2">
                  <p id="filtro-finalidade" className="text-sm font-medium">
                    Objetivo
                  </p>
                  <ToggleGroup
                    type="single"
                    aria-labelledby="filtro-finalidade"
                    value={finalidade}
                    onValueChange={(v) =>
                      v && setFinalidade(v as Finalidade | 'todas')
                    }
                    className="flex flex-wrap justify-start gap-2"
                  >
                    <ToggleGroupItem
                      value="todas"
                      variant="outline"
                      className="data-[state=on]:border-primary data-[state=on]:bg-primary/8"
                    >
                      Todos
                    </ToggleGroupItem>
                    {(Object.keys(FINALIDADES) as Finalidade[]).map((f) => (
                      <ToggleGroupItem
                        key={f}
                        value={f}
                        variant="outline"
                        className="data-[state=on]:border-primary data-[state=on]:bg-primary/8"
                      >
                        {FINALIDADES[f]}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
              </div>
              <p role="status" className="text-sm text-muted-foreground">
                {lista.length}{' '}
                {lista.length === 1
                  ? 'prática encontrada'
                  : 'práticas encontradas'}
                .
              </p>
              {lista.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-sm text-muted-foreground">
                    Nenhuma prática combina com esses filtros. Escolha outra
                    duração ou outro objetivo.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid min-w-0 gap-4 @3xl/meditacoes:grid-cols-2">
                  {lista.map((p) => (
                    <Card key={p.id} className="min-w-0">
                      <CardHeader>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">
                            {FINALIDADES[p.finalidade]}
                          </Badge>
                          <Badge variant="outline">
                            <Timer aria-hidden="true" />
                            {p.minutos} min
                          </Badge>
                        </div>
                        <CardTitle>{p.titulo}</CardTitle>
                        <CardDescription>{p.descricao}</CardDescription>
                      </CardHeader>
                      <CardFooter>
                        <Button
                          variant={selecionada === p.id ? 'default' : 'outline'}
                          onClick={() => {
                            setSelecionada(p.id);
                            requestAnimationFrame(() => {
                              const t = document.getElementById(
                                'titulo-pratica-aberta'
                              );
                              t?.scrollIntoView({ block: 'start' });
                              t?.focus();
                            });
                          }}
                        >
                          Ver e praticar
                          <span className="sr-only">: {p.titulo}</span>
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          )}
          <section
            aria-labelledby="titulo-historico-meditacoes"
            className="flex min-w-0 flex-col gap-3"
          >
            <h3
              id="titulo-historico-meditacoes"
              className="text-base font-semibold"
            >
              Suas práticas recentes
            </h3>
            <p className="text-sm text-muted-foreground">
              {data.totais.sessoes} práticas registradas ·{' '}
              {data.totais.concluidas} concluídas · {data.totais.minutos} min
              somados à meditação.
            </p>
            {data.historico.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma prática registrada ainda.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.historico.map((h) => (
                  <li
                    key={h.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm"
                  >
                    <span className="min-w-0 font-medium break-words">
                      {h.titulo}
                    </span>
                    <span className="text-muted-foreground">
                      {h.dataLocal.split('-').reverse().join('/')} ·{' '}
                      {ESTADOS[h.estado]} · {mostrarTempo(h.decorridoMs)} de{' '}
                      {mostrarTempo(h.alvoSegundos * 1000)} ·{' '}
                      {h.minutosRegistrados
                        ? `${h.minutosRegistrados} min somados`
                        : 'nenhum minuto somado'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
