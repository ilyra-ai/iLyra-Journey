import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { createServer, type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  contar,
  criarUsuario,
  type UsuarioDeTeste,
} from '../../../tests/integration/fixtures';
import { chamar } from '../../../tests/integration/http';
import { executeStatement, queryRows } from '@/lib/mysql/pool';
import { exportarDadosDoTitular, excluirConta } from '@/lib/lgpd/conta';
import { lerLinhaDoTempo } from '@/lib/linha-do-tempo/servico';
import type { MesDoDiario, Relato } from '@/lib/diario-pessoal/esquema';
import * as adminIa from './admin/ia/route';
import * as diario from './diario-pessoal/route';
import * as item from './diario-pessoal/[id]/route';
import * as analise from './diario-pessoal/[id]/analise/route';

/**
 * Servidor de CONTRATO HTTP (compatível com OpenAI), identificado como tal:
 * devolve respostas montadas pelo teste para exercitar validação,
 * consentimento e gravação. Não é um modelo e não prova qualidade de
 * inferência; a prova com modelo real fica no QA do navegador.
 */
let servidor: Server;
let base = '';
let modo: 'fiel' | 'acrescenta' | 'clinico' = 'fiel';
const recebidos: Array<{ relato: string; ceuDoDia: unknown }> = [];

function respostaDoContrato(corpo: {
  messages: Array<{ role: string; content: string }>;
}) {
  const dados = JSON.parse(corpo.messages.at(-1)!.content) as {
    relato: string;
    ceuDoDia: unknown;
  };
  recebidos.push({ relato: dados.relato, ceuDoDia: dados.ceuDoDia });
  const organizado =
    dados.relato.charAt(0).toUpperCase() +
    dados.relato.slice(1).replace(/irma/g, 'irmã') +
    '.';
  return {
    textoOrganizado:
      modo === 'acrescenta'
        ? `${organizado} Depois fui ao cinema com o Pedro e a Joana.`
        : organizado,
    acontecimentos: ['Caminhada com a irmã'],
    percepcoes:
      modo === 'clinico'
        ? ['Isso parece um transtorno de ansiedade.']
        : ['Sentiu-se leve'],
    caracteristicasDoDia:
      'Pelo seu relato, a caminhada no parque deixou o dia leve.',
    relacaoComOMapa: dados.ceuDoDia
      ? 'O céu de hoje favorecia encontros, e isso conversa com a caminhada.'
      : null,
    padroes: [],
  };
}

