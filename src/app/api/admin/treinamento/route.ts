import { NextResponse } from 'next/server';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireAdminSession } from '@/lib/mysql/server-auth';
import { acaoSchema } from '@/lib/treinamento/esquema';
import {
  ativarTreinamento,
  desativarTreinamento,
  lerEstadoDoTreinamento,
} from '@/lib/treinamento/servico';

export const runtime = 'nodejs';
const SEM_CACHE = { 'Cache-Control': 'private, no-store' };

/** Estado do Treinamento do chat (somente administradores). */
export async function GET() {
  try {
    const s = await requireAdminSession();
    return NextResponse.json(await lerEstadoDoTreinamento(s), {
      headers: SEM_CACHE,
    });
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível ler o treinamento.');
  }
}

/** `{ acao: 'ativar' }` liga; `{ acao: 'desativar' }` treina e aplica. */
export async function POST(request: Request) {
  try {
    const s = await requireAdminSession();
    const { acao } = await lerJson(request, acaoSchema);
    return NextResponse.json(
      acao === 'ativar'
        ? await ativarTreinamento(s)
        : await desativarTreinamento(s),
      { headers: SEM_CACHE }
    );
  } catch (e) {
    return respostaDeErro(e, 'Não foi possível alterar o treinamento.');
  }
}
