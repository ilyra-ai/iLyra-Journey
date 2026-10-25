import { OnboardingForm } from '@/components/onboarding/onboarding-form';
import { METADADOS_FORA_DO_MENU } from '@/lib/metadados/pagina';

export const metadata = METADADOS_FORA_DO_MENU.onboarding;

export default function OnboardingPage() {
  // Coluna única: o formulário mantém
  // a largura da tela. Antes era uma linha flex centralizada, e no
  // celular o formulário crescia até 672px e estourava para os dois lados
  // (o início dos cartões ficava fora da tela, sem como rolar até ele).
  return (
    <main
      id="conteudo-principal"
      className="page-shell flex min-h-dvh w-full flex-col items-center justify-start gap-6 px-4 py-6 sm:justify-center sm:p-6"
    >
      {/* Título da página para leitores de tela; cada etapa tem o próprio
          título visível. */}
      <h1 className="sr-only">Configuração inicial do seu perfil</h1>

      <OnboardingForm />
    </main>
  );
}
