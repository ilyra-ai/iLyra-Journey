import { NextResponse } from 'next/server';
import { z } from 'zod';

import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireAdminSession } from '@/lib/mysql/server-auth';
import { CONDICOES } from '@/lib/prevencao/plano';
import { PUBLICOS, TIPOS_DE_RECOMENDACAO } from '@/lib/prevencao/atualizacao';
import {
  alterarRecomendacao,
  confirmarRevisao,
  situacaoDaRevisao,
} from '@/lib/prevencao/servico';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const SEM_CACHE = { 'Cache-Control': 'private, no-store' };

const idade = z.number().int().min(0).max(120);
const pedidoSchema = z.discriminatedUnion('acao', [
  z.object({ acao: z.literal('confirmar-revisao') }).strict(),
  z
    .object({
      acao: z.literal('alterar'),
      id: z.string().min(1).max(40),
      nome: z.string().trim().min(3).max(120).optional(),
      procura: z.string().trim().min(10).max(300).optional(),
      publico: z.enum(PUBLICOS).optional(),
      tipo: z.enum(TIPOS_DE_RECOMENDACAO).optional(),
      historicoRelevante: z
        .array(z.enum(CONDICOES))
        .max(CONDICOES.length)
        .transform((lista) => [...new Set(lista)])
        .optional(),
      idadeMinima: idade.optional(),
      idadeMaxima: idade.nullable().optional(),
      intervaloMeses: z.number().int().min(1).max(240).nullable().optional(),
      orientacao: z.string().trim().min(20).max(600).optional(),
      fonteNome: z.string().trim().min(5).max(200).optional(),
      fonteUrl: z
        .url()
        .max(400)
        .refine((url) => url.startsWith('https://'), 'Use um endereço https.')
        .optional(),
      ativo: z.boolean().optional(),
    })
    .strict()
    .refine(
      (v) =>
        v.idadeMinima === undefined ||
        v.idadeMaxima === undefined ||
        v.idadeMaxima === null ||
        v.idadeMaxima >= v.idadeMinima,
      { error: 'A idade máxima deve ser maior ou igual à mínima.' }
    ),
]);

/**
 * Catálogo de recomendações de exames do motor da Lyra (tarefa 209), com a
 * revisão mensal pela administração. Somente administradores.
 */
export async function GET() {
  try {
    await requireAdminSession();
    return NextResponse.json(await situacaoDaRevisao(), {
      headers: SEM_CACHE,
    });
  } catch (erro) {
    return respostaDeErro(erro, 'Não foi possível ler as recomendações.');
  }
}

export async function PATCH(request: Request) {
  try {
    const sessao = await requireAdminSession();
    const pedido = await lerJson(request, pedidoSchema);
    if (pedido.acao === 'confirmar-revisao') {
      await confirmarRevisao(sessao.user.id);
    } else {
      await alterarRecomendacao(
        pedido.id,
        {
          nome: pedido.nome,
          procura: pedido.procura,
          publico: pedido.publico,
          tipo: pedido.tipo,
          historicoRelevante: pedido.historicoRelevante,
          idadeMinima: pedido.idadeMinima,
          idadeMaxima: pedido.idadeMaxima,
          intervaloMeses: pedido.intervaloMeses,
          orientacao: pedido.orientacao,
          fonteNome: pedido.fonteNome,
          fonteUrl: pedido.fonteUrl,
          ativo: pedido.ativo,
        },
        sessao.user.id
      );
    }
    return NextResponse.json(await situacaoDaRevisao(), {
      headers: SEM_CACHE,
    });
  } catch (erro) {
    return respostaDeErro(erro, 'Não foi possível salvar a recomendação.');
  }
}
