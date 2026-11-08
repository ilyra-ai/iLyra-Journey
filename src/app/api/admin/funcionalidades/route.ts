import { NextResponse } from 'next/server';
import { z } from 'zod';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireAdminSession } from '@/lib/mysql/server-auth';
import {
  alterarGrupoFuncional,
  listarControlesFuncionais,
} from '@/lib/plataforma/funcionalidades';
import { CHAVES_DOS_GRUPOS } from '@/lib/plataforma/grupos';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'private, no-store' };
const schema = z
  .object({
    chave: z.enum(CHAVES_DOS_GRUPOS),
    ativo: z.boolean(),
    versao: z.number().int().positive(),
  })
  .strict();

export async function GET() {
  try {
    await requireAdminSession();
    return NextResponse.json(await listarControlesFuncionais(), { headers });
  } catch (erro) {
    return respostaDeErro(
      erro,
      'Não foi possível carregar as funcionalidades.'
    );
  }
}

export async function PUT(request: Request) {
  try {
    const sessao = await requireAdminSession();
    const { chave, ativo, versao } = await lerJson(request, schema);
    return NextResponse.json(
      await alterarGrupoFuncional(sessao, chave, ativo, versao),
      { headers }
    );
  } catch (erro) {
    return respostaDeErro(erro, 'Não foi possível alterar a funcionalidade.');
  }
}
