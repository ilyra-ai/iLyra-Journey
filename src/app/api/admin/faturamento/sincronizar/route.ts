import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/mysql/server-auth';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import {
  sincronizacaoSchema,
  sincronizarPagina,
} from '@/lib/billing/admin/sincronizacao';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const admin = await requireAdminSession();
    return NextResponse.json(
      await sincronizarPagina(
        await lerJson(request, sincronizacaoSchema),
        admin.user.id
      ),
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (erro) {
    return respostaDeErro(
      erro,
      'Não foi possível atualizar o histórico financeiro.'
    );
  }
}
