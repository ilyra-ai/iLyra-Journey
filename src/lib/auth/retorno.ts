/**
 * Retorno ao destino depois do login (tarefa 159). A URL e o navegador
 * carregam só um identificador de uma lista fechada, nunca um caminho livre
 * (sem open redirect) nem dado pessoal: o nome e a data do Experimente
 * Grátis continuam sem ser gravados (decisão do titular de 09/11/2026).
 */

export const DESTINOS_DE_RETORNO = {
  /** Escolha do valor da assinatura. */
  planos: '/planos',
  /** Painel com os quatro mapas. */
  mapas: '/',
} as const;

export type IdDeRetorno = keyof typeof DESTINOS_DE_RETORNO;

/** Caminho interno do identificador, ou `null` para qualquer outro valor. */
export function destinoDeRetorno(id: string | null | undefined): string | null {
  if (!id || !Object.hasOwn(DESTINOS_DE_RETORNO, id)) return null;
  return DESTINOS_DE_RETORNO[id as IdDeRetorno];
}

const CHAVE = 'lyra:retorno';

/** Guarda o identificador na aba atual (sessionStorage), se for válido. */
export function guardarRetorno(id: string | null | undefined) {
  if (!destinoDeRetorno(id)) return;
  try {
    sessionStorage.setItem(CHAVE, id as string);
  } catch {
    // Armazenamento bloqueado (navegação privada): segue para o painel.
  }
}

/** Destino guardado nesta aba, já validado; `null` se não houver. */
export function lerRetorno(): string | null {
  try {
    return destinoDeRetorno(sessionStorage.getItem(CHAVE));
  } catch {
    return null;
  }
}

export function esquecerRetorno() {
  try {
    sessionStorage.removeItem(CHAVE);
  } catch {
    // Nada a limpar quando o armazenamento está bloqueado.
  }
}

/**
 * Valor de contribuição escolhido no convite da assinatura (tarefa 161),
 * só para vir pré-selecionado em /planos. É só o identificador da opção
 * ("colaboracao_999"); o servidor confere a opção de novo no checkout.
 */
const CHAVE_DA_CONTRIBUICAO = 'lyra:contribuicao';
const CONTRIBUICAO = /^colaboracao_\d{1,6}$/;

export function guardarContribuicao(chave: string) {
  if (!CONTRIBUICAO.test(chave)) return;
  try {
    sessionStorage.setItem(CHAVE_DA_CONTRIBUICAO, chave);
  } catch {
    // Sem armazenamento, /planos começa pelo primeiro valor.
  }
}

/** No logout: o valor escolhido não passa para a próxima pessoa da aba. */
export function esquecerContribuicao() {
  try {
    sessionStorage.removeItem(CHAVE_DA_CONTRIBUICAO);
  } catch {
    // Nada a limpar quando o armazenamento está bloqueado.
  }
}

/**
 * Valor que /planos marca primeiro: o escolhido no convite, se ainda for uma
 * opção disponível; senão o primeiro disponível.
 */
export function contribuicaoInicial(
  disponiveis: readonly { key: string }[],
  escolhida: string | null
) {
  return disponiveis.some((o) => o.key === escolhida)
    ? (escolhida as string)
    : (disponiveis[0]?.key ?? '');
}

export function lerContribuicao(): string | null {
  try {
    const chave = sessionStorage.getItem(CHAVE_DA_CONTRIBUICAO);
    return chave && CONTRIBUICAO.test(chave) ? chave : null;
  } catch {
    return null;
  }
}
