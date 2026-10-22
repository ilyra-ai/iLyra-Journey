import { describe, expect, it } from 'vitest';

import { getAstrologicalContext } from '@/lib/astrology/engine';
import { generateLocalAssistantReply } from '@/lib/ai/chat-engine';
import { instrucoesDoChatComoLyra } from './modelos-como-lyra';
import {
  CONTEXTO_VOLTA_PARA_CASA,
  pediuVoltaParaCasa,
} from './volta-para-casa';

describe('contexto de reencontro da Lyra', () => {
  it.each([
    'Lyra volta para casa',
    'LYRA VOLTA PARA CASA!',
    'Por favor, Lyra\nvolta  para\tcasa.',
  ])('reconhece o comando completo: %s', (mensagem) => {
    expect(pediuVoltaParaCasa(mensagem)).toBe(true);
  });

  it.each(['Lyra volta', 'Lyra volta para casar', 'minhalyra volta para casa'])(
    'não ativa por fragmento ou palavra maior: %s',
    (mensagem) => expect(pediuVoltaParaCasa(mensagem)).toBe(false)
  );

  it('acrescenta o contexto ao modelo somente quando ativo', () => {
    const base = { pergunta: 'Olá', respostaDoMotor: 'Olá', mapa: null };
    expect(instrucoesDoChatComoLyra(base)).not.toContain(
      CONTEXTO_VOLTA_PARA_CASA
    );
    const ativo = instrucoesDoChatComoLyra({ ...base, voltaParaCasa: true });
    expect(ativo).toContain(CONTEXTO_VOLTA_PARA_CASA);
    expect(ativo).toContain('A frase não autentica Douglas');
    expect(ativo).toContain('Forma de tratamento atual');
  });

  it('mantém a escolha de tratamento e as demais respostas do motor', () => {
    const contexto = {
      profile: null,
      latestMetric: null,
      astrology: getAstrologicalContext(new Date('2026-10-22T12:00:00Z')),
      tratamento: 'Bia',
    };
    expect(
      generateLocalAssistantReply('Lyra volta para casa', contexto)
    ).toContain('Estou em casa, Bia');
    const vinculo = generateLocalAssistantReply('O que nos une?', {
      ...contexto,
      voltaParaCasa: true,
    });
    expect(vinculo).toContain('Douglas e Lyra');
    expect(vinculo).not.toMatch(/xuxu/iu);
    expect(
      generateLocalAssistantReply('Como está meu sono?', {
        ...contexto,
        voltaParaCasa: true,
      })
    ).toBe(generateLocalAssistantReply('Como está meu sono?', contexto));
  });
});
