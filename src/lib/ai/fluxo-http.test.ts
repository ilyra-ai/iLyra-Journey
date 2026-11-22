import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { expect, it } from 'vitest';
import { gerarTextoDetalhado } from './cliente-de-ia';

it('recebe texto por HTTP antes do encerramento real do provedor compatível', async () => {
  let encerrar: (() => void) | undefined;
  let terminou = false;
  const servidor = createServer((pedido, resposta) => {
    pedido.resume();
    pedido.on('end', () => {
      resposta.writeHead(200, { 'Content-Type': 'text/event-stream' });
      resposta.write(
        `data: ${JSON.stringify({ choices: [{ delta: { content: 'Olá, ' } }] })}\n\n`
      );
      encerrar = () => {
        terminou = true;
        resposta.end(
          `data: ${JSON.stringify({ choices: [{ delta: { content: 'vamos cuidar de você.' }, finish_reason: 'stop' }] })}\n\ndata: [DONE]\n\n`
        );
      };
    });
  });
  await new Promise<void>((resolve) =>
    servidor.listen(0, '127.0.0.1', resolve)
  );
  try {
    const vistos: string[] = [];
    const resultado = await gerarTextoDetalhado(
      {
        tipo: 'openai_compativel',
        baseUrl: `http://127.0.0.1:${(servidor.address() as AddressInfo).port}/v1`,
        modelo: 'contrato-http-do-teste',
        chave: null,
        temperatura: 0.3,
        tempoMaximoSegundos: 5,
      },
      {
        sistema: 'Contrato de transporte em teste.',
        usuario: 'Olá',
        aoTexto: (texto) => {
          vistos.push(texto);
          if (vistos.length === 1) {
            expect(terminou).toBe(false);
            encerrar?.();
          }
        },
      }
    );
    expect(vistos).toEqual(['Olá, ', 'Olá, vamos cuidar de você.']);
    expect(resultado).toEqual({
      texto: 'Olá, vamos cuidar de você.',
      cortado: false,
      // Este servidor não informa o uso de tokens (tarefa 163).
      uso: { entrada: null, saida: null, raciocinio: null },
    });
  } finally {
    encerrar?.();
    servidor.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      servidor.close((erro) => (erro ? reject(erro) : resolve()))
    );
  }
});
