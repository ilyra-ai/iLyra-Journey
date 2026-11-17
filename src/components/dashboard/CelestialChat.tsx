'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  ChevronRight,
  MessageCircle,
  Minimize2,
  Paperclip,
  Send,
  Sparkles,
} from 'lucide-react';
import logo from '@/assets/celestial/simbolo-transparente.png';
import { usePlanFeatureAccess } from '@/hooks/use-plan-feature-access';
import { useConversaLyra } from '@/hooks/use-conversa-lyra';
import { usePrivacyMode } from '@/hooks/use-privacy-mode';
import { useLocalStorageValue } from '@/hooks/use-local-storage-value';
import { isPlanFeatureEnabled } from '@/lib/plans/access';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogPortal,
  DialogOverlay,
} from '@/components/ui/dialog';
import identidade from '@/components/public/CelestialIdentity.module.css';
import { cn } from '@/lib/utils';
import styles from './CelestialDashboard.module.css';

const ChatCompleto = dynamic(
  () =>
    import('@/components/chat/ChatAssistantContent').then(
      (m) => m.ChatAssistantContent
    ),
  {
    loading: () => <p role="status">Abrindo conversa…</p>,
  }
);

/**
 * Conversa com a Lyra no painel. Fechada, ocupa só o título e um botão de
 * ícone (pedido do titular em 17/11/2026, tarefa 213); aberta, traz as
 * sugestões, as mensagens e o campo de texto, com o mesmo transporte,
 * privacidade e histórico do chat.
 */
