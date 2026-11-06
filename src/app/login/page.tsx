import { LoginExperience } from '@/components/auth/LoginExperience';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ modo?: string | string[] }>;
}) {
  const { modo } = await searchParams;
  return (
    <LoginExperience modoInicial={modo === 'cadastro' ? 'cadastro' : 'login'} />
  );
}
