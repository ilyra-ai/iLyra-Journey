import { randomUUID } from 'node:crypto';
import type { PoolConnection } from 'mysql2/promise';

import { HttpError } from '@/lib/http-error';
import { executeStatement, queryRows, withTransaction } from '@/lib/mysql/pool';
import { contaTemRecurso } from '@/lib/plans/service';
import {
  ATIVIDADES,
  type AvisoDeLembrete,
  type CentralDeLembretes,
  type DadosDoLembrete,
  type Lembrete,
  type PreferenciasDeLembretes,
  type acaoSchema,
} from './esquema';
import { estaEmSilencio, ocorrenciaDeHoje } from './horarios';
import type { z } from 'zod';

interface PreferenciaDoBanco {
  timezone: string;
  timezone_since: string;
  quiet_enabled: number;
  quiet_start: string;
  quiet_end: string;
  version: number;
}
interface LembreteDoBanco {
  id: string;
  title: string;
  activity: DadosDoLembrete['atividade'];
  local_time: string;
  week_days: number[] | string;
  enabled: number;
  version: number;
  created_at: string;
  updated_at: string;
}

const sqlData = (data: Date) =>
  data.toISOString().slice(0, 19).replace('T', ' ');
const instante = (data: string) => new Date(`${data.replace(' ', 'T')}Z`);
const preferencias = (p: PreferenciaDoBanco): PreferenciasDeLembretes => ({
  fuso: p.timezone,
  silencioAtivo: Boolean(p.quiet_enabled),
  inicioSilencio: p.quiet_start,
  fimSilencio: p.quiet_end,
  versao: p.version,
});
const lembrete = (r: LembreteDoBanco): Lembrete => ({
  id: r.id,
  titulo: r.title,
  atividade: r.activity,
  hora: r.local_time,
  dias:
    typeof r.week_days === 'string'
      ? (JSON.parse(r.week_days) as number[])
      : r.week_days,
  ativo: Boolean(r.enabled),
  versao: r.version,
});

async function lerPreferencias(userId: string, connection?: PoolConnection) {
  await executeStatement(
    'INSERT INTO reminder_preferences (user_id) VALUES (?) ON DUPLICATE KEY UPDATE user_id=user_id',
    [userId],
    connection
  );
  const [p] = await queryRows<PreferenciaDoBanco>(
    `SELECT * FROM reminder_preferences WHERE user_id=?${connection ? ' FOR UPDATE' : ''}`,
    [userId],
    connection
  );
  return p;
}

export async function listarCentral(
  userId: string
): Promise<CentralDeLembretes> {
  const p = await lerPreferencias(userId);
  const linhas = await queryRows<LembreteDoBanco>(
    'SELECT * FROM personal_reminders WHERE user_id=? ORDER BY local_time,id',
    [userId]
  );
  const avisos = await queryRows<{
    id: string;
    title: string;
    activity: DadosDoLembrete['atividade'];
    next_delivery_at: string;
    state: 'pending' | 'delivered';
    version: number;
  }>(
    `SELECT o.id,r.title,r.activity,o.next_delivery_at,o.state,o.version
     FROM reminder_occurrences o JOIN personal_reminders r ON r.id=o.reminder_id
     WHERE o.user_id=? AND r.enabled=TRUE AND o.state IN ('pending','delivered')
       AND o.next_delivery_at >= UTC_TIMESTAMP() - INTERVAL 1 DAY
     ORDER BY o.next_delivery_at DESC,o.id LIMIT 100`,
    [userId]
  );
  return {
    preferencias: preferencias(p),
    lembretes: linhas.map(lembrete),
    avisos: avisos.map((a): AvisoDeLembrete => ({
      id: a.id,
      titulo: a.title,
      atividade: a.activity,
      previstoEm: instante(a.next_delivery_at).toISOString(),
      estado: a.state,
      versao: a.version,
    })),
  };
}

async function conferirAtividade(userId: string, dados: DadosDoLembrete) {
  if (
    dados.ativo &&
    !(await contaTemRecurso(userId, ATIVIDADES[dados.atividade].recurso))
  ) {
    throw new HttpError(
      'Seu plano não inclui a atividade escolhida. Você pode desativar ou excluir o lembrete.',
      403
    );
  }
}

