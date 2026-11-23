'use client';

import { useId, useState } from 'react';

import {
  anguloDaLongitude,
  casaPorSignoInteiro,
  CENTRO,
  pontoNaRoda,
  raiosSemSobreposicao,
  SIGLA_DO_GRAHA,
} from '@/lib/astrology/astrolabio';
import type { MapaNatalJson } from '@/lib/astrology/serializacao';
import { SIGNOS } from '@/lib/astrology/sideral';
import { cn } from '@/lib/utils';

type Planeta = MapaNatalJson['planetas'][number];

const RAIO_EXTERNO = 192;
const RAIO_DOS_SIGNOS = 160;
const RAIO_DAS_CASAS = 138;

/** Três letras de cada signo para a roda; o nome inteiro fica no texto. */
const SIGLA_DO_SIGNO = SIGNOS.map((s) =>
  s.normalize('NFD').replace(/\p{M}/gu, '').slice(0, 3)
);

function descricao(p: Planeta) {
  return `${p.nome} em ${p.signo} ${p.grau}${p.retrogrado ? ', retrógrado' : ''}${
    p.casa ? `, casa ${p.casa}` : ''
  }`;
}

/**
 * Astrolábio Vivo (tarefa 186): o mapa sideral do próprio titular como uma
 * roda desenhada das longitudes reais do Motor. Clicar num planeta (ou
 * escolhê-lo na lista, pelo teclado ou leitor de tela) abre o cálculo dele:
 * signo, grau, nakshatra, casa e o método, com as limitações da hora de
 * nascimento. Nada aqui é estimado pela interface.
 */
