'use client';
import { AnexosDaConversa } from './AnexosDaConversa';
import { PlanFeatureGate } from '@/components/subscription/PlanFeatureGate';
import { ImagemDaConversa } from './ImagemDaConversa';
import type { ImagemDoTurno } from '@/lib/chat/tipos';

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ArrowDown,
  BookOpen,
  Brain,
  Calendar,
  HeartPulse,
  Info,
  KeyRound,
  SquarePen,
  Waves,
} from 'lucide-react';

import { MarcaLyra } from '@/components/marca/MarcaLyra';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useConversaLyra } from '@/hooks/use-conversa-lyra';
import { usePublicSitePageConfig } from '@/hooks/use-public-site-page-config';
import { usePrivacyMode } from '@/hooks/use-privacy-mode';
import { useLocalStorageValue } from '@/hooks/use-local-storage-value';
import { scaleRem } from '@/lib/site-page-config/runtime';
import { ChatBubble } from './ChatBubble';
import dynamic from 'next/dynamic';
import type { ParteDoChat } from '@/lib/chat/partes';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';
import { MemoriaDaLyra } from './MemoriaDaLyra';
import { PesquisaDeConversas } from './PesquisaDeConversas';

const PainelDaConversa = dynamic(
  () => import('./PainelDaConversa').then((modulo) => modulo.PainelDaConversa),
  { loading: () => <p role="status">Abrindo seus registros…</p> }
);

/**
 * Chat com a Lyra: uma coluna que aproveita a área disponível do app, no
 * padrão das interfaces de conversa de 2026. Sem conversa, a tela mostra a
 * Lyra, a mensagem de boas-vindas e as perguntas prontas em cartões; com
 * conversa, só as mensagens e o campo de envio fixo embaixo. O que antes
 * ocupava a lateral (perguntas repetidas e a explicação das camadas) foi
 * para o botão de informações, junto da chave própria (BYOK). Todos os
 * textos continuam vindo da configuração publicada no page builder.
 */

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  turnoId?: string;
  anexos?: string[];
  imagem?: ImagemDoTurno | null;
  partes?: ParteDoChat[];
  emFluxo?: boolean;
  incompleta?: boolean;
  favorita?: boolean;
}

const WELCOME_MESSAGE_ID = 'boas-vindas';
const BYOK_STORAGE_KEY = 'lyra_byok_api_key';
// Mesmo limite da rota `ask-ai-assistant` (antes o campo aceitava 4000 e o
// servidor recusava a pergunta acima de 2000).
const LIMITE_DA_PERGUNTA = 2000;

type IntegrationItem = {
  icon: React.ElementType;
  title: string;
  description: string;
};

const integrations: IntegrationItem[] = [
  {
    icon: Brain,
    title: 'Seus dados de hoje',
    description:
      'Cada resposta cruza as suas métricas de hoje e de ontem, os seus objetivos e o céu do dia, calculados nos motores da Lyra.',
  },
  {
    icon: Calendar,
    title: 'O seu dia',
    description:
      'Pergunte "como vai ser o meu dia?": o chat responde com os períodos, focos e cuidados do coach diário.',
  },
  {
    icon: BookOpen,
    title: 'Perfil e objetivos',
    description:
      'O seu nome, os objetivos e o mapa de nascimento do perfil moldam a linguagem e a direção das orientações.',
  },
  {
    icon: HeartPulse,
    title: 'Sinais do corpo',
    description:
      'Sono, energia, estresse e as leituras dos seus dispositivos ajudam a priorizar respostas gentis e realistas.',
  },
  {
    icon: Waves,
    title: 'Privacidade',
    description:
      'No Modo Privacidade a conversa fica só com o motor da Lyra, sem enviar nada a modelos externos.',
  },
];

