'use client';

import * as React from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BookOpenCheck, Check, Trash2 } from 'lucide-react';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Verbete } from '@/lib/lyra/conhecimento/tipos';
import { useAuth } from '@/context/AuthContext';
import { useKeyedResource } from '@/hooks/use-keyed-resource';
import { buscarJson } from '@/lib/http/transporte';

const ROTA = '/api/admin/lyra/verbetes';

function dataBr(iso: string) {
  return format(parseISO(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

/** Um verbete por inteiro: o administrador aprova o que leu. */
function CartaoDoVerbete({
  verbete,
  ocupado,
  aoAprovar,
  aoRemover,
}: {
  verbete: Verbete;
  ocupado: boolean;
  aoAprovar?: () => void;
  aoRemover: () => void;
}) {
  const gerado = verbete.gerado!;
  const tituloId = `verbete-${verbete.id}`;
  return (
    <Card aria-labelledby={tituloId}>
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{verbete.area}</Badge>
          {gerado.aprovadoEm ? (
            <Badge variant="success">
              Aprovado em {dataBr(gerado.aprovadoEm)}
            </Badge>
          ) : (
            <Badge variant="warning">Pendente</Badge>
          )}
        </div>
        <CardTitle id={tituloId} className="font-display text-lg">
          {verbete.titulo}
        </CardTitle>
        <CardDescription className="leading-6">
          {verbete.resumo}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm leading-6 text-foreground">
        <ul className="list-disc space-y-1 pl-5">
          {verbete.pontos.map((ponto) => (
            <li key={ponto}>{ponto}</li>
          ))}
        </ul>
        <p>
          <span className="font-medium">Na prática: </span>
          {verbete.pratica}
        </p>
        <dl className="grid gap-2 rounded-lg border border-border bg-background p-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Fonte citada</dt>
            <dd className="mt-0.5 font-medium text-foreground">
              {verbete.fonte}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Escrito por</dt>
            <dd className="mt-0.5 font-medium text-foreground">
              {gerado.modelo} ({gerado.provedor}), em {dataBr(gerado.criadoEm)}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Palavras-chave</dt>
            <dd className="mt-0.5 text-foreground">
              {verbete.palavrasChave.join(', ')}
            </dd>
          </div>
        </dl>
      </CardContent>
      <CardFooter className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={ocupado}
          onClick={aoRemover}
        >
          <Trash2 aria-hidden="true" />
          {gerado.aprovadoEm ? 'Retirar da base' : 'Recusar'}
        </Button>
        {aoAprovar ? (
          <Button type="button" disabled={ocupado} onClick={aoAprovar}>
            <Check aria-hidden="true" />
            Aprovar
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}

/**
 * Revisão dos verbetes escritos automaticamente pelo modelo conectado
 * (tarefas 198, 199 e 207): o motor só consulta os aprovados aqui.
 */
export function VerbetesGeradosContent() {
  const { session } = useAuth();
  const [ocupado, setOcupado] = React.useState<string | null>(null);
  const [remover, setRemover] = React.useState<Verbete | null>(null);
  const [falha, setFalha] = React.useState<string | null>(null);

  const pedir = React.useCallback(async () => {
    const resposta = await buscarJson(ROTA, { cache: 'no-store' });
    if (!resposta.ok) throw new Error(resposta.falha.message);
    setFalha(null);
    return (resposta.corpo as { verbetes: Verbete[] }).verbetes;
  }, []);
  const avisar = React.useCallback((erro: unknown) => {
    setFalha(
      erro instanceof Error ? erro.message : 'Falha ao carregar os verbetes.'
    );
  }, []);
  const {
    data: verbetes,
    loading,
    refresh: carregar,
  } = useKeyedResource<Verbete[]>(
    session?.user.id ? `verbetes:${session.user.id}` : null,
    pedir,
    avisar,
    []
  );

  async function aprovar(verbete: Verbete) {
    setOcupado(verbete.id);
    const resposta = await buscarJson(ROTA, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: verbete.id, acao: 'aprovar' }),
    });
    setOcupado(null);
    if (!resposta.ok) {
      toast.error('Não foi possível aprovar o verbete.', {
        description: resposta.falha.message,
      });
      return;
    }
    toast.success(`"${verbete.titulo}" aprovado.`, {
      description: 'O motor da Lyra passa a usar este verbete nas respostas.',
    });
    await carregar();
  }

  async function confirmarRemocao() {
    const verbete = remover;
    if (!verbete) return;
    setRemover(null);
    setOcupado(verbete.id);
    const resposta = await buscarJson(
      `${ROTA}?id=${encodeURIComponent(verbete.id)}`,
      { method: 'DELETE' }
    );
    setOcupado(null);
    if (!resposta.ok) {
      toast.error('Não foi possível remover o verbete.', {
        description: resposta.falha.message,
      });
      return;
    }
    toast.success(`"${verbete.titulo}" removido.`);
    await carregar();
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Carregando">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (falha) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Não foi possível carregar os verbetes</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>{falha}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void carregar()}
          >
            Tentar de novo
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const pendentes = verbetes.filter((v) => !v.gerado?.aprovadoEm);
  const aprovados = verbetes.filter((v) => v.gerado?.aprovadoEm);
  const vazio = (texto: string) => (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-12 text-center">
      <BookOpenCheck
        className="size-8 text-muted-foreground"
        aria-hidden="true"
      />
      <p className="text-sm text-muted-foreground">{texto}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
        Quando alguém pergunta sobre um tema que a base não cobre, o modelo de
        IA conectado escreve um verbete e o motor confere formato, fonte, dados
        pessoais e repetição. O motor só usa o verbete depois da sua aprovação.
        A conferência não verifica se o conteúdo é verdadeiro: leia e confira a
        fonte antes de aprovar.
      </p>
      <Tabs defaultValue="pendentes">
        <TabsList>
          <TabsTrigger value="pendentes">
            Pendentes ({pendentes.length})
          </TabsTrigger>
          <TabsTrigger value="aprovados">
            Aprovados ({aprovados.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pendentes" className="space-y-4">
          {pendentes.length === 0
            ? vazio('Nenhum verbete aguardando aprovação.')
            : pendentes.map((verbete) => (
                <CartaoDoVerbete
                  key={verbete.id}
                  verbete={verbete}
                  ocupado={ocupado === verbete.id}
                  aoAprovar={() => void aprovar(verbete)}
                  aoRemover={() => setRemover(verbete)}
                />
              ))}
        </TabsContent>
        <TabsContent value="aprovados" className="space-y-4">
          {aprovados.length === 0
            ? vazio('Nenhum verbete aprovado ainda.')
            : aprovados.map((verbete) => (
                <CartaoDoVerbete
                  key={verbete.id}
                  verbete={verbete}
                  ocupado={ocupado === verbete.id}
                  aoRemover={() => setRemover(verbete)}
                />
              ))}
        </TabsContent>
      </Tabs>

      <AlertDialog
        open={remover !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setRemover(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {remover?.gerado?.aprovadoEm
                ? 'Retirar este verbete da base?'
                : 'Recusar este verbete?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{remover?.titulo}&quot; será apagado e o motor deixará de
              usá-lo. Esta ação não pode ser desfeita; se o tema for perguntado
              de novo, o modelo poderá escrever outro verbete.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmarRemocao()}>
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
