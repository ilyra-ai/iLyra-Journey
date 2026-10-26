import { redirect } from 'next/navigation';

/** Compatibilidade com favoritos; configuração única na aba do dashboard. */
export default function PaymentsAdminPage() {
  redirect('/admin/dashboard?aba=pagamentos');
}
