import { NextResponse } from 'next/server';
import { z } from 'zod';

import { lerJson, respostaDeErro } from '@/lib/http/api';
import { HttpError } from '@/lib/http-error';
import {
  apagarVerbeteGerado,
  aprovarVerbeteGerado,
  listarVerbetesGerados,
} from '@/lib/lyra/verbetes-gerados-servico';
import { requireAdminSession } from '@/lib/mysql/server-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const SEM_CACHE = { 'Cache-Control': 'private, no-store' };

const situacaoSchema = z.enum(['pendente', 'aprovado']);
const aprovacaoSchema = z
  .object({ id: z.string().min(1).max(80), acao: z.literal('aprovar') })
  .strict();

/**
 * Verbetes escritos automaticamente pelo modelo conectado (tarefas 198 e
 * 199). Todo verbete nasce pendente e só entra na base consultada pelo motor
 * depois de aprovado aqui. Somente administradores.
 * `?situacao=pendente|aprovado` filtra a lista.
 */
export async function GET(request: Request) {
  try {
    await requireAdminSession();
    const bruto = new URL(request.url).searchParams.get('situacao');
    const situacao =
      bruto === null ? undefined : situacaoSchema.safeParse(bruto);
    if (situacao && !situacao.success) {
      throw new HttpError('Situação deve ser pendente ou aprovado.', 400);
    }
    return NextResponse.json(
      { verbetes: await listarVerbetesGerados(situacao?.data) },
      { headers: SEM_CACHE }
    );
  } catch (erro) {
    return respostaDeErro(erro, 'Não foi possível listar os verbetes.');
  }
}

/** `{ id, acao: 'aprovar' }` aprova um verbete pendente. */
export async function PATCH(request: Request) {
  try {
    const sessao = await requireAdminSession();
    const { id } = await lerJson(request, aprovacaoSchema);
    await aprovarVerbeteGerado(id, sessao.user.id);
    return NextResponse.json({ aprovado: id }, { headers: SEM_CACHE });
  } catch (erro) {
    return respostaDeErro(erro, 'Não foi possível aprovar o verbete.');
  }
}

/** `?id=<verbete>` recusa (pendente) ou retira (aprovado) um verbete. */
export async function DELETE(request: Request) {
  try {
    await requireAdminSession();
    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new HttpError('Informe o verbete a remover.', 400);
    await apagarVerbeteGerado(id);
    return NextResponse.json({ removido: id }, { headers: SEM_CACHE });
  } catch (erro) {
    return respostaDeErro(erro, 'Não foi possível remover o verbete.');
  }
}
