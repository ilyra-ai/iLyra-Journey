import { describe, expect, it } from 'vitest';

import {
  linkDaPerguntaDoPonto,
  perguntaDaBusca,
  perguntaSobreOPonto,
  pontoDaBusca,
} from './ponto-do-mapa';

describe('pergunte ao ponto do mapa (tarefa 187)', () => {
  it('monta a pergunta só com planeta, signo e casa', () => {
    expect(
      perguntaSobreOPonto({ graha: 'sol', signo: 'Gêmeos', casa: 10 })
    ).toBe('O que significa Sol em Gêmeos na casa 10 no meu mapa védico?');
    expect(
      perguntaSobreOPonto({ graha: 'rahu', signo: 'Áries', casa: null })
    ).toBe('O que significa Rahu em Áries no meu mapa védico?');
  });

  it('o link leva só o identificador e a pergunta, sem dado de nascimento', () => {
    const link = linkDaPerguntaDoPonto({
      graha: 'lua',
      signo: 'Peixes',
      casa: 4,
    });
    const url = new URL(link, 'https://app.test');
    expect(url.pathname).toBe('/chat');
    expect([...url.searchParams.keys()]).toEqual(['ponto', 'pergunta']);
    expect(url.searchParams.get('ponto')).toBe('lua');
    expect(url.search).not.toMatch(/\d{4}-\d{2}-\d{2}|nascimento|hora/);
  });

  it('o chat ignora planeta desconhecido e pergunta longa ou vazia', () => {
    expect(pontoDaBusca('sol')).toEqual({ graha: 'sol', nome: 'Sol' });
    expect(pontoDaBusca('plutao')).toBeNull();
    expect(pontoDaBusca('<script>')).toBeNull();
    expect(pontoDaBusca(null)).toBeNull();
    expect(perguntaDaBusca('  Pergunta?  ')).toBe('Pergunta?');
    expect(perguntaDaBusca('')).toBeNull();
    expect(perguntaDaBusca('x'.repeat(301))).toBeNull();
  });
});
