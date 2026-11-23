'use client';

import { AppShell } from '@/components/layout/AppShell';
import { AccessDenied } from '@/components/layout/AccessDenied';
import { PageIntro } from '@/components/layout/PageIntro';
import { useAuth } from '@/context/AuthContext';
import { SplashScreen } from '@/components/SplashScreen';
import { useIsAdmin } from '@/hooks/use-is-admin';
import { QualidadeAdmin } from '@/components/admin/QualidadeAdmin';

export default function AdminQualidadePage() {
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
        title="Centro de qualidade"
        description="Os cálculos do Motor conferidos agora contra referências independentes, e a qualidade dos modelos de IA pelo registro de uso."
      />
      <QualidadeAdmin />
    </AppShell>
  );
}
