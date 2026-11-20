'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import {
  Check,
  ChevronDown,
  Ellipsis,
  MessageSquare,
  Pencil,
  SquarePen,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

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
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useKeyedResource } from '@/hooks/use-keyed-resource';
import {
  EVENTO_DO_HISTORICO,
  type PaginaDeConversas,
  type ResumoDaConversa,
} from '@/lib/chat/tipos';
import { buscarJson } from '@/lib/http/transporte';
import { cn } from '@/lib/utils';

/** O título é criado pelo modelo depois da resposta (tarefa 231). */
const ESPERA_PELO_TITULO_MS = 8000;
const POR_PAGINA = 20;

async function pedirPagina(marcador: string | null = null) {
  const resultado = await buscarJson(
    `/api/chat/conversas?limite=${POR_PAGINA}${marcador ? `&cursor=${encodeURIComponent(marcador)}` : ''}`,
    { cache: 'no-store' }
  );
  if (!resultado.ok) throw new Error(resultado.falha.message);
  return resultado.corpo as PaginaDeConversas;
}

/** A falha aparece na própria lista (o recurso guarda o erro). */
function ignorarFalha() {}

/**
 * Histórico de conversas dentro do próprio chat (tarefas 231 a 233): abrir,
 * começar uma nova, renomear e excluir. Os títulos vêm do servidor (criados
 * pelo modelo de IA ou dados pela pessoa).
 */
