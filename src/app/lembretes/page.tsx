'use client';

import { AppShell } from '@/components/layout/AppShell';
import { CentralDeLembretes } from '@/components/lembretes/CentralDeLembretes';
import { SplashScreen } from '@/components/SplashScreen';
import { useAuth } from '@/context/AuthContext';

export default function LembretesPage() {
  const { session } = useAuth();
  if (session === undefined) return <SplashScreen />;
  if (!session) return null;
  return (
    <AppShell contentClassName="@container/lembretes">
      <CentralDeLembretes key={session.user.id} />
    </AppShell>
  );
}
