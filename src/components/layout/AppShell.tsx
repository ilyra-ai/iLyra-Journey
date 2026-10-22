'use client';

import type { CSSProperties, ReactNode } from 'react';
import { usePublicSitePageConfig } from '@/hooks/use-public-site-page-config';
import { cn } from '@/lib/utils';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { MadeWithIlyra } from '@/components/made-with-ilyra';
import { PuckClientRenderer } from '@/components/puck/PuckClientRenderer';
import type { LyraPuckDocumentKey } from '@/lib/puck/types';

type AppShellProps = {
  children: ReactNode;
  /** Classes extras do `<main>`. */
  className?: string;
  /** Classes do contêiner interno (largura e espaçamento do conteúdo). */
  contentClassName?: string;
  /** Mantém o compositor do chat no viewport e a rolagem nas mensagens. */
  ajustarAoViewport?: boolean;
  /**
   * Documento Puck publicado acima do conteúdo da página. Só é carregado
   * quando o documento tem blocos (ver `PuckClientRenderer`).
   */
  puckDocumentKey?: LyraPuckDocumentKey;
};

/*
  Estrutura única das páginas autenticadas: sidebar fixa no desktop,
  cabeçalho de 64px, conteúdo com largura máxima e rodapé "feito com".
  Todas as páginas usam este shell, para que o layout não divirja entre
  telas.
*/
export function AppShell({
  children,
  className,
  contentClassName,
  puckDocumentKey,
  ajustarAoViewport = false,
}: AppShellProps) {
  const { config: appConfig } = usePublicSitePageConfig('app');
  const { cardScale, tableScale, buttonScale } = appConfig.sizing;
  return (
    <div
      // Escalas do construtor de UI (tarefa 53): cards, tabelas e botões de
      // todas as páginas autenticadas (regras em globals.css).
      className={cn(
        'lyra-app flex min-h-screen bg-background',
        ajustarAoViewport && 'h-dvh min-h-0 overflow-hidden'
      )}
      style={
        {
          '--lyra-escala-card': String(cardScale),
          '--lyra-escala-tabela': String(tableScale),
          '--lyra-escala-botao': String(buttonScale),
        } as CSSProperties
      }
    >
      <Sidebar />
      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col',
          ajustarAoViewport && 'min-h-0'
        )}
      >
        <Header />
        <main
          id="conteudo-principal"
          className={cn(
            'min-w-0 flex-1',
            ajustarAoViewport && 'flex min-h-0 flex-col overflow-y-auto',
            className
          )}
        >
          {/* O bloco editável no Puck fica dentro do <main> (tarefa 62):
              antes ficava entre o cabeçalho e o conteúdo, fora de qualquer
              região, e o link "Pular para o conteúdo" passava por cima dele. */}
          {puckDocumentKey ? (
            <PuckClientRenderer
              documentKey={puckDocumentKey}
              className="w-full shrink-0"
            />
          ) : null}
          <div
            className={cn(
              'section-shell flex flex-col gap-6 py-6 md:py-8',
              ajustarAoViewport && 'min-h-0 flex-1 max-w-none',
              contentClassName
            )}
          >
            {children}
          </div>
        </main>
        <MadeWithIlyra />
      </div>
    </div>
  );
}
