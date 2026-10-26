import { expect, it } from 'vitest';
import { csvDoRelatorio, type LinhaDoRelatorio } from './contrato';
import { lerPedidoRelatorio } from './servico';
import { campoDoCsv } from '@/lib/csv/gerar-csv';
it('exporta unidades mínimas negativas e ímpares sem arredondamento ou alteração por defesa de fórmulas', () => {
  const linha: LinhaDoRelatorio = {
    secao: 'Saldo',
    indicador: 'Variação',
    periodo: 'atual',
    data: '2024-02-01',
    ambiente: 'test',
    provedor: 'stripe',
    moeda: 'BRL',
    valor: '-18014398509479981',
    unidade: 'unidades mínimas',
    origem: 'billing_balance_records',
    limite: 'Não é lucro',
  };
  const csv = csvDoRelatorio({
    tipo: 'financeiro',
    filtros: { inicio: '2024-02-01', fim: '2024-02-29' },
    anterior: { inicio: '2024-01-03', fim: '2024-01-31' },
    iniciadoEm: '2026-10-26T00:00:00Z',
    geradoEm: '2026-10-26T00:00:01Z',
    linhas: [linha],
  });
  expect(csv).toContain(';-18014398509479981;');
  expect(csv).not.toContain("'-18014398509479981");
  expect(csv).toContain('consulta_inicio;consulta_fim');
  expect(csv).toContain('2024-01-03;2024-01-31;UTC');
  expect(campoDoCsv(BigInt('-18014398509479981'))).toBe('-18014398509479981');
  expect(campoDoCsv('-18014398509479981')).toBe("'-18014398509479981");
});
it('mantém nulo distinto de zero nos arquivos e neutraliza textos que poderiam virar fórmula', () => {
  const l = {
    secao: '=HYPERLINK(x)',
    indicador: 'Quitação',
    periodo: 'atual',
    data: '',
    ambiente: 'legado',
    provedor: 'stripe',
    moeda: 'BRL',
    valor: null,
    unidade: 'unidades mínimas',
    origem: 'fiscal_records',
    limite: 'Sem valor conhecido',
  };
  const base = {
    tipo: 'financeiro',
    filtros: { inicio: '2024-02-01', fim: '2024-02-29' },
    anterior: { inicio: '2024-01-03', fim: '2024-01-31' },
    iniciadoEm: 'x',
    geradoEm: 'y',
  };
  const csv = csvDoRelatorio({ ...base, linhas: [l, { ...l, valor: 0 }] });
  expect(csv).toContain("'=HYPERLINK(x)");
  expect(csv).toContain('BRL;;unidades mínimas');
  expect(csv).toContain('BRL;0;unidades mínimas');
});
it.each([
  'tipo=outro',
  'tipo=uso&agrupamento=ano',
  'tipo=uso&inicio=2024-02-30',
  'tipo=uso&inicio=2024-02-02&fim=2024-02-01',
  'tipo=uso&ambiente=test',
  'tipo=financeiro&plano=free',
  'tipo=financeiro&paginaSaldos=0',
  'tipo=financeiro&paginaSaldos=1.5',
  'tipo=financeiro&pagina=10001',
  'tipo=financeiro&moeda=brl',
])('recusa combinação inválida de relatório: %s', (q) => {
  expect(() => lerPedidoRelatorio(new URLSearchParams(q))).toThrow();
});
it('reutiliza os limites canônicos de cada fonte e paginações independentes', () => {
  expect(
    lerPedidoRelatorio(
      new URLSearchParams(
        'tipo=uso&inicio=2024-02-01&fim=2024-02-29&plano=free&agrupamento=semana&paginaEventos=2'
      )
    )
  ).toMatchObject({
    tipo: 'uso',
    paginaEventos: 2,
    filtros: { plano: 'free', agrupamento: 'semana' },
  });
  expect(
    lerPedidoRelatorio(
      new URLSearchParams(
        'tipo=financeiro&inicio=2020-01-01&fim=2024-12-31&agrupamento=ano&pagina=2&paginaSaldos=3'
      )
    )
  ).toMatchObject({
    tipo: 'financeiro',
    paginaSaldos: 3,
    filtros: { pagina: 2, agrupamento: 'ano' },
  });
});
