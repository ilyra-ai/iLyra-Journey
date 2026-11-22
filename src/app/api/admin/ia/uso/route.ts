import { NextResponse } from 'next/server';

import {
  apagarPreco,
  esquemaDoMes,
  esquemaDoPreco,
  gravarPreco,
  listarPrecos,
  resumoDoUso,
} from '@/lib/ai/uso-servico';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireAdminSession } from '@/lib/mysql/server-auth';

export const runtime = 'nodejs';

const SEM_CACHE = { 'Cache-Control': 'private, no-store' } as const;

function mesAtual() {
  return new Date().toISOString().slice(0, 7);
}

/**
 * Uso de tokens e custo estimado por provedor e modelo no mês (tarefa 163),
 * só para administradores e sem dados de quem usou. GET ?mes=AAAA-MM.
 */
export async function GET(request: Request) {
  try {
    await requireAdminSession();
    const mes = esquemaDoMes.parse(
      new URL(request.url).searchParams.get('mes') ?? mesAtual()
    );
    return NextResponse.json(
      { mes, linhas: await resumoDoUso(mes), precos: await listarPrecos() },
      { headers: SEM_CACHE }
    );
  } catch (error) {
    return respostaDeErro(error, 'Falha ao consultar o uso de IA.');
  }
}

/** Cadastra ou troca o preço oficial de um modelo, com fonte e data. */
export async function PUT(request: Request) {
  try {
    const session = await requireAdminSession();
    const preco = await lerJson(request, esquemaDoPreco);
    await gravarPreco(preco, session.user.id);
    return NextResponse.json(
      { precos: await listarPrecos() },
      { headers: SEM_CACHE }
    );
  } catch (error) {
    return respostaDeErro(error, 'Falha ao gravar o preço.');
  }
}

/** Retira o preço de um modelo: o custo dele volta a ser desconhecido. */
export async function DELETE(request: Request) {
  try {
    await requireAdminSession();
    const parametros = new URL(request.url).searchParams;
    const provedor = esquemaDoPreco.shape.provedor.parse(
      parametros.get('provedor')
    );
    const modelo = esquemaDoPreco.shape.modelo.parse(parametros.get('modelo'));
    await apagarPreco(provedor, modelo);
    return NextResponse.json(
      { precos: await listarPrecos() },
      { headers: SEM_CACHE }
    );
  } catch (error) {
    return respostaDeErro(error, 'Falha ao retirar o preço.');
  }
}
