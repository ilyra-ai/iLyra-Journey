'use client';
import { useId } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { pontosDaEscala, type Escala } from '@/lib/acompanhamentos/esquema';
import { cn } from '@/lib/utils';

/**
 * Pontos da escala como grupo de opções (padrão radiogroup do WAI-ARIA APG):
 * Tab entra no grupo, setas mudam a escolha e cada ponto mostra círculo de
 * seleção, número e rótulo visíveis, sem depender só de cor.
 */
export function EscalaDeResposta({
  escala,
  valor,
  aoEscolher,
  rotuloId,
  desativada,
  previa = false,
}: {
  escala: Escala;
  valor: number | null;
  aoEscolher?: (v: number) => void;
  rotuloId: string;
  desativada?: boolean;
  previa?: boolean;
}) {
  const base = useId(),
    pontos = pontosDaEscala(escala);
  return (
    <RadioGroup
      aria-labelledby={rotuloId}
      value={valor === null ? '' : String(valor)}
      onValueChange={(v) => aoEscolher?.(Number(v))}
      disabled={desativada || previa}
      className={cn(
        'grid gap-2',
        pontos.length > 6
          ? 'grid-cols-[repeat(auto-fill,minmax(3.75rem,1fr))]'
          : 'grid-cols-[repeat(auto-fit,minmax(5.5rem,1fr))]'
      )}
    >
      {pontos.map((v) => {
        const rotulo = escala.rotulos.find((r) => r.valor === v)?.rotulo,
          id = `${base}-${v}`;
        return (
          <label
            key={v}
            htmlFor={id}
            className={cn(
              'flex min-h-20 min-w-0 cursor-pointer flex-col items-center justify-start gap-1.5 rounded-lg border border-border bg-card px-2 py-2.5 text-center transition-colors duration-(--duracao-rapida) hover:border-primary/60 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/8',
              (desativada || previa) && 'cursor-default hover:border-border'
            )}
          >
            {/* O círculo visível confirma a escolha além da cor da borda e
                recebe o anel de foco do próprio controle. */}
            <RadioGroupItem
              id={id}
              value={String(v)}
              aria-label={rotulo ? `${v}, ${rotulo}` : String(v)}
            />
            <span className="text-lg font-semibold tabular-nums text-foreground">
              {v}
            </span>
            <span className="text-xs leading-snug break-words text-muted-foreground [overflow-wrap:anywhere]">
              {rotulo ?? (previa ? 'Sem rótulo' : '')}
            </span>
          </label>
        );
      })}
    </RadioGroup>
  );
}
