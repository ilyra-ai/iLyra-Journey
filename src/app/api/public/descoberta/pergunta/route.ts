import { NextResponse } from 'next/server';

import {
  esquemaDaPergunta,
  responderAoVisitante,
} from '@/lib/descoberta/microconversa';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { HttpError } from '@/lib/http-error';
import {
  exigirDentroDoLimite,
  ipDoCliente,
  type RegraDeLimite,
} from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

/** Limite próprio da microconversa, separado do cálculo do mapa. */
export const LIMITE_PERGUNTA_POR_IP: RegraDeLimite = {
  escopo: 'descoberta-pergunta-ip',
  limite: 20,
  janelaSegundos: 60 * 60,
};

const TAMANHO_MAXIMO = 2_048;
const SEM_CACHE = { 'Cache-Control': 'no-store, private' } as const;

/**
 * Microconversa do Experimente Grátis (tarefa 158): sem conta, sem modelo
 * de IA e sem gravação da pergunta (nem em log). Mesma origem exigida pelo
 * `proxy.ts`.
 */
export async function POST(request: Request) {
  try {
    const tamanho = Number(request.headers.get('content-length') ?? '0');
    if (!Number.isFinite(tamanho) || tamanho > TAMANHO_MAXIMO)
      throw new HttpError('Pedido grande demais.', 413);
    await exigirDentroDoLimite(LIMITE_PERGUNTA_POR_IP, ipDoCliente(request));
    const { pergunta } = await lerJson(request, esquemaDaPergunta);
    return NextResponse.json(responderAoVisitante(pergunta), {
      headers: SEM_CACHE,
    });
  } catch (error) {
    const resposta = respostaDeErro(error, 'Não foi possível responder agora.');
    for (const [chave, valor] of Object.entries(SEM_CACHE))
      resposta.headers.set(chave, valor);
    return resposta;
  }
}
