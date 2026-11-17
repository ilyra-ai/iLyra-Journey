import { metadadosDaRota } from '@/lib/metadados/pagina';

export const metadata = metadadosDaRota('/admin/exames-medicos');

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
