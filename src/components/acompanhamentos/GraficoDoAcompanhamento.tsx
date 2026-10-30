'use client';
import { useEffect, useId, useRef } from 'react';
import {
  dataBreve,
  numero,
} from '@/components/acontecimentos/GraficoDosAcontecimentos';
import type { DetalheDoAcompanhamento } from '@/lib/acompanhamentos/esquema';

/**
 * Evolução das respostas na escala atual. Cada ponto é uma resposta real;
 * períodos sem resposta não são ligados nem preenchidos. Respostas dadas em
 * escalas anteriores não são convertidas para a escala atual: ficam na
 * tabela com o rótulo original.
 */
export function GraficoDoAcompanhamento({
  dados,
}: {
  dados: DetalheDoAcompanhamento;
}) {
  const id = useId(),
    rolagem = useRef<HTMLDivElement>(null),
    escala = dados.acompanhamento.definicao.escala,
    atuais = dados.registros.filter((r) => !r.definicaoAnterior),
    anteriores = dados.registros.length - atuais.length,
    { minimo, maximo } = escala,
    largura = Math.max(
      86400000,
      Date.parse(dados.fim) - Date.parse(dados.inicio)
    ),
    x = (data: string) =>
      58 + ((Date.parse(data) - Date.parse(dados.inicio)) / largura) * 550,
    y = (v: number) => 200 - ((v - minimo) / (maximo - minimo)) * 170,
    marcas = Array.from(
      new Set([minimo, Math.round((minimo + maximo) / 2), maximo])
    ),
    rotulo = (v: number) => escala.rotulos.find((r) => r.valor === v)?.rotulo;
  // Em telas estreitas o gráfico rola na horizontal: abre mostrando o trecho
  // mais recente, onde ficam as últimas respostas.
  useEffect(() => {
    const el = rolagem.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [dados.inicio, dados.fim, atuais.length]);
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {atuais.length ? (
        <div
          ref={rolagem}
          className="overflow-x-auto rounded-xl border border-border p-3"
          role="region"
          aria-label="Gráfico da evolução das respostas, com rolagem horizontal"
          tabIndex={0}
        >
          <svg
            viewBox="0 0 640 240"
            className="h-auto w-full min-w-[36rem] max-w-4xl"
            role="img"
            aria-labelledby={`${id}-titulo ${id}-desc`}
          >
            <title id={`${id}-titulo`}>
              {dados.acompanhamento.nome}: respostas de{' '}
              {dataBreve(dados.inicio)} a {dataBreve(dados.fim)}
            </title>
            <desc id={`${id}-desc`}>
              {atuais.length} respostas na escala de {minimo} a {maximo}.
              Períodos sem resposta não aparecem como pontos. Os mesmos valores
              estão na tabela.
            </desc>
            {marcas.map((v) => (
              <g key={v}>
                <line
                  x1={58}
                  x2={608}
                  y1={y(v)}
                  y2={y(v)}
                  stroke="hsl(var(--border))"
                />
                <text
                  x={48}
                  y={y(v) + 4}
                  textAnchor="end"
                  fontSize={12}
                  fill="hsl(var(--foreground))"
                >
                  {numero(v)}
                </text>
              </g>
            ))}
            <text x={58} y={224} fontSize={12} fill="hsl(var(--foreground))">
              {dataBreve(dados.inicio)}
            </text>
            <text
              x={608}
              y={224}
              textAnchor="end"
              fontSize={12}
              fill="hsl(var(--foreground))"
            >
              {dataBreve(dados.fim)}
            </text>
            {atuais.map((r) => (
              <g key={r.data}>
                <title>
                  {dataBreve(r.data)}: {r.rotulo}
                </title>
                <circle
                  cx={x(r.data)}
                  cy={y(r.valor)}
                  r={5}
                  fill="hsl(var(--primary))"
                  stroke="hsl(var(--card))"
                  strokeWidth={2}
                />
              </g>
            ))}
          </svg>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          Ainda não há respostas na escala atual neste período.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Escala atual: {minimo}
        {rotulo(minimo) ? ` (${rotulo(minimo)})` : ''} a {maximo}
        {rotulo(maximo) ? ` (${rotulo(maximo)})` : ''}.
        {anteriores > 0 &&
          ` ${anteriores} ${anteriores === 1 ? 'resposta usa' : 'respostas usam'} escala anterior e ${anteriores === 1 ? 'aparece' : 'aparecem'} só na tabela, com o rótulo original.`}
      </p>
    </div>
  );
}
