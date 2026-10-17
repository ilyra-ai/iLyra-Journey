import { metadadosDaRota } from '@/lib/metadados/pagina';

export const metadata = metadadosDaRota('/admin/ai-config');

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
