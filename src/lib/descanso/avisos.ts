import type { PeriodoDeDescanso } from './esquema';
import type { PoolConnection } from 'mysql2/promise';
import { executeStatement, queryRows, withTransaction } from '@/lib/mysql/pool';
import { dataLocal } from '@/lib/astrology/tempo';
import { politicaNoInstante, avisoAtravessouPausa } from './calendario';
import { periodosRelevantes } from './repositorio';
export type PoliticaDeAvisos = ReturnType<typeof politicaNoInstante>;
export async function travarConta(userId: string, c: PoolConnection) {
  await queryRows('SELECT id FROM users WHERE id=? FOR UPDATE', [userId], c);
}
export async function politicaDeAvisos(
  userId: string,
  agora = new Date(),
  c?: PoolConnection
) {
  return politicaNoInstante(await periodosRelevantes(userId, agora, c), agora);
}
const instante = (s: string) => new Date(s.replace(' ', 'T') + 'Z');
/** Descarta pendências da pausa; nunca altera configuração dos lembretes. */
export async function prepararAvisosDoDescanso(
  userId: string,
  agora: Date,
  c: PoolConnection
) {
  const periodos = await periodosRelevantes(userId, agora, c),
    politica = politicaNoInstante(periodos, agora);
  if (politica?.estado === 'ativa') {
    await executeStatement(
      "UPDATE reminder_occurrences SET state='dismissed',version=version+1 WHERE user_id=? AND state IN ('pending','delivered')",
      [userId],
      c
    );
  } else {
    const pendentes = await queryRows<{
      id: string;
      scheduled_at: string;
      next_delivery_at: string;
      activity: NonNullable<PeriodoDeDescanso['atividade']>;
    }>(
      "SELECT o.id,o.scheduled_at,o.next_delivery_at,r.activity FROM reminder_occurrences o JOIN personal_reminders r ON r.id=o.reminder_id AND r.user_id=o.user_id WHERE o.user_id=? AND o.state='pending'",
      [userId],
      c
    );
    for (const p of pendentes) {
      if (
        avisoAtravessouPausa(
          periodos,
          instante(p.scheduled_at),
          agora,
          p.activity
        ) ||
        avisoAtravessouPausa(
          periodos,
          instante(p.next_delivery_at),
          agora,
          p.activity
        )
      )
        await executeStatement(
          "UPDATE reminder_occurrences SET state='dismissed',version=version+1 WHERE id=? AND user_id=?",
          [p.id, userId],
          c
        );
    }
  }
  if (politica) {
    const avisos = await queryRows<{
      id: string;
      kind: string;
      created_at: string;
      activity: string | null;
    }>(
      "SELECT n.id,n.kind,n.created_at,r.activity FROM user_notifications n LEFT JOIN reminder_occurrences o ON o.notification_id=n.id AND o.user_id=n.user_id LEFT JOIN personal_reminders r ON r.id=o.reminder_id AND r.user_id=o.user_id WHERE n.user_id=? AND n.read_at IS NULL AND n.kind IN ('coach_dia','coach_alerta','lembrete_pessoal')",
      [userId],
      c
    );
    for (const n of avisos) {
      if (
        politica.estado === 'ativa' ||
        n.kind !== 'lembrete_pessoal' ||
        n.activity !== politica.atividade ||
        dataLocal(instante(n.created_at), politica.fuso) !==
          dataLocal(agora, politica.fuso)
      )
        await executeStatement(
          'UPDATE user_notifications SET read_at=? WHERE id=? AND user_id=?',
          [agora, n.id, userId],
          c
        );
    }
  }
  return politica;
}
export async function normalizarAvisosDoDescanso(
  userId: string,
  agora = new Date()
) {
  return withTransaction(async (c) => {
    await travarConta(userId, c);
    return prepararAvisosDoDescanso(userId, agora, c);
  });
}
export async function jaRecebeuNoRetorno(
  userId: string,
  politica: NonNullable<PoliticaDeAvisos>,
  agora: Date,
  c: PoolConnection
) {
  const rs = await queryRows<{ created_at: string }>(
    "SELECT created_at FROM user_notifications WHERE user_id=? AND kind='lembrete_pessoal' AND created_at BETWEEN ? - INTERVAL 2 DAY AND ?",
    [userId, agora, agora],
    c
  );
  return rs.some(
    (r) =>
      dataLocal(instante(r.created_at), politica.fuso) ===
      dataLocal(agora, politica.fuso)
  );
}
