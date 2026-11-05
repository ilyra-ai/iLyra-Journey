import { mkdtemp, open, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { arquiteturaGguf } from './gguf';

const pastas: string[] = [];
const u32 = (valor: number) => {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(valor);
  return b;
};
const u64 = (valor: bigint) => {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(valor);
  return b;
};
const texto = (valor: string) =>
  Buffer.concat([u64(BigInt(Buffer.byteLength(valor))), Buffer.from(valor)]);
const entrada = (chave: string, tipo: number, valor: Buffer) =>
  Buffer.concat([texto(chave), u32(tipo), valor]);
const cabecalho = (entradas: Buffer[], versao = 3, tensores = BigInt(1)) =>
  Buffer.concat([
    Buffer.from('GGUF'),
    u32(versao),
    u64(tensores),
    u64(BigInt(entradas.length)),
    ...entradas,
  ]);

async function ler(conteudo: Buffer) {
  const pasta = await mkdtemp(path.join(tmpdir(), 'lyra-gguf-'));
  pastas.push(pasta);
  const caminho = path.join(pasta, 'arquivo.gguf');
  await writeFile(caminho, conteudo);
  const arquivo = await open(caminho, 'r');
  try {
    return await arquiteturaGguf(arquivo);
  } finally {
    await arquivo.close();
  }
}

afterEach(async () => {
  await Promise.all(
    pastas.splice(0).map((pasta) => rm(pasta, { recursive: true }))
  );
});

describe('Metadados GGUF em arquivos reais', () => {
  it.each([2, 3])('lê a arquitetura na versão %i', async (versao) => {
    expect(
      await ler(
        cabecalho([entrada('general.architecture', 8, texto('qwen35'))], versao)
      )
    ).toBe('qwen35');
  });

  it('distingue o projetor de visão pelo metadado, independentemente do nome', async () => {
    expect(
      await ler(cabecalho([entrada('general.architecture', 8, texto('clip'))]))
    ).toBe('clip');
  });

  it('atravessa escalares, textos e arrays anteriores à arquitetura', async () => {
    expect(
      await ler(
        cabecalho([
          entrada('general.name', 8, texto('Modelo português')),
          entrada('general.quantization_version', 4, u32(2)),
          entrada(
            'tokenizer.tokens',
            9,
            Buffer.concat([
              u32(8),
              u64(BigInt(2)),
              texto('olá'),
              texto('mundo'),
            ])
          ),
          entrada(
            'tokenizer.scores',
            9,
            Buffer.concat([u32(6), u64(BigInt(2)), Buffer.alloc(8)])
          ),
          entrada('general.architecture', 8, texto('llama')),
        ])
      )
    ).toBe('llama');
  });

  it('recusa cabeçalhos truncados, versões desconhecidas e arquivos sem tensores', async () => {
    for (const buffer of [
      Buffer.from('GGUF'),
      cabecalho([], 99),
      cabecalho([], 3, BigInt(0)),
    ])
      expect(await ler(buffer)).toBeNull();
  });

  it('recusa comprimentos maliciosos sem alocar a memória solicitada', async () => {
    expect(await ler(cabecalho([u64(BigInt(2) ** BigInt(63))]))).toBeNull();
    expect(
      await ler(cabecalho([entrada('general.architecture', 4, u32(123))]))
    ).toBeNull();
  });
});
