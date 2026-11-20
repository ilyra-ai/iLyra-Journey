import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { executeStatement, queryRows } from '@/lib/mysql/pool';
import {
  criarUsuario,
  type UsuarioDeTeste,
} from '../../../../tests/integration/fixtures';
import { chamar } from '../../../../tests/integration/http';
import {
  iniciarServidorOpenAiCompativel,
  type ServidorOpenAiCompativel,
} from '../../../../tests/support/servidor-openai-compativel';
import * as configuracaoIa from '../admin/ia/route';
import * as assistente from '../functions/ask-ai-assistant/route';
import * as detalhe from './conversas/[id]/route';

// Título das conversas pelo modelo de IA (tarefa 231) e gestão do histórico
// (renomear e excluir, tarefa 232), contra o MySQL real e um servidor HTTP
// compatível com OpenAI que roda localmente no teste.

const PEDIDO_DE_TITULO = 'Você dá nome a conversas';

const pedido = (query: string, conversationId = randomUUID()) => ({
  conversationId,
  turnId: randomUUID(),
  query,
});

async function conversa(id: string) {
  const [linha] = await queryRows<{ title: string; title_source: string }>(
    'SELECT title, title_source FROM chat_conversations WHERE id = ?',
    [id]
  );
  return linha;
}

let servidor: ServidorOpenAiCompativel;
let admin: UsuarioDeTeste;
let tituloDoModelo = '"Sono e rotina noturna."';

beforeAll(async () => {
  servidor = await iniciarServidorOpenAiCompativel();
  admin = await criarUsuario('admin');
  // O modelo responde o título quando o pedido é de título, e a conversa
  // nos demais pedidos.
  servidor.responder((corpo) =>
    JSON.stringify(corpo).includes(PEDIDO_DE_TITULO)
      ? tituloDoModelo
      : 'Vamos cuidar do seu sono com calma.'
  );
  const configurada = await chamar(configuracaoIa.PUT, {
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
        { tipo: 'modelo', preset: 'jan', modelo: 'qwen2.5:7b-instruct' },
        { tipo: 'lyra' },
      ],
    },
  });
  expect(configurada.status).toBe(200);
});

afterAll(async () => {
  await servidor.fechar();
  await chamar(configuracaoIa.PUT, {
    method: 'PUT',
    usuario: admin,
    body: { provedores: [], ordem: [{ tipo: 'lyra' }] },
  });
});

describe('título da conversa pelo modelo de IA', () => {
  it('troca o título provisório pelo do modelo e nunca sobrescreve o nome dado pela pessoa', async () => {
    tituloDoModelo = '"Sono e rotina noturna."';
    const pessoa = await criarUsuario();
    const primeira = pedido('Como faço para dormir melhor à noite?');
    const resposta = await chamar(assistente.POST, {
      method: 'POST',
      usuario: pessoa,
      body: primeira,
    });
    expect(resposta.status).toBe(200);
    expect(await conversa(primeira.conversationId)).toEqual({
      title: 'Sono e rotina noturna',
      title_source: 'modelo',
    });

    // Renomeada pela pessoa: o modelo não volta a dar nome.
    const renomeada = await chamar(detalhe.PATCH, {
      method: 'PATCH',
      usuario: pessoa,
      params: { id: primeira.conversationId },
      body: { titulo: '  Meu   sono  ' },
    });
    expect(renomeada.status).toBe(200);
    expect(renomeada.json).toMatchObject({
      conversa: { id: primeira.conversationId, titulo: 'Meu sono' },
    });
    const pedidosAntes = servidor.requisicoes.length;
    tituloDoModelo = 'Outro título qualquer';
    await chamar(assistente.POST, {
      method: 'POST',
      usuario: pessoa,
      body: pedido('E sobre cochilos?', primeira.conversationId),
    });
    expect(await conversa(primeira.conversationId)).toEqual({
      title: 'Meu sono',
      title_source: 'pessoa',
    });
    // Só o pedido da resposta: nenhum pedido de título.
    expect(
      servidor.requisicoes
        .slice(pedidosAntes)
        .filter((r) => JSON.stringify(r.corpo).includes(PEDIDO_DE_TITULO))
    ).toHaveLength(0);
  });

  it('com título fora do formato ou com dado pessoal, fica o começo da pergunta', async () => {
    const pessoa = await criarUsuario('patient', 'Marcela');
    tituloDoModelo = 'Primeira linha\nSegunda linha';
    const varias = pedido('Quero entender meus sonhos recorrentes');
    await chamar(assistente.POST, {
      method: 'POST',
      usuario: pessoa,
      body: varias,
    });
    expect(await conversa(varias.conversationId)).toEqual({
      title: 'Quero entender meus sonhos recorrentes',
      title_source: 'pergunta',
    });

    tituloDoModelo = 'Os sonhos da Marcela';
    const comNome = pedido('Sonhos com água significam algo?');
    await chamar(assistente.POST, {
      method: 'POST',
      usuario: pessoa,
      body: comNome,
    });
    expect((await conversa(comNome.conversationId)).title_source).toBe(
      'pergunta'
    );
  });

  it('no modo privado não pede título ao modelo', async () => {
    tituloDoModelo = 'Título que não deve aparecer';
    const pessoa = await criarUsuario();
    const antes = servidor.requisicoes.length;
    const privado = pedido('Uma pergunta só minha');
    const resposta = await chamar(assistente.POST, {
      method: 'POST',
      usuario: pessoa,
      body: { ...privado, privacyMode: true },
    });
    expect(resposta.status).toBe(200);
    expect(
      servidor.requisicoes
        .slice(antes)
        .filter((r) => JSON.stringify(r.corpo).includes(PEDIDO_DE_TITULO))
    ).toHaveLength(0);
  });
});

