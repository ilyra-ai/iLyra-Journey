import { NextResponse } from 'next/server';

import {
  descobrirVisitante,
  esquemaDoVisitante,
} from '@/lib/descoberta/visitante';
import { contarEtapaSemBloquear } from '@/lib/funil/registro';
import { lerJson, respostaDeErro } from '@/lib/http/api';
import { HttpError } from '@/lib/http-error';
import {
  exigirDentroDoLimite,
  ipDoCliente,
  type RegraDeLimite,
} from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

/** Limite por IP: abuso e robôs, sem barrar um dispositivo compartilhado. */
export const LIMITE_DESCOBERTA_POR_IP: RegraDeLimite = {
  escopo: 'descoberta-ip',
  limite: 30,
  janelaSegundos: 60 * 60,
};

/** O corpo legítimo tem algumas dezenas de bytes. */
const TAMANHO_MAXIMO = 2_048;

/** Nada desta resposta pode ser guardado por navegador, proxy ou CDN. */
const SEM_CACHE = { 'Cache-Control': 'no-store, private' } as const;

/**
 * Experimente Grátis (tarefas 155 e 157): sem conta, sem sessão e sem
 * gravação. O nome e a data de nascimento vivem só durante a requisição; não
 * vão para log, banco, cookie nem URL (o pedido é POST com corpo JSON). A
 * mesma origem é exigida pelo `proxy.ts` em toda escrita.
 */
export async function POST(request: Request) {
  try {
    const tamanho = Number(request.headers.get('content-length') ?? '0');
    if (!Number.isFinite(tamanho) || tamanho > TAMANHO_MAXIMO)
      throw new HttpError('Pedido grande demais.', 413);
    await exigirDentroDoLimite(LIMITE_DESCOBERTA_POR_IP, ipDoCliente(request));
    const visitante = await lerJson(request, esquemaDoVisitante);
    // Funil anônimo (tarefa 170): só a contagem, nunca a data nem o nome.
    await contarEtapaSemBloquear('nascimento_validado');
    const descoberta = descobrirVisitante(visitante);
    await contarEtapaSemBloquear(
      'leitura_entregue',
      descoberta.gratuita.signo ? 'signo' : 'incerto'
    );
    return NextResponse.json(descoberta, { headers: SEM_CACHE });
  } catch (error) {
    const resposta = respostaDeErro(
      error,
      'Não foi possível calcular a leitura agora.'
    );
    for (const [chave, valor] of Object.entries(SEM_CACHE))
      resposta.headers.set(chave, valor);
    return resposta;
  }
}
