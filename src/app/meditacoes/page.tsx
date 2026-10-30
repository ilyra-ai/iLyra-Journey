'use client';
import { AppShell } from '@/components/layout/AppShell';
import { CentralDeMeditacoes } from '@/components/meditacoes/CentralDeMeditacoes';
import { SplashScreen } from '@/components/SplashScreen';
import { useAuth } from '@/context/AuthContext';
export default function MeditacoesPage() {
  const { session } = useAuth();
  if (session === undefined) return <SplashScreen />;
  if (!session) return null;
  return (
    <AppShell contentClassName="@container/meditacoes">
      <CentralDeMeditacoes key={session.user.id} />
    </AppShell>
  );
}
