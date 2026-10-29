'use client';
import { AppShell } from '@/components/layout/AppShell';
import { CentralDeFoco } from '@/components/foco/CentralDeFoco';
import { useAuth } from '@/context/AuthContext';
export default function FocoPage() {
  const { session } = useAuth();
  return session ? (
    <AppShell>
      <CentralDeFoco key={session.user.id} />
    </AppShell>
  ) : null;
}
