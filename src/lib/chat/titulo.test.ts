import { describe, expect, it } from 'vitest';

import { limparTitulo, resumoDaResposta, tituloProvisorio } from './titulo';

describe('título das conversas (tarefa 231)', () => {
  it('o contexto da resposta é o primeiro parágrafo, sem lista em negrito', () => {
    const resposta =
      '🌙 Pequenos ajustes ajudam o **sono** na semana.\n\n' +
      '1. **Horários regulares**: durma sempre no mesmo horário.\n' +
      '3. **Rotina de preparação**: Crie uma rotina';
    expect(resumoDaResposta(resposta)).toBe(
      'Pequenos ajustes ajudam o sono na semana.'
    );
    expect(resumoDaResposta('\n\n  Só um parágrafo  ')).toBe('Só um parágrafo');
    expect(resumoDaResposta('a'.repeat(900))).toHaveLength(400);
  });

  it('o provisório é o começo da pergunta numa linha', () => {
    expect(tituloProvisorio('  O que é\n\nMuhurta?  ')).toBe(
      'O que é Muhurta?'
    );
    expect(tituloProvisorio('a'.repeat(300))).toHaveLength(120);
  });

  it('limpa aspas, rótulo, markdown, emoji e ponto final do modelo', () => {
    expect(limparTitulo('"Muhurta e horários propícios."')).toBe(
      'Muhurta e horários propícios'
    );
    expect(limparTitulo('Título: **Ascendente em Gêmeos** 🚀')).toBe(
      'Ascendente em Gêmeos'
    );
    expect(limparTitulo('<think>pensando</think>\nSonhos e intuição')).toBe(
      'Sonhos e intuição'
    );
  });

  it('recusa resposta vazia, longa, em várias linhas ou sem letras', () => {
    expect(limparTitulo('')).toBeNull();
    expect(limparTitulo('Primeira linha\nSegunda linha')).toBeNull();
    expect(limparTitulo('palavra '.repeat(9))).toBeNull();
    expect(limparTitulo('a b c d e f g h i j k')).toBeNull();
    // Preposições contam, mas um título de 9 palavras curtas cabe.
    expect(
      limparTitulo('Hábitos para dormir melhor durante a semana de trabalho')
    ).toBe('Hábitos para dormir melhor durante a semana de trabalho');
    expect(limparTitulo('x'.repeat(61))).toBeNull();
    expect(limparTitulo('2026 - 11')).toBeNull();
  });

  it('recusa título com nome, apelido ou e-mail da pessoa', () => {
    const proibidos = ['Ana', 'ana.teste@exemplo.com', 'ana.teste'];
    expect(limparTitulo('O mapa da Ana', proibidos)).toBeNull();
    expect(limparTitulo('Conversa de ana.teste', proibidos)).toBeNull();
    // Dado curto demais não bloqueia palavras comuns.
    expect(limparTitulo('Lua e emoções', ['Lu'])).toBe('Lua e emoções');
    // Só a palavra inteira: "Ana" não barra "semana" nem "aquariana".
    expect(limparTitulo('Emoções na semana', proibidos)).toBe(
      'Emoções na semana'
    );
    expect(limparTitulo('Influência lunar aquariana', proibidos)).toBe(
      'Influência lunar aquariana'
    );
    expect(limparTitulo('Mapa da ana', proibidos)).toBeNull();
  });
});
