'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { Maximize2 } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { BotaoRegistroDoDia } from '@/components/metricas/RegistroDoDia';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRotaLiberada } from '@/hooks/use-rota-liberada';
import type { PainelDoChat } from '@/lib/chat/partes';

const campos = {
  passos: { nome: 'Passos', unidade: 'passos' },
  sono: { nome: 'Sono', unidade: 'minutos' },
  vfc: { nome: 'Variação dos batimentos', unidade: 'ms' },
  prontidao: { nome: 'Disposição calculada', unidade: 'pontos' },
} as const;
type Campo = keyof typeof campos;
const numero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const dataCurta = (data: string) => `${data.slice(8, 10)}/${data.slice(5, 7)}`;

function Conteudo({ painel }: { painel: PainelDoChat }) {
  const [campo, setCampo] = useState<Campo>('passos');
  const seletor = useId();
  const ultimo = painel.dias.at(-1);
  return (
    <Tabs defaultValue="resumo" className="min-w-0">
      <TabsList aria-label="Visões dos seus registros" className="w-full">
        <TabsTrigger value="resumo" className="flex-1">
          Resumo
        </TabsTrigger>
        <TabsTrigger value="evolucao" className="flex-1">
          Evolução
        </TabsTrigger>
        <TabsTrigger value="dados" className="flex-1">
          Dados
        </TabsTrigger>
      </TabsList>
      <TabsContent value="resumo" className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Último dia registrado:{' '}
          {ultimo ? dataCurta(ultimo.data) : 'sem registro'}. Os valores se
          referem a esse dia.
        </p>
        <dl className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
          {(Object.keys(campos) as Campo[]).map((chave) => (
            <div
              key={chave}
              className="min-w-0 rounded-lg border border-border bg-background p-3"
            >
              <dt className="text-xs text-muted-foreground">
                {campos[chave].nome}
              </dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums">
                {ultimo?.[chave] == null ? (
                  <span className="text-sm font-normal text-muted-foreground">
                    Sem registro
                  </span>
                ) : (
                  <>
                    {numero.format(ultimo[chave])}{' '}
                    <span className="text-xs font-normal text-muted-foreground">
                      {campos[chave].unidade}
                    </span>
                  </>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </TabsContent>
      <TabsContent value="evolucao" className="space-y-3">
        <label htmlFor={seletor} className="block text-sm font-medium">
          O que você quer acompanhar?
        </label>
        <select
          id={seletor}
          value={campo}
          onChange={(evento) => setCampo(evento.target.value as Campo)}
          className="min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"
        >
          {(Object.keys(campos) as Campo[]).map((chave) => (
            <option key={chave} value={chave}>
              {campos[chave].nome}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          {campos[campo].nome} em {campos[campo].unidade}. Dias sem registro
          ficam em branco. A aba Dados contém os mesmos valores em texto.
        </p>
        <div
          className="h-52 min-w-0 w-full"
          aria-label={`Gráfico de ${campos[campo].nome}`}
          role="img"
        >
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart
              data={painel.dias}
              margin={{ top: 12, right: 16, bottom: 0, left: 0 }}
              accessibilityLayer={false}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--border)"
              />
              <XAxis
                dataKey="data"
                tickFormatter={dataCurta}
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              />
              <YAxis
                width={48}
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              />
              <Tooltip
                labelFormatter={(valor) => dataCurta(String(valor))}
                formatter={(valor) => [
                  numero.format(Number(valor)),
                  campos[campo].nome,
                ]}
              />
              <Line
                dataKey={campo}
                name={campos[campo].nome}
                type="linear"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </TabsContent>
      <TabsContent value="dados">
        <div
          role="region"
          aria-label="Registros do painel"
          tabIndex={0}
          className="max-w-full overflow-x-auto rounded-lg border border-border focus-visible:outline-2 focus-visible:outline-ring"
        >
          <table className="w-full text-left text-xs">
            <caption className="sr-only">
              Registros que originaram este painel. Sem registro significa que
              não há valor disponível.
            </caption>
            <thead>
              <tr>
                <th scope="col" className="p-2">
                  Data
                </th>
                {(Object.keys(campos) as Campo[]).map((chave) => (
                  <th key={chave} scope="col" className="p-2">
                    {campos[chave].nome} ({campos[chave].unidade})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {painel.dias.map((dia) => (
                <tr key={dia.data} className="border-t border-border">
                  <th scope="row" className="whitespace-nowrap p-2 font-normal">
                    {dia.data.split('-').reverse().join('/')}
                  </th>
                  {(Object.keys(campos) as Campo[]).map((chave) => (
                    <td key={chave} className="p-2 tabular-nums">
                      {dia[chave] == null
                        ? 'Sem registro'
                        : numero.format(dia[chave])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TabsContent>
    </Tabs>
  );
}

/** Os componentes e as ações são definidos pelo app, nunca pelo modelo. */
export function PainelDaConversa({ painel }: { painel: PainelDoChat }) {
  const liberada = useRotaLiberada();
  return (
    <section
      aria-label={painel.titulo}
      className="my-4 min-w-0 max-w-full space-y-4 rounded-xl border border-border bg-card p-3 sm:p-5 [overflow-wrap:anywhere]"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold">
            {painel.titulo}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Retrato dos registros disponíveis nos últimos sete dias.
          </p>
        </div>
        {!painel.indisponivel && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Maximize2 className="size-4" aria-hidden="true" />
                Ampliar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogTitle>{painel.titulo}</DialogTitle>
              <DialogDescription>
                Consulte o resumo, a evolução e os registros que originaram esta
                resposta.
              </DialogDescription>
              <Conteudo painel={painel} />
            </DialogContent>
          </Dialog>
        )}
      </div>
      {painel.indisponivel ? (
        <p className="text-sm text-muted-foreground">
          {painel.indisponivel === 'plano'
            ? 'Seu plano atual não disponibiliza este histórico de métricas.'
            : 'Ainda não há registros nesse período. Quando você registrar seus dados, poderá pedir um novo painel.'}
        </p>
      ) : (
        <Conteudo painel={painel} />
      )}
      <p className="text-xs leading-relaxed text-muted-foreground">
        Fonte: seus registros de métricas. Disposição é um índice calculado pela
        Lyra, não uma medição. Painel gerado em{' '}
        {new Date(painel.geradoEm).toLocaleString('pt-BR', { timeZone: 'UTC' })}{' '}
        (UTC); não se atualiza sozinho.
      </p>
      <div className="flex flex-wrap gap-2">
        <BotaoRegistroDoDia variant="outline" />
        {liberada('/') && (
          <Button asChild variant="outline" size="sm">
            <Link href="/">Ver meus registros</Link>
          </Button>
        )}
        {liberada('/monitoring') && (
          <Button asChild variant="ghost" size="sm">
            <Link href="/monitoring">Ver acompanhamento</Link>
          </Button>
        )}
      </div>
    </section>
  );
}
