'use client';

import Link from 'next/link';
import React from 'react';
import { Settings2 } from 'lucide-react';
import { PlanoJuntoAoLogo } from '@/components/subscription/PlanoJuntoAoLogo';
import { MarcaLyra } from '@/components/marca/MarcaLyra';
import { useAuth } from '@/context/AuthContext';
import { useIsAdmin } from '@/hooks/use-is-admin';
import { useAccountSubscription } from '@/hooks/use-account-subscription';
import { useRotaLiberada } from '@/hooks/use-rota-liberada';
import { usePublicSitePageConfig } from '@/hooks/use-public-site-page-config';
import { scalePx, scaleRem } from '@/lib/site-page-config/runtime';
import type { AppPageConfig } from '@/lib/site-page-config/schema';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePerfilDoCabecalho } from '@/hooks/use-perfil-do-cabecalho';
import { SidebarNavigation } from './SidebarNavigation';
import { getVisibleNavigation } from './navigation';

/*
  Sidebar "Lyra Clean": branca, borda direita de 1px, marca compacta,
  seções com rótulo discreto e o usuário com o plano no rodapé. A largura
  continua configurável pelo construtor de UI (`sizing.sidebarWidth`).

  `configuracaoPrevia`: usada pela pré-visualização do construtor de UI, que
  mostra esta mesma sidebar com o rascunho (em vez de uma cópia simulada),
  sempre visível e vista como administrador.
*/
export function Sidebar({
  configuracaoPrevia,
}: {
  configuracaoPrevia?: AppPageConfig;
} = {}) {
  // O app usa a navegação superior. A composição lateral continua disponível
  // na prévia real do construtor, sem montar consultas extras no uso normal.
  return configuracaoPrevia ? (
    <SidebarPrevia configuracaoPrevia={configuracaoPrevia} />
  ) : null;
}

function SidebarPrevia({
  configuracaoPrevia,
}: {
  configuracaoPrevia?: AppPageConfig;
} = {}) {
  const { session } = useAuth();
  const isAdminReal = useIsAdmin();
  const { data: subscription } = useAccountSubscription();
  const { config: configPublicada } = usePublicSitePageConfig('app');
  const previa = configuracaoPrevia !== undefined;
  const appConfig = configuracaoPrevia ?? configPublicada;
  const isAdmin = previa || isAdminReal;
  const profile = usePerfilDoCabecalho();

  const userEmail = session?.user?.email ?? '';
  const firstName =
    profile?.first_name?.trim() || userEmail.split('@')[0] || 'Você';
  const initial = firstName.charAt(0).toUpperCase();
  const rotaLiberadaPeloPlano = useRotaLiberada();
  // Na prévia do Construtor a sidebar é vista como administrador (tudo).
  const itens = getVisibleNavigation(
    isAdmin,
    appConfig,
    previa ? undefined : rotaLiberadaPeloPlano
  );
  const navLabelScale = appConfig.typography.navLabel;
  const iconScale = appConfig.sizing.iconScale;

  return (
    <aside
      // Nome próprio (tarefa 62): páginas com outro <aside> tinham duas
      // regiões complementares sem nome, indistinguíveis para o leitor.
      aria-label="Menu lateral"
      className={
        previa
          ? 'flex h-[640px] shrink-0 flex-col overflow-hidden rounded-xl border border-sidebar-border bg-sidebar'
          : 'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex'
      }
      style={{
        width: `${appConfig.sizing.sidebarWidth}px`,
        maxWidth: previa ? '100%' : '34vw',
      }}
    >
      <div className="flex h-full flex-col gap-5 px-3.5 py-5">
        <div className="flex flex-wrap items-center gap-1">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded px-2.5 py-1"
          >
            <MarcaLyra tamanho={scalePx(36, iconScale)} prioridade />
            <span className="min-w-0">
              <span
                className="block font-display font-semibold lowercase leading-tight text-foreground"
                style={{ fontSize: scaleRem(1.125, navLabelScale) }}
              >
                {appConfig.sidebar.brandTitle}
              </span>
              <span
                className="block truncate text-muted-foreground"
                style={{ fontSize: scaleRem(0.75, navLabelScale) }}
              >
                {appConfig.sidebar.brandEyebrow}
              </span>
            </span>
          </Link>
          {!previa ? <PlanoJuntoAoLogo /> : null}
        </div>

        <nav
          aria-label="Navegação principal"
          className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto"
        >
          <SidebarNavigation itens={itens} config={appConfig} previa={previa} />
        </nav>

        <div className="flex items-center gap-2.5 border-t border-sidebar-border px-2.5 pt-3.5">
          <Avatar className="h-9 w-9">
            <AvatarImage
              src={profile?.avatar_url || undefined}
              alt={`Avatar de ${firstName}`}
            />
            <AvatarFallback aria-hidden="true">{initial}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {firstName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {subscription ? `Plano ${subscription.plan.name}` : userEmail}
            </p>
          </div>
          <Link
            href="/profile"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={appConfig.sidebar.preferencesTitle}
            title={appConfig.sidebar.preferencesDescription}
          >
            <Settings2 className="h-[18px] w-[18px]" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
