import { z } from 'zod';

import {
  type AutorDoModelo,
  type EloDaCadeia,
  gerarNaCadeia,
} from '@/lib/ai/cadeia-de-modelos';

import type { AcessoInternet } from './dominios';
import {
  type AmbienteDaBusca,
  buscaDisponivel,
  buscarNaInternet,
} from './busca';
import { lerPagina } from './pagina';
import { AcessoNegado, type Resolvedor } from './seguranca';

/**
 * Pesquisa do modelo de IA na internet (tarefa 212). Funciona com qualquer
 * modelo da cadeia, local ou em nuvem: a cada passo o modelo responde um JSON
 * pedindo uma busca, a leitura de uma página ou a conclusão; o servidor
 * executa dentro do alcance liberado pelo administrador e devolve o texto. O
 * motor da Lyra não acessa a rede: só o modelo, por meio do servidor.
 */

const passoSchema = z.discriminatedUnion('acao', [
  z.object({ acao: z.literal('buscar'), consulta: z.string().min(2).max(300) }),
  z.object({ acao: z.literal('ler'), url: z.string().min(10).max(600) }),
  z.object({ acao: z.literal('concluir'), resultado: z.unknown() }),
]);
type Passo = z.infer<typeof passoSchema>;

export interface Observacao {
  passo: number;
  pedido: string;
  resposta: string;
}

export interface ResultadoDaPesquisa {
  resultado: unknown;
  /** Páginas lidas com sucesso, na ordem. */
  fontes: Array<{ url: string; titulo: string }>;
  observacoes: Observacao[];
  autor: AutorDoModelo;
}

export const MAXIMO_DE_PASSOS = 14;
/** Texto de uma página entregue ao modelo em cada leitura. */
const TRECHO_POR_PAGINA = 7_000;
/** Registro total da pesquisa reenviado ao modelo a cada passo. */
export const LIMITE_DO_REGISTRO = 60_000;
/** Resposta máxima do modelo em cada passo, raciocínio incluído. */
export const TOKENS_POR_PASSO = 4096;
/** Quanto de cada observação antiga sobra quando o registro é resumido. */
const RESUMO_DA_OBSERVACAO = 1_200;
/** Links de cada página repassados ao modelo. */
const LINKS_POR_PAGINA = 40;

/**
 * Esquema JSON de cada passo, enviado como saída estruturada: servidores que
 * a aplicam na geração (Ollama, llama.cpp, vLLM) não deixam o modelo sair do
 * protocolo. No último passo só a conclusão é aceita, com o resultado no
 * esquema da tarefa quando ele é informado.
 */
export function esquemaDoPasso(
  ultimo: boolean,
  comBusca: boolean,
  esquemaDoResultado?: Record<string, unknown>
): Record<string, unknown> {
  const concluir = {
    type: 'object',
    properties: {
      acao: { type: 'string', const: 'concluir' },
      resultado: esquemaDoResultado ?? { type: 'object' },
    },
    required: ['acao', 'resultado'],
    additionalProperties: false,
  };
  if (ultimo) return concluir;
  return {
    anyOf: [
      ...(comBusca
        ? [
            {
              type: 'object',
              properties: {
                acao: { type: 'string', const: 'buscar' },
                consulta: { type: 'string', minLength: 2, maxLength: 300 },
              },
              required: ['acao', 'consulta'],
              additionalProperties: false,
            },
          ]
        : []),
      {
        type: 'object',
        properties: {
          acao: { type: 'string', const: 'ler' },
          url: { type: 'string', minLength: 10, maxLength: 600 },
        },
        required: ['acao', 'url'],
        additionalProperties: false,
      },
      concluir,
    ],
  };
}

/** Endereço comparável: sem fragmento, sem barra final e sem "www.". */
export function enderecoDaPagina(url: string) {
  try {
    const u = new URL(url.trim());
    u.hash = '';
    return `${u.host.toLowerCase().replace(/^www\./, '')}${u.pathname.replace(/\/+$/, '')}${u.search}`;
  } catch {
    return url.trim();
  }
}

