import { NextResponse } from 'next/server';

import { esquemaDaEtapaDoCliente, pareceRobo } from '@/lib/funil/etapas';
import { contarEtapa } from '@/lib/funil/registro';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { HttpError } from '@/lib/http-error';
import {
  exigirDentroDoLimite,
  ipDoCliente,
  type RegraDeLimite,
} from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

/** Folga para uma sessão longa; acima disso é repetição automática. */
export const LIMITE_FUNIL_POR_IP: RegraDeLimite = {
  escopo: 'funil-ip',
  limite: 200,
  janelaSegundos: 60 * 60,
};

/** O corpo legítimo tem poucas dezenas de bytes. */
const TAMANHO_MAXIMO = 512;

/**
 * Etapas do funil informadas pelo navegador (tarefa 170). Sem cookie, sem
 * sessão e sem identificador: cada pedido soma 1 na contagem do dia. O IP
 * só passa pelo limite de abuso e não é gravado com a etapa. Robôs
 * conhecidos recebem 204 e não são contados.
 */
export async function POST(request: Request) {
  try {
    const tamanho = Number(request.headers.get('content-length') ?? '0');
    if (!Number.isFinite(tamanho) || tamanho > TAMANHO_MAXIMO)
      throw new HttpError('Pedido grande demais.', 413);
    const { etapa, detalhe } = await lerJson(request, esquemaDaEtapaDoCliente);
    if (pareceRobo(request.headers.get('user-agent')))
      return new NextResponse(null, { status: 204 });
    await exigirDentroDoLimite(LIMITE_FUNIL_POR_IP, ipDoCliente(request));
    await contarEtapa(etapa as Parameters<typeof contarEtapa>[0], detalhe);
    return new NextResponse(null, {
      status: 204,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return respostaDeErro(error, 'Não foi possível registrar a etapa.');
  }
}
