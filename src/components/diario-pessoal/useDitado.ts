'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Ditado do diário (tarefa 135) com a Web Speech API. Prefere o
 * reconhecimento no próprio aparelho (`processLocally`), em que o áudio não
 * sai do dispositivo. Quando o aparelho não oferece o português, o serviço
 * do navegador só é usado depois que a pessoa aceita, porque nesse caso o
 * áudio é processado fora do aparelho (no Chrome, pelo serviço do Google).
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
  install?: (o: Opcoes) => Promise<boolean>;
}

export type MotorDeVoz = 'aparelho' | 'navegador';
export type EstadoDoDitado =
  | { tipo: 'parado' }
  | { tipo: 'verificando' }
  | { tipo: 'ouvindo'; motor: MotorDeVoz }
  | { tipo: 'baixavel' }
  | { tipo: 'baixando' }
  | { tipo: 'pedir-navegador' }
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
        if (e.results[i].isFinal) aoTextoRef.current(trecho.trim());
        else parcial += trecho;
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
    setMotorUsado(motor);
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
      setEstado({ tipo: 'pedir-navegador' });
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
    else if (disponivel === 'downloadable') setEstado({ tipo: 'baixavel' });
    else if (disponivel === 'downloading') setEstado({ tipo: 'baixando' });
    else setEstado({ tipo: 'pedir-navegador' });
  }, [iniciar]);

  const baixar = useCallback(async () => {
    const SR = construtor();
    if (!SR?.install) return;
    setEstado({ tipo: 'baixando' });
    let instalado = false;
    try {
      instalado = await SR.install(OPCOES);
    } catch {
      instalado = false;
    }
    if (instalado) iniciar('aparelho');
    else {
      setEstado({ tipo: 'pedir-navegador' });
      setErro('Não foi possível baixar a voz em português neste aparelho.');
    }
  }, [iniciar]);

  const parar = useCallback(() => atual.current?.stop(), []);
  const cancelar = useCallback(() => {
    atual.current?.abort();
    setEstado({ tipo: 'parado' });
  }, []);
  const esquecerMotor = useCallback(() => setMotorUsado(null), []);

  return {
    estado,
    provisorio,
    erro,
    motorUsado,
    comecar,
    baixar,
    iniciar,
    parar,
    cancelar,
    esquecerMotor,
  };
}
