'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/context/AuthContext';
import { SplashScreen } from '@/components/SplashScreen';
import { ChatAssistantContent } from '@/components/chat/ChatAssistantContent';
import { usePlanFeatureAccess } from '@/hooks/use-plan-feature-access';
import { isPlanFeatureEnabled } from '@/lib/plans/access';
import { useAccountSubscription } from '@/hooks/use-account-subscription';
import { PlanUpgradeNotice } from '@/components/subscription/PlanUpgradeNotice';

function ConversaSelecionada() {
  const { session } = useAuth();
  const busca = useSearchParams();
  const router = useRouter();
  const { data: subscription, loading } = useAccountSubscription();
  const salvarHistorico = isPlanFeatureEnabled(subscription, 'chat_history');
  const id = salvarHistorico ? busca.get('conversa') : null;
  const mensagem = salvarHistorico ? busca.get('mensagem') : null;
  if (loading) return <p role="status">Carregando conversa…</p>;
  return (
    <ChatAssistantContent
      key={`${session?.user.id ?? 'visitante'}:${id ?? 'nova'}:${mensagem ?? ''}:${salvarHistorico}`}
      salvarHistorico={salvarHistorico}
      conversaId={id}
      mensagemId={mensagem}
      aoAbrirConversa={(conversa) => {
        if (conversa !== id || mensagem)
          router.replace(
            conversa
              ? `/chat?conversa=${encodeURIComponent(conversa)}`
              : '/chat',
            { scroll: false }
          );
      }}
    />
  );
}

export default function ChatPage() {
  const { session } = useAuth();
  const {
    subscription,
    enabled: chatEnabled,
    loading: subscriptionLoading,
  } = usePlanFeatureAccess('ai_chat_messages');

  if (session === undefined || subscriptionLoading) {
    return <SplashScreen />;
  }

  if (!session) {
    return null;
  }

  return (
    <AppShell ajustarAoViewport={chatEnabled} contentClassName="py-3 md:py-4">
      {chatEnabled ? (
        <Suspense fallback={<p role="status">Carregando conversa…</p>}>
          <ConversaSelecionada />
        </Suspense>
      ) : (
        <PlanUpgradeNotice
          currentPlanKey={subscription?.plan.key ?? 'free'}
          title="Assistente IA indisponível"
          description="As conversas com a Lyra não fazem parte do seu plano atual. Conheça os planos que incluem este recurso."
        />
      )}
    </AppShell>
  );
}
