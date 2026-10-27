import { describe, expect, it } from 'vitest';
import { eventosSse } from './eventos-sse';
import { enviarAoChat } from './transporte';
import { partesDoBanco, partesDoChatSchema } from './partes';
import {
  lerFluxoDoProvedor,
  textoPublicoDoFluxo,
} from '@/lib/ai/fluxo-de-texto';

function corpo(texto: string, tamanho = 3) {
  const bytes = new TextEncoder().encode(texto);
  return new ReadableStream<Uint8Array>({
    start(controle) {
      for (let i = 0; i < bytes.length; i += tamanho)
        controle.enqueue(bytes.slice(i, i + tamanho));
      controle.close();
    },
  });
}
const sse = (...eventos: unknown[]) =>
  eventos.map((evento) => `data: ${JSON.stringify(evento)}\n\n`).join('');

describe('contratos do chat progressivo', () => {
  it('decodifica UTF-8 partido, CRLF e dados multilinha sem perder acentos', async () => {
    const recebidos = [];
    for await (const evento of eventosSse(
      corpo(': comentário\r\ndata: Olá ❤️\r\ndata: João\r\n\r\n', 1)
    ))
      recebidos.push(evento);
    expect(recebidos).toEqual(['Olá ❤️\nJoão']);
  });
  it('recusa eventos excessivos mesmo quando chegam completos', async () => {
    const fluxo = eventosSse(corpo(`data: ${'x'.repeat(262145)}\n\n`, 300000));
    await expect(fluxo.next()).rejects.toThrow('tamanho permitido');
  });
  it.each(['<', '<t', '<thi', '<think>segredo', '<think>segredo</think>'])(
    'não expõe pensamento parcial em %s',
    (texto) => {
      expect(textoPublicoDoFluxo(`Olá ${texto}`)).toBe('Olá ');
    }
  );
  it('aceita histórico textual antigo e recusa versões e componentes desconhecidos', () => {
    expect(partesDoBanco(null)).toEqual([]);
    expect(
      partesDoChatSchema.safeParse([{ tipo: 'html', codigo: '<script>' }])
        .success
    ).toBe(false);
    expect(
      partesDoChatSchema.safeParse([{ tipo: 'painel', versao: 2 }]).success
    ).toBe(false);
  });
  it('transmite somente texto público da API compatível e exige encerramento', async () => {
    const vistos: string[] = [];
    const resultado = await lerFluxoDoProvedor(
      corpo(
        sse(
          { choices: [{ delta: { content: '<thi' } }] },
          { choices: [{ delta: { content: 'nk>segredo</think>Olá' } }] },
          { choices: [{ delta: {}, finish_reason: 'length' }] }
        )
      ),
      'openai_compativel',
      (texto) => vistos.push(texto)
    );
    expect(vistos).toEqual(['', 'Olá']);
    expect(resultado).toMatchObject({ choices: [{ finish_reason: 'length' }] });
    await expect(
      lerFluxoDoProvedor(
        corpo(sse({ choices: [{ delta: { content: 'Olá' } }] })),
        'openai_compativel',
        () => {}
      )
    ).rejects.toThrow('antes da conclusão');
  });
  it('não apresenta partes de pensamento do Gemini', async () => {
    const vistos: string[] = [];
    await lerFluxoDoProvedor(
      corpo(
        sse({
          candidates: [
            {
              content: {
                parts: [{ thought: true, text: 'segredo' }, { text: 'Olá' }],
              },
              finishReason: 'STOP',
            },
          ],
        })
      ),
      'gemini',
      (texto) => vistos.push(texto)
    );
    expect(vistos).toEqual(['Olá']);
  });
  it('ignora pensamento e acumula deltas de texto da Anthropic', async () => {
    const vistos: string[] = [];
    await lerFluxoDoProvedor(
      corpo(
        sse(
          {
            type: 'content_block_delta',
            delta: { type: 'thinking_delta', text: 'segredo' },
          },
          {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: 'Olá' },
          },
          { type: 'message_delta', delta: { stop_reason: 'end_turn' } },
          { type: 'message_stop' }
        )
      ),
      'anthropic',
      (texto) => vistos.push(texto)
    );
    expect(vistos).toEqual(['Olá']);
  });
  it('retira rascunho recusado e só conclui com resultado autoritativo', async () => {
    const vistos: string[] = [];
    const buscar: typeof fetch = async () =>
      new Response(
        corpo(
          sse(
            {
              type: 'data-texto',
              data: { conteudo: 'Rascunho', reiniciar: false },
            },
            { type: 'data-texto', data: { conteudo: 'Olá', reiniciar: true } },
            {
              type: 'data-resultado',
              data: { response: 'Olá, resposta conferida.', partes: [] },
            }
          )
        ),
        { headers: { 'Content-Type': 'text/event-stream' } }
      );
    expect(
      await enviarAoChat(
        {},
        new AbortController().signal,
        (texto) => vistos.push(texto),
        buscar
      )
    ).toMatchObject({ response: 'Olá, resposta conferida.' });
    expect(vistos).toEqual(['Rascunho', 'Olá']);
  });
  it('não trata uma resposta truncada como sucesso nem HTML de proxy como JSON', async () => {
    await expect(
      enviarAoChat(
        {},
        new AbortController().signal,
        () => {},
        async () =>
          new Response(
            corpo(
              sse({
                type: 'data-texto',
                data: { conteudo: 'metade', reiniciar: false },
              })
            ),
            { headers: { 'Content-Type': 'text/event-stream' } }
          )
      )
    ).rejects.toThrow('antes de concluir');
    await expect(
      enviarAoChat(
        {},
        new AbortController().signal,
        () => {},
        async () => new Response('<html>Erro</html>', { status: 502 })
      )
    ).rejects.toThrow('HTTP 502');
  });
  it('preserva JSON de provedores sem transmissão e respeita cancelamento', async () => {
    expect(
      await enviarAoChat(
        {},
        new AbortController().signal,
        () => {},
        async () => Response.json({ response: 'Resposta completa.' })
      )
    ).toMatchObject({ response: 'Resposta completa.' });
    const controle = new AbortController();
    controle.abort();
    await expect(
      eventosSse(corpo('data: texto\n\n'), controle.signal).next()
    ).rejects.toThrow();
  });
});
