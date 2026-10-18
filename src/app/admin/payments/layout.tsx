import { metadadosDaRota } from '@/lib/metadados/pagina';

export const metadata = metadadosDaRota('/admin/payments');

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
