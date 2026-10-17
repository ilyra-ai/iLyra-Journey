import { metadadosDaRota } from '@/lib/metadados/pagina';

export const metadata = metadadosDaRota('/admin/page-builder');

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
