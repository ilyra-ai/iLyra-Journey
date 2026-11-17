'use client';

import { AppShell } from '@/components/layout/AppShell';
import { AccessDenied } from '@/components/layout/AccessDenied';
import { PageIntro } from '@/components/layout/PageIntro';
import { useAuth } from '@/context/AuthContext';
import { SplashScreen } from '@/components/SplashScreen';
import { useIsAdmin } from '@/hooks/use-is-admin';
import { VerbetesGeradosContent } from '@/components/admin/VerbetesGeradosContent';

export default function AdminVerbetesDaLyraPage() {
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
      <PageIntro title="Verbetes da Lyra" />
      <VerbetesGeradosContent />
    </AppShell>
  );
}
