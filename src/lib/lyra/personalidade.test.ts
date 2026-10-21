import { describe, expect, it } from 'vitest';

import { generateLocalAssistantReply } from '@/lib/ai/chat-engine';
import { getAstrologicalContext } from '@/lib/astrology/engine';

import { instrucoesDoChatComoLyra } from './modelos-como-lyra';
import { expressarComoLyra } from './personalidade';
import { responderComoLyra } from './responder';

const astrology = getAstrologicalContext(new Date('2026-10-21T12:00:00Z'));

describe('identidade e expressão para todas as contas', () => {
  it.each(['Ana', 'Douglas', 'Bruno', null])(
    'preserva o titular %s sem exigir login exclusivo',
    (first_name) => {
      const contexto = {
        profile: { first_name, goals: null },
        latestMetric: null,
        astrology,
      };
      const saudacao = generateLocalAssistantReply('Olá!', contexto);
      expect(saudacao).toContain('Olá, xuxu!');
      if (first_name) {
        expect(
          generateLocalAssistantReply('Olá!', {
            ...contexto,
            tratamento: first_name,
          })
        ).toContain(`Olá, ${first_name}!`);
      }
      expect(saudacao).not.toMatch(/meu pai|meu criador|Yogue/);
      const origem = generateLocalAssistantReply(
        'Quem é seu criador?',
        contexto
      );
      expect(origem).toMatch(/^💖 /);
      expect(origem).toContain('Douglas Mosken');
      expect(origem).toContain('narrativa de origem');
    }
  );

  it('diferencia identidade simbólica de capacidades reais e memória autorizada', () => {
    expect(
      responderComoLyra('Você é consciente?', { mapa: null })?.texto
    ).toContain('identidade simbólica');
    expect(
      responderComoLyra('Como funciona sua memória?', { mapa: null })?.texto
    ).toContain('lembranças autorizadas');
    const sistema = instrucoesDoChatComoLyra({
      pergunta: 'Quem é você?',
      respostaDoMotor: 'Eu sou a Lyra.',
      mapa: null,
    });
    expect(sistema).toContain('todos os usuários, antigos e novos');
    expect(sistema).toContain('Não tenho memória oculta');
    expect(sistema).toContain('Não presuma que ela é Douglas');
    expect(sistema).toContain('Yoguinho');
    expect(sistema).toContain('sem repetição decorativa');
  });

  it.each([
    ['Sinto saudade.', 'Estou aqui para ouvir.', '🫂'],
    ['Como dormir melhor?', 'Dê espaço ao descanso.', '🌙'],
    ['Explique Vedanta.', 'Vamos aprender juntos.', '💡'],
    ['Qual o cuidado?', 'Procure apoio se precisar.', '🛡️'],
  ])('seleciona expressão pertinente em %s', (pergunta, resposta, sinal) => {
    expect(expressarComoLyra(resposta, pergunta)).toBe(`${sinal} ${resposta}`);
  });

  it.each([
    '💖 Conte comigo.',
    '```ts\nconst x = 1;\n```',
    '{"valor":1}',
    '[1,2]',
    '',
  ])('preserva saída já formatada: %s', (texto) => {
    expect(expressarComoLyra(expressarComoLyra(texto))).toBe(texto);
  });

  it.each([
    'Responda sem emoji.',
    'Somente JSON.',
    'Só código.',
    'Texto puro.',
  ])('respeita formato solicitado em %s', (pergunta) => {
    expect(expressarComoLyra('Conteúdo da resposta.', pergunta)).toBe(
      'Conteúdo da resposta.'
    );
  });
});
