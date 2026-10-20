import { describe, expect, it, vi } from 'vitest';

import {
  buscarComAcessoLocal,
  conexaoFoiRecusada,
  configuracaoDoCurlLocal,
  loopbackDoWindowsNoWsl,
  respostaDoCurlLocal,
} from './transporte-local-wsl';

describe('acesso aos provedores locais entre Windows e WSL', () => {
  it('restringe o transporte ao loopback em WSL, preservando a porta e o protocolo', () => {
    for (const host of ['127.0.0.1', 'localhost', '[::1]']) {
      expect(
        loopbackDoWindowsNoWsl(
          `http://${host}:1337/v1`,
          'linux',
          'microsoft-WSL2'
        )
      ).toBe(true);
    }
    for (const url of [
      'http://192.168.1.20:1337/v1',
      'https://api.openai.com/v1',
      'http://127.evil.example/v1',
      'ftp://127.0.0.1:1337',
      'http://usuario:senha@127.0.0.1:1337/v1',
    ]) {
      expect(loopbackDoWindowsNoWsl(url, 'linux', 'microsoft-WSL2')).toBe(
        false
      );
    }
    expect(
      loopbackDoWindowsNoWsl('http://localhost:1337/v1', 'linux', 'Linux')
    ).toBe(false);
    expect(
      loopbackDoWindowsNoWsl('http://localhost:1337/v1', 'win32', 'Windows')
    ).toBe(false);
  });

  it('reconhece a recusa direta, encadeada e agregada sem repetir timeout ou erro ambíguo', () => {
    const recusada = Object.assign(new Error('conexão recusada'), {
      code: 'ECONNREFUSED',
    });
    expect(conexaoFoiRecusada(recusada)).toBe(true);
    expect(
      conexaoFoiRecusada(new TypeError('fetch failed', { cause: recusada }))
    ).toBe(true);
    expect(conexaoFoiRecusada(new AggregateError([recusada, recusada]))).toBe(
      true
    );
    expect(
      conexaoFoiRecusada(
        new AggregateError([recusada, new Error('outro erro')])
      )
    ).toBe(false);
    expect(
      conexaoFoiRecusada(new DOMException('tempo esgotado', 'TimeoutError'))
    ).toBe(false);
    expect(
      conexaoFoiRecusada(new Error('ECONNREFUSED escrito na resposta HTTP'))
    ).toBe(false);
    expect(conexaoFoiRecusada(null)).toBe(false);
  });

  it('escapa aspas e quebras de linha sem criar opções de curl ou interpretar arquivos', () => {
    const corpo = '@arquivo\nurl = "https://outro.example"\r\n\\fim';
    const config = configuracaoDoCurlLocal(
      'http://127.0.0.1:1337/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer chave-de-teste',
          'Content-Type': 'application/json',
        },
        body: corpo,
      }
    );
    expect(config.trimEnd().split('\n')).toHaveLength(5);
    expect(config).toContain('header = "authorization: Bearer chave-de-teste"');
    expect(config).toContain(
      'data-raw = "@arquivo\\nurl = \\"https://outro.example\\"\\r\\n\\\\fim"'
    );
    expect(config).not.toContain('data-binary');
  });

  it('preserva o corpo UTF-8 e o status de sucesso ou falha retornado pelo provedor', async () => {
    const sucesso = respostaDoCurlLocal(
      '{"resposta":"Conexão disponível!"}\n200'
    );
    expect(sucesso.status).toBe(200);
    expect(await sucesso.json()).toEqual({ resposta: 'Conexão disponível!' });
    const falha = respostaDoCurlLocal('{"error":"Chave inválida"}\n401');
    expect(falha.status).toBe(401);
    expect(await falha.json()).toEqual({ error: 'Chave inválida' });
    expect(await respostaDoCurlLocal('\n204').text()).toBe('');
    expect(() => respostaDoCurlLocal('sem status')).toThrow(
      /status HTTP válido/
    );
    expect(() => respostaDoCurlLocal('\n000')).toThrow(/status HTTP válido/);
  });

  it('usa a resposta HTTP nativa sem repetir uma recusa HTTP de autenticação', async () => {
    const resposta = new Response('{"error":"sem autorização"}', {
      status: 401,
    });
    const buscar = vi.fn<typeof fetch>().mockResolvedValue(resposta);
    expect(
      await buscarComAcessoLocal('http://127.0.0.1:1337/v1/models', {}, buscar)
    ).toBe(resposta);
    expect(buscar).toHaveBeenCalledTimes(1);
  });

  it('não repete geração com tempo esgotado nem usa o Windows para endpoints remotos', async () => {
    const timeout = new DOMException('tempo esgotado', 'TimeoutError');
    const buscar = vi.fn<typeof fetch>().mockRejectedValue(timeout);
    await expect(
      buscarComAcessoLocal(
        'http://127.0.0.1:1337/v1/chat/completions',
        {},
        buscar
      )
    ).rejects.toBe(timeout);
    const recusada = Object.assign(new Error('recusada'), {
      code: 'ECONNREFUSED',
    });
    buscar.mockRejectedValue(recusada);
    await expect(
      buscarComAcessoLocal('https://api.openai.com/v1/models', {}, buscar)
    ).rejects.toBe(recusada);
    expect(buscar).toHaveBeenCalledTimes(2);
  });
});
