import { NextResponse } from 'next/server';

import { lerPerfilAstrologico } from '@/lib/astrology/perfil-astrologico';
import {
  esquemaDaConexao,
  type LocalDeNascimento,
  montarConexao,
  type NascimentoInformado,
} from '@/lib/conexoes/sinastria';
import { cidadePorId } from '@/lib/geo/cidades';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { HttpError } from '@/lib/http-error';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { requireFeatureEnabled } from '@/lib/plans/service';
import { exigirDentroDoLimite } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

/** Dados de nascimento de duas pessoas: nada desta resposta vai para cache. */
const SEM_CACHE = { 'Cache-Control': 'no-store, private' } as const;

/** Uma pessoa explora várias combinações; o teto evita uso automatizado. */
const LIMITE = {
  escopo: 'conexoes-da-alma',
  limite: 40,
  janelaSegundos: 3600,
} as const;

function localDaCidade(
  cidadeId: number | null | undefined,
  rotulo: string
): LocalDeNascimento | null {
  if (!cidadeId) return null;
  const cidade = cidadePorId(cidadeId);
  if (!cidade)
    throw new HttpError(
      `${rotulo}: a cidade escolhida não está na base local.`,
      422
    );
  return {
    rotulo: cidade.rotulo,
    latitude: cidade.latitude,
    longitude: cidade.longitude,
    fuso: cidade.fuso,
  };
}

/**
 * Conexões da Alma (tarefa 166). O plano é conferido antes de ler qualquer
 * dado. Os dados da outra pessoa vivem só nesta requisição: não vão para o
 * banco, para log, para memória nem para modelo de IA. Os do titular vêm do
 * perfil, a menos que a pessoa ajuste só para esta leitura.
 */
export async function POST(request: Request) {
  try {
    const session = await requireServerSession();
    await requireFeatureEnabled(session, 'vedic_insights');
    await exigirDentroDoLimite(LIMITE, session.user.id);
    const pedido = await lerJson(request, esquemaDaConexao);

    let titular: NascimentoInformado;
    if (pedido.titular) {
      titular = {
        rotulo: 'Você',
        data: pedido.titular.data,
        hora: pedido.titular.hora,
        local: localDaCidade(pedido.titular.cidadeId, 'Você'),
        ocorrencia: pedido.titular.ocorrencia,
      };
    } else {
      const { nascimento } = await lerPerfilAstrologico(session.user.id);
      if (!nascimento.data)
        throw new HttpError(
          'Informe a sua data de nascimento no perfil ou ajuste os seus dados nesta leitura.',
          422
        );
      titular = {
        rotulo: 'Você',
        data: nascimento.data,
        hora: nascimento.hora,
        local: nascimento.local,
      };
    }

    const apelido = pedido.outra.apelido?.trim() || 'A outra pessoa';
    const outra: NascimentoInformado = {
      rotulo: apelido,
      data: pedido.outra.data,
      hora: pedido.outra.hora,
      local: localDaCidade(pedido.outra.cidadeId, apelido),
      ocorrencia: pedido.outra.ocorrencia,
    };

    return NextResponse.json(montarConexao(titular, outra), {
      headers: SEM_CACHE,
    });
  } catch (error) {
    const resposta = respostaDeErro(
      error,
      'Não foi possível montar a leitura das Conexões da Alma agora.'
    );
    for (const [chave, valor] of Object.entries(SEM_CACHE))
      resposta.headers.set(chave, valor);
    return resposta;
  }
}
