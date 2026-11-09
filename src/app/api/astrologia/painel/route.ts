import { NextResponse } from 'next/server';
import { montarPainelCelestial } from '@/lib/astrology/painel-celestial';
import { carregarNatalDoTitular } from '@/lib/astrology/persistencia-natal';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { requireFeatureEnabled } from '@/lib/plans/service';
import { respostaDeErro } from '@/lib/http/api';

export const runtime = 'nodejs';

/** Adaptador privado dos cálculos existentes para os sete dias do painel. */
export async function GET() {
  try {
    const session = await requireServerSession();
    await requireFeatureEnabled(session, 'vedic_insights');
    const agora = new Date();
    const { perfil, mapa } = await carregarNatalDoTitular(
      session.user.id,
      agora
    );
    return NextResponse.json(montarPainelCelestial(perfil, agora, mapa), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (erro) {
    return respostaDeErro(erro, 'Não foi possível carregar suas leituras.');
  }
}
