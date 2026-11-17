import { describe, expect, it } from 'vitest';

import type { EloDaCadeia } from '@/lib/ai/cadeia-de-modelos';

import {
  type AcessoInternet,
  dominiosSchema,
  hostPermitido,
  normalizarDominio,
} from './acesso';
import {
  buscaDisponivel,
  buscarNaInternet,
  montarConsulta,
  resultadosDaApi,
} from './busca';
import {
  LIMITE_DE_BYTES,
  lerPagina,
  linksDoHtml,
  MAXIMO_DE_LINKS,
  textoDoHtml,
} from './pagina';
import { pesquisarNaInternet } from './pesquisa';
import { AcessoNegado, conferirUrl, enderecoInterno } from './seguranca';

const LISTA: AcessoInternet = {
  modo: 'lista',
  dominios: ['gov.br', 'who.int'],
  atualizadoEm: '2026-11-17T00:00:00.000Z',
};
const TOTAL: AcessoInternet = { ...LISTA, modo: 'total' };
const DESLIGADO: AcessoInternet = { ...LISTA, modo: 'desligado' };

/** DNS falso: cada host aponta para o IP do mapa (público por padrão). */
function dns(mapa: Record<string, string> = {}) {
  return async (host: string) => [mapa[host] ?? '200.152.38.1'];
}

function html(corpo: string, titulo = 'Página') {
  return `<html><head><title>${titulo}</title><script>alert(1)</script></head><body><nav>menu</nav>${corpo}</body></html>`;
}

/** `fetch` falso com respostas por endereço e registro dos pedidos. */
function rede(respostas: Record<string, () => Response>) {
  const pedidos: string[] = [];
  const buscar = (async (url: string | URL | Request) => {
    const alvo = String(url);
    pedidos.push(alvo);
    const semConsulta = alvo.replace(/\?.*$/, '');
    const resposta = respostas[alvo] ?? respostas[semConsulta];
    if (!resposta) return new Response('não encontrado', { status: 404 });
    return resposta();
  }) as typeof fetch;
  return { buscar, pedidos };
}

describe('Proteção contra acesso à rede interna', () => {
  it('reconhece endereços privados, locais e reservados', () => {
    for (const ip of [
      '10.0.0.1',
      '127.0.0.1',
      '169.254.169.254',
      '172.16.5.4',
      '192.168.0.10',
      '100.64.1.1',
      '0.0.0.0',
      '224.0.0.1',
      '::1',
      'fd00::1',
      'fe80::1',
      '::ffff:127.0.0.1',
      'não é ip',
    ]) {
      expect(enderecoInterno(ip), ip).toBe(true);
    }
    for (const ip of ['200.152.38.1', '8.8.8.8', '2804:14c::1']) {
      expect(enderecoInterno(ip), ip).toBe(false);
    }
  });

  it('só aceita https público, sem credenciais nem porta extra', async () => {
    await expect(
      conferirUrl('https://www.gov.br/inca', dns())
    ).resolves.toBeInstanceOf(URL);
    for (const ruim of [
      'http://www.gov.br/',
      'https://user:senha@gov.br/',
      'https://gov.br:8443/',
      'https://localhost/',
      'https://127.0.0.1/',
      'https://[::1]/',
      'ftp://gov.br/',
      'não é endereço',
    ]) {
      await expect(conferirUrl(ruim, dns()), ruim).rejects.toBeInstanceOf(
        AcessoNegado
      );
    }
  });

  it('recusa domínio que resolve para a rede interna', async () => {
    await expect(
      conferirUrl(
        'https://interno.gov.br/',
        dns({ 'interno.gov.br': '10.1.2.3' })
      )
    ).rejects.toThrow('endereço da rede interna');
  });
});

