import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/**
 * Proteção do acesso do modelo à internet (tarefa 212) contra o uso do
 * servidor para alcançar a rede interna (SSRF): só `https` na porta padrão,
 * sem credenciais no endereço, e todo endereço resolvido precisa ser público.
 * A conferência é repetida a cada redirecionamento.
 */

export class AcessoNegado extends Error {
  constructor(motivo: string) {
    super(motivo);
    this.name = 'AcessoNegado';
  }
}

function ipv4Privado(ip: string) {
  const [a, b] = ip.split('.').map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

/** Endereço que não pode ser alcançado: privado, local, reservado ou multicast. */
export function enderecoInterno(ip: string) {
  const versao = isIP(ip);
  if (versao === 4) return ipv4Privado(ip);
  if (versao === 6) {
    const minusculo = ip.toLowerCase();
    const mapeado = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(minusculo);
    if (mapeado) return ipv4Privado(mapeado[1]);
    return (
      minusculo === '::' ||
      minusculo === '::1' ||
      minusculo.startsWith('fc') ||
      minusculo.startsWith('fd') ||
      minusculo.startsWith('fe8') ||
      minusculo.startsWith('fe9') ||
      minusculo.startsWith('fea') ||
      minusculo.startsWith('feb') ||
      minusculo.startsWith('ff')
    );
  }
  return true;
}

export type Resolvedor = (host: string) => Promise<string[]>;

export const resolverDns: Resolvedor = async (host) =>
  (await lookup(host, { all: true, verbatim: true })).map((r) => r.address);

/** Confere o endereço e devolve a URL normalizada. */
export async function conferirUrl(
  bruto: string,
  resolver: Resolvedor = resolverDns
): Promise<URL> {
  let url: URL;
  try {
    url = new URL(bruto);
  } catch {
    throw new AcessoNegado('endereço inválido');
  }
  if (url.protocol !== 'https:') throw new AcessoNegado('só https é permitido');
  if (url.username || url.password)
    throw new AcessoNegado('endereço com credenciais');
  if (url.port && url.port !== '443')
    throw new AcessoNegado('porta não permitida');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local')
  )
    throw new AcessoNegado('endereço local');
  const enderecos = isIP(host) ? [host] : await resolver(host);
  if (enderecos.length === 0) throw new AcessoNegado('domínio sem endereço');
  if (enderecos.some(enderecoInterno))
    throw new AcessoNegado('endereço da rede interna');
  url.hash = '';
  return url;
}
