import { METADADOS_FORA_DO_MENU } from '@/lib/metadados/pagina';

export const metadata = METADADOS_FORA_DO_MENU.login;

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
