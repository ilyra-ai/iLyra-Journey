import { z } from 'zod';
import { apelidoSchema } from './apelido';

export function idadeDoNascimento(data: string, hoje = new Date()) {
  const [ano, mes, dia] = data.split('-').map(Number);
  return (
    hoje.getUTCFullYear() -
    ano -
    Number(
      hoje.getUTCMonth() + 1 < mes ||
        (hoje.getUTCMonth() + 1 === mes && hoje.getUTCDate() < dia)
    )
  );
}
export const conclusaoOnboardingSchema = z
  .object({
    first_name: z.string().trim().min(2).max(120),
    last_name: z.string().trim().min(2).max(120),
    nickname: apelidoSchema.nullable().optional(),
    birth_date: z.iso.date().refine((v) => {
      const age = idadeDoNascimento(v);
      return age >= 13 && age <= 120;
    }, 'Informe uma data de nascimento correspondente a uma idade entre 13 e 120 anos.'),
    birth_time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .nullable()
      .optional(),
    birth_city_id: z.number().int().positive(),
    residence_city_id: z.number().int().positive().nullable().optional(),
    gender: z.enum(['male', 'female', 'other', 'prefer_not-to-say']).optional(),
    activity_level: z.number().int().min(1).max(5).optional(),
    consent: z.literal(true, {
      error: 'Confirme o consentimento para concluir.',
    }),
  })
  .strict();
