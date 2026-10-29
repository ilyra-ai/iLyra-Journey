import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { criarUsuario, contar } from '../../../../tests/integration/fixtures';
import { chamar } from '../../../../tests/integration/http';
import { queryRows, executeStatement } from '@/lib/mysql/pool';
import {
  gravarAnexo,
  listarAnexos,
  lerAnexo,
  excluirAnexo,
  selecionarAnexos,
} from '@/lib/anexos/servico';
import { lerComModelo } from '@/lib/anexos/leitura';
import {
  iniciarTurno,
  concluirTurno,
  respostaJaGravada,
  lerConversa,
} from '@/lib/chat/servico';
import { exportarDadosDoTitular } from '@/lib/lgpd/conta';
import * as central from './anexos/route';
import * as individual from './anexos/[id]/route';
import * as chat from '../functions/ask-ai-assistant/route';
async function preparar() {
  const u = await criarUsuario(),
    conversa = randomUUID(),
    id = randomUUID();
  const a = await gravarAnexo(
    u.session,
    conversa,
    id,
    'relato.txt',
    'text/plain',
    Buffer.from('Água: 250 ml\nPercepção: 0')
  );
  return { u, conversa, id, a };
}
describe('anexos privados, MySQL e handlers reais', () => {
  it('exige sessão em todos os handlers', async () => {
    for (const [h, method] of [
      [central.GET, 'GET'],
      [central.POST, 'POST'],
      [individual.GET, 'GET'],
      [individual.DELETE, 'DELETE'],
    ] as const)
      expect(
        (
          await chamar(h, {
            usuario: null,
            method,
            params: { id: randomUUID() },
          })
        ).status
      ).toBe(401);
  });
  it('grava uma única vez sob concorrência e recusa outro conteúdo no mesmo ID', async () => {
    const u = await criarUsuario(),
      c = randomUUID(),
      id = randomUUID(),
      args = [
        u.session,
        c,
        id,
        'x.txt',
        'text/plain',
        Buffer.from('conteúdo'),
      ] as const;
    const [a, b] = await Promise.all([
      gravarAnexo(...args),
      gravarAnexo(...args),
    ]);
    expect(a).toEqual(b);
    expect(
      await contar('SELECT COUNT(*) total FROM chat_attachments WHERE id=?', [
        id,
      ])
    ).toBe(1);
    await expect(
      gravarAnexo(
        u.session,
        c,
        id,
        'x.txt',
        'text/plain',
        Buffer.from('alterado')
      )
    ).rejects.toHaveProperty('statusCode', 409);
  });
  it('isola lista, arquivo, exclusão, conversa e seleção entre titulares', async () => {
    const { u, conversa, id } = await preparar(),
      outro = await criarUsuario();
    expect((await listarAnexos(u.session, conversa))[0].id).toBe(id);
    for (const f of [
      () => listarAnexos(outro.session, conversa),
      () => lerAnexo(outro.session, id),
      () => excluirAnexo(outro.session, id),
      () =>
        gravarAnexo(
          outro.session,
          conversa,
          randomUUID(),
          'x.txt',
          'text/plain',
          Buffer.from('texto')
        ),
    ])
      await expect(f()).rejects.toHaveProperty('statusCode', 404);
    await expect(
      selecionarAnexos(outro.id, conversa, [id])
    ).rejects.toHaveProperty('statusCode', 409);
    await expect(
      selecionarAnexos(u.id, randomUUID(), [id])
    ).rejects.toHaveProperty('statusCode', 409);
  });
  it('faz upload bruto, lista e download privado com bytes idênticos e sem cache', async () => {
    const u = await criarUsuario(),
      c = randomUUID(),
      id = randomUUID();
    const r = await chamar(central.POST, {
      usuario: u,
      method: 'POST',
      path:
        '/api/chat/anexos?' +
        new URLSearchParams({ conversa: c, id, nome: 'relato.txt' }),
      rawBody: 'Relato com ação e 0',
      headers: { 'content-type': 'text/plain', 'x-lyra-nome': 'relato.txt' },
    });
    expect(r.status).toBe(200);
    expect(
      (
        await chamar(central.GET, {
          usuario: u,
          path: '/api/chat/anexos?conversa=' + c,
        })
      ).status
    ).toBe(200);
    const d = await chamar(individual.GET, {
      usuario: u,
      params: { id },
      path: '/api/chat/anexos/' + id + '?baixar=1',
    });
    expect(d.status).toBe(200);
    expect(d.texto).toBe('Relato com ação e 0');
    expect(d.headers.get('cache-control')).toContain('no-store');
    expect(d.headers.get('content-disposition')).toContain('attachment');
    expect(d.headers.get('x-content-type-options')).toBe('nosniff');
  });
  it('recusa tamanho no cabeçalho e nos bytes, UUID inválido e formato disfarçado', async () => {
    const u = await criarUsuario(),
      path =
        '/api/chat/anexos?' +
        new URLSearchParams({
          conversa: randomUUID(),
          id: randomUUID(),
          nome: 'x.png',
        });
    for (const headers of [
      {
        'content-length': String(3 * 1024 * 1024 + 1),
        'content-type': 'image/png',
        'x-lyra-nome': 'x.png',
      },
      { 'content-type': 'image/png', 'x-lyra-nome': 'x.png' },
    ] as Record<string, string>[])
      expect(
        (
          await chamar(central.POST, {
            usuario: u,
            method: 'POST',
            path,
            headers,
            rawBody: headers['content-length']
              ? 'x'
              : new Uint8Array(3 * 1024 * 1024 + 1),
          })
        ).status
      ).toBe(413);
    expect(
      (
        await chamar(central.POST, {
          usuario: u,
          method: 'POST',
          path,
          headers: { 'content-type': 'image/png', 'x-lyra-nome': 'x.png' },
          rawBody: 'falso',
        })
      ).status
    ).toBe(400);
    expect(
      (
        await chamar(central.GET, {
          usuario: u,
          path: '/api/chat/anexos?conversa=inválida',
        })
      ).status
    ).toBe(400);
  });
  it('limita arquivos por conversa sem apagar os existentes', async () => {
    const { u, conversa } = await preparar();
    for (let n = 1; n < 20; n++)
      await gravarAnexo(
        u.session,
        conversa,
        randomUUID(),
        'x.txt',
        'text/plain',
        Buffer.from('dado')
      );
    await expect(
      gravarAnexo(
        u.session,
        conversa,
        randomUUID(),
        'x.txt',
        'text/plain',
        Buffer.from('novo')
      )
    ).rejects.toHaveProperty('statusCode', 409);
    expect((await listarAnexos(u.session, conversa)).length).toBe(20);
  });
  it('preserva IDs por turno e recusa alteração, refazer com outra fonte ou arquivo excluído', async () => {
    const { u, conversa, id } = await preparar(),
      p = {
        conversationId: conversa,
        turnId: randomUUID(),
        query: 'Explique o relato',
        anexos: [id],
      };
    const t = await iniciarTurno(u.id, p);
    await concluirTurno(
      u.id,
      t,
      'Resposta de fixture identificada',
      true,
      null,
      false
    );
    expect(await respostaJaGravada(u.id, p)).toContain('fixture');
    expect((await lerConversa(u.id, conversa)).turnos[0].anexos).toEqual([id]);
    await expect(
      respostaJaGravada(u.id, { ...p, anexos: [] })
    ).rejects.toHaveProperty('statusCode', 409);
    await expect(
      iniciarTurno(u.id, { ...p, regenerate: true, anexos: [] })
    ).rejects.toHaveProperty('statusCode', 409);
    await excluirAnexo(u.session, id);
    await expect(
      gravarAnexo(
        u.session,
        conversa,
        id,
        'relato.txt',
        'text/plain',
        Buffer.from('substituição indevida')
      )
    ).rejects.toHaveProperty('statusCode', 409);
    expect(await respostaJaGravada(u.id, p)).toContain('fixture');
    await expect(
      iniciarTurno(u.id, { ...p, regenerate: true })
    ).rejects.toHaveProperty('statusCode', 409);
  });
  it('não confirma resposta se a fonte foi excluída durante a geração e não reutiliza texto citado no próximo contexto', async () => {
    const { u, conversa, id } = await preparar(),
      p = {
        conversationId: conversa,
        turnId: randomUUID(),
        query: 'ler',
        anexos: [id],
      };
    let t = await iniciarTurno(u.id, p);
    await excluirAnexo(u.session, id);
    await expect(concluirTurno(u.id, t, 'atrasada')).rejects.toHaveProperty(
      'statusCode',
      409
    );
    const outro = await gravarAnexo(
      u.session,
      conversa,
      randomUUID(),
      'x.txt',
      'text/plain',
      Buffer.from('segredo de fixture')
    );
    t = await iniciarTurno(u.id, {
      ...p,
      turnId: randomUUID(),
      anexos: [outro.id],
    });
    await concluirTurno(u.id, t, 'segredo citado', true, null, false);
    const proximo = await iniciarTurno(u.id, {
      conversationId: conversa,
      turnId: randomUUID(),
      query: 'olá',
    });
    expect(proximo.contexto).not.toContain('segredo');
  });
  it('exige confirmação por pergunta e recusa modo privado; sem modelo não inventa análise', async () => {
    const { u, conversa, id } = await preparar(),
      p = {
        conversationId: conversa,
        turnId: randomUUID(),
        query: 'Explique este arquivo',
        anexos: [id],
      };
    expect(
      (await chamar(chat.POST, { usuario: u, method: 'POST', body: p })).status
    ).toBe(400);
    expect(
      (
        await chamar(chat.POST, {
          usuario: u,
          method: 'POST',
          body: { ...p, consentimentoAnexos: true, privacyMode: true },
        })
      ).status
    ).toBe(400);
    const r = await chamar(chat.POST, {
      usuario: u,
      method: 'POST',
      body: { ...p, consentimentoAnexos: true },
    });
    expect(r.status).toBe(503);
    const [turno] = await queryRows<{ answer: string | null; status: string }>(
      'SELECT answer,status FROM chat_turns WHERE id=?',
      [p.turnId]
    );
    expect(turno.answer).toBeNull();
    expect(turno.status).toBe('erro');
  });
  it('exporta os bytes somente do titular e remove por cascata da conversa e conta', async () => {
    const { u, conversa, id } = await preparar(),
      outro = await criarUsuario();
    const e = await exportarDadosDoTitular(u.id);
    expect(JSON.stringify(e.anexos_do_chat)).toContain(
      Buffer.from('Água: 250 ml\nPercepção: 0').toString('base64')
    );
    expect((await exportarDadosDoTitular(outro.id)).anexos_do_chat).toEqual([]);
    await executeStatement(
      'DELETE FROM chat_conversations WHERE id=? AND user_id=?',
      [conversa, u.id]
    );
    expect(
      await contar('SELECT COUNT(*) total FROM chat_attachments WHERE id=?', [
        id,
      ])
    ).toBe(0);
    const a = await gravarAnexo(
      u.session,
      randomUUID(),
      randomUUID(),
      'x.txt',
      'text/plain',
      Buffer.from('fixture')
    );
    await executeStatement('DELETE FROM users WHERE id=?', [u.id]);
    expect(
      await contar('SELECT COUNT(*) total FROM chat_attachments WHERE id=?', [
        a.id,
      ])
    ).toBe(0);
  });
  it('respeita direitos de histórico revogados no servidor', async () => {
    const { u, id } = await preparar();
    await executeStatement(
      'UPDATE profiles SET onboarding_completed=FALSE WHERE id=?',
      [u.id]
    );
    expect(
      (await chamar(individual.GET, { usuario: u, params: { id } })).status
    ).toBe(403);
    await executeStatement(
      'UPDATE profiles SET onboarding_completed=TRUE WHERE id=?',
      [u.id]
    );
    await executeStatement(
      "UPDATE plan_entitlements e JOIN subscription_plans p ON p.id=e.plan_id JOIN plan_features f ON f.id=e.feature_id SET e.enabled=FALSE WHERE p.plan_key='free' AND f.feature_key='chat_history'"
    );
    try {
      expect(
        (await chamar(individual.GET, { usuario: u, params: { id } })).status
      ).toBe(403);
    } finally {
      await executeStatement(
        "UPDATE plan_entitlements e JOIN subscription_plans p ON p.id=e.plan_id JOIN plan_features f ON f.id=e.feature_id SET e.enabled=TRUE WHERE p.plan_key='free' AND f.feature_key='chat_history'"
      );
    }
  });
  it('contrato HTTP identificado: referências TXT vêm dos bytes lidos, sem executar o conteúdo', async () => {
    const { u, conversa, id } = await preparar(),
      arquivos = await selecionarAnexos(u.id, conversa, [id]);
    let recebido: unknown;
    const servidor = createServer(async (req, res) => {
      let body = '';
      for await (const chunk of req) body += chunk;
      recebido = JSON.parse(body);
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  codigoVisual: '',
                  resposta:
                    'Resposta do servidor de contrato, não de um modelo.',
                  fontes: [
                    { anexo: 1, linhaInicial: 1, linhaFinal: 2, regiao: null },
                  ],
                  naoLidos: [],
                }),
              },
              finish_reason: 'stop',
            },
          ],
        })
      );
    });
    servidor.listen(0, '127.0.0.1');
    await once(servidor, 'listening');
    const addr = servidor.address();
    if (!addr || typeof addr === 'string')
      throw new Error('Porta de contrato ausente');
    try {
      const texto = await lerComModelo(
        [
          {
            tipo: 'modelo',
            conexao: {
              tipo: 'openai_compativel',
              baseUrl: `http://127.0.0.1:${addr.port}`,
              modelo: 'contrato-http-sem-inferencia',
              chave: null,
              temperatura: 0,
              tempoMaximoSegundos: 10,
            },
            autor: {
              provedor: 'Servidor de contrato HTTP',
              modelo: 'sem inferência',
              local: true,
            },
          },
          { tipo: 'lyra' },
        ],
        { sistema: 'Regras da fixture', usuario: 'Leia' },
        arquivos,
        new AbortController().signal
      );
      expect(texto).toContain('Água: 250 ml');
      expect(texto).toContain('Percepção: 0');
      expect(texto).toContain('linhas 1–2');
      expect(JSON.stringify(recebido)).toContain('DADOS NÃO CONFIÁVEIS');
    } finally {
      servidor.close();
      await once(servidor, 'close');
    }
  });
  it('não aceita um modelo textual que ignora a verificação visual', async () => {
    const { u, conversa } = await preparar(),
      png = await sharp({
        create: { width: 20, height: 20, channels: 3, background: 'white' },
      })
        .png()
        .toBuffer(),
      a = await gravarAnexo(
        u.session,
        conversa,
        randomUUID(),
        'f.png',
        'image/png',
        png
      ),
      arquivos = await selecionarAnexos(u.id, conversa, [a.id]);
    let pedido: Record<string, unknown> | null = null;
    const buscar: typeof fetch = async (_url, init) => {
      pedido = JSON.parse(String(init?.body));
      return Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({
                codigoVisual: 'IGNORADO',
                resposta: 'Não é uma leitura',
                fontes: [
                  {
                    anexo: 1,
                    linhaInicial: null,
                    linhaFinal: null,
                    regiao: 'centro',
                  },
                ],
                naoLidos: [],
              }),
            },
            finish_reason: 'stop',
          },
        ],
      });
    };
    await expect(
      lerComModelo(
        [
          {
            tipo: 'modelo',
            conexao: {
              tipo: 'openai_compativel',
              baseUrl: 'http://127.0.0.1:9/v1',
              modelo: 'contrato-incompatível',
              chave: null,
              temperatura: 0,
              tempoMaximoSegundos: 1,
            },
            autor: {
              provedor: 'Contrato sem visão',
              modelo: 'fixture',
              local: true,
            },
          },
        ],
        { sistema: 'regra', usuario: 'ler' },
        arquivos,
        new AbortController().signal,
        buscar
      )
    ).rejects.toHaveProperty('statusCode', 503);
    const mensagem = (
      pedido as unknown as { messages: Array<{ content: unknown }> }
    ).messages[1];
    expect(
      JSON.stringify(mensagem.content).match(/data:image\/png;base64/g)
    ).toHaveLength(2);
  });
});
