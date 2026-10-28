'use client';
import { AppShell } from '@/components/layout/AppShell';
import { CentralDeAcontecimentos } from '@/components/acontecimentos/CentralDeAcontecimentos';
import { SplashScreen } from '@/components/SplashScreen';
import { useAuth } from '@/context/AuthContext';
export default function AcontecimentosPage() {
  const { session } = useAuth();
  if (session === undefined) return <SplashScreen />;
  if (!session) return null;
  return (
    <AppShell contentClassName="@container/acontecimentos">
      <CentralDeAcontecimentos key={session.user.id} />
    </AppShell>
  );
}
