import { NextResponse } from 'next/server';
import { z } from 'zod';
import { listarMarcadores } from '@/lib/admin/marcadores-usuarios';
import { respostaDeErro } from '@/lib/http/api';
import { requireAdminSession } from '@/lib/mysql/server-auth';
export const runtime = 'nodejs';
export async function GET(
  _request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    await requireAdminSession();
    return NextResponse.json(
      await listarMarcadores(z.uuid().parse((await context.params).userId)),
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return respostaDeErro(
      error,
      'Não foi possível carregar os marcadores da conta.'
    );
  }
}
