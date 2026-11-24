import { cn } from '@/lib/utils';

import { DESENHO_DO_SIMBOLO as S } from './desenho';

/*
  Símbolo iLyra (tarefa 173): anel com a constelação de Lyra e a estrela Vega
  em destaque. Também é o rosto da Lyra no chat.

  Abaixo de 48 px a constelação vira borrão, então a versão "simples" mostra
  só o anel e Vega, como no favicon. Fundo transparente; cor em
  `--marca-ouro` (padrão: `--primary`, o dourado do tema).
*/

const OURO = 'var(--marca-ouro, hsl(var(--primary, 48 77% 76%)))';

interface SimboloILyraProps {
  detalhe?: 'completo' | 'simples';
  /** Nome acessível; vazio torna o símbolo decorativo. */
  titulo?: string;
  className?: string;
}

export function SimboloILyra({
  detalhe = 'completo',
  titulo = '',
  className,
}: SimboloILyraProps) {
  const acessivel = titulo
    ? { role: 'img' as const, 'aria-label': titulo }
    : { 'aria-hidden': true as const };
  const { completo: c } = S;
  return (
    <svg
      viewBox={S.viewBox.join(' ')}
      className={cn('block h-full w-full', className)}
      style={{ color: OURO }}
      {...acessivel}
    >
      {titulo ? <title>{titulo}</title> : null}
      {detalhe === 'simples' ? (
        <>
          <circle
            cx={50}
            cy={50}
            r={44}
            fill="none"
            stroke="currentColor"
            strokeWidth={8}
          />
          <path d={S.simples.vega} fill="currentColor" />
        </>
      ) : (
        <>
          <circle
            cx={S.anel.cx}
            cy={S.anel.cy}
            r={S.anel.r}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.4}
          />
          <circle
            cx={c.brilho[0]}
            cy={c.brilho[1]}
            r={c.brilho[2]}
            fill="currentColor"
            opacity={0.12}
          />
          <path
            d={c.linhas}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.7}
            strokeWidth={1.3}
          />
          {c.pontos.map(([x, y]) => (
            <circle
              key={`${x}-${y}`}
              cx={x}
              cy={y}
              r={2.2}
              fill="currentColor"
            />
          ))}
          <path d={c.vega} fill="currentColor" />
        </>
      )}
    </svg>
  );
}

/** Converte "22px", "1.75rem" ou "3.5rem" em px; `null` se não souber. */
export function tamanhoEmPx(tamanho: string): number | null {
  const m = /^(\d+(?:\.\d+)?)(px|rem)$/.exec(tamanho.trim());
  if (!m) return null;
  return m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]);
}
