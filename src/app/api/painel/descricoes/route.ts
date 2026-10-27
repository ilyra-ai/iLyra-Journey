import { NextResponse } from 'next/server';
import { z } from 'zod';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { dataDoRegistroSchema } from '@/lib/metricas/registro-do-dia';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { obterDescricoesDoPainel } from '@/lib/painel/servico';
export const runtime = 'nodejs';
export const maxDuration = 180;
const pedido = z
  .object({ data: dataDoRegistroSchema, privado: z.boolean() })
  .strict();
export async function POST(request: Request) {
  try {
    const sessao = await requireServerSession();
    const body = await lerJson(request, pedido);
    return NextResponse.json(
      await obterDescricoesDoPainel(sessao, body.data, body.privado),
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (erro) {
    return respostaDeErro(
      erro,
      'Não foi possível preparar as explicações do painel.'
    );
  }
}