/**
 * Registro reenviado ao modelo. Quando passa do limite, as observações mais
 * antigas são resumidas (e, se preciso, reduzidas ao pedido), em vez de
 * sumirem: assim o modelo não esquece o que já leu e não repete leituras.
 */
export function montarRegistro(
  observacoes: Observacao[],
  lidas: Map<string, { passo: number; url: string }>,
  limite: number
) {
  const indice = lidas.size
    ? `Páginas já lidas (o conteúdo está abaixo; não leia de novo):\n${[
        ...lidas.values(),
      ]
        .map((l) => `- passo ${l.passo}: ${l.url}`)
        .join('\n')}`
    : '';
  const corpos = observacoes.map((o) => o.resposta);
  const texto = () =>
    [
      indice,
      ...observacoes.map((o, i) =>
        corpos[i]
          ? `[Passo ${o.passo}] ${o.pedido}\n${corpos[i]}`
          : `[Passo ${o.passo}] ${o.pedido}`
      ),
    ]
      .filter(Boolean)
      .join('\n\n');
  for (let i = 0; i < corpos.length - 1 && texto().length > limite; i += 1) {
    if (corpos[i].length > RESUMO_DA_OBSERVACAO) {
      corpos[i] =
        `${corpos[i].slice(0, RESUMO_DA_OBSERVACAO)}\n(resumido para caber no registro)`;
    }
  }
  for (let i = 0; i < corpos.length - 1 && texto().length > limite; i += 1) {
    corpos[i] = '';
  }
  return texto();
}

function lerPasso(bruto: string): Passo | null {
  try {
    const dados = JSON.parse(
      bruto.trim().replace(/^```(?:json)?\s*|\s*```$/g, '')
    ) as unknown;
    const passo = passoSchema.safeParse(dados);
    return passo.success ? passo.data : null;
  } catch {
    return null;
  }
}

function instrucoesDoProtocolo(
  acesso: AcessoInternet,
  comBusca: boolean,
  pontosDePartida: string[]
) {
  const alcance =
    acesso.modo === 'total'
      ? 'Você pode ler qualquer site público.'
      : `Você só pode ler estes domínios e seus subdomínios: ${acesso.dominios.join(', ')}. Pedidos fora deles serão recusados.`;
  return [
    'Você tem acesso à internet por meio do servidor da Lyra. Responda sempre com UM único objeto JSON, sem texto fora dele:',
    comBusca
      ? '- {"acao": "buscar", "consulta": "termos"} para pesquisar;'
      : '- a busca por termos não está disponível neste servidor: navegue pelos links das páginas lidas;',
    '- {"acao": "ler", "url": "https://..."} para ler uma página;',
    '- {"acao": "concluir", "resultado": {...}} quando terminar, com o resultado no formato pedido pela tarefa.',
    alcance,
    pontosDePartida.length
      ? `Comece pelas páginas oficiais: ${pontosDePartida.join(' , ')}. Cada leitura traz os links da página dentro do alcance, para você seguir.`
      : 'Cada leitura traz os links da página dentro do alcance, para você seguir.',
    'Prefira as fontes oficiais. Só afirme o que estiver nas páginas lidas e cite o endereço de onde tirou cada informação. Se não encontrar, conclua dizendo isso.',
  ].join('\n');
}

