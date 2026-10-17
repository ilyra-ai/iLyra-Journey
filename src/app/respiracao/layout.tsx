import { metadadosDaRota } from '@/lib/metadados/pagina';

export const metadata = metadadosDaRota('/respiracao');

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
