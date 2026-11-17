import { type AcessoInternet, hostPermitido } from './dominios';
import {
  AcessoNegado,
  conferirUrl,
  type Resolvedor,
  resolverDns,
} from './seguranca';

/**
 * Leitura de páginas pelo servidor, a pedido do modelo (tarefa 212). Cada
 * redirecionamento é conferido de novo (alcance e rede interna), o corpo tem
 * limite de tamanho e de tempo, e só texto e HTML são aceitos.
 */

export const LIMITE_DE_BYTES = 2_000_000;
export const LIMITE_DE_CARACTERES = 24_000;
const TEMPO_MAXIMO_MS = 15_000;
const MAXIMO_DE_REDIRECIONAMENTOS = 3;
const AGENTE = 'LyraMetaCare/1.0 (pesquisa de fontes oficiais de saude)';

export interface PaginaLida {
  url: string;
  titulo: string;
  texto: string;
  cortado: boolean;
  /** Links da página dentro do alcance liberado, para o modelo navegar. */
  links: LinkDaPagina[];
}

export interface LinkDaPagina {
  texto: string;
  url: string;
}

export const MAXIMO_DE_LINKS = 60;
const ARQUIVO_NAO_LEGIVEL =
  /\.(pdf|docx?|xlsx?|pptx?|zip|rar|png|jpe?g|gif|svg|webp|mp[34]|avi|csv)$/i;

const ENTIDADES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

function decodificar(texto: string) {
  return texto.replace(
    /&(#x?[0-9a-f]+|[a-z]+);/gi,
    (inteiro, codigo: string) => {
      if (codigo.startsWith('#x') || codigo.startsWith('#X'))
        return String.fromCodePoint(parseInt(codigo.slice(2), 16));
      if (codigo.startsWith('#'))
        return String.fromCodePoint(parseInt(codigo.slice(1), 10));
      return ENTIDADES[codigo.toLowerCase()] ?? inteiro;
    }
  );
}

/** Texto legível de um HTML: sem scripts, estilos, menus e marcação. */
export function textoDoHtml(html: string) {
  const titulo = decodificar(
    /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim() ?? ''
  );
  const corpo = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(
      /<(head|title|script|style|noscript|svg|nav|header|footer|form)\b[\s\S]*?<\/\1>/gi,
      ' '
    )
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article|br)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  const texto = decodificar(corpo)
    .split('\n')
    .map((linha) => linha.replace(/[ \t\r\f\v]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
  return { titulo, texto };
}

/**
 * Links `https` da página dentro do alcance, sem âncoras da própria página
 * nem arquivos que a leitura recusaria. Os do conteúdo vêm antes dos menus.
 */
export function linksDoHtml(
  html: string,
  base: URL,
  acesso: AcessoInternet
): LinkDaPagina[] {
  const semCodigo = html.replace(
    /<(script|style|noscript|svg)\b[\s\S]*?<\/\1>/gi,
    ' '
  );
  const menus: string[] = [];
  const conteudo = semCodigo.replace(
    /<(nav|header|footer)\b[\s\S]*?<\/\1>/gi,
    (trecho) => {
      menus.push(trecho);
      return ' ';
    }
  );
  const vistos = new Set<string>([base.toString()]);
  const links: LinkDaPagina[] = [];
  for (const parte of [conteudo, ...menus]) {
    for (const achado of parte.matchAll(
      /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
    )) {
      if (links.length >= MAXIMO_DE_LINKS) return links;
      let url: URL;
      try {
        url = new URL(decodificar(achado[1]), base);
      } catch {
        continue;
      }
      url.hash = '';
      const endereco = url.toString();
      if (
        url.protocol !== 'https:' ||
        vistos.has(endereco) ||
        ARQUIVO_NAO_LEGIVEL.test(url.pathname) ||
        !hostPermitido(url.hostname, acesso)
      )
        continue;
      const texto = decodificar(achado[2].replace(/<[^>]+>/g, ' '))
        .replace(/\s+/g, ' ')
        .trim();
      if (!texto) continue;
      vistos.add(endereco);
      links.push({ texto: texto.slice(0, 120), url: endereco });
    }
  }
  return links;
}

async function lerCorpo(resposta: Response) {
  const leitor = resposta.body?.getReader();
  if (!leitor) return '';
  const partes: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    total += value.byteLength;
    if (total > LIMITE_DE_BYTES) {
      await leitor.cancel();
      throw new AcessoNegado('página grande demais');
    }
    partes.push(value);
  }
  return new TextDecoder('utf-8').decode(Buffer.concat(partes));
}

export async function lerPagina(
  endereco: string,
  acesso: AcessoInternet,
  opcoes: { buscar?: typeof fetch; resolver?: Resolvedor } = {}
): Promise<PaginaLida> {
  const buscar = opcoes.buscar ?? fetch;
  const resolver = opcoes.resolver ?? resolverDns;
  let atual = endereco;
  for (let salto = 0; salto <= MAXIMO_DE_REDIRECIONAMENTOS; salto += 1) {
    const url = await conferirUrl(atual, resolver);
    if (!hostPermitido(url.hostname, acesso)) {
      throw new AcessoNegado(
        `domínio fora do alcance liberado: ${url.hostname}`
      );
    }
    const resposta = await buscar(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TEMPO_MAXIMO_MS),
      headers: { 'User-Agent': AGENTE, Accept: 'text/html,text/plain' },
    });
    if (resposta.status >= 300 && resposta.status < 400) {
      const destino = resposta.headers.get('location');
      if (!destino) throw new AcessoNegado('redirecionamento sem destino');
      atual = new URL(destino, url).toString();
      continue;
    }
    if (!resposta.ok) throw new AcessoNegado(`HTTP ${resposta.status}`);
    const tipo = resposta.headers.get('content-type') ?? '';
    if (!/text\/html|text\/plain|application\/xhtml/i.test(tipo)) {
      throw new AcessoNegado(
        `tipo de conteúdo não suportado: ${tipo || 'desconhecido'}`
      );
    }
    const bruto = await lerCorpo(resposta);
    const html = /html/i.test(tipo);
    const { titulo, texto } = html
      ? textoDoHtml(bruto)
      : { titulo: '', texto: bruto };
    return {
      url: url.toString(),
      titulo,
      texto: texto.slice(0, LIMITE_DE_CARACTERES),
      cortado: texto.length > LIMITE_DE_CARACTERES,
      links: html ? linksDoHtml(bruto, url, acesso) : [],
    };
  }
  throw new AcessoNegado('redirecionamentos demais');
}
