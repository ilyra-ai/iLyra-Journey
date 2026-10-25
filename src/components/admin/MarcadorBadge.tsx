'use client';
import { Badge } from '@/components/ui/badge';
import type { CorMarcador } from '@/types/gestao-usuarios';

export const NOMES_CORES: Record<CorMarcador, string> = {
  neutro: 'Neutro',
  azul: 'Azul',
  verde: 'Verde',
  amarelo: 'Amarelo',
  roxo: 'Roxo',
  rosa: 'Rosa',
};
const cores: Record<CorMarcador, string> = {
  neutro: 'border-border bg-muted text-foreground',
  azul: 'border-blue-200 bg-blue-50 text-blue-900',
  verde: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  amarelo: 'border-amber-200 bg-amber-50 text-amber-900',
  roxo: 'border-violet-200 bg-violet-50 text-violet-900',
  rosa: 'border-rose-200 bg-rose-50 text-rose-900',
};
export function MarcadorBadge({
  name,
  color,
}: {
  name: string;
  color: CorMarcador;
}) {
  return (
    <Badge
      variant="outline"
      className={`max-w-full whitespace-normal text-left [overflow-wrap:anywhere] ${cores[color]}`}
    >
      {name}
    </Badge>
  );
}
