import type { Metadata, Viewport } from 'next';
import {
  Imprima,
  Inter,
  JetBrains_Mono,
  Space_Grotesk,
} from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ThemeColorSync } from '@/components/theme/ThemeControls';
import { COR_DA_BARRA_DO_NAVEGADOR } from '@/components/theme/tema';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

// Fonte das telas públicas, servida pelo próprio Next.js sem chamadas ao
// Google no navegador. A variável só é aplicada na landing e no login.
const imprima = Imprima({
  variable: '--font-imprima',
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  preload: false,
});

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
  display: 'swap',
  weight: ['500', '600', '700'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600'],
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
    default: 'Lyra MetaCare',
    template: '%s | Lyra MetaCare',
  },
  description:
    'Plataforma de bem-estar, longevidade e autoconhecimento: seus sinais do dia, o seu mapa védico e uma IA que orienta a rotina. Não substitui avaliação profissional de saúde.',
  keywords: [
    'Lyra MetaCare',
    'saúde preventiva',
    'bem-estar',
    'inteligência artificial',
    'astrologia védica',
    'longevidade',
    'monitoramento',
    'wellness premium',
  ],
  applicationName: 'Lyra MetaCare',
  authors: [{ name: 'iLyra AI' }],
  creator: 'iLyra AI',
  publisher: 'iLyra AI',
  category: 'health',
  openGraph: {
    title: 'Lyra MetaCare',
    description:
      'Seu bem-estar orquestrado com inteligência artificial, métricas vitais e sabedoria ancestral.',
    siteName: 'Lyra MetaCare',
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lyra MetaCare',
    description:
      'Bem-estar preventivo premium com IA, biometria e uma experiência clara, serena e sofisticada.',
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
  // Valor inicial da área interna; o `ThemeColorSync` acompanha o tema
  // escolhido, inclusive o padrão escuro da landing e do login.
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
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} ${imprima.variable}`}
    >
      <body className="min-h-screen font-sans antialiased">
        <a href="#conteudo-principal" className="skip-nav">
          Pular para o conteúdo principal
        </a>
        {/* A área interna mantém o padrão claro. O provedor separa a
            preferência pública, com padrão escuro só na landing e login. */}
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <ThemeColorSync />
          <AuthProvider>
            <div className="page-shell">{children}</div>
            {/* As classes dos avisos ficam só em `ui/sonner.tsx` (tarefa 60):
                este `toastOptions` substituía o de lá por inteiro e os tons
                de sucesso, erro, alerta e informação não valiam. */}
            <Toaster
              position="top-right"
              richColors
              expand={false}
              closeButton
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
