'use client';

/**
 * VedicDashboard — iLyra
 *
 * Painel dos motores integrativos:
 * - Dosha Ayurvédico Dinâmico
 * - Índice de Ritmo pessoal
 * - Dimensões do bem-estar (Vedanta)
 * - Alinhamento de Chakras
 * - Índice de energia (Energia Vital)
 *
 * Cada índice só aparece com sinais suficientes medidos no dia (tarefa 57);
 * sem eles, o card diz o que falta e oferece o registro do dia.
 */

import {
  Atom,
  Brain,
  Flame,
  Layers,
  Leaf,
  Moon,
  Sparkles,
  Sun,
  Wind,
  Zap,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  type ChartConfig,
  ChartContainer,
  ChartFigure,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useVedicInsights } from '@/hooks/use-vedic-insights';
import { resumoDoGrafico } from '@/lib/graficos/resumo';
import { cn } from '@/lib/utils';
import { descreverLeitura, type ChaveDaLeitura } from '@/lib/painel/catalogo';
import {
  CAMADAS_SIMPLES,
  CENTROS_SIMPLES,
  ENERGIA_SIMPLES,
} from '@/lib/painel/leituras-simples';
import { useExplicacoesDoPainel } from './ExplicacoesDoPainel';

import {
  CoberturaDoIndice,
  SemSinaisSuficientes,
} from './SemSinaisSuficientes';

const DOSHA_CONFIG = {
  vata: {
    icon: Wind,
    label: 'Leveza',
    subtitle: 'Ar + Éter',
    textColor: 'text-info',
    bgColor: 'bg-info-light',
  },
  pitta: {
    icon: Flame,
    label: 'Intensidade',
    subtitle: 'Fogo + Água',
    textColor: 'text-warning',
    bgColor: 'bg-warning-light',
  },
  kapha: {
    icon: Leaf,
    label: 'Constância',
    subtitle: 'Terra + Água',
    textColor: 'text-success',
    bgColor: 'bg-success-light',
  },
};

const COHERENCE_BADGE = {
  dissonância: 'destructive',
  transição: 'warning',
  harmonia: 'success',
  'coerência plena': 'default',
} as const;

const PRANA_BADGE = {
  desvitalizado: 'destructive',
  'em recuperação': 'warning',
  vital: 'success',
  radiante: 'default',
} as const;

const ROTULO_DO_COMPONENTE: Record<string, string> = {
  bioResonance: 'Sinais registrados',
  cosmicAlignment: 'Componente simbólico',
  consciousnessDepth: 'Reflexão',
  rhythmicCoherence: 'Regularidade',
};

const CONFIG_DA_TENDENCIA = {
  icq: { label: 'Ritmo pessoal', color: 'hsl(var(--cosmic))' },
  prana: { label: 'Energia', color: 'hsl(var(--success))' },
  kosha: { label: 'Bem-estar', color: 'hsl(var(--chart-3))' },
} satisfies ChartConfig;

function LoadingVedicDashboard() {
  return (
    <div
      className="grid gap-5 xl:grid-cols-2"
      role="status"
      aria-label="Carregando os índices integrativos"
    >
      <Skeleton className="h-72" />
      <Skeleton className="h-72" />
      <Skeleton className="h-80 xl:col-span-2" />
      <Skeleton className="h-64 xl:col-span-2" />
    </div>
  );
}

/** Cabeçalho comum dos cards: selo, título, descrição e ícone. */
function CabecalhoDoIndice({
  selo,
  titulo,
  descricao,
  icone: Icone,
  corDoIcone = 'bg-cosmic-light text-cosmic',
}: {
  selo: ReactNode;
  titulo: ReactNode;
  descricao?: ReactNode;
  icone: typeof Atom;
  corDoIcone?: string;
}) {
  return (
    <CardHeader className="gap-4 p-5 pb-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          {selo}
          <CardTitle>{titulo}</CardTitle>
          {descricao ? <CardDescription>{descricao}</CardDescription> : null}
        </div>
        <div
          aria-hidden="true"
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-full',
            corDoIcone
          )}
        >
          <Icone className="size-5" />
        </div>
      </div>
    </CardHeader>
  );
}

