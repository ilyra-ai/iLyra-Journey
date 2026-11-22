import { afterEach, describe, expect, it } from 'vitest';

import { iniciarServidorOpenAiCompativel } from '../../../tests/support/servidor-openai-compativel';

import { gerarNaCadeia } from './cadeia-de-modelos';
import { lerFluxoDoProvedor } from './fluxo-de-texto';
import {
  definirRegistroDoUso,
  registrarUso,
  type RegistroDeUso,
  usoDoCorpo,
} from './uso';

afterEach(() => definirRegistroDoUso(null));

function fluxo(eventos: unknown[]) {
  const texto = eventos.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('');
  return new Response(`${texto}data: [DONE]\n\n`).body!;
}

describe('uso de tokens das chamadas de IA (tarefa 163)', () => {
  it('lê o uso informado por OpenAI/Ollama, Gemini e Anthropic', () => {
    expect(
      usoDoCorpo('openai_compativel', {
        usage: {
          prompt_tokens: 100,
          completion_tokens: 40,
          completion_tokens_details: { reasoning_tokens: 10 },
        },
      })
    ).toEqual({ entrada: 100, saida: 40, raciocinio: 10 });
    expect(
      usoDoCorpo('gemini', {
        usageMetadata: {
          promptTokenCount: 80,
          candidatesTokenCount: 30,
          thoughtsTokenCount: 5,
        },
      })
    ).toEqual({ entrada: 80, saida: 30, raciocinio: 5 });
    expect(
      usoDoCorpo('anthropic', {
        usage: { input_tokens: 60, output_tokens: 20 },
      })
    ).toEqual({ entrada: 60, saida: 20, raciocinio: null });
  });

  it('sem uso informado ou com valores inválidos, os tokens ficam desconhecidos', () => {
    const desconhecido = { entrada: null, saida: null, raciocinio: null };
    expect(usoDoCorpo('openai_compativel', {})).toEqual(desconhecido);
    expect(usoDoCorpo('gemini', null)).toEqual(desconhecido);
    expect(
      usoDoCorpo('openai_compativel', {
        usage: { prompt_tokens: -1, completion_tokens: 'muitos' },
      })
    ).toEqual(desconhecido);
  });

  it('o streaming guarda o uso de cada provedor', async () => {
    const openai = (await lerFluxoDoProvedor(
      fluxo([
        { choices: [{ delta: { content: 'Olá' } }] },
        { choices: [{ delta: {}, finish_reason: 'stop' }] },
        { choices: [], usage: { prompt_tokens: 9, completion_tokens: 2 } },
      ]),
      'openai_compativel',
      () => undefined
    )) as unknown;
    expect(usoDoCorpo('openai_compativel', openai)).toMatchObject({
      entrada: 9,
      saida: 2,
    });
    const anthropic = (await lerFluxoDoProvedor(
      fluxo([
        {
          type: 'message_start',
          message: { usage: { input_tokens: 15, output_tokens: 1 } },
        },
        {
          type: 'content_block_delta',
          delta: { type: 'text_delta', text: 'Oi' },
        },
        {
          type: 'message_delta',
          delta: { stop_reason: 'end_turn' },
          usage: { output_tokens: 4 },
        },
        { type: 'message_stop' },
      ]),
      'anthropic',
      () => undefined
    )) as unknown;
    expect(usoDoCorpo('anthropic', anthropic)).toEqual({
      entrada: 15,
      saida: 4,
      raciocinio: null,
    });
  });

  it('sem registro ligado nada é gravado; com ele, a falha não derruba a chamada', async () => {
    registrarUso({} as RegistroDeUso);
    definirRegistroDoUso(() => Promise.reject(new Error('banco fora')));
    expect(() => registrarUso({} as RegistroDeUso)).not.toThrow();
  });

  it('a cadeia registra cada tentativa com titular, resultado e tokens, sem conteúdo', async () => {
    const registros: RegistroDeUso[] = [];
    definirRegistroDoUso(async (r) => {
      registros.push(r);
    });
    const servidor = await iniciarServidorOpenAiCompativel();
    try {
      servidor.responder('Resposta com dado sensível');
      const conexao = {
        tipo: 'openai_compativel' as const,
        baseUrl: servidor.baseUrl,
        modelo: 'modelo-teste',
        chave: null,
        tempoMaximoSegundos: 5,
        temperatura: 0.2,
      };
      const autor = { provedor: 'Teste', modelo: 'modelo-teste', local: true };
      await gerarNaCadeia(
        [{ tipo: 'modelo', conexao, autor }, { tipo: 'lyra' }],
        { sistema: 's', usuario: 'pergunta íntima' },
        {
          rotulo: 'chat',
          titular: '7b0c5d8e-3f4a-4b6c-9d2e-1a2b3c4d5e6f',
          validar: (texto) =>
            texto.includes('sensível') ? 'recusa de teste' : null,
        }
      );
    } finally {
      await servidor.fechar();
    }
    expect(registros).toHaveLength(1);
    expect(registros[0]).toMatchObject({
      titular: '7b0c5d8e-3f4a-4b6c-9d2e-1a2b3c4d5e6f',
      rotulo: 'chat',
      provedor: 'Teste',
      modelo: 'modelo-teste',
      local: true,
      resultado: 'recusado',
      uso: { entrada: 12, saida: 7, raciocinio: null },
    });
    expect(JSON.stringify(registros)).not.toMatch(/íntima|sensível/);
  });
});
