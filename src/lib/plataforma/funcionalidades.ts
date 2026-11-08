import { randomUUID } from 'node:crypto';
import type { PoolConnection } from 'mysql2/promise';
import type { AppSession } from '@/types/app-session';
import type { PlanFeatureKey } from '@/types/subscription';
import { HttpError } from '@/lib/http-error';
import { executeStatement, queryRows, withTransaction } from '@/lib/mysql/pool';
import {
  CHAVES_DOS_GRUPOS,
  GRUPOS_FUNCIONAIS,
  gruposDoRecurso,
  type EstadoDosGrupos,
  type GrupoFuncional,
} from './grupos';

/** Sem cache: desligar um grupo vale na requisição seguinte, inclusive para administradores. */
export async function lerEstadoDosGrupos(
  connection?: PoolConnection
): Promise<EstadoDosGrupos> {
  const linhas = await queryRows<{ switch_key: string; enabled: number }>(
    'SELECT switch_key,enabled FROM platform_feature_switches WHERE switch_key IN (?)',
    [CHAVES_DOS_GRUPOS],
    connection
  );
  return Object.fromEntries(
    CHAVES_DOS_GRUPOS.map((chave) => [
      chave,
      linhas.some(
        (linha) => linha.switch_key === chave && Number(linha.enabled) === 1
      ),
    ])
  ) as EstadoDosGrupos;
}

export async function exigirGruposAtivos(
  grupos: readonly GrupoFuncional[],
  connection?: PoolConnection
) {
  if (!grupos.length) return;
  const estado = await lerEstadoDosGrupos(connection);
  const desligado = grupos.find((grupo) => !estado[grupo]);
  if (desligado)
    throw new HttpError(
      `${GRUPOS_FUNCIONAIS[desligado].nome} está desativado na plataforma.`,
      403
    );
}

export async function recursoAtivoNaPlataforma(
  recurso: PlanFeatureKey,
  connection?: PoolConnection
) {
  const grupos = gruposDoRecurso(recurso);
  if (!grupos.length) return true;
  const estado = await lerEstadoDosGrupos(connection);
  return grupos.every((grupo) => estado[grupo]);
}

export async function listarControlesFuncionais() {
  const linhas = await queryRows<{
    switch_key: GrupoFuncional;
    enabled: number;
    version: number;
    updated_at: string;
  }>(
    'SELECT switch_key,enabled,version,updated_at FROM platform_feature_switches WHERE switch_key IN (?)',
    [CHAVES_DOS_GRUPOS]
  );
  const eventos = await queryRows<{
    id: string;
    switch_key: GrupoFuncional;
    previous_enabled: number;
    next_enabled: number;
    actor_id: string | null;
    created_at: string;
  }>(
    'SELECT id,switch_key,previous_enabled,next_enabled,actor_id,created_at FROM platform_feature_switch_events WHERE switch_key IN (?) ORDER BY created_at DESC,id DESC LIMIT 100',
    [CHAVES_DOS_GRUPOS]
  );
  return CHAVES_DOS_GRUPOS.map((chave) => {
    const linha = linhas.find((item) => item.switch_key === chave);
    if (!linha)
      throw new HttpError(
        'Configuração de funcionalidades incompleta. Execute as migrações.',
        503
      );
    return {
      chave,
      nome: GRUPOS_FUNCIONAIS[chave].nome,
      ativo: Number(linha.enabled) === 1,
      versao: Number(linha.version),
      atualizadoEm: linha.updated_at,
      historico: eventos.filter((evento) => evento.switch_key === chave),
    };
  });
}

export async function alterarGrupoFuncional(
  sessao: AppSession,
  chave: GrupoFuncional,
  ativo: boolean,
  versao: number
) {
  if (sessao.user.role !== 'admin')
    throw new HttpError('Acesso restrito a administradores.', 403);
  if (!CHAVES_DOS_GRUPOS.includes(chave))
    throw new HttpError('Grupo desconhecido.', 404);
  await withTransaction(async (connection) => {
    const [linha] = await queryRows<{ enabled: number; version: number }>(
      'SELECT enabled,version FROM platform_feature_switches WHERE switch_key=? FOR UPDATE',
      [chave],
      connection
    );
    if (!linha)
      throw new HttpError('Configuração de funcionalidades incompleta.', 503);
    if (Number(linha.version) !== versao)
      throw new HttpError(
        'A configuração mudou. Atualize antes de alterar.',
        409
      );
    const anterior = Number(linha.enabled) === 1;
    if (anterior === ativo) return;
    await executeStatement(
      'UPDATE platform_feature_switches SET enabled=?,version=version+1,updated_by=?,updated_at=UTC_TIMESTAMP(3) WHERE switch_key=?',
      [ativo, sessao.user.id, chave],
      connection
    );
    await executeStatement(
      'INSERT INTO platform_feature_switch_events(id,switch_key,previous_enabled,next_enabled,actor_id) VALUES(?,?,?,?,?)',
      [randomUUID(), chave, anterior, ativo, sessao.user.id],
      connection
    );
  });
  return listarControlesFuncionais();
}
