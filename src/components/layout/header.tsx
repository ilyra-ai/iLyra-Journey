'use client';
import { PlanFeatureGate } from '@/components/subscription/PlanFeatureGate';

import React from 'react';
import Link from 'next/link';
import { CelestialBrand } from '@/components/public/CelestialBrand';
import identidade from '@/components/public/CelestialIdentity.module.css';
import styles from './CelestialNavigation.module.css';
import { cn } from '@/lib/utils';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Search, Settings, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { MarcaLyra } from '@/components/marca/MarcaLyra';
import { useAccountSubscription } from '@/hooks/use-account-subscription';
import { usePublicSitePageConfig } from '@/hooks/use-public-site-page-config';
import { scaleRem } from '@/lib/site-page-config/runtime';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command';
import { PlanBadge } from '@/components/subscription/PlanBadge';
import { MobileSidebar } from './MobileSidebar';
import { NotificationsMenu } from './NotificationsMenu';
import { ThemeMenuGroup } from '@/components/theme/ThemeControls';
import { ANCORA_PRIVACIDADE_E_DADOS } from '@/components/profile/PrivacyDataCard';
import {
  getPageMeta,
  getVisibleNavigation,
  groupNavigation,
} from './navigation';
import { useIsAdmin } from '@/hooks/use-is-admin';
import { useRotaLiberada } from '@/hooks/use-rota-liberada';
import { usePerfilDoCabecalho } from '@/hooks/use-perfil-do-cabecalho';
import { toast } from 'sonner';
import { organizarNavegacaoLateral } from './sidebar-structure';

