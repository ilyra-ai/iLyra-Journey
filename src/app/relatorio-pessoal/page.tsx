'use client';
import { AppShell } from '@/components/layout/AppShell';
import { SplashScreen } from '@/components/SplashScreen';
import { useAuth } from '@/context/AuthContext';
import { CentralDoRelatorio } from '@/components/relatorio-pessoal/CentralDoRelatorio';
export default function RelatorioPessoalPage() {
  const { session } = useAuth();
  if (session === undefined) return <SplashScreen />;
  if (!session) return null;
  return (
    <AppShell contentClassName="@container/relatorio">
      <CentralDoRelatorio key={session.user.id} />
    </AppShell>
  );
}
