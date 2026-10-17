import { metadadosDaRota } from '@/lib/metadados/pagina';

export const metadata = metadadosDaRota('/admin/reports');

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
