import { metadadosDaRota } from '@/lib/metadados/pagina';

export const metadata = metadadosDaRota('/chat');

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
