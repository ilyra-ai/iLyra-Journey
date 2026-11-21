import { describe, expect, it } from 'vitest';

import { regiaoDeImagemValida } from './leitura';

describe('região citada na leitura de imagem (tarefa 127)', () => {
  it('aceita a descrição de uma parte do documento', () => {
    expect(regiaoDeImagemValida('Glicose em jejum', '4E40ABB9')).toBe(true);
    expect(
      regiaoDeImagemValida(
        'Tabela de resultados, linha do colesterol',
        '4E40ABB9'
      )
    ).toBe(true);
  });

  it('recusa região sem conteúdo, como a pontuação solta do JSON', () => {
    for (const regiao of [null, '', '   ', '}]}', '}', ':', '12', 'A1']) {
      expect(regiaoDeImagemValida(regiao, '4E40ABB9')).toBe(false);
    }
  });

  it('recusa só o nome do arquivo, que não descreve uma parte dele', () => {
    expect(
      regiaoDeImagemValida('exame-teste.png', '4E40ABB9', 'exame-teste.png')
    ).toBe(false);
    expect(
      regiaoDeImagemValida(
        'Cabeçalho de exame-teste.png',
        '4E40ABB9',
        'exame-teste.png'
      )
    ).toBe(true);
  });

  it('recusa o código da imagem de verificação como fonte', () => {
    expect(regiaoDeImagemValida('4E40ABB9', '4E40ABB9')).toBe(false);
    expect(regiaoDeImagemValida('código 4e40abb9 no topo', '4E40ABB9')).toBe(
      false
    );
  });
});
