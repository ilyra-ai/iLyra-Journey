import { describe, expect, it } from 'vitest';

import { decimalPtBr, moedaPtBr } from './numero';

// O Intl usa espaço não separável entre o símbolo e o valor.
const semEspacoEspecial = (texto: string) => texto.replace(/ /g, ' ');

describe('decimalPtBr', () => {
  it('usa vírgula decimal e ponto de milhar', () => {
    expect(decimalPtBr(0.52, 2)).toBe('0,52');
    expect(decimalPtBr(12345.678, 1)).toBe('12.345,7');
  });

  it('mantém as casas pedidas, inclusive zeros', () => {
    expect(decimalPtBr(3, 2)).toBe('3,00');
    expect(decimalPtBr(41.96, 0)).toBe('42');
  });
});

describe('moedaPtBr', () => {
  it('formata real e dólar no padrão brasileiro', () => {
    expect(semEspacoEspecial(moedaPtBr(49.9, 'BRL'))).toBe('R$ 49,90');
    expect(semEspacoEspecial(moedaPtBr(1200, 'USD'))).toBe('US$ 1.200,00');
  });

  it('não quebra com um código de moeda inválido', () => {
    expect(moedaPtBr(10, 'XX')).toBe('XX 10,00');
  });
});
