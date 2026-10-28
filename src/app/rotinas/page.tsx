'use client';
import { AppShell } from '@/components/layout/AppShell';
import { CentralDeRotinas } from '@/components/rotinas/CentralDeRotinas';
import { SplashScreen } from '@/components/SplashScreen';
import { useAuth } from '@/context/AuthContext';
export default function RotinasPage() {
  const { session } = useAuth();
  if (session === undefined) return <SplashScreen />;
  if (!session) return null;
  return (
    <AppShell contentClassName="@container/rotinas">
      <CentralDeRotinas key={session.user.id} />
    </AppShell>
  );
}
