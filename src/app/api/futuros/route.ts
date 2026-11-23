import { NextResponse } from 'next/server';

import { carregarNatalDoTitular } from '@/lib/astrology/persistencia-natal';
import {
  esquemaDoTeatro,
  MENSAGEM_DO_TEMA,
  montarTeatro,
  temaSensivel,
} from '@/lib/futuros/teatro';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { HttpError } from '@/lib/http-error';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { requireFeatureEnabled } from '@/lib/plans/service';

export const runtime = 'nodejs';

/** As premissas são da pessoa: nada desta resposta vai para cache. */
const SEM_CACHE = { 'Cache-Control': 'no-store, private' } as const;

/**
 * Teatro dos Futuros Revisáveis (tarefa 189). Sessão efêmera: a dúvida e os
 * caminhos vivem só nesta requisição e na tela; não vão para banco, log nem
 * modelo de IA. O período do mapa vem do cálculo do próprio titular.
 */
export async function POST(request: Request) {
  try {
    const session = await requireServerSession();
    await requireFeatureEnabled(session, 'vedic_insights');
    const premissas = await lerJson(request, esquemaDoTeatro);
    const tema = temaSensivel(premissas);
    if (tema) throw new HttpError(MENSAGEM_DO_TEMA[tema], 422);
    const { mapa } = await carregarNatalDoTitular(session.user.id);
    return NextResponse.json(
      montarTeatro(premissas, { dasha: mapa?.dasha ?? null }),
      { headers: SEM_CACHE }
    );
  } catch (error) {
    const resposta = respostaDeErro(
      error,
      'Não foi possível montar o Teatro agora.'
    );
    for (const [chave, valor] of Object.entries(SEM_CACHE))
      resposta.headers.set(chave, valor);
    return resposta;
  }
}
