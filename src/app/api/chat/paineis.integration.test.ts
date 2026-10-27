import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { criarUsuario } from '../../../../tests/integration/fixtures';
import { chamar } from '../../../../tests/integration/http';
import { executeStatement, queryRows } from '@/lib/mysql/pool';
import { concluirTurno, iniciarTurno, lerConversa } from '@/lib/chat/servico';
import { filtrarPaineisDoChat, montarPainelDoChat } from '@/lib/chat/painel';
import { eventosSse } from '@/lib/chat/eventos-sse';
import { exportarDadosDoTitular, excluirConta } from '@/lib/lgpd/conta';
import * as assistente from '../functions/ask-ai-assistant/route';

describe('painéis e transmissão com persistência real', () => {
  it('isola registros, preserva ausências e reabre painéis e texto antigo', async () => {
    const dono = await criarUsuario('admin'),
      outro = await criarUsuario('admin');
    await executeStatement(
      'INSERT INTO daily_metrics (id,user_id,date,steps,sleep_duration_minutes,hrv_ms,readiness_score) VALUES (?,?,UTC_DATE(),?,NULL,?,?)',
      [randomUUID(), dono.id, 7200, 42.5, 68]
    );
    await executeStatement(
      'INSERT INTO daily_metrics (id,user_id,date,steps) VALUES (?,?,UTC_DATE(),?)',
      [randomUUID(), outro.id, 99999]
    );
    const partes = await montarPainelDoChat(dono.id);
    expect(partes[0].dias).toHaveLength(1);
    expect(partes[0].dias[0]).toMatchObject({
      passos: 7200,
      sono: null,
      vfc: 42.5,
      prontidao: 68,
    });
    const pedido = {
      conversationId: randomUUID(),
      turnId: randomUUID(),
      query: 'Meu painel',
    };
    const turno = await iniciarTurno(dono.id, pedido);
    await concluirTurno(
      dono.id,
      turno,
      'Veja seus registros.',
      false,
      null,
      false,
      partes
    );
    const antigo = await iniciarTurno(dono.id, {
      ...pedido,
      turnId: randomUUID(),
      query: 'Texto antigo',
    });
    await concluirTurno(
      dono.id,
      antigo,
      'Resposta textual.',
      false,
      null,
      false
    );
    await executeStatement(
      'UPDATE chat_turns SET response_parts = NULL WHERE id = ?',
      [antigo.turnId]
    );
    const reaberta = await lerConversa(dono.id, pedido.conversationId);
    expect(reaberta.turnos[0].partes).toEqual(partes);
    expect(reaberta.turnos[1].partes).toEqual([]);
    await expect(
      lerConversa(outro.id, pedido.conversationId)
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(JSON.stringify(await exportarDadosDoTitular(dono.id))).toContain(
      'Seus registros recentes'
    );
    await excluirConta(dono.id);
    expect(
      await queryRows('SELECT id FROM chat_turns WHERE user_id = ?', [dono.id])
    ).toEqual([]);
  });
  it('não inventa registros e reaplica a limitação vigente ao ler painéis', async () => {
    const dono = await criarUsuario('admin');
    expect((await montarPainelDoChat(dono.id))[0]).toMatchObject({
      indisponivel: 'sem-dados',
      dias: [],
    });
    await executeStatement(
      'INSERT INTO daily_metrics (id,user_id,date,steps) VALUES (?,?,UTC_DATE(),?)',
      [randomUUID(), dono.id, 18]
    );
    const partes = await montarPainelDoChat(dono.id);
    await executeStatement(
      'UPDATE users SET blocked_at = UTC_TIMESTAMP() WHERE id = ?',
      [dono.id]
    );
    expect(await filtrarPaineisDoChat(dono.id, partes)).toMatchObject([
      { indisponivel: 'plano', dias: [] },
    ]);
  });
  it('oculta escores e histórico quando o administrador altera os recursos do plano', async () => {
    const pessoa = await criarUsuario();
    await executeStatement(
      'INSERT INTO daily_metrics (id,user_id,date,steps,readiness_score) VALUES (?,?,UTC_DATE(),?,?)',
      [randomUUID(), pessoa.id, 32, 71]
    );
    const partes = await montarPainelDoChat(pessoa.id);
    expect(partes[0].dias[0].prontidao).toBe(71);
    const linhas = await queryRows<{
      id: string;
      enabled: number;
      quota_value: number | null;
    }>(
      `SELECT pf.id, pf.enabled, pf.quota_value FROM plan_entitlements pf JOIN subscription_plans p ON p.id = pf.plan_id JOIN plan_features f ON f.id = pf.feature_id WHERE p.plan_key = 'free' AND f.feature_key IN ('ai_scores', 'metrics_history_days')`
    );
    expect(linhas).toHaveLength(2);
    try {
      await executeStatement(
        `UPDATE plan_entitlements pf JOIN subscription_plans p ON p.id = pf.plan_id JOIN plan_features f ON f.id = pf.feature_id SET pf.enabled = FALSE WHERE p.plan_key = 'free' AND f.feature_key = 'ai_scores'`
      );
      expect(
        (await filtrarPaineisDoChat(pessoa.id, partes))[0].dias[0].prontidao
      ).toBeNull();
      await executeStatement(
        `UPDATE plan_entitlements pf JOIN subscription_plans p ON p.id = pf.plan_id JOIN plan_features f ON f.id = pf.feature_id SET pf.enabled = FALSE WHERE p.plan_key = 'free' AND f.feature_key = 'metrics_history_days'`
      );
      expect(await filtrarPaineisDoChat(pessoa.id, partes)).toMatchObject([
        { indisponivel: 'plano', dias: [] },
      ]);
    } finally {
      for (const linha of linhas)
        await executeStatement(
          'UPDATE plan_entitlements SET enabled = ?, quota_value = ? WHERE id = ?',
          [linha.enabled, linha.quota_value, linha.id]
        );
    }
  });

  it('envia resultado SSE real, persiste partes e repete sem consumir nova cota', async () => {
    const pessoa = await criarUsuario();
    const body = {
      query: 'Mostre meus registros',
      painel: true,
      privacyMode: true,
      conversationId: randomUUID(),
      turnId: randomUUID(),
    };
    const primeira = await chamar(assistente.POST, {
      method: 'POST',
      usuario: pessoa,
      headers: { Accept: 'text/event-stream' },
      body,
    });
    expect(primeira.status).toBe(200);
    expect(primeira.headers.get('content-type')).toContain('text/event-stream');
    const eventos: Array<{
      type: string;
      data?: { response?: string; partes?: unknown[] };
    }> = [];
    for await (const dados of eventosSse(new Response(primeira.texto).body!))
      if (dados !== '[DONE]') eventos.push(JSON.parse(dados));
    const resultado = eventos.find(
      (evento) => evento.type === 'data-resultado'
    )?.data;
    expect(resultado?.response).toBeTruthy();
    expect(resultado?.partes).toHaveLength(1);
    expect(
      (await lerConversa(pessoa.id, body.conversationId)).turnos[0].partes
    ).toEqual(resultado?.partes);
    const antes = await queryRows(
      'SELECT used_value FROM feature_usage_counters WHERE user_id = ?',
      [pessoa.id]
    );
    const repetida = await chamar(assistente.POST, {
      method: 'POST',
      usuario: pessoa,
      headers: { Accept: 'text/event-stream' },
      body,
    });
    expect(repetida.json).toMatchObject({
      response: resultado?.response,
      partes: resultado?.partes,
    });
    expect(
      await queryRows(
        'SELECT used_value FROM feature_usage_counters WHERE user_id = ?',
        [pessoa.id]
      )
    ).toEqual(antes);
  });
  it('recusa a falta de sessão antes de abrir transmissão', async () => {
    const resposta = await chamar(assistente.POST, {
      method: 'POST',
      usuario: null,
      headers: { Accept: 'text/event-stream' },
      body: { query: 'Meu painel', painel: true },
    });
    expect(resposta.status).toBe(401);
    expect(resposta.headers.get('content-type')).toContain('application/json');
  });
});
