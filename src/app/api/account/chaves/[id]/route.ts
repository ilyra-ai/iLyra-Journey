import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  listarChaves,
  renomearChave,
  revogarChave,
} from '@/lib/auth/chaves/servico';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { HttpError } from '@/lib/http-error';
import { requireServerSession } from '@/lib/mysql/server-auth';

export const runtime = 'nodejs';

type Contexto = { params: Promise<{ id: string }> };

async function idDaChave(contexto: Contexto) {
  const { id } = await contexto.params;
  if (!z.uuid().safeParse(id).success)
    throw new HttpError('Chave de acesso não encontrada.', 404);
  return id;
}

/** Renomeia uma chave da própria conta (tarefa 167). */
export async function PATCH(request: Request, contexto: Contexto) {
  try {
    const session = await requireServerSession();
    const id = await idDaChave(contexto);
    const { nome } = await lerJson(request, z.object({ nome: z.string() }));
    await renomearChave(session.user.id, id, nome);
    return NextResponse.json({ chaves: await listarChaves(session.user.id) });
  } catch (error) {
    return respostaDeErro(error, 'Não foi possível renomear a chave.');
  }
}

/** Revoga uma chave da própria conta: ela deixa de entrar na hora. */
export async function DELETE(_request: Request, contexto: Contexto) {
  try {
    const session = await requireServerSession();
    const id = await idDaChave(contexto);
    await revogarChave(session.user.id, id);
    return NextResponse.json({ chaves: await listarChaves(session.user.id) });
  } catch (error) {
    return respostaDeErro(error, 'Não foi possível revogar a chave.');
  }
}
