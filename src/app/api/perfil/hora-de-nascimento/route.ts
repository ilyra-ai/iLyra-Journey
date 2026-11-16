import { NextResponse } from 'next/server';
import { z } from 'zod';

import { HttpError } from '@/lib/http-error';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireServerSession } from '@/lib/mysql/server-auth';
import {
  escolherHoraEstimada,
  limparHoraEstimada,
  opcoesDeHoraDoTitular,
  opcoesDeHoraParaNascimento,
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

const previaSchema = z
  .object({
    data: z.iso.date(),
    cidadeId: z.coerce.number().int().positive(),
  })
  .strict();

/**
 * Janelas de hora do dia de nascimento do próprio titular: horário e uma
 * palavra por janela, sem termos técnicos, para quem não sabe a hora em que
 * nasceu. Com `?data=AAAA-MM-DD&cidadeId=N` devolve só a prévia para esses
 * dados, ainda não salvos (configuração inicial), sem gravar nada.
 */
export async function GET(request: Request) {
  try {
    const session = await requireServerSession();
    const parametros = new URL(request.url).searchParams;
    if (parametros.has('data') || parametros.has('cidadeId')) {
      const previa = previaSchema.safeParse({
        data: parametros.get('data'),
        cidadeId: parametros.get('cidadeId'),
      });
      if (!previa.success)
        throw new HttpError(
          'Informe a data (AAAA-MM-DD) e a cidade de nascimento.',
          400
        );
      return NextResponse.json(
        {
          opcoes: opcoesDeHoraParaNascimento(
            previa.data.data,
            previa.data.cidadeId
          ),
        },
        { headers: CABECALHOS }
      );
    }
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
