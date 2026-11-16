import { NextResponse } from 'next/server';
import { z } from 'zod';

import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireServerSession } from '@/lib/mysql/server-auth';
import {
  escolherHoraEstimada,
  limparHoraEstimada,
  opcoesDeHoraDoTitular,
} from '@/lib/perfil/hora-de-nascimento';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CABECALHOS = { 'Cache-Control': 'private, no-store' };

const pedidoSchema = z
  .object({
    // Instante UTC do início da janela, como devolvido pelo GET.
    janela: z.iso.datetime(),
  })
  .strict();

/**
 * Janelas de hora do dia de nascimento do próprio titular: horário e uma
 * palavra por janela, sem termos técnicos, para quem não sabe a hora em que
 * nasceu.
 */
export async function GET() {
  try {
    const session = await requireServerSession();
    return NextResponse.json(await opcoesDeHoraDoTitular(session.user.id), {
      headers: CABECALHOS,
    });
  } catch (error) {
    return respostaDeErro(error, 'Falha ao calcular os horários possíveis.');
  }
}

/** Grava a hora estimada da janela escolhida pelo titular. */
export async function POST(request: Request) {
  try {
    const session = await requireServerSession();
    const { janela } = await lerJson(request, pedidoSchema);
    return NextResponse.json(
      await escolherHoraEstimada(session.user.id, janela),
      { headers: CABECALHOS }
    );
  } catch (error) {
    return respostaDeErro(error, 'Falha ao gravar a hora escolhida.');
  }
}

/** Desfaz a estimativa: a hora volta a ser desconhecida. */
export async function DELETE() {
  try {
    const session = await requireServerSession();
    return NextResponse.json(await limparHoraEstimada(session.user.id), {
      headers: CABECALHOS,
    });
  } catch (error) {
    return respostaDeErro(error, 'Falha ao desfazer a hora estimada.');
  }
}
