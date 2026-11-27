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

/** Tema escolhido na landing por quem ainda não tem conta (ver EscolhaDoTema). */
export const CHAVE_DA_ESCOLHA_PENDENTE = 'lyra-tema-escolhido';

/** Mesmo nome de EscolhaDoTema: só "light" ou "dark", sem dado pessoal. */
const COOKIE_DA_ESCOLHA = 'lyra_tema_escolhido';

function lerEscolhaPendente(): 'light' | 'dark' | null {
  let valor: string | null = null;
  try {
    valor = window.localStorage.getItem(CHAVE_DA_ESCOLHA_PENDENTE);
  } catch {
    valor = null;
  }
  // Reserva: o cookie da escolha, se o armazenamento local foi limpo.
  valor ??=
    document.cookie
      .split('; ')
      .find((c) => c.startsWith(`${COOKIE_DA_ESCOLHA}=`))
      ?.split('=')[1] ?? null;
  return valor === 'light' || valor === 'dark' ? valor : null;
}

function limparEscolhaPendente() {
  try {
    window.localStorage.removeItem(CHAVE_DA_ESCOLHA_PENDENTE);
  } catch {
    // Sem armazenamento disponível não há o que limpar.
  }
  document.cookie = `${COOKIE_DA_ESCOLHA}=; path=/; max-age=0; SameSite=Lax`;
}

/**
 * Grava o tema na conta. Uma falha não desfaz a troca local, que já vale
 * neste aparelho; a próxima troca tenta de novo.
 */
async function salvarTemaNaConta(tema: 'light' | 'dark') {
  try {
    await fetch('/api/account/tema', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ tema }),
    });
  } catch {
    // Sem rede: o tema local continua valendo e a próxima troca sincroniza.
  }
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
  // Claro por padrão em todas as rotas (pedido do titular em 24/11/2026). Na
  // área logada vale o tema salvo na conta (migração 086), em qualquer
  // aparelho; a troca feita neste aparelho continua salva por escopo.
  const temaDaConta = session?.user.tema_preferido ?? null;
  const padrao: Tema = publico ? 'light' : (temaDaConta ?? 'light');
  const logado = Boolean(session) && !publico;

  // Escolha feita na landing antes de ter conta: vai para a conta no
  // primeiro acesso (cadastro por e-mail, Google, Apple ou chave de acesso).
  React.useEffect(() => {
    if (!session) return;
    const pendente = lerEscolhaPendente();
    if (!pendente) return;
    limparEscolhaPendente();
    if (temaDaConta) return; // A conta já tem um tema escolhido antes.
    try {
      window.localStorage.setItem('lyra-celestial-theme', pendente);
    } catch {
      preferenciasTemporarias.set('lyra-celestial-theme', pendente);
    }
    window.dispatchEvent(new Event(eventoDoTema));
    void salvarTemaNaConta(pendente);
  }, [session, temaDaConta]);
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
      // Na área logada, a troca também vale para os outros aparelhos.
      if (logado && valor !== 'system') void salvarTemaNaConta(valor);
    },
    [chave, logado]
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
