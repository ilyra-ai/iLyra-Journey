'use client';

import { useState } from 'react';
import {
  ChevronRight,
  HeartHandshake,
  Lightbulb,
  ScrollText,
  Sprout,
  Users,
  Waves,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import type {
  LeituraDoVinculo,
  VinculosFamiliares as Vinculos,
} from '@/lib/lyra/vinculos-familiares';
import { cn } from '@/lib/utils';

const TOM = {
  apoio: { rotulo: 'Mais apoio', variante: 'success' },
  atrito: { rotulo: 'Pede atenção', variante: 'warning' },
  equilibrio: { rotulo: 'Em equilíbrio', variante: 'info' },
} as const;

function Secao({
  icone: Icone,
  titulo,
  children,
}: {
  icone: typeof Users;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
        <Icone className="size-4 text-primary" aria-hidden="true" />
        {titulo}
      </h3>
      {children}
    </section>
  );
}

function Lista({ itens, vazio }: { itens: readonly string[]; vazio: string }) {
  return itens.length > 0 ? (
    <ul className="list-disc space-y-1.5 pl-5 text-sm leading-6 text-foreground/90">
      {itens.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  ) : (
    <p className="text-sm leading-6 text-muted-foreground">{vazio}</p>
  );
}

/**
 * Vínculos familiares no painel principal (tarefa 208): um card resumido por
 * parente e o detalhe organizado por categoria em um pop-up. Leitura
 * simbólica do mapa védico, sem diagnóstico nem previsão.
 */
export function VinculosFamiliares({
  dados,
  className,
}: {
  dados: Vinculos | null;
  className?: string;
}) {
  const [aberto, setAberto] = useState<LeituraDoVinculo | null>(null);
  if (!dados) return null;

  return (
    <section
      className={cn('space-y-4 p-5 sm:p-6', className)}
      aria-labelledby="titulo-vinculos"
    >
      <div className="space-y-1">
        <h2
          id="titulo-vinculos"
          className="flex items-center gap-2 font-display text-2xl font-semibold text-foreground"
        >
          <Users className="size-6 text-primary" aria-hidden="true" />
          Vínculos familiares no seu mapa
        </h2>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          Possíveis pontos de atrito e de apoio com a família, lidos de forma
          simbólica no mapa védico. Servem para reflexão, não descrevem as
          pessoas reais.
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {dados.vinculos.map((vinculo) => (
          <li
            key={vinculo.id}
            className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-background p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-lg font-semibold text-foreground">
                {vinculo.nome}
              </h3>
              <Badge variant={TOM[vinculo.tom].variante}>
                {TOM[vinculo.tom].rotulo}
              </Badge>
            </div>
            <p className="line-clamp-4 text-sm leading-6 text-foreground/90">
              {vinculo.resumo}
            </p>
            <button
              type="button"
              className="mt-auto inline-flex items-center gap-1.5 self-start text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80 focus-visible:rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setAberto(vinculo)}
            >
              Abrir para saber mais
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>

      <p className="text-xs leading-5 text-muted-foreground">
        {dados.limite} Primos e tios paternos não têm regra fixa na tradição e
        não aparecem aqui.
      </p>

      <Dialog
        open={aberto !== null}
        onOpenChange={(valor) => {
          if (!valor) setAberto(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          {aberto ? (
            <div className="space-y-5">
              <div className="space-y-2 pr-6">
                <Badge variant={TOM[aberto.tom].variante}>
                  {TOM[aberto.tom].rotulo}
                </Badge>
                <DialogTitle className="font-display text-2xl">
                  {aberto.nome}
                </DialogTitle>
                <DialogDescription className="leading-6">
                  {aberto.resumo}
                </DialogDescription>
              </div>
              <Secao
                icone={HeartHandshake}
                titulo="O que este vínculo representa"
              >
                <p className="text-sm leading-6 text-foreground/90">
                  Na tradição védica, este vínculo fala de {aberto.tema}.
                </p>
              </Secao>
              <Secao icone={Waves} titulo="Possíveis pontos de atrito">
                <Lista
                  itens={aberto.atritos}
                  vazio="O mapa não mostra sinais tradicionais de atrito neste vínculo."
                />
              </Secao>
              <Secao icone={Sprout} titulo="O que fortalece o vínculo">
                <Lista
                  itens={aberto.apoios}
                  vazio="O mapa não mostra sinais tradicionais de apoio destacados neste vínculo."
                />
              </Secao>
              <Secao icone={Lightbulb} titulo="Para refletir">
                <Lista itens={aberto.reflexoes} vazio="" />
              </Secao>
              <Secao icone={ScrollText} titulo="De onde vem esta leitura">
                <p className="text-sm leading-6 text-foreground/90">
                  {aberto.origem}
                </p>
                <p className="text-xs leading-5 text-muted-foreground">
                  {dados.limite}
                </p>
              </Secao>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
