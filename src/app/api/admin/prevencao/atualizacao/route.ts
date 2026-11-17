import { after, NextResponse } from 'next/server';
import { z } from 'zod';

import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireAdminSession } from '@/lib/mysql/server-auth';
import {
  decidirPropostas,
  executarAtualizacao,
  iniciarAtualizacao,
  situacaoDaAtualizacao,
} from '@/lib/prevencao/atualizacao-servico';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const SEM_CACHE = { 'Cache-Control': 'private, no-store' };

const decisaoSchema = z
  .object({
    decisao: z.enum(['aprovar', 'reprovar']),
    propostas: z.union([z.literal('todas'), z.array(z.uuid()).min(1).max(100)]),
  })
  .strict();

/**
 * Atualização dos exames médicos pelo modelo de IA (tarefa 211). Somente
 * administradores. `GET` traz a última atualização e as propostas pendentes;
 * `POST` pede uma nova pesquisa, executada em segundo plano; `PATCH` aprova
 * ou reprova propostas.
 */
export async function GET() {
  try {
    await requireAdminSession();
    return NextResponse.json(await situacaoDaAtualizacao(), {
      headers: SEM_CACHE,
    });
  } catch (erro) {
    return respostaDeErro(erro, 'Não foi possível ler a atualização.');
  }
}

export async function POST() {
  try {
    const sessao = await requireAdminSession();
    const id = await iniciarAtualizacao(sessao.user.id);
    // A pesquisa leva minutos: a resposta volta logo e a tela acompanha.
    after(() => executarAtualizacao(id));
    return NextResponse.json(await situacaoDaAtualizacao(), {
      status: 202,
      headers: SEM_CACHE,
    });
  } catch (erro) {
    return respostaDeErro(erro, 'Não foi possível iniciar a atualização.');
  }
}

export async function PATCH(request: Request) {
  try {
    const sessao = await requireAdminSession();
    const pedido = await lerJson(request, decisaoSchema);
    const decididas = await decidirPropostas(
      pedido.propostas,
      pedido.decisao,
      sessao.user.id
    );
    return NextResponse.json(
      { decididas, ...(await situacaoDaAtualizacao()) },
      { headers: SEM_CACHE }
    );
  } catch (erro) {
    return respostaDeErro(erro, 'Não foi possível registrar a decisão.');
  }
}
