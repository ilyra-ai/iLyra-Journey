'use client';

import { Suspense, useState } from 'react';
import { History } from 'lucide-react';
import { ConversasDoChat } from '@/components/chat/ConversasDoChat';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/context/AuthContext';
import { SplashScreen } from '@/components/SplashScreen';
import { ChatAssistantContent } from '@/components/chat/ChatAssistantContent';
import { usePlanFeatureAccess } from '@/hooks/use-plan-feature-access';
import { isPlanFeatureEnabled } from '@/lib/plans/access';
import { useAccountSubscription } from '@/hooks/use-account-subscription';
import { PlanUpgradeNotice } from '@/components/subscription/PlanUpgradeNotice';
import { perguntaDaBusca, pontoDaBusca } from '@/lib/astrology/ponto-do-mapa';
import { PLANO_DE_BASE } from '@/types/subscription';

function ConversaSelecionada() {
  const { session } = useAuth();
  const busca = useSearchParams();
  const router = useRouter();
  const { data: subscription, loading } = useAccountSubscription();
  const salvarHistorico = isPlanFeatureEnabled(subscription, 'chat_history');
  const id = salvarHistorico ? busca.get('conversa') : null;
  const mensagem = salvarHistorico ? busca.get('mensagem') : null;
  // Pergunta vinda de um ponto do mapa (tarefa 187): só o texto da pergunta
  // e o identificador do planeta, nunca dados de nascimento.
  const ponto = pontoDaBusca(busca.get('ponto'));
  const rascunho = ponto ? perguntaDaBusca(busca.get('pergunta')) : null;
  const [gavetaAberta, setGavetaAberta] = useState(false);
  if (loading) return <p role="status">Carregando conversa…</p>;
  // Histórico dentro do próprio chat (tarefas 231 a 233): coluna no desktop
  // e gaveta no celular e no tablet. Abrir ou começar uma conversa troca a
  // URL, e a chave do chat recria a conversa certa.
  const abrir = (conversa: string) => {
    setGavetaAberta(false);
    router.push(`/chat?conversa=${encodeURIComponent(conversa)}`, {
      scroll: false,
    });
  };
  const nova = () => {
    setGavetaAberta(false);
    router.push('/chat', { scroll: false });
  };
  const conversas = (
    <ConversasDoChat
      conversaAtual={id}
      aoAbrir={abrir}
      aoNovaConversa={nova}
      className="h-full"
    />
  );
  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 gap-5">
      {salvarHistorico ? (
        <aside className="hidden w-64 shrink-0 border-r border-border pr-4 lg:flex lg:flex-col">
          {conversas}
        </aside>
      ) : null}
      <ChatAssistantContent
        key={`${session?.user.id ?? 'visitante'}:${id ?? 'nova'}:${mensagem ?? ''}:${salvarHistorico}`}
        salvarHistorico={salvarHistorico}
        conversaId={id}
        mensagemId={mensagem}
        rascunho={rascunho}
        pontoDoMapa={ponto}
        acaoDasConversas={
          salvarHistorico ? (
            <Sheet open={gavetaAberta} onOpenChange={setGavetaAberta}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 lg:hidden">
                  <History aria-hidden="true" />
                  <span>Conversas</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="flex w-80 max-w-[88vw] flex-col"
              >
                <SheetHeader>
                  <SheetTitle>Conversas</SheetTitle>
                  <SheetDescription>
                    Abra, renomeie ou exclua suas conversas com a Lyra.
                  </SheetDescription>
                </SheetHeader>
                <div className="min-h-0 flex-1 px-4 pb-4">{conversas}</div>
              </SheetContent>
            </Sheet>
          ) : null
        }
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
    </div>
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
          currentPlanKey={subscription?.plan.key ?? PLANO_DE_BASE}
          title="Assistente IA indisponível"
          description="As conversas com a Lyra não fazem parte do seu plano atual. Conheça os planos que incluem este recurso."
        />
      )}
    </AppShell>
  );
}
