'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Suspense,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import {
  EVENTO_DO_HISTORICO,
  type PaginaDeConversas,
  type ResumoDaConversa,
} from '@/lib/chat/tipos';
import { requisicaoCompartilhada } from '@/lib/http/requisicao-compartilhada';
import { buscarJson } from '@/lib/http/transporte';
import { cn } from '@/lib/utils';

function ListaDeConversas({ aoEscolher }: { aoEscolher?: () => void }) {
  const { session } = useAuth();
  const usuarioId = session?.user.id;
  const caminho = usePathname();
  const busca = useSearchParams();
  const selecionada = caminho === '/chat' ? busca.get('conversa') : null;
  const id = useId();
  const [conversas, setConversas] = useState<ResumoDaConversa[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const versaoDaConsulta = useRef(0);

  const carregar = useCallback(
    async (marcador: string | null = null, sinal?: AbortSignal) => {
      if (!usuarioId) return;
      const versao = ++versaoDaConsulta.current;
      setCarregando(true);
      const url = `/api/chat/conversas?limite=3${marcador ? `&cursor=${encodeURIComponent(marcador)}` : ''}`;
      const resultado = await requisicaoCompartilhada(
        `historico:${usuarioId}:${url}`,
        () => buscarJson(url, { cache: 'no-store' })
      );
      if (sinal?.aborted || versao !== versaoDaConsulta.current) return;
      if (resultado.ok) {
        const pagina = resultado.corpo as PaginaDeConversas;
        setConversas((atuais) =>
          marcador
            ? [
                ...atuais,
                ...pagina.conversas.filter(
                  (nova) => !atuais.some((atual) => atual.id === nova.id)
                ),
              ]
            : pagina.conversas
        );
        setCursor(pagina.proximoCursor);
        setErro(null);
      } else setErro(resultado.falha.message);
      setCarregando(false);
    },
    [usuarioId]
  );

  useEffect(() => {
    const controle = new AbortController();
    const atualizar = () => {
      setAberto(false);
      void carregar(null, controle.signal);
    };
    atualizar();
    window.addEventListener(EVENTO_DO_HISTORICO, atualizar);
    return () => {
      versaoDaConsulta.current += 1;
      controle.abort();
      window.removeEventListener(EVENTO_DO_HISTORICO, atualizar);
    };
  }, [carregar]);

  if (!usuarioId) return null;
  return (
    <div className="ml-5 mt-1 flex min-w-0 flex-col gap-1 border-l border-sidebar-border pl-2 pb-2">
      <p className="px-2 text-xs text-muted-foreground">Conversas recentes</p>
      <ul
        id={id}
        aria-label="Histórico de conversas"
        aria-busy={carregando}
        hidden={!aberto}
        className={cn('flex min-w-0 flex-col gap-0.5', !aberto && 'hidden')}
      >
        {conversas.map((conversa) => (
          <li key={conversa.id} className="min-w-0">
            <Link
              href={`/chat?conversa=${conversa.id}`}
              onClick={() => {
                setAberto(false);
                aoEscolher?.();
              }}
              aria-current={selecionada === conversa.id ? 'page' : undefined}
              title={conversa.titulo}
              className={cn(
                'flex min-h-11 items-center gap-2 rounded px-2 text-sm focus-visible:outline-2 focus-visible:outline-ring',
                selecionada === conversa.id
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <MessageSquare className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="line-clamp-2 break-words">
                {conversa.titulo}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {aberto && carregando ? (
        <p role="status" className="px-2 text-xs text-muted-foreground">
          Carregando conversas…
        </p>
      ) : null}
      {aberto && erro ? (
        <div role="alert" className="px-2 text-xs text-destructive">
          <p>{erro}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void carregar()}
            disabled={carregando}
          >
            Tentar novamente
          </Button>
        </div>
      ) : null}
      {aberto && !carregando && !erro && conversas.length === 0 ? (
        <p className="px-2 text-xs leading-5 text-muted-foreground">
          Suas novas conversas aparecerão aqui.
        </p>
      ) : null}
      {aberto && cursor ? (
        <Button
          variant="ghost"
          size="sm"
          className="min-h-11 justify-start text-micro"
          aria-controls={id}
          disabled={carregando}
          onClick={() => void carregar(cursor)}
        >
          <ChevronDown data-icon="inline-start" aria-hidden="true" />
          Ver mais
        </Button>
      ) : null}
      <Button
        variant="ghost"
        size="sm"
        className="min-h-11 justify-start text-micro"
        aria-controls={id}
        aria-expanded={aberto}
        onClick={() => {
          setAberto(!aberto);
          if (!aberto) {
            setConversas((atuais) => atuais.slice(0, 3));
            setCursor(null);
            void carregar();
          }
        }}
      >
        {aberto ? (
          <ChevronUp data-icon="inline-start" aria-hidden="true" />
        ) : (
          <ChevronDown data-icon="inline-start" aria-hidden="true" />
        )}
        {aberto ? 'Ocultar histórico' : 'Ver mais'}
      </Button>
    </div>
  );
}

export function HistoricoDeConversas(props: { aoEscolher?: () => void }) {
  const { session } = useAuth();
  return (
    <Suspense fallback={null}>
      <ListaDeConversas key={session?.user.id ?? 'visitante'} {...props} />
    </Suspense>
  );
}
