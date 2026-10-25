import { expect, it } from 'vitest';
import { lerFiltros } from './filtros';
import { janela, padraoDoPeriodo, preencherSerie } from './periodo';
import { percentual, variacao } from './definicoes';
const agora = new Date('2026-10-25T23:59:59Z');
it('usa dias UTC, intervalo inclusivo e comparação com a mesma duração mesmo em mês bissexto', () => {
  expect(padraoDoPeriodo(agora)).toMatchObject({
    inicio: '2026-09-26',
    fim: '2026-10-25',
  });
  expect(janela({ inicio: '2024-02-28', fim: '2024-03-01' })).toEqual({
    inicio: '2024-02-28 00:00:00',
    fim: '2024-03-02 00:00:00',
    inicioAnterior: '2024-02-25 00:00:00',
    anterior: { inicio: '2024-02-25', fim: '2024-02-27' },
  });
});
it.each([
  'inicio=2026-02-30',
  'inicio=2026-2-2',
  'inicio=1999-12-31',
  'fim=2026-10-26',
  'inicio=2026-10-25&fim=2026-10-24',
  'inicio=2024-01-01&fim=2026-01-01',
  'plano=admin%27--',
  'agrupamento=ano',
  'detalhe=segredos',
  'pagina=0',
  'paginaEventos=10001',
  'extra=true',
])('recusa consulta inválida %s', (q) => {
  expect(() => lerFiltros(new URLSearchParams(q), agora)).toThrow();
});
it('aceita o limite de 366 dias e não inventa denominador', () => {
  expect(
    lerFiltros(new URLSearchParams('inicio=2024-01-01&fim=2024-12-31'), agora)
      .inicio
  ).toBe('2024-01-01');
  expect(percentual(0, 0)).toBeNull();
  expect(variacao(10, 0)).toBeNull();
  expect(variacao(0, 10)).toBe(-100);
  expect(percentual(1, 4)).toBe(25);
});
it('preenche somente baldes realmente consultados e conserva DISTINCT calculado no SQL', () => {
  const p = {
    data: '2026-09-28',
    cadastros: 2,
    ativos: 1,
    chat: 4,
    metricas: 3,
  };
  expect(preencherSerie('2026-10-01', '2026-10-07', 'semana', [p])).toEqual([
    p,
    { data: '2026-10-05', cadastros: 0, ativos: 0, chat: 0, metricas: 0 },
  ]);
  expect(
    preencherSerie('2026-09-30', '2026-10-01', 'mes', []).map((p) => p.data)
  ).toEqual(['2026-09-01', '2026-10-01']);
});