describe('Alcance escolhido pelo administrador', () => {
  it('normaliza domínios e recusa o que não é domínio', () => {
    expect(normalizarDominio(' https://WWW.Gov.BR./inca ')).toBe('gov.br');
    expect(normalizarDominio('inca.gov.br')).toBe('inca.gov.br');
    expect(normalizarDominio('localhost')).toBeNull();
    expect(normalizarDominio('10.0.0.1')).toBeNull();
    expect(normalizarDominio('a b.com')).toBeNull();
    expect(dominiosSchema.parse(['gov.br', 'GOV.BR', 'who.int'])).toEqual([
      'gov.br',
      'who.int',
    ]);
    expect(dominiosSchema.safeParse(['gov.br', 'x']).success).toBe(false);
  });

  it('libera subdomínios da lista e nada mais', () => {
    expect(hostPermitido('www.gov.br', LISTA)).toBe(true);
    expect(hostPermitido('gov.br', LISTA)).toBe(true);
    expect(hostPermitido('portal.who.int.', LISTA)).toBe(true);
    expect(hostPermitido('falsogov.br', LISTA)).toBe(false);
    expect(hostPermitido('gov.br.exemplo.com', LISTA)).toBe(false);
    expect(hostPermitido('exemplo.com', TOTAL)).toBe(true);
    expect(hostPermitido('www.gov.br', DESLIGADO)).toBe(false);
  });
});

describe('Leitura de páginas', () => {
  it('extrai título e texto sem scripts nem menus', () => {
    const { titulo, texto } = textoDoHtml(
      html('<h1>Mamografia</h1><p>De 50 a 74 anos &amp; a cada 2 anos.</p>')
    );
    expect(titulo).toBe('Página');
    expect(texto).toBe('Mamografia\nDe 50 a 74 anos & a cada 2 anos.');
  });

  it('lê página liberada e segue redirecionamento conferido', async () => {
    const { buscar, pedidos } = rede({
      'https://www.gov.br/inca': () =>
        new Response(null, {
          status: 301,
          headers: { location: '/inca/pt-br' },
        }),
      'https://www.gov.br/inca/pt-br': () =>
        new Response(html('<p>Rastreamento</p>', 'INCA'), {
          headers: { 'content-type': 'text/html; charset=utf-8' },
        }),
    });
    const pagina = await lerPagina('https://www.gov.br/inca', LISTA, {
      buscar,
      resolver: dns(),
    });
    expect(pedidos).toEqual([
      'https://www.gov.br/inca',
      'https://www.gov.br/inca/pt-br',
    ]);
    expect(pagina).toEqual({
      url: 'https://www.gov.br/inca/pt-br',
      titulo: 'INCA',
      texto: 'Rastreamento',
      cortado: false,
      links: [],
    });
  });

  it('entrega os links do alcance, conteúdo antes dos menus', () => {
    const pagina = `<html><head><title>T</title></head><body>
      <nav><a href="/inca/menu">Menu do INCA</a><a href="https://www.gov.br/inca/mama">Repetido</a></nav>
      <script>var a = '<a href="/inca/script">x</a>';</script>
      <p><a href="/inca/mama#topo">Câncer de <b>mama</b></a>
      <a href="relatorio.pdf">Relatório em PDF</a>
      <a href="https://golpe.com/x">Fora</a>
      <a href="http://www.who.int/inseguro">Sem https</a>
      <a href="#secao">Âncora</a>
      <a href="https://www.who.int/news/item/1">OMS &amp; rastreamento</a>
      <a href="/inca/vazio"></a></p></body></html>`;
    expect(
      linksDoHtml(pagina, new URL('https://www.gov.br/inca/pagina'), LISTA)
    ).toEqual([
      { texto: 'Câncer de mama', url: 'https://www.gov.br/inca/mama' },
      {
        texto: 'OMS & rastreamento',
        url: 'https://www.who.int/news/item/1',
      },
      { texto: 'Menu do INCA', url: 'https://www.gov.br/inca/menu' },
    ]);
    const muitos = Array.from(
      { length: 90 },
      (_, i) => `<a href="/p/${i}">Página ${i}</a>`
    ).join('');
    expect(
      linksDoHtml(muitos, new URL('https://www.gov.br/'), TOTAL)
    ).toHaveLength(MAXIMO_DE_LINKS);
  });

  it('recusa redirecionamento para a rede interna ou para fora da lista', async () => {
    const paraInterno = rede({
      'https://www.gov.br/a': () =>
        new Response(null, {
          status: 302,
          headers: { location: 'https://metadados.gov.br/' },
        }),
    });
    await expect(
      lerPagina('https://www.gov.br/a', LISTA, {
        buscar: paraInterno.buscar,
        resolver: dns({ 'metadados.gov.br': '169.254.169.254' }),
      })
    ).rejects.toThrow('endereço da rede interna');
    expect(paraInterno.pedidos).toEqual(['https://www.gov.br/a']);

    const paraFora = rede({
      'https://www.gov.br/b': () =>
        new Response(null, {
          status: 302,
          headers: { location: 'https://exemplo.com/' },
        }),
    });
    await expect(
      lerPagina('https://www.gov.br/b', LISTA, {
        buscar: paraFora.buscar,
        resolver: dns(),
      })
    ).rejects.toThrow('fora do alcance liberado: exemplo.com');
  });

  it('recusa página grande demais, tipo errado e excesso de saltos', async () => {
    const grande = rede({
      'https://www.gov.br/grande': () =>
        new Response('x'.repeat(LIMITE_DE_BYTES + 1), {
          headers: { 'content-type': 'text/plain' },
        }),
      'https://www.gov.br/pdf': () =>
        new Response('%PDF', {
          headers: { 'content-type': 'application/pdf' },
        }),
      'https://www.gov.br/laco': () =>
        new Response(null, {
          status: 302,
          headers: { location: '/laco' },
        }),
    });
    const opcoes = { buscar: grande.buscar, resolver: dns() };
    await expect(
      lerPagina('https://www.gov.br/grande', LISTA, opcoes)
    ).rejects.toThrow('página grande demais');
    await expect(
      lerPagina('https://www.gov.br/pdf', LISTA, opcoes)
    ).rejects.toThrow('tipo de conteúdo não suportado');
    await expect(
      lerPagina('https://www.gov.br/laco', LISTA, opcoes)
    ).rejects.toThrow('redirecionamentos demais');
  });
});

