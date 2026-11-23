import { z } from 'zod';

const numero = z.number().finite().nullable();
export const diaDoPainelSchema = z
  .object({
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    passos: numero,
    sono: numero,
    vfc: numero,
    prontidao: numero,
  })
  .strict();

/** Catálogo fechado: nenhuma parte contém HTML, código ou componentes arbitrários. */
export const painelDoChatSchema = z
  .object({
    tipo: z.literal('painel'),
    versao: z.literal(1),
    titulo: z.string().min(1).max(120),
    geradoEm: z.iso.datetime(),
    indisponivel: z.enum(['plano', 'sem-dados']).nullable(),
    dias: z.array(diaDoPainelSchema).max(31),
  })
  .strict();
/**
 * Ponto do mapa (tarefa 180): o cálculo de um planeta do mapa natal do
 * próprio titular, montado pelo servidor quando a pergunta vem de um ponto
 * do mapa (tarefa 187). O modelo de IA não escreve nada aqui.
 */
export const GRAHAS_DO_CHAT = [
  'sol',
  'lua',
  'marte',
  'mercurio',
  'jupiter',
  'venus',
  'saturno',
  'rahu',
  'ketu',
] as const;

export const pontoDoMapaSchema = z
  .object({
    tipo: z.literal('ponto-do-mapa'),
    versao: z.literal(1),
    graha: z.enum(GRAHAS_DO_CHAT),
    nome: z.string().min(1).max(40),
    signo: z.string().min(1).max(40),
    grau: z.string().max(12),
    nakshatra: z.string().max(40),
    pada: z.number().int().min(1).max(4),
    casa: z.number().int().min(1).max(12).nullable(),
    retrogrado: z.boolean(),
    precisaoDaHora: z.enum(['informada', 'estimada', 'desconhecida']),
    leitura: z.string().max(1200).nullable(),
    geradoEm: z.iso.datetime(),
  })
  .strict();

export const parteDoChatSchema = z.discriminatedUnion('tipo', [
  painelDoChatSchema,
  pontoDoMapaSchema,
]);
export const partesDoChatSchema = z.array(parteDoChatSchema).max(4);
export type PainelDoChat = z.infer<typeof painelDoChatSchema>;
export type PontoDoMapaNoChat = z.infer<typeof pontoDoMapaSchema>;
export type ParteDoChat = z.infer<typeof parteDoChatSchema>;

/** Null é o histórico antigo. Conteúdo novo precisa obedecer ao contrato. */
export function partesDoBanco(valor: unknown): ParteDoChat[] {
  if (valor === null || valor === undefined) return [];
  const bruto: unknown = typeof valor === 'string' ? JSON.parse(valor) : valor;
  return partesDoChatSchema.parse(bruto);
}
