import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/mysql/server-auth';
import { metadadosDaRota } from '@/lib/metadados/pagina';

export const metadata = metadadosDaRota('/planos');
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (!session) redirect('/login');
  if (session.user.role === 'admin') redirect('/admin/plans');
  return children;
}