export async function criarLembrete(
  userId: string,
  dados: DadosDoLembrete,
  agora = new Date()
) {
  await conferirAtividade(userId, dados);
  return withTransaction(async (c) => {
    await lerPreferencias(userId, c);
    const [total] = await queryRows<{ total: number }>(
      'SELECT COUNT(*) AS total FROM personal_reminders WHERE user_id=?',
      [userId],
      c
    );
    if (Number(total.total) >= 50)
      throw new HttpError(
        'Você pode manter até 50 lembretes. Exclua um antes de criar outro.',
        409
      );
    const id = randomUUID();
    await executeStatement(
      `INSERT INTO personal_reminders (id,user_id,title,activity,local_time,week_days,enabled,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        id,
        userId,
        dados.titulo,
        dados.atividade,
        dados.hora,
        JSON.stringify(dados.dias),
        dados.ativo,
        sqlData(agora),
        sqlData(agora),
      ],
      c
    );
    return id;
  });
}

async function encontrar(userId: string, id: string, c: PoolConnection) {
  const [r] = await queryRows<LembreteDoBanco>(
    'SELECT * FROM personal_reminders WHERE id=? AND user_id=? FOR UPDATE',
    [id, userId],
    c
  );
  if (!r) throw new HttpError('Lembrete não encontrado.', 404);
  return r;
}

export async function editarLembrete(
  userId: string,
  id: string,
  dados: DadosDoLembrete & { versao: number }
) {
  await conferirAtividade(userId, dados);
  await withTransaction(async (c) => {
    await lerPreferencias(userId, c);
    const r = await encontrar(userId, id, c);
    if (r.version !== dados.versao)
      throw new HttpError(
        'O lembrete foi alterado em outra aba. Atualize a lista antes de salvar.',
        409
      );
    await executeStatement(
      `UPDATE personal_reminders SET title=?,activity=?,local_time=?,week_days=?,enabled=?,version=version+1,updated_at=UTC_TIMESTAMP() WHERE id=? AND user_id=?`,
      [
        dados.titulo,
        dados.atividade,
        dados.hora,
        JSON.stringify(dados.dias),
        dados.ativo,
        id,
        userId,
      ],
      c
    );
    // Não repetir um aviso já preparado no mesmo dia após editar o horário.
    await executeStatement(
      "UPDATE reminder_occurrences SET state='dismissed',version=version+1 WHERE reminder_id=? AND user_id=? AND (state='pending' OR ?=FALSE)",
      [id, userId, dados.ativo],
      c
    );
    if (!dados.ativo)
      await executeStatement(
        'UPDATE user_notifications SET read_at=COALESCE(read_at,UTC_TIMESTAMP()) WHERE user_id=? AND dedupe_key LIKE ?',
        [userId, `lembrete:${id}:%`],
        c
      );
  });
}

export async function excluirLembrete(
  userId: string,
  id: string,
  versao: number
) {
  await withTransaction(async (c) => {
    await lerPreferencias(userId, c);
    const r = await encontrar(userId, id, c);
    if (r.version !== versao)
      throw new HttpError(
        'O lembrete mudou. Atualize a lista antes de excluir.',
        409
      );
    await executeStatement(
      'DELETE FROM user_notifications WHERE user_id=? AND dedupe_key LIKE ?',
      [userId, `lembrete:${id}:%`],
      c
    );
    await executeStatement(
      'DELETE FROM personal_reminders WHERE id=? AND user_id=?',
      [id, userId],
      c
    );
  });
}

export async function salvarPreferencias(
  userId: string,
  dados: PreferenciasDeLembretes
) {
  await withTransaction(async (c) => {
    const p = await lerPreferencias(userId, c);
    if (p.version !== dados.versao)
      throw new HttpError(
        'As preferências mudaram em outra aba. Atualize antes de salvar.',
        409
      );
    await executeStatement(
      `UPDATE reminder_preferences SET timezone_since=IF(?,UTC_TIMESTAMP(),timezone_since),timezone=?,
       quiet_enabled=?,quiet_start=?,quiet_end=?,version=version+1 WHERE user_id=?`,
      [
        p.timezone !== dados.fuso,
        dados.fuso,
        dados.silencioAtivo,
        dados.inicioSilencio,
        dados.fimSilencio,
        userId,
      ],
      c
    );
    if (p.timezone !== dados.fuso) {
      await executeStatement(
        "UPDATE reminder_occurrences SET state='dismissed',version=version+1 WHERE user_id=? AND state='pending'",
        [userId],
        c
      );
    }
  });
}

/** Relógio do servidor; o navegador não escolhe data, titular nem conteúdo. */
export async function processarLembretes(userId: string, agora = new Date()) {
  if (!(await contaTemRecurso(userId, 'personal_notifications'))) return 0;
  const atividades = await Promise.all(
    Object.entries(ATIVIDADES).map(
      async ([tipo, a]) =>
        [tipo, await contaTemRecurso(userId, a.recurso)] as const
    )
  );
  const permitidas = new Map(atividades);
  return withTransaction(async (c) => {
    const p = await lerPreferencias(userId, c);
    const config = preferencias(p);
    const linhas = await queryRows<LembreteDoBanco>(
      'SELECT * FROM personal_reminders WHERE user_id=? AND enabled=TRUE',
      [userId],
      c
    );
    for (const r of linhas) {
      if (!permitidas.get(r.activity)) continue;
      const aPartirDe = new Date(
        Math.max(
          instante(r.updated_at).getTime(),
          instante(p.timezone_since).getTime()
        )
      );
      const ocorrencia = ocorrenciaDeHoje(
        lembrete(r),
        config,
        agora,
        aPartirDe
      );
      if (!ocorrencia) continue;
      await executeStatement(
        `INSERT INTO reminder_occurrences (id,user_id,reminder_id,occurrence_date,scheduled_at,next_delivery_at)
         VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE id=id`,
        [
          randomUUID(),
          userId,
          r.id,
          ocorrencia.data,
          sqlData(ocorrencia.instante),
          sqlData(ocorrencia.instante),
        ],
        c
      );
    }
    await executeStatement(
      "UPDATE reminder_occurrences SET state='dismissed',version=version+1 WHERE user_id=? AND state='pending' AND next_delivery_at < ? - INTERVAL 1 DAY",
      [userId, sqlData(agora)],
      c
    );
    await executeStatement(
      'DELETE FROM reminder_occurrences WHERE user_id=? AND updated_at < ? - INTERVAL 90 DAY',
      [userId, sqlData(agora)],
      c
    );
    if (estaEmSilencio(agora, config)) return 0;
    const devidos = await queryRows<{
      id: string;
      reminder_id: string;
      version: number;
      title: string;
      activity: DadosDoLembrete['atividade'];
    }>(
      `SELECT o.id,o.reminder_id,o.version,r.title,r.activity FROM reminder_occurrences o
       JOIN personal_reminders r ON r.id=o.reminder_id
       WHERE o.user_id=? AND r.enabled=TRUE AND o.state='pending' AND o.next_delivery_at<=? FOR UPDATE`,
      [userId, sqlData(agora)],
      c
    );
    let emitidos = 0;
    for (const a of devidos) {
      if (!permitidas.get(a.activity)) continue;
      const id = randomUUID();
      await executeStatement(
        `INSERT INTO user_notifications (id,user_id,kind,title,body,link,dedupe_key,created_at)
         VALUES (?,?,'lembrete_pessoal',?,?,'/lembretes',?,?)`,
        [
          id,
          userId,
          a.title,
          `${ATIVIDADES[a.activity].nome}: abra seus lembretes para começar, adiar ou dispensar.`,
          `lembrete:${a.reminder_id}:${a.id}:${a.version}`,
          sqlData(agora),
        ],
        c
      );
      await executeStatement(
        "UPDATE reminder_occurrences SET state='delivered',notification_id=?,version=version+1 WHERE id=? AND user_id=?",
        [id, a.id, userId],
        c
      );
      emitidos++;
    }
    return emitidos;
  });
}

export async function agirSobreAviso(
  userId: string,
  id: string,
  acao: z.infer<typeof acaoSchema>,
  agora = new Date()
) {
  await withTransaction(async (c) => {
    await lerPreferencias(userId, c);
    const [a] = await queryRows<{
      version: number;
      state: string;
      notification_id: string | null;
    }>(
      'SELECT version,state,notification_id FROM reminder_occurrences WHERE id=? AND user_id=? FOR UPDATE',
      [id, userId],
      c
    );
    if (!a) throw new HttpError('Aviso não encontrado.', 404);
    if (a.version !== acao.versao || a.state !== 'delivered')
      throw new HttpError(
        'Este aviso mudou. Atualize antes de continuar.',
        409
      );
    if (a.notification_id)
      await executeStatement(
        'UPDATE user_notifications SET read_at=COALESCE(read_at,UTC_TIMESTAMP()) WHERE id=? AND user_id=?',
        [a.notification_id, userId],
        c
      );
    await executeStatement(
      'UPDATE reminder_occurrences SET state=?,next_delivery_at=?,version=version+1 WHERE id=? AND user_id=?',
      [
        acao.acao === 'adiar' ? 'pending' : 'dismissed',
        sqlData(
          new Date(
            agora.getTime() +
              (acao.acao === 'adiar' ? acao.minutos * 60_000 : 0)
          )
        ),
        id,
        userId,
      ],
      c
    );
  });
}
