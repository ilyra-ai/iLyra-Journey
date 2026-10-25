import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  atualizarNotaSchema,
  excluirNotaSchema,
} from '@/lib/admin/esquema-notas';
import { atualizarNota, excluirNota } from '@/lib/admin/notas-usuarios';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireAdminSession } from '@/lib/mysql/server-auth';

export const runtime = 'nodejs';
type Contexto = { params: Promise<{ userId: string; noteId: string }> };
const paramsSchema = z.object({ userId: z.uuid(), noteId: z.uuid() });
export async function PATCH(request: Request, context: Contexto) {
  try {
    const session = await requireAdminSession();
    const { userId, noteId } = paramsSchema.parse(await context.params);
    const body = await lerJson(request, atualizarNotaSchema);
    return NextResponse.json(
      await atualizarNota(
        session.user.id,
        userId,
        noteId,
        body.body,
        body.version
      ),
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return respostaDeErro(
      error,
      'Não foi possível atualizar a nota operacional.'
    );
  }
}
export async function DELETE(request: Request, context: Contexto) {
  try {
    const session = await requireAdminSession();
    const { userId, noteId } = paramsSchema.parse(await context.params);
    const body = await lerJson(request, excluirNotaSchema);
    return NextResponse.json(
      await excluirNota(session.user.id, userId, noteId, body.version),
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return respostaDeErro(
      error,
      'Não foi possível excluir a nota operacional.'
    );
  }
}
