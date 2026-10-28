import { randomUUID } from 'node:crypto';
import type { PoolConnection } from 'mysql2/promise';
import { HttpError } from '@/lib/http-error';
import { executeStatement, queryRows, withTransaction } from '@/lib/mysql/pool';
import { lerPerfilAstrologico } from '@/lib/astrology/perfil-astrologico';
import { dataLocal } from '@/lib/astrology/tempo';
import { corteDoHistorico } from '@/lib/plans/historico';
import { limiteDeMetricasDaConta } from '@/lib/plans/service';
import { analisarPares, somarDias, valorValido } from './analise';
import {
  LIMITE_DE_MARCADORES,
  type PedidoDoDia,
  type PedidoDaComparacao,
  type DiaDeAcontecimentos,
  type CentralDeAcontecimentos,
  type ParDeObservacao,
} from './esquema';

export async function contextoDoDiario(userId: string, agora = new Date()) {
  const [perfil, limite] = await Promise.all([
      lerPerfilAstrologico(userId),
      limiteDeMetricasDaConta(userId),
    ]),
    fuso = perfil.localDoDia?.fuso ?? 'UTC',
    hoje = dataLocal(agora, fuso);
  return {
    hoje,
    fuso,
    corte: limite === 0 ? hoje : corteDoHistorico(limite, agora),
    comparacaoPermitida: limite !== 0,
  };
}
function exigirPeriodo(
  p: { inicio: string; fim: string },
  c: { hoje: string; corte: string | null }
) {
  if (p.inicio > p.fim)
    throw new HttpError(
      'Não há dias locais nesta janela do histórico vigente.',
      403
    );
  if (p.fim > c.hoje)
    throw new HttpError('Escolha datas até o dia local de hoje.', 400);
  if (c.corte && p.inicio < c.corte)
    throw new HttpError(
      'Este período está fora do histórico disponível no plano.',
      403
    );
}
async function titular(userId: string, c: PoolConnection) {
  const [u] = await queryRows(
    'SELECT id FROM users WHERE id=? FOR UPDATE',
    [userId],
    c
  );
  if (!u) throw new HttpError('Conta não encontrada.', 404);
}
function versao(atual: number, pedida: number) {
  if (Number(atual) !== pedida)
    throw new HttpError(
      'O registro mudou em outra página. Atualize antes de tentar novamente.',
      409
    );
}
async function marcador(userId: string, id: string, c: PoolConnection) {
  const [m] = await queryRows<{ id: string; name: string; version: number }>(
    'SELECT id,name,version FROM personal_event_markers WHERE id=? AND user_id=? FOR UPDATE',
    [id, userId],
    c
  );
  if (!m) throw new HttpError('Marcador não encontrado.', 404);
  return m;
}
async function lerDias(
  userId: string,
  inicio: string,
  fim: string,
  c?: PoolConnection
): Promise<DiaDeAcontecimentos[]> {
  const dias = await queryRows<{
    event_date: string;
    note: string;
    confirmed: number;
    version: number;
  }>(
    'SELECT event_date,note,confirmed,version FROM personal_event_days WHERE user_id=? AND event_date BETWEEN ? AND ? ORDER BY event_date DESC',
    [userId, inicio, fim],
    c
  );
  const links = await queryRows<{ event_date: string; marker_id: string }>(
    'SELECT event_date,marker_id FROM personal_event_day_markers WHERE user_id=? AND event_date BETWEEN ? AND ? ORDER BY marker_id',
    [userId, inicio, fim],
    c
  );
  return dias.map((d) => ({
    data: d.event_date,
    nota: d.note,
    confirmado: Boolean(d.confirmed),
    versao: Number(d.version),
    marcadores: links
      .filter((l) => l.event_date === d.event_date)
      .map((l) => l.marker_id),
  }));
}
export async function listarDiario(
  userId: string,
  p?: { inicio: string; fim: string },
  agora = new Date()
): Promise<CentralDeAcontecimentos> {
  const ctx = await contextoDoDiario(userId, agora),
    inicio =
      p?.inicio ??
      (ctx.corte && ctx.corte > somarDias(ctx.hoje, -29)
        ? ctx.corte
        : somarDias(ctx.hoje, -29)),
    fim = p?.fim ?? ctx.hoje;
  exigirPeriodo({ inicio, fim }, ctx);
  return withTransaction(async (c) => {
    const ms = await queryRows<{ id: string; name: string; version: number }>(
      'SELECT id,name,version FROM personal_event_markers WHERE user_id=? ORDER BY name,id',
      [userId],
      c
    );
    return {
      ...ctx,
      inicio,
      fim,
      marcadores: ms.map((m) => ({
        id: m.id,
        nome: m.name,
        versao: Number(m.version),
      })),
      dias: await lerDias(userId, inicio, fim, c),
    };
  });
}
export async function salvarMarcador(
  userId: string,
  nome: string,
  id?: string,
  versaoPedida?: number
): Promise<string> {
  return withTransaction(async (c) => {
    await titular(userId, c);
    if (id) versao((await marcador(userId, id, c)).version, versaoPedida!);
    else {
      const [n] = await queryRows<{ total: number }>(
        'SELECT COUNT(*) total FROM personal_event_markers WHERE user_id=?',
        [userId],
        c
      );
      if (n.total >= LIMITE_DE_MARCADORES)
        throw new HttpError(
          `Você já tem ${LIMITE_DE_MARCADORES} marcadores.`,
          409
        );
    }
    const novoId = id ?? randomUUID();
    try {
      if (id)
        await executeStatement(
          'UPDATE personal_event_markers SET name=?,version=version+1 WHERE id=? AND user_id=?',
          [nome, id, userId],
          c
        );
      else
        await executeStatement(
          'INSERT INTO personal_event_markers(id,user_id,name) VALUES(?,?,?)',
          [novoId, userId, nome],
          c
        );
    } catch (e) {
      if (
        e &&
        typeof e === 'object' &&
        'code' in e &&
        e.code === 'ER_DUP_ENTRY'
      )
        throw new HttpError('Você já tem um marcador com esse nome.', 409);
      throw e;
    }
    return novoId;
  });
}
export async function excluirMarcador(
  userId: string,
  id: string,
  versaoPedida: number
) {
  await withTransaction(async (c) => {
    await titular(userId, c);
    versao((await marcador(userId, id, c)).version, versaoPedida);
    await executeStatement(
      'UPDATE personal_event_days d JOIN personal_event_day_markers l ON l.user_id=d.user_id AND l.event_date=d.event_date SET d.confirmed=FALSE,d.version=d.version+1 WHERE l.marker_id=? AND d.user_id=?',
      [id, userId],
      c
    );
    await executeStatement(
      'DELETE FROM personal_event_markers WHERE id=? AND user_id=?',
      [id, userId],
      c
    );
  });
}
export async function salvarDia(
  userId: string,
  p: PedidoDoDia,
  agora = new Date()
) {
  const ctx = await contextoDoDiario(userId, agora);
  exigirPeriodo({ inicio: p.data, fim: p.data }, ctx);
  await withTransaction(async (c) => {
    await titular(userId, c);
    const [atual] = await queryRows<{ version: number }>(
      'SELECT version FROM personal_event_days WHERE user_id=? AND event_date=? FOR UPDATE',
      [userId, p.data],
      c
    );
    versao(atual?.version ?? 0, p.versao);
    for (const id of p.marcadores) await marcador(userId, id, c);
    await executeStatement(
      'INSERT INTO personal_event_days(user_id,event_date,note,confirmed) VALUES(?,?,?,TRUE) ON DUPLICATE KEY UPDATE note=?,confirmed=TRUE,version=version+1',
      [userId, p.data, p.nota, p.nota],
      c
    );
    await executeStatement(
      'DELETE FROM personal_event_day_markers WHERE user_id=? AND event_date=?',
      [userId, p.data],
      c
    );
    for (const id of p.marcadores)
      await executeStatement(
        'INSERT INTO personal_event_day_markers(user_id,event_date,marker_id) VALUES(?,?,?)',
        [userId, p.data, id],
        c
      );
  });
}
export async function excluirDia(
  userId: string,
  data: string,
  versaoPedida: number
) {
  await withTransaction(async (c) => {
    await titular(userId, c);
    const [d] = await queryRows<{ version: number }>(
      'SELECT version FROM personal_event_days WHERE user_id=? AND event_date=? FOR UPDATE',
      [userId, data],
      c
    );
    if (!d) throw new HttpError('Dia não encontrado.', 404);
    versao(d.version, versaoPedida);
    await executeStatement(
      'DELETE FROM personal_event_days WHERE user_id=? AND event_date=?',
      [userId, data],
      c
    );
  });
}
export async function compararAcontecimentos(
  userId: string,
  p: PedidoDaComparacao,
  agora = new Date()
) {
  const ctx = await contextoDoDiario(userId, agora);
  if (!ctx.comparacaoPermitida)
    throw new HttpError(
      'O histórico de métricas não está disponível no plano.',
      403
    );
  exigirPeriodo(p, ctx);
  return withTransaction(async (c) => {
    const [m] = await queryRows<{ name: string }>(
      'SELECT name FROM personal_event_markers WHERE id=? AND user_id=?',
      [p.marcadorId, userId],
      c
    );
    if (!m) throw new HttpError('Marcador não encontrado.', 404);
    const dias = await lerDias(userId, p.inicio, p.fim, c),
      coluna = p.metrica === 'sono' ? 'sleep_duration_minutes' : 'energy_level';
    const metricas = await queryRows<{
      id: string;
      date: string;
      valor: unknown;
      metrics_updated_at: string | null;
    }>(
      `SELECT id,date,${coluna} AS valor,metrics_updated_at FROM daily_metrics WHERE user_id=? AND date BETWEEN ? AND ? AND date<=?`,
      [
        userId,
        somarDias(p.inicio, p.deslocamento),
        somarDias(p.fim, p.deslocamento),
        ctx.hoje,
      ],
      c
    );
    const porDia = new Map(dias.map((d) => [d.data, d])),
      porMetrica = new Map(metricas.map((m) => [m.date, m])),
      pares: ParDeObservacao[] = [];
    for (let data = p.inicio; data <= p.fim; data = somarDias(data, 1)) {
      const d = porDia.get(data),
        dataMetrica = somarDias(data, p.deslocamento),
        medida = porMetrica.get(dataMetrica),
        valor = valorValido(p.metrica, medida?.valor),
        confirmado = d?.confirmado ?? false,
        presenca = confirmado ? d!.marcadores.includes(p.marcadorId) : null;
      pares.push({
        data,
        dataMetrica,
        confirmado,
        presenca,
        valor,
        metricaId: medida?.id ?? null,
        atualizadaEm: medida?.metrics_updated_at
          ? medida.metrics_updated_at.replace(' ', 'T') + 'Z'
          : null,
        outrosMarcadores:
          d?.marcadores.filter((id) => id !== p.marcadorId).length ?? 0,
        ausencia: !confirmado
          ? 'Dia sem revisão confirmada'
          : valor === null
            ? medida
              ? 'Valor ausente ou inválido'
              : 'Sem registro diário para esta data'
            : null,
      });
    }
    return analisarPares(p, m.name, pares, agora);
  });
}
