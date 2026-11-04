'use client';

import { useId, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HistoricoDeConversas } from '@/components/chat/HistoricoDeConversas';
import { PlanFeatureGate } from '@/components/subscription/PlanFeatureGate';
import { scalePx, scaleRem } from '@/lib/site-page-config/runtime';
import type { AppPageConfig } from '@/lib/site-page-config/schema';
import { cn } from '@/lib/utils';
import { SidebarLink } from './SidebarLink';
import type { NavigationItem } from './navigation';
import {
  destinoLateralAtivo,
  organizarNavegacaoLateral,
} from './sidebar-structure';

type Props = {
  itens: NavigationItem[];
  config: AppPageConfig;
  aoNavegar?: () => void;
  previa?: boolean;
};

/** Mesma árvore, permissões e interação para desktop, celular e construtor. */
export function SidebarNavigation({
  itens,
  config,
  aoNavegar,
  previa = false,
}: Props) {
  const id = useId();
  const caminho = usePathname();
  const [escolhas, setEscolhas] = useState<
    Record<string, { caminho: string; aberto: boolean }>
  >({});
  const secoes = organizarNavegacaoLateral(itens, config);
  const escalaIcone = config.sizing.iconScale;
  const escalaRotulo = config.typography.navLabel;

  const renderizarLink = (item: NavigationItem) => (
    <li key={item.href}>
      <SidebarLink
        href={item.href}
        icon={item.icon}
        iconScale={escalaIcone}
        labelScale={escalaRotulo}
        onClick={aoNavegar}
      >
        {item.label}
      </SidebarLink>
      {item.href === '/chat' && !previa ? (
        <PlanFeatureGate features={['chat_history']} ocultar>
          <HistoricoDeConversas aoEscolher={aoNavegar} />
        </PlanFeatureGate>
      ) : null}
    </li>
  );

  return secoes.map((secao) => (
    <div key={secao.id} className="flex flex-col gap-1">
      <p
        id={`${id}-${secao.id}`}
        className="px-2.5 pb-1 text-xs font-medium text-muted-foreground"
      >
        {secao.titulo}
      </p>
      <ul
        aria-labelledby={`${id}-${secao.id}`}
        className="flex flex-col gap-0.5"
      >
        {secao.itens.map(renderizarLink)}
        {secao.submenus.map((submenu) => {
          const ativo = submenu.itens.some((item) =>
            destinoLateralAtivo(caminho, item.href)
          );
          const escolha = escolhas[submenu.id];
          // Ao mudar de página, o destino atual volta a ficar visível, mesmo
          // quando seu grupo foi fechado em outra rota ou aberto pela busca.
          const aberto =
            escolha?.caminho === caminho
              ? escolha.aberto
              : ativo || escolha?.aberto || false;
          const Icone = submenu.icone;
          const controle = `${id}-${submenu.id}`;
          return (
            <li key={submenu.id}>
              <Button
                variant="ghost"
                className="h-auto min-h-11 w-full justify-start gap-2.5 px-2.5 py-2 text-left whitespace-normal"
                aria-expanded={aberto}
                aria-controls={`${controle}-itens`}
                id={controle}
                data-active={ativo || undefined}
                onClick={() =>
                  setEscolhas((anteriores) => ({
                    ...anteriores,
                    [submenu.id]: { caminho, aberto: !aberto },
                  }))
                }
                style={{ fontSize: scaleRem(0.875, escalaRotulo) }}
              >
                <Icone
                  data-icon="inline-start"
                  aria-hidden="true"
                  style={{
                    width: scalePx(18, escalaIcone),
                    height: scalePx(18, escalaIcone),
                  }}
                />
                <span className="min-w-0 flex-1 leading-snug">
                  {submenu.titulo}
                </span>
                {ativo ? (
                  <span
                    className="size-1.5 shrink-0 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                ) : null}
                <ChevronDown
                  data-icon="inline-end"
                  aria-hidden="true"
                  className={cn(
                    'transition-transform motion-reduce:transition-none',
                    aberto && 'rotate-180'
                  )}
                />
              </Button>
              <div hidden={!aberto}>
                <ul
                  id={`${controle}-itens`}
                  aria-labelledby={controle}
                  className="ml-4 flex flex-col gap-0.5 border-l border-sidebar-border py-1 pl-2"
                >
                  {submenu.itens.map(renderizarLink)}
                </ul>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  ));
}