export function Astrolabio({ mapa }: { mapa: MapaNatalJson }) {
  const id = useId();
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const ascendente = mapa.lagna?.longitude ?? 0;
  const indiceDoLagna = mapa.lagna?.indiceDoSigno ?? null;
  const raios = raiosSemSobreposicao(mapa.planetas.map((p) => p.longitude));
  const planeta = mapa.planetas.find((p) => p.graha === selecionado) ?? null;
  const semHora = mapa.precisaoDaHora === 'desconhecida';

  return (
    <section aria-labelledby={`${id}-titulo`} className="grid min-w-0 gap-3">
      <div>
        <h3 id={`${id}-titulo`} className="font-medium">
          Astrolábio do seu céu
        </h3>
        <p className="text-xs text-muted-foreground">
          {mapa.lagna
            ? 'O ascendente (Lagna) fica à esquerda; o zodíaco segue no sentido anti-horário.'
            : 'Sem a hora de nascimento não há ascendente nem casas: a roda começa em Áries, à esquerda.'}{' '}
          Escolha um planeta na roda ou na lista para ver o cálculo.
        </p>
      </div>
      <div className="grid min-w-0 grid-cols-1 items-start gap-4 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <svg
          viewBox="0 0 400 400"
          className="mx-auto w-full max-w-[22rem] select-none"
          aria-hidden="true"
        >
          <circle
            cx={CENTRO}
            cy={CENTRO}
            r={RAIO_EXTERNO}
            className="fill-current stroke-border"
            fillOpacity={0.04}
            strokeWidth={1.5}
          />
          <circle
            cx={CENTRO}
            cy={CENTRO}
            r={RAIO_DOS_SIGNOS - 14}
            className="fill-none stroke-border"
          />
          {SIGNOS.map((nome, i) => {
            const inicio = anguloDaLongitude(i * 30, ascendente);
            const a = pontoNaRoda(RAIO_EXTERNO, inicio);
            const b = pontoNaRoda(RAIO_DOS_SIGNOS - 14, inicio);
            const rotulo = pontoNaRoda(RAIO_DOS_SIGNOS + 15, inicio + 15);
            const casa =
              indiceDoLagna === null
                ? null
                : casaPorSignoInteiro(i, indiceDoLagna);
            const numero = pontoNaRoda(RAIO_DAS_CASAS, inicio + 15);
            return (
              <g key={nome}>
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  className="stroke-border"
                />
                <text
                  x={rotulo.x}
                  y={rotulo.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-current text-[11px]"
                  fillOpacity={0.7}
                >
                  {SIGLA_DO_SIGNO[i]}
                </text>
                {casa ? (
                  <text
                    x={numero.x}
                    y={numero.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className={cn(
                      'text-[10px]',
                      casa === 1 ? 'fill-primary font-semibold' : 'fill-current'
                    )}
                  >
                    {casa}
                  </text>
                ) : null}
              </g>
            );
          })}
          {mapa.lagna ? (
            <line
              x1={CENTRO}
              y1={CENTRO}
              x2={CENTRO - RAIO_EXTERNO}
              y2={CENTRO}
              className="stroke-primary"
              strokeWidth={1.5}
              strokeDasharray={
                mapa.precisaoDaHora === 'estimada' ? '4 4' : undefined
              }
            />
          ) : null}
          {mapa.planetas.map((p, i) => {
            const angulo = anguloDaLongitude(p.longitude, ascendente);
            const marca = pontoNaRoda(RAIO_DOS_SIGNOS - 14, angulo);
            const ponto = pontoNaRoda(raios[i], angulo);
            const ativo = p.graha === selecionado;
            return (
              <g
                key={p.graha}
                className="cursor-pointer"
                onClick={() => setSelecionado(p.graha)}
              >
                <line
                  x1={marca.x}
                  y1={marca.y}
                  x2={ponto.x}
                  y2={ponto.y}
                  className="stroke-current"
                  strokeOpacity={0.35}
                />
                <circle
                  cx={ponto.x}
                  cy={ponto.y}
                  r={13}
                  className={cn(
                    'stroke-primary',
                    ativo ? 'fill-primary' : 'fill-current'
                  )}
                  fillOpacity={ativo ? 1 : 0.1}
                  strokeWidth={ativo ? 2 : 1}
                />
                <text
                  x={ponto.x}
                  y={ponto.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className={cn(
                    'text-[10px] font-semibold',
                    ativo ? 'fill-primary-foreground' : 'fill-current'
                  )}
                >
                  {SIGLA_DO_GRAHA[p.graha] ?? p.nome.slice(0, 3)}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="grid min-w-0 gap-3">
          <ul aria-label="Planetas do mapa" className="flex flex-wrap gap-2">
            {mapa.planetas.map((p) => (
              <li key={p.graha}>
                <button
                  type="button"
                  aria-pressed={p.graha === selecionado}
                  aria-label={descricao(p)}
                  onClick={() => setSelecionado(p.graha)}
                  className="min-h-11 rounded-md border border-border px-3 text-sm aria-pressed:border-primary aria-pressed:bg-primary/10"
                >
                  {p.nome.split(' (')[0]}
                </button>
              </li>
            ))}
          </ul>

          <div
            aria-live="polite"
            className="rounded-lg border border-border p-3 text-sm"
          >
            {planeta ? (
              <dl className="grid gap-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Posição</dt>
                  <dd className="font-medium">
                    {planeta.nome} em {planeta.signo} {planeta.grau}
                    {planeta.retrogrado ? ' · retrógrado' : ''}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Nakshatra</dt>
                  <dd>
                    {planeta.nakshatra}, pada {planeta.pada}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Casa</dt>
                  <dd>
                    {planeta.casa
                      ? `Casa ${planeta.casa}${mapa.precisaoDaHora === 'estimada' ? ' (hora estimada: pode mudar)' : ''}`
                      : 'Não calculada: falta a hora de nascimento'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Método</dt>
                  <dd>
                    Zodíaco sideral com ayanamsha Lahiri; longitude sideral{' '}
                    {planeta.longitude.toLocaleString('pt-BR', {
                      maximumFractionDigits: 2,
                    })}
                    °; casas por signo inteiro a partir do Lagna.
                    {planeta.graha === 'rahu' || planeta.graha === 'ketu'
                      ? ' Nodos lunares médios, sempre retrógrados.'
                      : ''}
                  </dd>
                </div>
                {planeta.graha === 'lua' && semHora && mapa.possibilidades ? (
                  <div>
                    <dt className="text-xs text-muted-foreground">Limitação</dt>
                    <dd>
                      Sem a hora, a Lua aparece na posição do meio-dia. No seu
                      dia de nascimento ela passou por{' '}
                      {mapa.possibilidades.signosDaLua.join(' e ')}.
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <p className="text-muted-foreground">Nenhum planeta escolhido.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
