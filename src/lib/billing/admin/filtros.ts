import { z } from 'zod';
import { HttpError } from '@/lib/http-error';
export const filtrosFaturamentoSchema = z
  .object({
    inicio: z.iso
      .date()
      .min(10)
      .default(() =>
        new Date(Date.now() - 364 * 86400000).toISOString().slice(0, 10)
      ),
    fim: z.iso.date().default(() => new Date().toISOString().slice(0, 10)),
    ambiente: z.enum(['live', 'test', 'legado', 'todos']).default('live'),
    provedor: z
      .enum(['todos', 'stripe', 'mercado_pago', 'paypal'])
      .default('todos'),
    moeda: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .optional(),
    agrupamento: z.enum(['dia', 'mes', 'ano']).default('mes'),
    estado: z
      .enum([
        'todos',
        'draft',
        'open',
        'paid',
        'void',
        'uncollectible',
        'deleted',
        'desconhecido',
      ])
      .default('todos'),
    pagina: z.coerce.number().int().min(1).max(10000).default(1),
  })
  .strict();
export type FiltrosFaturamento = z.infer<typeof filtrosFaturamentoSchema>;
export function lerFiltrosFaturamento(params: URLSearchParams) {
  const f = filtrosFaturamentoSchema.parse(Object.fromEntries(params));
  const dias = (Date.parse(f.fim) - Date.parse(f.inicio)) / 86400000 + 1;
  if (
    f.inicio < '2000-01-01' ||
    f.fim > new Date().toISOString().slice(0, 10) ||
    dias < 1 ||
    dias > 3660 ||
    (f.agrupamento === 'dia' && dias > 366)
  )
    throw new HttpError(
      'Escolha até 366 dias na visão diária ou até 10 anos nas visões mensal e anual, sem datas futuras.',
      400
    );
  return f;
}
