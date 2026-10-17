'use client';

import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/context/AuthContext';
import { SplashScreen } from '@/components/SplashScreen';
import { AppointmentsContent } from '@/components/appointments/AppointmentsContent';
import { PlanUpgradeNotice } from '@/components/subscription/PlanUpgradeNotice';
import { useAccountSubscription } from '@/hooks/use-account-subscription';
import { useRotaLiberada } from '@/hooks/use-rota-liberada';

export default function AppointmentsPage() {
  const { session } = useAuth();
  const { data: subscription, loading: subscriptionLoading } =
    useAccountSubscription();
  // Consultas e profissionais: a página exige os dois recursos do plano
  // (ver RECURSOS_DA_ROTA). Antes ela abria para qualquer plano e só a
  // gravação era recusada pela API.
  const agendaLiberada = useRotaLiberada()('/appointments');

  if (session === undefined || subscriptionLoading) {
    return <SplashScreen />;
  }

  if (!session) {
    return null;
  }

  return (
    <AppShell puckDocumentKey="appointments">
      {agendaLiberada ? (
        <AppointmentsContent />
      ) : (
        <PlanUpgradeNotice
          currentPlanKey={subscription?.plan.key ?? 'free'}
          title="Agenda indisponível"
          description="A agenda de consultas e profissionais não faz parte do seu plano atual. Conheça os planos que incluem este recurso."
          showAction
        />
      )}
    </AppShell>
  );
}
