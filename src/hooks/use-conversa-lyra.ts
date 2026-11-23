'use client';

import { useEffect, useRef, useState } from 'react';
import { enviarAoChat } from '@/lib/chat/transporte';
import { usePrivacyMode } from '@/hooks/use-privacy-mode';
import {
  EVENTO_DO_HISTORICO,
  type PaginaDaConversa,
  type TurnoDaConversa,
} from '@/lib/chat/tipos';
import { buscarJson } from '@/lib/http/transporte';

export function useConversaLyra(
  conversaInicial: string | null,
  aoAbrir?: (id: string | null) => void,
  salvarHistorico = true,
  mensagemInicial: string | null = null
) {
  const { privacyMode } = usePrivacyMode();
  const [turnos, setTurnos] = useState<TurnoDaConversa[]>([]);
  const [carregando, setCarregando] = useState(Boolean(conversaInicial));
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [antes, setAntes] = useState<number | null>(null);
  const [depois, setDepois] = useState<number | null>(null);
  const alvo = useRef(mensagemInicial);
  const cancelamento = useRef<AbortController | null>(null);
  const conversa = useRef(conversaInicial);
  const ocupado = useRef(false);
  const montado = useRef(false);
  const [recarregar, setRecarregar] = useState(0);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
      cancelamento.current?.abort();
    };
  }, []);

  useEffect(() => {
    const id = conversa.current;
    if (!id || ocupado.current) return;
    const controle = new AbortController();
    void buscarJson(
      `/api/chat/conversas/${encodeURIComponent(id)}${alvo.current ? `?alvo=${encodeURIComponent(alvo.current)}` : ''}`,
      {
        signal: controle.signal,
        cache: 'no-store',
      }
    ).then((resultado) => {
      if (controle.signal.aborted) return;
      if (resultado.ok) {
        const pagina = resultado.corpo as PaginaDaConversa;
        setTurnos(pagina.turnos);
        setAntes(pagina.antes);
        setDepois(pagina.depois ?? null);
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

  // Refazer uma resposta com ponto do mapa pede o ponto de novo.
  const pontoDaResposta = (turno?: TurnoDaConversa) =>
    turno?.partes?.find((parte) => parte.tipo === 'ponto-do-mapa')?.graha;

  const enviar = async (
    texto: string,
    chave: string,
    refazer?: TurnoDaConversa,
    painel = false,
    anexos: string[] = [],
    consentimentoAnexos = false,
    /** Planeta de origem da pergunta (tarefas 180 e 187). */
    ponto?: string
  ) => {
    if (
      ocupado.current ||
      carregando ||
      (depois !== null && !refazer) ||
      !texto.trim()
    )
      return;
    const arquivos = refazer?.anexos ?? anexos;
    if (
      arquivos.length &&
      (!consentimentoAnexos ||
        JSON.stringify(arquivos) !== JSON.stringify(anexos))
    ) {
      setErro(
        'Abra Anexos, selecione os mesmos arquivos da pergunta e autorize a leitura para tentar novamente.'
      );
      return;
    }
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
          anexos: arquivos,
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
    const controle = new AbortController();
    cancelamento.current = controle;
    if (refazer)
      setTurnos((atuais) =>
        atuais.map((turno) =>
          turno.id === idTurno
            ? {
                ...turno,
                estado: 'processando',
                resposta: null,
                partes: [],
                erro: null,
              }
            : turno
        )
      );
    try {
      const data = await enviarAoChat(
        {
          query: texto.trim(),
          anexos: arquivos,
          consentimentoAnexos,
          userApiKey: chave,
          ...(salvarHistorico
            ? { conversationId: idConversa, turnId: idTurno }
            : {}),
          regenerate: refazer?.estado === 'concluido',
          privacyMode,
          painel:
            painel ||
            Boolean(refazer?.partes?.some((parte) => parte.tipo === 'painel')),
          ...((ponto ?? pontoDaResposta(refazer))
            ? { ponto: ponto ?? pontoDaResposta(refazer) }
            : {}),
        },
        controle.signal,
        (resposta) => {
          if (montado.current)
            setTurnos((atuais) =>
              atuais.map((turno) =>
                turno.id === idTurno ? { ...turno, resposta } : turno
              )
            );
        }
      );
      if (montado.current) {
        setTurnos((atuais) =>
          atuais.map((turno) =>
            turno.id === idTurno
              ? {
                  ...turno,
                  resposta: data.response,
                  imagem: data.imagem,
                  partes: data.partes,
                  estado: 'concluido',
                  erro: null,
                }
              : turno
          )
        );
        if (salvarHistorico && (!refazer || !alvo.current))
          aoAbrir?.(idConversa);
      }
      return true;
    } catch (falha) {
      if (montado.current) {
        const mensagem = controle.signal.aborted
          ? 'Resposta interrompida. Você pode tentar novamente.'
          : falha instanceof Error && falha.name === 'Error'
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
      return false;
    } finally {
      if (salvarHistorico) window.dispatchEvent(new Event(EVENTO_DO_HISTORICO));
      cancelamento.current = null;
      ocupado.current = false;
      if (montado.current) setEnviando(false);
    }
  };

  const novaConversa = () => {
    if (ocupado.current) return;
    conversa.current = null;
    setTurnos([]);
    setAntes(null);
    setDepois(null);
    alvo.current = null;
    setErro(null);
    aoAbrir?.(null);
  };

  return {
    obterConversa: () => {
      conversa.current ??= crypto.randomUUID();
      return conversa.current;
    },
    conversaAtual: () => conversa.current,
    turnos,
    carregando,
    enviando,
    erro,
    antes,
    depois,
    carregarSeguintes: async () => {
      if (!conversa.current || depois === null || ocupado.current) return;
      ocupado.current = true;
      setCarregando(true);
      const resultado = await buscarJson(
        `/api/chat/conversas/${conversa.current}?depois=${depois}`,
        { cache: 'no-store' }
      );
      if (montado.current) {
        if (resultado.ok) {
          const pagina = resultado.corpo as PaginaDaConversa;
          setTurnos((atuais) => [
            ...atuais,
            ...pagina.turnos.filter((n) => !atuais.some((a) => a.id === n.id)),
          ]);
          setDepois(pagina.depois ?? null);
          setErro(null);
        } else setErro(resultado.falha.message);
        setCarregando(false);
      }
      ocupado.current = false;
    },
    irParaRecentes: () => {
      alvo.current = null;
      setCarregando(true);
      setRecarregar((v) => v + 1);
      aoAbrir?.(conversa.current);
    },
    definirFavorita: async (turnoId: string, favorita: boolean) => {
      const resultado = await buscarJson(
        `/api/chat/favoritos/${encodeURIComponent(turnoId)}`,
        { method: favorita ? 'PUT' : 'DELETE' }
      );
      if (!resultado.ok) throw new Error(resultado.falha.message);
      if (montado.current)
        setTurnos((atuais) =>
          atuais.map((t) => (t.id === turnoId ? { ...t, favorita } : t))
        );
    },
    interromper: () => cancelamento.current?.abort(),
    enviar,
    novaConversa,
    carregarAnteriores,
    atualizar: () => setRecarregar((valor) => valor + 1),
  };
}
