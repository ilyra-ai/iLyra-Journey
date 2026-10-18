import { NextResponse } from 'next/server';

import { HttpError } from '@/lib/http-error';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireAdminSession } from '@/lib/mysql/server-auth';
import {
  removerCredenciais,
  salvarCredenciais,
} from '@/lib/pagamentos/credenciais';
import {
  credencialSchema,
  entradaDaCredencial,
  provedorSchema,
} from '@/lib/pagamentos/esquema';

export const runtime = 'nodejs';

const SEM_CACHE = { 'Cache-Control': 'private, no-store' };

type Contexto = { params: Promise<{ provedor: string }> };

async function provedorDa(contexto: Contexto) {
  const resultado = provedorSchema.safeParse((await contexto.params).provedor);
  if (!resultado.success) {
    throw new HttpError('Meio de pagamento desconhecido.', 404);
  }
  return resultado.data;
}

/**
 * Grava as credenciais do provedor. Segredo em branco mantém o que já está
 * salvo; os segredos são cifrados antes de ir ao banco.
 */
export async function PUT(request: Request, contexto: Contexto) {
  try {
    const sessao = await requireAdminSession();
    const provedor = await provedorDa(contexto);
    const informado = await lerJson(request, credencialSchema);
    const { entrada, erros } = entradaDaCredencial(provedor, informado);
    if (erros.length > 0) {
      throw new HttpError(erros.join(' '), 400);
    }
    const credencial = await salvarCredenciais(
      provedor,
      entrada,
      sessao.user.id
    );
    return NextResponse.json({ credencial }, { headers: SEM_CACHE });
  } catch (error) {
    return respostaDeErro(error, 'Falha ao salvar as credenciais.');
  }
}

/** Apaga todas as credenciais do provedor. */
export async function DELETE(_request: Request, contexto: Contexto) {
  try {
    await requireAdminSession();
    const provedor = await provedorDa(contexto);
    await removerCredenciais(provedor);
    return NextResponse.json({ removido: provedor }, { headers: SEM_CACHE });
  } catch (error) {
    return respostaDeErro(error, 'Falha ao remover as credenciais.');
  }
}
