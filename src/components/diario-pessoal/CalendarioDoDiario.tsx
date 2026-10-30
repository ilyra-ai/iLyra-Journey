'use client';
import { useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const SEMANA_EXTENSO = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
];

function utc(data: string) {
  return new Date(`${data}T12:00:00Z`);
}
export function somarMeses(mes: string, n: number) {
  const d = utc(`${mes}-01`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7);
}
export function nomeDoMes(mes: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(utc(`${mes}-01`));
}
export function diaPorExtenso(data: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(utc(data));
}
function somarDiasLocal(data: string, n: number) {
  const d = utc(data);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Mês em grade, como numa agenda: dias com relatos ganham marcação e número
 * de relatos; dias futuros e fora do histórico do plano ficam indisponíveis.
 * Setas movem o foco entre os dias (padrão de grade de datas do APG).
 */
export function CalendarioDoDiario({
  mes,
  hoje,
  corte,
  selecionado,
  dias,
  carregando,
  aoMudarMes,
  aoSelecionar,
}: {
  mes: string;
  hoje: string;
  corte: string | null;
  selecionado: string;
  dias: Map<string, number>;
  carregando: boolean;
  aoMudarMes: (mes: string) => void;
  aoSelecionar: (data: string) => void;
}) {
  const grade = useRef<HTMLDivElement>(null);
  const primeiro = utc(`${mes}-01`),
    inicio = primeiro.getUTCDay(),
    total = new Date(
      Date.UTC(primeiro.getUTCFullYear(), primeiro.getUTCMonth() + 1, 0)
    ).getUTCDate();
  const celulas: Array<string | null> = [
    ...Array.from({ length: inicio }, () => null),
    ...Array.from(
      { length: total },
      (_, i) => `${mes}-${String(i + 1).padStart(2, '0')}`
    ),
  ];
  while (celulas.length % 7) celulas.push(null);
  const semanas = Array.from({ length: celulas.length / 7 }, (_, i) =>
    celulas.slice(i * 7, i * 7 + 7)
  );
  const disponivel = (d: string) => d <= hoje && (!corte || d >= corte);
  const focavel = selecionado.startsWith(mes)
    ? selecionado
    : (celulas.find((d) => d && disponivel(d)) ?? null);

  function mover(e: KeyboardEvent<HTMLButtonElement>, data: string) {
    const passos: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    let alvo: string | null = null;
    if (e.key in passos) alvo = somarDiasLocal(data, passos[e.key]);
    else if (e.key === 'Home')
      alvo = somarDiasLocal(data, -utc(data).getUTCDay());
    else if (e.key === 'End')
      alvo = somarDiasLocal(data, 6 - utc(data).getUTCDay());
    if (!alvo) return;
    e.preventDefault();
    if (!disponivel(alvo)) return;
    if (!alvo.startsWith(mes)) aoMudarMes(alvo.slice(0, 7));
    aoSelecionar(alvo);
    requestAnimationFrame(() =>
      grade.current
        ?.querySelector<HTMLButtonElement>(`[data-dia="${alvo}"]`)
        ?.focus()
    );
  }

  const mesAnteriorPermitido =
    !corte || somarMeses(mes, -1) >= corte.slice(0, 7);
  const proximoPermitido = somarMeses(mes, 1) <= hoje.slice(0, 7);

  return (
    <div className="min-w-0 rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Mês anterior"
          disabled={!mesAnteriorPermitido}
          onClick={() => aoMudarMes(somarMeses(mes, -1))}
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <p
          id="mes-do-diario"
          aria-live="polite"
          className="text-sm font-semibold capitalize text-foreground"
        >
          {nomeDoMes(mes)}
        </p>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Próximo mês"
          disabled={!proximoPermitido}
          onClick={() => aoMudarMes(somarMeses(mes, 1))}
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
      <div
        ref={grade}
        role="grid"
        aria-labelledby="mes-do-diario"
        aria-busy={carregando}
        className="flex flex-col gap-1"
      >
        <div role="row" className="grid grid-cols-7 gap-1">
          {SEMANA.map((d, i) => (
            <span
              key={d}
              role="columnheader"
              aria-label={SEMANA_EXTENSO[i]}
              className="text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              {d}
            </span>
          ))}
        </div>
        {semanas.map((semana, i) => (
          <div key={i} role="row" className="grid grid-cols-7 gap-1">
            {semana.map((data, j) => {
              if (!data)
                return (
                  <span key={`v${j}`} role="gridcell" aria-hidden="true" />
                );
              const n = dias.get(data) ?? 0,
                ativo = data === selecionado,
                livre = disponivel(data);
              return (
                <span key={data} role="gridcell" aria-selected={ativo}>
                  <button
                    type="button"
                    data-dia={data}
                    disabled={!livre}
                    tabIndex={data === focavel ? 0 : -1}
                    aria-current={data === hoje ? 'date' : undefined}
                    aria-label={`${diaPorExtenso(data)}${n ? `, ${n} ${n === 1 ? 'relato' : 'relatos'}` : ', sem relatos'}${data === hoje ? ', hoje' : ''}`}
                    onClick={() => aoSelecionar(data)}
                    onKeyDown={(e) => mover(e, data)}
                    className={cn(
                      'relative flex aspect-square w-full min-h-9 flex-col items-center justify-center rounded-xl text-sm tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:text-muted-foreground/50',
                      ativo
                        ? 'bg-primary font-semibold text-primary-foreground'
                        : livre
                          ? 'hover:bg-muted'
                          : '',
                      data === hoje && !ativo
                        ? 'font-semibold text-primary ring-1 ring-primary/40'
                        : ''
                    )}
                  >
                    {Number(data.slice(8))}
                    {n > 0 ? (
                      <span
                        aria-hidden="true"
                        className={cn(
                          'absolute bottom-1 flex gap-0.5',
                          ativo ? 'text-primary-foreground' : 'text-primary'
                        )}
                      >
                        {Array.from({ length: Math.min(n, 3) }, (_, k) => (
                          <span
                            key={k}
                            className="h-1 w-1 rounded-full bg-current"
                          />
                        ))}
                      </span>
                    ) : null}
                  </button>
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