function SobreCem({ valor }: { valor: number }) {
  return (
    <>
      {valor}
      <span className="text-base font-medium text-muted-foreground">/100</span>
    </>
  );
}

interface VedicDashboardProps {
  featureEnabled?: boolean;
}

export function VedicDashboard({ featureEnabled = true }: VedicDashboardProps) {
  const explicacoes = useExplicacoesDoPainel();
  const explicar = (id: ChaveDaLeitura) => descreverLeitura(id, explicacoes);
  const { dosha, coherence, chakras, prana, koshas, history, loading } =
    useVedicInsights(featureEnabled);

  if (loading) return <LoadingVedicDashboard />;

  const doshaConfig = DOSHA_CONFIG[dosha.resultado.dominant];
  const DoshaIcon = doshaConfig.icon;
  const diasComDado = history.filter(
    (dia) => dia.icq !== null || dia.prana !== null || dia.kosha !== null
  ).length;

  return (
    <section
      aria-labelledby="indices-integrativos"
      className="flex flex-col gap-5"
    >
      <div className="flex flex-col gap-2">
        <h2
          id="indices-integrativos"
          className="font-display text-2xl font-semibold tracking-[-0.02em] text-foreground"
        >
          Leituras de autoconhecimento
        </h2>
        <p className="max-w-3xl text-body leading-relaxed text-muted-foreground">
          Leituras simbólicas construídas pelo método do app com os registros
          disponíveis. Os índices apoiam a reflexão pessoal e não medem funções
          do corpo nem estabelecem condições de saúde.
        </p>
      </div>

      <Card className="min-w-0">
        <CardHeader className="p-5 pb-2">
          <CardTitle className="flex items-center gap-2">
            <Sparkles aria-hidden="true" className="size-4 text-cosmic" />
            Tendência dos últimos 7 dias
          </CardTitle>
          <CardDescription>
            Cada índice em cada dia registrado com sinais suficientes; dias sem
            dado ficam em branco.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {diasComDado >= 2 ? (
            <ChartFigure
              resumo={resumoDoGrafico('Tendência dos índices em 7 dias', [
                {
                  nome: 'Ritmo pessoal',
                  valores: history.map((d) => d.icq),
                  unidade: '/100',
                },
                {
                  nome: 'Energia',
                  valores: history.map((d) => d.prana),
                  unidade: '/100',
                },
                {
                  nome: 'Bem-estar',
                  valores: history.map((d) => d.kosha),
                  unidade: '/100',
                },
              ])}
            >
              <ChartContainer
                config={CONFIG_DA_TENDENCIA}
                className="aspect-auto h-64 w-full border-0 bg-transparent p-0"
              >
                <AreaChart
                  data={history}
                  margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tickMargin={10}
                  />
                  <YAxis
                    domain={[0, 100]}
                    ticks={[0, 50, 100]}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent indicator="line" />}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area
                    type="monotone"
                    dataKey="icq"
                    stroke="var(--color-icq)"
                    strokeWidth={2}
                    fill="var(--color-icq)"
                    fillOpacity={0.08}
                    connectNulls={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="prana"
                    stroke="var(--color-prana)"
                    strokeWidth={2}
                    fill="var(--color-prana)"
                    fillOpacity={0.08}
                    connectNulls={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="kosha"
                    stroke="var(--color-kosha)"
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    fillOpacity={0}
                    connectNulls={false}
                  />
                </AreaChart>
              </ChartContainer>
            </ChartFigure>
          ) : (
            <p className="rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">
              A tendência aparece a partir de 2 dias registrados com sinais
              suficientes nos últimos 7 dias (até agora: {diasComDado}).
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Dosha ayurvédico */}
        <Card className="min-w-0">
          <CabecalhoDoIndice
            selo={
              <Badge variant="cosmic" className="self-start">
                Tendência pessoal
              </Badge>
            }
            titulo={`${doshaConfig.label} dominante`}
            descricao={explicar('leitura_tendencia')}
            icone={DoshaIcon}
            corDoIcone={cn(doshaConfig.bgColor, doshaConfig.textColor)}
          />
          <CardContent className="flex flex-col gap-4 px-5 pb-5">
            <p className="text-sm font-medium text-muted-foreground">
              Tema do momento: {doshaConfig.label}
            </p>
            {dosha.base === 'lua' ? (
              <p className="rounded-lg border border-dashed border-border bg-muted/40 p-3 text-sm leading-6 text-muted-foreground">
                Sem sinais suficientes do corpo hoje: esta é uma leitura apenas
                simbólica. Registre seu dia para incluir seus sinais.
              </p>
            ) : (
              <CoberturaDoIndice cobertura={dosha.cobertura} />
            )}
            <ul className="grid gap-3">
              {(['vata', 'pitta', 'kapha'] as const).map((d) => (
                <li key={d} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground">
                      {DOSHA_CONFIG[d].label}
                    </span>
                    <span className="font-display font-semibold tabular-nums text-foreground">
                      {dosha.resultado.percentages[d]}%
                    </span>
                  </div>
                  <Progress
                    aria-label={`${DOSHA_CONFIG[d].label}: ${dosha.resultado.percentages[d]}%`}
                    value={dosha.resultado.percentages[d]}
                    tone="astral"
                    className="h-1.5"
                  />
                </li>
              ))}
            </ul>
            {dosha.resultado.astroInfluence ? (
              <div className="rounded-md border border-border bg-background p-4">
                <p className="flex items-start gap-2 text-sm leading-6 text-foreground/80">
                  <Moon
                    aria-hidden="true"
                    className="mt-1 size-3.5 shrink-0 text-cosmic"
                  />
                  {explicar('leitura_reflexao')}
                </p>
              </div>
            ) : null}
            <div className="rounded-md border border-border p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Sobre sua alimentação
              </p>
              <p className="mt-1.5 text-body leading-relaxed text-foreground/80">
                {explicar('leitura_tendencia')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Coerência quântica */}
        <Card className="min-w-0">
          {coherence.resultado ? (
            <>
              <CabecalhoDoIndice
                selo={
                  <Badge
                    variant={COHERENCE_BADGE[coherence.resultado.level]}
                    className="self-start"
                  >
                    Ritmo pessoal
                  </Badge>
                }
                titulo={
                  <>
                    Ritmo:{' '}
                    <span className="font-display text-4xl font-semibold tracking-[-0.03em]">
                      {coherence.resultado.index}
                    </span>
                    <span className="text-base font-medium text-muted-foreground">
                      /100
                    </span>
                  </>
                }
                descricao={
                  <span className="first-letter:uppercase">
                    {coherence.resultado.level}
                  </span>
                }
                icone={Atom}
              />
              <CardContent className="flex flex-col gap-4 px-5 pb-5">
                <Progress
                  aria-label={`Índice de Ritmo pessoal: ${coherence.resultado.index} de 100`}
                  value={coherence.resultado.index}
                  tone="astral"
                  className="h-1.5"
                />
                <CoberturaDoIndice cobertura={coherence.cobertura} />
                <p className="text-body leading-relaxed text-foreground/80">
                  {explicar('leitura_coerencia')}
                </p>
                <dl className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
                  {Object.entries(coherence.resultado.components).map(
                    ([chave, valor]) => (
                      <div
                        key={chave}
                        className="min-w-0 rounded-md border border-border p-4"
                      >
                        <dt className="text-sm font-medium text-muted-foreground">
                          {ROTULO_DO_COMPONENTE[chave]}
                        </dt>
                        <dd className="mt-1 font-display text-2xl font-semibold tracking-[-0.03em] text-foreground">
                          {valor}
                        </dd>
                      </div>
                    )
                  )}
                </dl>
                <div className="rounded-md bg-cosmic-light p-4">
                  <p className="flex items-start gap-2 text-sm leading-6 text-cosmic-strong">
                    <Sparkles
                      aria-hidden="true"
                      className="mt-1 size-3.5 shrink-0"
                    />
                    {explicar('leitura_reflexao')}
                  </p>
                </div>
              </CardContent>
            </>
          ) : (
            <>
              <CabecalhoDoIndice
                selo={
                  <Badge variant="outline" className="self-start">
                    Ritmo pessoal
                  </Badge>
                }
                titulo="Ritmo: —"
                descricao="Aguardando os sinais de hoje"
                icone={Atom}
              />
              <CardContent className="px-5 pb-5">
                <SemSinaisSuficientes
                  indice="o Índice de Ritmo pessoal"
                  cobertura={coherence.cobertura}
                />
              </CardContent>
            </>
          )}
        </Card>

        {/* Dimensões do bem-estar */}
        <Card className="min-w-0 xl:col-span-2">
          <CabecalhoDoIndice
            selo={
              <Badge
                variant={koshas.resultado ? 'cosmic' : 'outline'}
                className="self-start"
              >
                Visão integrada
              </Badge>
            }
            titulo={
              koshas.resultado ? (
                <>
                  Dimensões do bem-estar:{' '}
                  <SobreCem valor={koshas.resultado.overallScore} />
                </>
              ) : (
                'Dimensões do bem-estar: —'
              )
            }
            descricao={
              koshas.resultado
                ? koshas.resultado.overallStatus
                : 'Aguardando os sinais de hoje'
            }
            icone={Layers}
          />
          <CardContent className="flex flex-col gap-4 px-5 pb-5">
            {koshas.resultado ? (
              <>
                <CoberturaDoIndice cobertura={koshas.cobertura} />
                <div className="rounded-md border border-border bg-background p-4">
                  <p className="text-body leading-relaxed text-foreground/80">
                    {explicar('leitura_camadas')}
                  </p>
                </div>
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {koshas.resultado.koshas.map((k) => (
                    <li
                      key={CAMADAS_SIMPLES[k.name]?.nome ?? k.translation}
                      className="flex min-w-0 flex-col gap-2 rounded-md border border-border p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">
                            {CAMADAS_SIMPLES[k.name]?.nome ?? k.translation}
                          </p>
                        </div>
                        <span className="font-display text-xl font-semibold tabular-nums text-cosmic-strong">
                          {k.score}
                        </span>
                      </div>
                      <Progress
                        aria-label={`${CAMADAS_SIMPLES[k.name]?.nome ?? k.translation}: ${k.score} de 100`}
                        value={k.score}
                        tone="astral"
                        className="h-1.5"
                      />
                      <p className="mt-1 text-xs font-medium text-muted-foreground">
                        {CAMADAS_SIMPLES[k.name]?.nome ?? k.translation}:{' '}
                        <span className="text-foreground">
                          {'Índice simbólico'}
                        </span>
                      </p>
                      <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {CAMADAS_SIMPLES[k.name]?.descricao}
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <SemSinaisSuficientes
                indice="os Dimensões do bem-estar"
                cobertura={koshas.cobertura}
                comBotao={false}
              />
            )}
          </CardContent>
        </Card>

        {/* Chakras */}
        <Card className="min-w-0 xl:col-span-2">
          <CabecalhoDoIndice
            selo={
              <Badge
                variant={chakras.resultado ? 'cosmic' : 'outline'}
                className="self-start"
              >
                Alinhamento energético
              </Badge>
            }
            titulo={
              chakras.resultado ? (
                <>
                  Temas pessoais:{' '}
                  <SobreCem valor={chakras.resultado.overallScore} />
                </>
              ) : (
                'Temas pessoais: —'
              )
            }
            descricao={
              chakras.resultado
                ? chakras.resultado.overallLabel
                : 'Aguardando os sinais de hoje'
            }
            icone={Sun}
          />
          <CardContent className="flex flex-col gap-4 px-5 pb-5">
            {chakras.resultado ? (
              <>
                <CoberturaDoIndice cobertura={chakras.cobertura} />
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                  {chakras.resultado.chakras.map((c) => (
                    <li
                      key={CENTROS_SIMPLES[c.name]?.nome ?? 'Tema pessoal'}
                      className="flex min-w-0 flex-col items-center gap-2 rounded-md border border-border p-4 text-center"
                    >
                      {/* A cor de cada chakra vem do motor (dado), por isso
                          fica só no anel; o número usa a cor de texto do tema
                          para manter contraste ≥ 4,5:1. */}
                      <div
                        className="flex size-10 items-center justify-center rounded-full border-[3px] bg-card font-display text-sm font-semibold tabular-nums text-foreground"
                        style={{ borderColor: c.color }}
                      >
                        {c.score}
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        {CENTROS_SIMPLES[c.name]?.nome ?? 'Tema pessoal'}
                      </p>
                      <p className="text-xs text-muted-foreground first-letter:uppercase">
                        {'Índice simbólico'}
                      </p>
                      <p className="text-xs leading-5 text-muted-foreground">
                        {CENTROS_SIMPLES[c.name]?.descricao}
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <SemSinaisSuficientes
                indice="os temas pessoais"
                cobertura={chakras.cobertura}
                comBotao={false}
              />
            )}
          </CardContent>
        </Card>

        {/* Índice pránico */}
        <Card className="min-w-0 xl:col-span-2">
          <CabecalhoDoIndice
            selo={
              <Badge
                variant={
                  prana.resultado
                    ? PRANA_BADGE[prana.resultado.level]
                    : 'outline'
                }
                className="self-start"
              >
                Energia vital
              </Badge>
            }
            titulo={
              prana.resultado ? (
                <>
                  Índice de energia: <SobreCem valor={prana.resultado.index} />
                </>
              ) : (
                'Índice de energia: —'
              )
            }
            descricao={
              prana.resultado ? (
                <span className="first-letter:uppercase">
                  {prana.resultado.level}
                </span>
              ) : (
                'Aguardando os sinais de hoje'
              )
            }
            icone={Zap}
            corDoIcone="bg-success-light text-success"
          />
          <CardContent className="flex flex-col gap-4 px-5 pb-5">
            {prana.resultado ? (
              <>
                <CoberturaDoIndice cobertura={prana.cobertura} />
                <p className="text-body leading-relaxed text-foreground/80">
                  {explicar('leitura_energia')}
                </p>
                <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {prana.resultado.vayus.map((v) => (
                    <li
                      key={ENERGIA_SIMPLES[v.name]?.nome ?? 'Tema da rotina'}
                      className="flex min-w-0 flex-col gap-2 rounded-md border border-border p-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 text-sm font-semibold text-foreground">
                          {ENERGIA_SIMPLES[v.name]?.nome ?? 'Tema da rotina'}
                        </p>
                        <span className="font-display text-xl font-semibold tabular-nums text-foreground">
                          {v.score}
                        </span>
                      </div>
                      <Progress
                        aria-label={`${ENERGIA_SIMPLES[v.name]?.nome ?? 'Tema da rotina'}: ${v.score} de 100`}
                        value={v.score}
                        tone="astral"
                        className="h-1.5"
                      />
                      <p className="text-xs text-muted-foreground">
                        {ENERGIA_SIMPLES[v.name]?.descricao}
                      </p>
                    </li>
                  ))}
                </ul>
                {prana.resultado.lunarInfluence ? (
                  <div className="rounded-md border border-border bg-background p-4">
                    <p className="flex items-start gap-2 text-sm leading-6 text-foreground/80">
                      <Brain
                        aria-hidden="true"
                        className="mt-1 size-3.5 shrink-0 text-cosmic"
                      />
                      {explicar('leitura_reflexao')}
                    </p>
                  </div>
                ) : null}
              </>
            ) : (
              <SemSinaisSuficientes
                indice="o Índice de energia"
                cobertura={prana.cobertura}
                comBotao={false}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
