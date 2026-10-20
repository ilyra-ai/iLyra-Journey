import { execFile } from 'node:child_process';
import { release } from 'node:os';

/** O loopback do WSL em NAT é diferente do loopback do Windows. */
export function loopbackDoWindowsNoWsl(
  endereco: string,
  plataforma = process.platform,
  kernel = release()
) {
  if (plataforma !== 'linux' || !/microsoft/i.test(kernel)) return false;
  const url = new URL(endereco);
  const host = url.hostname.replace(/^\[|\]$/g, '');
  return (
    (url.protocol === 'http:' || url.protocol === 'https:') &&
    !url.username &&
    !url.password &&
    (host === 'localhost' ||
      host === '::1' ||
      /^127\.(?:\d{1,3}\.){2}\d{1,3}$/.test(host))
  );
}

/** Só uma recusa antes da conexão permite tentar o outro loopback. */
export function conexaoFoiRecusada(erro: unknown, profundidade = 0): boolean {
  if (!(erro instanceof Error) || profundidade > 5) return false;
  if ('code' in erro && erro.code === 'ECONNREFUSED') return true;
  if (erro instanceof AggregateError) {
    return (
      erro.errors.length > 0 &&
      erro.errors.every((item) => conexaoFoiRecusada(item, profundidade + 1))
    );
  }
  return conexaoFoiRecusada(erro.cause, profundidade + 1);
}

function entreAspas(valor: string) {
  return `"${valor
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
    .replace(/\v/g, '\\v')}"`;
}

/** Configuração enviada por stdin: chaves e mensagens não viram argumentos. */
export function configuracaoDoCurlLocal(url: string, init: RequestInit) {
  const linhas = [
    `url = ${entreAspas(url)}`,
    `request = ${entreAspas(init.method ?? 'GET')}`,
  ];
  new Headers(init.headers).forEach((valor, nome) => {
    linhas.push(`header = ${entreAspas(`${nome}: ${valor}`)}`);
  });
  if (init.body !== undefined && init.body !== null) {
    if (typeof init.body !== 'string') {
      throw new Error('O transporte local de IA exige um corpo JSON em texto.');
    }
    linhas.push(`data-raw = ${entreAspas(init.body)}`);
  }
  return `${linhas.join('\n')}\n`;
}

export function respostaDoCurlLocal(saida: string) {
  const separador = saida.lastIndexOf('\n');
  const status = Number(saida.slice(separador + 1));
  if (
    separador < 0 ||
    !Number.isInteger(status) ||
    status < 200 ||
    status > 599
  ) {
    throw new Error(
      'O servidor local do Windows não retornou um status HTTP válido.'
    );
  }
  return new Response(
    status === 204 || status === 205 || status === 304
      ? null
      : saida.slice(0, separador),
    { status }
  );
}

/**
 * Transporte nativo para um provedor restrito ao loopback do Windows.
 * Não abre portas, não altera firewall/WSL/Jan e não desativa TLS. O curl
 * não lê configurações pessoais, não segue redirecionamentos e não usa proxy.
 */
async function buscarNoWindows(url: string, init: RequestInit) {
  init.signal?.throwIfAborted();
  const configuracao = configuracaoDoCurlLocal(url, init);
  return new Promise<Response>((resolver, rejeitar) => {
    const processo = execFile(
      'curl.exe',
      [
        '--disable',
        '--silent',
        '--show-error',
        '--globoff',
        '--noproxy',
        '*',
        '--proto',
        '=http,https',
        '--write-out',
        '\n%{http_code}',
        '--config',
        '-',
      ],
      {
        encoding: 'utf8',
        windowsHide: true,
        maxBuffer: 16 * 1024 * 1024,
        signal: init.signal ?? undefined,
      },
      (erro, stdout, stderr) => {
        if (erro) {
          if (init.signal?.aborted) {
            rejeitar(init.signal.reason);
          } else {
            rejeitar(
              new Error(
                erro.code === 'ENOENT'
                  ? 'O curl.exe do Windows não está disponível no PATH do WSL.'
                  : `O servidor local do Windows não respondeu: ${stderr.trim().slice(0, 300) || erro.message}`
              )
            );
          }
          return;
        }
        try {
          resolver(respostaDoCurlLocal(stdout));
        } catch (falha) {
          rejeitar(falha);
        }
      }
    );
    // Uma saída antecipada do curl pode fechar stdin antes de receber tudo.
    processo.stdin?.on('error', () => {});
    processo.stdin?.end(configuracao);
  });
}

export async function buscarComAcessoLocal(
  url: string,
  init: RequestInit,
  buscar: typeof fetch = fetch
): Promise<Response> {
  try {
    return await buscar(url, init);
  } catch (erro) {
    if (!conexaoFoiRecusada(erro) || !loopbackDoWindowsNoWsl(url)) throw erro;
    return buscarNoWindows(url, init);
  }
}
