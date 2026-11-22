'use client';

import { AppShell } from '@/components/layout/AppShell';
import { AccessDenied } from '@/components/layout/AccessDenied';
import { PageIntro } from '@/components/layout/PageIntro';
import { useAuth } from '@/context/AuthContext';
import { SplashScreen } from '@/components/SplashScreen';
import { useIsAdmin } from '@/hooks/use-is-admin';
import { LoginSocialAdmin } from '@/components/admin/LoginSocialAdmin';

export default function AdminLoginSocialPage() {
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
        title="Login social"
        description="Credenciais e interruptor do login com Google e com Apple. O cadastro com e-mail e senha continua disponível em qualquer caso."
      />
      <LoginSocialAdmin />
    </AppShell>
  );
}
