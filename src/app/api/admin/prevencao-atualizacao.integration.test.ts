import { afterAll, describe, expect, it } from 'vitest';

import type { EloDaCadeia } from '@/lib/ai/cadeia-de-modelos';
import {
  lerAcessoInternet,
  salvarAcessoInternet,
} from '@/lib/ai/internet/acesso';
import type { AcessoInternet } from '@/lib/ai/internet/dominios';
import { executeStatement, queryRows } from '@/lib/mysql/pool';
import {
  executarAtualizacao,
  iniciarAtualizacao,
  type Proposta,
} from '@/lib/prevencao/atualizacao-servico';

import { criarUsuario } from '../../../../tests/integration/fixtures';
import { chamar } from '../../../../tests/integration/http';
import { PATCH as alterarCatalogo } from './prevencao/route';
import { GET, PATCH, POST } from './prevencao/atualizacao/route';

interface Situacao {
  mensalPendente: boolean;
  ultima: {
    id: string;
    situacao: string;
    mensagem: string | null;
    autor: string | null;
    fontes: Array<{ url: string }>;
    propostasNovas: number;
  } | null;
  pendentes: Proposta[];
}

const PAGINA = 'https://www.gov.br/inca/teste-211';
const ACESSO: AcessoInternet = {
  modo: 'lista',
  dominios: ['gov.br'],
  atualizadoEm: '2026-11-17T00:00:00.000Z',
};

/** Exames só deste teste, para não mexer no catálogo usado por outros. */
async function criarExamesDeTeste(sufixo: string) {
  const ids = { a: `t211-a-${sufixo}`, b: `t211-b-${sufixo}` };
  for (const [id, nome, ordem] of [
    [ids.a, `Exame A ${sufixo}`, 900],
    [ids.b, `Exame B ${sufixo}`, 910],
  ] as const) {
    await executeStatement(
      `INSERT INTO prevencao_recomendacoes
         (id, nome, procura, publico, idade_minima, idade_maxima,
          intervalo_meses, tipo, orientacao, historico_relevante, fonte_nome,
          fonte_url, conferido, ordem)
       VALUES (?, ?, 'uma condição para o teste da tarefa 211', 'todos', 40,
               70, 24, 'rotina',
               'Orientação original do exame usada no teste de integração.',
               JSON_ARRAY('diabetes'), 'Fonte original do teste', ?, TRUE, ?)`,
      [id, nome, PAGINA, ordem]
    );
  }
  return ids;
}

function elo(modelo: string): EloDaCadeia {
  return {
    tipo: 'modelo',
    conexao: {
      tipo: 'openai_compativel',
      baseUrl: 'http://localhost:11434/v1',
      modelo,
      chave: null,
      tempoMaximoSegundos: 30,
      temperatura: 0.2,
    },
    autor: { provedor: 'Teste', modelo, local: true },
  };
}

/** Modelo falso: lê a página oficial e conclui com as propostas dadas. */
function modelo(propostas: unknown[]) {
  const passos = [
    { acao: 'ler', url: PAGINA },
    {
      acao: 'concluir',
      resultado: { propostas, resumo: 'Conferi a página do teste.' },
    },
  ];
  let indice = 0;
  return (async () => {
    const passo = passos[Math.min(indice, passos.length - 1)];
    indice += 1;
    return Response.json({
      choices: [
        {
          message: { role: 'assistant', content: JSON.stringify(passo) },
          finish_reason: 'stop',
        },
      ],
    });
  }) as typeof fetch;
}

const rede = (async (url: string | URL | Request) =>
  String(url) === PAGINA
    ? new Response(
        '<html><head><title>INCA teste</title></head><body><p>Recomendação oficial de teste.</p></body></html>',
        { headers: { 'content-type': 'text/html' } }
      )
    : new Response('não encontrado', { status: 404 })) as typeof fetch;

