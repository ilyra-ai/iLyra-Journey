import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { ImageResponse } from 'next/og';

import {
  conteudoDoCartao,
  FORMATOS_DO_CARTAO,
  type FormatoDoCartao,
  formatoDoCartao,
  type IdentificadorDoCartao,
  identificadorValido,
  signoDoIdentificador,
} from '@/lib/descoberta/cartao';
import { respostaDeErro } from '@/lib/http/api';
import { HttpError } from '@/lib/http-error';

export const runtime = 'nodejs';

/** Igual para todos com o mesmo signo: pode ir para navegador e CDN. */
const CABECALHOS = {
  'Content-Type': 'image/png',
  'Cache-Control': 'public, max-age=86400, s-maxage=604800',
} as const;

/**
 * São só 26 imagens possíveis (13 cartões × 2 formatos), então cada uma é
 * gerada uma vez por processo. Sem banco e sem limite por IP: repetir o
 * pedido não custa processamento, e o cartão funciona mesmo com o MySQL
 * fora do ar.
 */
const geradas = new Map<string, Promise<ArrayBuffer>>();

function pngDoCartao(
  identificador: IdentificadorDoCartao,
  formato: FormatoDoCartao
) {
  const chave = `${identificador}:${formato}`;
  let png = geradas.get(chave);
  if (!png) {
    png = desenhar(identificador, formato);
    geradas.set(chave, png);
    // Falha não fica guardada: o próximo pedido tenta de novo.
    png.catch(() => geradas.delete(chave));
  }
  return png;
}

const RAIZ = process.cwd();
const ARQUIVO = (...partes: string[]) =>
  readFile(path.join(RAIZ, 'src', 'assets', ...partes));

let fontes: Promise<
  {
    name: string;
    data: Buffer;
    weight: 400 | 600;
    style: 'normal';
  }[]
> | null = null;

function carregarFontes() {
  fontes ??= Promise.all([
    ARQUIVO('fonts', 'source-sans-3', 'SourceSans3-Regular.ttf'),
    ARQUIVO('fonts', 'source-sans-3', 'SourceSans3-Semibold.ttf'),
    ARQUIVO('fonts', 'clicker-script', 'ClickerScript-Regular.ttf'),
  ]).then(([regular, seminegrito, manuscrita]) => [
    { name: 'Source Sans 3', data: regular, weight: 400, style: 'normal' },
    { name: 'Source Sans 3', data: seminegrito, weight: 600, style: 'normal' },
    { name: 'Clicker Script', data: manuscrita, weight: 400, style: 'normal' },
  ]);
  return fontes;
}

const OURO = '#e8c77a';
const CREME = '#f6ecd6';
const SUAVE = '#cbbd9f';

/**
 * Cartão da descoberta gratuita (tarefa 168): só o signo solar escolhido
 * pela pessoa, com a arte própria da Lyra. Nenhum dado pessoal entra na
 * URL nem na imagem.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ identificador: string }> }
) {
  try {
    const { identificador } = await params;
    if (!identificadorValido(identificador))
      throw new HttpError('Cartão inexistente.', 404);
    const formato = formatoDoCartao(
      new URL(request.url).searchParams.get('formato')
    );
    return new Response(await pngDoCartao(identificador, formato), {
      headers: CABECALHOS,
    });
  } catch (error) {
    return respostaDeErro(error, 'Não foi possível gerar o cartão agora.');
  }
}

async function desenhar(
  identificador: IdentificadorDoCartao,
  formato: FormatoDoCartao
) {
  const { largura, altura } = FORMATOS_DO_CARTAO[formato];
  const conteudo = conteudoDoCartao(signoDoIdentificador(identificador));
  const arte = conteudo.signo
    ? `data:image/png;base64,${(await ARQUIVO('celestial', 'signos', `${identificador}.png`)).toString('base64')}`
    : null;
  const lado = formato === 'stories' ? 820 : 640;

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: formato === 'stories' ? '120px 80px' : '72px 80px',
        background:
          'radial-gradient(circle at 50% 38%, #3a2c18 0%, #1c1610 55%, #0f0c08 100%)',
        color: CREME,
        fontFamily: 'Source Sans 3',
      }}
    >
      <div
        style={{
          display: 'flex',
          fontSize: 34,
          letterSpacing: 6,
          color: OURO,
        }}
      >
        LYRA METACARE
      </div>
      <div
        style={{
          display: 'flex',
          width: lado,
          height: lado,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: lado,
          border: `2px solid rgba(232, 199, 122, 0.35)`,
        }}
      >
        {arte ? (
          // eslint-disable-next-line @next/next/no-img-element -- Satori só aceita <img>.
          <img src={arte} width={lado - 40} height={lado - 40} alt="" />
        ) : (
          <div
            style={{
              display: 'flex',
              width: lado - 160,
              height: lado - 160,
              borderRadius: lado,
              border: `2px solid rgba(232, 199, 122, 0.6)`,
              boxShadow: '0 0 120px rgba(232, 199, 122, 0.25)',
            }}
          />
        )}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 18,
        }}
      >
        <div
          style={{
            display: 'flex',
            fontFamily: 'Clicker Script',
            fontSize: 124,
            lineHeight: 1,
            color: OURO,
          }}
        >
          {conteudo.titulo}
        </div>
        <div style={{ display: 'flex', fontSize: 34, color: SUAVE }}>
          {conteudo.linha}
        </div>
        <div
          style={{
            display: 'flex',
            maxWidth: 880,
            fontSize: 44,
            fontWeight: 600,
            lineHeight: 1.25,
          }}
        >
          {conteudo.destaque}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', fontSize: 38, color: OURO }}>
          {conteudo.chamada}
        </div>
        <div style={{ display: 'flex', fontSize: 26, color: SUAVE }}>
          Interpretação simbólica para reflexão, sem previsão.
        </div>
      </div>
    </div>,
    {
      width: largura,
      height: altura,
      fonts: await carregarFontes(),
    }
  ).arrayBuffer();
}
