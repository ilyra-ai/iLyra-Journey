import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { GRUPOS_DO_PAINEL } from '@/hooks/use-abas-do-painel';
import type { DailyMetric } from '@/hooks/use-daily-metrics';
import { MetricGrid } from './MetricGrid';

// Ausências também podem vir de integrações antigas sem a coluna nova.
const semRegistros = { date: '2026-10-27', registrado: false } as DailyMetric;
const rotulos = (html: string) =>
  [
    ...html.matchAll(
      /<p class="text-sm font-medium text-muted-foreground">([^<]+)<\/p>/g
    ),
  ].map((item) => item[1]);

describe('cobertura dos registros por assunto do painel', () => {
  it('preserva todos os cartões existentes ao repartir os sete grupos', () => {
    const completo = renderToStaticMarkup(
      createElement(MetricGrid, { metrics: semRegistros })
    );
    const porGrupo = GRUPOS_DO_PAINEL.flatMap((grupo) => {
      const html = renderToStaticMarkup(
        createElement(MetricGrid, { metrics: semRegistros, grupo: grupo.id })
      );
      expect(html).toContain(grupo.titulo);
      for (const outro of GRUPOS_DO_PAINEL)
        if (outro.id !== grupo.id) expect(html).not.toContain(outro.titulo);
      return rotulos(html);
    });
    expect(rotulos(completo)).toHaveLength(43);
    expect(porGrupo.toSorted()).toEqual(rotulos(completo).toSorted());
  });

  it('mantém zero passos como registro e não o confunde com ausência', () => {
    const renderizar = (metrics: DailyMetric) =>
      renderToStaticMarkup(
        createElement(MetricGrid, { metrics, grupo: 'movimento' })
      );
    expect(renderizar(semRegistros)).not.toMatch(/>0<\/p>/);
    const registrado = renderizar({
      ...semRegistros,
      registrado: true,
      steps: 0,
    });
    expect(registrado).toMatch(/>0<\/p>/);
    expect(registrado).not.toContain('NaN');
    expect(registrado).not.toContain('undefined');
  });
});
