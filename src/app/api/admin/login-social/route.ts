import { NextResponse } from 'next/server';

import {
  esquemaDaConfiguracao,
  gravarConfiguracao,
  lerConfiguracoes,
  PROVEDORES_SOCIAIS,
} from '@/lib/auth/social/configuracao';
import { enderecoDeRetorno, origemDoApp } from '@/lib/auth/social/rotas';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireAdminSession } from '@/lib/mysql/server-auth';

export const runtime = 'nodejs';

const SEM_CACHE = { 'Cache-Control': 'private, no-store' } as const;

async function situacao(request: Request) {
  const origem = origemDoApp(request);
  return {
    provedores: await lerConfiguracoes(),
    // Endereços para copiar no Google Cloud e no Apple Developer.
    enderecosDeRetorno: Object.fromEntries(
      PROVEDORES_SOCIAIS.map((p) => [p, enderecoDeRetorno(p, origem)])
    ),
    origem,
  };
}

/** Login com Google e Apple (tarefas 164, 165 e 235): só administradores. */
export async function GET(request: Request) {
  try {
    await requireAdminSession();
    return NextResponse.json(await situacao(request), { headers: SEM_CACHE });
  } catch (error) {
    return respostaDeErro(error, 'Falha ao ler o login social.');
  }
}

/** Grava credenciais e o interruptor de um provedor; o segredo não volta. */
export async function PUT(request: Request) {
  try {
    const session = await requireAdminSession();
    const configuracao = await lerJson(request, esquemaDaConfiguracao);
    await gravarConfiguracao(configuracao, session.user.id);
    return NextResponse.json(await situacao(request), { headers: SEM_CACHE });
  } catch (error) {
    return respostaDeErro(error, 'Falha ao salvar o login social.');
  }
}
