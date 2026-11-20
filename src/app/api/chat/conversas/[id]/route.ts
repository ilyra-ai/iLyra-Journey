import { requireFeatureEnabled } from '@/lib/plans/service';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  apagarConversa,
  esquemaDoTitulo,
  lerConversa,
  renomearConversa,
} from '@/lib/chat/servico';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireServerSession } from '@/lib/mysql/server-auth';

export const runtime = 'nodejs';

const parametros = z
  .object({
    id: z.uuid(),
    antes: z.coerce
      .number()
      .int()
      .min(1)
      .max(Number.MAX_SAFE_INTEGER)
      .optional(),
    depois: z.coerce
      .number()
      .int()
      .min(1)
      .max(Number.MAX_SAFE_INTEGER)
      .optional(),
    alvo: z.uuid().optional(),
  })
  .refine(
    (p) =>
      [p.antes, p.depois, p.alvo].filter((v) => v !== undefined).length <= 1,
    'Use apenas um marcador de navegação por vez.'
  );

export async function GET(
  request: Request,
  contexto: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireServerSession();
    await requireFeatureEnabled(session, 'chat_history');

    const rota = await contexto.params;
    const busca = new URL(request.url).searchParams;
    const { id, antes, depois, alvo } = parametros.parse({
      id: rota.id,
      antes: busca.get('antes') ?? undefined,
      depois: busca.get('depois') ?? undefined,
      alvo: busca.get('alvo') ?? undefined,
    });
    return NextResponse.json(
      await lerConversa(
        session.user.id,
        id,
        antes ?? null,
        depois ?? null,
        alvo ?? null
      ),
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (erro) {
    return respostaDeErro(erro, 'Não foi possível abrir a conversa.');
  }
}

const SEM_CACHE = { 'Cache-Control': 'private, no-store' };
const corpoDoNome = z.object({ titulo: esquemaDoTitulo }).strict();

async function idDaRota(contexto: { params: Promise<{ id: string }> }) {
  return z.uuid().parse((await contexto.params).id);
}

/** Renomeia a conversa da própria pessoa (tarefa 232). */
export async function PATCH(
  request: Request,
  contexto: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireServerSession();
    await requireFeatureEnabled(session, 'chat_history');
    const id = await idDaRota(contexto);
    const { titulo } = await lerJson(request, corpoDoNome);
    return NextResponse.json(
      { conversa: await renomearConversa(session.user.id, id, titulo) },
      { headers: SEM_CACHE }
    );
  } catch (erro) {
    return respostaDeErro(erro, 'Não foi possível renomear a conversa.');
  }
}

/**
 * Exclui a conversa da própria pessoa, com as mensagens, os anexos e as
 * imagens dela (tarefa 232).
 */
export async function DELETE(
  _request: Request,
  contexto: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireServerSession();
    await requireFeatureEnabled(session, 'chat_history');
    await apagarConversa(session.user.id, await idDaRota(contexto));
    return new NextResponse(null, { status: 204, headers: SEM_CACHE });
  } catch (erro) {
    return respostaDeErro(erro, 'Não foi possível excluir a conversa.');
  }
}
