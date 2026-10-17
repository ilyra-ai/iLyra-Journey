import { metadadosDaRota } from '@/lib/metadados/pagina';

export const metadata = metadadosDaRota('/monitoring');

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
