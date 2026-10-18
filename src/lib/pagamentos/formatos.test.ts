import { describe, expect, it } from 'vitest';

import { errosDeFormato } from './formatos';

describe('formatos das credenciais de pagamento', () => {
  it('aceita os formatos emitidos por cada provedor', () => {
    expect(
      errosDeFormato('stripe', {
        chavePublica: 'pk_test_51AbCdEfGhIjKlMn',
        segredo: 'rk_test_51AbCdEfGhIjKlMn',
        segredoDoWebhook: 'whsec_0123456789abcdef',
      })
    ).toEqual([]);
    expect(
      errosDeFormato('mercado_pago', {
        chavePublica: 'APP_USR-1234abcd-5678',
        segredo: 'TEST-1234567890123456-101800-abcdef',
      })
    ).toEqual([]);
    expect(
      errosDeFormato('paypal', {
        chavePublica: 'AbCdEfGhIjKlMnOpQrStUvWx',
        segredo: 'EFGhIjKlMnOpQrStUvWx-_01',
        segredoDoWebhook: '8PT597110X687430LKGECATA',
      })
    ).toEqual([]);
  });

  it('aponta cada campo fora do formato e ignora os vazios', () => {
    expect(
      errosDeFormato('stripe', { segredo: 'pk_test_trocada', chavePublica: '' })
    ).toHaveLength(1);
    expect(
      errosDeFormato('mercado_pago', {
        segredo: 'abc',
        segredoDoWebhook: 'com espaço',
      })
    ).toHaveLength(2);
    expect(errosDeFormato('paypal', {})).toEqual([]);
  });
});
