import { metadadosDaRota } from '@/lib/metadados/pagina';

export const metadata = metadadosDaRota('/admin/publicacao');

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
