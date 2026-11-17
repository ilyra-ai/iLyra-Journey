import Image from 'next/image';

import simboloDaLyra from '@/assets/celestial/simbolo-transparente.png';
import { cn } from '@/lib/utils';

/*
  Marca da Lyra na identidade celestial aprovada: o "L" dourado abraçando o
  coração, com fundo transparente (src/assets/celestial/simbolo-transparente.png,
  gerado de simbolo.png por scripts/gerar-simbolo-transparente.mjs), igual nos
  temas claro e escuro.
*/

interface MarcaLyraProps {
  /** Lado da marca em qualquer medida CSS (ex.: `'32px'`, `'3rem'`). */
  tamanho: string;
  /**
   * Texto alternativo. Sem ele a marca é decorativa (`alt=""`), o caso comum
   * quando o nome "lyra" já aparece escrito ao lado.
   */
  rotulo?: string;
  /** Carrega a imagem com prioridade (marca acima da dobra, ex.: login). */
  prioridade?: boolean;
  className?: string;
}

export function MarcaLyra({
  tamanho,
  rotulo,
  prioridade = false,
  className,
}: MarcaLyraProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center',
        className
      )}
      style={{ width: tamanho, height: tamanho }}
    >
      <Image
        src={simboloDaLyra}
        alt={rotulo ?? ''}
        sizes={tamanho}
        // `priority` está obsoleto no Next 16 e gerava dois avisos no modo
        // dev: "LCP sem loading=eager" e "preload não usado" (o link de
        // preload era emitido mesmo quando a marca trocava de tamanho ou
        // ficava oculta). Carga imediata com alta prioridade, sem preload.
        loading={prioridade ? 'eager' : 'lazy'}
        fetchPriority={prioridade ? 'high' : undefined}
        className="h-full w-full object-contain"
      />
    </span>
  );
}
