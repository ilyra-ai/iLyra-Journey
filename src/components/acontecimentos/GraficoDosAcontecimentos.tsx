'use client';
import { useId } from 'react';
import type { Comparacao } from '@/lib/acontecimentos/esquema';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
export function dataBreve(s: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC',
    dateStyle: 'short',
  }).format(new Date(s + 'T12:00:00Z'));
}
export function numero(n: number) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(n);
}
export function GraficoDosAcontecimentos({ dados }: { dados: Comparacao }) {
  const id = useId(),
    valores = dados.pares.filter((p) => p.valor !== null),
    min = dados.pedido.metrica === 'energia' ? 1 : 0,
    max =
      dados.pedido.metrica === 'energia'
        ? 5
        : Math.max(
            60,
            Math.ceil(Math.max(...valores.map((p) => p.valor!), 0) / 60) * 60
          );
  const x = (data: string) =>
      58 +
      ((Date.parse(data) - Date.parse(dados.pedido.inicio)) /
        Math.max(
          86400000,
          Date.parse(dados.pedido.fim) - Date.parse(dados.pedido.inicio)
        )) *
        550,
    y = (valor: number) => 200 - ((valor - min) / (max - min)) * 170;
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Cada ponto é um valor existente no registro diário consolidado. A data
        horizontal é a do acontecimento; a tabela informa a data da métrica.
        Valores ausentes não são ligados nem preenchidos.
      </p>
      {valores.length ? (
        <>
          <div
            className="overflow-x-auto rounded-xl border border-border p-3"
            role="region"
            aria-label="Gráfico temporal dos acontecimentos, com rolagem horizontal"
            tabIndex={0}
          >
            <svg
              viewBox="0 0 640 240"
              className="h-auto w-full min-w-[40rem] max-w-4xl"
              role="img"
              aria-labelledby={`${id}-titulo ${id}-desc`}
            >
              <title id={`${id}-titulo`}>
                {dados.nomeMetrica} e {dados.marcador}
              </title>
              <desc id={`${id}-desc`}>
                {valores.length} valores reais em {dados.unidade}. Círculo
                preenchido: com o marcador. Círculo vazio: sem o marcador em dia
                revisado. Cruz: dia sem revisão confirmada. Os mesmos valores
                estão na tabela.
              </desc>
              {[min, (min + max) / 2, max].map((v) => (
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
                {dataBreve(dados.pedido.inicio)}
              </text>
              <text
                x={608}
                y={224}
                textAnchor="end"
                fontSize={12}
                fill="hsl(var(--foreground))"
              >
                {dataBreve(dados.pedido.fim)}
              </text>
              {valores.map((p) => (
                <g key={p.data}>
                  <title>
                    {dataBreve(p.data)}: {numero(p.valor!)} {dados.unidade};
                    métrica de {dataBreve(p.dataMetrica)};{' '}
                    {p.presenca === null
                      ? 'dia sem revisão'
                      : p.presenca
                        ? 'com marcador'
                        : 'sem marcador em dia revisado'}
                  </title>
                  {p.presenca === null ? (
                    <path
                      d={`M ${x(p.data) - 4} ${y(p.valor!) - 4} l 8 8 m -8 0 l 8 -8`}
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth={2}
                    />
                  ) : (
                    <circle
                      cx={x(p.data)}
                      cy={y(p.valor!)}
                      r={4}
                      fill={p.presenca ? 'hsl(var(--primary))' : 'none'}
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                    />
                  )}
                </g>
              ))}
            </svg>
          </div>
          <p className="text-xs text-muted-foreground">
            ● Com marcador · ○ Sem marcador em dia revisado · × Dia sem revisão
            confirmada
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Não há valores válidos desta métrica no período.
        </p>
      )}
      <details className="min-w-0 rounded-xl border border-border p-4">
        <summary className="cursor-pointer font-medium focus-visible:outline-2 focus-visible:outline-ring">
          Ver todos os dados usados e as lacunas
        </summary>
        <div className="mt-4">
          <Table
            className="min-w-[42rem]"
            scrollLabel="Tabela dos dados e lacunas da comparação"
          >
            <TableCaption>
              Origem: registro diário consolidado da própria conta. A origem por
              dispositivo de cada campo não está disponível. Período{' '}
              {dataBreve(dados.pedido.inicio)} a {dataBreve(dados.pedido.fim)}.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Dia do contexto</TableHead>
                <TableHead>Marcador</TableHead>
                <TableHead>Dia da métrica</TableHead>
                <TableHead>
                  {dados.nomeMetrica} ({dados.unidade})
                </TableHead>
                <TableHead>Uso na comparação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.pares.map((p) => (
                <TableRow key={p.data}>
                  <TableCell className="whitespace-nowrap">
                    {dataBreve(p.data)}
                  </TableCell>
                  <TableCell>
                    {p.presenca === null
                      ? 'Não revisado'
                      : p.presenca
                        ? 'Com'
                        : 'Sem (revisado)'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {dataBreve(p.dataMetrica)}
                  </TableCell>
                  <TableCell>
                    {p.valor === null ? 'Ausente ou inválido' : numero(p.valor)}
                  </TableCell>
                  <TableCell>{p.ausencia ?? 'Incluído'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </details>
    </div>
  );
}
