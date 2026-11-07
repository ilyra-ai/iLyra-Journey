'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes';
import { useAuth } from '@/context/AuthContext';

type Tema = 'light' | 'dark' | 'system';
type TemaDaLyra = {
  theme: Tema;
  resolvedTheme: 'light' | 'dark';
  setTheme: (valor: string) => void;
};

const ContextoDoTema = React.createContext<TemaDaLyra | null>(null);
const eventoDoTema = 'lyra:tema-alterado';
// Mantém a alternância disponível mesmo se o navegador bloquear o armazenamento.
const preferenciasTemporarias = new Map<string, Tema>();
const semInscricao = () => () => {};
const noServidor = () => false;
const noCliente = () => true;
const semPreferencia = () => null;
const sistemaNoServidor = () => false;

function temaValido(valor: string | null): valor is Tema {
  return valor === 'light' || valor === 'dark' || valor === 'system';
}

function lerPreferencia(chave: string): Tema | null {
  const temporaria = preferenciasTemporarias.get(chave);
  if (temporaria) return temporaria;
  try {
    const valor = window.localStorage.getItem(chave);
    return temaValido(valor) ? valor : null;
  } catch {
    return null;
  }
}

function acompanharPreferencia(atualizar: () => void) {
  window.addEventListener('storage', atualizar);
  window.addEventListener(eventoDoTema, atualizar);
  return () => {
    window.removeEventListener('storage', atualizar);
    window.removeEventListener(eventoDoTema, atualizar);
  };
}

function acompanharSistema(atualizar: () => void) {
  const consulta = window.matchMedia('(prefers-color-scheme: dark)');
  consulta.addEventListener('change', atualizar);
  return () => consulta.removeEventListener('change', atualizar);
}

function sistemaEscuro() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function useTheme(): TemaDaLyra {
  const tema = React.useContext(ContextoDoTema);
  if (!tema) throw new Error('O tema da Lyra exige o ThemeProvider.');
  return tema;
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const pathname = usePathname();
  const { session } = useAuth();
  // A rota raiz é a landing para visitantes e o painel para quem entrou.
  const publico = pathname === '/login' || (pathname === '/' && !session);
  const chave = publico ? 'lyra-public-theme' : 'lyra-celestial-theme';
  const padrao: Tema = publico ? 'light' : 'dark';
  const lerTema = React.useCallback(() => lerPreferencia(chave), [chave]);
  const preferencia = React.useSyncExternalStore(
    acompanharPreferencia,
    lerTema,
    semPreferencia
  );
  const escuroNoSistema = React.useSyncExternalStore(
    acompanharSistema,
    sistemaEscuro,
    sistemaNoServidor
  );
  const hidratado = React.useSyncExternalStore(
    semInscricao,
    noCliente,
    noServidor
  );
  const theme = preferencia ?? padrao;
  const resolvedTheme =
    theme === 'system' ? (escuroNoSistema ? 'dark' : 'light') : theme;
  const setTheme = React.useCallback(
    (valor: string) => {
      if (!temaValido(valor)) return;
      try {
        window.localStorage.setItem(chave, valor);
        preferenciasTemporarias.delete(chave);
      } catch {
        preferenciasTemporarias.set(chave, valor);
      }
      window.dispatchEvent(new Event(eventoDoTema));
    },
    [chave]
  );
  const contexto = React.useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme]
  );

  // O next-themes faz a aplicação antes da primeira pintura. Após a hidratação,
  // a preferência de cada escopo controla a mesma instância do provedor: não
  // remonta a autenticação nem reinsere seu script ao navegar entre as rotas.
  return (
    <ContextoDoTema.Provider value={contexto}>
      <NextThemesProvider
        {...props}
        storageKey={chave}
        defaultTheme={padrao}
        forcedTheme={hidratado ? resolvedTheme : undefined}
      >
        {children}
      </NextThemesProvider>
    </ContextoDoTema.Provider>
  );
}
