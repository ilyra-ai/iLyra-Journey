'use client';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { PontoTemporal } from '@/lib/admin/analytics/definicoes';
const config = { valor: { label: 'Quantidade', color: 'hsl(var(--primary))' } };
export default function DashboardTrend({
  pontos,
  metrica,
  nome,
}: {
  pontos: PontoTemporal[];
  metrica: 'cadastros' | 'ativos' | 'chat' | 'metricas';
  nome: string;
}) {
  return (
    <ChartContainer
      role="group"
      config={config}
      className="h-64 w-full"
      aria-label={`Evolução de ${nome}. Os mesmos valores estão na tabela de dados.`}
    >
      <LineChart
        accessibilityLayer
        data={pontos.map((p) => ({ ...p, valor: p[metrica] }))}
        margin={{ left: 0, right: 12, top: 12, bottom: 8 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="data"
          tickFormatter={(d) =>
            String(d).slice(5).split('-').reverse().join('/')
          }
          minTickGap={32}
        />
        <YAxis allowDecimals={false} width={40} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(d) => String(d).split('-').reverse().join('/')}
            />
          }
        />
        <Line
          type="linear"
          dataKey="valor"
          name={nome}
          stroke="var(--color-valor)"
          strokeWidth={2}
          dot={pontos.length < 35}
          isAnimationActive={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
