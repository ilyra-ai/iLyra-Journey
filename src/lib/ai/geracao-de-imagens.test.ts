import { expect, it } from 'vitest';
import sharp from 'sharp';
import {
  segundoModeloParaImagem,
  validarImagemGerada,
} from './geracao-de-imagens';
import type { ConfiguracaoDeIa } from './provedores-da-plataforma';

it('não usa outro modelo quando a segunda posição é ausente ou o Motor Lyra', () => {
  const config: ConfiguracaoDeIa = {
    provedores: [],
    ordem: [{ tipo: 'lyra' }],
    atualizadoEm: '',
  };
  expect(() => segundoModeloParaImagem(config)).toThrow(/segunda posição/);
  expect(() =>
    segundoModeloParaImagem({
      ...config,
      ordem: [
        { tipo: 'modelo', preset: 'localai', modelo: 'primeiro' },
        { tipo: 'lyra' },
      ],
    })
  ).toThrow(/segunda posição/);
});
it('recusa HTML, SVG e bytes que só imitam o cabeçalho PNG', async () => {
  for (const bytes of [
    Buffer.from('<html>arquivo</html>'),
    Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  ]) {
    await expect(validarImagemGerada(bytes)).rejects.toThrow(/raster válida/);
  }
});
it('decodifica imagem real, remove metadados e grava WebP com dimensões conferidas', async () => {
  const png = await sharp({
    create: { width: 16, height: 12, channels: 3, background: 'white' },
  })
    .png()
    .toBuffer();
  const imagem = await validarImagemGerada(png);
  expect(imagem).toMatchObject({ tipo: 'image/webp', largura: 16, altura: 12 });
  expect((await sharp(imagem.bytes).metadata()).format).toBe('webp');
});
