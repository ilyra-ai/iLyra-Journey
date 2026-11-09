import { requireFeatureEnabled } from '@/lib/plans/service';
import { NextResponse } from 'next/server';

import { carregarNatalDoTitular } from '@/lib/astrology/persistencia-natal';
import { mapaParaJson } from '@/lib/astrology/serializacao';
import { respostaDeErro } from '@/lib/http/api';
import { lerMapaComoLyra } from '@/lib/lyra/leitura-do-mapa';
import { requireServerSession } from '@/lib/mysql/server-auth';

export const runtime = 'nodejs';

/**
 * Mapa natal védico do próprio titular (Lagna, grahas, nakshatra natal e
 * Vimshottari vigente). Sem data ou cidade de nascimento, `mapa` é null e
 * `faltando` diz o que completar no perfil.
 */
export async function GET() {
  try {
    const session = await requireServerSession();
    await requireFeatureEnabled(session, 'vedic_insights');

    const { perfil, mapa } = await carregarNatalDoTitular(session.user.id);
    return NextResponse.json(
      {
        mapa: mapa ? mapaParaJson(mapa) : null,
        // Leitura do motor da Lyra (tarefa 55), separada por tipo de mapa.
        leitura: mapa ? lerMapaComoLyra(mapa) : null,
        faltando: perfil.faltando,
        localDeNascimento: perfil.nascimento.local?.rotulo ?? null,
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    return respostaDeErro(error, 'Falha ao calcular o mapa natal.');
  }
}
