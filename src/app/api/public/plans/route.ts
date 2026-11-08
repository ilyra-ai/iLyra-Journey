import { NextResponse } from 'next/server';

import { respostaDeErro } from '@/lib/http/api';
import { getPlanMatrix } from '@/lib/plans/service';
import { lerEstadoDosGrupos } from '@/lib/plataforma/funcionalidades';
import { gruposDoRecurso } from '@/lib/plataforma/grupos';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const matrix = await getPlanMatrix();
    const grupos = await lerEstadoDosGrupos();
    return NextResponse.json(
      {
        plans: matrix.plans
          .filter(
            (plan) => plan.key !== 'admin' && plan.isActive && plan.isPublic
          )
          .map((plan) => ({
            ...plan,
            features: plan.features.filter((feature) =>
              gruposDoRecurso(feature.key).every((grupo) => grupos[grupo])
            ),
          })),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return respostaDeErro(
      error,
      'Falha ao carregar o catálogo público de planos.'
    );
  }
}