beforeAll(async () => {
  servidor = createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    res.setHeader('Content-Type', 'application/json');
    if (!req.url?.includes('chat/completions')) {
      res.end(JSON.stringify({ data: [{ id: 'contrato' }] }));
      return;
    }
    res.end(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify(respostaDoContrato(JSON.parse(body))),
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
  if (!addr || typeof addr === 'string') throw new Error('Porta ausente');
  base = `http://127.0.0.1:${addr.port}/v1`;
});
afterAll(async () => {
  await voltarAoMotorDaLyra();
  servidor.close();
});

async function voltarAoMotorDaLyra() {
  await executeStatement('DELETE FROM ai_model_chain');
  await executeStatement('DELETE FROM ai_provider_connections');
  await executeStatement(
    'INSERT INTO ai_model_chain (position, connection_id, model) VALUES (1, NULL, NULL)'
  );
}
// Local ou nuvem é decidido pelo endereço, não pelo nome do provedor: a
// nuvem usa a URL pública real, filtrada antes de qualquer chamada.
async function configurar(preset: 'ollama' | 'openai') {
  const admin = await criarUsuario('admin', 'AdminDiario');
  const r = await chamar(adminIa.PUT, {
    method: 'PUT',
    usuario: admin,
    body: {
      provedores: [
        {
          preset,
          baseUrl: preset === 'openai' ? 'https://api.openai.com/v1' : base,
          modelos: ['contrato-sem-inferencia'],
          tempoMaximoSegundos: 10,
          temperatura: 0.2,
          ...(preset === 'openai' ? { chave: 'sk-contrato-000001' } : {}),
        },
      ],
      ordem: [
        { tipo: 'modelo', preset, modelo: 'contrato-sem-inferencia' },
        { tipo: 'lyra' },
      ],
    },
  });
  expect(r.status).toBe(200);
}

const relato = 'hoje fui caminhar no parque com a minha irma e me senti leve';
async function hoje(u: UsuarioDeTeste) {
  return ((await chamar(diario.GET, { usuario: u })).json as MesDoDiario).hoje;
}
async function criar(u: UsuarioDeTeste, extra: Record<string, unknown> = {}) {
  return chamar(diario.POST, {
    method: 'POST',
    usuario: u,
    body: {
      id: randomUUID(),
      data: 'data' in extra ? extra.data : await hoje(u),
      texto: relato,
      modo: 'voz',
      motor: 'aparelho',
      ...extra,
    },
  });
}
const analisar = (u: UsuarioDeTeste, r: Relato) =>
  chamar(analise.POST, {
    method: 'POST',
    usuario: u,
    params: { id: r.id },
    body: { versao: r.versao },
  });

describe('diário pessoal (tarefa 135)', () => {
  it('cria, lista por mês e por dia, edita, exclui e isola por titular', async () => {
    const u = await criarUsuario(),
      outra = await criarUsuario();
    expect((await chamar(diario.GET, { usuario: null })).status).toBe(401);
    const dia = await hoje(u);
    const criado = await criar(u);
    expect(criado.status).toBe(201);
    const r = criado.json as Relato;
    expect(r).toMatchObject({
      data: dia,
      modo: 'voz',
      motor: 'aparelho',
      textoOriginal: relato,
      textoOrganizado: null,
      estadoDaAnalise: 'pendente',
      versao: 1,
    });
    const mes = (await chamar(diario.GET, { usuario: u })).json as MesDoDiario;
    expect(mes.dias).toEqual([{ data: dia, total: 1 }]);
    const lista = await chamar(diario.GET, {
      usuario: u,
      path: `/api/diario-pessoal?data=${dia}`,
    });
    expect((lista.json as { relatos: Relato[] }).relatos).toHaveLength(1);

    // Outra conta não vê nem mexe.
    const deOutra = await chamar(diario.GET, {
      usuario: outra,
      path: `/api/diario-pessoal?data=${dia}`,
    });
    expect((deOutra.json as { relatos: Relato[] }).relatos).toEqual([]);
    for (const resposta of [
      await chamar(item.PATCH, {
        method: 'PATCH',
        usuario: outra,
        params: { id: r.id },
        body: { versao: 1, texto: 'invadido' },
      }),
      await chamar(item.DELETE, {
        method: 'DELETE',
        usuario: outra,
        params: { id: r.id },
        body: { versao: 1 },
      }),
      await analisar(outra, r),
    ])
      expect(resposta.status).toBe(404);

    // Edição com versão; versão antiga é recusada.
    const editado = await chamar(item.PATCH, {
      method: 'PATCH',
      usuario: u,
      params: { id: r.id },
      body: { versao: 1, texto: `${relato} de verdade` },
    });
    expect(editado.status).toBe(200);
    expect((editado.json as Relato).versao).toBe(2);
    expect(
      (
        await chamar(item.PATCH, {
          method: 'PATCH',
          usuario: u,
          params: { id: r.id },
          body: { versao: 1, texto: 'outra coisa' },
        })
      ).status
    ).toBe(409);
    expect(
      (
        await chamar(item.DELETE, {
          method: 'DELETE',
          usuario: u,
          params: { id: r.id },
          body: { versao: 2 },
        })
      ).status
    ).toBe(200);
    expect(
      await contar(
        'SELECT COUNT(*) total FROM personal_diary_entries WHERE user_id=?',
        [u.id]
      )
    ).toBe(0);
  });

  it('valida data, corpo, idempotência e o limite diário', async () => {
    const u = await criarUsuario();
    const dia = await hoje(u);
    const amanha = new Date(`${dia}T12:00:00Z`);
    amanha.setUTCDate(amanha.getUTCDate() + 1);
    expect(
      (await criar(u, { data: amanha.toISOString().slice(0, 10) })).status
    ).toBe(400);
    expect((await criar(u, { modo: 'voz', motor: null })).status).toBe(400);
    expect((await criar(u, { texto: '   ' })).status).toBe(400);
    expect((await criar(u, { extra: true })).status).toBe(400);
    const id = randomUUID();
    const primeira = await criar(u, { id });
    const repetida = await criar(u, { id });
    expect(repetida.status).toBe(201);
    expect((repetida.json as Relato).id).toBe((primeira.json as Relato).id);
    expect((await criar(u, { id, texto: 'outro texto' })).status).toBe(409);
    for (let i = 0; i < 9; i++) expect((await criar(u)).status).toBe(201);
    const excedente = await criar(u);
    expect(excedente.status).toBe(409);
    expect((excedente.json as { error: string }).error).toMatch(
      /até 10 relatos/
    );
  });

  it('sem modelo autorizado, guarda o relato e marca a análise como indisponível', async () => {
    await voltarAoMotorDaLyra();
    const u = await criarUsuario();
    const r = (await criar(u)).json as Relato;
    const resposta = await analisar(u, r);
    expect(resposta.status).toBe(200);
    expect(resposta.json).toMatchObject({
      estadoDaAnalise: 'indisponivel',
      textoOriginal: relato,
      textoOrganizado: null,
      analise: null,
    });
    expect((resposta.json as Relato).motivo).toMatch(/Nenhum modelo de IA/);
  });

  it('modelo em nuvem sem consentimento de nuvem não recebe o relato', async () => {
    await configurar('openai');
    try {
      const u = await criarUsuario();
      const r = (await criar(u)).json as Relato;
      const antes = recebidos.length;
      const resposta = await analisar(u, r);
      expect((resposta.json as Relato).estadoDaAnalise).toBe('indisponivel');
      expect((resposta.json as Relato).motivo).toMatch(/modelo de IA local/);
      expect(recebidos.length).toBe(antes);
    } finally {
      await voltarAoMotorDaLyra();
    }
  });

  it('contrato local: grava texto organizado, análise, autor e o céu do dia', async () => {
    await configurar('ollama');
    try {
      const u = await criarUsuario();
      const dia = await hoje(u);
      await executeStatement(
        "INSERT INTO daily_briefings(id,user_id,briefing_date,content,source,inputs_hash) VALUES(?,?,?,?,'local',REPEAT('a',64))",
        [
          randomUUID(),
          u.id,
          dia,
          JSON.stringify({
            data: dia,
            tom: 'favoravel',
            manchete: 'Um dia para encontros',
            ceu: {
              signoDaLua: 'Touro',
              tara: {
                nome: 'Sampat',
                qualidade: 'boa',
                sentido: 'prosperidade',
              },
              dasha: 'Período de Vênus',
            },
            ceuSimples: {
              itens: [{ termo: 'Clima do dia', valor: 'Acolhedor' }],
              tradicionais: [],
            },
          }),
        ]
      );
      modo = 'fiel';
      const r = (await criar(u)).json as Relato;
      const resposta = await analisar(u, r);
      expect(resposta.status).toBe(200);
      const pronto = resposta.json as Relato;
      expect(pronto).toMatchObject({
        estadoDaAnalise: 'pronta',
        textoOriginal: relato,
        textoOrganizado:
          'Hoje fui caminhar no parque com a minha irmã e me senti leve.',
        autor: { modelo: 'contrato-sem-inferencia', local: true },
        ceu: {
          signoDaLua: 'Touro',
          estrelaPessoal: { nome: 'Sampat', sentido: 'prosperidade' },
          periodoDeVida: 'Período de Vênus',
        },
      });
      expect(pronto.analise?.relacaoComOMapa).toMatch(/céu de hoje/);
      expect(recebidos.at(-1)).toMatchObject({
        relato,
        ceuDoDia: { signoDaLua: 'Touro' },
      });
      // Analisado não é refeito; a edição descarta a análise antiga.
      expect((await analisar(u, pronto)).status).toBe(409);
      const editado = (
        await chamar(item.PATCH, {
          method: 'PATCH',
          usuario: u,
          params: { id: r.id },
          body: { versao: pronto.versao, texto: `${relato} hoje` },
        })
      ).json as Relato;
      expect(editado).toMatchObject({
        estadoDaAnalise: 'pendente',
        textoOrganizado: null,
        analise: null,
      });
    } finally {
      await voltarAoMotorDaLyra();
    }
  });

  it('recusa texto organizado infiel e análise clínica sem gravar nada delas', async () => {
    await configurar('ollama');
    try {
      const u = await criarUsuario();
      for (const [m, motivo] of [
        ['acrescenta', /acrescentou|tamanho/],
        ['clinico', /linguagem clínica/],
      ] as const) {
        modo = m;
        const r = (await criar(u)).json as Relato;
        const resposta = (await analisar(u, r)).json as Relato;
        expect(resposta.estadoDaAnalise).toBe('falhou');
        expect(resposta.motivo).toMatch(motivo);
        expect(resposta.textoOrganizado).toBeNull();
        expect(resposta.analise).toBeNull();
        expect(resposta.textoOriginal).toBe(relato);
      }
    } finally {
      modo = 'fiel';
      await voltarAoMotorDaLyra();
    }
  });

  it('leva o relato à fila da memória só com a memória ligada', async () => {
    const desligada = await criarUsuario();
    expect(((await criar(desligada)).json as Relato).memoria).toBe(
      'desativada'
    );
    const ligada = await criarUsuario();
    await executeStatement(
      'INSERT INTO memory_preferences (user_id, enabled) VALUES (?, TRUE)',
      [ligada.id]
    );
    const r = (await criar(ligada)).json as Relato;
    expect(r.memoria).toBe('na_fila');
    const [episodio] = await queryRows<{ content: string }>(
      'SELECT content FROM memory_episodes WHERE user_id=?',
      [ligada.id]
    );
    expect(episodio.content).toBe(
      `Relato do diário pessoal de ${r.data}: ${relato}`
    );
  });
  it('integra linha do tempo sem o conteúdo, plano, exportação e exclusão da conta', async () => {
    const u = await criarUsuario();
    const r = (await criar(u)).json as Relato;
    const linha = await lerLinhaDoTempo(u.session, {
      inicio: r.data,
      fim: r.data,
      pagina: 0,
    });
    expect(linha.itens.find((i) => i.origem === 'diario')).toMatchObject({
      titulo: 'Relato no diário',
      resumo: 'Contado por voz · análise ainda não feita',
      destino: '/dia?aba=diario',
    });
    expect(JSON.stringify(linha)).not.toContain('caminhar no parque');
    const recurso = (ativo: boolean) =>
      executeStatement(
        "UPDATE plan_entitlements e JOIN subscription_plans p ON p.id=e.plan_id JOIN plan_features f ON f.id=e.feature_id SET e.enabled=? WHERE p.plan_key='free' AND f.feature_key='evening_reflection'",
        [ativo]
      );
    await recurso(false);
    try {
      expect((await chamar(diario.GET, { usuario: u })).status).toBe(403);
      expect((await criar(u, { data: r.data })).status).toBe(403);
      expect((await analisar(u, r)).status).toBe(403);
    } finally {
      await recurso(true);
    }
    const ex = await exportarDadosDoTitular(u.id);
    expect(ex.personal_diary_entries).toHaveLength(1);
    expect(JSON.stringify(ex.personal_diary_entries)).toContain(relato);
    await excluirConta(u.id);
    expect(
      await contar(
        'SELECT COUNT(*) total FROM personal_diary_entries WHERE user_id=?',
        [u.id]
      )
    ).toBe(0);
  });
});
