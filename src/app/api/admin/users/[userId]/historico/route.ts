import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { listarEventosDoUsuario } from '@/lib/admin/eventos-usuarios';
import { respostaDeErro } from '@/lib/http/api';
import { requireAdminSession } from '@/lib/mysql/server-auth';

export const runtime = 'nodejs';
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    await requireAdminSession();
    const userId = z.uuid().parse((await context.params).userId);
    const cursor = z
      .string()
      .max(300)
      .optional()
      .parse(request.nextUrl.searchParams.get('cursor') ?? undefined);
    return NextResponse.json(await listarEventosDoUsuario(userId, cursor), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return respostaDeErro(
      error,
      'Não foi possível carregar o histórico administrativo.'
    );
  }
}
