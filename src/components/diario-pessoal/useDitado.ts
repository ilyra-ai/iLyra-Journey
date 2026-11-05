'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Ditado do diário (tarefa 135) com a Web Speech API. Prefere o
 * reconhecimento no próprio aparelho (`processLocally`), em que o áudio não
 * sai do dispositivo. Sem português local instalado, o clique em Contar por
 * voz inicia o serviço do navegador, sujeito à permissão nativa do microfone.
 * Nesse caso o áudio é processado fora do aparelho (no Chrome, pelo Google).
 */

interface Alternativa {
  readonly transcript: string;
}
interface Resultado {
  readonly isFinal: boolean;
  readonly length: number;
  [indice: number]: Alternativa;
}
interface EventoDeResultado extends Event {
  readonly resultIndex: number;
  readonly results: { readonly length: number; [indice: number]: Resultado };
}
interface EventoDeErro extends Event {
  readonly error: string;
}
interface Reconhecedor extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  processLocally?: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: EventoDeResultado) => void) | null;
  onerror: ((e: EventoDeErro) => void) | null;
  onend: (() => void) | null;
}
type Opcoes = {
  langs: string[];
  processLocally: boolean;
  quality?: 'dictation';
};
interface Construtor {
  new (): Reconhecedor;
  available?: (o: Opcoes) => Promise<string>;
}

export type MotorDeVoz = 'aparelho' | 'navegador';
export type EstadoDoDitado =
  | { tipo: 'parado' }
  | { tipo: 'verificando' }
  | { tipo: 'ouvindo'; motor: MotorDeVoz }
  | { tipo: 'sem-suporte' };

const OPCOES: Opcoes = {
  langs: ['pt-BR'],
  processLocally: true,
  quality: 'dictation',
};

const ERROS: Record<string, string> = {
  'not-allowed':
    'O microfone não foi liberado. Libere-o nas configurações do navegador ou digite o relato.',
  'service-not-allowed':
    'O navegador não permitiu o serviço de reconhecimento de voz. Digite o relato.',
  'audio-capture': 'Nenhum microfone foi encontrado neste aparelho.',
  'no-speech': 'Não ouvi nada. Tente de novo, mais perto do microfone.',
  network:
    'O serviço de reconhecimento do navegador não respondeu. Verifique a conexão ou digite o relato.',
  'language-not-supported':
    'O reconhecimento em português não está disponível neste navegador.',
  'phrases-not-supported':
    'O reconhecimento em português não está disponível neste navegador.',
};

function construtor(): Construtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: Construtor;
    webkitSpeechRecognition?: Construtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useDitado(aoTexto: (trecho: string) => void) {
  const [estado, setEstado] = useState<EstadoDoDitado>({ tipo: 'parado' });
  const [provisorio, setProvisorio] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [motorUsado, setMotorUsado] = useState<MotorDeVoz | null>(null);
  const atual = useRef<Reconhecedor | null>(null);
  const aoTextoRef = useRef(aoTexto);
  useEffect(() => {
    aoTextoRef.current = aoTexto;
  }, [aoTexto]);
  useEffect(() => () => atual.current?.abort(), []);

  const iniciar = useCallback((motor: MotorDeVoz) => {
    const SR = construtor();
    if (!SR) {
      setEstado({ tipo: 'sem-suporte' });
      return;
    }
    const r = new SR();
    r.lang = 'pt-BR';
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;
    if (motor === 'aparelho') r.processLocally = true;
    else if ('processLocally' in r) r.processLocally = false;
    r.onresult = (e) => {
      let parcial = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const trecho = e.results[i][0]?.transcript ?? '';
        if (e.results[i].isFinal && trecho.trim()) {
          setMotorUsado(motor);
          aoTextoRef.current(trecho.trim());
        } else if (!e.results[i].isFinal) parcial += trecho;
      }
      setProvisorio(parcial.trim());
    };
    r.onerror = (e) => {
      if (e.error !== 'aborted')
        setErro(ERROS[e.error] ?? 'O reconhecimento de voz parou com um erro.');
    };
    r.onend = () => {
      atual.current = null;
      setProvisorio('');
      setEstado({ tipo: 'parado' });
    };
    atual.current = r;
    setErro(null);
    setEstado({ tipo: 'ouvindo', motor });
    try {
      r.start();
    } catch {
      atual.current = null;
      setEstado({ tipo: 'parado' });
      setErro('Não foi possível ligar o microfone.');
    }
  }, []);

  /** Primeiro passo: confere se o português roda no próprio aparelho. */
  const comecar = useCallback(async () => {
    const SR = construtor();
    setErro(null);
    if (!SR) {
      setEstado({ tipo: 'sem-suporte' });
      return;
    }
    if (!SR.available) {
      iniciar('navegador');
      return;
    }
    setEstado({ tipo: 'verificando' });
    let disponivel = 'unavailable';
    try {
      disponivel = await SR.available(OPCOES);
    } catch {
      disponivel = 'unavailable';
    }
    if (disponivel === 'available') iniciar('aparelho');
    else iniciar('navegador');
  }, [iniciar]);

  const parar = useCallback(() => atual.current?.stop(), []);
  const esquecerMotor = useCallback(() => setMotorUsado(null), []);

  return {
    estado,
    provisorio,
    erro,
    motorUsado,
    comecar,
    iniciar,
    parar,
    esquecerMotor,
  };
}
