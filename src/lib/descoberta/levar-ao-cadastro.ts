/**
 * Levar a leitura gratuita para a conta (tarefa 188), só com o pedido
 * explícito da pessoa. O nome e a data ficam apenas na MEMÓRIA desta janela
 * (uma variável do módulo), como pede a política de privacidade: nada de
 * localStorage, sessionStorage, cookie ou URL. Eles atravessam a navegação
 * interna do app até o cadastro e o onboarding; recarregar ou fechar a
 * janela apaga tudo, e o pedido vence em 30 minutos.
 */

export interface DadosDaLeitura {
  nome: string;
  /** AAAA-MM-DD */
  dataDeNascimento: string;
}

export const VALIDADE_MS = 30 * 60 * 1000;

let pendente: (DadosDaLeitura & { ate: number }) | null = null;

export function guardarParaOCadastro(
  dados: DadosDaLeitura,
  agora = Date.now()
) {
  pendente = { ...dados, ate: agora + VALIDADE_MS };
}

function valido(agora: number) {
  if (pendente && pendente.ate <= agora) pendente = null;
  return pendente;
}

/** Só lê: o formulário de cadastro preenche o nome sem consumir. */
export function verParaOCadastro(agora = Date.now()): DadosDaLeitura | null {
  const dados = valido(agora);
  return dados
    ? { nome: dados.nome, dataDeNascimento: dados.dataDeNascimento }
    : null;
}

/** Lê e apaga: o onboarding usa a data uma única vez. */
export function retirarParaOCadastro(
  agora = Date.now()
): DadosDaLeitura | null {
  const dados = verParaOCadastro(agora);
  pendente = null;
  return dados;
}

export function esquecerLeituraPendente() {
  pendente = null;
}

/** "Ana Maria Souza" → nome "Ana", sobrenome "Maria Souza". */
export function separarNome(nome: string) {
  const partes = nome.trim().split(/\s+/);
  return { primeiro: partes[0] ?? '', sobrenome: partes.slice(1).join(' ') };
}
