import { z } from 'zod';

/**
 * Diário pessoal por voz (tarefa 135): o relato do titular, o texto
 * organizado por um modelo autorizado (só ortografia e pontuação) e a
 * análise interpretativa do dia, relacionada ao céu do dia e ao mapa da
 * própria pessoa. Interpretação de autoconhecimento: nunca diagnóstico.
 */
export const LIMITE_POR_DIA = 10;
export const TAMANHO_MAXIMO = 6000;

const texto = z
  .string({ error: 'Conte como foi o seu dia.' })
  .trim()
  .min(1, 'Conte como foi o seu dia.')
  .max(TAMANHO_MAXIMO, `Use até ${TAMANHO_MAXIMO} caracteres no relato.`);

export const novoRelatoSchema = z
  .object({
    id: z.uuid({ error: 'Identificador inválido.' }),
    data: z.iso.date({ error: 'Informe a data.' }),
    texto,
    modo: z.enum(['voz', 'texto'], { error: 'Modo de registro inválido.' }),
    motor: z
      .enum(['aparelho', 'navegador'], { error: 'Origem da voz inválida.' })
      .nullable(),
  })
  .strict()
  .refine((p) => (p.modo === 'voz') === (p.motor !== null), {
    message: 'Informe a origem da voz somente para relatos falados.',
    path: ['motor'],
  });
export type NovoRelato = z.infer<typeof novoRelatoSchema>;

export const edicaoSchema = z
  .object({ versao: z.number().int().positive('Versão inválida.'), texto })
  .strict();
export const versaoSchema = z
  .object({ versao: z.number().int().positive('Versão inválida.') })
  .strict();
export const mesSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Informe o mês no formato AAAA-MM.');

const frase = (minimo: number, maximo: number) =>
  z.string().trim().min(minimo).max(maximo);

/** Resposta do modelo, validada antes de qualquer gravação. */
export const analiseDoModeloSchema = z
  .object({
    textoOrganizado: frase(1, TAMANHO_MAXIMO + 600),
    acontecimentos: z.array(frase(4, 280)).min(1).max(6),
    percepcoes: z.array(frase(4, 280)).max(5),
    caracteristicasDoDia: frase(20, 700),
    relacaoComOMapa: frase(20, 900).nullable(),
    padroes: z.array(frase(8, 320)).max(4),
  })
  .strict();
export type AnaliseDoModelo = z.infer<typeof analiseDoModeloSchema>;

export function esquemaJsonDaAnalise(comMapa: boolean) {
  const lista = (min: number, max: number) => ({
    type: 'array',
    items: { type: 'string', minLength: 4 },
    minItems: min,
    maxItems: max,
  });
  return {
    type: 'object',
    properties: {
      textoOrganizado: { type: 'string', minLength: 1 },
      acontecimentos: lista(1, 6),
      percepcoes: lista(0, 5),
      caracteristicasDoDia: { type: 'string', minLength: 20 },
      relacaoComOMapa: comMapa
        ? { type: 'string', minLength: 20 }
        : { type: 'null' },
      padroes: lista(0, 4),
    },
    required: [
      'textoOrganizado',
      'acontecimentos',
      'percepcoes',
      'caracteristicasDoDia',
      'relacaoComOMapa',
      'padroes',
    ],
    additionalProperties: false,
  };
}

