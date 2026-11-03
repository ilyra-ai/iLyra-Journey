import { createHash } from 'node:crypto';
import { z } from 'zod';
import { extrairJson } from '@/lib/ai/cliente-de-ia';
import { termoTecnicoEm } from '@/lib/coach/linguagem-simples';
import {
  instrucoesDaLeituraComoLyra,
  conferirVozDaLyra,
} from '@/lib/lyra/modelos-como-lyra';
import { CATALOGO_DAS_EXPLICACOES, type ChaveDaExplicacao } from './catalogo';

export const VERSAO_DAS_DESCRICOES = 1;
const chaves = CATALOGO_DAS_EXPLICACOES.map((m) => m.id) as [
  ChaveDaExplicacao,
  ...ChaveDaExplicacao[],
];
// "Milímetros de mercúrio" é a unidade da pressão arterial, não o planeta:
// a explicação correta da unidade era recusada (conferido com um modelo real
// em 2026-11-02).
const linguagemIndevida =
  /\b(lua|sol|planetas?|signos?|(?<!milímetros de )mercúrio|vênus|marte|júpiter|saturno|ascendente|quântic[oa]|chakras?|nakshatras?|dashas?)\b|\p{N}/iu;
const conclusaoClinica =
  /\b(diagnostica|diagnóstico de|você tem|normal|saudável|ideal|adequad[oa]|hipoglicemia|diabetes|tome|suplement[oa]|aumente|reduza|risco de)\b/iu;
export const descricoesSchema = z
  .object({
    descricoes: z.record(z.enum(chaves), z.string().trim().min(20).max(420)),
  })
  .strict()
  .superRefine((valor, ctx) => {
    if (conferirVozDaLyra(Object.values(valor.descricoes).join(' ')))
      ctx.addIssue({
        code: 'custom',
        message: 'Identidade incompatível com as explicações da Lyra.',
      });
    const vistos = new Set<string>();
    for (const [id, texto] of Object.entries(valor.descricoes)) {
      if (
        linguagemIndevida.test(texto) ||
        conclusaoClinica.test(texto) ||
        termoTecnicoEm(texto)
      )
        ctx.addIssue({
          code: 'custom',
          path: ['descricoes', id],
          message: 'Texto incompatível com a apresentação do painel.',
        });
      const normal = texto.toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ');
      if (vistos.has(normal))
        ctx.addIssue({
          code: 'custom',
          path: ['descricoes', id],
          message: 'Explicação repetida em campos diferentes.',
        });
      vistos.add(normal);
    }
  });
export type DescricoesGeradas = z.infer<typeof descricoesSchema>;

/** Nunca envia o restante da linha nem identificadores da conta ao modelo. */
export function entradasDasDescricoes(linha: Record<string, unknown> | null) {
  return CATALOGO_DAS_EXPLICACOES.map((item) => ({
    id: item.id,
    nome: item.titulo,
    significado: item.descricao,
    valores: Object.fromEntries(
      item.colunas.map((coluna) => {
        const bruto = linha?.[coluna];
        const n =
          bruto === null || bruto === undefined || bruto === ''
            ? null
            : Number(bruto);
        return [coluna, n !== null && Number.isFinite(n) ? n : null];
      })
    ),
  }));
}
export function assinaturaDasDescricoes(entrada: unknown) {
  return createHash('sha256')
    .update(JSON.stringify({ versao: VERSAO_DAS_DESCRICOES, entrada }))
    .digest('hex');
}
export function lerDescricoes(texto: string): DescricoesGeradas {
  return descricoesSchema.parse(extrairJson(texto));
}
export const SISTEMA_DAS_DESCRICOES =
  instrucoesDaLeituraComoLyra(`Escreva explicações dos registros para uma pessoa leiga em português do Brasil, como a Lyra. Não use cumprimentos, nomes ou apelidos nas definições de campos.
Use exclusivamente os fatos, definições e ausências fornecidos. Para os campos de leitura interpretativa, traduza os fundamentos em reflexões práticas sem nomes técnicos e sem prever acontecimentos. Sem mapa pessoal disponível, não apresente uma leitura geral como fato particular da pessoa. Não gere medições nem altere valores.
Explique cada campo em uma ou duas frases curtas, diferentes entre si, sem repetir números, escalas ou horários.
Não cite Lua, Sol, planetas, signos, casas, sânscrito, nomes técnicos do mapa, nem atribua medidas do corpo a interpretações simbólicas.
Não classifique o valor como normal, saudável, ideal ou adequado, não diagnostique, não prescreva e não recomende aumento ou redução de qualquer medida.
Não invente a origem, um sensor, um exame ou uma tendência temporal. Quando faltar informação, explique o que o campo representa, sem inventar preenchimento.
Todas as chaves do catálogo são obrigatórias. Retorne somente um objeto JSON com a propriedade descricoes e um texto para cada chave. Nenhuma chave extra e nenhum número nos textos.`);
export const ESQUEMA_DAS_DESCRICOES: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['descricoes'],
  properties: {
    descricoes: {
      type: 'object',
      additionalProperties: false,
      required: chaves,
      properties: Object.fromEntries(
        chaves.map((c) => [c, { type: 'string' }])
      ),
    },
  },
};
