import { NextResponse } from 'next/server';

import { HttpError } from '@/lib/http-error';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireAdminSession } from '@/lib/mysql/server-auth';
import {
  removerCredenciais,
  salvarCredenciais,
} from '@/lib/pagamentos/credenciais';
import {
  ambienteSchema,
  credencialSchema,
  entradaDaCredencial,
  provedorSchema,
} from '@/lib/pagamentos/esquema';

export const runtime = 'nodejs';

const SEM_CACHE = { 'Cache-Control': 'private, no-store' };

type Contexto = { params: Promise<{ provedor: string; ambiente: string }> };

async function segmentosDa(contexto: Contexto) {
  const { provedor, ambiente } = await contexto.params;
  const provedorLido = provedorSchema.safeParse(provedor);
  const ambienteLido = ambienteSchema.safeParse(ambiente);
  if (!provedorLido.success) {
    throw new HttpError('Meio de pagamento desconhecido.', 404);
  }
  if (!ambienteLido.success) {
    throw new HttpError(
      'Ambiente desconhecido: use test (teste) ou live (produção).',
      404
    );
  }
  return { provedor: provedorLido.data, ambiente: ambienteLido.data };
}

/**
 * Grava as chaves de um ambiente (teste ou produção) do provedor; na Stripe,
 * também o produto e os preços de cada plano nesse ambiente. Segredo em
 * branco mantém o que já está salvo; os segredos são cifrados antes de ir ao
 * banco. Não muda o ambiente em uso.
 */
export async function PUT(request: Request, contexto: Contexto) {
  try {
    const sessao = await requireAdminSession();
    const { provedor, ambiente } = await segmentosDa(contexto);
    const informado = await lerJson(request, credencialSchema);
    const { entrada, erros } = entradaDaCredencial(
      provedor,
      ambiente,
      informado
    );
    if (erros.length > 0) {
      throw new HttpError(erros.join(' '), 400);
    }
    const credencial = await salvarCredenciais(
      provedor,
      ambiente,
      entrada,
      sessao.user.id
    );
    return NextResponse.json({ credencial }, { headers: SEM_CACHE });
  } catch (error) {
    return respostaDeErro(error, 'Falha ao salvar as credenciais.');
  }
}

/** Apaga as chaves do ambiente (409 se forem as do ambiente em uso). */
export async function DELETE(_request: Request, contexto: Contexto) {
  try {
    await requireAdminSession();
    const { provedor, ambiente } = await segmentosDa(contexto);
    const credencial = await removerCredenciais(provedor, ambiente);
    return NextResponse.json({ credencial }, { headers: SEM_CACHE });
  } catch (error) {
    return respostaDeErro(error, 'Falha ao remover as credenciais.');
  }
}
