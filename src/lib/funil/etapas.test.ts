import { describe, expect, it } from 'vitest';

import {
  diaDoFunil,
  esquemaDaEtapaDoCliente,
  etapaValida,
  pareceRobo,
} from './etapas';
import { intervaloDoPeriodo, taxa } from './painel';

const aceita = (corpo: unknown) =>
  esquemaDaEtapaDoCliente.safeParse(corpo).success;

describe('etapas do funil anônimo (tarefa 170)', () => {
  it('o navegador só informa etapas dele, com detalhe da lista fechada', () => {
    expect(aceita({ etapa: 'visita_landing' })).toBe(true);
    expect(aceita({ etapa: 'iniciou_descoberta', detalhe: 'link' })).toBe(true);
    expect(
      aceita({ etapa: 'contribuicao_escolhida', detalhe: 'colaboracao_999' })
    ).toBe(true);
    expect(aceita({ etapa: 'login_iniciado', detalhe: 'email' })).toBe(true);
  });

  it('recusa etapas do servidor, detalhes livres e campos extras', () => {
    // Só o servidor conta login concluído, cadastro, leitura e pagamento.
    for (const etapa of [
      'login_concluido',
      'cadastro_concluido',
      'leitura_entregue',
      'checkout_iniciado',
      'nascimento_validado',
    ])
      expect(aceita({ etapa, detalhe: 'email' })).toBe(false);
    // Google e Apple o servidor conta ao redirecionar.
    expect(aceita({ etapa: 'login_iniciado', detalhe: 'google' })).toBe(false);
    // Nada de texto livre: data, e-mail ou nome não cabem em detalhe nenhum.
    expect(aceita({ etapa: 'iniciou_descoberta', detalhe: '1990-05-01' })).toBe(
      false
    );
    expect(aceita({ etapa: 'visita_landing', detalhe: 'ana@x.com' })).toBe(
      false
    );
    expect(
      aceita({ etapa: 'visita_landing', dataDeNascimento: '1990-05-01' })
    ).toBe(false);
    expect(aceita({ etapa: 'qualquer_coisa' })).toBe(false);
  });

  it('a validação do servidor aceita as etapas dele', () => {
    expect(etapaValida('login_concluido', 'apple')).toBe(true);
    expect(etapaValida('checkout_iniciado', 'plano')).toBe(true);
    expect(etapaValida('checkout_iniciado', 'colaboracao_1999')).toBe(true);
    expect(etapaValida('leitura_entregue', 'incerto')).toBe(true);
    expect(etapaValida('leitura_entregue', '')).toBe(false);
  });

  it('robôs conhecidos e pedidos sem navegador ficam de fora', () => {
    expect(pareceRobo(null)).toBe(true);
    expect(pareceRobo('Googlebot/2.1')).toBe(true);
    expect(pareceRobo('WhatsApp/2.23.20.0')).toBe(true);
    expect(pareceRobo('curl/8.4.0')).toBe(true);
    expect(
      pareceRobo(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'
      )
    ).toBe(false);
  });

  it('o dia do funil é o de Brasília, e o período fecha no fim do dia', () => {
    // 01:30 UTC de 2 de março ainda é 1º de março em Brasília.
    expect(diaDoFunil(new Date('2026-03-02T01:30:00Z'))).toBe('2026-03-01');
    const p = intervaloDoPeriodo(7, new Date('2026-03-02T01:30:00Z'));
    expect(p).toMatchObject({ de: '2026-02-23', ate: '2026-03-01' });
    expect(p.inicio.toISOString()).toBe('2026-02-23T03:00:00.000Z');
    expect(p.fim.toISOString()).toBe('2026-03-02T03:00:00.000Z');
  });

  it('sem denominador, a taxa é "sem dados", nunca 0% nem infinito', () => {
    expect(taxa('x', 0, 0)).toMatchObject({
      valor: null,
      amostraPequena: false,
    });
    expect(taxa('x', 3, 0).valor).toBeNull();
  });

  it('abaixo da coorte mínima (10), a porcentagem não aparece (tarefa 185)', () => {
    expect(taxa('x', 1, 4)).toMatchObject({
      valor: null,
      amostraPequena: true,
    });
    expect(taxa('x', 1, 9).amostraPequena).toBe(true);
    expect(taxa('x', 5, 20)).toMatchObject({
      valor: 0.25,
      amostraPequena: false,
    });
  });
});
