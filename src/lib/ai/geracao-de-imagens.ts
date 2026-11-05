import { generateImage } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogle } from '@ai-sdk/google';
import sharp from 'sharp';

import { HttpError } from '@/lib/http-error';
import {
  conexaoDoModelo,
  provedorEhLocal,
  type ConfiguracaoDeIa,
} from './provedores-da-plataforma';
import { buscarComAcessoLocal } from './transporte-local-wsl';
import { gerarImagemVetorial } from './imagem-vetorial';

export const LIMITE_DA_IMAGEM = 5 * 1024 * 1024;
const LIMITE_DA_RESPOSTA = 12 * 1024 * 1024;

/** Imagens usam exatamente a segunda posição, independentemente da cadeia textual. */
export function segundoModeloParaImagem(configuracao: ConfiguracaoDeIa) {
  const segundo = configuracao.ordem[1];
  if (!segundo || segundo.tipo !== 'modelo') {
    throw new HttpError(
      'Configure um modelo capaz de gerar imagens na segunda posição das configurações de IA.',
      409
    );
  }
  const provedor = configuracao.provedores.find(
    (item) => item.preset === segundo.preset
  );
  const conexao = provedor && conexaoDoModelo(provedor, segundo.modelo);
  if (!provedor || !conexao || !provedor.modelos.includes(segundo.modelo)) {
    throw new HttpError(
      'A conexão do segundo modelo está incompleta. Revise as configurações de IA.',
      409
    );
  }
  if (conexao.tipo === 'anthropic') {
    throw new HttpError(
      'O segundo provedor usa uma API sem geração de imagens. Configure um modelo de imagens nessa posição.',
      422
    );
  }
  return { conexao, preset: provedor.preset, local: provedorEhLocal(provedor) };
}

/** Limita o JSON/base64 antes de o SDK processá-lo. Não segue URLs de imagens. */
async function respostaLimitada(resposta: Response): Promise<Response> {
  if (!resposta.body) return resposta;
  const leitor = resposta.body.getReader();
  const partes: Uint8Array[] = [];
  let tamanho = 0;
  try {
    for (;;) {
      const { done, value } = await leitor.read();
      if (done) break;
      tamanho += value.byteLength;
      if (tamanho > LIMITE_DA_RESPOSTA) {
        await leitor.cancel();
        throw new HttpError(
          'A resposta de imagem excedeu o tamanho permitido.',
          413
        );
      }
      partes.push(value);
    }
  } finally {
    leitor.releaseLock();
  }
  return new Response(Buffer.concat(partes), {
    status: resposta.status,
    headers: resposta.headers,
  });
}

/** Decodifica de verdade e normaliza o arquivo, sem aceitar HTML ou SVG disfarçado. */
export async function validarImagemGerada(bytes: Uint8Array) {
  if (!bytes.byteLength || bytes.byteLength > LIMITE_DA_IMAGEM) {
    throw new HttpError(
      'O modelo precisa retornar uma imagem de até 5 MB.',
      413
    );
  }
  try {
    const imagem = sharp(bytes, {
      limitInputPixels: 16_777_216,
      failOn: 'warning',
    });
    const metadados = await imagem.metadata();
    if (
      !['png', 'jpeg', 'webp'].includes(metadados.format ?? '') ||
      !metadados.width ||
      !metadados.height
    ) {
      throw new Error('Formato de imagem não aceito.');
    }
    const { data, info } = await imagem
      .resize({
        width: 2048,
        height: 2048,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 90 })
      .toBuffer({ resolveWithObject: true });
    if (data.byteLength > LIMITE_DA_IMAGEM)
      throw new Error('Imagem muito grande.');
    return {
      bytes: data,
      largura: info.width,
      altura: info.height,
      tipo: 'image/webp' as const,
    };
  } catch {
    throw new HttpError(
      'O segundo modelo não retornou uma imagem raster válida dentro dos limites.',
      422
    );
  }
}

export async function gerarImagemNoSegundoModelo(
  configuracao: ConfiguracaoDeIa,
  prompt: string,
  buscar: typeof fetch = fetch
) {
  const segundo = segundoModeloParaImagem(configuracao);
  const { conexao } = segundo;
  if (conexao.integrado) {
    const imagem = await gerarImagemVetorial(conexao, prompt);
    return {
      ...(await validarImagemGerada(imagem)),
      preset: segundo.preset,
      modelo: conexao.modelo,
    };
  }
  const transporte: typeof fetch = async (entrada, opcoes) => {
    const pedido = new Request(entrada, opcoes);
    const headers = new Headers(pedido.headers);
    if (!conexao.chave) headers.delete('authorization');
    const resposta = await buscarComAcessoLocal(
      pedido.url,
      {
        method: pedido.method,
        headers,
        body: await pedido.text(),
        signal: pedido.signal,
        redirect: 'error',
        cache: 'no-store',
      },
      buscar
    );
    return respostaLimitada(resposta);
  };
  const modelo =
    conexao.tipo === 'gemini'
      ? createGoogle({
          apiKey: conexao.chave ?? undefined,
          fetch: transporte,
        }).image(conexao.modelo)
      : createOpenAI({
          apiKey: conexao.chave ?? '',
          baseURL: conexao.baseUrl ?? undefined,
          fetch: transporte,
        }).image(conexao.modelo);
  const resultado = await generateImage({
    model: modelo,
    prompt,
    maxRetries: 0,
    abortSignal: AbortSignal.timeout(conexao.tempoMaximoSegundos * 1000),
  });
  return {
    ...(await validarImagemGerada(resultado.image.uint8Array)),
    preset: segundo.preset,
    modelo: conexao.modelo,
  };
}
