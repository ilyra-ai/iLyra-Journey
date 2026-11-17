import { metadadosDaRota } from '@/lib/metadados/pagina';

export const metadata = metadadosDaRota('/admin/lyra-verbetes');

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
