'use client';

import Link from 'next/link';
import { Orbit } from 'lucide-react';

import type { PontoDoMapaNoChat } from '@/lib/chat/partes';

/** Perguntas de continuação, escritas pela Lyra e só com o ponto. */
function continuacoes(ponto: PontoDoMapaNoChat) {
  const base = `${ponto.nome} em ${ponto.signo}`;
  const lista = [
    `Como ${base} pode aparecer no meu dia a dia?`,
    `Que pergunta de reflexão combina com ${base}?`,
  ];
  if (ponto.casa)
    lista.push(`O que a casa ${ponto.casa} representa no meu mapa?`);
  return lista;
}

const PRECISAO = {
  informada: null,
  estimada: 'Hora de nascimento estimada: a casa pode mudar.',
  desconhecida: 'Sem hora de nascimento: casa não calculada.',
} as const;

/**
 * Parte interativa "ponto do mapa" (tarefa 180). Os dados vêm do servidor,
 * no catálogo fechado do chat; nada aqui é código ou HTML do modelo. As
 * continuações só enviam texto pelo compositor, como a própria pessoa.
 */
export function PontoDoMapaNaConversa({
  ponto,
  aoPerguntar,
  desabilitado = false,
}: {
  ponto: PontoDoMapaNoChat;
  aoPerguntar: (texto: string) => void;
  desabilitado?: boolean;
}) {
  const aviso = PRECISAO[ponto.precisaoDaHora];
  return (
    <section
      aria-label={`Ponto do mapa: ${ponto.nome} em ${ponto.signo}`}
      className="mt-3 grid gap-3 rounded-lg border border-border bg-background p-3 text-sm text-foreground"
    >
      <div className="flex items-center gap-2 font-medium">
        <Orbit aria-hidden="true" className="size-4" />
        {ponto.nome} em {ponto.signo} {ponto.grau}
        {ponto.retrogrado ? ' · retrógrado' : ''}
      </div>
      <dl className="grid gap-1 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">Nakshatra</dt>
          <dd>
            {ponto.nakshatra}, pada {ponto.pada}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Casa</dt>
          <dd>{ponto.casa ? `Casa ${ponto.casa}` : 'Não calculada'}</dd>
        </div>
      </dl>
      {ponto.leitura ? (
        <p className="leading-relaxed">
          <span className="text-xs text-muted-foreground">
            Leitura do Motor da Lyra:{' '}
          </span>
          {ponto.leitura}
        </p>
      ) : null}
      {aviso ? <p className="text-xs text-muted-foreground">{aviso}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/?ponto=${ponto.graha}`}
          className="inline-flex min-h-11 items-center rounded-md border border-border px-3"
        >
          Ver no mapa
        </Link>
        {continuacoes(ponto).map((texto) => (
          <button
            key={texto}
            type="button"
            disabled={desabilitado}
            onClick={() => aoPerguntar(texto)}
            className="inline-flex min-h-11 items-center rounded-md border border-border px-3 text-left disabled:opacity-60"
          >
            {texto}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Calculado em {new Date(ponto.geradoEm).toLocaleString('pt-BR')}, do seu
        mapa sideral (Lahiri).
      </p>
    </section>
  );
}
