import { createHash } from 'node:crypto';

import { z } from 'zod';

import { normalizar } from '@/lib/lyra/texto';

import {
  CONDICOES,
  PUBLICOS,
  type Recomendacao,
  TIPOS_DE_RECOMENDACAO,
} from './plano';

export { PUBLICOS, TIPOS_DE_RECOMENDACAO };

/**
 * Atualização dos exames médicos pelo modelo de IA (tarefa 211), parte pura:
 * a instrução detalhada que o modelo lê, o formato do resultado e a
 * conferência das propostas antes de chegarem ao administrador.
 *
 * O modelo não altera nem exclui o catálogo do motor da Lyra: ele só propõe
 * atualizar, acrescentar ou retirar, e cada proposta precisa citar uma página
 * oficial que ele realmente leu. Proposta já decidida pelo administrador não
 * volta.
 */

export const TIPOS_DE_PROPOSTA = ['atualizar', 'novo', 'retirar'] as const;
export type TipoDeProposta = (typeof TIPOS_DE_PROPOSTA)[number];

const enderecoHttps = z
  .string()
  .trim()
  .max(400)
  .refine((valor) => {
    try {
      return new URL(valor).protocol === 'https:';
    } catch {
      return false;
    }
  }, 'Use um endereço https.');

const idade = z.number().int().min(0).max(120);

/** Recomendação completa, como fica no catálogo do motor. */
export const recomendacaoSchema = z
  .object({
    nome: z.string().trim().min(3).max(120),
    procura: z.string().trim().min(10).max(300),
    publico: z.enum(PUBLICOS),
    idadeMinima: idade,
    idadeMaxima: idade.nullable(),
    intervaloMeses: z.number().int().min(1).max(240).nullable(),
    tipo: z.enum(TIPOS_DE_RECOMENDACAO),
    orientacao: z.string().trim().min(20).max(600),
    historicoRelevante: z.array(z.enum(CONDICOES)).max(CONDICOES.length),
    fonteNome: z.string().trim().min(5).max(200),
    fonteUrl: enderecoHttps,
  })
  .refine((r) => r.idadeMaxima === null || r.idadeMaxima >= r.idadeMinima, {
    error: 'A idade máxima deve ser maior ou igual à mínima.',
  });
export type DadosDaRecomendacao = z.infer<typeof recomendacaoSchema>;

const motivo = z.string().trim().min(10).max(1000);
const idDoExame = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(40);

/** Resultado que o modelo entrega ao concluir a pesquisa. */
export const resultadoDaAtualizacaoSchema = z.object({
  propostas: z
    .array(
      z.discriminatedUnion('tipo', [
        z.object({
          tipo: z.literal('atualizar'),
          id: idDoExame,
          motivo,
          dados: recomendacaoSchema,
        }),
        z.object({
          tipo: z.literal('novo'),
          id: idDoExame.optional(),
          motivo,
          dados: recomendacaoSchema,
        }),
        z.object({
          tipo: z.literal('retirar'),
          id: idDoExame,
          motivo,
          fonteNome: z.string().trim().min(5).max(200),
          fonteUrl: enderecoHttps,
        }),
      ])
    )
    .max(30),
  resumo: z.string().trim().max(600).optional(),
});
export type ResultadoDaAtualizacao = z.infer<
  typeof resultadoDaAtualizacaoSchema
>;

/** Proposta conferida, pronta para ir à tabela do administrador. */
export interface PropostaConferida {
  tipo: TipoDeProposta;
  recomendacaoId: string;
  dados: DadosDaRecomendacao | null;
  motivo: string;
  fonteNome: string;
  fonteUrl: string;
  assinatura: string;
}

/** Decisões anteriores do administrador, que o modelo não pode reapresentar. */
export interface Decisao {
  tipo: TipoDeProposta;
  recomendacaoId: string;
  nome: string;
  situacao: 'aprovada' | 'reprovada';
  assinatura: string;
}

/**
 * Instrução detalhada lida pelo modelo antes de investigar. O protocolo de
 * internet (buscar, ler, concluir) é acrescentado pela pesquisa.
 */
