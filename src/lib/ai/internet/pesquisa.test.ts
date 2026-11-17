import { describe, expect, it } from 'vitest';

import type { EloDaCadeia } from '@/lib/ai/cadeia-de-modelos';

import type { AcessoInternet } from './dominios';
import {
  enderecoDaPagina,
  esquemaDoPasso,
  montarRegistro,
  type Observacao,
  pesquisarNaInternet,
} from './pesquisa';

const LISTA: AcessoInternet = {
  modo: 'lista',
  dominios: ['gov.br'],
  atualizadoEm: '2026-11-17T00:00:00.000Z',
};
const PAGINA = 'https://www.gov.br/inca/mama';
const INEXISTENTE = 'https://www.gov.br/inca/nao-existe';

function elo(): EloDaCadeia {
  return {
    tipo: 'modelo',
    conexao: {
      tipo: 'openai_compativel',
      baseUrl: 'http://127.0.0.1:11434/v1',
      modelo: 'qwen3.5:4b',
      chave: null,
      tempoMaximoSegundos: 30,
      temperatura: 0.2,
    },
    autor: { provedor: 'Ollama', modelo: 'qwen3.5:4b', local: true },
  };
}

/** Modelo falso: segue o roteiro e guarda os corpos dos pedidos. */
function modelo(passos: unknown[]) {
  const pedidos: Array<Record<string, unknown>> = [];
  const buscarModelo = (async (
    _url: string | URL | Request,
    init?: RequestInit
  ) => {
    pedidos.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    const passo = passos[Math.min(pedidos.length - 1, passos.length - 1)];
    return Response.json({
      choices: [
        {
          message: { role: 'assistant', content: JSON.stringify(passo) },
          finish_reason: 'stop',
        },
      ],
    });
  }) as typeof fetch;
  return { buscarModelo, pedidos };
}

function rede() {
  const pedidas: string[] = [];
  const buscar = (async (url: string | URL | Request) => {
    pedidas.push(String(url));
    return String(url) === PAGINA
      ? new Response(
          '<html><head><title>INCA</title></head><body><p>Mamografia de 50 a 74 anos.</p></body></html>',
          { headers: { 'content-type': 'text/html' } }
        )
      : new Response('não encontrado', { status: 404 });
  }) as typeof fetch;
  return { buscar, pedidas };
}

const ultimaMensagem = (pedido: Record<string, unknown>) =>
  (pedido.messages as Array<{ content: string }>).at(-1)!.content;

describe('Registro da pesquisa', () => {
  it('resume as observações antigas em vez de apagar o começo', () => {
    const observacoes: Observacao[] = [1, 2, 3].map((passo) => ({
      passo,
      pedido: `Leitura: https://www.gov.br/p${passo}`,
      resposta: `Texto da página ${passo}. ${'x'.repeat(5_000)}`,
    }));
    const lidas = new Map(
      observacoes.map((o) => [
        enderecoDaPagina(`https://www.gov.br/p${o.passo}`),
        { passo: o.passo, url: `https://www.gov.br/p${o.passo}` },
      ])
    );
    const registro = montarRegistro(observacoes, lidas, 8_000);
    expect(registro.length).toBeLessThanOrEqual(8_000);
    expect(registro).toContain('Páginas já lidas');
    expect(registro).toContain('- passo 1: https://www.gov.br/p1');
    expect(registro).toContain('[Passo 1] Leitura: https://www.gov.br/p1');
    expect(registro).toContain('Texto da página 1.');
    expect(registro).toContain('(resumido para caber no registro)');
    // A observação mais recente fica inteira.
    expect(registro).toContain(`Texto da página 3. ${'x'.repeat(5_000)}`);
  });

  it('compara endereços sem www, barra final ou fragmento', () => {
    expect(enderecoDaPagina('https://www.gov.br/inca/#topo')).toBe(
      enderecoDaPagina('https://gov.br/inca')
    );
  });
});

describe('Formato imposto a cada passo', () => {
  it('o último passo só aceita concluir, no esquema da tarefa', () => {
    const resultado = { type: 'object', properties: { x: { type: 'string' } } };
    expect(esquemaDoPasso(true, false, resultado)).toEqual({
      type: 'object',
      properties: {
        acao: { type: 'string', const: 'concluir' },
        resultado,
      },
      required: ['acao', 'resultado'],
      additionalProperties: false,
    });
    const meio = esquemaDoPasso(false, false) as { anyOf: unknown[] };
    expect(JSON.stringify(meio)).not.toContain('"buscar"');
    const comBusca = esquemaDoPasso(false, true) as { anyOf: unknown[] };
    expect(comBusca.anyOf).toHaveLength(3);
  });

  it('o pedido ao modelo leva o esquema como saída estruturada', async () => {
    const { buscarModelo, pedidos } = modelo([
      { acao: 'concluir', resultado: { x: 'ok' } },
    ]);
    await pesquisarNaInternet({
      cadeia: [elo(), { tipo: 'lyra' }],
      tarefa: 'Teste',
      rotulo: 'teste',
      instrucoes: 'Pesquise.',
      acesso: LISTA,
      maximoDePassos: 3,
      maximoDeTokens: 12_288,
      esquemaDoResultado: { type: 'object' },
      buscarModelo,
      env: {},
    });
    expect(pedidos[0]).toMatchObject({
      max_tokens: 12_288,
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'passo_da_pesquisa' },
      },
      // Modelo Qwen 3 local: raciocínio desligado no JSON.
      reasoning_effort: 'none',
    });
  });
});

describe('Leituras repetidas', () => {
  it('não relê página lida nem repete página recusada', async () => {
    const { buscar, pedidas } = rede();
    const { buscarModelo, pedidos } = modelo([
      { acao: 'ler', url: PAGINA },
      { acao: 'ler', url: `${PAGINA}/#topo` },
      { acao: 'ler', url: INEXISTENTE },
      { acao: 'ler', url: INEXISTENTE },
      { acao: 'concluir', resultado: { faixa: '50 a 74' } },
    ]);
    const pesquisa = await pesquisarNaInternet({
      cadeia: [elo(), { tipo: 'lyra' }],
      tarefa: 'Qual a faixa da mamografia?',
      rotulo: 'teste',
      instrucoes: 'Pesquise.',
      acesso: LISTA,
      buscar,
      resolver: async () => ['200.152.38.1'],
      buscarModelo,
      env: {},
    });
    expect(pedidas).toEqual([PAGINA, INEXISTENTE]);
    expect(pesquisa.fontes).toEqual([{ url: PAGINA, titulo: 'INCA' }]);
    expect(ultimaMensagem(pedidos[2])).toContain(
      'Esta página já foi lida no passo 1'
    );
    expect(ultimaMensagem(pedidos[4])).toContain(
      'Esta página já foi recusada no passo 3 (HTTP 404)'
    );
  });

  it('o erro final diz o motivo de cada modelo', async () => {
    const { buscarModelo } = modelo(['texto livre, fora do protocolo']);
    await expect(
      pesquisarNaInternet({
        cadeia: [elo(), { tipo: 'lyra' }],
        tarefa: 'Teste',
        rotulo: 'teste',
        instrucoes: 'Pesquise.',
        acesso: LISTA,
        buscarModelo,
        env: {},
      })
    ).rejects.toThrow(
      /passo 1; Ollama · qwen3\.5:4b: recusado \(resposta fora do protocolo de pesquisa\)/
    );
  });
});
