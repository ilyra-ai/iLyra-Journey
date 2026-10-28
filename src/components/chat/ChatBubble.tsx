'use client';

import { useState } from 'react';
import { Check, Copy, RotateCw, Star } from 'lucide-react';
import { toast } from 'sonner';

import { MarcaLyra } from '@/components/marca/MarcaLyra';
import { cn } from '@/lib/utils';
import { RespostaMarkdown } from './RespostaMarkdown';

interface ChatBubbleProps {
  message: string;
  isUser: boolean;
  emFluxo?: boolean;
  onRegenerate?: () => void;
  favorita?: boolean;
  aoFavoritar?: (favorita: boolean) => Promise<void>;
}

/**
 * Mensagem do chat (redesenho da tarefa 52): a pergunta da pessoa num balão
 * à direita; a resposta da Lyra como texto corrido, com a marca ao lado,
 * sem caixa, como nas interfaces de conversa de 2026. Copiar e refazer
 * aparecem no hover, no foco do teclado e sempre nas telas de toque.
 */
export function ChatBubble({
  message,
  isUser,
  onRegenerate,
  emFluxo = false,
  favorita = false,
  aoFavoritar,
}: ChatBubbleProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [salvandoFavorita, setSalvandoFavorita] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error('Não foi possível copiar a mensagem.');
    }
  };

  const actionClassName =
    // 40 px de altura no toque (antes 32 px) e foco no padrão dos controles.
    'inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring md:min-h-8 md:px-2.5';

  const acoes = !emFluxo ? (
    <div className="flex flex-wrap items-center gap-0.5 opacity-0 focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
      <button
        type="button"
        onClick={() => void handleCopy()}
        className={actionClassName}
      >
        {isCopied ? (
          <>
            <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
            <span>Copiado</span>
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              Copiar
              {/* Nome único por mensagem para o leitor de tela. */}
              <span className="sr-only">
                {isUser ? ' a sua mensagem' : ' a resposta da Lyra'}
              </span>
            </span>
          </>
        )}
      </button>
      {!isUser && onRegenerate ? (
        <button
          type="button"
          onClick={onRegenerate}
          className={actionClassName}
        >
          <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>
            Refazer<span className="sr-only"> a resposta da Lyra</span>
          </span>
        </button>
      ) : null}
      {!isUser && aoFavoritar ? (
        <button
          type="button"
          className={actionClassName}
          aria-pressed={favorita}
          aria-label={
            favorita
              ? 'Remover resposta da Lyra dos favoritos'
              : 'Favoritar resposta da Lyra'
          }
          disabled={salvandoFavorita}
          aria-busy={salvandoFavorita}
          onClick={() => {
            setSalvandoFavorita(true);
            void aoFavoritar(!favorita)
              .catch((e) =>
                toast.error(
                  e instanceof Error
                    ? e.message
                    : 'Não foi possível salvar a resposta.'
                )
              )
              .finally(() => setSalvandoFavorita(false));
          }}
        >
          <Star
            className={cn('h-3.5 w-3.5', favorita && 'fill-current')}
            aria-hidden="true"
          />
          <span>
            {salvandoFavorita
              ? 'Salvando…'
              : favorita
                ? 'Favorita'
                : 'Favoritar'}
          </span>
        </button>
      ) : null}
    </div>
  ) : null;

  if (isUser) {
    return (
      <div className="group ml-auto flex min-w-0 max-w-[min(36rem,88%)] flex-col items-end gap-1">
        <p className="sr-only">Você disse:</p>
        <div className="min-w-0 max-w-full rounded-3xl rounded-br-lg bg-primary px-4 py-2.5 text-primary-foreground">
          <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-relaxed">
            {message}
          </p>
        </div>
        {acoes}
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-3">
      <MarcaLyra tamanho="1.75rem" className="mt-0.5" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {/* Leitor de tela (tarefa 62): a revelação aos poucos ficava dentro
            da região ao vivo e era anunciada em pedaços. O texto animado fica
            oculto para a tecnologia assistiva e a resposta inteira entra uma
            vez só, ao terminar, como acréscimo do registro da conversa. */}
        <div
          key={emFluxo ? 'revelando' : 'resposta-completa'}
          aria-hidden={emFluxo || undefined}
        >
          {emFluxo ? null : <p className="sr-only">A Lyra disse:</p>}
          <RespostaMarkdown texto={message} emFluxo={emFluxo} />
          {emFluxo ? (
            <span
              className="ml-0.5 inline-block h-4 w-1 animate-pulse motion-reduce:animate-none rounded-full bg-primary align-middle"
              aria-hidden="true"
            />
          ) : null}
        </div>
        {acoes}
      </div>
    </div>
  );
}
