import { describe, expect, it } from 'vitest';

import { GET } from './cartao/[identificador]/route';

async function pedir(identificador: string, consulta = '') {
  return GET(
    new Request(
      `http://localhost/api/public/cartao/${identificador}${consulta}`
    ),
    { params: Promise.resolve({ identificador }) }
  );
}

/** Largura e altura gravadas no cabeçalho IHDR do PNG. */
function dimensoes(png: Buffer) {
  expect(png.subarray(1, 4).toString('ascii')).toBe('PNG');
  return { largura: png.readUInt32BE(16), altura: png.readUInt32BE(20) };
}

describe('imagem do cartão compartilhável (tarefa 168)', () => {
  it('gera o PNG do signo em retrato 4:5, com cache público', async () => {
    const resposta = await pedir('leao');
    expect(resposta.status).toBe(200);
    expect(resposta.headers.get('content-type')).toBe('image/png');
    expect(resposta.headers.get('cache-control')).toContain('public');
    expect(dimensoes(Buffer.from(await resposta.arrayBuffer()))).toEqual({
      largura: 1080,
      altura: 1350,
    });
  });

  it('gera o cartão sem signo no formato de Stories 9:16', async () => {
    const resposta = await pedir('ocidental', '?formato=stories');
    expect(resposta.status).toBe(200);
    expect(dimensoes(Buffer.from(await resposta.arrayBuffer()))).toEqual({
      largura: 1080,
      altura: 1920,
    });
  });

  it('identificador desconhecido ou com caminho dá 404, sem ler arquivo', async () => {
    for (const id of ['ophiuchus', '..%2Fleao', 'Leão'])
      expect((await pedir(id)).status).toBe(404);
  });
});
