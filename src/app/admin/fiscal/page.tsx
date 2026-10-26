import { redirect } from 'next/navigation';

/** Compatibilidade com favoritos e links antigos; conteúdo único no dashboard. */
export default function AdminFiscalPage() {
  redirect('/admin/dashboard?aba=fiscal');
}
