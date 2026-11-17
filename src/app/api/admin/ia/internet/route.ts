import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  dominiosSchema,
  lerAcessoInternet,
  salvarAcessoInternet,
  ultimasConsultas,
} from '@/lib/ai/internet/acesso';
import { buscaDisponivel } from '@/lib/ai/internet/busca';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { HttpError } from '@/lib/http-error';
import { requireAdminSession } from '@/lib/mysql/server-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const SEM_CACHE = { 'Cache-Control': 'private, no-store' };

const pedidoSchema = z
  .object({
    modo: z.enum(['desligado', 'lista', 'total']),
    dominios: dominiosSchema,
  })
  .strict();

async function situacao() {
  return {
    acesso: await lerAcessoInternet(),
    consultas: await ultimasConsultas(50),
    /** A busca por termos usa a API oficial do Brave Search (BRAVE_SEARCH_API_KEY). */
    buscaDisponivel: buscaDisponivel(),
  };
}

/**
 * Acesso do modelo de IA à internet (tarefa 212): alcance escolhido pelo
 * administrador e registro das últimas buscas e páginas lidas.
 */
export async function GET() {
  try {
    await requireAdminSession();
    return NextResponse.json(await situacao(), { headers: SEM_CACHE });
  } catch (erro) {
    return respostaDeErro(erro, 'Não foi possível ler o acesso à internet.');
  }
}

/** `{ modo, dominios }`: desligado, só domínios liberados ou acesso total. */
export async function PATCH(request: Request) {
  try {
    const sessao = await requireAdminSession();
    const pedido = await lerJson(request, pedidoSchema);
    if (pedido.modo === 'lista' && pedido.dominios.length === 0) {
      throw new HttpError(
        'Libere ao menos um domínio ou escolha outro modo.',
        400
      );
    }
    await salvarAcessoInternet(pedido, sessao.user.id);
    return NextResponse.json(await situacao(), { headers: SEM_CACHE });
  } catch (erro) {
    return respostaDeErro(erro, 'Não foi possível salvar o acesso à internet.');
  }
}
