'use client';

import { Children, useLayoutEffect, useRef, type ReactNode } from 'react';

/** Encaixa cartões independentes sem esticar seu conteúdo nem reordenar o DOM. */
export function GradeDeCartoesDoPerfil({ children }: { children: ReactNode }) {
  const grade = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const raiz = grade.current;
    if (!raiz) return;
    const itens = Array.from(raiz.children).filter(
      (item): item is HTMLElement => item instanceof HTMLElement
    );
    let quadro: number | null = null;

    const organizar = () => {
      quadro = null;
      // O conteúdo interno tem altura natural, independente da linha alocada.
      // Assim, medir e redimensionar a grade não cria crescimento recursivo.
      for (const item of itens) {
        const conteudo = item.firstElementChild;
        if (!conteudo) continue;
        const intervalo = Number.parseFloat(
          getComputedStyle(item).paddingBottom
        );
        const linhas = String(
          Math.max(
            1,
            Math.ceil(conteudo.getBoundingClientRect().height + intervalo)
          )
        );
        if (item.style.getPropertyValue('--linhas-do-cartao') !== linhas) {
          item.style.setProperty('--linhas-do-cartao', linhas);
        }
      }
      raiz.style.setProperty('--altura-da-linha', '1px');
      raiz.style.setProperty('--intervalo-da-linha', '0px');
    };

    const agendar = () => {
      if (quadro === null) quadro = requestAnimationFrame(organizar);
    };
    const observador = new ResizeObserver(agendar);
    for (const item of itens) {
      if (item.firstElementChild) observador.observe(item.firstElementChild);
    }
    window.addEventListener('resize', agendar);
    organizar();

    return () => {
      observador.disconnect();
      window.removeEventListener('resize', agendar);
      if (quadro !== null) cancelAnimationFrame(quadro);
    };
  }, [children]);

  return (
    <div
      ref={grade}
      className="grid min-w-0 items-start gap-6 xl:auto-rows-[var(--altura-da-linha,auto)] xl:grid-cols-2 xl:gap-y-[var(--intervalo-da-linha,1.5rem)]"
    >
      {Children.map(children, (filho) =>
        filho ? (
          <div className="min-w-0 xl:row-span-[var(--linhas-do-cartao,1)] xl:pb-6">
            <div className="flow-root min-w-0">{filho}</div>
          </div>
        ) : null
      )}
    </div>
  );
}
