import { describe, expect, it } from 'vitest';

import {
  ambienteDaChaveStripe,
  errosDeFormato,
  errosDosPrecosDaStripe,
} from './formatos';

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

  it('na Stripe, recusa chave do outro ambiente', () => {
    expect(ambienteDaChaveStripe('sk_live_51Abc')).toBe('live');
    expect(ambienteDaChaveStripe(' rk_test_51Abc')).toBe('test');
    expect(ambienteDaChaveStripe('whsec_abc')).toBeNull();
    expect(
      errosDeFormato('stripe', { segredo: 'sk_test_51AbCdEfGhIjKlMn' }, 'test')
    ).toEqual([]);
    const erros = errosDeFormato(
      'stripe',
      {
        segredo: 'sk_test_51AbCdEfGhIjKlMn',
        chavePublica: 'pk_test_51AbCdEfGhIjKlMn',
      },
      'live'
    );
    expect(erros).toHaveLength(2);
    expect(erros[0]).toMatch(/é de teste, mas está nas chaves de produção/);
    // Fora da Stripe o prefixo não diz o ambiente: nada a recusar.
    expect(
      errosDeFormato(
        'mercado_pago',
        { segredo: 'TEST-1234567890123456-101800-abcdef' },
        'live'
      )
    ).toEqual([]);
  });

  it('confere os ids de produto e preço e preço repetido', () => {
    expect(
      errosDosPrecosDaStripe([
        { plano: 'meta', produto: 'prod_AbC123', mensal: 'price_Mensal01' },
        { plano: 'care', anual: 'price_Anual01', mensal: '' },
      ])
    ).toEqual([]);
    const erros = errosDosPrecosDaStripe(
      [
        { plano: 'meta', produto: 'price_Errado', mensal: 'prod_Errado1' },
        { plano: 'care', mensal: 'price_Repetido', anual: 'price_Repetido' },
      ],
      (plano) => (plano === 'meta' ? 'Meta' : 'Care')
    );
    expect(erros).toEqual([
      'Meta: o produto da Stripe começa com prod_.',
      'Meta (mensal): o preço da Stripe começa com price_.',
      'Care (anual): o mesmo preço já está em Care (mensal); cada plano, ciclo e valor precisa do seu.',
    ]);
  });

  it('confere o preço de cada valor de colaboração e o repetido entre valores e ciclos', () => {
    expect(
      errosDosPrecosDaStripe([
        {
          plano: 'care',
          opcoes: [
            { opcao: 'colaboracao_999', mensal: 'price_Valor0999' },
            { opcao: 'colaboracao_1999', mensal: '' },
          ],
        },
      ])
    ).toEqual([]);
    const erros = errosDosPrecosDaStripe(
      [
        {
          plano: 'care',
          mensal: 'price_Repetido',
          opcoes: [
            { opcao: 'colaboracao_999', mensal: 'prod_Errado1' },
            { opcao: 'colaboracao_1999', mensal: 'price_Repetido' },
          ],
        },
      ],
      () => 'Lyra Journey',
      (_plano, opcao) =>
        opcao === 'colaboracao_999' ? 'R$ 9,99 por mês' : 'R$ 19,99 por mês'
    );
    expect(erros).toEqual([
      'Lyra Journey (R$ 9,99 por mês): o preço da Stripe começa com price_.',
      'Lyra Journey (R$ 19,99 por mês): o mesmo preço já está em Lyra Journey (mensal); cada plano, ciclo e valor precisa do seu.',
    ]);
  });
});
