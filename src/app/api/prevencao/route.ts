import { NextResponse } from 'next/server';
import { z } from 'zod';

import { lerJson, respostaDeErro } from '@/lib/http/api';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { requireFeatureEnabled } from '@/lib/plans/service';
import { CONDICOES, PARENTES } from '@/lib/prevencao/plano';
import {
  definirHistorico,
  definirVinculo,
  lerPlanoDoTitular,
  registrarExame,
} from '@/lib/prevencao/servico';
import { NOMES_DOS_VINCULOS } from '@/lib/lyra/vinculos-familiares';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const SEM_CACHE = { 'Cache-Control': 'private, no-store' };

const alteracaoSchema = z.discriminatedUnion('tipo', [
  z
    .object({
      tipo: z.literal('exame'),
      recomendacaoId: z.string().min(1).max(40),
      // null apaga o registro.
      realizadoEm: z.iso.date().nullable(),
    })
    .strict(),
  z
    .object({
      tipo: z.literal('historico'),
      parente: z.enum(PARENTES),
      condicao: z.enum(CONDICOES),
      presente: z.boolean(),
    })
    .strict(),
  z
    .object({
      tipo: z.literal('vinculo'),
      vinculoId: z.enum(
        Object.keys(NOMES_DOS_VINCULOS) as [string, ...string[]]
      ),
      pesa: z.enum(['sim', 'as-vezes', 'nao']),
    })
    .strict(),
]);

/**
 * Prevenção do próprio titular (tarefa 209): exames indicados pela idade,
 * pelo corpo e pelo histórico da família, com a situação de cada um, e o
 * cuidado com o estresse dos vínculos que a pessoa diz que pesam.
 */
export async function GET() {
  try {
    const sessao = await requireServerSession();
    await requireFeatureEnabled(sessao, 'daily_checkin');
    return NextResponse.json(await lerPlanoDoTitular(sessao.user.id), {
      headers: SEM_CACHE,
    });
  } catch (erro) {
    return respostaDeErro(erro, 'Não foi possível montar a sua prevenção.');
  }
}

/** Registra exame, histórico da família ou vínculo e devolve o plano novo. */
export async function PATCH(request: Request) {
  try {
    const sessao = await requireServerSession();
    await requireFeatureEnabled(sessao, 'daily_checkin');
    const alteracao = await lerJson(request, alteracaoSchema);
    const usuario = sessao.user.id;
    if (alteracao.tipo === 'exame') {
      await registrarExame(
        usuario,
        alteracao.recomendacaoId,
        alteracao.realizadoEm,
        new Date().toISOString().slice(0, 10)
      );
    } else if (alteracao.tipo === 'historico') {
      await definirHistorico(
        usuario,
        alteracao.parente,
        alteracao.condicao,
        alteracao.presente
      );
    } else {
      await definirVinculo(usuario, alteracao.vinculoId, alteracao.pesa);
    }
    return NextResponse.json(await lerPlanoDoTitular(usuario), {
      headers: SEM_CACHE,
    });
  } catch (erro) {
    return respostaDeErro(erro, 'Não foi possível salvar.');
  }
}
