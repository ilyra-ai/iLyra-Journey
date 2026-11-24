import { cn } from '@/lib/utils';

import { DESENHO_DO_LOGO as D } from './desenho';

/*
  Logo iLyra (tarefa 173, aprovado em 24/11/2026): "iLyra" em Clicker Script
  com o pingo do "i" trocado pela estrela Vega, da constelação de Lyra.

  SVG embutido, com fundo transparente, que segue o tema de quem o usa:
  - "Lyra" usa `--marca-texto` (padrão: a cor do texto, `currentColor`);
  - o "i" e as estrelas usam `--marca-ouro` (padrão: `--primary`, o dourado
    do tema claro ou escuro).
  As curvas vêm de scripts/gerar-marca-ilyra.mjs.
*/

const OURO = 'var(--marca-ouro, hsl(var(--primary, 48 77% 76%)))';
const TEXTO = 'var(--marca-texto, currentColor)';

interface LogoILyraProps {
  /** Mostra o slogan "Decifrando o Cosmos, Iluminando Destinos." */
  slogan?: boolean;
  /** Nome acessível; vazio torna o logo decorativo. */
  titulo?: string;
  className?: string;
}

export function LogoILyra({
  slogan = false,
  titulo = 'iLyra',
  className,
}: LogoILyraProps) {
  const vb = slogan ? D.viewBoxSlogan : D.viewBox;
  const [cx, cy, r] = D.brilho;
  const acessivel = titulo
    ? { role: 'img' as const, 'aria-label': titulo }
    : { 'aria-hidden': true as const };
  return (
    <svg
      viewBox={vb.join(' ')}
      className={cn('block h-full w-auto', className)}
      {...acessivel}
    >
      {titulo ? <title>{titulo}</title> : null}
      {/* Brilho suave de Vega em círculos concêntricos (sem gradiente com id). */}
      <g style={{ fill: OURO }}>
        <circle cx={cx} cy={cy} r={r} opacity={0.07} />
        <circle cx={cx} cy={cy} r={r * 0.72} opacity={0.1} />
        <circle cx={cx} cy={cy} r={r * 0.5} opacity={0.14} />
        <path d={D.vega} />
        <path d={D.estrelinha} opacity={0.8} />
        <path d={D.i} />
        {slogan ? <path d={D.slogan} /> : null}
      </g>
      <path d={D.lyra} style={{ fill: TEXTO }} />
    </svg>
  );
}
