/**
 * Uso de tokens das chamadas aos modelos de IA (tarefa 163). Só números e
 * identificação técnica: nunca o pedido nem a resposta, que podem ter dados
 * pessoais e de saúde.
 *
 * O registro passa por um ponto único (`definirRegistroDoUso`), ligado à
 * gravação no MySQL na inicialização do servidor (`instrumentation.ts`).
 * Sem ele (testes unitários, scripts), nada é gravado.
 */

export interface UsoDeTokens {
  entrada: number | null;
  saida: number | null;
  /** Tokens de raciocínio, quando o provedor os informa à parte. */
  raciocinio: number | null;
}

export const USO_DESCONHECIDO: UsoDeTokens = {
  entrada: null,
  saida: null,
  raciocinio: null,
};

export type ResultadoDaChamada = 'ok' | 'cortado' | 'recusado' | 'falhou';

export interface RegistroDeUso {
  /** Conta que motivou a chamada; `null` em rotinas sem titular. */
  titular: string | null;
  rotulo: string;
  provedor: string;
  modelo: string;
  local: boolean;
  resultado: ResultadoDaChamada;
  uso: UsoDeTokens;
  milissegundos: number;
}

type Registro = (registro: RegistroDeUso) => Promise<void>;
// No globalThis, como o pool do MySQL: o Next empacota a inicialização
// (instrumentation.ts) e as rotas em pacotes separados, cada um com a sua
// cópia deste módulo; uma variável do módulo não chegaria às rotas.
const estado = globalThis as typeof globalThis & {
  __lyraRegistroDoUso?: Registro | null;
};

/** Liga a gravação (servidor) ou a desliga (`null`). */
export function definirRegistroDoUso(funcao: Registro | null) {
  estado.__lyraRegistroDoUso = funcao;
}

/** Grava sem atrasar nem derrubar a resposta: falha só vai para o log. */
export function registrarUso(registro: RegistroDeUso) {
  const registrar = estado.__lyraRegistroDoUso;
  if (!registrar) return;
  registrar(registro).catch((erro: unknown) => {
    console.warn(
      '[ia:uso] não foi possível registrar o uso:',
      erro instanceof Error ? erro.message : 'falha desconhecida'
    );
  });
}

function numero(valor: unknown) {
  return typeof valor === 'number' && Number.isFinite(valor) && valor >= 0
    ? Math.round(valor)
    : null;
}

/** Lê o uso informado no corpo da resposta de cada tipo de provedor. */
export function usoDoCorpo(
  tipo: 'openai_compativel' | 'gemini' | 'anthropic',
  corpo: unknown
): UsoDeTokens {
  if (typeof corpo !== 'object' || corpo === null) return USO_DESCONHECIDO;
  if (tipo === 'gemini') {
    const uso = (corpo as { usageMetadata?: Record<string, unknown> })
      .usageMetadata;
    if (!uso) return USO_DESCONHECIDO;
    return {
      entrada: numero(uso.promptTokenCount),
      saida: numero(uso.candidatesTokenCount),
      raciocinio: numero(uso.thoughtsTokenCount),
    };
  }
  const uso = (corpo as { usage?: Record<string, unknown> }).usage;
  if (!uso) return USO_DESCONHECIDO;
  if (tipo === 'anthropic')
    return {
      entrada: numero(uso.input_tokens),
      saida: numero(uso.output_tokens),
      raciocinio: null,
    };
  const detalhes = uso.completion_tokens_details as
    Record<string, unknown> | undefined;
  return {
    entrada: numero(uso.prompt_tokens),
    saida: numero(uso.completion_tokens),
    raciocinio: numero(detalhes?.reasoning_tokens),
  };
}
