import { recalcularMetas } from '@/lib/metas/automaticas';
import { recalcularSequencias } from '@/lib/kpi/streak-repository';
import type { PoolConnection } from 'mysql2/promise';
import type { AppSession } from '@/types/app-session';
import { HttpError } from '@/lib/http-error';
import { queryRows, executeStatement, withTransaction } from '@/lib/mysql/pool';
import { lerPerfilAstrologico } from '@/lib/astrology/perfil-astrologico';
import { dataLocal } from '@/lib/astrology/tempo';
import { somarDias } from '@/lib/acontecimentos/analise';
import { contaTemRecurso, requireFeatureEnabled } from '@/lib/plans/service';
import { ATIVIDADES } from '@/lib/lembretes/esquema';
import { estadoDoPeriodo } from './calendario';
import { prepararAvisosDoDescanso, travarConta } from './avisos';
import {
  resumoDoDescanso,
  periodoDoBanco,
  adaptacoesDasMetas,
  type LinhaDoPeriodo,
} from './repositorio';
import type { DadosDoPeriodo, CentralDoDescanso } from './esquema';
async function contexto(userId: string, agora: Date) {
  const perfil = await lerPerfilAstrologico(userId),
    fuso = perfil.localDoDia?.fuso ?? 'UTC';
  return { fuso, hoje: dataLocal(agora, fuso) };
}
function versao(atual: number, esperada: number) {
  if (Number(atual) !== esperada)
    throw new HttpError(
      'A pausa mudou em outra página. Atualize antes de continuar.',
      409
    );
}
async function encontrar(userId: string, id: string, c: PoolConnection) {
  const [r] = await queryRows<LinhaDoPeriodo>(
    'SELECT * FROM rest_periods WHERE id=? AND user_id=? FOR UPDATE',
    [id, userId],
    c
  );
  if (!r) throw new HttpError('Pausa não encontrada.', 404);
  return periodoDoBanco(r);
}
async function metasDoPeriodo(userId: string, id: string, c: PoolConnection) {
  return queryRows<{ goal_id: string; original_deadline: string }>(
    'SELECT goal_id,original_deadline FROM rest_goal_links WHERE period_id=? AND user_id=? ORDER BY goal_id',
    [id, userId],
    c
  );
}
function mesmasMetas(a: string[], b: string[]) {
  return JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
}
async function conferirMetas(
  s: AppSession,
  ids: string[],
  inicio: string,
  c: PoolConnection,
  agora: Date,
  hoje: string
) {
  if (!ids.length) return [];
  await requireFeatureEnabled(s, 'goal_progress_tracking', c);
  const rs = await queryRows<{
    id: string;
    deadline: string | null;
    status: string;
  }>(
    `SELECT id,deadline,status FROM goals WHERE user_id=? AND id IN (${ids.map(() => '?').join(',')})`,
    [s.user.id, ...ids],
    c
  );
  const adaptacoes = new Map(
    (await adaptacoesDasMetas(s.user.id, hoje, agora, c)).map((a) => [
      a.id,
      a.prazoEfetivo,
    ])
  );
  if (
    rs.length !== ids.length ||
    rs.some(
      (g) =>
        g.status !== 'in_progress' ||
        g.deadline === null ||
        (adaptacoes.get(g.id) ?? g.deadline) < inicio
    )
  )
    throw new HttpError(
      'Escolha metas próprias em andamento, com prazo a partir do início da pausa.',
      400
    );
  return rs as { id: string; deadline: string; status: string }[];
}
async function conferirAtividade(
  s: AppSession,
  p: DadosDoPeriodo,
  c: PoolConnection
) {
  if (p.atividade && p.retornoDias > 0) {
    await requireFeatureEnabled(s, 'personal_notifications', c);
    await requireFeatureEnabled(s, ATIVIDADES[p.atividade].recurso, c);
  }
}
export async function lerCentralDoDescanso(
  s: AppSession,
  antes: string | null = null,
  agora = new Date()
): Promise<CentralDoDescanso> {
  const [ctx, resumo, metasPermitidas, avisosPermitidos] = await Promise.all([
    contexto(s.user.id, agora),
    resumoDoDescanso(s.user.id, agora),
    contaTemRecurso(s.user.id, 'goal_progress_tracking'),
    contaTemRecurso(s.user.id, 'personal_notifications'),
  ]);
  let cursor: { created_at: string; id: string } | undefined;
  if (antes) {
    [cursor] = await queryRows<{ created_at: string; id: string }>(
      'SELECT id,created_at FROM rest_periods WHERE id=? AND user_id=?',
      [antes, s.user.id]
    );
    if (!cursor)
      throw new HttpError('Página do histórico não encontrada.', 404);
  }
  const rs = await queryRows<LinhaDoPeriodo>(
    `SELECT * FROM rest_periods WHERE user_id=?${cursor ? ' AND (created_at<? OR (created_at=? AND id<?))' : ''} ORDER BY created_at DESC,id DESC LIMIT 21`,
    cursor
      ? [s.user.id, cursor.created_at, cursor.created_at, cursor.id]
      : [s.user.id]
  );
  const historico = rs.slice(0, 20).map(periodoDoBanco),
    ids = [
      ...new Set([
        ...historico.map((p) => p.id),
        ...(resumo.atual ? [resumo.atual.id] : []),
      ]),
    ];
  const vinculos = ids.length
    ? await queryRows<{
        period_id: string;
        goal_id: string;
        original_deadline: string;
      }>(
        `SELECT period_id,goal_id,original_deadline FROM rest_goal_links WHERE user_id=? AND period_id IN (${ids.map(() => '?').join(',')}) ORDER BY period_id,goal_id`,
        [s.user.id, ...ids]
      )
    : [];
  const metas = metasPermitidas
    ? await queryRows<{ id: string; title: string; deadline: string }>(
        "SELECT id,title,deadline FROM goals WHERE user_id=? AND status='in_progress' AND deadline IS NOT NULL ORDER BY deadline,title,id",
        [s.user.id]
      )
    : [];
  const atividades: CentralDoDescanso['atividades'] = [];
  if (avisosPermitidos)
    for (const [a, def] of Object.entries(ATIVIDADES))
      if (await contaTemRecurso(s.user.id, def.recurso))
        atividades.push(a as CentralDoDescanso['atividades'][number]);
  const adaptacoes = metasPermitidas
    ? await adaptacoesDasMetas(s.user.id, ctx.hoje, agora)
    : [];
  const porMeta = new Map(adaptacoes.map((a) => [a.id, a.prazoEfetivo]));
  return {
    ...resumo,
    ...ctx,
    historico,
    proximo: rs.length > 20 ? historico.at(-1)!.id : null,
    metas: metas
      .filter((m) => (porMeta.get(m.id) ?? m.deadline) >= ctx.hoje)
      .map((m) => ({
        id: m.id,
        titulo: m.title,
        prazo: porMeta.get(m.id) ?? m.deadline,
      })),
    vinculos: vinculos.map((v) => ({
      periodoId: v.period_id,
      metaId: v.goal_id,
      prazoOriginal: v.original_deadline,
    })),
    atividades,
    adaptacoes,
  };
}
export async function criarPeriodo(
  s: AppSession,
  p: DadosDoPeriodo & { pedidoId: string },
  agora = new Date()
) {
  const ctx = await contexto(s.user.id, agora);
  return withTransaction(async (c) => {
    await travarConta(s.user.id, c);
    const [old] = await queryRows<LinhaDoPeriodo>(
      'SELECT * FROM rest_periods WHERE id=? FOR UPDATE',
      [p.pedidoId],
      c
    );
    if (old) {
      if (old.user_id !== s.user.id)
        throw new HttpError('Pausa não encontrada.', 404);
      const v = periodoDoBanco(old),
        metas = await metasDoPeriodo(s.user.id, v.id, c);
      if (
        v.inicio !== p.inicio ||
        v.fim !== p.fim ||
        v.retornoDias !== p.retornoDias ||
        v.atividade !== p.atividade ||
        !mesmasMetas(
          metas.map((m) => m.goal_id),
          p.metas
        )
      )
        throw new HttpError(
          'Este pedido já foi usado para outro período.',
          409
        );
      return { id: v.id, criada: false };
    }
    if (p.inicio < ctx.hoje || p.inicio > somarDias(ctx.hoje, 365))
      throw new HttpError(
        'O início deve ser de hoje até os próximos 365 dias locais.',
        400
      );
    if ((await resumoDoDescanso(s.user.id, agora, c)).atual)
      throw new HttpError(
        'Encerre a pausa ou o retorno atual, ou cancele o agendamento, antes de criar outro período.',
        409
      );
    const metas = await conferirMetas(s, p.metas, p.inicio, c, agora, ctx.hoje);
    await conferirAtividade(s, p, c);
    await executeStatement(
      'INSERT INTO rest_periods(id,user_id,start_date,planned_end,timezone,active_since,return_days,return_activity,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)',
      [
        p.pedidoId,
        s.user.id,
        p.inicio,
        p.fim,
        ctx.fuso,
        p.inicio === ctx.hoje ? agora : null,
        p.retornoDias,
        p.atividade,
        agora,
        agora,
      ],
      c
    );
    for (const m of metas)
      await executeStatement(
        'INSERT INTO rest_goal_links(period_id,user_id,goal_id,original_deadline,created_at) VALUES(?,?,?,?,?)',
        [p.pedidoId, s.user.id, m.id, m.deadline, agora],
        c
      );
    await prepararAvisosDoDescanso(s.user.id, agora, c);
    await recalcularMetas(s.user.id, ctx.hoje, agora, c);
    await recalcularSequencias(s.user.id, ctx.hoje, c);
    return { id: p.pedidoId, criada: true };
  });
}
export async function editarPeriodo(
  s: AppSession,
  id: string,
  p: DadosDoPeriodo & { versao: number },
  agora = new Date()
) {
  await withTransaction(async (c) => {
    await travarConta(s.user.id, c);
    const old = await encontrar(s.user.id, id, c),
      estado = estadoDoPeriodo(old, agora),
      hoje = dataLocal(agora, old.fuso);
    versao(old.versao, p.versao);
    if (estado !== 'agendada' && estado !== 'ativa')
      throw new HttpError('Este período não pode mais ser alterado.', 409);
    const metas = await metasDoPeriodo(s.user.id, id, c),
      iguais = mesmasMetas(
        metas.map((m) => m.goal_id),
        p.metas
      );
    if (estado === 'ativa' && (p.inicio !== old.inicio || !iguais))
      throw new HttpError(
        'O início e as metas ficam preservados depois que a pausa começa.',
        409
      );
    if (
      estado === 'agendada' &&
      (p.inicio < hoje || p.inicio > somarDias(hoje, 365))
    )
      throw new HttpError(
        'Escolha um início de hoje até os próximos 365 dias.',
        400
      );
    if (p.fim && p.fim < hoje)
      throw new HttpError(
        'O fim programado não pode apagar dias que já foram pausados.',
        400
      );
    const novos =
      !iguais || p.inicio !== old.inicio
        ? await conferirMetas(s, p.metas, p.inicio, c, agora, hoje)
        : null;
    if (p.atividade !== old.atividade || p.retornoDias !== old.retornoDias)
      await conferirAtividade(s, p, c);
    await executeStatement(
      'UPDATE rest_periods SET start_date=?,planned_end=?,return_days=?,return_activity=?,active_since=?,version=version+1,updated_at=? WHERE id=? AND user_id=?',
      [
        p.inicio,
        p.fim,
        p.retornoDias,
        p.atividade,
        estado === 'agendada' && p.inicio === hoje
          ? agora
          : old.ativadaEm
            ? new Date(old.ativadaEm)
            : null,
        agora,
        id,
        s.user.id,
      ],
      c
    );
    if (novos) {
      await executeStatement(
        'DELETE FROM rest_goal_links WHERE period_id=? AND user_id=?',
        [id, s.user.id],
        c
      );
      for (const m of novos)
        await executeStatement(
          'INSERT INTO rest_goal_links(period_id,user_id,goal_id,original_deadline,created_at) VALUES(?,?,?,?,?)',
          [id, s.user.id, m.id, m.deadline, agora],
          c
        );
    }
    await prepararAvisosDoDescanso(s.user.id, agora, c);
    await recalcularMetas(s.user.id, hoje, agora, c);
    await recalcularSequencias(s.user.id, hoje, c);
  });
}
export async function agirNoPeriodo(
  userId: string,
  id: string,
  acao: 'encerrar' | 'cancelar' | 'concluir_retorno',
  esperada: number,
  agora = new Date()
) {
  await withTransaction(async (c) => {
    await travarConta(userId, c);
    const p = await encontrar(userId, id, c),
      estado = estadoDoPeriodo(p, agora),
      hoje = dataLocal(agora, p.fuso);
    versao(p.versao, esperada);
    if (
      (acao === 'cancelar' && estado !== 'agendada') ||
      (acao === 'encerrar' && estado !== 'ativa') ||
      (acao === 'concluir_retorno' && estado !== 'retorno')
    )
      throw new HttpError(
        'A pausa mudou de etapa. Atualize antes de continuar.',
        409
      );
    if (acao === 'cancelar')
      await executeStatement(
        'UPDATE rest_periods SET cancelled_at=?,version=version+1,updated_at=? WHERE id=? AND user_id=?',
        [agora, agora, id, userId],
        c
      );
    if (acao === 'encerrar')
      await executeStatement(
        'UPDATE rest_periods SET ended_date=?,ended_at=?,version=version+1,updated_at=? WHERE id=? AND user_id=?',
        [hoje, agora, agora, id, userId],
        c
      );
    if (acao === 'concluir_retorno')
      await executeStatement(
        'UPDATE rest_periods SET return_ended_date=?,return_ended_at=?,version=version+1,updated_at=? WHERE id=? AND user_id=?',
        [hoje, agora, agora, id, userId],
        c
      );
    await prepararAvisosDoDescanso(userId, agora, c);
    await recalcularMetas(userId, hoje, agora, c);
    await recalcularSequencias(userId, hoje, c);
  });
}
