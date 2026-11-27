'use client';

import { useEffect, useRef, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

import {
  CHAVE_DA_ESCOLHA_PENDENTE,
  useTheme,
} from '@/components/ThemeProvider';

import styles from './EscolhaDoTema.module.css';

/** Marca que a demonstração já foi vista neste navegador. */
const CHAVE_DEMONSTRADA = 'lyra-tema-demonstrado';
/**
 * Cookie da escolha (só "light" ou "dark", sem dado pessoal): reserva caso o
 * navegador limpe o armazenamento local antes do cadastro.
 */
export const COOKIE_DA_ESCOLHA = 'lyra_tema_escolhido';
const UM_ANO = 60 * 60 * 24 * 365;

type Fase = 'parada' | 'escuro' | 'claro' | 'pergunta' | 'fim';

function lerArmazenado(chave: string) {
  try {
    return window.localStorage.getItem(chave);
  } catch {
    return null;
  }
}

function gravar(chave: string, valor: string) {
  try {
    window.localStorage.setItem(chave, valor);
  } catch {
    // Sem armazenamento local, o cookie da escolha continua valendo.
  }
}

function jaDemonstrado() {
  return (
    lerArmazenado(CHAVE_DEMONSTRADA) === '1' ||
    document.cookie
      .split('; ')
      .some((c) => c.startsWith(`${COOKIE_DA_ESCOLHA}=`))
  );
}

/**
 * Primeira visita à landing (pedido do titular em 27/11/2026): mostra o
 * tema escuro e o claro e pergunta qual a pessoa prefere. A escolha vale
 * já na landing e vai para a conta no primeiro acesso (ThemeProvider),
 * para o app sempre abrir nesse tema, em qualquer aparelho.
 */
export function EscolhaDoTema({ desligada = false }: { desligada?: boolean }) {
  const { setTheme } = useTheme();
  const [fase, setFase] = useState<Fase>('parada');
  const temporizadores = useRef<number[]>([]);

  useEffect(() => {
    if (desligada || jaDemonstrado()) return;
    const semMovimento = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    const agendar = (ms: number, fn: () => void) =>
      temporizadores.current.push(window.setTimeout(fn, ms));
    const irParaPergunta = () => {
      temporizadores.current.forEach((t) => window.clearTimeout(t));
      temporizadores.current = [];
      setTheme('light');
      setFase('pergunta');
    };

    if (semMovimento) {
      agendar(800, () => setFase('pergunta'));
    } else {
      agendar(1200, () => {
        setTheme('dark');
        setFase('escuro');
      });
      agendar(4200, () => {
        setTheme('light');
        setFase('claro');
      });
      agendar(7200, () => setFase('pergunta'));
    }
    // Qualquer toque ou tecla encerra a demonstração e vai para a pergunta.
    const interromper = () => {
      if (temporizadores.current.length) irParaPergunta();
    };
    window.addEventListener('pointerdown', interromper, { once: true });
    window.addEventListener('keydown', interromper, { once: true });
    const lista = temporizadores.current;
    return () => {
      lista.forEach((t) => window.clearTimeout(t));
      window.removeEventListener('pointerdown', interromper);
      window.removeEventListener('keydown', interromper);
    };
  }, [desligada, setTheme]);

  function escolher(tema: 'light' | 'dark' | null) {
    gravar(CHAVE_DEMONSTRADA, '1');
    if (tema) {
      setTheme(tema);
      gravar(CHAVE_DA_ESCOLHA_PENDENTE, tema);
      document.cookie = `${COOKIE_DA_ESCOLHA}=${tema}; path=/; max-age=${UM_ANO}; SameSite=Lax`;
    } else {
      setTheme('light');
    }
    setFase('fim');
  }

  if (fase === 'parada' || fase === 'fim') return null;

  if (fase === 'escuro' || fase === 'claro')
    return (
      <p className={styles.legenda} role="status">
        {fase === 'escuro' ? (
          <>
            <Moon aria-hidden="true" /> Este é o tema escuro
          </>
        ) : (
          <>
            <Sun aria-hidden="true" /> E este é o tema claro
          </>
        )}
      </p>
    );

  return (
    <section
      className={styles.pergunta}
      role="dialog"
      aria-modal="false"
      aria-labelledby="escolha-do-tema-titulo"
    >
      <h2 id="escolha-do-tema-titulo">Qual tema você prefere?</h2>
      <p>
        Escolha agora; ao criar a sua conta, o app passa a abrir sempre nesse
        tema. Dá para trocar depois pelo botão de lua ou sol no topo.
      </p>
      <div className={styles.opcoes}>
        <button type="button" onClick={() => escolher('light')}>
          <Sun aria-hidden="true" /> Claro
        </button>
        <button type="button" onClick={() => escolher('dark')}>
          <Moon aria-hidden="true" /> Escuro
        </button>
      </div>
      <button
        type="button"
        className={styles.depois}
        onClick={() => escolher(null)}
      >
        Decidir depois
      </button>
    </section>
  );
}
