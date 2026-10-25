import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  editarMarcadorSchema,
  excluirMarcadorSchema,
} from '@/lib/admin/esquema-marcadores';
import {
  editarMarcador,
  excluirMarcador,
} from '@/lib/admin/marcadores-usuarios';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireAdminSession } from '@/lib/mysql/server-auth';
export const runtime = 'nodejs';
type Contexto = { params: Promise<{ markerId: string }> };
export async function PATCH(request: Request, context: Contexto) {
  try {
    const session = await requireAdminSession();
    const id = z.uuid().parse((await context.params).markerId);
    const body = await lerJson(request, editarMarcadorSchema);
    return NextResponse.json(
      await editarMarcador(
        session.user.id,
        id,
        body.name,
        body.color,
        body.version
      )
    );
  } catch (error) {
    return respostaDeErro(error, 'Não foi possível atualizar o marcador.');
  }
}
export async function DELETE(request: Request, context: Contexto) {
  try {
    const session = await requireAdminSession();
    const id = z.uuid().parse((await context.params).markerId);
    const body = await lerJson(request, excluirMarcadorSchema);
    return NextResponse.json(
      await excluirMarcador(
        session.user.id,
        id,
        body.version,
        body.expectedUsers
      )
    );
  } catch (error) {
    return respostaDeErro(error, 'Não foi possível excluir o marcador.');
  }
}
