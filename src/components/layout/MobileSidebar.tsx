'use client';

import Link from 'next/link';
import { Menu, Gem } from 'lucide-react';
import identidade from '@/components/public/CelestialIdentity.module.css';
import styles from './CelestialNavigation.module.css';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getVisibleNavigation, groupNavigation } from './navigation';
import { useIsAdmin } from '@/hooks/use-is-admin';
import { useRotaLiberada } from '@/hooks/use-rota-liberada';
import { usePublicSitePageConfig } from '@/hooks/use-public-site-page-config';

/** Menu suspenso móvel; a administração permanece na engrenagem própria. */
export function MobileSidebar({
  aoAbrirPlanos,
}: {
  aoAbrirPlanos: () => void;
}) {
  const isAdmin = useIsAdmin();
  const { config: appConfig } = usePublicSitePageConfig('app');
  const rotaLiberada = useRotaLiberada();

  const grupos = groupNavigation(
    getVisibleNavigation(isAdmin, appConfig, rotaLiberada).filter(
      (item) => !item.adminOnly && item.href !== '/planos'
    )
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Abrir navegação"
        >
          <Menu aria-hidden="true" strokeWidth={1.8} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={cn(identidade.theme, styles.mobileMenu)}
      >
        <DropdownMenuLabel className="text-primary">
          Seu espaço Lyra
        </DropdownMenuLabel>
        {Object.entries(grupos).map(([titulo, itens]) => (
          <DropdownMenuGroup key={titulo}>
            <DropdownMenuLabel className="text-primary">
              {titulo}
            </DropdownMenuLabel>
            {itens.map((item) => (
              <DropdownMenuItem asChild key={item.href}>
                <Link href={item.href}>
                  <item.icon aria-hidden="true" />
                  {item.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={aoAbrirPlanos}>
          <Gem aria-hidden="true" />
          Planos
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
