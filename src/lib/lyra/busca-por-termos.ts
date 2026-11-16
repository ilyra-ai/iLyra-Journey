import type { Verbete } from './conhecimento/tipos';
import { normalizar } from './texto';

/**
 * Busca de verbetes por termos, sem modelo de IA: a pergunta e os verbetes
 * viram radicais de palavras, e cada verbete recebe uma nota BM25 em que
 * termos raros na base pesam mais e os campos mais específicos (palavras-chave
 * e título) pesam mais que o corpo. Abaixo da nota mínima a busca recusa, em
 * vez de devolver o verbete "menos distante".
 *
 * É determinística: a mesma pergunta dá sempre o mesmo resultado. Os
 * parâmetros foram medidos no conjunto de avaliação
 * (`avaliacao/perguntas.json`).
 */

/** Palavras sem assunto próprio, ignoradas na pergunta e nos verbetes. */
const PALAVRAS_VAZIAS = new Set(
  (
    'a o as os um uma uns umas de do da dos das em no na nos nas por para pra ' +
    'com sem e ou que se como qual quais quem quando onde porque eu me meu ' +
    'quanto quantos quanta quantas ' +
    'minha meus minhas voce seu sua seus suas ele ela isso esse essa este esta ' +
    'aquilo ser sou era foi sao estar estou tem ter tenho ha existe existem ' +
    'fazer faz faco devo deve posso pode quero saber sobre mais menos muito ja ' +
    'nao sim ao aos pelo pela entre ate tambem so cada todo toda tudo algo ' +
    'alguma algum alguns nunca sempre hoje ontem amanha ajuda ajudar explica ' +
    'conta diz dizem melhor coisa'
  ).split(' ')
);

/** Tamanho do radical: "alimentação" e "alimentar" viram "alime". */
const TAMANHO_DO_RADICAL = 5;
/** Peso de cada campo do verbete na nota. */
const PESO = { palavrasChave: 3, titulo: 3, resumo: 2, corpo: 1 } as const;
/** Parâmetros usuais do BM25, com normalização de tamanho moderada. */
const K1 = 1.2;
const B = 0.5;
/** Nota mínima para aceitar um verbete; abaixo dela a busca recusa. */
export const NOTA_MINIMA = 4.5;

function radical(palavra: string) {
  const singular =
    palavra.length > 4 && palavra.endsWith('s')
      ? palavra.slice(0, -1)
      : palavra;
  return singular.slice(0, TAMANHO_DO_RADICAL);
}

/** Radicais com assunto de um texto, na ordem em que aparecem. */
export function radicaisDoTexto(texto: string): string[] {
  return normalizar(texto)
    .split(' ')
    .filter((palavra) => palavra.length > 2 && !PALAVRAS_VAZIAS.has(palavra))
    .map(radical);
}

interface Documento {
  verbete: Verbete;
  frequencia: Map<string, number>;
  tamanho: number;
}

export interface ResultadoDaBusca {
  verbete: Verbete;
  nota: number;
  /** Radicais da pergunta encontrados no verbete. */
  termos: string[];
}

export interface BuscaPorTermos {
  /** Verbete de maior nota, ou `null` abaixo da nota mínima. */
  buscar(pergunta: string): ResultadoDaBusca | null;
  /** Verbete de maior nota, mesmo abaixo da mínima (para medição). */
  melhor(pergunta: string): ResultadoDaBusca | null;
}

export function criarBuscaPorTermos(
  verbetes: readonly Verbete[]
): BuscaPorTermos {
  const documentos: Documento[] = verbetes.map((verbete) => {
    const frequencia = new Map<string, number>();
    const somar = (texto: string, peso: number) => {
      for (const termo of radicaisDoTexto(texto)) {
        frequencia.set(termo, (frequencia.get(termo) ?? 0) + peso);
      }
    };
    somar(verbete.palavrasChave.join(' '), PESO.palavrasChave);
    somar(verbete.titulo, PESO.titulo);
    somar(verbete.resumo, PESO.resumo);
    somar(`${verbete.pontos.join(' ')} ${verbete.pratica}`, PESO.corpo);
    let tamanho = 0;
    for (const valor of frequencia.values()) tamanho += valor;
    return { verbete, frequencia, tamanho };
  });
  const total = documentos.length;
  const tamanhoMedio =
    total === 0
      ? 0
      : documentos.reduce((soma, doc) => soma + doc.tamanho, 0) / total;
  const presenca = new Map<string, number>();
  for (const documento of documentos) {
    for (const termo of documento.frequencia.keys()) {
      presenca.set(termo, (presenca.get(termo) ?? 0) + 1);
    }
  }
  const raridade = (termo: string) => {
    const em = presenca.get(termo) ?? 0;
    return Math.log(1 + (total - em + 0.5) / (em + 0.5));
  };

  function melhor(pergunta: string): ResultadoDaBusca | null {
    const termosDaPergunta = [...new Set(radicaisDoTexto(pergunta))];
    if (termosDaPergunta.length === 0) return null;
    let vencedor: ResultadoDaBusca | null = null;
    for (const documento of documentos) {
      let nota = 0;
      const termos: string[] = [];
      for (const termo of termosDaPergunta) {
        const frequencia = documento.frequencia.get(termo);
        if (!frequencia) continue;
        termos.push(termo);
        nota +=
          (raridade(termo) * frequencia * (K1 + 1)) /
          (frequencia + K1 * (1 - B + (B * documento.tamanho) / tamanhoMedio));
      }
      // Empate fica com o primeiro da base: resultado estável.
      if (termos.length > 0 && (!vencedor || nota > vencedor.nota)) {
        vencedor = { verbete: documento.verbete, nota, termos };
      }
    }
    return vencedor;
  }

  return {
    melhor,
    buscar(pergunta) {
      const resultado = melhor(pergunta);
      return resultado && resultado.nota >= NOTA_MINIMA ? resultado : null;
    },
  };
}
