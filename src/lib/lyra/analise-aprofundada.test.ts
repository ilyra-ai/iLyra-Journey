import { describe, expect, it } from 'vitest';
import { generateLocalAssistantReply } from '@/lib/ai/chat-engine';
import { getAstrologicalContext } from '@/lib/astrology/engine';
import { instrucoesDoChatComoLyra } from './modelos-como-lyra';
import { instrucoesDeAnalise, pedidoDeAnalise } from './analise-aprofundada';

describe('análise pontual ++-', () => {
  it('reconhece somente o início da mensagem e preserva o conteúdo', () => {
    expect(pedidoDeAnalise('++- Como dormir melhor?')).toEqual({
      aprofundar: true,
      pergunta: 'Como dormir melhor?',
    });
    for (const mensagem of ['Olá ++- mundo', '++', ' ++- pergunta', 'Olá']) {
      expect(pedidoDeAnalise(mensagem)).toEqual({
        aprofundar: false,
        pergunta: mensagem,
      });
    }
  });

  it('não mantém o modo em chamadas seguintes', () => {
    expect(instrucoesDeAnalise('++- sono')).toContain(
      'ativo somente nesta mensagem'
    );
    expect(instrucoesDeAnalise('sono')).toContain('desligado nesta mensagem');
    expect(instrucoesDeAnalise('sono')).not.toContain('Explore abordagens');
  });

  it('os modelos recebem instruções explícitas por pedido sem mudar a identidade', () => {
    const base = { respostaDoMotor: 'Base real', mapa: null };
    const ativa = instrucoesDoChatComoLyra({ ...base, pergunta: '++- sono' });
    expect(ativa).toContain('Modo de análise aprofundada ++- ativo');
    expect(ativa).toContain('Não invente fontes');
    expect(ativa).toContain('Forma de tratamento atual');
    expect(
      instrucoesDoChatComoLyra({ ...base, pergunta: 'sono' })
    ).not.toContain('Modo de análise aprofundada ++- ativo');
  });

  it('o motor expõe sua base real e volta à resposta normal sem prefixo', () => {
    const contexto = {
      profile: null,
      latestMetric: null,
      astrology: getAstrologicalContext(new Date('2026-10-22T12:00:00Z')),
    };
    const normal = generateLocalAssistantReply('Como está meu sono?', contexto);
    const analise = generateLocalAssistantReply(
      '++- Como está meu sono?',
      contexto
    );
    expect(analise).toContain(
      normal.replace(/^\p{Extended_Pictographic}\s*/u, '')
    );
    expect(analise).toContain('**Base disponível para esta análise**');
    expect(analise).toContain('Sem registro biométrico recente disponível');
    expect(generateLocalAssistantReply('Como está meu sono?', contexto)).toBe(
      normal
    );
  });
});
