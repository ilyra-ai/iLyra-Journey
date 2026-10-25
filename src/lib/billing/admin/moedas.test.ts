import { expect, it } from 'vitest';
import {
  casasDaMoeda,
  formatarValorFinanceiro,
  valorEmUnidades,
} from './moedas';
import { lerFiltrosFaturamento } from './filtros';
it('formata centavos sem perder precisão de agregados acima de MAX_SAFE_INTEGER', () => {
  expect(formatarValorFinanceiro('90071992547409911', 'BRL')).toContain(
    '900.719.925.474.099,11'
  );
  expect(formatarValorFinanceiro('-1', 'BRL')).toContain('0,01');
  expect(formatarValorFinanceiro('-1', 'BRL')).toContain('-');
  expect(formatarValorFinanceiro(null, 'BRL')).toBe('Não disponível');
});
it('respeita moedas de zero/três casas e representação especial da API', () => {
  expect(casasDaMoeda('JPY')).toBe(0);
  expect(casasDaMoeda('KWD')).toBe(3);
  expect(formatarValorFinanceiro('1234', 'JPY')).toContain('1.234');
  expect(formatarValorFinanceiro('12340', 'KWD')).toContain('12,340');
  expect(formatarValorFinanceiro('12300', 'ISK')).toContain('123');
  expect(formatarValorFinanceiro('12301', 'ISK')).toContain('unidades mínimas');
  expect(valorEmUnidades('123', 'ISK')).toBe(12300);
  expect(valorEmUnidades('123,01', 'ISK')).toBeNull();
});
it.each([
  '1e3',
  '1.000,50',
  '-1',
  '0',
  '1,001',
  'Infinity',
  '9007199254740999999999',
])('não arredonda nem aceita entrada financeira ambígua %s', (v) => {
  expect(valorEmUnidades(v, 'BRL')).toBeNull();
});
it('converte entrada decimal exata sem ponto flutuante e exige passo de três casas', () => {
  expect(valorEmUnidades('79,90', 'BRL')).toBe(7990);
  expect(valorEmUnidades('12,340', 'KWD')).toBe(12340);
  expect(valorEmUnidades('12,341', 'KWD')).toBeNull();
});
it.each([
  'inicio=2024-02-30',
  'inicio=2025-01-02&fim=2025-01-01',
  'inicio=1999-01-01',
  'inicio=2020-01-01&fim=2024-01-01&agrupamento=dia',
  'ambiente=outro',
  'moeda=brl',
  'pagina=0',
  'secreto=true',
])('recusa filtro financeiro inválido %s', (q) => {
  expect(() => lerFiltrosFaturamento(new URLSearchParams(q))).toThrow();
});
it('aceita agrupamento anual real com período explícito de vários anos', () => {
  expect(
    lerFiltrosFaturamento(
      new URLSearchParams('inicio=2020-01-01&fim=2024-12-31&agrupamento=ano')
    ).agrupamento
  ).toBe('ano');
});