/** Minúsculas, sem acentos e sem pontuação: só as palavras. */
export function palavras(valor: string) {
  return valor
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/** Distância de edição entre duas palavras (Levenshtein). */
function distancia(a: string, b: string) {
  let anterior = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const atual = [i];
    for (let j = 1; j <= b.length; j++)
      atual[j] = Math.min(
        anterior[j] + 1,
        atual[j - 1] + 1,
        anterior[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    anterior = atual;
  }
  return anterior[b.length];
}

function sobras(de: string[], menos: string[]) {
  const resto = new Map<string, number>();
  for (const p of menos) resto.set(p, (resto.get(p) ?? 0) + 1);
  const sobra: string[] = [];
  for (const p of de) {
    const n = resto.get(p) ?? 0;
    if (n > 0) resto.set(p, n - 1);
    else sobra.push(p);
  }
  return sobra;
}

/**
 * Confere se o texto organizado preserva o relato: só ortografia,
 * acentuação, pontuação e maiúsculas podem mudar. Cada palavra nova precisa
 * ser a correção de grafia de uma palavra que saiu (distância de edição
 * pequena); trocas de sentido ("feliz" por "triste"), fatos acrescentados e
 * cortes são recusados. Tolera uma junção ou separação ("agente" e "a
 * gente") a cada 40 palavras. Devolve o motivo da recusa ou `null`.
 */
export function conferirFidelidade(
  original: string,
  organizado: string
): string | null {
  const a = palavras(original),
    b = palavras(organizado);
  if (!b.length) return 'texto organizado vazio';
  if (b.length < a.length * 0.9 - 1 || b.length > a.length * 1.1 + 1)
    return 'o texto organizado mudou o tamanho do relato';
  const saiu = sobras(a, b),
    entrou = sobras(b, a);
  const semPar: string[] = [];
  for (const nova of entrou) {
    const limite = Math.max(1, Math.floor(nova.length / 4));
    const i = saiu.findIndex(
      (velha) =>
        velha.length >= 2 &&
        nova.length >= 2 &&
        distancia(velha, nova) <= limite
    );
    if (i >= 0) saiu.splice(i, 1);
    else semPar.push(nova);
  }
  const folga = Math.floor(a.length / 40) + 1;
  if (semPar.length > folga)
    return 'o texto organizado acrescentou ou trocou palavras do relato';
  if (saiu.length > folga)
    return 'o texto organizado retirou palavras do relato';
  return null;
}

// Vocabulário clínico: a análise é interpretação de autoconhecimento.
const CLINICO =
  /\b(diagnostic\w*|transtorno\w*|sindrome\w*|patologi\w*|prescrev\w*|medicament\w*|depressao clinica|ansiedade generalizada|tdah|bipolar\w*)\b/;

// Palavras que não ancoram um texto ao relato.
const VAZIAS = new Set(
  'porque quando depois antes muito muita muitos muitas mesmo mesma ainda sobre entre tambem estava estavam tinha tenho fazer feito foram seria sendo outra outro todos todas nosso nossa minha meu seus suas voce isso aquilo aquela aquele hoje'.split(
    ' '
  )
);
/** Radicais (5 letras) das palavras de conteúdo de um texto. */
function radicais(valor: string) {
  return new Set(
    palavras(valor)
      .filter((p) => p.length >= 5 && !VAZIAS.has(p))
      .map((p) => p.slice(0, 5))
  );
}
const ancorado = (texto: string, base: Set<string>) =>
  [...radicais(texto)].some((r) => base.has(r));

/**
 * Recusa análises fora do contrato: texto infiel, linguagem clínica,
 * acontecimentos ou leitura do dia sem base no relato (cada um precisa citar
 * algo que a pessoa contou), padrões sem histórico e relação com um mapa que
 * não foi enviado.
 */
export function conferirAnalise(
  analise: AnaliseDoModelo,
  original: string,
  comMapa: boolean,
  temHistorico: boolean
): string | null {
  const fidelidade = conferirFidelidade(original, analise.textoOrganizado);
  if (fidelidade) return fidelidade;
  if (comMapa !== (analise.relacaoComOMapa !== null))
    return comMapa
      ? 'a análise não relacionou o dia ao mapa'
      : 'a análise citou um mapa que não foi enviado';
  if (!temHistorico && analise.padroes.length)
    return 'a análise apontou padrões sem relatos anteriores';
  const base = radicais(original);
  if (analise.acontecimentos.some((a) => !ancorado(a, base)))
    return 'a análise listou acontecimentos que não estão no relato';
  if (!ancorado(analise.caracteristicasDoDia, base))
    return 'a leitura do dia não fala do que a pessoa contou';
  const interpretacao = [
    ...analise.acontecimentos,
    ...analise.percepcoes,
    analise.caracteristicasDoDia,
    analise.relacaoComOMapa ?? '',
    ...analise.padroes,
  ].join(' ');
  if (CLINICO.test(palavras(interpretacao).join(' ')))
    return 'a análise usou linguagem clínica';
  return null;
}

export type EstadoDaAnalise =
  'pendente' | 'gerando' | 'pronta' | 'indisponivel' | 'falhou';
export type EstadoDaMemoria =
  'nao_enviado' | 'na_fila' | 'desativada' | 'sem_plano';

export interface CeuDoRelato {
  data: string;
  tom: string;
  manchete: string;
  signoDaLua: string;
  itens: Array<{ termo: string; valor: string; detalhe?: string }>;
  estrelaPessoal: { nome: string; sentido: string } | null;
  periodoDeVida: string | null;
}

export interface Relato {
  id: string;
  data: string;
  modo: 'voz' | 'texto';
  motor: 'aparelho' | 'navegador' | null;
  textoOriginal: string;
  textoOrganizado: string | null;
  analise: Omit<AnaliseDoModelo, 'textoOrganizado'> | null;
  ceu: CeuDoRelato | null;
  estadoDaAnalise: EstadoDaAnalise;
  motivo: string | null;
  autor: { provedor: string; modelo: string; local: boolean } | null;
  analisadoEm: string | null;
  memoria: EstadoDaMemoria;
  versao: number;
  criadoEm: string;
}

export interface MesDoDiario {
  mes: string;
  hoje: string;
  corte: string | null;
  dias: Array<{ data: string; total: number }>;
}