export function CelestialChat({ nome }: { nome?: string | null }) {
  const { enabled, loading, subscription } =
    usePlanFeatureAccess('ai_chat_messages');
  const salvar = isPlanFeatureEnabled(subscription, 'chat_history');
  const { privacyMode } = usePrivacyMode();
  const [chave] = useLocalStorageValue('lyra_byok_api_key');
  const [texto, setTexto] = useState('');
  const [anexosAberto, setAnexosAberto] = useState(false);
  const [ampliado, setAmpliado] = useState(false);
  // Começo da conversa no cartão fechado; null mantém a saudação com o nome.
  const [inicio, setInicio] = useState<string | null>(null);
  const saudacao = nome?.trim() ? `Oi Lyra, sou ${nome.trim()}` : 'Oi Lyra';
  const campo = useRef<HTMLTextAreaElement>(null);
  const conversa = useConversaLyra(null, undefined, salvar);
  useLayoutEffect(() => {
    const elemento = campo.current;
    if (!elemento) return;
    const ajustar = () => {
      elemento.style.height = 'auto';
      elemento.style.height = `${elemento.scrollHeight}px`;
    };
    ajustar();
    let larguraAnterior = elemento.parentElement?.clientWidth;
    const observador = new ResizeObserver(() => {
      const largura = elemento.parentElement?.clientWidth;
      if (largura === larguraAnterior) return;
      larguraAnterior = largura;
      ajustar();
    });
    if (elemento.parentElement) observador.observe(elemento.parentElement);
    return () => observador.disconnect();
  }, [texto, ampliado]);
  const sugerir = (pergunta: string) => {
    setTexto(pergunta);
    campo.current?.focus();
  };
  const conteudo = (
    <>
      <Image src={logo} alt="" className={styles.chatOrb} sizes="40px" />
      <div className={styles.chatHeading}>
        {ampliado ? (
          <DialogTitle>Converse com a Lyra</DialogTitle>
        ) : (
          <h2 id="titulo-lyra-painel" className={styles.tituloCompacto}>
            Converse com a Lyra
          </h2>
        )}
        <button
          type="button"
          className={styles.expandChat}
          onClick={() => setAmpliado((atual) => !atual)}
          aria-label={ampliado ? 'Reduzir conversa' : 'Abrir conversa'}
          aria-expanded={ampliado}
          title={ampliado ? 'Reduzir conversa' : 'Abrir conversa'}
        >
          {ampliado ? (
            <Minimize2 aria-hidden="true" />
          ) : (
            <MessageCircle aria-hidden="true" />
          )}
        </button>
      </div>
      {ampliado ? (
        <DialogDescription className="sr-only">
          Conversa ampliada. Use Reduzir conversa para voltar ao painel.
        </DialogDescription>
      ) : null}
      {loading ? (
        <p role="status">Conferindo seu acesso…</p>
      ) : !enabled ? (
        <Link href="/planos" className={styles.outlineButton}>
          Conhecer os planos <ChevronRight aria-hidden="true" />
        </Link>
      ) : !ampliado ? (
        // Cartão fechado: só a primeira mensagem. Enviar abre a conversa
        // completa já com ela, e a pessoa continua dali.
        <form
          className={styles.composer}
          onSubmit={(evento) => {
            evento.preventDefault();
            const mensagem = (inicio ?? saudacao).trim();
            if (!mensagem || conversa.enviando) return;
            setAmpliado(true);
            void conversa
              .enviar(mensagem, privacyMode ? '' : (chave ?? ''))
              .then((sucesso) => {
                if (sucesso) setInicio(null);
              });
          }}
        >
          <label className="sr-only" htmlFor="inicio-lyra-painel">
            Primeira mensagem para a Lyra
          </label>
          <textarea
            id="inicio-lyra-painel"
            rows={1}
            value={inicio ?? saudacao}
            maxLength={2000}
            onChange={(evento) => setInicio(evento.target.value)}
            required
          />
          <button
            type="submit"
            aria-label="Enviar e abrir a conversa com a Lyra"
            disabled={conversa.enviando || !(inicio ?? saudacao).trim()}
          >
            <Send aria-hidden="true" />
          </button>
        </form>
      ) : (
        <>
          <div className={styles.chatShortcuts}>
            <button
              type="button"
              className={styles.outlineButton}
              onClick={() =>
                sugerir(
                  'Ajude-me a entender meu mapa védico e suas principais leituras.'
                )
              }
            >
              <Sparkles aria-hidden="true" />
              Entender meu mapa
            </button>
            <button
              type="button"
              className={styles.outlineButton}
              onClick={() =>
                sugerir(
                  'Como posso compreender as leituras dos meus mapas para os próximos dias?'
                )
              }
            >
              Próximos dias
            </button>
            <button
              type="button"
              className={styles.outlineButton}
              onClick={() =>
                sugerir(
                  'Que ponto cego posso explorar a partir dos meus mapas? Use apenas os dados disponíveis, diferencie leitura simbólica de fatos e faça uma pergunta que me ajude a reconhecer esse padrão na minha vida.'
                )
              }
            >
              Meu ponto cego
            </button>
            <button
              type="button"
              className={styles.outlineButton}
              onClick={() =>
                sugerir(
                  'Que padrões de relacionamento meus mapas convidam a observar? Não presuma minha situação amorosa. Relacione a leitura disponível com reciprocidade, limites e uma pergunta de reflexão.'
                )
              }
            >
              Padrões no amor
            </button>
            <button
              type="button"
              className={styles.outlineButton}
              onClick={() =>
                sugerir(
                  'Há algum talento que eu possa estar deixando em segundo plano? Explore as indicações simbólicas dos meus mapas disponíveis, sem afirmar que conhece minha história, e sugira uma experiência pequena para eu descobrir.'
                )
              }
            >
              Talento esquecido
            </button>
            <button
              type="button"
              className={styles.outlineButton}
              onClick={() =>
                sugerir(
                  'O que meu período atual pode me convidar a encerrar ou começar? Use os ciclos e datas realmente disponíveis nos meus mapas, explique os limites da interpretação e proponha um próximo passo possível, sem prever acontecimentos como certos.'
                )
              }
            >
              Virada de ciclo
            </button>
            <button
              type="button"
              className={styles.outlineButton}
              onClick={() =>
                sugerir(
                  'Como posso encontrar coragem para uma mudança que faça sentido para mim? Relacione meus mapas disponíveis a possibilidades de reflexão, pergunte qual mudança estou considerando e ajude a explorar um primeiro passo reversível.'
                )
              }
            >
              Coragem de mudar
            </button>
          </div>
          <div
            className={styles.chatMessages}
            role="log"
            aria-label="Mensagens da conversa"
            aria-live="polite"
          >
            {conversa.turnos.map((turno) => (
              <article key={turno.id}>
                <p>
                  <strong>Você:</strong> {turno.pergunta}
                </p>
                {turno.resposta ? (
                  <p>
                    <strong>Lyra:</strong> {turno.resposta}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
          <form
            className={styles.composer}
            onSubmit={(evento) => {
              evento.preventDefault();
              if (!texto.trim() || conversa.enviando) return;
              void conversa
                .enviar(texto, privacyMode ? '' : (chave ?? ''))
                .then((sucesso) => {
                  if (sucesso) setTexto('');
                });
            }}
          >
            <button
              type="button"
              aria-label="Abrir conversa com anexos"
              onClick={() => setAnexosAberto(true)}
            >
              <Paperclip aria-hidden="true" />
            </button>
            <label className="sr-only" htmlFor="mensagem-lyra-painel">
              Mensagem para a Lyra
            </label>
            <textarea
              id="mensagem-lyra-painel"
              ref={campo}
              rows={1}
              placeholder="Escreva sua mensagem…"
              value={texto}
              maxLength={2000}
              onChange={(evento) => setTexto(evento.target.value)}
              disabled={conversa.enviando}
              required
            />
            <button
              type="submit"
              aria-label="Enviar mensagem para a Lyra"
              disabled={conversa.enviando || !texto.trim()}
            >
              <Send aria-hidden="true" />
            </button>
          </form>
          {conversa.enviando ? (
            <div role="status">
              <p>A Lyra está respondendo…</p>
              <button
                className={styles.textLink}
                type="button"
                onClick={conversa.interromper}
              >
                Interromper resposta
              </button>
            </div>
          ) : null}
          {conversa.erro ? (
            <p role="alert" className={styles.error}>
              {conversa.erro}
            </p>
          ) : null}
        </>
      )}
      <Dialog open={anexosAberto} onOpenChange={setAnexosAberto}>
        <DialogContent className={cn(identidade.theme, styles.dialog)}>
          <DialogTitle>Converse com a Lyra</DialogTitle>
          <DialogDescription>
            Use Anexos na conversa para selecionar arquivos e autorizar a
            leitura.
          </DialogDescription>
          <ChatCompleto salvarHistorico={salvar} />
        </DialogContent>
      </Dialog>
    </>
  );
  return (
    <Dialog open={ampliado} onOpenChange={setAmpliado}>
      {ampliado ? (
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Content
            className={cn(
              identidade.theme,
              styles.chatExpanded,
              styles.chatCard
            )}
            onPointerDownOutside={(evento) => evento.preventDefault()}
            onEscapeKeyDown={(evento) => evento.preventDefault()}
            onCloseAutoFocus={(evento) => {
              evento.preventDefault();
              campo.current?.focus();
            }}
          >
            {conteudo}
          </DialogPrimitive.Content>
        </DialogPortal>
      ) : (
        <section
          className={cn(styles.card, styles.chatCard)}
          aria-labelledby="titulo-lyra-painel"
        >
          {conteudo}
        </section>
      )}
    </Dialog>
  );
}
