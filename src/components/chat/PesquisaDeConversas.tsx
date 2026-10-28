'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { Search, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { useKeyedResource } from '@/hooks/use-keyed-resource';
import { buscarJson } from '@/lib/http/transporte';
import type { PesquisaDoChat } from '@/lib/chat/pesquisa-esquema';
import type { PaginaDaPesquisa } from '@/lib/chat/tipos';

function erroApresentadoNaPagina() {
  /* O erro é apresentado no diálogo com retentativa. */
}
function data(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso));
}

function ConteudoDaPesquisa({
  aoAbrir,
  aoAlterarFavorito,
}: {
  aoAbrir: () => void;
  aoAlterarFavorito: () => void;
}) {
  const { session } = useAuth();
  const [modo, setModo] = useState('busca');
  const [termo, setTermo] = useState('');
  const [pedido, setPedido] = useState<PesquisaDoChat | null>(null);
  const [anteriores, setAnteriores] = useState<Array<string | null>>([]);
  const [ocupada, setOcupada] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);
  const carregar = useCallback(async () => {
    const r = await buscarJson('/api/chat/pesquisa', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pedido),
    });
    if (!r.ok) throw new Error(r.falha.message);
    return r.corpo as PaginaDaPesquisa;
  }, [pedido]);
  const {
    data: pagina,
    loading,
    error,
    refresh,
  } = useKeyedResource<PaginaDaPesquisa | null>(
    pedido ? `${session?.user.id}:${JSON.stringify(pedido)}:${versao}` : null,
    carregar,
    erroApresentadoNaPagina,
    null
  );
  const pesquisar = (favoritos: boolean, valor: string) => {
    setVersao((v) => v + 1);
    setAnteriores([]);
    setPedido({ termo: valor.trim(), favoritos, cursor: null });
  };
  const resultados = pagina?.resultados ?? [];
  return (
    <Tabs
      value={modo}
      activationMode="manual"
      onValueChange={(valor) => {
        setModo(valor);
        setTermo('');
        setAnteriores([]);
        setPedido(
          valor === 'favoritos'
            ? { termo: '', favoritos: true, cursor: null }
            : null
        );
      }}
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto"
    >
      <TabsList
        aria-label="Encontrar nas conversas"
        className="h-auto w-full shrink-0"
      >
        <TabsTrigger value="busca" className="flex-1 whitespace-normal">
          Buscar no conteúdo
        </TabsTrigger>
        <TabsTrigger value="favoritos" className="flex-1 whitespace-normal">
          Respostas favoritas
        </TabsTrigger>
      </TabsList>
      {['busca', 'favoritos'].map((aba) => (
        <TabsContent key={aba} value={aba} className="shrink-0 flex-none">
          <form
            className="flex flex-col gap-3 @md/pesquisa:flex-row @md/pesquisa:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              pesquisar(aba === 'favoritos', termo);
            }}
          >
            <FieldGroup className="min-w-0 flex-1">
              <Field>
                <FieldLabel htmlFor={`termo-${aba}`}>
                  {aba === 'favoritos'
                    ? 'Filtrar favoritas (opcional)'
                    : 'Palavra ou frase'}
                </FieldLabel>
                <Input
                  id={`termo-${aba}`}
                  value={termo}
                  onChange={(e) => setTermo(e.target.value)}
                  maxLength={160}
                  required={aba === 'busca'}
                  autoComplete="off"
                />
              </Field>
            </FieldGroup>
            <Button type="submit" disabled={loading} className="shrink-0">
              <Search data-icon="inline-start" />
              {aba === 'favoritos'
                ? 'Filtrar favoritas'
                : 'Buscar nas conversas'}
            </Button>
          </form>
        </TabsContent>
      ))}
      <div
        className="shrink-0"
        tabIndex={0}
        role="region"
        aria-label="Resultados das conversas"
        aria-busy={loading}
      >
        {loading ? (
          <p role="status" className="py-4 text-sm text-muted-foreground">
            Procurando nas suas conversas…
          </p>
        ) : null}
        {error ? (
          <div
            role="alert"
            className="flex flex-col gap-2 py-4 text-sm text-destructive"
          >
            <p>
              {error instanceof Error
                ? error.message
                : 'Não foi possível pesquisar.'}
            </p>
            <Button variant="outline" onClick={() => void refresh()}>
              Tentar novamente
            </Button>
          </div>
        ) : null}
        {!pedido ? (
          <p className="py-4 text-sm text-muted-foreground">
            Encontre palavras nas perguntas e respostas do seu histórico. A
            busca não envia seu conteúdo a um modelo.
          </p>
        ) : !loading && !error ? (
          <p role="status" className="py-3 text-sm text-muted-foreground">
            {resultados.length
              ? `${resultados.length} ${resultados.length === 1 ? 'resultado nesta página' : 'resultados nesta página'}.`
              : 'Nenhum resultado nesta página.'}
          </p>
        ) : null}
        <ol className="flex flex-col gap-3">
          {resultados.map((r) => (
            <li
              key={r.turnoId}
              className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-4"
            >
              <div>
                <p className="break-words font-medium">{r.titulo}</p>
                <p className="text-xs text-muted-foreground">
                  <time dateTime={r.criadaEm}>{data(r.criadaEm)}</time>
                  {r.salvaEm ? ` · Salva em ${data(r.salvaEm)}` : ''}
                </p>
              </div>
              <div className="flex flex-col gap-1 text-sm">
                <p className="text-xs font-medium text-muted-foreground">
                  Trecho da pergunta
                </p>
                <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                  {r.pergunta}
                </p>
                {r.resposta !== null && (
                  <>
                    <p className="mt-2 text-xs font-medium text-muted-foreground">
                      Trecho da resposta
                    </p>
                    <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                      {r.resposta}
                    </p>
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <Link
                    href={`/chat?conversa=${r.conversaId}&mensagem=${r.turnoId}`}
                    onClick={aoAbrir}
                  >
                    Abrir mensagem original
                  </Link>
                </Button>
                {r.favorita && (
                  <Button
                    variant="ghost"
                    disabled={ocupada !== null}
                    onClick={() => {
                      setOcupada(r.turnoId);
                      void buscarJson(`/api/chat/favoritos/${r.turnoId}`, {
                        method: 'DELETE',
                      })
                        .then(async (resultado) => {
                          if (!resultado.ok)
                            throw new Error(resultado.falha.message);
                          aoAlterarFavorito();
                          await refresh();
                          toast.success('Resposta removida dos favoritos.');
                        })
                        .catch((e) =>
                          toast.error(
                            e instanceof Error
                              ? e.message
                              : 'Não foi possível remover.'
                          )
                        )
                        .finally(() => setOcupada(null));
                    }}
                  >
                    Remover dos favoritos
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
      {pedido && (
        <nav
          aria-label="Páginas dos resultados"
          className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border pt-3"
        >
          <Button
            variant="outline"
            disabled={loading || anteriores.length === 0}
            onClick={() => {
              const cursor = anteriores.at(-1) ?? null;
              setAnteriores((v) => v.slice(0, -1));
              setPedido({ ...pedido, cursor });
            }}
          >
            Página anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {anteriores.length + 1}
          </span>
          <Button
            variant="outline"
            disabled={loading || !pagina?.proximoCursor}
            onClick={() => {
              if (!pagina?.proximoCursor) return;
              setAnteriores((v) => [...v, pedido.cursor]);
              setPedido({ ...pedido, cursor: pagina.proximoCursor });
            }}
          >
            Próxima página
          </Button>
        </nav>
      )}
    </Tabs>
  );
}

export function PesquisaDeConversas({
  aoAlterarFavorito,
}: {
  aoAlterarFavorito: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const { session } = useAuth();
  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Search aria-hidden="true" />
          <span className="hidden sm:inline">Buscar e favoritas</span>
          <span className="sr-only sm:hidden">
            Buscar nas conversas e respostas favoritas
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent
        className="@container/pesquisa flex max-h-[calc(100%-2rem)] min-h-0 w-[calc(100%-2rem)] max-w-3xl flex-col gap-4 overflow-hidden"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          document.getElementById('termo-busca')?.focus();
        }}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>Suas conversas e respostas favoritas</DialogTitle>
          <DialogDescription>
            Busque no seu histórico e volte à mensagem original. Favoritos
            acompanham a resposta atual da mensagem; refazer atualiza seu
            conteúdo.
          </DialogDescription>
        </DialogHeader>
        {aberto && (
          <ConteudoDaPesquisa
            key={session?.user.id ?? 'visitante'}
            aoAbrir={() => setAberto(false)}
            aoAlterarFavorito={aoAlterarFavorito}
          />
        )}
        <p className="shrink-0 text-xs text-muted-foreground">
          <Star className="mr-1 inline size-3" aria-hidden="true" />
          Para salvar uma resposta, use Favoritar nas ações da Lyra.
        </p>
      </DialogContent>
    </Dialog>
  );
}
