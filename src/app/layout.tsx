import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { AuthGate, AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ThemeColorSync } from '@/components/theme/ThemeControls';
import { COR_DA_BARRA_DO_NAVEGADOR } from '@/components/theme/tema';
import { Toaster } from '@/components/ui/sonner';
import { fontesCelestiais } from '@/components/public/celestial-fonts';

const inter = localFont({
  variable: '--font-inter',
  src: [
    {
      path: '../assets/fonts/inter/inter-latin-300-normal.woff2',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../assets/fonts/inter/inter-latin-400-normal.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../assets/fonts/inter/inter-latin-500-normal.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../assets/fonts/inter/inter-latin-600-normal.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../assets/fonts/inter/inter-latin-700-normal.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  display: 'swap',
});

const sourceSans = localFont({
  variable: '--font-source-sans',
  src: [
    {
      path: '../assets/fonts/source-sans-3/source-sans-3-latin-400-normal.woff2',
      weight: '400',
      style: 'normal',
    },
  ],
  display: 'swap',
  preload: false,
});

const spaceGrotesk = localFont({
  variable: '--font-space-grotesk',
  src: [
    {
      path: '../assets/fonts/space-grotesk/space-grotesk-latin-500-normal.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../assets/fonts/space-grotesk/space-grotesk-latin-600-normal.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../assets/fonts/space-grotesk/space-grotesk-latin-700-normal.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  display: 'swap',
});

const jetbrainsMono = localFont({
  variable: '--font-jetbrains-mono',
  src: [
    {
      path: '../assets/fonts/jetbrains-mono/jetbrains-mono-latin-400-normal.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../assets/fonts/jetbrains-mono/jetbrains-mono-latin-500-normal.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../assets/fonts/jetbrains-mono/jetbrains-mono-latin-600-normal.woff2',
      weight: '600',
      style: 'normal',
    },
  ],
  display: 'swap',
});

/**
 * Origem pública para as URLs absolutas dos metadados (Open Graph, canônica).
 * Vem de APP_BASE_URL ou NEXT_PUBLIC_APP_URL (tarefa 58); antes era um
 * domínio fixo inexistente. Sem as duas, o endereço local do servidor.
 */
function origemPublica() {
  const configurada =
    process.env.APP_BASE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  try {
    if (configurada) return new URL(configurada);
  } catch {
    // Valor inválido: segue para o endereço local, que é sempre válido.
  }
  return new URL(`http://localhost:${process.env.PORT?.trim() || '3000'}`);
}

export const metadata: Metadata = {
  metadataBase: origemPublica(),
  title: {
    default: 'iLyra',
    template: '%s | iLyra',
  },
  description:
    'Explore seus mapas pessoais, encontre novas perspectivas e converse com a Lyra. Autoconhecimento com leituras védicas, inteligência artificial e privacidade.',
  keywords: [
    'iLyra',
    'autoconhecimento',
    'inteligência artificial',
    'astrologia védica',
    'mapas pessoais',
    'Lyra AI',
  ],
  applicationName: 'iLyra',
  authors: [{ name: 'iLyra AI' }],
  creator: 'iLyra AI',
  publisher: 'iLyra AI',
  category: 'lifestyle',
  openGraph: {
    title: 'iLyra',
    description:
      'Um novo olhar para o seu dia. Explore seus mapas e converse com a Lyra.',
    siteName: 'iLyra',
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'iLyra',
    description:
      'Mapas pessoais, novas perspectivas e conversas com a Lyra AI, com privacidade e no seu ritmo.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Sem maximumScale: o zoom do navegador precisa continuar disponível
  // (WCAG 1.4.4, redimensionar texto).
  // O tema inicial é claro em todas as rotas; o `ThemeColorSync` acompanha
  // a preferência escolhida pela pessoa.
  themeColor: COR_DA_BARRA_DO_NAVEGADOR.light,
  // A aplicação oferece os dois esquemas; o `next-themes` grava no <html> o
  // `color-scheme` do tema escolhido.
  colorScheme: 'light dark',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      // A rolagem suave (globals.css) vale para âncoras da página; com este
      // atributo o Next a desliga durante a troca de rota (o modo dev avisava
      // em todas as páginas).
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} ${sourceSans.variable} ${fontesCelestiais}`}
    >
      <body className="min-h-screen font-sans antialiased">
        <a href="#conteudo-principal" className="skip-nav">
          Pular para o conteúdo principal
        </a>
        {/* O padrão é claro em todas as rotas. As preferências pública e
            interna continuam independentes para quem alternar o tema. */}
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            <ThemeColorSync />
            <AuthGate>
              <div className="page-shell">{children}</div>
            </AuthGate>
            {/* As classes dos avisos ficam só em `ui/sonner.tsx` (tarefa 60):
                este `toastOptions` substituía o de lá por inteiro e os tons
                de sucesso, erro, alerta e informação não valiam. */}
            <Toaster
              position="top-right"
              richColors
              expand={false}
              closeButton
            />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
