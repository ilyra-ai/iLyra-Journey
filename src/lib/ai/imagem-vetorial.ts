/** Criação vetorial real usando um LLM de texto, validação forte e Sharp. */
import sharp from 'sharp';
import { z } from 'zod';

import { extrairJson, gerarTexto, type ConexaoDeIa } from './cliente-de-ia';
import { instrucoesDeIdentidade } from '@/lib/lyra/personalidade';

const cor = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const numero = z.number().finite().min(-10000).max(10000);
const inteiro = z.number().int().min(1).max(2048);
const formas = z.discriminatedUnion('tipo', [
  z
    .object({
      tipo: z.literal('retangulo'),
      x: numero,
      y: numero,
      largura: numero.nonnegative(),
      altura: numero.nonnegative(),
      cor,
      raio: numero.nonnegative().optional(),
    })
    .strict(),
  z
    .object({
      tipo: z.literal('circulo'),
      cx: numero,
      cy: numero,
      raio: numero.nonnegative(),
      cor,
    })
    .strict(),
  z
    .object({
      tipo: z.literal('linha'),
      x1: numero,
      y1: numero,
      x2: numero,
      y2: numero,
      cor,
      espessura: numero.positive(),
    })
    .strict(),
  z
    .object({
      tipo: z.literal('texto'),
      x: numero,
      y: numero,
      conteudo: z.string().max(180),
      tamanho: numero.positive(),
      cor,
    })
    .strict(),
  z
    .object({
      tipo: z.literal('caminho'),
      d: z
        .string()
        .min(1)
        .max(4000)
        .regex(/^[MmLlHhVvCcSsQqTtAaZz0-9.,+\-eE\s]+$/),
      cor,
    })
    .strict(),
]);
const desenho = z
  .object({
    largura: inteiro,
    altura: inteiro,
    fundo: cor,
    formas: z.array(formas).min(1).max(300),
  })
  .strict();

function escapar(texto: string) {
  return texto.replace(/[&<>"']/g, (caractere) => {
    const tabela: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&apos;',
    };
    return tabela[caractere] ?? '';
  });
}

export function svgDoDesenho(entrada: unknown): string {
  const validado = desenho.parse(entrada);
  const segmentos = validado.formas.map((forma) => {
    if (forma.tipo === 'retangulo') {
      return (
        '<rect x="' +
        forma.x +
        '" y="' +
        forma.y +
        '" width="' +
        forma.largura +
        '" height="' +
        forma.altura +
        '" rx="' +
        (forma.raio ?? 0) +
        '" fill="' +
        forma.cor +
        '"/>'
      );
    }
    if (forma.tipo === 'circulo') {
      return (
        '<circle cx="' +
        forma.cx +
        '" cy="' +
        forma.cy +
        '" r="' +
        forma.raio +
        '" fill="' +
        forma.cor +
        '"/>'
      );
    }
    if (forma.tipo === 'linha') {
      return (
        '<line x1="' +
        forma.x1 +
        '" y1="' +
        forma.y1 +
        '" x2="' +
        forma.x2 +
        '" y2="' +
        forma.y2 +
        '" stroke="' +
        forma.cor +
        '" stroke-width="' +
        forma.espessura +
        '"/>'
      );
    }
    if (forma.tipo === 'texto') {
      return (
        '<text x="' +
        forma.x +
        '" y="' +
        forma.y +
        '" fill="' +
        forma.cor +
        '" font-size="' +
        forma.tamanho +
        '" font-family="sans-serif">' +
        escapar(forma.conteudo) +
        '</text>'
      );
    }
    return '<path d="' + forma.d + '" fill="' + forma.cor + '"/>';
  });
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="' +
    validado.largura +
    '" height="' +
    validado.altura +
    '" viewBox="0 0 ' +
    validado.largura +
    ' ' +
    validado.altura +
    '"><rect width="100%" height="100%" fill="' +
    validado.fundo +
    '"/>' +
    segmentos.join('') +
    '</svg>'
  );
}

/** Mantém as dimensões validadas, inclusive no limite de 2048 × 2048 pixels. */
export async function rasterizarDesenho(entrada: unknown): Promise<Buffer> {
  const svg = svgDoDesenho(entrada);
  return sharp(Buffer.from(svg, 'utf8'), {
    density: 72,
    limitInputPixels: 4_194_304,
  })
    .webp({ quality: 92 })
    .toBuffer();
}

/** Sem SVG arbitrário do modelo: nenhuma tag, URI, CSS ou script é aceita como entrada. */
export async function gerarImagemVetorial(
  conexao: ConexaoDeIa,
  instrucao: string
) {
  const instrucoes = [
    instrucoesDeIdentidade(),
    'A tarefa atual é criar ilustrações vetoriais em português brasileiro.',
    'Produza uma composição visual fiel ao pedido em JSON válido, sem markdown.',
    'Campos obrigatórios: largura, altura, fundo e formas.',
    'fundo e cor são hexadecimais de seis dígitos, como #FFFFFF.',
    'Formas aceitas: retangulo com x,y,largura,altura,cor e raio opcional;',
    'circulo com cx,cy,raio,cor; linha com x1,y1,x2,y2,cor,espessura;',
    'texto com x,y,conteudo,tamanho,cor; caminho com d SVG e cor.',
    'Use de 5 a 100 formas com composição harmoniosa, tipografia legível',
    'e coordenadas dentro da imagem. Use somente dimensões de 256 a 1600.',
    'Não descreva a imagem, produza somente a estrutura geométrica.',
  ].join(' ');
  const resposta = await gerarTexto(conexao, {
    sistema: instrucoes,
    usuario: instrucao,
    maximoDeTokens: 5000,
    json: true,
  });
  return rasterizarDesenho(extrairJson(resposta));
}
