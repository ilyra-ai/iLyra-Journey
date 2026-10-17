import '@puckeditor/core/puck.css';
import './puck-contraste.css';

import { metadadosDaRota } from '@/lib/metadados/pagina';

export const metadata = metadadosDaRota('/admin/puck');

export default function AdminPuckLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
