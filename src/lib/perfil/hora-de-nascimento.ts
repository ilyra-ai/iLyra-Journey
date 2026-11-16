import type { PoolConnection } from 'mysql2/promise';

import {
  calcularJanelasDeHora,
  type JanelaDeHora,
} from '@/lib/astrology/hora-de-nascimento';
import {
  lerPerfilAstrologico,
  type PerfilAstrologico,
} from '@/lib/astrology/perfil-astrologico';
import { HttpError } from '@/lib/http-error';
import { SIGNOS_INFO } from '@/lib/lyra/conhecimento/jyotish';
import { executeStatement, queryRows, withTransaction } from '@/lib/mysql/pool';

/**
 * Hora de nascimento de quem não sabe a hora em que nasceu.
 *
 * A pessoa vê as janelas do próprio dia de nascimento, cada uma com o horário
 * e uma única palavra (a característica principal, sem termo técnico), e
 * escolhe a que mais se parece com ela. O servidor recalcula as janelas a
 * partir do perfil, grava a hora representativa da janela escolhida e a marca
 * como estimada. O navegador nunca envia a hora nem o signo.
 */

export type SituacaoDaHora = 'informada' | 'estimada' | 'desconhecida';

export interface OpcaoDeHora {
  /** Identificador da janela: instante UTC em que ela começa. */
  id: string;
  /** "HH:mm" local do início e do fim da janela. */
  inicio: string;
  fim: string;
  /** Característica principal em uma palavra. */
  palavra: string;
  /** É a janela da estimativa gravada no perfil. */
  escolhida: boolean;
}

export interface OpcoesDeHora {
  situacao: SituacaoDaHora;
  /** "HH:mm" gravada no perfil, informada ou estimada. */
  hora: string | null;
  /** O que falta no perfil para calcular as janelas. */
  faltando: Array<'data' | 'local'>;
  /** Motivo pelo qual as janelas não podem ser calculadas para este local. */
  indisponivel: string | null;
  opcoes: OpcaoDeHora[];
}

function situacaoDoPerfil(perfil: PerfilAstrologico): SituacaoDaHora {
  if (!perfil.nascimento.hora) return 'desconhecida';
  return perfil.nascimento.horaEstimada ? 'estimada' : 'informada';
}

function janelasDoPerfil(perfil: PerfilAstrologico): {
  janelas: JanelaDeHora[];
  faltando: OpcoesDeHora['faltando'];
  indisponivel: string | null;
} {
  const { data, local } = perfil.nascimento;
  const faltando: OpcoesDeHora['faltando'] = [];
  if (!data) faltando.push('data');
  if (!local) faltando.push('local');
  if (!data || !local) return { janelas: [], faltando, indisponivel: null };
  try {
    return {
      janelas: calcularJanelasDeHora({
        data,
        latitude: local.latitude,
        longitude: local.longitude,
        fuso: local.fuso,
      }),
      faltando,
      indisponivel: null,
    };
  } catch (erro) {
    // Limite declarado do cálculo (ex.: latitude polar), não uma falha.
    if (erro instanceof RangeError)
      return { janelas: [], faltando, indisponivel: erro.message };
    throw erro;
  }
}

function montarOpcoes(perfil: PerfilAstrologico): OpcoesDeHora {
  const situacao = situacaoDoPerfil(perfil);
  const { janelas, faltando, indisponivel } = janelasDoPerfil(perfil);
  return {
    situacao,
    hora: perfil.nascimento.hora,
    faltando,
    indisponivel,
    // A janela sem hora representável (hora repetida do fim do horário de
    // verão) não pode ser gravada no perfil e, por isso, não é oferecida.
    opcoes: janelas
      .filter((janela) => janela.horaEstimada !== null)
      .map((janela) => ({
        id: janela.inicioUtc.toISOString(),
        inicio: janela.inicio,
        fim: janela.fim,
        palavra: SIGNOS_INFO[janela.signo].essencia,
        escolhida:
          situacao === 'estimada' &&
          janela.horaEstimada === perfil.nascimento.hora,
      })),
  };
}

async function bloquearPerfil(userId: string, connection: PoolConnection) {
  const [titular] = await queryRows<{ id: string }>(
    'SELECT id FROM profiles WHERE id = ? FOR UPDATE',
    [userId],
    connection
  );
  if (!titular) throw new HttpError('Perfil não encontrado.', 404);
  return lerPerfilAstrologico(userId, connection);
}

/** Janelas do dia de nascimento do próprio titular e a situação da hora. */
export async function opcoesDeHoraDoTitular(
  userId: string
): Promise<OpcoesDeHora> {
  return withTransaction(async (connection) =>
    montarOpcoes(await bloquearPerfil(userId, connection))
  );
}

/**
 * Grava a hora estimada da janela escolhida. Uma hora informada pela pessoa
 * nunca é substituída por uma estimativa: ela precisa apagá-la antes.
 */
export async function escolherHoraEstimada(
  userId: string,
  janelaId: string
): Promise<OpcoesDeHora> {
  return withTransaction(async (connection) => {
    const perfil = await bloquearPerfil(userId, connection);
    if (situacaoDoPerfil(perfil) === 'informada')
      throw new HttpError(
        'Seu perfil já tem a hora de nascimento informada. Apague-a no perfil para escolher uma hora estimada.',
        409
      );
    const { janelas, faltando, indisponivel } = janelasDoPerfil(perfil);
    if (faltando.length > 0)
      throw new HttpError(
        'Informe a data e a cidade de nascimento no perfil para escolher a hora.',
        422
      );
    if (indisponivel) throw new HttpError(indisponivel, 422);
    const instante = new Date(janelaId).getTime();
    const janela = janelas.find(
      (item) => item.inicioUtc.getTime() === instante
    );
    if (!janela?.horaEstimada)
      throw new HttpError(
        'Esse horário não pertence ao seu dia de nascimento. Atualize a página e escolha novamente.',
        409
      );
    await executeStatement(
      `UPDATE profiles
          SET birth_time = ?, birth_time_estimate = ?,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
      [janela.horaEstimada, janela.horaEstimada, userId],
      connection
    );
    return montarOpcoes(await lerPerfilAstrologico(userId, connection));
  });
}

/**
 * Volta a hora para desconhecida quando ela era uma estimativa ("nenhuma se
 * parece comigo"). Uma hora informada pela pessoa não é apagada por aqui.
 */
export async function limparHoraEstimada(
  userId: string
): Promise<OpcoesDeHora> {
  return withTransaction(async (connection) => {
    const perfil = await bloquearPerfil(userId, connection);
    if (situacaoDoPerfil(perfil) === 'informada')
      throw new HttpError(
        'A hora do seu perfil foi informada por você; altere-a no próprio perfil.',
        409
      );
    await executeStatement(
      `UPDATE profiles
          SET birth_time = NULL, birth_time_estimate = NULL,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
      [userId],
      connection
    );
    return montarOpcoes(await lerPerfilAstrologico(userId, connection));
  });
}