const RESPOSTA_DA_API = {
  web: {
    results: [
      {
        title: 'Câncer de <strong>mama</strong>',
        url: 'https://www.gov.br/inca/mama',
        description: 'Mamografia de 50 a 74 anos &amp; a cada 2 anos',
      },
      {
        title: 'Cura milagrosa',
        url: 'https://golpe.com/mama',
        description: 'compre já',
      },
      { title: 'Sem https', url: 'http://www.who.int/inseguro' },
    ],
  },
};
const COM_CHAVE = { BRAVE_SEARCH_API_KEY: 'chave-de-teste' };

describe('Busca pelo servidor (API oficial do Brave Search)', () => {
  it('lê os resultados da API, sem marcação e só https', () => {
    expect(resultadosDaApi(RESPOSTA_DA_API)).toEqual([
      {
        titulo: 'Câncer de mama',
        url: 'https://www.gov.br/inca/mama',
        trecho: 'Mamografia de 50 a 74 anos & a cada 2 anos',
      },
      {
        titulo: 'Cura milagrosa',
        url: 'https://golpe.com/mama',
        trecho: 'compre já',
      },
    ]);
    expect(resultadosDaApi(null)).toEqual([]);
    expect(resultadosDaApi({ web: {} })).toEqual([]);
  });

  it('restringe a consulta aos domínios liberados, dentro do limite', () => {
    expect(montarConsulta('  mamografia   faixa ', LISTA)).toBe(
      'mamografia faixa (site:gov.br OR site:who.int)'
    );
    expect(montarConsulta('mamografia', TOTAL)).toBe('mamografia');
    const longa = montarConsulta('x'.repeat(900), LISTA);
    expect(longa).toHaveLength(400);
    expect(longa.endsWith('(site:gov.br OR site:who.int)')).toBe(true);
  });

  it('envia a chave no cabeçalho e descarta resultados fora do alcance', async () => {
    let pedido: URL | null = null;
    let chave: string | null = null;
    const buscar = (async (url: string | URL | Request, init?: RequestInit) => {
      pedido = new URL(String(url));
      chave = new Headers(init?.headers).get('X-Subscription-Token');
      return Response.json(RESPOSTA_DA_API);
    }) as typeof fetch;
    const resultados = await buscarNaInternet('mamografia', LISTA, {
      buscar,
      env: COM_CHAVE,
    });
    expect(pedido!.origin + pedido!.pathname).toBe(
      'https://api.search.brave.com/res/v1/web/search'
    );
    expect(pedido!.searchParams.get('q')).toBe(
      'mamografia (site:gov.br OR site:who.int)'
    );
    expect(chave).toBe('chave-de-teste');
    expect(resultados.map((r) => r.url)).toEqual([
      'https://www.gov.br/inca/mama',
    ]);
    expect(
      await buscarNaInternet('mamografia', TOTAL, { buscar, env: COM_CHAVE })
    ).toHaveLength(2);
  });

  it('sem chave, desligada ou com erro, avisa em vez de fingir que não achou', async () => {
    const recusar = (async () =>
      new Response('limite', { status: 429 })) as typeof fetch;
    expect(buscaDisponivel({})).toBe(false);
    expect(buscaDisponivel(COM_CHAVE)).toBe(true);
    await expect(
      buscarNaInternet('mamografia', LISTA, { env: {} })
    ).rejects.toThrow('busca indisponível');
    await expect(
      buscarNaInternet('mamografia', DESLIGADO, { env: COM_CHAVE })
    ).rejects.toBeInstanceOf(AcessoNegado);
    await expect(
      buscarNaInternet('mamografia', LISTA, { buscar: recusar, env: COM_CHAVE })
    ).rejects.toThrow('HTTP 429');
  });
});

