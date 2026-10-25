import { z } from 'zod';
import { HttpError } from '@/lib/http-error';
import { DOMINIOS } from './definicoes';
import { padraoDoPeriodo } from './periodo';
const DIA = 86_400_000;
const data = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return (
      Number.isFinite(d.getTime()) &&
      d.toISOString().slice(0, 10) === v &&
      v >= '2000-01-01' &&
      v <= '9998-12-31'
    );
  }, 'Informe uma data válida a partir de 2000.');
const schema = z
  .object({
    inicio: data,
    fim: data,
    plano: z
      .string()
      .regex(/^[a-z0-9_-]{1,32}$/)
      .default('todos'),
    agrupamento: z.enum(['dia', 'semana', 'mes']).default('dia'),
    detalhe: z
      .enum([
        'cadastros',
        'atividade',
        ...(Object.keys(DOMINIOS) as [
          keyof typeof DOMINIOS,
          ...(keyof typeof DOMINIOS)[],
        ]),
      ])
      .optional(),
    pagina: z.coerce.number().int().min(1).max(10000).default(1),
    paginaEventos: z.coerce.number().int().min(1).max(10000).default(1),
  })
  .strict();
export function lerFiltros(parametros: URLSearchParams, agora = new Date()) {
  const defaults = padraoDoPeriodo(agora);
  const f = schema.parse({ ...defaults, ...Object.fromEntries(parametros) });
  const dias = (Date.parse(f.fim) - Date.parse(f.inicio)) / DIA + 1;
  if (dias < 1 || dias > 366)
    throw new HttpError('Escolha de 1 a 366 dias, em ordem crescente.', 400);
  if (f.fim > defaults.fim)
    throw new HttpError('O fim do período não pode estar no futuro.', 400);
  return f;
}
