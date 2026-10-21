import { z } from 'zod';

/** Mesma validação no cadastro, edição do perfil e API de dados. */
export const apelidoSchema = z
  .string()
  .trim()
  .max(80, 'O apelido pode ter no máximo 80 caracteres.')
  .refine(
    (valor) => !/[\p{Cc}\p{Cf}<>]/u.test(valor),
    'Use um apelido sem marcação ou caracteres de controle.'
  );
