import { randomUUID } from 'node:crypto';
import type { PoolConnection } from 'mysql2/promise';
import { HttpError } from '@/lib/http-error';
import { executeStatement, queryRows, withTransaction } from '@/lib/mysql/pool';
import { requireFeatureEnabled } from '@/lib/plans/service';
import {
  LIMITE_DE_ROTINAS,
  PRATICAS,
  type DadosDaRotina,
  type Execucao,
  type CentralDeRotinas,
  type AcaoDaRotina,
} from './esquema';

type Sessao = Parameters<typeof requireFeatureEnabled>[0];
type LinhaDaRotina = {
  id: string;
  title: string;
  days: unknown;
  steps: unknown;
  version: number;
};
type LinhaDaExecucao = {
  id: string;
  routine_id: string;
  title: string;
  steps: unknown;
  state: Execucao['estado'];
  version: number;
  created_at: string;
  finished_at: string | null;
};
function json<T>(valor: unknown): T {
  return (typeof valor === 'string' ? JSON.parse(valor) : valor) as T;
}
const iso = (s: string) => s.replace(' ', 'T') + 'Z';
function execucao(r: LinhaDaExecucao): Execucao {
  return {
    id: r.id,
    rotinaId: r.routine_id,
    titulo: r.title,
    passos: json(r.steps),
    estado: r.state,
    versao: Number(r.version),
    iniciadaEm: iso(r.created_at),
    finalizadaEm: r.finished_at ? iso(r.finished_at) : null,
  };
}
async function travarTitular(id: string, c: PoolConnection) {
  const [u] = await queryRows(
    'SELECT id FROM users WHERE id=? FOR UPDATE',
    [id],
    c
  );
  if (!u) throw new HttpError('Conta não encontrada.', 404);
}
async function lerDefinicao(userId: string, id: string, c: PoolConnection) {
  const [r] = await queryRows<LinhaDaRotina>(
    'SELECT id,title,days,steps,version FROM personal_routines WHERE id=? AND user_id=? FOR UPDATE',
    [id, userId],
    c
  );
  if (!r) throw new HttpError('Rotina não encontrada.', 404);
  return r;
}
function conferirVersao(atual: number, pedida: number) {
  if (Number(atual) !== pedida)
    throw new HttpError(
      'Esta rotina foi atualizada em outra página. Atualize antes de tentar novamente.',
      409
    );
}
async function validarPraticas(
  session: Sessao,
  d: DadosDaRotina,
  c: PoolConnection
) {
  for (const p of d.passos) {
    const pratica = PRATICAS[p.atividade];
    if (pratica.recurso)
      await requireFeatureEnabled(session, pratica.recurso, c);
    if (p.habitoId) {
      const [h] = await queryRows(
        'SELECT id FROM habits WHERE id=? AND user_id=? AND is_active=TRUE',
        [p.habitoId, session.user.id],
        c
      );
      if (!h)
        throw new HttpError(
          'Um hábito não está mais disponível para esta conta. Edite o passo.',
          400
        );
    }
  }
}
export async function listarRotinas(userId: string): Promise<CentralDeRotinas> {
  const [rotinas, execucoes, habitos] = await Promise.all([
    queryRows<LinhaDaRotina>(
      'SELECT id,title,days,steps,version FROM personal_routines WHERE user_id=? ORDER BY created_at,id',
      [userId]
    ),
    queryRows<LinhaDaExecucao>(
      `SELECT r.* FROM personal_routine_runs r WHERE r.user_id=? AND NOT EXISTS(SELECT 1 FROM personal_routine_runs n WHERE n.routine_id=r.routine_id AND n.user_id=r.user_id AND n.sequence_number>r.sequence_number)`,
      [userId]
    ),
    queryRows<{ id: string; name: string }>(
      'SELECT id,name FROM habits WHERE user_id=? AND is_active=TRUE ORDER BY name,id',
      [userId]
    ),
  ]);
  return {
    rotinas: rotinas.map((r) => ({
      id: r.id,
      titulo: r.title,
      dias: json(r.days),
      passos: json(r.steps),
      versao: Number(r.version),
      execucao: execucoes.find((e) => e.routine_id === r.id)
        ? execucao(execucoes.find((e) => e.routine_id === r.id)!)
        : null,
    })),
    habitos: habitos.map((h) => ({ id: h.id, nome: h.name })),
  };
}
export async function salvarRotina(
  session: Sessao,
  d: DadosDaRotina,
  id?: string,
  versao?: number
) {
  return withTransaction(async (c) => {
    const uid = session.user.id;
    await travarTitular(uid, c);
    if (id) {
      const atual = await lerDefinicao(uid, id, c);
      conferirVersao(atual.version, versao!);
    } else {
      const [r] = await queryRows<{ total: number }>(
        'SELECT COUNT(*) total FROM personal_routines WHERE user_id=?',
        [uid],
        c
      );
      if (r.total >= LIMITE_DE_ROTINAS)
        throw new HttpError(
          `Você já tem ${LIMITE_DE_ROTINAS} rotinas. Exclua uma para criar outra.`,
          409
        );
    }
    await validarPraticas(session, d, c);
    const rotinaId = id ?? randomUUID();
    if (id)
      await executeStatement(
        'UPDATE personal_routines SET title=?,days=?,steps=?,version=version+1 WHERE id=? AND user_id=?',
        [d.titulo, JSON.stringify(d.dias), JSON.stringify(d.passos), id, uid],
        c
      );
    else
      await executeStatement(
        'INSERT INTO personal_routines(id,user_id,title,days,steps) VALUES(?,?,?,?,?)',
        [
          rotinaId,
          uid,
          d.titulo,
          JSON.stringify(d.dias),
          JSON.stringify(d.passos),
        ],
        c
      );
    return rotinaId;
  });
}
export async function excluirRotina(
  userId: string,
  id: string,
  versao: number
) {
  await withTransaction(async (c) => {
    await travarTitular(userId, c);
    conferirVersao((await lerDefinicao(userId, id, c)).version, versao);
    await executeStatement(
      'DELETE FROM personal_routines WHERE id=? AND user_id=?',
      [id, userId],
      c
    );
  });
}
export async function iniciarRotina(
  session: Sessao,
  id: string,
  idExecucao: string,
  versao: number
): Promise<Execucao> {
  return withTransaction(async (c) => {
    const uid = session.user.id;
    await travarTitular(uid, c);
    const r = await lerDefinicao(uid, id, c);
    const [repetida] = await queryRows<LinhaDaExecucao & { user_id: string }>(
      'SELECT * FROM personal_routine_runs WHERE id=? FOR UPDATE',
      [idExecucao],
      c
    );
    if (repetida) {
      if (repetida.user_id !== uid || repetida.routine_id !== id)
        throw new HttpError('Execução não encontrada nesta rotina.', 404);
      return execucao(repetida);
    }
    const [ativa] = await queryRows<LinhaDaExecucao>(
      "SELECT * FROM personal_routine_runs WHERE routine_id=? AND user_id=? AND state IN ('em_curso','pausada') FOR UPDATE",
      [id, uid],
      c
    );
    if (ativa) return execucao(ativa);
    conferirVersao(r.version, versao);
    const d: DadosDaRotina = {
      titulo: r.title,
      dias: json(r.days),
      passos: json(r.steps),
    };
    await validarPraticas(session, d, c);
    const passos = d.passos.map((p) => ({ ...p, estado: 'pendente' }));
    await executeStatement(
      'INSERT INTO personal_routine_runs(id,routine_id,user_id,title,steps) VALUES(?,?,?,?,?)',
      [idExecucao, id, uid, r.title, JSON.stringify(passos)],
      c
    );
    const [nova] = await queryRows<LinhaDaExecucao>(
      'SELECT * FROM personal_routine_runs WHERE id=?',
      [idExecucao],
      c
    );
    return execucao(nova);
  });
}
export async function agirNaRotina(
  userId: string,
  id: string,
  acao: AcaoDaRotina
): Promise<Execucao> {
  return withTransaction(async (c) => {
    await travarTitular(userId, c);
    const [r] = await queryRows<LinhaDaExecucao>(
      'SELECT * FROM personal_routine_runs WHERE id=? AND user_id=? FOR UPDATE',
      [id, userId],
      c
    );
    if (!r) throw new HttpError('Execução não encontrada.', 404);
    const e = execucao(r);
    conferirVersao(e.versao, acao.versao);
    if (e.estado === 'encerrada')
      throw new HttpError(
        'Esta execução já terminou. Inicie outra na rotina.',
        409
      );
    if (acao.acao === 'pausar') {
      if (e.estado !== 'em_curso')
        throw new HttpError('A rotina já está pausada.', 409);
      e.estado = 'pausada';
    } else if (acao.acao === 'retomar') {
      if (e.estado !== 'pausada')
        throw new HttpError('A rotina já está em curso.', 409);
      e.estado = 'em_curso';
    } else {
      if (e.estado !== 'em_curso')
        throw new HttpError('Retome a rotina antes de marcar um passo.', 409);
      const proximo = e.passos.find((p) => p.estado === 'pendente');
      if (!proximo || proximo.id !== acao.passoId)
        throw new HttpError('Marque o próximo passo da sequência.', 409);
      proximo.estado = acao.acao === 'concluir' ? 'concluido' : 'pulado';
      if (e.passos.every((p) => p.estado !== 'pendente'))
        e.estado = 'encerrada';
    }
    await executeStatement(
      "UPDATE personal_routine_runs SET steps=?,state=?,version=version+1,finished_at=IF(?='encerrada',UTC_TIMESTAMP(3),NULL) WHERE id=? AND user_id=?",
      [JSON.stringify(e.passos), e.estado, e.estado, id, userId],
      c
    );
    const [atual] = await queryRows<LinhaDaExecucao>(
      'SELECT * FROM personal_routine_runs WHERE id=?',
      [id],
      c
    );
    return execucao(atual);
  });
}
