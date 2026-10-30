'use client';
import { Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { DiarioAlimentar } from '@/components/alimentacao/DiarioAlimentar';
import { SplashScreen } from '@/components/SplashScreen';
import { useAuth } from '@/context/AuthContext';
function Conteudo() {
  const { session } = useAuth();
  if (session === undefined) return <SplashScreen />;
  if (!session) return null;
  return (
    <AppShell contentClassName="@container/alimentacao">
      <DiarioAlimentar key={session.user.id} />
    </AppShell>
  );
}
export default function AlimentacaoPage() {
  return (
    <Suspense fallback={<SplashScreen />}>
      <Conteudo />
    </Suspense>
  );
}
