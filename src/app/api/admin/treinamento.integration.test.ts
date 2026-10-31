import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { createServer, type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  contar,
  criarUsuario,
  type UsuarioDeTeste,
} from '../../../../tests/integration/fixtures';
import { chamar } from '../../../../tests/integration/http';
import { executeStatement } from '@/lib/mysql/pool';
import { exportarDadosDoTitular } from '@/lib/lgpd/conta';
import type { Avaliacao, EstadoDoTreinamento } from '@/lib/treinamento/esquema';
import * as adminIa from './ia/route';
import * as treinamento from './treinamento/route';
import * as avaliacoes from './treinamento/avaliacoes/route';
import * as avaliacao from './treinamento/avaliacoes/[id]/route';

/**
 * Servidor de CONTRATO HTTP do serviço de treinamento, identificado como
 * tal: registra o que o app envia e devolve estados montados pelo teste. Não
 * treina pesos; o treino real fica no QA com o serviço de verdade.
 */
let servidor: Server;
let base = '';
const recebido: {
  treino: unknown[];
  sessoes: unknown[];
  autorizacao: string[];
} = {
  treino: [],
  sessoes: [],
  autorizacao: [],
};
let tarefa: Record<string, unknown> = { estado: 'treinando' };
const SEGREDO_DE_TESTE = 'segredo-de-teste-do-contrato-'.padEnd(48, 'x');

beforeAll(async () => {
  servidor = createServer(async (req, res) => {
    let corpo = '';
    for await (const c of req) corpo += c;
    recebido.autorizacao.push(String(req.headers.authorization));
    res.setHeader('Content-Type', 'application/json');
    if (req.method === 'GET' && req.url === '/treino')
      return res.end(
        JSON.stringify({ versaoAtiva: 0, minimo: 4, treinando: false })
      );
    if (req.method === 'POST' && req.url === '/treino/sessoes') {
      recebido.sessoes.push(JSON.parse(corpo));
      return res.end('{}');
    }
    if (req.method === 'POST' && req.url === '/treino') {
      recebido.treino.push(JSON.parse(corpo));
      res.statusCode = 202;
      return res.end(JSON.stringify({ tarefa: 'contrato1' }));
    }
    if (req.url === '/treino/tarefas/contrato1')
      return res.end(JSON.stringify(tarefa));
    res.statusCode = 404;
    res.end('{}');
  });
  servidor.listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  const a = servidor.address();
  if (!a || typeof a === 'string') throw new Error('porta');
  base = `http://127.0.0.1:${a.port}`;
  process.env.LYRA_TREINO_URL = base;
  process.env.LYRA_TREINO_SEGREDO = SEGREDO_DE_TESTE;
});
afterAll(async () => {
  await executeStatement('DELETE FROM ai_model_chain');
  await executeStatement('DELETE FROM ai_provider_connections');
  await executeStatement(
    'INSERT INTO ai_model_chain (position, connection_id, model) VALUES (1, NULL, NULL)'
  );
  await executeStatement('DELETE FROM ai_training_sessions');
  servidor.close();
});

async function conectar(admin: UsuarioDeTeste, modelo = 'lyra-treinavel') {
  const r = await chamar(adminIa.PUT, {
    method: 'PUT',
    usuario: admin,
    body: {
      provedores: [
        {
          preset: 'llama_cpp',
          baseUrl: `${base}/v1`,
          modelos: [modelo],
          tempoMaximoSegundos: 30,
          temperatura: 0.7,
        },
      ],
      ordem: [
        { tipo: 'modelo', preset: 'llama_cpp', modelo },
        { tipo: 'lyra' },
      ],
    },
  });
  expect(r.status).toBe(200);
}
async function turno(u: UsuarioDeTeste, pergunta: string, resposta: string) {
  const conversa = randomUUID(),
    id = randomUUID();
  await executeStatement(
    'INSERT INTO chat_conversations(id,user_id,title) VALUES(?,?,?)',
    [conversa, u.id, 'Treino']
  );
  await executeStatement(
    "INSERT INTO chat_turns(id,conversation_id,user_id,question,answer,status,attempt_id) VALUES(?,?,?,?,?,'concluido',?)",
    [id, conversa, u.id, pergunta, resposta, randomUUID()]
  );
  return id;
}
const estado = async (u: UsuarioDeTeste) =>
  (await chamar(treinamento.GET, { usuario: u })).json as EstadoDoTreinamento;
const acao = (u: UsuarioDeTeste, a: 'ativar' | 'desativar') =>
  chamar(treinamento.POST, { method: 'POST', usuario: u, body: { acao: a } });
const avaliar = (u: UsuarioDeTeste, body: unknown) =>
  chamar(avaliacoes.POST, { method: 'POST', usuario: u, body });

