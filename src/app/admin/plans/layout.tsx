import { metadadosDaRota } from '@/lib/metadados/pagina';

export const metadata = metadadosDaRota('/admin/plans');

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