const dependencias = (propostas: unknown[]) => ({
  cadeia: [elo('pesquisador'), { tipo: 'lyra' as const }],
  acesso: ACESSO,
  buscar: rede,
  resolver: async () => ['200.152.38.1'],
  buscarModelo: modelo(propostas),
  env: {},
});

function dados(nome: string, mudancas: Record<string, unknown> = {}) {
  return {
    nome,
    procura: 'uma condição para o teste da tarefa 211',
    publico: 'todos',
    idadeMinima: 40,
    idadeMaxima: 70,
    intervaloMeses: 24,
    tipo: 'rotina',
    orientacao: 'Orientação original do exame usada no teste de integração.',
    historicoRelevante: ['diabetes'],
    fonteNome: 'INCA, página do teste da tarefa 211',
    fonteUrl: PAGINA,
    ...mudancas,
  };
}

describe('Atualização dos exames médicos pelo modelo de IA', () => {
  // Os exames criados aqui (e os aprovados pelo teste) saem do catálogo no
  // fim: o banco de teste é compartilhado e outros arquivos leem o catálogo.
  afterAll(async () => {
    await executeStatement(
      "DELETE FROM prevencao_recomendacoes WHERE id LIKE 't211-%'"
    );
  });

  it('só administradores consultam, pedem e decidem', async () => {
    expect((await chamar(GET, { usuario: null })).status).toBe(401);
    const pessoa = await criarUsuario();
    expect((await chamar(GET, { usuario: pessoa })).status).toBe(403);
    expect(
      (await chamar(POST, { usuario: pessoa, method: 'POST' })).status
    ).toBe(403);
    expect(
      (
        await chamar(PATCH, {
          usuario: pessoa,
          method: 'PATCH',
          body: { decisao: 'aprovar', propostas: 'todas' },
        })
      ).status
    ).toBe(403);
  });

  it('o pedido responde logo e registra a falha sem modelo ou sem internet', async () => {
    const admin = await criarUsuario('admin');
    // O acesso é uma configuração única do banco: devolvida ao fim do teste.
    const original = await lerAcessoInternet();
    await salvarAcessoInternet({ modo: 'desligado', dominios: [] }, admin.id);
    try {
      const resposta = await chamar(POST, { usuario: admin, method: 'POST' });
      expect(resposta.status).toBe(202);
      expect((resposta.json as Situacao).ultima?.situacao).toBe('em-andamento');

      const depois = (await chamar(GET, { usuario: admin })).json as Situacao;
      expect(depois.ultima?.situacao).toBe('falhou');
      expect(depois.ultima?.mensagem).toMatch(
        /Nenhum modelo de IA está configurado|desligado/
      );
      expect(depois.mensalPendente).toBe(true);
    } finally {
      await salvarAcessoInternet(original, admin.id);
    }
  });

  it('recusa um segundo pedido enquanto o primeiro está em andamento', async () => {
    const admin = await criarUsuario('admin');
    const id = await iniciarAtualizacao(admin.id);
    expect(
      (await chamar(POST, { usuario: admin, method: 'POST' })).status
    ).toBe(409);
    await executarAtualizacao(id, dependencias([]));
    const [linha] = await queryRows<{ situacao: string; mensagem: string }>(
      'SELECT situacao, mensagem FROM prevencao_atualizacoes WHERE id = ?',
      [id]
    );
    expect(linha.situacao).toBe('concluida');
    expect(linha.mensagem).toContain('Nenhum exame novo para revisar.');
  });

  it('marca para revisão, aplica só o aprovado e não traz de novo o decidido', async () => {
    const admin = await criarUsuario('admin');
    const sufixo = admin.id.slice(0, 8);
    const ids = await criarExamesDeTeste(sufixo);
    const novoNome = `Exame novo ${sufixo}`;
    const propostas = [
      {
        tipo: 'atualizar',
        id: ids.a,
        motivo: 'A fonte oficial passou a recomendar a partir dos 45 anos.',
        dados: dados(`Exame A ${sufixo}`, { idadeMinima: 45 }),
      },
      {
        tipo: 'novo',
        motivo: 'Exame recomendado oficialmente que falta no catálogo.',
        dados: dados(novoNome, { publico: 'mamas', historicoRelevante: [] }),
      },
      {
        tipo: 'retirar',
        id: ids.b,
        motivo: 'A fonte oficial deixou de recomendar este exame.',
        fonteNome: 'INCA, página do teste da tarefa 211',
        fonteUrl: PAGINA,
      },
      {
        tipo: 'atualizar',
        id: ids.a,
        motivo: 'Cita uma página que o modelo não leu.',
        dados: dados(`Exame A ${sufixo}`, {
          idadeMinima: 30,
          fonteUrl: 'https://www.gov.br/inca/inventada',
        }),
      },
    ];

    const primeira = await iniciarAtualizacao(admin.id);
    await executarAtualizacao(primeira, dependencias(propostas));
    const situacao = (await chamar(GET, { usuario: admin })).json as Situacao;
    expect(situacao.ultima).toMatchObject({
      id: primeira,
      situacao: 'concluida',
      autor: 'Teste · pesquisador',
      propostasNovas: 3,
      fontes: [{ url: PAGINA }],
    });
    expect(situacao.ultima?.mensagem).toContain(
      'cita uma página que não foi lida na pesquisa'
    );
    expect(situacao.mensalPendente).toBe(false);
    const minhas = situacao.pendentes.filter((p) =>
      p.recomendacaoId.includes(sufixo)
    );
    expect(minhas.map((p) => p.tipo).sort()).toEqual([
      'atualizar',
      'novo',
      'retirar',
    ]);
    const proposta = (tipo: string) => minhas.find((p) => p.tipo === tipo)!;

    // O modelo não mexeu no catálogo.
    const [antes] = await queryRows<{ idade_minima: number; ativo: number }>(
      'SELECT idade_minima, ativo FROM prevencao_recomendacoes WHERE id = ?',
      [ids.a]
    );
    expect(Number(antes.idade_minima)).toBe(40);

    const decidir = (body: unknown) =>
      chamar(PATCH, { usuario: admin, method: 'PATCH', body });
    expect(
      (await decidir({ decisao: 'aprovar', propostas: ['nao-e-uuid'] })).status
    ).toBe(400);
    const aprovadas = await decidir({
      decisao: 'aprovar',
      propostas: [proposta('atualizar').id, proposta('retirar').id],
    });
    expect(aprovadas.status).toBe(200);
    expect((aprovadas.json as { decididas: number }).decididas).toBe(2);
    expect(
      (
        await decidir({
          decisao: 'reprovar',
          propostas: [proposta('atualizar').id],
        })
      ).status
    ).toBe(409);
    expect(
      (
        await decidir({
          decisao: 'reprovar',
          propostas: [proposta('novo').id],
        })
      ).status
    ).toBe(200);

    const catalogo = await queryRows<{
      id: string;
      idade_minima: number;
      ativo: number;
      conferido: number;
      revisado_por: string | null;
    }>(
      `SELECT id, idade_minima, ativo, conferido, revisado_por
         FROM prevencao_recomendacoes WHERE id LIKE ? ORDER BY id`,
      [`%${sufixo}%`]
    );
    expect(
      catalogo.map((r) => ({
        id: r.id,
        idade: Number(r.idade_minima),
        ativo: Boolean(r.ativo),
        revisor: r.revisado_por,
      }))
    ).toEqual([
      { id: ids.a, idade: 45, ativo: true, revisor: admin.id },
      { id: ids.b, idade: 40, ativo: false, revisor: admin.id },
    ]);

    // Nova pesquisa com as mesmas propostas: nada volta ao administrador.
    const segunda = await iniciarAtualizacao(admin.id);
    await executarAtualizacao(segunda, dependencias(propostas));
    const depois = (await chamar(GET, { usuario: admin })).json as Situacao;
    expect(depois.ultima?.propostasNovas).toBe(0);
    expect(
      depois.pendentes.filter((p) => p.recomendacaoId.includes(sufixo))
    ).toEqual([]);
  });

  it('aprovar todos acrescenta o exame novo ao motor, sem apagar nada', async () => {
    const admin = await criarUsuario('admin');
    const sufixo = admin.id.slice(0, 8);
    await criarExamesDeTeste(sufixo);
    await chamar(PATCH, {
      usuario: admin,
      method: 'PATCH',
      body: { decisao: 'reprovar', propostas: 'todas' },
    });
    const id = await iniciarAtualizacao(admin.id);
    await executarAtualizacao(
      id,
      dependencias([
        {
          tipo: 'novo',
          id: `t211-novo-${sufixo}`,
          motivo: 'Exame recomendado oficialmente que falta no catálogo.',
          dados: dados(`Exame aprovado ${sufixo}`),
        },
      ])
    );
    const [total] = await queryRows<{ n: number }>(
      'SELECT COUNT(*) AS n FROM prevencao_recomendacoes'
    );
    const resposta = await chamar(PATCH, {
      usuario: admin,
      method: 'PATCH',
      body: { decisao: 'aprovar', propostas: 'todas' },
    });
    expect(resposta.status).toBe(200);
    expect((resposta.json as Situacao).pendentes).toEqual([]);
    const [novo] = await queryRows<{
      nome: string;
      ativo: number;
      conferido: number;
      ordem: number;
    }>(
      'SELECT nome, ativo, conferido, ordem FROM prevencao_recomendacoes WHERE id = ?',
      [`t211-novo-${sufixo}`]
    );
    expect(novo).toMatchObject({ nome: `Exame aprovado ${sufixo}` });
    expect(Boolean(novo.ativo)).toBe(true);
    expect(Boolean(novo.conferido)).toBe(true);
    const [depois] = await queryRows<{ n: number }>(
      'SELECT COUNT(*) AS n FROM prevencao_recomendacoes'
    );
    expect(Number(depois.n)).toBe(Number(total.n) + 1);
  });

  it('o pop-up do administrador edita todas as informações do exame', async () => {
    const admin = await criarUsuario('admin');
    const sufixo = admin.id.slice(0, 8);
    const ids = await criarExamesDeTeste(sufixo);
    const alterar = (body: Record<string, unknown>) =>
      chamar(alterarCatalogo, {
        usuario: admin,
        method: 'PATCH',
        body: { acao: 'alterar', id: ids.a, ...body },
      });
    const resposta = await alterar({
      publico: 'colo-do-utero',
      tipo: 'conversa',
      historicoRelevante: ['avc', 'diabetes', 'avc'],
      idadeMaxima: null,
      intervaloMeses: null,
    });
    expect(resposta.status).toBe(200);
    const [linha] = await queryRows<{
      publico: string;
      tipo: string;
      historico_relevante: unknown;
      idade_maxima: number | null;
    }>(
      `SELECT publico, tipo, historico_relevante, idade_maxima
         FROM prevencao_recomendacoes WHERE id = ?`,
      [ids.a]
    );
    expect(linha).toMatchObject({
      publico: 'colo-do-utero',
      tipo: 'conversa',
      idade_maxima: null,
    });
    const historico =
      typeof linha.historico_relevante === 'string'
        ? JSON.parse(linha.historico_relevante)
        : linha.historico_relevante;
    expect(historico).toEqual(['avc', 'diabetes']);

    // Só a idade mínima, acima da máxima gravada: recusada.
    await alterar({ idadeMaxima: 60 });
    expect((await alterar({ idadeMinima: 65 })).status).toBe(400);
    expect((await alterar({ publico: 'pulmao' })).status).toBe(400);
    expect((await alterar({ historicoRelevante: ['gripe'] })).status).toBe(400);
  });
});