export function Header() {
  const { session, db } = useAuth();
  const { data: subscription } = useAccountSubscription();
  const isAdmin = useIsAdmin();
  const { config: appConfig } = usePublicSitePageConfig('app');
  const pathname = usePathname();
  const router = useRouter();
  const profile = usePerfilDoCabecalho();
  const [commandOpen, setCommandOpen] = React.useState(false);

  const rotaLiberada = useRotaLiberada();

  const pageMeta = getPageMeta(pathname, appConfig);
  const itens = getVisibleNavigation(isAdmin, appConfig, rotaLiberada);
  const rotasPrincipais = [
    '/',
    '/chat',
    '/linha-do-tempo',
    '/relatorio-pessoal',
    '/planos',
  ];
  const principais = rotasPrincipais.flatMap((href) => {
    const item = itens.find((candidato) => candidato.href === href);
    return item ? [item] : [];
  });
  const complementares = groupNavigation(
    itens.filter(
      (item) =>
        !item.adminOnly &&
        !rotasPrincipais.includes(item.href) &&
        item.href !== '/profile'
    )
  );
  const administracao = organizarNavegacaoLateral(
    itens.filter((item) => item.adminOnly),
    appConfig
  ).find((secao) => secao.id === 'administracao');
  const navigation = groupNavigation(itens);
  const rotuloPrincipal = (href: string, rotulo: string) => {
    if (
      href === '/linha-do-tempo' &&
      ['Minha linha do tempo', 'Linha do tempo'].includes(rotulo)
    )
      return 'Histórico';
    if (
      href === '/relatorio-pessoal' &&
      ['Meu relatório pessoal', 'Relatório pessoal'].includes(rotulo)
    )
      return 'Relatórios';
    if (href === '/planos' && rotulo === 'Planos') return 'Minha assinatura';
    return rotulo;
  };

  // Atalhos "G + letra" exibidos na paleta de comandos (ex.: G D, G H): só
  // das páginas que o plano libera.
  const atalhos = React.useMemo(
    () =>
      new Map(
        getVisibleNavigation(isAdmin, appConfig, rotaLiberada)
          .filter((item) => item.shortcut?.startsWith('G '))
          .map((item) => [
            (item.shortcut as string).slice(2).toLowerCase(),
            item.href,
          ])
      ),
    [appConfig, isAdmin, rotaLiberada]
  );

  React.useEffect(() => {
    let esperandoSegundaTecla = 0;
    const emCampoDeTexto = (alvo: EventTarget | null) =>
      alvo instanceof HTMLElement &&
      (alvo.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName));

    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen((current) => !current);
        return;
      }
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        emCampoDeTexto(event.target)
      ) {
        return;
      }
      const tecla = event.key.toLowerCase();
      if (esperandoSegundaTecla > Date.now()) {
        esperandoSegundaTecla = 0;
        const destino = atalhos.get(tecla);
        if (destino) {
          event.preventDefault();
          router.push(destino);
        }
        return;
      }
      if (tecla === 'g') {
        esperandoSegundaTecla = Date.now() + 1500;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [atalhos, router]);

  if (!session) {
    return null;
  }

  const userEmail = session.user.email ?? '';
  const firstName =
    profile?.first_name?.trim() || userEmail.split('@')[0] || 'Você';
  const initial = firstName.charAt(0).toUpperCase();

  const handleNavigate = (href: string) => {
    setCommandOpen(false);
    router.push(href);
  };

  const handleSignOut = async () => {
    const { error } = await db.auth.signOut();
    if (error) {
      // A sessão continua ativa no servidor: avisar em vez de fingir a saída.
      toast.error('Não foi possível sair agora.', {
        description: error.message,
      });
      return;
    }
    router.push('/login');
  };

  return (
    <>
      <header className={cn(identidade.theme, styles.header)}>
        <div className={styles.inner}>
          <Link
            href="/"
            className={styles.brandLink}
            aria-label="Lyra MetaCare — Painel"
          >
            <CelestialBrand />
          </Link>
          <h1 className="sr-only">{pageMeta.title}</h1>
          <nav
            aria-label="Navegação principal"
            className={styles.primary}
            style={{ fontSize: scaleRem(1, appConfig.typography.navLabel) }}
          >
            {principais.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? 'page' : undefined}
                className={styles.primaryLink}
              >
                {rotuloPrincipal(item.href, item.label)}
              </Link>
            ))}
          </nav>
          <div className={styles.actions}>
            <MobileSidebar />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={styles.iconButton}
              onClick={() => setCommandOpen(true)}
              aria-label={appConfig.header.commandPlaceholder}
              aria-keyshortcuts="Control+K Meta+K"
            >
              <Search aria-hidden="true" />
            </Button>
            <PlanFeatureGate features={['personal_notifications']} ocultar>
              <NotificationsMenu iconScale={appConfig.sizing.iconScale} />
            </PlanFeatureGate>
            {administracao ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={styles.iconButton}
                    aria-label="Abrir Administração"
                  >
                    <Settings aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className={cn(identidade.theme, styles.adminMenu)}
                >
                  <DropdownMenuLabel>Administração</DropdownMenuLabel>
                  <div className={styles.adminGrid}>
                    {[
                      { titulo: 'Visão geral', itens: administracao.itens },
                      ...administracao.submenus,
                    ]
                      .filter((grupo) => grupo.itens.length > 0)
                      .map((grupo) => (
                        <DropdownMenuGroup key={grupo.titulo}>
                          <DropdownMenuLabel className="text-muted-foreground">
                            {grupo.titulo}
                          </DropdownMenuLabel>
                          {grupo.itens.map((item) => (
                            <DropdownMenuItem key={item.href} asChild>
                              <Link href={item.href}>
                                <item.icon aria-hidden="true" />
                                {item.label}
                              </Link>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuGroup>
                      ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 gap-2 rounded-full px-1"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={profile?.avatar_url || undefined}
                      alt={`Avatar de ${firstName}`}
                    />
                    <AvatarFallback aria-hidden="true">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                  <span className="sr-only">Abrir menu do usuário </span>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className={cn(identidade.theme, styles.profileMenu)}
              >
                <DropdownMenuLabel className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11">
                      <AvatarImage
                        src={profile?.avatar_url || undefined}
                        alt={`Avatar de ${firstName}`}
                      />
                      <AvatarFallback>{initial}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {firstName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {userEmail}
                      </p>
                      {subscription ? (
                        <div className="mt-2">
                          <PlanBadge planKey={subscription.plan.key} />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => router.push('/profile')}>
                    <UserRound />
                    {appConfig.header.profileMenuLabel}
                  </DropdownMenuItem>
                  {/* Antes "Preferências" abria a mesma página de "Meu perfil";
                    agora leva direto à seção de privacidade e dados. */}
                  <DropdownMenuItem
                    onClick={() =>
                      router.push(`/profile#${ANCORA_PRIVACIDADE_E_DADOS}`)
                    }
                  >
                    <ShieldCheck />
                    Privacidade e dados
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                {Object.entries(complementares).map(([section, items]) => (
                  <DropdownMenuGroup key={section}>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>{section}</DropdownMenuLabel>
                    {items.map((item) => (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link
                          href={item.href}
                          aria-current={
                            pathname === item.href ? 'page' : undefined
                          }
                        >
                          <item.icon aria-hidden="true" />
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                ))}
                <DropdownMenuSeparator />
                <ThemeMenuGroup />
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={handleSignOut}
                  >
                    <LogOut />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <CommandDialog
        open={commandOpen}
        onOpenChange={setCommandOpen}
        contentClassName={cn(identidade.theme, styles.command)}
      >
        {/* Nome acessível próprio (tarefa 61): antes só o placeholder. */}
        <CommandInput
          aria-label="Buscar páginas do app"
          placeholder={`${appConfig.header.commandPlaceholder}...`}
        />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          {Object.entries(navigation).map(([section, items]) => (
            <CommandGroup key={section} heading={section}>
              {items.map((item) => {
                const Icon = item.icon;

                return (
                  <CommandItem
                    key={item.href}
                    value={`${item.label} ${item.description}`}
                    onSelect={() => handleNavigate(item.href)}
                  >
                    {item.href === '/chat' ? (
                      <MarcaLyra tamanho="22px" />
                    ) : (
                      <Icon className="h-[18px] w-[18px] text-primary" />
                    )}
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-medium">{item.label}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    </div>
                    {item.shortcut ? (
                      <CommandShortcut>{item.shortcut}</CommandShortcut>
                    ) : null}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
