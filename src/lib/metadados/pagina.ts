import type { Metadata } from 'next';

import { pageMetaByPath } from '@/components/layout/navigation';

/**
 * Título e descrição da aba do navegador para as páginas do app (tarefa 62).
 *
 * As páginas do app são componentes de cliente e não podem exportar
 * `metadata`; cada segmento ganha um `layout.tsx` de servidor que chama esta
 * função. O nome vem da mesma navegação que monta o menu lateral, então a aba
 * e o menu dizem a mesma coisa. O modelo "%s | iLyra" do layout raiz
 * completa o título.
 */
export function metadadosDaRota(rota: string): Metadata {
  const meta = pageMetaByPath[rota];
  if (!meta) {
    // Falha no build em vez de publicar uma aba com título genérico.
    throw new Error(`Rota sem item na navegação: ${rota}`);
  }
  return { title: meta.title, description: meta.description };
}

/** Páginas fora do menu (entrada, primeiros passos e retorno do pagamento). */
export const METADADOS_FORA_DO_MENU = {
  login: {
    title: 'Entrar',
    description:
      'Entre ou crie a sua conta na iLyra para ver os seus sinais do dia.',
  },
  onboarding: {
    title: 'Primeiros passos',
    description:
      'Configure o seu perfil: dados básicos, objetivos e consentimento.',
  },
  pagamentoConfirmado: {
    title: 'Assinatura confirmada',
    description: 'Retorno do pagamento da assinatura da iLyra.',
  },
  pagamentoCancelado: {
    title: 'Assinatura não concluída',
    description: 'O pagamento da assinatura foi cancelado antes de terminar.',
  },
} satisfies Record<string, Metadata>;
