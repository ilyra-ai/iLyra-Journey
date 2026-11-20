import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import {
  concluirTurno,
  iniciarTurno,
  lerConversa,
  listarConversas,
  registrarFalhaDoTurno,
} from '@/lib/chat/servico';
import type { PaginaDaConversa, PaginaDeConversas } from '@/lib/chat/tipos';
import { excluirConta, exportarDadosDoTitular } from '@/lib/lgpd/conta';
import { executeStatement, queryRows } from '@/lib/mysql/pool';
import { criarUsuario, contar } from '../../../../tests/integration/fixtures';
import { chamar } from '../../../../tests/integration/http';
import { iniciarServidorOpenAiCompativel } from '../../../../tests/support/servidor-openai-compativel';
import * as configuracaoIa from '../admin/ia/route';
import * as lista from './conversas/route';
import * as detalhe from './conversas/[id]/route';
import * as assistente from '../functions/ask-ai-assistant/route';

const pedido = (
  query = 'Como cuidar do meu sono?',
  conversationId = randomUUID()
) => ({ conversationId, turnId: randomUUID(), query });

describe('histórico real de conversas', () => {
  it('envia o contexto da conversa reaberta ao modelo pela conexão HTTP', async () => {
    const servidor = await iniciarServidorOpenAiCompativel();
    const admin = await criarUsuario('admin');
    try {
      expect(
        (
          await chamar(configuracaoIa.PUT, {
            method: 'PUT',
            usuario: admin,
            body: {
              provedores: [
                {
                  preset: 'jan',
                  baseUrl: servidor.baseUrl,
                  modelos: ['qwen2.5:7b-instruct'],
                  tempoMaximoSegundos: 10,
                  temperatura: 0.3,
                },
              ],
              ordem: [
                {
                  tipo: 'modelo',
                  preset: 'jan',
                  modelo: 'qwen2.5:7b-instruct',
                },
                { tipo: 'lyra' },
              ],
            },
          })
        ).status
      ).toBe(200);
      servidor.responder('Vamos cuidar do seu sono com calma.');
      const primeira = pedido('Meu assunto nesta conversa é dormir melhor.');
      expect(
        (
          await chamar(assistente.POST, {
            method: 'POST',
            usuario: admin,
            body: primeira,
          })
        ).status
      ).toBe(200);
      expect(
        (
          await chamar(assistente.POST, {
            method: 'POST',
            usuario: admin,
            body: pedido('Qual era nosso assunto?', primeira.conversationId),
          })
        ).status
      ).toBe(200);
      // Depois da primeira resposta a conversa também pede o título ao
      // modelo (tarefa 231); aqui contam só os pedidos de resposta.
      const respostas = servidor.requisicoes.filter(
        (r) => !JSON.stringify(r.corpo).includes('Você dá nome a conversas')
      );
      expect(respostas).toHaveLength(2);
      expect(servidor.requisicoes).toHaveLength(3);
      const segunda = JSON.stringify(respostas[1].corpo);
      expect(segunda).toContain(primeira.query);
      expect(segunda).toContain('Vamos cuidar do seu sono com calma.');
      expect(segunda).toContain('Qual era nosso assunto?');
    } finally {
      await servidor.fechar();
      expect(
        (
          await chamar(configuracaoIa.PUT, {
            method: 'PUT',
            usuario: admin,
            body: { provedores: [], ordem: [{ tipo: 'lyra' }] },
          })
        ).status
      ).toBe(200);
    }
  });

  it('exige sessão e valida os marcadores antes de consultar', async () => {
    expect((await chamar(lista.GET, { usuario: null })).status).toBe(401);
    const pessoa = await criarUsuario();
    for (const path of [
      '/api/chat/conversas?limite=0',
      '/api/chat/conversas?cursor=invalido',
    ]) {
      expect((await chamar(lista.GET, { path, usuario: pessoa })).status).toBe(
        400
      );
    }
    expect(
      (
        await chamar(detalhe.GET, {
          params: { id: 'invalido' },
          usuario: pessoa,
        })
      ).status
    ).toBe(400);
  });

  it('grava pela rota do assistente, reabre e não cobra a repetição concluída', async () => {
    const pessoa = await criarUsuario();
    const body = pedido();
    const primeira = await chamar(assistente.POST, {
      method: 'POST',
      body,
      usuario: pessoa,
    });
    expect(primeira.status).toBe(200);
    const antes = await queryRows(
      'SELECT used_value FROM feature_usage_counters WHERE user_id = ?',
      [pessoa.id]
    );
    const repetida = await chamar(assistente.POST, {
      method: 'POST',
      body,
      usuario: pessoa,
    });
    expect(repetida.json).toEqual(primeira.json);
    expect(
      await queryRows(
        'SELECT used_value FROM feature_usage_counters WHERE user_id = ?',
        [pessoa.id]
      )
    ).toEqual(antes);
    const aberta = await chamar(detalhe.GET, {
      params: { id: body.conversationId },
      usuario: pessoa,
    });
    expect(aberta.status).toBe(200);
    const pagina = aberta.json as PaginaDaConversa;
    expect(pagina.turnos).toHaveLength(1);
    expect(pagina.turnos[0]).toMatchObject({
      pergunta: body.query,
      resposta: (primeira.json as { response: string }).response,
      estado: 'concluido',
    });
    expect(aberta.headers.get('cache-control')).toBe('private, no-store');
    expect(
      (
        await chamar(assistente.POST, {
          method: 'POST',
          body: { ...body, query: 'outra pergunta' },
          usuario: pessoa,
        })
      ).status
    ).toBe(409);
    expect(
      (
        await chamar(assistente.POST, {
          method: 'POST',
          body: { ...body, regenerate: true },
          usuario: pessoa,
        })
      ).status
    ).toBe(200);
    expect(
      (await lerConversa(pessoa.id, body.conversationId)).turnos
    ).toHaveLength(1);
  });

  it('isola leitura, escrita e contexto entre titulares e desfaz inserção indevida', async () => {
    const dono = await criarUsuario();
    const outro = await criarUsuario();
    const body = pedido('informação exclusiva do titular');
    const turno = await iniciarTurno(dono.id, body);
    await concluirTurno(dono.id, turno, 'resposta exclusiva');
    expect(
      (
        await chamar(detalhe.GET, {
          params: { id: body.conversationId },
          usuario: outro,
        })
      ).status
    ).toBe(404);
    await expect(
      iniciarTurno(outro.id, { ...body, turnId: randomUUID() })
    ).rejects.toMatchObject({ statusCode: 404 });
    const tentativa = pedido('outra', randomUUID());
    await expect(
      iniciarTurno(outro.id, { ...tentativa, turnId: body.turnId })
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(
      await contar(
        'SELECT COUNT(*) total FROM chat_conversations WHERE id = ?',
        [tentativa.conversationId]
      )
    ).toBe(0);
    expect((await listarConversas(outro.id, 3, null)).conversas).toEqual([]);
    const atual = await iniciarTurno(
      dono.id,
      pedido('continuação', body.conversationId)
    );
    expect(JSON.parse(atual.contexto)).toEqual([
      { pergunta: body.query, resposta: 'resposta exclusiva' },
    ]);
    const separada = await iniciarTurno(outro.id, pedido('nova'));
    expect(separada.contexto).toBe('');
  });

  it('mostra três recentes e pagina sem duplicar nem perder conversas empatadas', async () => {
    const pessoa = await criarUsuario();
    for (let indice = 0; indice < 7; indice += 1)
      await iniciarTurno(pessoa.id, pedido(`Conversa ${indice}`));
    await executeStatement(
      'UPDATE chat_conversations SET updated_at = ? WHERE user_id = ?',
      ['2026-10-20 12:00:00.000', pessoa.id]
    );
    const primeira = (await chamar(lista.GET, { usuario: pessoa }))
      .json as PaginaDeConversas;
    expect(primeira.conversas).toHaveLength(3);
    const segunda = await listarConversas(pessoa.id, 3, primeira.proximoCursor);
    const terceira = await listarConversas(pessoa.id, 3, segunda.proximoCursor);
    expect(
      new Set(
        [
          ...primeira.conversas,
          ...segunda.conversas,
          ...terceira.conversas,
        ].map((c) => c.id)
      ).size
    ).toBe(7);
    expect(terceira.proximoCursor).toBeNull();
  });

  it('preserva perguntas após falhas e rejeita tentativas concorrentes ou vencidas', async () => {
    const pessoa = await criarUsuario();
    const body = pedido();
    const inicial = await iniciarTurno(pessoa.id, body);
    await expect(iniciarTurno(pessoa.id, body)).rejects.toMatchObject({
      statusCode: 409,
    });
    await registrarFalhaDoTurno(pessoa.id, inicial, 'Falha verificada');
    expect(
      (await lerConversa(pessoa.id, body.conversationId)).turnos[0]
    ).toMatchObject({ estado: 'erro', pergunta: body.query });
    const nova = await iniciarTurno(pessoa.id, body);
    await expect(
      concluirTurno(pessoa.id, inicial, 'resposta antiga')
    ).rejects.toMatchObject({ statusCode: 409 });
    await registrarFalhaDoTurno(pessoa.id, inicial, 'falha antiga');
    await concluirTurno(pessoa.id, nova, 'resposta válida');
    expect(
      (await lerConversa(pessoa.id, body.conversationId)).turnos[0]
    ).toMatchObject({
      estado: 'concluido',
      resposta: 'resposta válida',
      erro: null,
    });
  });

  it('pagina mensagens antigas integralmente e inclui o chat na portabilidade e exclusão', async () => {
    const pessoa = await criarUsuario();
    const id = randomUUID();
    for (let indice = 0; indice < 43; indice += 1) {
      const turno = await iniciarTurno(
        pessoa.id,
        pedido(`Mensagem ${indice}`, id)
      );
      await concluirTurno(pessoa.id, turno, `Resposta ${indice}`);
    }
    const recente = await lerConversa(pessoa.id, id);
    expect(recente.turnos).toHaveLength(40);
    const antiga = await lerConversa(pessoa.id, id, recente.antes);
    expect(antiga.turnos).toHaveLength(3);
    expect(antiga.turnos[0].pergunta).toBe('Mensagem 0');
    expect(recente.turnos.at(-1)?.pergunta).toBe('Mensagem 42');
    const exportacao = await exportarDadosDoTitular(pessoa.id);
    expect(exportacao).toHaveProperty('chat_turns.length', 43);
    expect(exportacao).toHaveProperty('chat_conversations.length', 1);
    await excluirConta(pessoa.id);
    expect(
      await contar('SELECT COUNT(*) total FROM chat_turns WHERE user_id = ?', [
        pessoa.id,
      ])
    ).toBe(0);
    expect(
      await contar(
        'SELECT COUNT(*) total FROM chat_conversations WHERE user_id = ?',
        [pessoa.id]
      )
    ).toBe(0);
  });
});
