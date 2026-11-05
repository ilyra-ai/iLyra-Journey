import { lerFluxoDoProvedor } from './fluxo-de-texto';
import { type TipoDeProvedor, urlEhLocal } from './provedores-catalogo';
import { buscarComAcessoLocal } from './transporte-local-wsl';
import {
  descobrirModelosLocais,
  solicitarInferenciaIntegrada,
} from './inferencia-integrada';

/**
 * Cliente HTTP dos provedores de IA (servidor). Fala as três APIs aceitas
 * (chat completions compatível com a OpenAI, Gemini nativo e Anthropic
 * Messages), com tempo máximo, chave sempre em cabeçalho e mensagens de erro
 * que nunca repetem a chave.
 */

export interface ConexaoDeIa {
  tipo: Exclude<TipoDeProvedor, 'lyra_local'>;
  /** Obrigatória para `openai_compativel`; ignorada nas APIs nativas. */
  baseUrl: string | null;
  /** Executa o GGUF diretamente pela Lyra via socket Unix privado. */
  integrado?: boolean;
  modelo: string;
  chave: string | null;
  tempoMaximoSegundos: number;
  temperatura: number;
  /**
   * Só `openai_compativel`: o servidor descarta a mensagem de sistema e o
   * `response_format` (ver `mensagensOpenAi`). Ausente equivale a `false`.
   */
  instrucoesNaMensagem?: boolean;
}

export class ErroDoProvedor extends Error {
  constructor(
    message: string,
    readonly status: number | null = null
  ) {
    super(message);
    this.name = 'ErroDoProvedor';
  }
}

const URL_DO_GEMINI = 'https://generativelanguage.googleapis.com/v1beta';
const URL_DA_ANTHROPIC = 'https://api.anthropic.com/v1';
const VERSAO_DA_ANTHROPIC = '2023-06-01';

/** URL base sem barra final; só http(s) e sem usuário/senha embutidos. */
export function normalizarBaseUrl(valor: string): string {
  let url: URL;
  try {
    url = new URL(valor.trim());
  } catch {
    throw new ErroDoProvedor('URL base inválida.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ErroDoProvedor(
      'A URL base precisa começar com http:// ou https://.'
    );
  }
  if (url.username || url.password) {
    throw new ErroDoProvedor(
      'Não coloque usuário ou senha na URL: use o campo da chave.'
    );
  }
  url.hash = '';
  url.search = '';
  return url.toString().replace(/\/+$/, '');
}

function ocultarChave(texto: string, chave: string | null) {
  return chave ? texto.split(chave).join('•••') : texto;
}