export async function pesquisarNaInternet(opcoes: {
  cadeia: EloDaCadeia[];
  tarefa: string;
  /** Rótulo curto da tarefa, para o registro de consultas. */
  rotulo: string;
  instrucoes: string;
  acesso: AcessoInternet;
  /** Páginas oficiais indicadas para o início da navegação. */
  pontosDePartida?: string[];
  /** Valida o resultado final (com as páginas já lidas); devolve o motivo da recusa ou `null`. */
  validarResultado?: (
    resultado: unknown,
    fontes: ResultadoDaPesquisa['fontes']
  ) => string | null;
  maximoDePassos?: number;
  /** Resposta máxima por passo; a conclusão precisa caber nela. */
  maximoDeTokens?: number;
  /** Tamanho máximo do registro reenviado ao modelo a cada passo. */
  limiteDoRegistro?: number;
  /**
   * Esquema JSON do resultado, imposto na conclusão (saída estruturada). Como
   * função, recebe as páginas já lidas: a tarefa pode limitar as fontes
   * citáveis a elas.
   */
  esquemaDoResultado?:
    | Record<string, unknown>
    | ((fontes: ResultadoDaPesquisa['fontes']) => Record<string, unknown>);
  registrar?: (consulta: {
    tarefa: string;
    tipo: 'busca' | 'pagina';
    alvo: string;
    situacao: string;
  }) => Promise<void>;
  buscar?: typeof fetch;
  resolver?: Resolvedor;
  buscarModelo?: typeof fetch;
  env?: AmbienteDaBusca;
  /** Chamado no início de cada passo, para mostrar o andamento. */
  aoPasso?: (andamento: {
    passo: number;
    maximo: number;
    paginasLidas: number;
  }) => Promise<void>;
}): Promise<ResultadoDaPesquisa> {
  if (opcoes.acesso.modo === 'desligado') {
    throw new AcessoNegado(
      'O acesso do modelo à internet está desligado na administração.'
    );
  }
  const registrar = opcoes.registrar ?? (async () => undefined);
  const observacoes: Observacao[] = [];
  const fontes: ResultadoDaPesquisa['fontes'] = [];
  const lidas = new Map<string, { passo: number; url: string }>();
  // Endereços recusados (404, fora do alcance, rede interna): não se repetem.
  const recusadas = new Map<string, { passo: number; motivo: string }>();
  const maximo = opcoes.maximoDePassos ?? MAXIMO_DE_PASSOS;
  const comBusca = buscaDisponivel(opcoes.env);
  const protocolo = instrucoesDoProtocolo(
    opcoes.acesso,
    comBusca,
    opcoes.pontosDePartida ?? []
  );

  for (let passo = 1; passo <= maximo; passo += 1) {
    await opcoes.aoPasso?.({ passo, maximo, paginasLidas: fontes.length });
    const registro = montarRegistro(
      observacoes,
      lidas,
      opcoes.limiteDoRegistro ?? LIMITE_DO_REGISTRO
    );
    const ultimo = passo === maximo;
    const gerado = await gerarNaCadeia(
      opcoes.cadeia,
      {
        sistema: `${opcoes.instrucoes}\n\n${protocolo}`,
        usuario: [
          `Tarefa:\n${opcoes.tarefa}`,
          registro ? `Registro da pesquisa até agora:\n${registro}` : '',
          ultimo
            ? 'Este é o último passo: responda com {"acao": "concluir", ...}.'
            : `Passo ${passo} de ${maximo}. Qual a próxima ação?`,
        ]
          .filter(Boolean)
          .join('\n\n'),
        json: true,
        esquemaJson: esquemaDoPasso(
          ultimo,
          comBusca,
          typeof opcoes.esquemaDoResultado === 'function'
            ? opcoes.esquemaDoResultado(fontes)
            : opcoes.esquemaDoResultado
        ),
        nomeDoEsquema: 'passo_da_pesquisa',
        maximoDeTokens: opcoes.maximoDeTokens ?? TOKENS_POR_PASSO,
      },
      {
        rotulo: `internet:${opcoes.rotulo}`,
        ocultarMotivosNoLog: true,
        buscar: opcoes.buscarModelo,
        validar: (bruto) => {
          const lido = lerPasso(bruto);
          if (!lido) return 'resposta fora do protocolo de pesquisa';
          if (ultimo && lido.acao !== 'concluir')
            return 'no último passo é preciso concluir';
          if (lido.acao === 'concluir' && opcoes.validarResultado)
            return opcoes.validarResultado(lido.resultado, fontes);
          return null;
        },
      }
    );
    if (gerado.origem === 'lyra') {
      // A tarefa é administrativa e não leva dado pessoal: o motivo de cada
      // modelo ajuda o administrador a corrigir a configuração.
      const motivos = gerado.tentativas
        .map(
          (t) =>
            `${t.provedor} · ${t.modelo}: ${t.resultado}${t.motivo ? ` (${t.motivo.slice(0, 200)})` : ''}`
        )
        .join('; ');
      throw new Error(
        `Nenhum modelo de IA respondeu à pesquisa no formato combinado (passo ${passo}${motivos ? `; ${motivos}` : ''}).`
      );
    }
    const pedido = lerPasso(gerado.texto)!;
    if (pedido.acao === 'concluir') {
      return {
        resultado: pedido.resultado,
        fontes,
        observacoes,
        autor: gerado.autor,
      };
    }

    if (pedido.acao === 'buscar') {
      try {
        const resultados = await buscarNaInternet(
          pedido.consulta,
          opcoes.acesso,
          { buscar: opcoes.buscar, env: opcoes.env }
        );
        await registrar({
          tarefa: opcoes.rotulo,
          tipo: 'busca',
          alvo: pedido.consulta,
          situacao: `${resultados.length} resultados`,
        });
        observacoes.push({
          passo,
          pedido: `Busca: ${pedido.consulta}`,
          resposta: resultados.length
            ? resultados
                .map(
                  (r, i) => `${i + 1}. ${r.titulo}\n   ${r.url}\n   ${r.trecho}`
                )
                .join('\n')
            : 'Nenhum resultado no alcance liberado.',
        });
      } catch (erro) {
        const motivo = erro instanceof Error ? erro.message : 'falha na busca';
        await registrar({
          tarefa: opcoes.rotulo,
          tipo: 'busca',
          alvo: pedido.consulta,
          situacao: `falhou: ${motivo}`,
        });
        observacoes.push({
          passo,
          pedido: `Busca: ${pedido.consulta}`,
          resposta: `A busca falhou: ${motivo}.`,
        });
      }
      continue;
    }

    const jaLida = lidas.get(enderecoDaPagina(pedido.url));
    if (jaLida) {
      observacoes.push({
        passo,
        pedido: `Leitura: ${pedido.url}`,
        resposta: `Esta página já foi lida no passo ${jaLida.passo} e o conteúdo está no registro. Siga outro link ou conclua com o que já leu.`,
      });
      continue;
    }
    const jaRecusada = recusadas.get(enderecoDaPagina(pedido.url));
    if (jaRecusada) {
      observacoes.push({
        passo,
        pedido: `Leitura: ${pedido.url}`,
        resposta: `Esta página já foi recusada no passo ${jaRecusada.passo} (${jaRecusada.motivo}). Não peça de novo: use um link que apareceu nas páginas lidas ou conclua.`,
      });
      continue;
    }

    try {
      const pagina = await lerPagina(pedido.url, opcoes.acesso, {
        buscar: opcoes.buscar,
        resolver: opcoes.resolver,
      });
      // O endereço pedido e o final (após redirecionamentos) contam como lidos.
      for (const endereco of [pedido.url, pagina.url]) {
        lidas.set(enderecoDaPagina(endereco), { passo, url: pagina.url });
      }
      fontes.push({ url: pagina.url, titulo: pagina.titulo });
      await registrar({
        tarefa: opcoes.rotulo,
        tipo: 'pagina',
        alvo: pagina.url,
        situacao: 'lida',
      });
      observacoes.push({
        passo,
        pedido: `Leitura: ${pagina.url}`,
        resposta: [
          `Título: ${pagina.titulo || '(sem título)'}`,
          `${pagina.texto.slice(0, TRECHO_POR_PAGINA)}${pagina.texto.length > TRECHO_POR_PAGINA || pagina.cortado ? '\n(texto cortado)' : ''}`,
          pagina.links.length
            ? `Links da página:\n${pagina.links
                .slice(0, LINKS_POR_PAGINA)
                .map((link) => `- ${link.texto}: ${link.url}`)
                .join('\n')}`
            : 'A página não tem links dentro do alcance.',
        ].join('\n'),
      });
    } catch (erro) {
      const motivo = erro instanceof Error ? erro.message : 'falha na leitura';
      recusadas.set(enderecoDaPagina(pedido.url), { passo, motivo });
      await registrar({
        tarefa: opcoes.rotulo,
        tipo: 'pagina',
        alvo: pedido.url,
        situacao: `recusada: ${motivo}`,
      });
      observacoes.push({
        passo,
        pedido: `Leitura: ${pedido.url}`,
        resposta: `A leitura foi recusada: ${motivo}.`,
      });
    }
  }
  throw new Error('A pesquisa terminou sem conclusão do modelo.');
}