export function ConversasDoChat({
  conversaAtual,
  aoAbrir,
  aoNovaConversa,
  className,
}: {
  conversaAtual: string | null;
  aoAbrir: (id: string) => void;
  aoNovaConversa: () => void;
  className?: string;
}) {
  const idDaLista = useId();
  // Primeira página pelo padrão do projeto (sem setState síncrono no
  // efeito); "Ver mais", renomear e excluir ajustam por cima dela.
  const primeiraPagina = useKeyedResource<PaginaDeConversas | null>(
    'conversas-do-chat',
    pedirPagina,
    ignorarFalha,
    null
  );
  const [maisPaginas, setMaisPaginas] = useState<PaginaDeConversas | null>(
    null
  );
  const [editadas, setEditadas] = useState<Record<string, ResumoDaConversa>>(
    {}
  );
  const [excluidas, setExcluidas] = useState<string[]>([]);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [paraExcluir, setParaExcluir] = useState<ResumoDaConversa | null>(null);
  const { refresh } = primeiraPagina;

  const atualizar = useCallback(() => {
    setMaisPaginas(null);
    setEditadas({});
    void refresh();
  }, [refresh]);

  useEffect(() => {
    let espera: ReturnType<typeof setTimeout> | undefined;
    const aoSalvar = () => {
      atualizar();
      // O título criado pela IA chega alguns segundos depois da resposta.
      clearTimeout(espera);
      espera = setTimeout(atualizar, ESPERA_PELO_TITULO_MS);
    };
    window.addEventListener(EVENTO_DO_HISTORICO, aoSalvar);
    return () => {
      clearTimeout(espera);
      window.removeEventListener(EVENTO_DO_HISTORICO, aoSalvar);
    };
  }, [atualizar]);

  const conversas = [
    ...(primeiraPagina.data?.conversas ?? []),
    ...(maisPaginas?.conversas ?? []),
  ]
    .filter(
      (conversa, indice, todas) =>
        todas.findIndex((outra) => outra.id === conversa.id) === indice &&
        !excluidas.includes(conversa.id)
    )
    .map((conversa) => editadas[conversa.id] ?? conversa);
  const cursor =
    maisPaginas?.proximoCursor ??
    (maisPaginas ? null : primeiraPagina.data?.proximoCursor) ??
    null;
  const carregando = primeiraPagina.loading || carregandoMais;
  const erro =
    primeiraPagina.error instanceof Error
      ? primeiraPagina.error.message
      : primeiraPagina.error
        ? 'Não foi possível carregar o histórico.'
        : null;

  async function verMais() {
    if (!cursor) return;
    setCarregandoMais(true);
    try {
      const pagina = await pedirPagina(cursor);
      setMaisPaginas((atual) => ({
        conversas: [...(atual?.conversas ?? []), ...pagina.conversas],
        proximoCursor: pagina.proximoCursor,
      }));
    } catch (falha) {
      toast.error('Não foi possível carregar mais conversas.', {
        description: falha instanceof Error ? falha.message : undefined,
      });
    } finally {
      setCarregandoMais(false);
    }
  }

  async function renomear(conversa: ResumoDaConversa) {
    const titulo = nome.replace(/\s+/g, ' ').trim();
    if (!titulo || titulo === conversa.titulo) {
      setEditando(null);
      return;
    }
    setSalvando(true);
    const resultado = await buscarJson(`/api/chat/conversas/${conversa.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo }),
    });
    setSalvando(false);
    if (!resultado.ok) {
      toast.error('Não foi possível renomear a conversa.', {
        description: resultado.falha.message,
      });
      return;
    }
    const { conversa: salva } = resultado.corpo as {
      conversa: ResumoDaConversa;
    };
    setEditadas((atuais) => ({ ...atuais, [salva.id]: salva }));
    setEditando(null);
  }

  async function excluir(conversa: ResumoDaConversa) {
    setSalvando(true);
    const resultado = await buscarJson(`/api/chat/conversas/${conversa.id}`, {
      method: 'DELETE',
    });
    setSalvando(false);
    setParaExcluir(null);
    if (!resultado.ok) {
      toast.error('Não foi possível excluir a conversa.', {
        description: resultado.falha.message,
      });
      return;
    }
    setExcluidas((atuais) => [...atuais, conversa.id]);
    toast.success('Conversa excluída.');
    if (conversa.id === conversaAtual) aoNovaConversa();
  }

  return (
    <nav
      aria-label="Conversas com a Lyra"
      className={cn('flex min-h-0 min-w-0 flex-col gap-3', className)}
    >
      <Button
        type="button"
        variant="outline"
        className="w-full justify-start gap-2"
        onClick={aoNovaConversa}
      >
        <SquarePen aria-hidden="true" />
        Nova conversa
      </Button>
      <p className="px-1 text-xs font-medium text-muted-foreground">
        Suas conversas
      </p>
      <ul
        id={idDaLista}
        aria-busy={carregando}
        className="-mx-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1"
      >
        {conversas.map((conversa) => {
          const atual = conversa.id === conversaAtual;
          if (editando === conversa.id)
            return (
              <li key={conversa.id}>
                <form
                  className="flex items-center gap-1 rounded-lg border border-border bg-card p-1"
                  onSubmit={(evento) => {
                    evento.preventDefault();
                    void renomear(conversa);
                  }}
                >
                  <Input
                    autoFocus
                    aria-label="Novo nome da conversa"
                    value={nome}
                    maxLength={120}
                    onChange={(evento) => setNome(evento.target.value)}
                    onKeyDown={(evento) => {
                      if (evento.key === 'Escape') setEditando(null);
                    }}
                    className="h-8 min-w-0 flex-1 text-sm"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    variant="ghost"
                    className="size-8 shrink-0"
                    aria-label="Salvar o novo nome"
                    disabled={salvando}
                  >
                    <Check aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8 shrink-0"
                    aria-label="Cancelar"
                    onClick={() => setEditando(null)}
                  >
                    <X aria-hidden="true" />
                  </Button>
                </form>
              </li>
            );
          return (
            <li
              key={conversa.id}
              className={cn(
                'group flex min-w-0 items-center rounded-lg',
                atual ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
              )}
            >
              <button
                type="button"
                onClick={() => aoAbrir(conversa.id)}
                aria-current={atual ? 'page' : undefined}
                title={conversa.titulo}
                className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-ring"
              >
                <MessageSquare
                  className="size-3.5 shrink-0 opacity-70"
                  aria-hidden="true"
                />
                <span
                  className={cn('truncate', atual ? 'font-medium' : undefined)}
                >
                  {conversa.titulo}
                </span>
              </button>
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8 shrink-0 opacity-70 hover:opacity-100 focus-visible:opacity-100"
                    aria-label={`Opções da conversa ${conversa.titulo}`}
                  >
                    <Ellipsis aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() => {
                      setNome(conversa.titulo);
                      setEditando(conversa.id);
                    }}
                  >
                    <Pencil aria-hidden="true" />
                    Renomear
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={() => setParaExcluir(conversa)}
                  >
                    <Trash2 aria-hidden="true" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          );
        })}
      </ul>
      {carregando && conversas.length === 0 ? (
        <p role="status" className="px-1 text-xs text-muted-foreground">
          Carregando conversas…
        </p>
      ) : null}
      {!carregando && !erro && conversas.length === 0 ? (
        <p className="px-1 text-xs leading-5 text-muted-foreground">
          Suas conversas aparecerão aqui.
        </p>
      ) : null}
      {erro ? (
        <div role="alert" className="px-1 text-xs text-destructive">
          <p>{erro}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={atualizar}
            disabled={carregando}
          >
            Tentar novamente
          </Button>
        </div>
      ) : null}
      {cursor ? (
        <Button
          variant="ghost"
          size="sm"
          className="justify-start"
          aria-controls={idDaLista}
          disabled={carregando}
          onClick={() => void verMais()}
        >
          <ChevronDown data-icon="inline-start" aria-hidden="true" />
          Ver mais
        </Button>
      ) : null}

      <AlertDialog
        open={paraExcluir !== null}
        onOpenChange={(aberto) => (!aberto ? setParaExcluir(null) : undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{paraExcluir?.titulo}&quot; será apagada com as mensagens,
              os anexos e as imagens dela. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={salvando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={salvando}
              className="bg-destructive text-destructive-foreground hover:bg-destructive-hover"
              onClick={(evento) => {
                evento.preventDefault();
                if (paraExcluir) void excluir(paraExcluir);
              }}
            >
              {salvando ? 'Excluindo…' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </nav>
  );
}
