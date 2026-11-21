import { LoginExperience } from '@/components/auth/LoginExperience';
import { destinoDeRetorno } from '@/lib/auth/retorno';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    modo?: string | string[];
    destino?: string | string[];
  }>;
}) {
  const { modo, destino } = await searchParams;
  // Só identificadores da lista fechada (tarefa 159); o resto é ignorado.
  const retorno =
    typeof destino === 'string' && destinoDeRetorno(destino) ? destino : null;
  return (
    <LoginExperience
      modoInicial={modo === 'cadastro' ? 'cadastro' : 'login'}
      retorno={retorno}
    />
  );
}
