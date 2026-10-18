import { NextResponse } from 'next/server';

import { HttpError } from '@/lib/http-error';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireAdminSession } from '@/lib/mysql/server-auth';
import { salvarConfiguracao } from '@/lib/pagamentos/credenciais';
import { configuracaoSchema, provedorSchema } from '@/lib/pagamentos/esquema';

export const runtime = 'nodejs';

const SEM_CACHE = { 'Cache-Control': 'private, no-store' };

/**
 * Ambiente em uso (teste ou produção) e se o provedor está ativo. Ativar um
 * ambiente cujas chaves não estão prontas responde 409 com o que falta.
 */
export async function PUT(
  request: Request,
  contexto: { params: Promise<{ provedor: string }> }
) {
  try {
    const sessao = await requireAdminSession();
    const provedor = provedorSchema.safeParse((await contexto.params).provedor);
    if (!provedor.success) {
      throw new HttpError('Meio de pagamento desconhecido.', 404);
    }
    const entrada = await lerJson(request, configuracaoSchema);
    const credencial = await salvarConfiguracao(
      provedor.data,
      entrada,
      sessao.user.id
    );
    return NextResponse.json({ credencial }, { headers: SEM_CACHE });
  } catch (error) {
    return respostaDeErro(error, 'Falha ao salvar o ambiente em uso.');
  }
}
