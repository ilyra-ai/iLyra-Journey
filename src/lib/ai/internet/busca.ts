import { type AcessoInternet, hostPermitido } from './dominios';
import { AcessoNegado } from './seguranca';

/**
 * Busca na internet pelo servidor (tarefa 212), pela API oficial do Brave
 * Search, ativada pela variável `BRAVE_SEARCH_API_KEY`. Buscadores de páginas
 * HTML (como o DuckDuckGo) respondem aos servidores com desafio anti-robô
 * (HTTP 202 + CAPTCHA), que não deve ser contornado; sem a chave, a busca
 * avisa que está indisponível e o modelo navega pelos links das páginas
 * oficiais. No modo `lista`, a consulta é restrita aos domínios liberados
 * (operador `site:`) e os resultados de fora são descartados. A consulta vem
 * do modelo e nunca leva dados de usuário: só é usada em tarefas
 * administrativas.
 */

export interface ResultadoDaBusca {
  titulo: string;
  url: string;
  trecho: string;
}

/** Variáveis de ambiente lidas pela busca. */
export type AmbienteDaBusca = Readonly<Record<string, string | undefined>>;

const ENDERECO_DA_BUSCA = 'https://api.search.brave.com/res/v1/web/search';
const MAXIMO_DE_RESULTADOS = 8;
/** A API aceita consultas de até 400 caracteres e 50 palavras. */
const LIMITE_DA_CONSULTA = 400;

export function buscaDisponivel(env: AmbienteDaBusca = process.env) {
  return Boolean(env.BRAVE_SEARCH_API_KEY?.trim());
}

function semMarcacao(texto: string) {
  return texto
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

/** Resultados da resposta JSON da API (`web.results`). */
export function resultadosDaApi(dados: unknown): ResultadoDaBusca[] {
  const lista = (dados as { web?: { results?: unknown } } | null)?.web?.results;
  if (!Array.isArray(lista)) return [];
  const resultados: ResultadoDaBusca[] = [];
  for (const item of lista) {
    const { title, url, description } = (item ?? {}) as Record<string, unknown>;
    if (typeof url !== 'string' || !url.startsWith('https://')) continue;
    resultados.push({
      titulo: typeof title === 'string' ? semMarcacao(title) : url,
      url,
      trecho: typeof description === 'string' ? semMarcacao(description) : '',
    });
  }
  return resultados;
}

/** Consulta com a restrição de domínios do modo `lista`, dentro do limite. */
export function montarConsulta(consulta: string, acesso: AcessoInternet) {
  const termo = consulta.trim().replace(/\s+/g, ' ');
  if (acesso.modo !== 'lista' || acesso.dominios.length === 0) {
    return termo.slice(0, LIMITE_DA_CONSULTA);
  }
  const restricao = ` (${acesso.dominios.map((d) => `site:${d}`).join(' OR ')})`;
  return `${termo.slice(0, Math.max(40, LIMITE_DA_CONSULTA - restricao.length))}${restricao}`.slice(
    0,
    LIMITE_DA_CONSULTA
  );
}

export async function buscarNaInternet(
  consulta: string,
  acesso: AcessoInternet,
  opcoes: { buscar?: typeof fetch; env?: AmbienteDaBusca } = {}
): Promise<ResultadoDaBusca[]> {
  if (acesso.modo === 'desligado')
    throw new AcessoNegado('acesso à internet desligado');
  if (!consulta.trim()) throw new AcessoNegado('consulta vazia');
  const chave = (opcoes.env ?? process.env).BRAVE_SEARCH_API_KEY?.trim();
  if (!chave) {
    throw new AcessoNegado(
      'busca indisponível: sem BRAVE_SEARCH_API_KEY; navegue pelos links das páginas'
    );
  }
  const endereco = new URL(ENDERECO_DA_BUSCA);
  endereco.searchParams.set('q', montarConsulta(consulta, acesso));
  endereco.searchParams.set('count', '20');
  endereco.searchParams.set('country', 'BR');
  endereco.searchParams.set('search_lang', 'pt-br');
  endereco.searchParams.set('safesearch', 'strict');
  const resposta = await (opcoes.buscar ?? fetch)(endereco, {
    headers: {
      Accept: 'application/json',
      'X-Subscription-Token': chave,
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (resposta.status !== 200)
    throw new AcessoNegado(`busca respondeu HTTP ${resposta.status}`);
  return resultadosDaApi(await resposta.json())
    .filter((resultado) =>
      hostPermitido(new URL(resultado.url).hostname, acesso)
    )
    .slice(0, MAXIMO_DE_RESULTADOS);
}
