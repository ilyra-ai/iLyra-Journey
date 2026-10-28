'use client';
import { AppShell } from '@/components/layout/AppShell';
import { SplashScreen } from '@/components/SplashScreen';
import { useAuth } from '@/context/AuthContext';
import { CentralDoDescanso } from '@/components/descanso/CentralDoDescanso';
export default function DescansoPage() {
  const { session } = useAuth();
  if (session === undefined) return <SplashScreen />;
  if (!session) return null;
  return (
    <AppShell contentClassName="@container/descanso">
      <CentralDoDescanso key={session.user.id} />
    </AppShell>
  );
}
