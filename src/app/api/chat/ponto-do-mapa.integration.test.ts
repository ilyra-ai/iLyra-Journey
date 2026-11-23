import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  criarUsuario,
  definirDireito,
} from '../../../../tests/integration/fixtures';
import { chamar } from '../../../../tests/integration/http';
import { filtrarPaineisDoChat } from '@/lib/chat/painel';
import type { ParteDoChat } from '@/lib/chat/partes';
import { montarPontoDoChat } from '@/lib/chat/ponto-do-mapa';
import { concluirTurno, iniciarTurno, lerConversa } from '@/lib/chat/servico';

import * as assistente from '../functions/ask-ai-assistant/route';

const PONTO: ParteDoChat = {
  tipo: 'ponto-do-mapa',
  versao: 1,
  graha: 'lua',
  nome: 'Lua',
  signo: 'Áries',
  grau: "1°18'",
  nakshatra: 'Ashwini',
  pada: 1,
  casa: null,
  retrogrado: false,
  precisaoDaHora: 'desconhecida',
  leitura: 'Lua em Áries.',
  geradoEm: '2026-11-23T15:00:00.000Z',
};

describe('parte ponto-do-mapa no chat (tarefa 180)', () => {
  it('fica gravada com a resposta e volta ao reabrir a conversa', async () => {
    const pessoa = await criarUsuario();
    const pedido = {
      conversationId: randomUUID(),
      turnId: randomUUID(),
      query: 'O que significa Lua em Áries no meu mapa védico?',
    };
    const turno = await iniciarTurno(pessoa.id, pedido);
    await concluirTurno(pessoa.id, turno, 'Resposta.', false, null, false, [
      PONTO,
    ]);
    const reaberta = await lerConversa(pessoa.id, pedido.conversationId);
    expect(reaberta.turnos[0].partes).toEqual([PONTO]);
  });

  it('some ao reabrir se o plano perdeu os mapas; sem mapa, não é montada', async () => {
    const pessoa = await criarUsuario();
    // Conta de teste sem data e cidade de nascimento: não há mapa.
    expect(await montarPontoDoChat(pessoa.id, 'sol')).toEqual([]);
    const restaurar = await definirDireito('care', 'vedic_insights', {
      enabled: false,
    });
    try {
      expect(await filtrarPaineisDoChat(pessoa.id, [PONTO])).toEqual([]);
      expect(await montarPontoDoChat(pessoa.id, 'sol')).toEqual([]);
    } finally {
      await restaurar();
    }
    expect(await filtrarPaineisDoChat(pessoa.id, [PONTO])).toEqual([PONTO]);
  });

  it('o chat recusa planeta fora do catálogo', async () => {
    const pessoa = await criarUsuario();
    const resposta = await chamar(assistente.POST, {
      usuario: pessoa,
      method: 'POST',
      body: { query: 'Oi', ponto: 'plutao' },
    });
    expect(resposta.status).toBe(400);
  });
});
