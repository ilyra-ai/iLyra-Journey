import { cn } from '@/lib/utils';

import { SimboloILyra, tamanhoEmPx } from './ilyra/SimboloILyra';

/*
  Marca da Lyra: o símbolo iLyra (tarefa 173), anel com a constelação de
  Lyra e a estrela Vega, em SVG embutido com fundo transparente, igual nos
  temas claro e escuro (o dourado vem do tema). Abaixo de 48 px aparece a
  versão simples (anel e Vega), que continua legível.
*/

interface MarcaLyraProps {
  /** Lado da marca em qualquer medida CSS (ex.: `'32px'`, `'3rem'`). */
  tamanho: string;
  /**
   * Texto alternativo. Sem ele a marca é decorativa, o caso comum quando o
   * nome já aparece escrito ao lado.
   */
  rotulo?: string;
  /** Mantido por compatibilidade: o SVG embutido não precisa de carga. */
  prioridade?: boolean;
  className?: string;
}

export function MarcaLyra({ tamanho, rotulo, className }: MarcaLyraProps) {
  const px = tamanhoEmPx(tamanho);
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center',
        className
      )}
      style={{ width: tamanho, height: tamanho }}
    >
      <SimboloILyra
        detalhe={px !== null && px < 48 ? 'simples' : 'completo'}
        titulo={rotulo ?? ''}
      />
    </span>
  );
}
