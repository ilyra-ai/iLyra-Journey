'use client';
import { useEffect, useRef, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
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
  LIMITE_DE_EXPERIENCIAS,
  type CentralDeExperiencias as Central,
} from '@/lib/experiencias/esquema';
import { dataBreve } from '@/components/acontecimentos/GraficoDosAcontecimentos';
import { requisitar, erroNaPagina } from './transporte';
import { CriarExperiencia } from './CriarExperiencia';
import { DetalheDaExperiencia } from './DetalheDaExperiencia';
const carregar = () => requisitar<Central>('/api/experiencias');
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
    acionador = useRef<HTMLElement | null>(null),
    focado = useRef(false);
  useEffect(() => {
    if (data && !focado.current) {
      focado.current = true;
      document.getElementById('lista-experiencias')?.focus();
    }
  }, [data]);
  if (error)
    return (
      <Alert variant="destructive">
        <AlertTitle>Não foi possível carregar suas experiências</AlertTitle>
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
  const semReferencia = Boolean(data.corte && data.corte >= data.hoje);
  return (
    <div
      id="lista-experiencias"
      tabIndex={-1}
      className="flex min-w-0 flex-col gap-6 focus-visible:outline-2 focus-visible:outline-ring"
    >
      <PageIntro
        title="Minhas experiências"
        description="Escolha uma pequena mudança, acompanhe como se sente e revise seus registros com a Lyra, sem transformar observações em promessa de resultado."
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
              disabled={
                loading ||
                ocupada ||
                semReferencia ||
                data.experiencias.length >= LIMITE_DE_EXPERIENCIAS
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
              Criar experiência
            </Button>
          </>
        }
      />
      <p className="text-sm text-muted-foreground">
        {data.experiencias.length} de {LIMITE_DE_EXPERIENCIAS} experiências ·
        hoje {dataBreve(data.hoje)} · fuso do perfil {data.fuso}
      </p>
      {semReferencia && (
        <Alert>
          <AlertTitle>Referência indisponível no histórico atual</AlertTitle>
          <AlertDescription>
            O plano precisa incluir ao menos um dia anterior para definir um
            período de referência. As experiências existentes permanecem
            guardadas.
          </AlertDescription>
        </Alert>
      )}
      {data.experiencias.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Uma mudança de cada vez, no seu ritmo</CardTitle>
            <CardDescription>
              Você define a mudança e o que deseja observar. O app não altera
              tratamentos nem cria registros de dias que você não acompanhou.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Referência e observação usam somente seus dados disponíveis. É
              possível pausar, encerrar e excluir, preservando metas e práticas
              existentes.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid min-w-0 gap-4 @4xl/experiencias:grid-cols-2">
          {data.experiencias.map((e) => (
            <Card key={e.id} className="min-w-0">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="break-words [overflow-wrap:anywhere]">
                    {e.titulo}
                  </CardTitle>
                  <Badge variant="secondary">
                    {e.estado === 'em_curso'
                      ? 'Em acompanhamento'
                      : e.estado === 'pausada'
                        ? 'Pausada'
                        : 'Encerrada'}
                  </Badge>
                </div>
                <CardDescription>
                  {dataBreve(e.inicio)} a {dataBreve(e.fim)} · {e.relatos}{' '}
                  relatos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">
                  {e.objetivo}
                </p>
              </CardContent>
              <CardFooter>
                <Button onClick={() => abrir(e.id)}>
                  {e.estado === 'encerrada'
                    ? 'Ver revisão'
                    : 'Abrir acompanhamento'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      <Dialog
        open={editor}
        onOpenChange={(v) => {
          if (!ocupada) setEditor(v);
        }}
      >
        <DialogContent
          className="@container/proposta flex max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-2xl flex-col overflow-hidden"
          onCloseAutoFocus={(ev) => {
            ev.preventDefault();
            const alvo =
              acionador.current?.isConnected &&
              !acionador.current.hasAttribute('disabled')
                ? acionador.current
                : document.getElementById('lista-experiencias');
            alvo?.focus();
          }}
        >
          <DialogHeader className="shrink-0">
            <DialogTitle>Criar experiência pessoal</DialogTitle>
            <DialogDescription>
              Defina sua proposta antes de registrar o acompanhamento. Datas
              anteriores ficam identificadas como registro posterior ao início
              informado.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 overflow-y-auto">
            <CriarExperiencia
              central={data}
              ocupada={ocupada}
              ocupar={setOcupada}
              criada={(id) => {
                setEditor(false);
                abrir(id);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export function CentralDeExperiencias({
  id,
  abrir,
}: {
  id: string | null;
  abrir: (id: string | null) => void;
}) {
  return id ? (
    <DetalheDaExperiencia id={id} voltar={() => abrir(null)} />
  ) : (
    <Lista abrir={abrir} />
  );
}
