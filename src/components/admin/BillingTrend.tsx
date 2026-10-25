'use client';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  casasDaMoeda,
  formatarValorFinanceiro,
} from '@/lib/billing/admin/moedas';
const config = { valor: { label: 'Valor', color: 'hsl(var(--primary))' } };
export default function BillingTrend({
  pontos,
  moeda,
  nome,
}: {
  pontos: { data: string; valor: string | null }[];
  moeda: string;
  nome: string;
}) {
  if (
    pontos.some(
      (p) =>
        p.valor !== null &&
        (BigInt(p.valor) > BigInt(Number.MAX_SAFE_INTEGER) ||
          BigInt(p.valor) < -BigInt(Number.MAX_SAFE_INTEGER))
    )
  )
    return (
      <p className="rounded-lg bg-muted p-4 text-sm">
        Consulte a tabela para ver os valores exatos deste volume. O gráfico não
        arredondará os registros.
      </p>
    );
  return (
    <ChartContainer
      role="group"
      config={config}
      className="h-64 w-full"
      aria-label={`${nome} em ${moeda}. Valores exatos na tabela.`}
    >
      <LineChart
        accessibilityLayer
        data={pontos.map((p) => ({
          data: p.data,
          valor: p.valor === null ? null : Number(p.valor),
        }))}
        margin={{ top: 12, right: 10, left: 0, bottom: 6 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="data"
          minTickGap={36}
          tickFormatter={(v) => String(v).split('-').reverse().join('/')}
        />
        <YAxis
          width={66}
          tickFormatter={(v) =>
            new Intl.NumberFormat('pt-BR', {
              notation: 'compact',
              maximumFractionDigits: 1,
            }).format(Number(v) / 10 ** casasDaMoeda(moeda))
          }
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(v) =>
                typeof v === 'number'
                  ? formatarValorFinanceiro(v, moeda)
                  : String(v)
              }
            />
          }
        />
        <Line
          dataKey="valor"
          name={nome}
          stroke="var(--color-valor)"
          strokeWidth={2}
          dot={pontos.length < 35}
          isAnimationActive={false}
          connectNulls={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
