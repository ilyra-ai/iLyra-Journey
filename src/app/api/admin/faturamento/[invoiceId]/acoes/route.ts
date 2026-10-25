import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/mysql/server-auth';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import {
  executarOperacao,
  operacaoSchema,
} from '@/lib/billing/admin/operacoes';
export const runtime = 'nodejs';
export async function POST(
  request: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const admin = await requireAdminSession();
    const id = z.uuid().parse((await params).invoiceId);
    return NextResponse.json(
      await executarOperacao(
        id,
        admin.user.id,
        await lerJson(request, operacaoSchema)
      ),
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (erro) {
    return respostaDeErro(
      erro,
      'Não foi possível concluir a operação financeira.'
    );
  }
}