function SobreOChat({
  titulo,
  descricao,
  rotulo,
  explicacao,
  chave,
  aoMudarChave,
  privacidade,
}: {
  titulo: string;
  descricao: string;
  rotulo: string;
  explicacao: string;
  chave: string;
  aoMudarChave: (valor: string) => void;
  privacidade: boolean;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <Info aria-hidden="true" />
          <span className="hidden sm:inline">{rotulo}</span>
          <span className="sr-only sm:hidden">{rotulo}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        aria-label={titulo}
        className="w-[min(24rem,calc(100vw-2rem))] border-border bg-popover p-0"
      >
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
            {titulo}
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {descricao}
          </p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {explicacao}
          </p>
        </div>
        {/* Rolável em telas baixas: focável para quem usa o teclado. */}
        <ul
          tabIndex={0}
          aria-label={titulo}
          className="max-h-[40dvh] space-y-3 overflow-y-auto px-5 py-4 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
        >
          {integrations.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cosmic-light text-cosmic-strong">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">
                    {item.title}
                  </span>
                  <span className="block text-xs leading-5 text-muted-foreground">
                    {item.description}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
        <div className="border-t border-border bg-background px-5 py-4">
          <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
            <KeyRound className="size-4 text-primary" aria-hidden="true" />
            Sua própria chave do Gemini (opcional)
          </p>
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
            Fica salva só neste navegador e acompanha cada pergunta até o
            servidor da Lyra, que a repassa ao Gemini sem gravá-la.
          </p>
          <Input
            type="password"
            placeholder="AIza..."
            aria-label="Chave da API do Gemini (opcional)"
            autoComplete="off"
            value={chave}
            onChange={(e) => aoMudarChave(e.target.value)}
            className="h-9 bg-card text-xs"
          />
          <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
            {chave
              ? privacidade
                ? 'Chave salva neste navegador, mas não enviada: o Modo Privacidade está ativo.'
                : 'Chave salva neste navegador.'
              : 'Nenhuma chave salva: a Lyra responde com o modelo da plataforma.'}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ChatAssistantContent({
  conversaId = null,
  aoAbrirConversa,
  salvarHistorico = true,
  mensagemId = null,
}: {
  salvarHistorico?: boolean;
  conversaId?: string | null;
  mensagemId?: string | null;
  aoAbrirConversa?: (id: string | null) => void;
} = {}) {
  const [anexos, setAnexos] = useState<string[]>([]);
  const [consentimentoAnexos, setConsentimentoAnexos] = useState(false);
  const historico = useConversaLyra(
    conversaId,
    aoAbrirConversa,
    salvarHistorico,
    mensagemId
  );
  const { config: appConfig } = usePublicSitePageConfig('app');
  const { privacyMode } = usePrivacyMode();
  const chatConfig = appConfig.chat;

  // A saudação é publicada no construtor; as mensagens vêm do histórico real.
  const messages = useMemo<Message[]>(
    () => [
      { id: WELCOME_MESSAGE_ID, text: chatConfig.welcomeMessage, sender: 'ai' },
      ...historico.turnos.flatMap<Message>((turno) => [
        {
          id: `${turno.id}:pergunta`,
          text: turno.pergunta,
          sender: 'user',
          anexos: turno.anexos,
          turnoId: turno.id,
        },
        ...(turno.resposta
          ? [
              {
                id: `${turno.id}:resposta`,
                text: turno.resposta,
                sender: 'ai' as const,
                turnoId: turno.id,
                imagem: turno.imagem,
                partes: turno.partes,
                emFluxo: turno.estado === 'processando',
                incompleta: turno.estado === 'erro',
                favorita: turno.favorita,
              },
            ]
          : []),
      ]),
    ],
    [chatConfig.welcomeMessage, historico.turnos]
  );
  const semConversa = historico.turnos.length === 0;
  const isTyping = historico.enviando;
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [storedApiKey, setStoredApiKey] =
    useLocalStorageValue(BYOK_STORAGE_KEY);
  const userApiKey = storedApiKey ?? '';
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const posicaoAnterior = useRef<{ altura: number; topo: number } | null>(null);
  const alvoEncontrado = useRef(false);

  const quickReplies = useMemo(
    () =>
      chatConfig.quickReplies
        .filter((item) => item.trim().length > 0)
        .slice(0, 6),
    [chatConfig.quickReplies]
  );

  // Rola só a lista de mensagens (a janela fica parada).
  const scrollToBottom = (smooth = true) => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTo({
      top: container.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto',
    });
  };

  useEffect(() => {
    if (mensagemId && !alvoEncontrado.current) return;
    if (isNearBottom) {
      scrollToBottom();
    }
  }, [mensagemId, isNearBottom, isTyping, messages]);

  useEffect(() => {
    if (!mensagemId || alvoEncontrado.current || historico.carregando) return;
    const elemento =
      document.getElementById(`resposta-${mensagemId}`) ??
      document.getElementById(`pergunta-${mensagemId}`);
    if (elemento) {
      alvoEncontrado.current = true;
      elemento.scrollIntoView({ block: 'center', behavior: 'instant' });
      elemento.focus({ preventScroll: true });
    }
  }, [mensagemId, messages, historico.carregando]);

  useLayoutEffect(() => {
    const container = messagesContainerRef.current;
    const posicao = posicaoAnterior.current;
    if (container && posicao && !historico.carregando) {
      container.scrollTop =
        posicao.topo + container.scrollHeight - posicao.altura;
      posicaoAnterior.current = null;
    }
  }, [messages, historico.carregando]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      setShowScrollButton(distanceFromBottom > 100);
      setIsNearBottom(distanceFromBottom < 50);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSendMessage = async (text: string) => {
    setIsNearBottom(true);
    const concluido = await historico.enviar(
      text,
      privacyMode ? '' : userApiKey,
      undefined,
      false,
      anexos,
      consentimentoAnexos
    );
    setConsentimentoAnexos(false);
    if (concluido) setAnexos([]);
  };

  const handleRegenerate = async (turnoId?: string) => {
    const turno = historico.turnos.find((item) => item.id === turnoId);
    if (turno)
      await historico.enviar(
        turno.pergunta,
        privacyMode ? '' : userApiKey,
        turno,
        false,
        anexos,
        consentimentoAnexos
      );
    setConsentimentoAnexos(false);
    setAnexos([]);
  };

  const novaConversa = () => {
    historico.novaConversa();
    setAnexos([]);
    setConsentimentoAnexos(false);
    setIsNearBottom(true);
  };

  return (
    <section
      aria-labelledby="titulo-do-chat"
      className="flex min-h-0 w-full min-w-0 flex-1 flex-col"
    >
      {/* Barra mínima: quem responde, o estado e as duas ações. */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative">
            <MarcaLyra tamanho="2.25rem" />
            <span
              className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-success"
              aria-hidden="true"
            />
          </span>
          <div className="min-w-0">
            {/* h2: o h1 da página é o título do cabeçalho do app. */}
            <h2
              id="titulo-do-chat"
              className="truncate font-display font-semibold tracking-tight text-foreground"
              style={{
                fontSize: scaleRem(1.05, appConfig.typography.cardTitle),
              }}
            >
              {chatConfig.assistantTitle}
            </h2>
            <p className="truncate text-xs text-muted-foreground">
              {chatConfig.assistantStatusLabel} ·{' '}
              {chatConfig.assistantStatusNote}
            </p>
          </div>
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-1">
          {salvarHistorico ? (
            <PesquisaDeConversas aoAlterarFavorito={historico.atualizar} />
          ) : null}
          <PlanFeatureGate features={['lyra_memory']} ocultar>
            <MemoriaDaLyra />
          </PlanFeatureGate>
          {semConversa ? null : (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={novaConversa}
              disabled={isTyping}
            >
              <SquarePen aria-hidden="true" />
              <span className="hidden sm:inline">Nova conversa</span>
              <span className="sr-only sm:hidden">Nova conversa</span>
            </Button>
          )}
          {chatConfig.showIntegrations ? (
            <SobreOChat
              titulo={chatConfig.integrationsTitle}
              descricao={chatConfig.pageDescription}
              rotulo={chatConfig.integrationsButtonLabel}
              explicacao={chatConfig.integrationsDescription}
              chave={userApiKey}
              aoMudarChave={(valor) =>
                setStoredApiKey(valor.length > 0 ? valor : null)
              }
              privacidade={privacyMode}
            />
          ) : null}
        </div>
      </header>
      {!salvarHistorico ? (
        <p className="shrink-0 pt-3 text-xs leading-5 text-muted-foreground">
          Esta conversa fica apenas nesta página. Seu plano não inclui salvar o
          histórico.
        </p>
      ) : null}

      <div
        ref={messagesContainerRef}
        tabIndex={0}
        role="region"
        aria-label="Mensagens da conversa"
        className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain py-5 pr-1 focus-visible:outline-2 focus-visible:outline-ring"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'hsl(var(--control)) transparent',
        }}
      >
        {historico.antes !== null ? (
          <Button
            variant="outline"
            size="sm"
            disabled={historico.carregando}
            onClick={() => {
              const container = messagesContainerRef.current;
              if (container)
                posicaoAnterior.current = {
                  altura: container.scrollHeight,
                  topo: container.scrollTop,
                };
              setIsNearBottom(false);
              void historico.carregarAnteriores();
            }}
          >
            Carregar mensagens anteriores
          </Button>
        ) : null}
        {historico.carregando ? (
          <p role="status" className="py-4 text-sm text-muted-foreground">
            Carregando conversa…
          </p>
        ) : null}
        {historico.erro ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{historico.erro}</AlertDescription>
            <Button
              variant="outline"
              size="sm"
              disabled={isTyping || historico.carregando}
              onClick={() => {
                const falhou = historico.turnos.findLast(
                  (turno) => turno.estado === 'erro'
                );
                if (falhou) void handleRegenerate(falhou.id);
                else historico.atualizar();
              }}
            >
              Tentar novamente
            </Button>
          </Alert>
        ) : null}
        {!isTyping &&
        historico.turnos.some((turno) => turno.estado === 'processando') ? (
          <Alert className="mb-4">
            <AlertDescription>
              Uma resposta ainda está sendo preparada. Atualize a conversa em
              instantes.
            </AlertDescription>
            <Button variant="ghost" size="sm" onClick={historico.atualizar}>
              Atualizar conversa
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const pendente = historico.turnos.find(
                  (turno) => turno.estado === 'processando'
                );
                if (pendente) void handleRegenerate(pendente.id);
              }}
            >
              Tentar concluir resposta
            </Button>
          </Alert>
        ) : null}
        {semConversa && !historico.carregando && !historico.erro ? (
          // Começo da conversa: a Lyra se apresenta e oferece caminhos.
          <div className="flex min-h-full flex-col justify-center gap-8 px-1">
            <div className="flex flex-col items-center gap-4 text-center">
              <MarcaLyra tamanho="3.5rem" />
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {chatConfig.pageEyebrow}
                </p>
                <h2
                  className="mx-auto max-w-xl font-display text-2xl font-semibold leading-tight tracking-[-0.02em] text-foreground sm:text-3xl"
                  style={{
                    fontSize: scaleRem(1.75, appConfig.typography.pageTitle),
                  }}
                >
                  {chatConfig.pageTitle}
                </h2>
                <p className="mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground">
                  {chatConfig.welcomeMessage}
                </p>
              </div>
            </div>

            {chatConfig.showQuickReplies && quickReplies.length > 0 ? (
              <div className="flex flex-col gap-3">
                <h3 className="text-center text-sm font-medium text-foreground">
                  {chatConfig.quickRepliesTitle}
                </h3>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {quickReplies.map((reply) => (
                    <li key={reply}>
                      <button
                        type="button"
                        onClick={() => void handleSendMessage(reply)}
                        disabled={isTyping}
                        className="flex h-full w-full items-start rounded-2xl border border-border bg-card px-4 py-3 text-left text-sm leading-relaxed text-foreground transition-colors hover:border-primary/40 hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
                      >
                        {reply}
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="text-center text-xs text-muted-foreground">
                  {chatConfig.quickRepliesDescription}
                </p>
              </div>
            ) : null}
          </div>
        ) : (
          <div
            className="flex flex-col gap-6 px-1"
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            aria-labelledby="titulo-do-chat"
          >
            {messages.map((msg, index) => (
              <div
                key={msg.id}
                id={
                  msg.turnoId
                    ? `${msg.sender === 'ai' ? 'resposta' : 'pergunta'}-${msg.turnoId}`
                    : undefined
                }
                tabIndex={msg.turnoId === mensagemId ? -1 : undefined}
                className="animate-in fade-in-50 slide-in-from-bottom-2 motion-reduce:animate-none focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-ring"
              >
                <ChatBubble
                  message={msg.text}
                  isUser={msg.sender === 'user'}
                  emFluxo={msg.emFluxo}
                  favorita={msg.favorita}
                  aoFavoritar={
                    salvarHistorico &&
                    msg.sender === 'ai' &&
                    msg.turnoId &&
                    !msg.emFluxo &&
                    !msg.incompleta
                      ? (valor) =>
                          historico.definirFavorita(msg.turnoId!, valor)
                      : undefined
                  }
                  onRegenerate={
                    msg.sender === 'ai' &&
                    index > 0 &&
                    !isTyping &&
                    !historico.carregando
                      ? () => void handleRegenerate(msg.turnoId)
                      : undefined
                  }
                />
                {msg.anexos?.length ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    disabled={isTyping}
                    onClick={() => {
                      setAnexos(msg.anexos ?? []);
                      setConsentimentoAnexos(false);
                    }}
                  >
                    Selecionar os {msg.anexos.length} anexos deste envio
                  </Button>
                ) : null}
                {msg.incompleta && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Resposta incompleta. Tente novamente para concluir.
                  </p>
                )}
                {msg.partes?.map((parte, indice) => (
                  <PainelDaConversa key={indice} painel={parte} />
                ))}
                {msg.imagem ? (
                  <PlanFeatureGate features={['chat_images']} ocultar>
                    {' '}
                    <ImagemDaConversa
                      key={`${msg.imagem.turnoId}:${msg.imagem.estado}`}
                      imagem={msg.imagem}
                    />
                  </PlanFeatureGate>
                ) : null}
              </div>
            ))}

            {isTyping ? <TypingIndicator /> : null}
          </div>
        )}
      </div>

      <div className="relative shrink-0 border-t border-border bg-background pb-1 pt-3">
        {historico.depois !== null ? (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <p className="text-sm text-muted-foreground">
              Você abriu um trecho antigo da conversa.
            </p>
            <Button
              variant="outline"
              size="sm"
              disabled={historico.carregando}
              onClick={() => {
                setIsNearBottom(false);
                void historico.carregarSeguintes();
              }}
            >
              Carregar mensagens seguintes
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={historico.carregando}
              onClick={() => {
                historico.irParaRecentes();
                setIsNearBottom(true);
              }}
            >
              Ir às mais recentes
            </Button>
          </div>
        ) : null}
        {showScrollButton ? (
          <button
            onClick={() => {
              scrollToBottom();
              setIsNearBottom(true);
            }}
            type="button"
            className="absolute -top-12 left-1/2 z-20 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md transition-colors hover:bg-muted"
            aria-label="Voltar para o final da conversa"
          >
            <ArrowDown className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={
              isTyping || historico.carregando || historico.depois !== null
            }
            onClick={() => {
              setIsNearBottom(true);
              void historico.enviar(
                'Mostre meu painel com os registros recentes.',
                privacyMode ? '' : userApiKey,
                undefined,
                true
              );
            }}
          >
            Ver meus dados no chat
          </Button>
          {isTyping && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={historico.interromper}
            >
              Interromper resposta
            </Button>
          )}
        </div>
        {salvarHistorico ? (
          <div className="mb-2 flex flex-col gap-2">
            <AnexosDaConversa
              obterConversa={historico.obterConversa}
              conversaAtual={historico.conversaAtual}
              desabilitado={
                isTyping ||
                historico.carregando ||
                privacyMode ||
                historico.depois !== null
              }
              selecionados={anexos}
              aoSelecionar={setAnexos}
              consentimento={consentimentoAnexos}
              aoConsentir={setConsentimentoAnexos}
            />
            {anexos.length ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAnexos([]);
                    setConsentimentoAnexos(false);
                  }}
                >
                  Limpar seleção de anexos
                </Button>
                <p className="text-xs text-muted-foreground">
                  {anexos.length} arquivo(s) selecionado(s).{' '}
                  {consentimentoAnexos
                    ? 'Leitura autorizada para esta pergunta.'
                    : 'Abra Anexos e autorize a leitura antes de enviar.'}
                </p>
              </>
            ) : null}
          </div>
        ) : null}
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={
            isTyping ||
            historico.carregando ||
            historico.depois !== null ||
            (anexos.length > 0 && (!consentimentoAnexos || privacyMode)) ||
            Boolean(historico.erro && semConversa)
          }
          maxLength={LIMITE_DA_PERGUNTA}
          placeholder={chatConfig.inputPlaceholder}
        />
        <p className="mt-2 text-center text-micro leading-4 text-muted-foreground">
          {chatConfig.emptyStateHint}
        </p>
      </div>
    </section>
  );
}
