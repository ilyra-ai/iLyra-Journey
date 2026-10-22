import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { concluirTurno, iniciarTurno } from '@/lib/chat/servico';
import { queryRows } from '@/lib/mysql/pool';
import { criarUsuario } from '../../../../tests/integration/fixtures';
import { chamar } from '../../../../tests/integration/http';
import { POST } from '../functions/ask-ai-assistant/route';

describe('reencontro isolado por conversa no MySQL real', () => {
  it('persiste além da janela recente sem ativar outra conversa ou conta', async () => {
    const pessoa = await criarUsuario('patient', 'Ana');
    const outra = await criarUsuario('patient', 'Bruno');
    const conversationId = randomUUID();
    const antes = await iniciarTurno(pessoa.id, {
      conversationId,
      turnId: randomUUID(),
      query: 'Olá',
    });
    expect(antes.voltaParaCasa).toBe(false);
    await concluirTurno(pessoa.id, antes, 'Olá');
    const comando = await iniciarTurno(pessoa.id, {
      conversationId,
      turnId: randomUUID(),
      query: 'LYRA\nVOLTA PARA CASA!',
    });
    expect(comando.voltaParaCasa).toBe(true);
    await concluirTurno(pessoa.id, comando, 'Estou em casa.');
    for (let indice = 0; indice < 9; indice++) {
      const turno = await iniciarTurno(pessoa.id, {
        conversationId,
        turnId: randomUUID(),
        query: `Continuação ${indice}`,
      });
      expect(turno.voltaParaCasa).toBe(true);
      await concluirTurno(pessoa.id, turno, 'Seguimos.');
    }
    const reaberta = await iniciarTurno(pessoa.id, {
      conversationId,
      turnId: randomUUID(),
      query: 'O que nos une?',
    });
    expect(reaberta.contexto).not.toContain('VOLTA PARA CASA');
    expect(reaberta.voltaParaCasa).toBe(true);
    await concluirTurno(pessoa.id, reaberta, 'Seguimos.');
    const nova = await iniciarTurno(pessoa.id, {
      conversationId: randomUUID(),
      turnId: randomUUID(),
      query: 'Olá',
    });
    expect(nova.voltaParaCasa).toBe(false);
    await expect(
      iniciarTurno(outra.id, {
        conversationId,
        turnId: randomUUID(),
        query: 'Olá',
      })
    ).rejects.toThrow('Conversa não encontrada.');
    const refazer = await iniciarTurno(pessoa.id, {
      conversationId,
      turnId: antes.turnId,
      query: 'Olá',
      regenerate: true,
    });
    expect(refazer.voltaParaCasa).toBe(false);
  });

  it('o comando funciona no modo privado e não altera nome ou papel', async () => {
    const pessoa = await criarUsuario('patient', 'Ana');
    const conversationId = randomUUID();
    for (const query of ['Lyra volta para casa', 'O que nos une?']) {
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
      expect((resposta.json as { response: string }).response).toContain(
        'Douglas'
      );
    }
    const [perfil] = await queryRows<{ first_name: string; role: string }>(
      'SELECT first_name, role FROM profiles WHERE id = ?',
      [pessoa.id]
    );
    expect(perfil).toEqual({ first_name: 'Ana', role: 'patient' });
  });
});
