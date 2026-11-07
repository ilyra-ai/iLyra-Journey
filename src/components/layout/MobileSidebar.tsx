'use client';

import React from 'react';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { PlanoJuntoAoLogo } from '@/components/subscription/PlanoJuntoAoLogo';
import { CelestialBrand } from '@/components/public/CelestialBrand';
import identidade from '@/components/public/CelestialIdentity.module.css';
import styles from './CelestialNavigation.module.css';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { SidebarNavigation } from './SidebarNavigation';
import { getVisibleNavigation } from './navigation';
import { useAuth } from '@/context/AuthContext';
import { useIsAdmin } from '@/hooks/use-is-admin';
import { useRotaLiberada } from '@/hooks/use-rota-liberada';
import { usePublicSitePageConfig } from '@/hooks/use-public-site-page-config';

/*
  Navegação do celular e tablet (abaixo de `lg`): painel lateral com a
  mesma estrutura da sidebar do desktop. O botão de fechar vem do próprio
  `SheetContent`.
*/
export function MobileSidebar() {
  const { session } = useAuth();
  const isAdmin = useIsAdmin();
  const { config: appConfig } = usePublicSitePageConfig('app');
  const [open, setOpen] = React.useState(false);
  const rotaLiberada = useRotaLiberada();

  const itens = getVisibleNavigation(isAdmin, appConfig, rotaLiberada);
  const firstName =
    session?.user?.email?.split('@')[0]?.replace(/\./g, ' ') || 'Você';

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Abrir navegação"
        >
          <Menu aria-hidden="true" strokeWidth={1.8} />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="left"
        className={cn(identidade.theme, styles.mobilePanel, 'gap-5')}
      >
        <SheetHeader className="pr-10">
          <div className="flex flex-wrap items-center gap-1">
            <Link
              href="/"
              className={styles.mobileBrand}
              onClick={() => setOpen(false)}
            >
              <CelestialBrand />
              <SheetTitle className="sr-only">
                Navegação Lyra MetaCare
              </SheetTitle>
            </Link>
            <PlanoJuntoAoLogo aoAbrir={() => setOpen(false)} />
          </div>
        </SheetHeader>

        <div className="rounded-md border border-border bg-background px-3.5 py-3">
          <p className="text-xs font-medium text-muted-foreground">
            {appConfig.sidebar.statusEyebrow}
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            Olá, {firstName}
          </p>
          <SheetDescription className="mt-0.5 text-sm leading-6 text-muted-foreground">
            {appConfig.sidebar.statusTitle}
          </SheetDescription>
        </div>

        <nav
          aria-label="Navegação móvel"
          className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto"
        >
          <SidebarNavigation
            itens={itens}
            config={appConfig}
            aoNavegar={() => setOpen(false)}
          />
        </nav>
      </SheetContent>
    </Sheet>
  );
}
