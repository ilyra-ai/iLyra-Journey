'use client';

import dynamic from 'next/dynamic';
import { SplashScreen } from '@/components/SplashScreen';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/context/AuthContext';

// Cada experiência só é carregada quando a sessão real a torna necessária.
const LandingPage = dynamic(
  () =>
    import('@/components/landing/LandingPage').then(
      (modulo) => modulo.LandingPage
    ),
  { loading: () => <SplashScreen /> }
);
const Dashboard = dynamic(
  () =>
    import('@/components/dashboard/CelestialDashboard').then(
      (modulo) => modulo.CelestialDashboard
    ),
  { loading: () => <SplashScreen /> }
);

export default function Home() {
  const { session } = useAuth();
  if (session === undefined) return <SplashScreen />;
  if (!session) return <LandingPage />;
  return (
    <AppShell
      ajustarAoViewport
      mostrarApresentacao={false}
      mostrarRodape={false}
      contentClassName="max-w-[1560px] gap-0 py-3 md:py-3"
    >
      <Dashboard />
    </AppShell>
  );
}