async function requisitar(
  conexao: ConexaoDeIa,
  url: string,
  init: RequestInit,
  buscar: typeof fetch,
  fluxo?: Pick<PedidoDeTexto, 'aoTexto' | 'cancelamento'>
): Promise<unknown> {
  let resposta: Response;
  try {
    const sinal = AbortSignal.any([
      AbortSignal.timeout(conexao.tempoMaximoSegundos * 1000),
      ...(fluxo?.cancelamento ? [fluxo.cancelamento] : []),
    ]);
    resposta = conexao.integrado
      ? await solicitarInferenciaIntegrada(
          conexao.modelo,
          String(init.body ?? ''),
          sinal
        )
      : await buscarComAcessoLocal(
          url,
          { ...init, cache: 'no-store', signal: sinal },
          buscar
        );
  } catch (erro) {
    fluxo?.cancelamento?.throwIfAborted();
    const nome = erro instanceof Error ? erro.name : '';
    if (nome === 'TimeoutError' || nome === 'AbortError') {
      throw new ErroDoProvedor(
        `Sem resposta em ${conexao.tempoMaximoSegundos} s (tempo máximo).`
      );
    }
    const causa =
      erro instanceof Error && erro.cause instanceof Error
        ? erro.cause.message
        : erro instanceof Error
          ? erro.message
          : 'falha de rede';
    throw new ErroDoProvedor(
      `Não foi possível conectar: ${ocultarChave(causa, conexao.chave)}.`
    );
  }
  if (
    resposta.ok &&
    fluxo?.aoTexto &&
    resposta.body &&
    resposta.headers.get('content-type')?.includes('text/event-stream')
  ) {
    return lerFluxoDoProvedor(
      resposta.body,
      conexao.tipo,
      fluxo.aoTexto,
      fluxo.cancelamento
    );
  }
  const texto = await resposta.text();
  // O transporte de compatibilidade com loopback do Windows já recebe o
  // corpo inteiro e não conserva cabeçalhos. Decodificar sem publicar deltas
  // nesse caso mantém a resposta válida, sem fingir transmissão progressiva.
  if (resposta.ok && fluxo?.aoTexto && /^\s*(?:data:|event:|:)/.test(texto)) {
    return lerFluxoDoProvedor(
      new Response(texto).body!,
      conexao.tipo,
      () => undefined,
      fluxo.cancelamento
    );
  }
  let corpo: unknown = null;
  try {
    corpo = texto ? JSON.parse(texto) : null;
  } catch {
    corpo = null;
  }
  if (!resposta.ok) {
    const detalhe =
      (typeof corpo === 'object' &&
        corpo !== null &&
        (() => {
          const erro = (corpo as { error?: unknown }).error;
          if (typeof erro === 'string') return erro;
          if (typeof erro === 'object' && erro !== null) {
            const mensagem = (erro as { message?: unknown }).message;
            return typeof mensagem === 'string' ? mensagem : null;
          }
          return null;
        })()) ||
      texto.slice(0, 300) ||
      resposta.statusText;
    throw new ErroDoProvedor(
      `O provedor respondeu HTTP ${resposta.status}: ${ocultarChave(String(detalhe), conexao.chave).slice(0, 300)}`,
      resposta.status
    );
  }
  if (corpo === null) {
    throw new ErroDoProvedor('O provedor respondeu sem um JSON válido.');
  }
  return corpo;
}

function cabecalhosOpenAi(conexao: ConexaoDeIa) {
  const cabecalhos: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (conexao.chave) cabecalhos.Authorization = `Bearer ${conexao.chave}`;
  return cabecalhos;
}

function baseObrigatoria(conexao: ConexaoDeIa) {
  if (!conexao.baseUrl) {
    throw new ErroDoProvedor('Informe a URL base do servidor de IA.');
  }
  return normalizarBaseUrl(conexao.baseUrl);
}

function exigirChave(conexao: ConexaoDeIa) {
  if (!conexao.chave) {
    throw new ErroDoProvedor('Este provedor exige uma chave de API.');
  }
  return conexao.chave;
}

