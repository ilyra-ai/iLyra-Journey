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
export const partesDoChatSchema = z.array(painelDoChatSchema).max(4);
export type PainelDoChat = z.infer<typeof painelDoChatSchema>;
export type ParteDoChat = PainelDoChat;

/** Null é o histórico antigo. Conteúdo novo precisa obedecer ao contrato. */
export function partesDoBanco(valor: unknown): ParteDoChat[] {
  if (valor === null || valor === undefined) return [];
  const bruto: unknown = typeof valor === 'string' ? JSON.parse(valor) : valor;
  return partesDoChatSchema.parse(bruto);
}
