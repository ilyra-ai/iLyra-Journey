import { NextResponse } from 'next/server';
import { z } from 'zod';

import { lerJson, respostaDeErro } from '@/lib/http/api';
import {
  apagarMemorias,
  configurarMemoria,
  consultarMemoria,
  guardarRelato,
  importarHistoricoNaMemoria,
} from '@/lib/memoria/servico';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { exigirDentroDoLimite } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';
const cabecalhos = { 'Cache-Control': 'private, no-store' };
const alteracao = z.discriminatedUnion('acao', [
  z.object({
    acao: z.literal('configurar'),
    ativa: z.boolean(),
    nuvem: z.boolean(),
  }),
  z.object({
    acao: z.literal('relato'),
    texto: z.string().trim().min(1).max(2000),
    corrige: z.uuid().optional(),
  }),
  z.object({ acao: z.literal('importar') }),
]);

export async function GET(request: Request) {
  try {
    const sessao = await requireServerSession();
    const inicio = z.coerce
      .number()
      .int()
      .min(0)
      .max(1_000_000)
      .parse(new URL(request.url).searchParams.get('inicio') ?? 0);
    return NextResponse.json(await consultarMemoria(sessao.user.id, inicio), {
      headers: cabecalhos,
    });
  } catch (erro) {
    return respostaDeErro(erro, 'Não foi possível consultar a memória.');
  }
}

export async function POST(request: Request) {
  try {
    const sessao = await requireServerSession();
    const pedido = await lerJson(request, alteracao);
    await exigirDentroDoLimite(
      { escopo: 'memoria-escrita', limite: 60, janelaSegundos: 3600 },
      sessao.user.id
    );
    if (pedido.acao === 'configurar')
      await configurarMemoria(sessao.user.id, pedido.ativa, pedido.nuvem);
    if (pedido.acao === 'relato')
      await guardarRelato(
        sessao.user.id,
        pedido.texto,
        null,
        pedido.corrige ?? null
      );
    if (pedido.acao === 'importar') {
      return NextResponse.json(
        await importarHistoricoNaMemoria(sessao.user.id),
        { status: 202, headers: cabecalhos }
      );
    }
    return NextResponse.json({ ok: true }, { headers: cabecalhos });
  } catch (erro) {
    return respostaDeErro(erro, 'Não foi possível atualizar a memória.');
  }
}

export async function DELETE() {
  try {
    const sessao = await requireServerSession();
    try {
      await apagarMemorias(sessao.user.id);
    } catch {
      // O estado de exclusão persiste no MySQL e a rotina termina o trabalho.
      const estado = await consultarMemoria(sessao.user.id, 0);
      if (estado.apagando)
        return NextResponse.json(
          { apagado: false, pendente: true },
          { status: 202, headers: cabecalhos }
        );
      throw new Error('A exclusão da memória não foi iniciada.');
    }
    return NextResponse.json(
      { apagado: true, pendente: false },
      { headers: cabecalhos }
    );
  } catch (erro) {
    return respostaDeErro(erro, 'Não foi possível apagar a memória.');
  }
}
