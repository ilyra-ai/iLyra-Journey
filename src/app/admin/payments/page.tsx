'use client';

import { AppShell } from '@/components/layout/AppShell';
import { AccessDenied } from '@/components/layout/AccessDenied';
import { PageIntro } from '@/components/layout/PageIntro';
import { useAuth } from '@/context/AuthContext';
import { SplashScreen } from '@/components/SplashScreen';
import { MeiosDePagamento } from '@/components/admin/MeiosDePagamento';
import { useIsAdmin } from '@/hooks/use-is-admin';

export default function PaymentsAdminPage() {
  const { session } = useAuth();
  const isAdmin = useIsAdmin();

  if (session === undefined) {
    return <SplashScreen />;
  }

  // O AuthContext redireciona quando não há sessão.
  if (!session) {
    return null;
  }

  if (!isAdmin) {
    return <AccessDenied />;
  }

  return (
    <AppShell>
      <PageIntro
        title="Pagamentos"
        description="Chaves de API da Stripe, do Mercado Pago e do PayPal: cadastre, teste a conexão com o provedor e escolha o ambiente de teste ou de produção."
      />
      <MeiosDePagamento />
    </AppShell>
  );
}
