import { describe, expect, it } from 'vitest';
import sharp from 'sharp';

import { rasterizarDesenho, svgDoDesenho } from './imagem-vetorial';
import { idDeModelo } from './inferencia-integrada';

describe('Inferência local integrada', () => {
  it('gera identificadores determinísticos sem divulgar o caminho no ID', () => {
    const a = idDeModelo('/home/usuario/modelos/modelo.gguf');
    expect(a).toMatch(/^lyra-gguf-[a-f0-9]{32}$/);
    expect(a).toBe(idDeModelo('/home/usuario/modelos/modelo.gguf'));
    expect(a).not.toBe(idDeModelo('/home/usuario/modelos/outro.gguf'));
    expect(a).not.toContain('/home/');
  });

  it('produz SVG seguro e preserva caracteres PT-BR', () => {
    const svg = svgDoDesenho({
      largura: 512,
      altura: 512,
      fundo: '#FFFFFF',
      formas: [
        {
          tipo: 'texto',
          x: 20,
          y: 70,
          tamanho: 32,
          cor: '#102030',
          conteudo: 'Você & <Lyra>',
        },
        {
          tipo: 'circulo',
          cx: 200,
          cy: 210,
          raio: 50,
          cor: '#AABBCC',
        },
      ],
    });
    expect(svg).toContain('Você &amp; &lt;Lyra&gt;');
    expect(svg).toContain('<circle');
    expect(svg).not.toContain('<script');
  });

  it('não aceita tags SVG arbitrárias, javascript nem links externos', () => {
    expect(() =>
      svgDoDesenho({
        largura: 512,
        altura: 512,
        fundo: '#FFFFFF',
        formas: [{ tipo: 'image', href: 'https://externo.invalid/asset' }],
      })
    ).toThrow();
    expect(() =>
      svgDoDesenho({
        largura: 512,
        altura: 512,
        fundo: '#FFFFFF',
        formas: [
          { tipo: 'caminho', d: 'M0 0" onload="alert(1)', cor: '#111111' },
        ],
      })
    ).toThrow();
  });

  it('recusa tamanhos e códigos de cor fora do contrato', () => {
    expect(() =>
      svgDoDesenho({
        largura: 100000,
        altura: 512,
        fundo: 'red',
        formas: [],
      })
    ).toThrow();
  });

  it.each([512, 1600, 2048])(
    'rasteriza WebP real com %i pixels sem duplicar as dimensões',
    async (tamanho) => {
      const bytes = await rasterizarDesenho({
        largura: tamanho,
        altura: tamanho,
        fundo: '#FFFFFF',
        formas: [
          { tipo: 'circulo', cx: 100, cy: 100, raio: 80, cor: '#FFCC00' },
        ],
      });
      const imagem = await sharp(bytes).metadata();
      expect(imagem.format).toBe('webp');
      expect(imagem.width).toBe(tamanho);
      expect(imagem.height).toBe(tamanho);
      expect(bytes.length).toBeGreaterThan(100);
    }
  );
});
