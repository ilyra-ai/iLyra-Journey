import { z } from 'zod';

import { calcularSolPorData } from '@/lib/astrology/tropical';
import { HttpError } from '@/lib/http-error';
import {
  lerMapaTropical,
  type LeituraTropical,
} from '@/lib/lyra/leitura-tropical';
import { idadeDoNascimento } from '@/lib/perfil/conclusao-onboarding';

import { leituraGratuita, type LeituraGratuita } from './leitura-gratuita';

/**
 * Experiência gratuita sem conta (tarefas 155 e 157). Decisão do titular em
 * 09/11/2026 e 21/11/2026: o visitante informa só o nome completo e a data de
 * nascimento, usados apenas nesta requisição e nunca gravados; a experiência
 * é para quem tem 13 anos completos, conferido no servidor (idade declarada,
 * não verificação de identidade); só o mapa ocidental tropical é gratuito.
 */

export const IDADE_MINIMA_DA_DESCOBERTA = 13;

/** Letras (com acentos), espaços, apóstrofo, ponto e hífen entre letras. */
const NOME = /^\p{L}[\p{L}\p{M}'’. -]*\p{L}\.?$/u;

export const esquemaDoVisitante = z
  .object({
    nome: z
      .string()
      .trim()
      .min(2, 'Informe o nome completo.')
      .max(120, 'O nome pode ter até 120 caracteres.')
      .regex(NOME, 'Use só letras, espaços, apóstrofo, ponto e hífen no nome.')
      .refine(
        (nome) => nome.split(/\s+/).length >= 2,
        'Informe o nome completo (nome e sobrenome).'
      ),
    dataDeNascimento: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data no formato AAAA-MM-DD.'),
  })
  .strict();

export type Visitante = z.infer<typeof esquemaDoVisitante>;

/** Dia civil em São Paulo, como data UTC à meia-noite (para comparar idades). */
export function hojeNoBrasil(agora = new Date()) {
  const dia = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(agora);
  return new Date(`${dia}T00:00:00.000Z`);
}

export interface DescobertaDoVisitante {
  /** Só o primeiro nome, para a saudação; o nome completo não volta. */
  primeiroNome: string;
  sol: {
    signo: string | null;
    signosPossiveis: string[];
    precisao: string;
  };
  leitura: LeituraTropical;
  /** Natureza, forças, atenção, pergunta e reflexão do dia (tarefa 158). */
  gratuita: LeituraGratuita;
}

/**
 * Calcula a leitura gratuita. Nada é gravado: a data e o nome existem só
 * durante a chamada. Idade abaixo de 13 anos é recusada com 403 e a mesma
 * mensagem para qualquer idade menor, sem repetir a data recebida.
 */
export function descobrirVisitante(
  visitante: Visitante,
  agora = new Date()
): DescobertaDoVisitante {
  let mapa: ReturnType<typeof calcularSolPorData>;
  try {
    mapa = calcularSolPorData(visitante.dataDeNascimento, agora);
  } catch (erro) {
    // As mensagens do motor (futuro, inexistente, antes de 1900) não
    // repetem a data recebida.
    if (erro instanceof RangeError) throw new HttpError(erro.message, 422);
    throw erro;
  }
  if (
    idadeDoNascimento(visitante.dataDeNascimento, hojeNoBrasil(agora)) <
    IDADE_MINIMA_DA_DESCOBERTA
  )
    throw new HttpError(
      `A experiência da Lyra é para quem tem ${IDADE_MINIMA_DA_DESCOBERTA} anos ou mais.`,
      403
    );
  return {
    primeiroNome: visitante.nome.split(/\s+/)[0],
    sol: {
      signo: mapa.sol.signo,
      signosPossiveis: [...mapa.sol.signosPossiveis],
      precisao: mapa.precisao,
    },
    leitura: lerMapaTropical(mapa),
    gratuita: leituraGratuita(mapa.sol.signo, agora),
  };
}
