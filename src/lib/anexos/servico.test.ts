import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { processarAnexo } from './servico';
import { pedidoDeContinuacao } from '@/lib/ai/cadeia-de-modelos';
describe('validação real dos bytes dos anexos', () => {
  it('decodifica imagens, normaliza a orientação e retira EXIF', async () => {
    const entrada = await sharp({
      create: { width: 12, height: 8, channels: 3, background: 'white' },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    const a = await processarAnexo('foto.jpg', 'image/jpeg', entrada),
      meta = await sharp(a.bytes).metadata();
    expect(a.nome).toBe('foto.png');
    expect(meta.width).toBe(8);
    expect(meta.height).toBe(12);
    expect(meta.exif).toBeUndefined();
  });
  it('recusa imagem falsificada, truncada e tipos ativos', async () => {
    for (const [nome, tipo, b] of [
      ['f.png', 'image/png', Buffer.from('não é PNG')],
      ['f.svg', 'image/svg+xml', Buffer.from('<svg/>')],
      ['f.pdf', 'application/pdf', Buffer.from('%PDF-1.4')],
    ] as const)
      await expect(processarAnexo(nome, tipo, b)).rejects.toHaveProperty(
        'statusCode'
      );
    const png = await sharp({
      create: { width: 20, height: 20, channels: 3, background: 'white' },
    })
      .png()
      .toBuffer();
    await expect(
      processarAnexo('x.png', 'image/jpeg', png)
    ).rejects.toHaveProperty('statusCode', 400);
    await expect(
      processarAnexo('x.png', 'image/png', png.subarray(0, 40))
    ).rejects.toHaveProperty('statusCode', 400);
  });
  it('preserva zero, Unicode e linhas; recusa UTF-8 inválido e controles', async () => {
    const texto = 'Percepção: 0\r\nÁgua: 250 ml\n';
    expect(
      (await processarAnexo('relato.txt', 'text/plain', Buffer.from(texto)))
        .texto
    ).toBe(texto);
    for (const b of [
      Buffer.from([0xff]),
      Buffer.from('a\x00b'),
      Buffer.from('a'.repeat(8001)),
      Buffer.alloc(0),
      Buffer.alloc(3 * 1024 * 1024 + 1),
    ])
      await expect(
        processarAnexo('relato.txt', 'text/plain', b)
      ).rejects.toHaveProperty('statusCode');
  });
  it('mantém imagens ao continuar resposta interrompida', () => {
    const imagens = [
      { tipo: 'image/png' as const, base64: 'dados-de-contrato' },
    ];
    expect(
      pedidoDeContinuacao(
        { sistema: 'regra', usuario: 'pergunta', imagens },
        'trecho'
      ).imagens
    ).toBe(imagens);
  });
});

describe('contratos multimodais dos provedores, sem inferência simulada', () => {
  it.each(['openai_compativel', 'gemini', 'anthropic'] as const)(
    'envia os bytes e o texto no contrato %s',
    async (tipo) => {
      const { gerarTexto } = await import('@/lib/ai/cliente-de-ia');
      let corpo: Record<string, unknown> = {};
      const buscar: typeof fetch = async (_u, init) => {
        corpo = JSON.parse(String(init?.body));
        return Response.json(
          tipo === 'openai_compativel'
            ? { choices: [{ message: { content: 'Resposta de contrato' } }] }
            : tipo === 'gemini'
              ? {
                  candidates: [
                    { content: { parts: [{ text: 'Resposta de contrato' }] } },
                  ],
                }
              : { content: [{ type: 'text', text: 'Resposta de contrato' }] }
        );
      };
      await gerarTexto(
        {
          tipo,
          baseUrl: 'http://127.0.0.1:9/v1',
          modelo: 'contrato',
          chave: 'chave-de-contrato',
          temperatura: 0,
          tempoMaximoSegundos: 1,
        },
        {
          sistema: 'regra',
          usuario: 'pergunta',
          imagens: [{ tipo: 'image/png', base64: 'Ynl0ZXMtZGUtY29udHJhdG8=' }],
        },
        buscar
      );
      const texto = JSON.stringify(corpo);
      expect(texto).toContain('Ynl0ZXMtZGUtY29udHJhdG8=');
      expect(texto).toContain('image/png');
      expect(texto).toContain('pergunta');
      expect(texto).toContain(
        tipo === 'openai_compativel'
          ? 'image_url'
          : tipo === 'gemini'
            ? 'inlineData'
            : 'base64'
      );
    }
  );
});
