import { z } from 'zod';

import { HttpError } from '@/lib/http-error';

export { fatoSchema, type FatoDaMemoria } from './tipos';

export async function chamarMemoria<T>(
  usuario: string,
  caminho: string,
  esquema: z.ZodType<T>,
  opcoes: { metodo?: string; corpo?: unknown; tempo?: number } = {}
): Promise<T> {
  z.uuid().parse(usuario);
  const segredo = process.env.LYRA_MEMORIA_SEGREDO;
  const endereco = process.env.LYRA_MEMORIA_URL;
  if (!segredo || segredo.length < 32 || !endereco) {
    throw new HttpError(
      'O serviço de memória ainda não está configurado.',
      503
    );
  }
  let resposta: Response;
  try {
    resposta = await fetch(
      `${endereco.replace(/\/+$/, '')}/usuarios/${usuario}${caminho}`,
      {
        method: opcoes.metodo ?? 'GET',
        headers: {
          Authorization: `Bearer ${segredo}`,
          'Content-Type': 'application/json',
        },
        body:
          opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo),
        cache: 'no-store',
        signal: AbortSignal.timeout(opcoes.tempo ?? 12_000),
      }
    );
  } catch {
    throw new HttpError(
      'A memória está temporariamente indisponível. A conversa continua disponível.',
      503
    );
  }
  if (!resposta.ok) {
    throw new HttpError(
      resposta.status === 409
        ? 'Uma atualização da memória está em andamento. Tente novamente em instantes.'
        : 'Não foi possível concluir a operação de memória.',
      resposta.status === 404 ? 404 : resposta.status === 409 ? 409 : 503
    );
  }
  const resultado = esquema.safeParse(await resposta.json());
  if (!resultado.success)
    throw new HttpError(
      'O serviço de memória respondeu em formato inválido.',
      503
    );
  return resultado.data;
}

export function origemDoAppParaMemoria() {
  const origem = process.env.LYRA_MEMORIA_APP_URL;
  if (!origem)
    throw new HttpError(
      'Configure o endereço interno do aplicativo para a memória.',
      503
    );
  return origem;
}