describe('renomear e excluir conversas', () => {
  it('só o titular renomeia e exclui; valida o nome e o id', async () => {
    const ana = await criarUsuario();
    const bia = await criarUsuario();
    const id = randomUUID();
    await executeStatement(
      'INSERT INTO chat_conversations (id, user_id, title) VALUES (?, ?, ?)',
      [id, ana.id, 'Conversa da Ana']
    );
    const renomear = (
      usuario: UsuarioDeTeste | null,
      body: unknown,
      alvo: string = id
    ) =>
      chamar(detalhe.PATCH, {
        method: 'PATCH',
        usuario,
        params: { id: alvo },
        body,
      });
    expect((await renomear(null, { titulo: 'X' })).status).toBe(401);
    expect((await renomear(bia, { titulo: 'Invadida' })).status).toBe(404);
    expect((await renomear(ana, { titulo: '   ' })).status).toBe(400);
    expect((await renomear(ana, { titulo: 'a'.repeat(121) })).status).toBe(400);
    expect((await renomear(ana, { titulo: 'Ok', extra: 1 })).status).toBe(400);
    expect((await renomear(ana, { titulo: 'Ok' }, 'invalido')).status).toBe(
      400
    );
    expect((await renomear(ana, { titulo: 'Ok' }, randomUUID())).status).toBe(
      404
    );
    expect((await conversa(id)).title).toBe('Conversa da Ana');

    const excluir = (usuario: UsuarioDeTeste | null, alvo: string = id) =>
      chamar(detalhe.DELETE, {
        method: 'DELETE',
        usuario,
        params: { id: alvo },
      });
    expect((await excluir(null)).status).toBe(401);
    expect((await excluir(bia)).status).toBe(404);
    expect(await conversa(id)).toBeDefined();
    expect((await excluir(ana)).status).toBe(204);
    expect(await conversa(id)).toBeUndefined();
    expect((await excluir(ana)).status).toBe(404);
  });

  it('excluir apaga junto as mensagens da conversa', async () => {
    const pessoa = await criarUsuario();
    const corpo = pedido('Pergunta que será apagada');
    expect(
      (
        await chamar(assistente.POST, {
          method: 'POST',
          usuario: pessoa,
          body: corpo,
        })
      ).status
    ).toBe(200);
    const turnos = () =>
      queryRows<{ total: number }>(
        'SELECT COUNT(*) AS total FROM chat_turns WHERE conversation_id = ?',
        [corpo.conversationId]
      );
    expect(Number((await turnos())[0].total)).toBe(1);
    expect(
      (
        await chamar(detalhe.DELETE, {
          method: 'DELETE',
          usuario: pessoa,
          params: { id: corpo.conversationId },
        })
      ).status
    ).toBe(204);
    expect(Number((await turnos())[0].total)).toBe(0);
  });
});
