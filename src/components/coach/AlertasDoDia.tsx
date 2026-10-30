'use client';
import { useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';
import type { Dica } from '@/lib/coach/tipos';
import { DicaComPorque } from './partes';

const CHAVE = 'lyra:dia:alertas-fechados';

/** Identifica o conjunto de alertas do dia: alertas novos reaparecem. */
function assinatura(data: string, alertas: Dica[]) {
  return `${data}:${alertas.map((a) => a.texto).join('|')}`;
}
function lerFechado(valor: string) {
  try {
    return window.localStorage.getItem(CHAVE) === valor;
  } catch {
    return false;
  }
}
function gravarFechado(valor: string | null) {
  try {
    if (valor) window.localStorage.setItem(CHAVE, valor);
    else window.localStorage.removeItem(CHAVE);
  } catch {
    /* Sem armazenamento local, fechar vale só até recarregar. */
  }
}

/**
 * "Atenção hoje" (tarefa 136): alerta discreto e fechável. Fechar só recolhe
 * a apresentação neste aparelho e neste dia; os alertas continuam no
 * briefing e podem ser reabertos. Um conjunto novo de alertas reaparece.
 */
export function AlertasDoDia({
  data,
  alertas,
}: {
  data: string;
  alertas: Dica[];
}) {
  const valor = assinatura(data, alertas);
  const [fechado, setFechado] = useState(() => lerFechado(valor));

  return (
    <section
      aria-labelledby="titulo-alertas"
      className="rounded-2xl border border-warning/30 bg-warning-light/40 px-4 py-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h3
          id="titulo-alertas"
          className="flex items-center gap-2 text-sm font-semibold text-foreground"
        >
          <ShieldAlert className="h-4 w-4 text-warning" aria-hidden="true" />
          Atenção hoje
          <span className="font-normal text-muted-foreground">
            ({alertas.length} {alertas.length === 1 ? 'alerta' : 'alertas'})
          </span>
        </h3>
        {fechado ? (
          <button
            type="button"
            aria-controls="lista-de-alertas"
            aria-expanded={false}
            onClick={() => {
              gravarFechado(null);
              setFechado(false);
            }}
            className="inline-flex min-h-8 items-center rounded-md px-2 text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Mostrar
          </button>
        ) : (
          <button
            type="button"
            aria-label="Fechar os alertas de hoje"
            aria-controls="lista-de-alertas"
            aria-expanded
            onClick={() => {
              gravarFechado(valor);
              setFechado(true);
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
      <ul
        id="lista-de-alertas"
        hidden={fechado}
        className="mt-2 flex flex-col gap-3"
      >
        {alertas.map((dica) => (
          <DicaComPorque key={dica.texto} dica={dica} />
        ))}
      </ul>
    </section>
  );
}
