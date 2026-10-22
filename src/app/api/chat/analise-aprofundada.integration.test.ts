import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { lerConversa } from '@/lib/chat/servico';
import { criarUsuario } from '../../../../tests/integration/fixtures';
import { chamar } from '../../../../tests/integration/http';
import { POST } from '../functions/ask-ai-assistant/route';

describe('prefixo ++- por mensagem com MySQL real', () => {
  it('preserva o pedido original, aprofunda o turno e não ativa os seguintes', async () => {
    const pessoa = await criarUsuario('patient', 'Ana');
    const conversationId = randomUUID();
    const mensagens = [
      '++- Como está meu sono?',
      'Como está meu sono?',
      'Como está meu sono? ++-',
    ];
    for (const [indice, query] of mensagens.entries()) {
      const resposta = await chamar(POST, {
        usuario: pessoa,
        method: 'POST',
        body: {
          query,
          conversationId,
          turnId: randomUUID(),
          privacyMode: true,
        },
      });
      expect(resposta.status).toBe(200);
      const texto = (resposta.json as { response: string }).response;
      expect(texto.includes('**Base disponível para esta análise**')).toBe(
        indice === 0
      );
    }
    const gravada = await lerConversa(pessoa.id, conversationId);
    expect(gravada.turnos.map((turno) => turno.pergunta)).toEqual(mensagens);
  });

  it('recusa o prefixo sem pergunta antes de criar uma conversa', async () => {
    const pessoa = await criarUsuario('patient', 'Ana');
    const conversationId = randomUUID();
    const resposta = await chamar(POST, {
      usuario: pessoa,
      method: 'POST',
      body: { query: '++- ', conversationId, turnId: randomUUID() },
    });
    expect(resposta.status).toBe(400);
    await expect(lerConversa(pessoa.id, conversationId)).rejects.toThrow(
      'Conversa não encontrada.'
    );
  });
});