/** Modelos oferecidos pelo provedor, em ordem alfabética. */
export async function listarModelos(
  conexao: Omit<ConexaoDeIa, 'modelo' | 'temperatura'>,
  buscar: typeof fetch = fetch
): Promise<string[]> {
  if (conexao.integrado) {
    return (await descobrirModelosLocais()).map((modelo) => modelo.id).sort();
  }
  const completa: ConexaoDeIa = { ...conexao, modelo: '', temperatura: 0 };
  let ids: string[] = [];
  if (conexao.tipo === 'openai_compativel') {
    const corpo = (await requisitar(
      completa,
      `${baseObrigatoria(completa)}/models`,
      { method: 'GET', headers: cabecalhosOpenAi(completa) },
      buscar
    )) as { data?: Array<{ id?: unknown }>; models?: Array<{ id?: unknown }> };
    ids = [...(corpo.data ?? []), ...(corpo.models ?? [])]
      .map((m) => (typeof m.id === 'string' ? m.id : ''))
      .filter(Boolean);
  } else if (conexao.tipo === 'gemini') {
    const corpo = (await requisitar(
      completa,
      `${URL_DO_GEMINI}/models?pageSize=200`,
      {
        method: 'GET',
        headers: { 'x-goog-api-key': exigirChave(completa) },
      },
      buscar
    )) as {
      models?: Array<{
        name?: unknown;
        supportedGenerationMethods?: unknown;
      }>;
    };
    ids = (corpo.models ?? [])
      .filter(
        (m) =>
          Array.isArray(m.supportedGenerationMethods) &&
          m.supportedGenerationMethods.includes('generateContent')
      )
      .map((m) =>
        typeof m.name === 'string' ? m.name.replace(/^models\//, '') : ''
      )
      .filter(Boolean);
  } else {
    const corpo = (await requisitar(
      completa,
      `${URL_DA_ANTHROPIC}/models?limit=100`,
      {
        method: 'GET',
        headers: {
          'x-api-key': exigirChave(completa),
          'anthropic-version': VERSAO_DA_ANTHROPIC,
        },
      },
      buscar
    )) as { data?: Array<{ id?: unknown }> };
    ids = (corpo.data ?? [])
      .map((m) => (typeof m.id === 'string' ? m.id : ''))
      .filter(Boolean);
  }
  return [...new Set(ids)].sort((a, b) => a.localeCompare(b));
}

export interface PedidoDeTexto {
  sistema: string;
  usuario: string;
  /** Bytes validados no servidor; nunca URLs fornecidas pelo usuário. */
  imagens?: Array<{ tipo: 'image/png'; base64: string }>;
  /** Pede JSON ao provedor quando a API tem esse modo (Gemini). */
  json?: boolean;
  /** JSON Schema da resposta, para saída estruturada (ver `formatosDeSaida`). */
  esquemaJson?: Record<string, unknown>;
  nomeDoEsquema?: string;
  maximoDeTokens?: number;
  /** Trechos reais recebidos do provedor; sem animação artificial. */
  aoTexto?: (texto: string) => void;
  cancelamento?: AbortSignal;
}

/**
 * Formatos de saída estruturada, do mais preciso ao mais simples. Com um
 * JSON Schema, o servidor gera presa a ele por gramática (llama.cpp, Ollama,
 * LM Studio, vLLM, OpenAI): o padrão `json_schema` da OpenAI, depois
 * `json_object` com o esquema (llama-cpp-python e llama.cpp) e, por último,
 * sem formato (servidores que recusam os anteriores). Sem esquema, só o
 * pedido livre.
 */
function formatosDeSaida(
  pedido: PedidoDeTexto
): Array<Record<string, unknown> | null> {
  if (!pedido.esquemaJson) return [null];
  return [
    {
      type: 'json_schema',
      json_schema: {
        name: pedido.nomeDoEsquema ?? 'resposta',
        schema: pedido.esquemaJson,
        strict: true,
      },
    },
    { type: 'json_object', schema: pedido.esquemaJson },
    null,
  ];
}

/**
 * Recusa imediata do formato pedido (o servidor não gerou nada): 400/422, ou
 * qualquer status cuja mensagem cite o campo do formato (o llama-cpp-python
 * responde 500 com o erro de validação de `response_format`; o Gemini cita
 * `response_json_schema`).
 */
function formatoRecusado(erro: unknown) {
  if (!(erro instanceof ErroDoProvedor) || erro.status === null) return false;
  return (
    erro.status === 400 ||
    erro.status === 422 ||
    /response_format|response_?json_?schema/i.test(erro.message)
  );
}

/**
 * Instruções e esquema escritos na própria mensagem do usuário, para
 * servidores que descartam a mensagem de sistema e o `response_format`.
 */
export function instrucoesComoMensagem(pedido: PedidoDeTexto) {
  const formato = pedido.esquemaJson
    ? '\n\nResponda somente com um objeto JSON válido que siga exatamente este JSON Schema, sem markdown e sem texto fora do JSON:\n' +
      JSON.stringify(pedido.esquemaJson)
    : pedido.json
      ? '\n\nResponda somente com um objeto JSON válido, sem markdown e sem texto fora do JSON.'
      : '';
  return (
    'Instruções do sistema (siga-as integralmente):\n' +
    pedido.sistema +
    formato +
    '\n\n---\n\n' +
    pedido.usuario
  );
}

/**
 * Mensagens do chat completions. Com `instrucoesNaMensagem`, tudo vai em uma
 * única mensagem do usuário: o Jan, por exemplo, troca a mensagem de sistema
 * pelas instruções do próprio assistente e ignora o `response_format`, mas
 * segue o que está na mensagem do usuário. O `response_format` continua
 * sendo enviado para os servidores que o respeitam.
 */
export function mensagensOpenAi(conexao: ConexaoDeIa, pedido: PedidoDeTexto) {
  const juntas = Boolean(conexao.instrucoesNaMensagem);
  const texto = juntas ? instrucoesComoMensagem(pedido) : pedido.usuario;
  const usuario = {
    role: 'user',
    content: pedido.imagens?.length
      ? [
          ...pedido.imagens.map((i) => ({
            type: 'image_url',
            image_url: { url: `data:${i.tipo};base64,${i.base64}` },
          })),
          { type: 'text', text: texto },
        ]
      : texto,
  };
  return juntas
    ? [usuario]
    : [{ role: 'system', content: pedido.sistema }, usuario];
}

/** Remove raciocínio exposto (`<think>`) que alguns modelos locais devolvem. */
export function semRaciocinio(texto: string) {
  return texto.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

/** Texto gerado e se ele foi cortado no limite de tokens da resposta. */
export interface TextoGerado {
  texto: string;
  /**
   * A resposta parou no limite de tokens (OpenAI `finish_reason: length`,
   * Gemini `MAX_TOKENS`, Anthropic `max_tokens`): o texto está incompleto e
   * pode ser continuado por outro modelo (ver cadeia-de-modelos.ts).
   */
  cortado: boolean;
}

/** Texto gerado pelo modelo configurado. */
export async function gerarTexto(
  conexao: ConexaoDeIa,
  pedido: PedidoDeTexto,
  buscar: typeof fetch = fetch
): Promise<string> {
  return (await gerarTextoDetalhado(conexao, pedido, buscar)).texto;
}

/**
 * Como `gerarTexto`, informando também se a resposta foi cortada no limite
 * de tokens (tarefa 54). Um raciocínio (`<think>`) cortado antes de fechar
 * não é texto da resposta e é descartado.
 */
export async function gerarTextoDetalhado(
  conexao: ConexaoDeIa,
  pedido: PedidoDeTexto,
  buscar: typeof fetch = fetch
): Promise<TextoGerado> {
  if (!conexao.modelo.trim()) {
    throw new ErroDoProvedor('Escolha o modelo.');
  }
  let texto = '';
  let cortado = false;
  if (conexao.tipo === 'openai_compativel') {
    const formatos = formatosDeSaida(pedido);
    let corpo: {
      choices?: Array<{
        message?: { content?: unknown };
        finish_reason?: unknown;
      }>;
    } = {};
    for (const [indice, formato] of formatos.entries()) {
      try {
        corpo = (await requisitar(
          conexao,
          conexao.integrado
            ? '/v1/chat/completions'
            : `${baseObrigatoria(conexao)}/chat/completions`,
          {
            method: 'POST',
            headers: cabecalhosOpenAi(conexao),
            body: JSON.stringify({
              model: conexao.modelo,
              temperature: conexao.temperatura,
              stream: Boolean(pedido.aoTexto),
              messages: mensagensOpenAi(conexao, pedido),
              // O motor integrado reserva os tokens para a resposta visível.
              // O ID opaco não permite reconhecer Qwen pelo nome; templates
              // sem esse parâmetro apenas não o utilizam.
              ...(conexao.integrado ||
              (pedido.esquemaJson &&
                /(?:^|\/)qwen3[._-]/i.test(conexao.modelo) &&
                urlEhLocal(conexao.baseUrl))
                ? { chat_template_kwargs: { enable_thinking: false } }
                : {}),
              ...(pedido.maximoDeTokens
                ? { max_tokens: pedido.maximoDeTokens }
                : {}),
              ...(formato ? { response_format: formato } : {}),
            }),
          },
          buscar,
          pedido
        )) as typeof corpo;
        break;
      } catch (erro) {
        if (!formatoRecusado(erro) || indice === formatos.length - 1) {
          throw erro;
        }
      }
    }
    const conteudo = corpo.choices?.[0]?.message?.content;
    texto = typeof conteudo === 'string' ? conteudo : '';
    cortado = corpo.choices?.[0]?.finish_reason === 'length';
  } else if (conexao.tipo === 'gemini') {
    const comEsquema = pedido.esquemaJson ? [true, false] : [false];
    let corpo: {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: unknown }> };
        finishReason?: unknown;
      }>;
    } = {};
    for (const [indice, usarEsquema] of comEsquema.entries()) {
      try {
        corpo = (await requisitar(
          conexao,
          `${URL_DO_GEMINI}/models/${encodeURIComponent(conexao.modelo)}:${pedido.aoTexto ? 'streamGenerateContent?alt=sse' : 'generateContent'}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // Chave no cabeçalho, nunca na URL (que aparece em logs de proxy).
              'x-goog-api-key': exigirChave(conexao),
            },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: pedido.sistema }] },
              contents: [
                {
                  role: 'user',
                  parts: [
                    ...(pedido.imagens ?? []).map((i) => ({
                      inlineData: { mimeType: i.tipo, data: i.base64 },
                    })),
                    { text: pedido.usuario },
                  ],
                },
              ],
              generationConfig: {
                temperature: conexao.temperatura,
                ...(pedido.maximoDeTokens
                  ? { maxOutputTokens: pedido.maximoDeTokens }
                  : {}),
                ...(pedido.json || pedido.esquemaJson
                  ? { responseMimeType: 'application/json' }
                  : {}),
                ...(usarEsquema
                  ? { responseJsonSchema: pedido.esquemaJson }
                  : {}),
              },
            }),
          },
          buscar,
          pedido
        )) as typeof corpo;
        break;
      } catch (erro) {
        if (!formatoRecusado(erro) || indice === comEsquema.length - 1) {
          throw erro;
        }
      }
    }
    texto = (corpo.candidates?.[0]?.content?.parts ?? [])
      .map((parte) => (typeof parte.text === 'string' ? parte.text : ''))
      .join('');
    cortado = corpo.candidates?.[0]?.finishReason === 'MAX_TOKENS';
  } else {
    const corpo = (await requisitar(
      conexao,
      `${URL_DA_ANTHROPIC}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': exigirChave(conexao),
          'anthropic-version': VERSAO_DA_ANTHROPIC,
        },
        body: JSON.stringify({
          model: conexao.modelo,
          ...(pedido.aoTexto ? { stream: true } : {}),
          max_tokens: pedido.maximoDeTokens ?? 4096,
          // A API Messages aceita temperatura de 0 a 1.
          temperature: Math.min(1, conexao.temperatura),
          system: pedido.sistema,
          messages: [
            {
              role: 'user',
              content: pedido.imagens?.length
                ? [
                    ...pedido.imagens.map((i) => ({
                      type: 'image',
                      source: {
                        type: 'base64',
                        media_type: i.tipo,
                        data: i.base64,
                      },
                    })),
                    { type: 'text', text: pedido.usuario },
                  ]
                : pedido.usuario,
            },
          ],
        }),
      },
      buscar,
      pedido
    )) as {
      content?: Array<{ type?: unknown; text?: unknown }>;
      stop_reason?: unknown;
    };
    texto = (corpo.content ?? [])
      .map((bloco) =>
        bloco.type === 'text' && typeof bloco.text === 'string'
          ? bloco.text
          : ''
      )
      .join('');
    cortado = corpo.stop_reason === 'max_tokens';
  }
  // Raciocínio aberto e não fechado (cortado no meio) sai inteiro.
  const semPensamento = texto
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<think>[\s\S]*$/i, '');
  // O próximo modelo precisa receber o trecho incompleto sem perder os
  // espaços que pertencem ao conteúdo (inclusive dentro de strings JSON).
  const limpo = cortado ? semPensamento : semPensamento.trim();
  if (!limpo.trim()) {
    throw new ErroDoProvedor(
      cortado
        ? 'O modelo atingiu o limite de tokens antes de escrever a resposta.'
        : 'O modelo respondeu sem texto.'
    );
  }
  return { texto: limpo, cortado };
}

/**
 * Primeiro objeto JSON do texto: aceita a resposta pura, cercada por ```json
 * ou com frases antes e depois (comum em modelos locais pequenos).
 */
export function extrairJson(texto: string): unknown {
  const limpo = semRaciocinio(texto)
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  try {
    return JSON.parse(limpo);
  } catch {
    const inicio = limpo.indexOf('{');
    const fim = limpo.lastIndexOf('}');
    if (inicio === -1 || fim <= inicio) {
      throw new ErroDoProvedor('A resposta do modelo não contém JSON.');
    }
    try {
      return JSON.parse(limpo.slice(inicio, fim + 1));
    } catch {
      throw new ErroDoProvedor('A resposta do modelo tem um JSON inválido.');
    }
  }
}
