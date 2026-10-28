'use client';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { CentralDeExperiencias } from '@/components/experiencias/CentralDeExperiencias';
import { SplashScreen } from '@/components/SplashScreen';
import { useAuth } from '@/context/AuthContext';
function Conteudo() {
  const router = useRouter(),
    p = useSearchParams(),
    { session } = useAuth();
  if (session === undefined) return <SplashScreen />;
  if (!session) return null;
  return (
    <AppShell contentClassName="@container/experiencias">
      <CentralDeExperiencias
        key={`${session.user.id}:${p.get('experiencia') ?? 'lista'}`}
        id={p.get('experiencia')}
        abrir={(id) =>
          router.push(
            id
              ? `/experiencias?experiencia=${encodeURIComponent(id)}`
              : '/experiencias'
          )
        }
      />
    </AppShell>
  );
}
export default function ExperienciasPage() {
  return (
    <Suspense fallback={<SplashScreen />}>
      <Conteudo />
    </Suspense>
  );
}
