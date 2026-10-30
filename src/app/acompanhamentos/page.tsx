'use client';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { CentralDeAcompanhamentos } from '@/components/acompanhamentos/CentralDeAcompanhamentos';
import { SplashScreen } from '@/components/SplashScreen';
import { useAuth } from '@/context/AuthContext';
function Conteudo() {
  const router = useRouter(),
    p = useSearchParams(),
    { session } = useAuth();
  if (session === undefined) return <SplashScreen />;
  if (!session) return null;
  return (
    <AppShell contentClassName="@container/acompanhamentos">
      <CentralDeAcompanhamentos
        key={`${session.user.id}:${p.get('acompanhamento') ?? 'lista'}`}
        id={p.get('acompanhamento')}
        abrir={(id) =>
          router.push(
            id
              ? `/acompanhamentos?acompanhamento=${encodeURIComponent(id)}`
              : '/acompanhamentos'
          )
        }
      />
    </AppShell>
  );
}
export default function AcompanhamentosPage() {
  return (
    <Suspense fallback={<SplashScreen />}>
      <Conteudo />
    </Suspense>
  );
}
