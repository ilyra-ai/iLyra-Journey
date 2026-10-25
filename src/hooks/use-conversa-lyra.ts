'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePrivacyMode } from '@/hooks/use-privacy-mode';
import {
  EVENTO_DO_HISTORICO,
  type PaginaDaConversa,
  type RespostaDoChat,
  type TurnoDaConversa,
} from '@/lib/chat/tipos';
import { buscarJson } from '@/lib/http/transporte';

export function useConversaLyra(
  conversaInicial: string | null,
  aoAbrir?: (id: string | null) => void
) {
  const { db } = useAuth();
  const { privacyMode } = usePrivacyMode();
  const [turnos, setTurnos] = useState<TurnoDaConversa[]>([]);
  const [carregando, setCarregando] = useState(Boolean(conversaInicial));
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [antes, setAntes] = useState<number | null>(null);
  const [animarTurno, setAnimarTurno] = useState<string | null>(null);
  const conversa = useRef(conversaInicial);
  const ocupado = useRef(false);
  const montado = useRef(false);
  const [recarregar, setRecarregar] = useState(0);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  useEffect(() => {
    const id = conversa.current;
    if (!id || ocupado.current) return;
    const controle = new AbortController();
    void buscarJson(`/api/chat/conversas/${encodeURIComponent(id)}`, {
      signal: controle.signal,
      cache: 'no-store',
    }).then((resultado) => {
      if (controle.signal.aborted) return;
      if (resultado.ok) {
        const pagina = resultado.corpo as PaginaDaConversa;
        setTurnos(pagina.turnos);
        setAntes(pagina.antes);
        setErro(
          pagina.turnos.findLast((turno) => turno.estado === 'erro')?.erro ??
            null
        );
      } else setErro(resultado.falha.message);
      setCarregando(false);
    });
    return () => controle.abort();
  }, [conversaInicial, recarregar]);

  const carregarAnteriores = async () => {
    if (!conversa.current || antes === null || ocupado.current) return;
    ocupado.current = true;
    setCarregando(true);
    const resultado = await buscarJson(
      `/api/chat/conversas/${conversa.current}?antes=${antes}`,
      { cache: 'no-store' }
    );
    if (montado.current) {
      if (resultado.ok) {
        const pagina = resultado.corpo as PaginaDaConversa;
        setTurnos((atuais) => [...pagina.turnos, ...atuais]);
        setAntes(pagina.antes);
        setErro(null);
      } else setErro(resultado.falha.message);
      setCarregando(false);
    }
    ocupado.current = false;
  };

  const enviar = async (
    texto: string,
    chave: string,
    refazer?: TurnoDaConversa
  ) => {
    if (ocupado.current || carregando || !texto.trim()) return;
    ocupado.current = true;
    setEnviando(true);
    setErro(null);
    const idConversa = conversa.current ?? crypto.randomUUID();
    conversa.current = idConversa;
    const idTurno = refazer?.id ?? crypto.randomUUID();
    if (!refazer) {
      setTurnos((atuais) => [
        ...atuais,
        {
          id: idTurno,
          sequencia: 0,
          pergunta: texto.trim(),
          resposta: null,
          estado: 'processando',
          erro: null,
          criadaEm: new Date().toISOString(),
        },
      ]);
    }
    try {
      const { data, error } = await db.functions.invoke<RespostaDoChat>(
        'ask-ai-assistant',
        {
          body: {
            query: texto.trim(),
            userApiKey: chave,
            conversationId: idConversa,
            turnId: idTurno,
            regenerate: refazer?.estado === 'concluido',
            privacyMode,
          },
        }
      );
      if (error) throw new Error(error.message);
      if (montado.current) {
        setTurnos((atuais) =>
          atuais.map((turno) =>
            turno.id === idTurno
              ? {
                  ...turno,
                  resposta: data.response,
                  imagem: data.imagem,
                  estado: 'concluido',
                  erro: null,
                }
              : turno
          )
        );
        setAnimarTurno(idTurno);
        aoAbrir?.(idConversa);
      }
    } catch (falha) {
      if (montado.current) {
        const mensagem =
          falha instanceof Error
            ? falha.message
            : 'Não foi possível concluir a resposta.';
        setErro(mensagem);
        setTurnos((atuais) =>
          atuais.map((turno) =>
            turno.id === idTurno
              ? { ...turno, estado: 'erro', erro: mensagem }
              : turno
          )
        );
      }
    } finally {
      window.dispatchEvent(new Event(EVENTO_DO_HISTORICO));
      ocupado.current = false;
      if (montado.current) setEnviando(false);
    }
  };

  const novaConversa = () => {
    if (ocupado.current) return;
    conversa.current = null;
    setTurnos([]);
    setAntes(null);
    setErro(null);
    setAnimarTurno(null);
    aoAbrir?.(null);
  };

  return {
    turnos,
    carregando,
    enviando,
    erro,
    antes,
    animarTurno,
    enviar,
    novaConversa,
    carregarAnteriores,
    atualizar: () => setRecarregar((valor) => valor + 1),
  };
}
