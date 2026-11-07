import { NextResponse } from 'next/server';
import { montarPainelCelestial } from '@/lib/astrology/painel-celestial';
import { lerPerfilAstrologico } from '@/lib/astrology/perfil-astrologico';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { requireFeatureEnabled } from '@/lib/plans/service';
import { respostaDeErro } from '@/lib/http/api';

export const runtime = 'nodejs';

/** Adaptador privado dos cálculos existentes para os sete dias do painel. */
export async function GET() {
  try {
    const session = await requireServerSession();
    await requireFeatureEnabled(session, 'vedic_insights');
    const perfil = await lerPerfilAstrologico(session.user.id);
    return NextResponse.json(montarPainelCelestial(perfil), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (erro) {
    return respostaDeErro(erro, 'Não foi possível carregar suas leituras.');
  }
}