function elo(modelo: string): EloDaCadeia {
  return {
    tipo: 'modelo',
    conexao: {
      tipo: 'openai_compativel',
      baseUrl: 'http://localhost:11434/v1',
      modelo,
      chave: null,
      tempoMaximoSegundos: 30,
      temperatura: 0.2,
    },
    autor: { provedor: 'Ollama', modelo, local: true },
  };
}

/** Modelo falso que segue um roteiro de passos e guarda o que recebeu. */
function modeloComRoteiro(passos: unknown[]) {
  const recebidos: string[] = [];
  let indice = 0;
  const buscarModelo = (async (
    _url: string | URL | Request,
    init?: RequestInit
  ) => {
    const corpo = JSON.parse(String(init?.body)) as {
      messages: Array<{ content: string }>;
    };
    recebidos.push(corpo.messages.at(-1)!.content);
    const passo = passos[Math.min(indice, passos.length - 1)];
    indice += 1;
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              role: 'assistant',
              content:
                typeof passo === 'string' ? passo : JSON.stringify(passo),
            },
            finish_reason: 'stop',
          },
        ],
      }),
      { status: 200 }
    );
  }) as typeof fetch;
  return { buscarModelo, recebidos };
}

describe('Pesquisa do modelo na internet', () => {
  const redeDaPesquisa = () =>
    rede({
      'https://api.search.brave.com/res/v1/web/search': () =>
        Response.json(RESPOSTA_DA_API),
      'https://www.gov.br/inca': () =>
        new Response(
          html('<p>Portal do INCA</p><a href="/inca/mama">Câncer de mama</a>'),
          { headers: { 'content-type': 'text/html' } }
        ),
      'https://www.gov.br/inca/mama': () =>
        new Response(html('<p>Mamografia de 50 a 74 anos</p>', 'INCA'), {
          headers: { 'content-type': 'text/html' },
        }),
    });

  it('sem chave de busca, navega pelos links a partir das páginas oficiais', async () => {
    const { buscar } = redeDaPesquisa();
    const { buscarModelo, recebidos } = modeloComRoteiro([
      { acao: 'buscar', consulta: 'mamografia' },
      { acao: 'ler', url: 'https://www.gov.br/inca' },
      { acao: 'ler', url: 'https://www.gov.br/inca/mama' },
      { acao: 'concluir', resultado: { faixa: '50 a 74' } },
    ]);
    const sistemas: string[] = [];
    const modeloQueGuardaOSistema = (async (
      url: string | URL | Request,
      init?: RequestInit
    ) => {
      const corpo = JSON.parse(String(init?.body)) as {
        messages: Array<{ role: string; content: string }>;
      };
      sistemas.push(corpo.messages[0].content);
      return buscarModelo(url, init);
    }) as typeof fetch;
    const pesquisa = await pesquisarNaInternet({
      cadeia: [elo('pesquisador'), { tipo: 'lyra' }],
      tarefa: 'Qual a faixa da mamografia?',
      rotulo: 'teste',
      instrucoes: 'Você pesquisa recomendações oficiais.',
      acesso: LISTA,
      pontosDePartida: ['https://www.gov.br/inca'],
      buscar,
      resolver: dns(),
      buscarModelo: modeloQueGuardaOSistema,
      env: {},
    });
    expect(sistemas[0]).toContain('a busca por termos não está disponível');
    expect(sistemas[0]).toContain(
      'Comece pelas páginas oficiais: https://www.gov.br/inca'
    );
    expect(recebidos[1]).toContain('A busca falhou: busca indisponível');
    expect(recebidos[2]).toContain(
      'Links da página:\n- Câncer de mama: https://www.gov.br/inca/mama'
    );
    expect(pesquisa.fontes.map((f) => f.url)).toEqual([
      'https://www.gov.br/inca',
      'https://www.gov.br/inca/mama',
    ]);
  });

  it('busca, lê, recusa o que está fora e conclui com as fontes', async () => {
    const { buscar } = redeDaPesquisa();
    const { buscarModelo, recebidos } = modeloComRoteiro([
      { acao: 'buscar', consulta: 'mamografia rastreamento' },
      { acao: 'ler', url: 'https://golpe.com/mama' },
      { acao: 'ler', url: 'https://www.gov.br/inca/mama' },
      { acao: 'concluir', resultado: { faixa: '50 a 74' } },
    ]);
    const registros: string[] = [];
    const pesquisa = await pesquisarNaInternet({
      cadeia: [elo('pesquisador'), { tipo: 'lyra' }],
      tarefa: 'Qual a faixa da mamografia?',
      rotulo: 'teste',
      instrucoes: 'Você pesquisa recomendações oficiais.',
      acesso: LISTA,
      buscar,
      resolver: dns(),
      buscarModelo,
      env: COM_CHAVE,
      registrar: async (c) => {
        registros.push(`${c.tipo}:${c.alvo}:${c.situacao}`);
      },
    });
    expect(pesquisa.resultado).toEqual({ faixa: '50 a 74' });
    expect(pesquisa.fontes).toEqual([
      { url: 'https://www.gov.br/inca/mama', titulo: 'INCA' },
    ]);
    expect(pesquisa.autor.modelo).toBe('pesquisador');
    expect(registros).toEqual([
      'busca:mamografia rastreamento:1 resultados',
      'pagina:https://golpe.com/mama:recusada: domínio fora do alcance liberado: golpe.com',
      'pagina:https://www.gov.br/inca/mama:lida',
    ]);
    expect(recebidos[2]).toContain('A leitura foi recusada');
    expect(recebidos[3]).toContain('Mamografia de 50 a 74 anos');
  });

  it('o resultado final passa pela validação da tarefa', async () => {
    const { buscar } = redeDaPesquisa();
    const { buscarModelo } = modeloComRoteiro([
      { acao: 'concluir', resultado: { faixa: '' } },
    ]);
    await expect(
      pesquisarNaInternet({
        cadeia: [elo('pesquisador'), { tipo: 'lyra' }],
        tarefa: 'Qual a faixa?',
        rotulo: 'teste',
        instrucoes: 'Pesquise.',
        acesso: LISTA,
        buscar,
        resolver: dns(),
        buscarModelo,
        validarResultado: (r) =>
          (r as { faixa: string }).faixa ? null : 'faixa vazia',
      })
    ).rejects.toThrow('Nenhum modelo de IA respondeu');
  });

  it('exige concluir no último passo e respeita o acesso desligado', async () => {
    const { buscar } = redeDaPesquisa();
    const { buscarModelo } = modeloComRoteiro([
      { acao: 'buscar', consulta: 'mamografia' },
      { acao: 'buscar', consulta: 'mamografia de novo' },
    ]);
    await expect(
      pesquisarNaInternet({
        cadeia: [elo('pesquisador'), { tipo: 'lyra' }],
        tarefa: 'Pesquise',
        rotulo: 'teste',
        instrucoes: 'Pesquise.',
        acesso: LISTA,
        maximoDePassos: 2,
        buscar,
        resolver: dns(),
        buscarModelo,
      })
    ).rejects.toThrow('Nenhum modelo de IA respondeu');

    await expect(
      pesquisarNaInternet({
        cadeia: [elo('pesquisador'), { tipo: 'lyra' }],
        tarefa: 'Pesquise',
        rotulo: 'teste',
        instrucoes: 'Pesquise.',
        acesso: DESLIGADO,
        buscarModelo,
      })
    ).rejects.toBeInstanceOf(AcessoNegado);
  });
});
