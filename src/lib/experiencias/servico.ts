import { randomUUID } from 'node:crypto';
import type { PoolConnection } from 'mysql2/promise';
import type { AppSession } from '@/types/app-session';
import { HttpError } from '@/lib/http-error';
import { executeStatement, queryRows, withTransaction } from '@/lib/mysql/pool';
import { dataLocal } from '@/lib/astrology/tempo';
import { contextoDoDiario } from '@/lib/acontecimentos/servico';
import { somarDias, valorValido } from '@/lib/acontecimentos/analise';
import {
  contaTemRecurso,
  requireFeatureEnabled,
  limiteDeMetricasDaConta,
} from '@/lib/plans/service';
import { corteDoHistorico } from '@/lib/plans/historico';
import {
  compararPeriodos,
  revisaoLocal,
  CRITERIOS_DA_EXPERIENCIA,
} from './revisao';
import {
  LIMITE_DE_EXPERIENCIAS,
  type DadosDaExperiencia,
  type DadosDaNota,
  type Experiencia,
  type CentralDeExperiencias,
  type NotaDaExperiencia,
  type PausaDaExperiencia,
  type LinhaDaRevisao,
  type ResumoDaExperiencia,
} from './esquema';

type Linha = {
  id: string;
  user_id: string;
  title: string;
  objective: string;
  chosen_change: string;
  baseline_start: string;
  baseline_end: string;
  observation_start: string;
  observation_end: string;
  timezone: string;
  sleep_offset: 0 | 1;
  goal_id: string | null;
  habit_id: string | null;
  state: Experiencia['estado'];
  version: number;
  created_at: string;
  ended_at: string | null;
  ended_date: string | null;
  note_count?: number;
};
type NotaNoBanco = {
  id: string;
  note_date: string;
  followed: DadosDaNota['seguiu'];
  perception: number | null;
  note: string;
  version: number;
};
const iso = (s: string) => s.replace(' ', 'T') + 'Z';
function converter(r: Linha): Experiencia {
  return {
    id: r.id,
    titulo: r.title,
    objetivo: r.objective,
    mudanca: r.chosen_change,
    inicioReferencia: r.baseline_start,
    fimReferencia: r.baseline_end,
    inicio: r.observation_start,
    fim: r.observation_end,
    fuso: r.timezone,
    alinhamentoSono: r.sleep_offset,
    metaId: r.goal_id,
    habitoId: r.habit_id,
    estado: r.state,
    versao: Number(r.version),
    registradaEm: iso(r.created_at),
    retrospectiva:
      dataLocal(new Date(iso(r.created_at)), r.timezone) > r.observation_start,
    encerradaEm: r.ended_at ? iso(r.ended_at) : null,
    dataEncerramento: r.ended_date,
    relatos: Number(r.note_count ?? 0),
  };
}
const nota = (r: NotaNoBanco): NotaDaExperiencia => ({
  idRelato: r.id,
  data: r.note_date,
  seguiu: r.followed,
  percepcao: r.perception === null ? null : Number(r.perception),
  nota: r.note,
  versao: Number(r.version),
});
function conferirVersao(atual: number, recebida: number) {
  if (Number(atual) !== recebida)
    throw new HttpError(
      'A experiência mudou em outra página. Atualize antes de tentar novamente.',
      409
    );
}
async function travarTitular(userId: string, c: PoolConnection) {
  const [r] = await queryRows(
    'SELECT id FROM users WHERE id=? FOR UPDATE',
    [userId],
    c
  );
  if (!r) throw new HttpError('Conta não encontrada.', 404);
}
async function encontrar(
  userId: string,
  id: string,
  c: PoolConnection,
  travar = false
) {
  const [r] = await queryRows<Linha>(
    `SELECT e.*,(SELECT COUNT(*) FROM personal_experiment_notes n WHERE n.experiment_id=e.id AND n.user_id=e.user_id) AS note_count FROM personal_experiments e WHERE e.id=? AND e.user_id=?${travar ? ' FOR UPDATE' : ''}`,
    [id, userId],
    c
  );
  if (!r) throw new HttpError('Experiência não encontrada.', 404);
  return r;
}
function fimObservado(e: Experiencia, hoje: string) {
  return [e.fim, e.dataEncerramento ?? hoje, hoje].sort()[0];
}
export async function listarExperiencias(
  s: AppSession,
  agora = new Date()
): Promise<CentralDeExperiencias> {
  const ctx = await contextoDoDiario(s.user.id, agora),
    metasPermitidas = await contaTemRecurso(
      s.user.id,
      'goal_progress_tracking'
    );
  const [experiencias, habitos, metas] = await Promise.all([
    queryRows<Linha>(
      'SELECT e.*,(SELECT COUNT(*) FROM personal_experiment_notes n WHERE n.experiment_id=e.id AND n.user_id=e.user_id) AS note_count FROM personal_experiments e WHERE e.user_id=? ORDER BY e.created_at DESC,e.id DESC',
      [s.user.id]
    ),
    queryRows<{ id: string; name: string }>(
      'SELECT id,name FROM habits WHERE user_id=? AND is_active=TRUE ORDER BY name,id',
      [s.user.id]
    ),
    metasPermitidas
      ? queryRows<{ id: string; title: string }>(
          "SELECT id,title FROM goals WHERE user_id=? AND status='in_progress' ORDER BY title,id",
          [s.user.id]
        )
      : Promise.resolve([]),
  ]);
  return {
    hoje: ctx.hoje,
    corte: ctx.corte,
    fuso: ctx.fuso,
    experiencias: experiencias.map(converter),
    habitos: habitos.map((h) => ({ id: h.id, nome: h.name })),
    metas: metas.map((m) => ({ id: m.id, titulo: m.title })),
  };
}
export async function criarExperiencia(
  s: AppSession,
  p: DadosDaExperiencia,
  agora = new Date()
) {
  const ctx = await contextoDoDiario(s.user.id, agora),
    fim = somarDias(p.inicio, p.dias - 1);
  return withTransaction(async (c) => {
    await travarTitular(s.user.id, c);
    const [existente] = await queryRows<Linha>(
      'SELECT * FROM personal_experiments WHERE id=? FOR UPDATE',
      [p.pedidoId],
      c
    );
    if (existente) {
      if (existente.user_id !== s.user.id)
        throw new HttpError('Experiência não encontrada.', 404);
      if (
        existente.title !== p.titulo ||
        existente.objective !== p.objetivo ||
        existente.chosen_change !== p.mudanca ||
        existente.baseline_start !== p.inicioReferencia ||
        existente.baseline_end !== p.fimReferencia ||
        existente.observation_start !== p.inicio ||
        existente.observation_end !== fim ||
        existente.sleep_offset !== p.alinhamentoSono ||
        existente.goal_id !== p.metaId ||
        existente.habit_id !== p.habitoId
      )
        throw new HttpError(
          'Este pedido já foi usado para outra proposta.',
          409
        );
      return { id: existente.id, criada: false };
    }
    if (p.inicio > ctx.hoje || p.inicio < somarDias(ctx.hoje, -29))
      throw new HttpError(
        'Informe um início entre hoje e os últimos 30 dias locais.',
        400
      );
    if (
      !ctx.comparacaoPermitida ||
      (ctx.corte && p.inicioReferencia < ctx.corte)
    )
      throw new HttpError(
        'A referência está fora do histórico disponível no plano.',
        403
      );
    const [n] = await queryRows<{ total: number }>(
      'SELECT COUNT(*) total FROM personal_experiments WHERE user_id=?',
      [s.user.id],
      c
    );
    if (n.total >= LIMITE_DE_EXPERIENCIAS)
      throw new HttpError(
        `Você já tem ${LIMITE_DE_EXPERIENCIAS} experiências. Exclua uma para criar outra.`,
        409
      );
    if (p.metaId) {
      await requireFeatureEnabled(s, 'goal_progress_tracking', c);
      const [m] = await queryRows(
        "SELECT id FROM goals WHERE id=? AND user_id=? AND status='in_progress'",
        [p.metaId, s.user.id],
        c
      );
      if (!m) throw new HttpError('Meta não disponível para esta conta.', 404);
    }
    if (p.habitoId) {
      const [h] = await queryRows(
        'SELECT id FROM habits WHERE id=? AND user_id=? AND is_active=TRUE',
        [p.habitoId, s.user.id],
        c
      );
      if (!h)
        throw new HttpError('Hábito não disponível para esta conta.', 404);
    }
    await executeStatement(
      'INSERT INTO personal_experiments(id,user_id,title,objective,chosen_change,baseline_start,baseline_end,observation_start,observation_end,sleep_offset,timezone,goal_id,habit_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [
        p.pedidoId,
        s.user.id,
        p.titulo,
        p.objetivo,
        p.mudanca,
        p.inicioReferencia,
        p.fimReferencia,
        p.inicio,
        fim,
        p.alinhamentoSono,
        ctx.fuso,
        p.metaId,
        p.habitoId,
        agora,
        agora,
      ],
      c
    );
    return { id: p.pedidoId, criada: true };
  });
}
export async function agirNaExperiencia(
  userId: string,
  id: string,
  acao: 'pausar' | 'retomar' | 'encerrar',
  versao: number,
  agora = new Date()
) {
  await withTransaction(async (c) => {
    await travarTitular(userId, c);
    const r = await encontrar(userId, id, c, true),
      e = converter(r),
      hoje = dataLocal(agora, e.fuso);
    conferirVersao(e.versao, versao);
    if (e.estado === 'encerrada')
      throw new HttpError('Esta experiência já foi encerrada.', 409);
    if (acao !== 'encerrar' && hoje > e.fim)
      throw new HttpError(
        'O período terminou. Encerre a experiência para revisar.',
        409
      );
    if (acao === 'pausar') {
      if (e.estado !== 'em_curso')
        throw new HttpError('A experiência já está pausada.', 409);
      await executeStatement(
        'INSERT INTO personal_experiment_pauses(id,experiment_id,user_id,start_date,started_at,created_at) VALUES(?,?,?,?,?,?)',
        [randomUUID(), id, userId, hoje, agora, agora],
        c
      );
    } else if (acao === 'retomar' && e.estado !== 'pausada')
      throw new HttpError('A experiência já está em curso.', 409);
    if ((acao === 'retomar' || acao === 'encerrar') && e.estado === 'pausada')
      await executeStatement(
        'UPDATE personal_experiment_pauses SET end_date=?,ended_at=? WHERE experiment_id=? AND user_id=? AND ended_at IS NULL',
        [hoje, agora, id, userId],
        c
      );
    const estado =
      acao === 'pausar'
        ? 'pausada'
        : acao === 'retomar'
          ? 'em_curso'
          : 'encerrada';
    await executeStatement(
      'UPDATE personal_experiments SET state=?,version=version+1,ended_at=?,ended_date=?,updated_at=? WHERE id=? AND user_id=?',
      [
        estado,
        acao === 'encerrar' ? agora : null,
        acao === 'encerrar' ? hoje : null,
        agora,
        id,
        userId,
      ],
      c
    );
  });
}
export async function excluirExperiencia(
  userId: string,
  id: string,
  versao: number
) {
  await withTransaction(async (c) => {
    await travarTitular(userId, c);
    conferirVersao((await encontrar(userId, id, c, true)).version, versao);
    await executeStatement(
      'DELETE FROM personal_experiments WHERE id=? AND user_id=?',
      [id, userId],
      c
    );
  });
}
export async function salvarRelato(
  userId: string,
  id: string,
  p: DadosDaNota,
  agora = new Date()
) {
  await withTransaction(async (c) => {
    await travarTitular(userId, c);
    const e = converter(await encontrar(userId, id, c, true)),
      hoje = dataLocal(agora, e.fuso);
    if (p.data < e.inicio || p.data > fimObservado(e, hoje))
      throw new HttpError(
        'Escolha um dia já observado dentro do período da experiência.',
        400
      );
    const [atual] = await queryRows<NotaNoBanco>(
      'SELECT * FROM personal_experiment_notes WHERE experiment_id=? AND user_id=? AND note_date=? FOR UPDATE',
      [id, userId, p.data],
      c
    );
    if (atual && atual.id !== p.idRelato)
      throw new HttpError(
        'O relato deste dia mudou. Atualize antes de salvar.',
        409
      );
    if (
      atual &&
      atual.followed === p.seguiu &&
      (atual.perception === null ? null : Number(atual.perception)) ===
        p.percepcao &&
      atual.note === p.nota
    )
      return;
    conferirVersao(atual?.version ?? 0, p.versao);
    if (atual)
      await executeStatement(
        'UPDATE personal_experiment_notes SET followed=?,perception=?,note=?,version=version+1,updated_at=? WHERE id=? AND user_id=?',
        [p.seguiu, p.percepcao, p.nota, agora, p.idRelato, userId],
        c
      );
    else {
      const [usado] = await queryRows(
        'SELECT id FROM personal_experiment_notes WHERE id=?',
        [p.idRelato],
        c
      );
      if (usado)
        throw new HttpError('Use um novo identificador para este relato.', 409);
      await executeStatement(
        'INSERT INTO personal_experiment_notes(id,experiment_id,user_id,note_date,followed,perception,note,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)',
        [
          p.idRelato,
          id,
          userId,
          p.data,
          p.seguiu,
          p.percepcao,
          p.nota,
          agora,
          agora,
        ],
        c
      );
    }
  });
}
export async function excluirRelato(
  userId: string,
  id: string,
  data: string,
  idRelato: string,
  versao: number
) {
  await withTransaction(async (c) => {
    await travarTitular(userId, c);
    await encontrar(userId, id, c, true);
    const [n] = await queryRows<NotaNoBanco>(
      'SELECT * FROM personal_experiment_notes WHERE experiment_id=? AND user_id=? AND note_date=? FOR UPDATE',
      [id, userId, data],
      c
    );
    if (!n) throw new HttpError('Relato não encontrado.', 404);
    if (n.id !== idRelato)
      throw new HttpError(
        'O relato deste dia mudou. Atualize antes de excluir.',
        409
      );
    conferirVersao(n.version, versao);
    await executeStatement(
      'DELETE FROM personal_experiment_notes WHERE id=? AND user_id=?',
      [idRelato, userId],
      c
    );
  });
}
export async function lerRevisao(
  userId: string,
  id: string,
  agora = new Date()
): Promise<ResumoDaExperiencia> {
  const limite = await limiteDeMetricasDaConta(userId),
    corte = corteDoHistorico(limite, agora);
  return withTransaction(async (c) => {
    const e = converter(await encontrar(userId, id, c)),
      hoje = dataLocal(agora, e.fuso),
      fim = fimObservado(e, hoje);
    const ns = await queryRows<NotaNoBanco>(
        'SELECT * FROM personal_experiment_notes WHERE experiment_id=? AND user_id=? AND note_date BETWEEN ? AND ? ORDER BY note_date',
        [id, userId, e.inicio, fim],
        c
      ),
      relatos = ns.map(nota);
    const ps = await queryRows<{
        id: string;
        start_date: string;
        end_date: string | null;
        started_at: string;
        ended_at: string | null;
      }>(
        'SELECT * FROM personal_experiment_pauses WHERE experiment_id=? AND user_id=? ORDER BY started_at,id',
        [id, userId],
        c
      ),
      pausas: PausaDaExperiencia[] = ps.map((p) => ({
        id: p.id,
        inicio: p.start_date,
        fim: p.end_date,
        iniciadaEm: iso(p.started_at),
        encerradaEm: p.ended_at ? iso(p.ended_at) : null,
      }));
    const primeiras = [e.inicioReferencia, e.inicio].sort()[0],
      minimo = corte && corte > primeiras ? corte : primeiras;
    const metricas =
        limite === 0
          ? []
          : await queryRows<{
              id: string;
              date: string;
              sono: unknown;
              energia: unknown;
            }>(
              'SELECT id,date,sleep_duration_minutes AS sono,energy_level AS energia FROM daily_metrics WHERE user_id=? AND date BETWEEN ? AND ?',
              [
                userId,
                minimo,
                [
                  somarDias(
                    [e.fimReferencia, fim].sort().at(-1)!,
                    e.alinhamentoSono
                  ),
                  hoje,
                ].sort()[0],
              ],
              c
            ),
      porData = new Map(metricas.map((m) => [m.date, m])),
      porNota = new Map(relatos.map((n) => [n.data, n])),
      linhas: LinhaDaRevisao[] = [];
    for (const [fase, inicio, fimDaFase] of [
      ['referencia', e.inicioReferencia, e.fimReferencia],
      ['observacao', e.inicio, fim],
    ] as const) {
      for (let data = inicio; data <= fimDaFase; data = somarDias(data, 1)) {
        const m = porData.get(data),
          dataSono = somarDias(data, e.alinhamentoSono),
          sono = porData.get(dataSono),
          fora = limite === 0 || Boolean(corte && data < corte),
          pausado =
            fase === 'observacao' &&
            pausas.some((p) => data >= p.inicio && data <= (p.fim ?? hoje));
        linhas.push({
          data,
          fase,
          pausado,
          foraDoHistorico: fora,
          dataSono,
          sonoId: fora ? null : (sono?.id ?? null),
          energiaId: fora ? null : (m?.id ?? null),
          sono: fora ? null : valorValido('sono', sono?.sono),
          energia: fora ? null : valorValido('energia', m?.energia),
          nota: fase === 'observacao' ? (porNota.get(data) ?? null) : null,
        });
      }
    }
    const [sobrepostas] = await queryRows<{ total: number }>(
        'SELECT COUNT(*) total FROM personal_experiments WHERE user_id=? AND id<>? AND observation_start<=? AND LEAST(observation_end,COALESCE(ended_date,observation_end))>=?',
        [userId, id, fim, e.inicio],
        c
      ),
      comparacoes = compararPeriodos(linhas);
    return {
      hoje,
      fimObservado: fim,
      corte,
      experiencia: e,
      pausas,
      linhas,
      relatos,
      sobrepostas: sobrepostas.total,
      criterios: CRITERIOS_DA_EXPERIENCIA,
      comparacoes,
      revisao: revisaoLocal(e, linhas, relatos, comparacoes, sobrepostas.total),
      calculadaEm: agora.toISOString(),
    };
  });
}