export const INSTRUCOES_DA_ATUALIZACAO = [
  'Você é o pesquisador de saúde preventiva da iLyra e revisa o catálogo de exames recomendados do motor da Lyra, usado para lembrar pessoas adultas no Brasil dos exames de rastreamento e acompanhamento indicados para a idade e o corpo delas.',
  '',
  'Etapa 1 — leia o catálogo atual, que vem na tarefa. Cada exame tem: id, nome, o que procura, público (mamas, colo-do-utero, prostata ou todos), idade mínima e máxima, intervalo em meses, tipo (rotina = recomendado a todos na faixa; conversa = decisão compartilhada com o médico, sem recomendação de rotina), orientação em linguagem simples, condições da família que pedem conversa com o médico sobre começar antes, e a fonte oficial.',
  '',
  'Etapa 2 — investigue a fundo nas fontes oficiais, nesta ordem de preferência: Ministério da Saúde e INCA (gov.br), protocolos e diretrizes do SUS e da Conitec, sociedades médicas brasileiras (SBD, SBC, Febrasgo, SBM, SBU, SBP, SBEM, SBCP) e, de forma complementar, OMS e OPAS. Para cada exame do catálogo, abra a página oficial correspondente, confira faixa etária, intervalo, público, tipo e orientação, e procure publicações mais recentes que a fonte citada. Depois procure exames de rastreamento ou acompanhamento para adultos recomendados oficialmente no Brasil que ainda não estão no catálogo.',
  '',
  'Etapa 3 — proponha somente o que a página lida comprova:',
  '- "atualizar": o exame existe no catálogo e alguma informação mudou ou está incompleta. Envie o id do catálogo e a recomendação completa já corrigida em "dados".',
  '- "novo": exame recomendado oficialmente que falta no catálogo. Envie a recomendação completa em "dados" e, se quiser, um id curto em minúsculas com hífens.',
  '- "retirar": a fonte oficial deixou de recomendar o exame ou passou a desaconselhá-lo. Envie o id, o motivo e a página que comprova. Você não exclui exames: a retirada só acontece se o administrador aprovar.',
  '',
  'Regras obrigatórias:',
  '- Cada proposta cita em fonteUrl uma página que você leu nesta pesquisa (o endereço exato, como apareceu na leitura). Proposta com página não lida é descartada.',
  '- Não invente números, idades nem intervalos. Se a fonte não disser, mantenha o valor do catálogo ou use null quando o campo aceitar.',
  '- Escreva "procura" e "orientacao" em português do Brasil, em linguagem simples para leigos, sem jargão, sem prometer cura nem diagnóstico, e incluindo os sinais que pedem procurar o médico logo quando a fonte os citar.',
  '- "fonteNome" diz o órgão, o documento e, quando houver, a data de atualização da página.',
  '- Não proponha nada que já foi decidido pelo administrador (a lista vem na tarefa) nem proposta sem mudança real.',
  '- Não use dados de nenhuma pessoa: a pesquisa é só sobre recomendações públicas.',
  '- Se nada mudou, conclua com "propostas": [] e explique em "resumo".',
  '',
  'Formato do resultado ao concluir: {"propostas": [...], "resumo": "o que você conferiu e o que encontrou"}, onde "dados" segue os campos nome, procura, publico, idadeMinima, idadeMaxima, intervaloMeses, tipo, orientacao, historicoRelevante, fonteNome e fonteUrl. Os valores aceitos em historicoRelevante são: ' +
    CONDICOES.join(', ') +
    '.',
].join('\n');

function dadosDoCatalogo(r: Recomendacao): DadosDaRecomendacao {
  return {
    nome: r.nome,
    procura: r.procura,
    publico: r.publico,
    idadeMinima: r.idadeMinima,
    idadeMaxima: r.idadeMaxima,
    intervaloMeses: r.intervaloMeses,
    tipo: r.tipo,
    orientacao: r.orientacao,
    historicoRelevante: [...r.historicoRelevante],
    fonteNome: r.fonteNome,
    fonteUrl: r.fonteUrl,
  };
}

/** Texto da tarefa: o catálogo atual do motor e as decisões já tomadas. */
export function tarefaDaAtualizacao(
  catalogo: Array<Recomendacao & { ativo: boolean }>,
  decisoes: Decisao[]
) {
  const atual = catalogo.map((r) => ({
    id: r.id,
    ativo: r.ativo,
    ...dadosDoCatalogo(r),
  }));
  const decididas = decisoes.map(
    (d) =>
      `- ${d.tipo} "${d.nome}" (${d.recomendacaoId}): ${d.situacao} pelo administrador`
  );
  return [
    'Revise o catálogo de exames do motor da Lyra pelas fontes oficiais.',
    `Catálogo atual (${atual.length} exames):\n${JSON.stringify(atual, null, 1)}`,
    decididas.length
      ? `Já decidido pelo administrador; não traga de novo:\n${decididas.join('\n')}`
      : 'Ainda não há decisões anteriores do administrador.',
  ].join('\n\n');
}

/** "Teste de DNA-HPV (Papanicolau)" → "teste-de-dna-hpv-papanicolau". */
export function idDoNome(nome: string) {
  return normalizar(nome)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '');
}

function enderecoComparavel(url: string) {
  try {
    const u = new URL(url.trim());
    u.hash = '';
    return `${u.host.toLowerCase().replace(/^www\./, '')}${u.pathname.replace(/\/+$/, '')}${u.search}`;
  } catch {
    return url.trim();
  }
}

function canonico(dados: DadosDaRecomendacao | null) {
  if (!dados) return '';
  return JSON.stringify({
    ...dados,
    historicoRelevante: [...dados.historicoRelevante].sort(),
  });
}