describe('Treinamento por feedback humano (tarefa 90)', () => {
  it('é só do administrador e exige o modelo treinável conectado', async () => {
    const pessoa = await criarUsuario(),
      admin = await criarUsuario('admin', 'Ana');
    expect((await chamar(treinamento.GET, { usuario: null })).status).toBe(401);
    expect((await chamar(treinamento.GET, { usuario: pessoa })).status).toBe(
      403
    );
    expect((await acao(pessoa, 'ativar')).status).toBe(403);
    expect((await avaliar(pessoa, {})).status).toBe(403);
    // Outro modelo no lugar do treinável: não há pesos para treinar.
    await conectar(admin, 'outro-modelo');
    const sem = await estado(admin);
    expect(sem.conectado).toBe(false);
    expect(sem.motivo).toMatch(/modelo treinável da Lyra/);
    const recusa = await acao(admin, 'ativar');
    expect(recusa.status).toBe(409);
    expect(
      await contar('SELECT COUNT(*) total FROM ai_training_sessions')
    ).toBe(0);
  });

  it('liga, salva avaliações na hora, edita, exclui, treina ao desligar e aplica', async () => {
    const admin = await criarUsuario('admin', 'Ana'),
      outra = await criarUsuario('admin', 'Bia'),
      pessoa = await criarUsuario();
    await conectar(admin);
    expect((await estado(admin)).conectado).toBe(true);
    // Sem treinamento ligado, não há avaliação.
    const t0 = await turno(admin, 'Pergunta 0', 'Resposta 0');
    expect(
      (await avaliar(admin, { turnoId: t0, nota: 1, correcao: null })).status
    ).toBe(409);

    const ligado = await acao(admin, 'ativar');
    expect(ligado.status).toBe(200);
    expect((ligado.json as EstadoDoTreinamento).sessao?.estado).toBe('ativa');
    expect(recebido.sessoes.at(-1)).toMatchObject({ aberta: true });
    expect(recebido.autorizacao.at(-1)).toBe(`Bearer ${SEGREDO_DE_TESTE}`);
    expect((await acao(admin, 'ativar')).status).toBe(409);

    const turnos = [
      await turno(admin, 'Como dormir melhor?', 'Resposta longa e vaga.'),
      await turno(admin, 'Como ter energia?', 'Aqui é a Lyra: beba água.'),
      await turno(admin, 'Como relaxar?', 'Aqui é a Lyra: respire fundo.'),
    ];
    // Turno de outra pessoa não entra no treino.
    const alheio = await turno(pessoa, 'Dado pessoal', 'Resposta pessoal');
    expect(
      (await avaliar(admin, { turnoId: alheio, nota: 1, correcao: null }))
        .status
    ).toBe(404);
    expect(
      (await avaliar(admin, { turnoId: turnos[0], nota: 2, correcao: null }))
        .status
    ).toBe(400);

    const a0 = (
      await avaliar(admin, {
        turnoId: turnos[0],
        nota: -1,
        correcao: 'Aqui é a Lyra: desligue as telas uma hora antes.',
      })
    ).json as Avaliacao;
    expect(a0).toMatchObject({
      nota: -1,
      pergunta: 'Como dormir melhor?',
      resposta: 'Resposta longa e vaga.',
    });
    await avaliar(admin, { turnoId: turnos[1], nota: 1, correcao: null });
    const a2 = (
      await avaliar(admin, { turnoId: turnos[2], nota: -1, correcao: null })
    ).json as Avaliacao;
    // Reavaliar a mesma resposta atualiza, não duplica.
    const a2b = (
      await avaliar(admin, { turnoId: turnos[2], nota: 1, correcao: null })
    ).json as Avaliacao;
    expect(a2b.id).toBe(a2.id);
    expect(a2b.versao).toBe(2);
    const lista = (await chamar(avaliacoes.GET, { usuario: admin })).json as {
      avaliacoes: Avaliacao[];
    };
    expect(lista.avaliacoes).toHaveLength(3);
    // Edição com versão; outra conta administradora não altera avaliação alheia.
    expect(
      (
        await chamar(avaliacao.PATCH, {
          method: 'PATCH',
          usuario: outra,
          params: { id: a0.id },
          body: { versao: 1, nota: 1, correcao: null },
        })
      ).status
    ).toBe(404);
    expect(
      (
        await chamar(avaliacao.PATCH, {
          method: 'PATCH',
          usuario: admin,
          params: { id: a0.id },
          body: { versao: 9, nota: 1, correcao: null },
        })
      ).status
    ).toBe(409);
    const extra = await turno(admin, 'Excluir?', 'Sim.');
    const ae = (
      await avaliar(admin, { turnoId: extra, nota: 1, correcao: null })
    ).json as Avaliacao;
    expect(
      (
        await chamar(avaliacao.DELETE, {
          method: 'DELETE',
          usuario: admin,
          params: { id: ae.id },
          body: { versao: ae.versao },
        })
      ).status
    ).toBe(200);

    // Off: as avaliações salvas viram exemplos; a resposta ideal entra como desejável.
    const desligado = await acao(admin, 'desativar');
    expect(desligado.status).toBe(200);
    expect((desligado.json as EstadoDoTreinamento).sessao?.estado).toBe(
      'treinando'
    );
    expect(recebido.treino.at(-1)).toMatchObject({
      exemplos: expect.arrayContaining([
        {
          pergunta: 'Como dormir melhor?',
          resposta: 'Resposta longa e vaga.',
          desejavel: false,
        },
        {
          pergunta: 'Como dormir melhor?',
          resposta: 'Aqui é a Lyra: desligue as telas uma hora antes.',
          desejavel: true,
        },
        {
          pergunta: 'Como ter energia?',
          resposta: 'Aqui é a Lyra: beba água.',
          desejavel: true,
        },
        {
          pergunta: 'Como relaxar?',
          resposta: 'Aqui é a Lyra: respire fundo.',
          desejavel: true,
        },
      ]),
    });
    expect(
      (recebido.treino.at(-1) as { exemplos: unknown[] }).exemplos
    ).toHaveLength(4);
    expect(JSON.stringify(recebido.treino)).not.toContain('Dado pessoal');
    expect(recebido.sessoes.at(-1)).toMatchObject({ aberta: false });
    // Durante o treino não se avalia nem se liga outra sessão.
    expect(
      (await avaliar(admin, { turnoId: turnos[1], nota: 1, correcao: null }))
        .status
    ).toBe(409);
    expect((await acao(admin, 'ativar')).status).toBe(409);

    // O serviço conclui: a sessão registra versão aplicada e métricas.
    tarefa = {
      estado: 'concluida',
      versao: 1,
      antes: {
        logprobDesejaveis: -2.8,
        logprobIndesejaveis: -1.9,
        margem: -0.9,
      },
      depois: {
        logprobDesejaveis: -1.8,
        logprobIndesejaveis: -2.9,
        margem: 1.1,
      },
      perdaFinal: 0.12,
    };
    const aplicada = (await estado(admin)).historico[0];
    expect(aplicada).toMatchObject({
      estado: 'aplicada',
      versaoDoModelo: 1,
      exemplos: 4,
    });
    expect(aplicada.metricas?.depois.margem).toBe(1.1);
    expect(aplicada.aplicadaEm).not.toBeNull();

    // LGPD: as avaliações entram na exportação do administrador.
    const ex = await exportarDadosDoTitular(admin.id);
    expect(ex.ai_training_feedback).toHaveLength(3);
    // Excluir a conversa remove as avaliações dela.
    await executeStatement('DELETE FROM chat_conversations WHERE user_id=?', [
      admin.id,
    ]);
    expect(
      await contar(
        'SELECT COUNT(*) total FROM ai_training_feedback WHERE admin_id=?',
        [admin.id]
      )
    ).toBe(0);
  });

  it('treino que falha fica registrado e pode ser reenviado', async () => {
    const admin = await criarUsuario('admin', 'Cris');
    await conectar(admin);
    tarefa = { estado: 'treinando' };
    expect((await acao(admin, 'ativar')).status).toBe(200);
    for (let i = 0; i < 4; i++)
      await avaliar(admin, {
        turnoId: await turno(admin, `P${i}`, `R${i}`),
        nota: 1,
        correcao: null,
      });
    expect((await acao(admin, 'desativar')).status).toBe(200);
    tarefa = { estado: 'falhou', erro: 'Memória insuficiente.' };
    const falhou = await estado(admin);
    expect(falhou.historico[0]).toMatchObject({
      estado: 'falhou',
      erro: 'Memória insuficiente.',
    });
    const antes = recebido.treino.length;
    tarefa = { estado: 'treinando' };
    expect((await acao(admin, 'desativar')).status).toBe(200);
    expect(recebido.treino.length).toBe(antes + 1);
    expect((await estado(admin)).sessao?.estado).toBe('treinando');
    tarefa = {
      estado: 'concluida',
      versao: 2,
      antes: null,
      depois: null,
      perdaFinal: 0.1,
    };
    expect((await estado(admin)).historico[0].estado).toBe('aplicada');

    // Serviço que perdeu a tarefa: a sessão sai de "treinando" com o motivo.
    tarefa = { estado: 'treinando' };
    expect((await acao(admin, 'ativar')).status).toBe(200);
    for (let i = 0; i < 4; i++)
      await avaliar(admin, {
        turnoId: await turno(admin, `Q${i}`, `S${i}`),
        nota: 1,
        correcao: null,
      });
    expect((await acao(admin, 'desativar')).status).toBe(200);
    await executeStatement(
      "UPDATE ai_training_sessions SET job_id='perdida' WHERE status='treinando'"
    );
    expect((await estado(admin)).historico[0]).toMatchObject({
      estado: 'falhou',
      erro: expect.stringMatching(/não encontrou esta tarefa/),
    });
  });
});
