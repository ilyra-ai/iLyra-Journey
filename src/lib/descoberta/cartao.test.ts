import { describe, expect, it } from 'vitest';

import { SIGNOS } from '@/lib/astrology/sideral';

import {
  CAMINHO_DA_JORNADA,
  caminhoDaImagem,
  CARTAO_SEM_SIGNO,
  conteudoDoCartao,
  formatoDoCartao,
  identificadorDoSigno,
  identificadorValido,
  nomeDoArquivo,
  signoDoIdentificador,
  textoDoCompartilhamento,
} from './cartao';

describe('cartão compartilhável da descoberta (tarefa 168)', () => {
  it('cada signo tem um identificador ASCII que volta ao mesmo signo', () => {
    const vistos = new Set<string>();
    for (const signo of SIGNOS) {
      const id = identificadorDoSigno(signo);
      expect(id).toMatch(/^[a-z]+$/);
      expect(signoDoIdentificador(id)).toBe(signo);
      expect(identificadorValido(id)).toBe(true);
      vistos.add(id);
    }
    expect(vistos.size).toBe(12);
  });

  it('resultado incerto vira o cartão sem signo, sem nomear signo nenhum', () => {
    expect(identificadorDoSigno(null)).toBe(CARTAO_SEM_SIGNO);
    expect(signoDoIdentificador(CARTAO_SEM_SIGNO)).toBeNull();
    const cartao = conteudoDoCartao(null);
    expect(cartao.signo).toBeNull();
    const texto = [cartao.titulo, cartao.linha, cartao.destaque].join(' ');
    for (const signo of SIGNOS) expect(texto).not.toContain(signo);
  });

  it('recusa identificadores desconhecidos ou com caminho', () => {
    for (const id of ['', 'Leão', '../leao', 'leao.png', 'ophiuchus'])
      expect(identificadorValido(id)).toBe(false);
  });

  it('o cartão mostra o signo real e uma força, sem dado pessoal', () => {
    const leao = conteudoDoCartao('Leão');
    expect(leao).toMatchObject({
      identificador: 'leao',
      titulo: 'Sol em Leão',
      linha: 'Signo de fogo · fixo · regente Sol',
      destaque: 'Generosidade e calor humano.',
      chamada: 'Descubra algo novo sobre você',
    });
  });

  it('texto e link do compartilhamento não levam data, nome nem parâmetro pessoal', () => {
    expect(textoDoCompartilhamento('Peixes')).toBe(
      'Descobri o meu Sol em Peixes ♓ na iLyra. Que tal conhecer a sua história sob outro olhar?'
    );
    expect(textoDoCompartilhamento(null)).not.toMatch(/Sol em/);
    expect(CAMINHO_DA_JORNADA).toBe('/?experimente=1');
  });

  it('formato padrão é retrato; stories só quando pedido', () => {
    expect(formatoDoCartao(null)).toBe('retrato');
    expect(formatoDoCartao('qualquer')).toBe('retrato');
    expect(formatoDoCartao('stories')).toBe('stories');
    expect(caminhoDaImagem('leao', 'retrato')).toBe('/api/public/cartao/leao');
    expect(caminhoDaImagem('leao', 'stories')).toBe(
      '/api/public/cartao/leao?formato=stories'
    );
    expect(nomeDoArquivo('ocidental', 'stories')).toBe(
      'lyra-ocidental-stories.png'
    );
  });
});
