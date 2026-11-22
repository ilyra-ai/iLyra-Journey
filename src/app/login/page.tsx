import { LoginExperience } from '@/components/auth/LoginExperience';
import { destinoDeRetorno } from '@/lib/auth/retorno';
import {
  ERROS_DO_LOGIN_SOCIAL,
  type ErroDoLoginSocialCodigo,
} from '@/lib/auth/social/rotas';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    modo?: string | string[];
    destino?: string | string[];
    erro?: string | string[];
  }>;
}) {
  const { modo, destino, erro } = await searchParams;
  // Só códigos conhecidos do login social (tarefa 235).
  const erroSocial = (ERROS_DO_LOGIN_SOCIAL as readonly string[]).includes(
    typeof erro === 'string' ? erro : ''
  )
    ? (erro as ErroDoLoginSocialCodigo)
    : null;
  // Só identificadores da lista fechada (tarefa 159); o resto é ignorado.
  const retorno =
    typeof destino === 'string' && destinoDeRetorno(destino) ? destino : null;
  return (
    <LoginExperience
      modoInicial={
        modo === 'cadastro' || erroSocial === 'termos' ? 'cadastro' : 'login'
      }
      retorno={retorno}
      erroSocial={erroSocial}
    />
  );
}
