'use client';

import { AppShell } from '@/components/layout/AppShell';
import { AccessDenied } from '@/components/layout/AccessDenied';
import { PageIntro } from '@/components/layout/PageIntro';
import { useAuth } from '@/context/AuthContext';
import { SplashScreen } from '@/components/SplashScreen';
import { useIsAdmin } from '@/hooks/use-is-admin';
import { FunilAdmin } from '@/components/admin/FunilAdmin';

export default function AdminFunilPage() {
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
        title="Funil da descoberta"
        description="Da primeira visita à assinatura. As etapas são contagens anônimas por dia; pagamentos, assinaturas e retorno vêm direto das tabelas de cobrança e de uso."
      />
      <FunilAdmin />
    </AppShell>
  );
}
