import { describe, expect, it } from 'vitest';

import { partesDoBanco, partesDoChatSchema } from './partes';

const PONTO = {
  tipo: 'ponto-do-mapa',
  versao: 1,
  graha: 'sol',
  nome: 'Sol',
  signo: 'Gêmeos',
  grau: "29°09'",
  nakshatra: 'Punarvasu',
  pada: 3,
  casa: null,
  retrogrado: false,
  precisaoDaHora: 'desconhecida',
  leitura: 'Sol em Gêmeos: a alma com o tom da curiosidade.',
  geradoEm: '2026-11-23T15:00:00.000Z',
};

describe('catálogo fechado de partes do chat (tarefa 180)', () => {
  it('aceita a parte ponto-do-mapa versão 1', () => {
    expect(partesDoChatSchema.parse([PONTO])).toEqual([PONTO]);
    expect(partesDoBanco(JSON.stringify([PONTO]))).toEqual([PONTO]);
  });

  it('recusa tipo desconhecido, HTML, campos extras e versão futura', () => {
    for (const parte of [
      { tipo: 'html', conteudo: '<script>alert(1)</script>' },
      { ...PONTO, componente: 'Botao', onClick: 'fetch()' },
      { ...PONTO, versao: 2 },
      { ...PONTO, graha: 'plutao' },
      { ...PONTO, casa: 13 },
    ])
      expect(partesDoChatSchema.safeParse([parte]).success).toBe(false);
  });

  it('limita a quantidade de partes por resposta', () => {
    expect(
      partesDoChatSchema.safeParse(Array.from({ length: 5 }, () => PONTO))
        .success
    ).toBe(false);
  });
});
