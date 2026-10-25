import { NextResponse } from 'next/server';
import { z } from 'zod';
import { criarNotaSchema } from '@/lib/admin/esquema-notas';
import { criarNota, listarNotas } from '@/lib/admin/notas-usuarios';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireAdminSession } from '@/lib/mysql/server-auth';

export const runtime = 'nodejs';
type Contexto = { params: Promise<{ userId: string }> };
export async function GET(_request: Request, context: Contexto) {
  try {
    await requireAdminSession();
    return NextResponse.json(
      await listarNotas(z.uuid().parse((await context.params).userId)),
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return respostaDeErro(
      error,
      'Não foi possível carregar as notas operacionais.'
    );
  }
}
export async function POST(request: Request, context: Contexto) {
  try {
    const session = await requireAdminSession();
    const userId = z.uuid().parse((await context.params).userId);
    const body = await lerJson(request, criarNotaSchema);
    const resultado = await criarNota(
      session.user.id,
      userId,
      body.id,
      body.body
    );
    return NextResponse.json(resultado, {
      status: resultado.repeated ? 200 : 201,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return respostaDeErro(error, 'Não foi possível criar a nota operacional.');
  }
}
