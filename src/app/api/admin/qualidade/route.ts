import { NextResponse } from 'next/server';
import { z } from 'zod';

import { respostaDeErro } from '@/lib/http/api';
import { HttpError } from '@/lib/http-error';
import { requireAdminSession } from '@/lib/mysql/server-auth';
import { qualidadeDaIa } from '@/lib/qualidade/ia';
import { verificarCalculos } from '@/lib/qualidade/verificacao';

export const runtime = 'nodejs';

const esquemaDosDias = z.coerce
  .number()
  .refine((n) => [7, 30, 90].includes(n), { message: 'Período inválido.' });

/**
 * Centro de qualidade (tarefa 183), só para administradores: executa agora
 * as verificações do Motor contra as referências independentes e lê a
 * qualidade dos modelos de IA no período. Sem dado pessoal na resposta.
 */
export async function GET(request: Request) {
  try {
    await requireAdminSession();
    const dias = esquemaDosDias.safeParse(
      new URL(request.url).searchParams.get('dias') ?? '30'
    );
    if (!dias.success) throw new HttpError('Período inválido.', 400);
    const inicio = performance.now();
    const calculos = verificarCalculos();
    const duracaoMs = Math.round(performance.now() - inicio);
    return NextResponse.json(
      {
        calculos: { ...calculos, duracaoMs },
        ia: { dias: dias.data, modelos: await qualidadeDaIa(dias.data) },
      },
      { headers: { 'Cache-Control': 'no-store, private' } }
    );
  } catch (error) {
    return respostaDeErro(
      error,
      'Não foi possível montar o centro de qualidade.'
    );
  }
}
