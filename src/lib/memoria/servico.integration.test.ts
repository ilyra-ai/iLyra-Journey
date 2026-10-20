import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { concluirTurno, iniciarTurno } from '@/lib/chat/servico';
import { executeStatement, queryRows } from '@/lib/mysql/pool';
import { criarUsuario, contar } from '../../../tests/integration/fixtures';
import { chamar } from '../../../tests/integration/http';
import * as rota from '@/app/api/memoria/route';
import * as extracao from '@/app/api/internal/memoria/gerar/route';
import {
  configurarMemoria,
  guardarRelato,
  importarHistoricoNaMemoria,
  preferenciasDaMemoria,
  processarFilaDaMemoria,
  recuperarMemorias,
} from './servico';

describe('memória: autorização e fila no MySQL real', () => {
  it('exige sessão e recusa identificador estranho nos parâmetros e correções', async () => {
    expect((await chamar(rota.GET, { usuario: null })).status).toBe(401);
    const pessoa = await criarUsuario();
    expect(
      (
        await chamar(rota.GET, {
          usuario: pessoa,
          path: '/api/memoria?inicio=-1',
        })
      ).status
    ).toBe(400);
    expect(
      (
        await chamar(rota.POST, {
          method: 'POST',
          usuario: pessoa,
          body: { acao: 'relato', texto: 'Um relato.' },
        })
      ).status
    ).toBe(409);
    expect(
      (
        await chamar(rota.POST, {
          method: 'POST',
          usuario: pessoa,
          body: { acao: 'relato', texto: 'Correção.', corrige: 'outro' },
        })
      ).status
    ).toBe(400);
    expect(
      (
        await chamar(extracao.POST, {
          method: 'POST',
          usuario: pessoa,
          body: {},
        })
      ).status
    ).toBe(401);
  });

  it('mantém o padrão desligado e só grava relatos depois do consentimento', async () => {
    const pessoa = await criarUsuario();
    expect(await preferenciasDaMemoria(pessoa.id)).toBeNull();
    const pedido = {
      conversationId: randomUUID(),
      turnId: randomUUID(),
      query: 'Minha gata se chama Aurora.',
    };
    const turno = await iniciarTurno(pessoa.id, pedido);
    await concluirTurno(pessoa.id, turno, 'Relato recebido.');
    expect(
      await contar(
        'SELECT COUNT(*) AS total FROM memory_episodes WHERE user_id = ?',
        [pessoa.id]
      )
    ).toBe(0);
    await configurarMemoria(pessoa.id, true, false);
    await importarHistoricoNaMemoria(pessoa.id);
    await importarHistoricoNaMemoria(pessoa.id);
    expect(
      await contar(
        'SELECT COUNT(*) AS total FROM memory_episodes WHERE user_id = ?',
        [pessoa.id]
      )
    ).toBe(1);
    expect(await preferenciasDaMemoria(pessoa.id)).toMatchObject({
      enabled: 1,
      allow_cloud: 0,
    });
  });

  it('preserva a opção privada ao refazer e não importa mensagens excluídas da memória', async () => {
    const pessoa = await criarUsuario();
    await configurarMemoria(pessoa.id, true, false);
    const pedido = {
      conversationId: randomUUID(),
      turnId: randomUUID(),
      query: 'Esta mensagem é privada.',
    };
    await concluirTurno(
      pessoa.id,
      await iniciarTurno(pessoa.id, pedido),
      'Resposta.',
      true
    );
    await concluirTurno(
      pessoa.id,
      await iniciarTurno(pessoa.id, { ...pedido, regenerate: true }),
      'Outra resposta.'
    );
    await importarHistoricoNaMemoria(pessoa.id);
    expect(
      await contar(
        'SELECT COUNT(*) AS total FROM memory_episodes WHERE user_id = ?',
        [pessoa.id]
      )
    ).toBe(0);
    expect(
      await recuperarMemorias(pessoa.id, 'O que eu disse?', true, false)
    ).toEqual([]);
    expect(
      await recuperarMemorias(pessoa.id, 'O que eu disse?', false, true)
    ).toEqual([]);
  });

  it('isola a fila por titular, pausa o processamento e mantém falhas para nova tentativa', async () => {
    const pessoa = await criarUsuario();
    const outra = await criarUsuario();
    await configurarMemoria(pessoa.id, true, false);
    await guardarRelato(pessoa.id, 'Meu objetivo é caminhar mais.');
    await configurarMemoria(pessoa.id, false, false);
    expect(await preferenciasDaMemoria(outra.id)).toBeNull();
    expect(
      await contar(
        'SELECT COUNT(*) AS total FROM memory_episodes WHERE user_id = ?',
        [outra.id]
      )
    ).toBe(0);
    // Os demais casos deixam relatos na fila: pausamos seus titulares para
    // exercitar somente o trabalho deste teste, sem servidor substituto.
    await executeStatement('UPDATE memory_preferences SET enabled = FALSE');
    expect(await processarFilaDaMemoria()).toEqual({ processado: false });
    await configurarMemoria(pessoa.id, true, false);
    expect(await processarFilaDaMemoria()).toEqual({ processado: false });
    const [linha] = await queryRows<{
      status: string;
      attempts: number;
      lease_id: string | null;
    }>(
      'SELECT status, attempts, lease_id FROM memory_episodes WHERE user_id = ?',
      [pessoa.id]
    );
    expect(linha).toEqual({ status: 'erro', attempts: 1, lease_id: null });
    expect(await processarFilaDaMemoria()).toEqual({ processado: false });
    expect(
      await contar(
        'SELECT SUM(attempts) AS total FROM memory_episodes WHERE user_id = ?',
        [pessoa.id]
      )
    ).toBe(1);
  });
});