export function assinaturaDaProposta(
  tipo: TipoDeProposta,
  recomendacaoId: string,
  dados: DadosDaRecomendacao | null
) {
  return createHash('sha256')
    .update(`${tipo}|${recomendacaoId}|${canonico(dados)}`)
    .digest('hex');
}

/**
 * Confere o resultado do modelo contra o catálogo, as páginas lidas e as
 * propostas existentes. Devolve as aceitas e o motivo de cada descarte.
 */
export function conferirPropostas(
  resultado: ResultadoDaAtualizacao,
  contexto: {
    catalogo: Array<Recomendacao & { ativo: boolean }>;
    fontesLidas: Array<{ url: string }>;
    /** Assinaturas de todas as propostas já registradas (qualquer situação). */
    assinaturasExistentes: Set<string>;
    decisoes: Decisao[];
  }
) {
  const lidas = new Set(
    contexto.fontesLidas.map((f) => enderecoComparavel(f.url))
  );
  const porId = new Map(contexto.catalogo.map((r) => [r.id, r]));
  const nomes = new Set(contexto.catalogo.map((r) => normalizar(r.nome)));
  // Novo exame ou retirada já decididos não voltam, mesmo com outro texto.
  const decididos = new Set(
    contexto.decisoes
      .filter((d) => d.tipo !== 'atualizar')
      .flatMap((d) => [
        `${d.tipo}:${d.recomendacaoId}`,
        `${d.tipo}:nome:${normalizar(d.nome)}`,
      ])
  );
  const vistas = new Set(contexto.assinaturasExistentes);
  const aceitas: PropostaConferida[] = [];
  const descartadas: Array<{ proposta: string; motivo: string }> = [];

  for (const proposta of resultado.propostas) {
    const dados = proposta.tipo === 'retirar' ? null : proposta.dados;
    const fonteUrl = dados
      ? dados.fonteUrl
      : (proposta as { fonteUrl: string }).fonteUrl;
    const fonteNome = dados
      ? dados.fonteNome
      : (proposta as { fonteNome: string }).fonteNome;
    const rotulo =
      `${proposta.tipo} ${proposta.id ?? dados?.nome ?? ''}`.trim();
    const descartar = (motivoDoDescarte: string) =>
      descartadas.push({ proposta: rotulo, motivo: motivoDoDescarte });

    if (!lidas.has(enderecoComparavel(fonteUrl))) {
      descartar('cita uma página que não foi lida na pesquisa');
      continue;
    }

    let recomendacaoId: string;
    let nome: string;
    if (proposta.tipo === 'novo') {
      recomendacaoId =
        proposta.id && !porId.has(proposta.id)
          ? proposta.id
          : idDoNome(proposta.dados.nome);
      nome = proposta.dados.nome;
      if (
        !recomendacaoId ||
        porId.has(recomendacaoId) ||
        nomes.has(normalizar(nome))
      ) {
        descartar('o exame já está no catálogo');
        continue;
      }
    } else {
      const atual = porId.get(proposta.id);
      if (!atual) {
        descartar('o exame não existe no catálogo');
        continue;
      }
      recomendacaoId = atual.id;
      nome = atual.nome;
      if (proposta.tipo === 'retirar' && !atual.ativo) {
        descartar('o exame já está retirado');
        continue;
      }
      if (
        proposta.tipo === 'atualizar' &&
        canonico(dadosDoCatalogo(atual)) === canonico(proposta.dados)
      ) {
        descartar('não muda nada no exame');
        continue;
      }
    }

    if (
      decididos.has(`${proposta.tipo}:${recomendacaoId}`) ||
      decididos.has(`${proposta.tipo}:nome:${normalizar(nome)}`)
    ) {
      descartar('já foi decidido pelo administrador');
      continue;
    }
    const assinatura = assinaturaDaProposta(
      proposta.tipo,
      recomendacaoId,
      dados
    );
    if (vistas.has(assinatura)) {
      descartar('já foi apresentada ao administrador');
      continue;
    }
    vistas.add(assinatura);
    aceitas.push({
      tipo: proposta.tipo,
      recomendacaoId,
      dados,
      motivo: proposta.motivo,
      fonteNome,
      fonteUrl,
      assinatura,
    });
  }
  return { aceitas, descartadas };
}

/** Campos que mudam numa proposta de atualização, para a tabela do admin. */
export function camposAlterados(
  atual: Recomendacao,
  proposto: DadosDaRecomendacao
): Array<keyof DadosDaRecomendacao> {
  const antes = dadosDoCatalogo(atual);
  return (Object.keys(proposto) as Array<keyof DadosDaRecomendacao>).filter(
    (campo) =>
      JSON.stringify(
        campo === 'historicoRelevante'
          ? [...antes.historicoRelevante].sort()
          : antes[campo]
      ) !==
      JSON.stringify(
        campo === 'historicoRelevante'
          ? [...proposto.historicoRelevante].sort()
          : proposto[campo]
      )
  );
}
