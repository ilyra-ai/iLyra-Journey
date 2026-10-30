'use client';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Plus,
  RefreshCw,
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
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import { useKeyedResource } from '@/hooks/use-keyed-resource';
import {
  FREQUENCIAS,
  LIMITE_DE_ACOMPANHAMENTOS,
  faixaDaEscala,
  type Acompanhamento,
  type CentralDeAcompanhamentos as Central,
} from '@/lib/acompanhamentos/esquema';
import { dataBreve } from '@/components/acontecimentos/GraficoDosAcontecimentos';
import { requisitar, erroNaPagina } from '@/components/experiencias/transporte';
import { EditorDoAcompanhamento } from './EditorDoAcompanhamento';
import {
  DetalheDoAcompanhamento,
  rotuloDoPeriodo,
} from './DetalheDoAcompanhamento';

const carregar = () => requisitar<Central>('/api/acompanhamentos');

function Cartao({
  a,
  abrir,
  mover,
  posicao,
  total,
  ocupada,
}: {
  a: Acompanhamento;
  abrir: (id: string) => void;
  mover?: (direcao: -1 | 1) => void;
  posicao?: number;
  total?: number;
  ocupada: boolean;
}) {
  const f = a.definicao.frequencia;
  return (
    <Card className="min-w-0" data-acompanhamento={a.id}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="min-w-0 break-words [overflow-wrap:anywhere]">
            {a.nome}
          </CardTitle>
          {a.arquivado ? (
            <Badge variant="outline">Arquivado</Badge>
          ) : a.respondidoNoPeriodoAtual ? (
            <Badge variant="secondary">
              <CheckCircle2 aria-hidden="true" />
              {f === 'semanal' ? 'Semana respondida' : 'Hoje respondido'}
            </Badge>
          ) : (
            <Badge variant="outline">
              {f === 'semanal' ? 'Semana sem resposta' : 'Hoje sem resposta'}
            </Badge>
          )}
        </div>
        <CardDescription>
          {FREQUENCIAS[f].nome} · escala {faixaDaEscala(a.definicao.escala)} ·{' '}
          {a.registros} {a.registros === 1 ? 'resposta' : 'respostas'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {a.descricao && (
          <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">
            {a.descricao}
          </p>
        )}
        <p className="text-sm">
          {a.ultimoRegistro
            ? `Última resposta: ${a.ultimoRegistro.rotulo} (${rotuloDoPeriodo(f, a.ultimoRegistro.data)})`
            : 'Ainda sem respostas no histórico disponível.'}
        </p>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <Button disabled={ocupada} onClick={() => abrir(a.id)}>
          {a.arquivado
            ? 'Ver respostas'
            : a.respondidoNoPeriodoAtual
              ? 'Abrir acompanhamento'
              : 'Responder agora'}
        </Button>
        {mover && posicao !== undefined && total !== undefined && (
          <div className="ml-auto flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              disabled={ocupada || posicao === 0}
              data-mover="-1"
              onClick={() => mover(-1)}
              aria-label={`Mover ${a.nome} para cima`}
            >
              <ArrowUp />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={ocupada || posicao === total - 1}
              data-mover="1"
              onClick={() => mover(1)}
              aria-label={`Mover ${a.nome} para baixo`}
            >
              <ArrowDown />
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

function Lista({ abrir }: { abrir: (id: string | null) => void }) {
  const { session } = useAuth(),
    { data, loading, error, refresh } = useKeyedResource<Central | null>(
      session?.user.id ?? null,
      carregar,
      erroNaPagina,
      null
    ),
    [editor, setEditor] = useState(false),
    [ocupada, setOcupada] = useState(false),
    [falha, setFalha] = useState(''),
    acionador = useRef<HTMLElement | null>(null),
    focado = useRef(false);
  useEffect(() => {
    if (data && !focado.current) {
      focado.current = true;
      document.getElementById('lista-acompanhamentos')?.focus();
    }
  }, [data]);
  if (error && !data)
    return (
      <Alert variant="destructive">
        <AlertTitle>Não foi possível carregar seus acompanhamentos</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : 'Tente novamente.'}
          <Button variant="outline" onClick={() => void refresh()}>
            Tentar novamente
          </Button>
        </AlertDescription>
      </Alert>
    );
  if (loading && !data) return <Skeleton className="h-48 rounded-xl" />;
  if (!data) return null;
  const ativos = data.acompanhamentos.filter((a) => !a.arquivado),
    arquivados = data.acompanhamentos.filter((a) => a.arquivado),
    pendentes = ativos.filter((a) => !a.respondidoNoPeriodoAtual).length;
  const mover = async (indice: number, direcao: -1 | 1) => {
    const ids = ativos.map((a) => a.id),
      alvo = indice + direcao;
    [ids[indice], ids[alvo]] = [ids[alvo], ids[indice]];
    setOcupada(true);
    setFalha('');
    try {
      await requisitar('/api/acompanhamentos/ordem', 'PUT', { ids });
      await refresh();
      const nome = ativos[indice].nome;
      toast.success(`${nome} agora está na posição ${alvo + 1}.`);
      // O foco acompanha o item movido: mesmo sentido ou, no extremo, o outro.
      const movido = ativos[indice].id;
      requestAnimationFrame(() => {
        const botoes = [
          ...document.querySelectorAll<HTMLButtonElement>(
            `[data-acompanhamento="${movido}"] [data-mover]`
          ),
        ].filter((b) => !b.disabled);
        (
          botoes.find((b) => b.dataset.mover === String(direcao)) ?? botoes[0]
        )?.focus();
      });
    } catch (e) {
      setFalha(
        e instanceof Error ? e.message : 'Não foi possível reorganizar.'
      );
    } finally {
      setOcupada(false);
    }
  };
  return (
    <div
      id="lista-acompanhamentos"
      tabIndex={-1}
      className="flex min-w-0 flex-col gap-6 focus-visible:outline-2 focus-visible:outline-ring"
    >
      <PageIntro
        title="Meus acompanhamentos"
        description="Crie acompanhamentos do que importa para você, como concentração ou motivação, com uma escala simples escolhida por você."
        actions={
          <>
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
            <Button
              disabled={
                loading ||
                ocupada ||
                data.acompanhamentos.length >= LIMITE_DE_ACOMPANHAMENTOS
              }
              onClick={() => {
                acionador.current =
                  document.activeElement instanceof HTMLElement
                    ? document.activeElement
                    : null;
                setEditor(true);
              }}
            >
              <Plus />
              Criar acompanhamento
            </Button>
          </>
        }
      />
      <p className="text-sm text-muted-foreground">
        {data.acompanhamentos.length} de {LIMITE_DE_ACOMPANHAMENTOS}{' '}
        acompanhamentos · {pendentes}{' '}
        {pendentes === 1 ? 'aguarda resposta' : 'aguardam resposta'} · hoje{' '}
        {dataBreve(data.hoje)} · fuso do perfil {data.fuso}
      </p>
      {falha && (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível concluir</AlertTitle>
          <AlertDescription>{falha}</AlertDescription>
        </Alert>
      )}
      {data.acompanhamentos.length >= LIMITE_DE_ACOMPANHAMENTOS && (
        <Alert>
          <AlertTitle>Limite de acompanhamentos atingido</AlertTitle>
          <AlertDescription>
            Exclua um acompanhamento para criar outro. Arquivados também contam
            no limite.
          </AlertDescription>
        </Alert>
      )}
      {ativos.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Acompanhe o que faz sentido para você</CardTitle>
            <CardDescription>
              Escolha um nome, uma escala de poucos pontos com rótulos claros e
              se prefere responder todo dia ou toda semana.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              As respostas são relatos pessoais, não medições clínicas. Dias sem
              resposta ficam como sem registro, nunca como zero.
            </p>
          </CardContent>
        </Card>
      ) : (
        <section
          aria-labelledby="titulo-ativos"
          className="flex flex-col gap-3"
        >
          <h3 id="titulo-ativos" className="text-base font-semibold">
            Ativos
          </h3>
          <div className="grid min-w-0 gap-4 @4xl/acompanhamentos:grid-cols-2">
            {ativos.map((a, i) => (
              <Cartao
                key={a.id}
                a={a}
                abrir={abrir}
                mover={(dir) => void mover(i, dir)}
                posicao={i}
                total={ativos.length}
                ocupada={ocupada}
              />
            ))}
          </div>
        </section>
      )}
      {arquivados.length > 0 && (
        <details className="min-w-0 rounded-xl border border-border p-4">
          <summary className="cursor-pointer font-medium focus-visible:outline-2 focus-visible:outline-ring">
            Arquivados ({arquivados.length})
          </summary>
          <div className="mt-4 grid min-w-0 gap-4 @4xl/acompanhamentos:grid-cols-2">
            {arquivados.map((a) => (
              <Cartao key={a.id} a={a} abrir={abrir} ocupada={ocupada} />
            ))}
          </div>
        </details>
      )}
      <Dialog
        open={editor}
        onOpenChange={(v) => {
          if (!ocupada) setEditor(v);
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
                : document.getElementById('lista-acompanhamentos');
            alvo?.focus();
          }}
        >
          <DialogHeader className="shrink-0">
            <DialogTitle>Criar acompanhamento</DialogTitle>
            <DialogDescription>
              Defina o que acompanhar, a frequência e a escala. Tudo pode ser
              ajustado depois sem perder as respostas anteriores.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 overflow-y-auto">
            <EditorDoAcompanhamento
              atual={null}
              ocupada={ocupada}
              ocupar={setOcupada}
              concluido={(id) => {
                setEditor(false);
                toast.success('Acompanhamento criado.');
                abrir(id);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function CentralDeAcompanhamentos({
  id,
  abrir,
}: {
  id: string | null;
  abrir: (id: string | null) => void;
}) {
  return id ? (
    <DetalheDoAcompanhamento id={id} voltar={() => abrir(null)} />
  ) : (
    <Lista abrir={abrir} />
  );
}
