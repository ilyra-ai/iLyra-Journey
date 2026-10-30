'use client';
import { Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { LinhaDoTempoPessoal } from '@/components/linha-do-tempo/LinhaDoTempoPessoal';
import { SplashScreen } from '@/components/SplashScreen';
import { useAuth } from '@/context/AuthContext';
function Conteudo() {
  const { session } = useAuth();
  if (session === undefined) return <SplashScreen />;
  if (!session) return null;
  return (
    <AppShell contentClassName="@container/linha">
      <LinhaDoTempoPessoal key={session.user.id} />
    </AppShell>
  );
}
export default function LinhaDoTempoPage() {
  return (
    <Suspense fallback={<SplashScreen />}>
      <Conteudo />
    </Suspense>
  );
}
