'use client';

import { AppShell } from '@/components/layout/AppShell';
import { AccessDenied } from '@/components/layout/AccessDenied';
import { PageIntro } from '@/components/layout/PageIntro';
import { useAuth } from '@/context/AuthContext';
import { SplashScreen } from '@/components/SplashScreen';
import { useIsAdmin } from '@/hooks/use-is-admin';
import { PublicacaoAdmin } from '@/components/admin/PublicacaoAdmin';

export default function AdminPublicacaoPage() {
  const { session } = useAuth();
  const isAdmin = useIsAdmin();

  if (session === undefined) {
    return <SplashScreen />;
  }

  if (!session || !isAdmin) {
    return <AccessDenied />;
  }

  return (
    <AppShell>
      <PageIntro
        title="Estúdio de publicação"
        description="Veja o que muda antes de publicar, publique com justificativa e reverta para qualquer versão anterior."
      />
      <PublicacaoAdmin />
    </AppShell>
  );
}
