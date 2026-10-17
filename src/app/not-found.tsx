import type { Metadata } from 'next';
import Link from 'next/link';

import { MarcaLyra } from '@/components/marca/MarcaLyra';
import { buttonVariants } from '@/components/ui/button';

// Página 404 em português (tarefa 62). Sem ela o Next mostrava a página
// padrão em inglês ("This page could not be found").
export const metadata: Metadata = {
  title: 'Página não encontrada',
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main
      id="conteudo-principal"
      className="flex min-h-dvh items-center justify-center px-4 py-10"
    >
      <div className="flex w-full max-w-xl flex-col items-center gap-5 rounded-xl border border-border bg-card p-6 text-center sm:p-10">
        <div className="flex flex-col items-center gap-2">
          <MarcaLyra tamanho="56px" />
          <p className="text-sm font-medium text-muted-foreground">Erro 404</p>
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Esta página não existe.
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground">
          O endereço pode ter mudado ou ter sido digitado com algum erro. Volte
          ao início para continuar de onde parou.
        </p>
        <Link href="/" className={buttonVariants({ size: 'lg' })}>
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
