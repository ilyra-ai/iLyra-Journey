import { randomUUID } from 'node:crypto';
import type { PoolConnection } from 'mysql2/promise';
import { z } from 'zod';
import { HttpError } from '@/lib/http-error';
import { queryRows } from '@/lib/mysql/pool';
import {
  ACOES_DE_GESTAO,
  type HistoricoDeUsuario,
} from '@/types/gestao-usuarios';

/** O texto livre de notas, credenciais e dados clínicos nunca entra no evento. */
export async function registrarEventoDeUsuario(
  db: PoolConnection,
  evento: {
    userId: string;
    actorId: string;
    action: keyof typeof ACOES_DE_GESTAO;
    reason?: string;
    requestId?: string;
  }
) {
  await db.execute(
    'INSERT INTO admin_user_events (id, user_id, actor_id, action, reason, request_id) VALUES (?, ?, ?, ?, ?, ?)',
    [
      randomUUID(),
      evento.userId,
      evento.actorId,
      evento.action,
      evento.reason ?? null,
      evento.requestId ?? null,
    ]
  );
}

const cursorSchema = z
  .object({
    time: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/),
    key: z.string().regex(/^(gestao|assinaturas):[a-f0-9-]{36}$/i),
  })
  .strict();
interface EventoRow {
  event_key: string;
  action: string;
  reason: string | null;
  actor_email: string | null;
  created_at: string;
  source: 'gestao' | 'assinaturas';
}

export async function listarEventosDoUsuario(
  userId: string,
  cursor?: string
): Promise<HistoricoDeUsuario> {
  const usuario = await queryRows('SELECT id FROM users WHERE id = ?', [
    userId,
  ]);
  if (!usuario.length) throw new HttpError('Conta não encontrada.', 404);
  let inicio: z.infer<typeof cursorSchema> | null = null;
  if (cursor) {
    try {
      inicio = cursorSchema.parse(
        JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'))
      );
    } catch {
      throw new HttpError('Página do histórico inválida.', 400);
    }
  }
  const limitePorFonte = (fonte: 'gestao' | 'assinaturas') =>
    inicio
      ? `AND (created_at < ? OR (created_at = ? AND CONCAT('${fonte}:', id) < ?))`
      : '';
  const parametrosDaFonte = () => [
    userId,
    ...(inicio ? [inicio.time, inicio.time, inicio.key] : []),
  ];
  // Cada fonte lê no máximo 21 linhas antes da união, usando seus índices.
  const linhas = await queryRows<EventoRow>(
    `
    SELECT e.*, a.email AS actor_email FROM (
      (SELECT CONCAT('gestao:', id) AS event_key, action, reason, actor_id, created_at, 'gestao' AS source
       FROM admin_user_events WHERE user_id = ? ${limitePorFonte('gestao')}
       ORDER BY created_at DESC, id DESC LIMIT 21)
      UNION ALL
      (SELECT CONCAT('assinaturas:', id), event_type, JSON_UNQUOTE(JSON_EXTRACT(payload, '$.plan_key')), actor_user_id, created_at, 'assinaturas'
       FROM subscription_audit_events WHERE user_id = ? AND event_type = 'subscription_assigned' ${limitePorFonte('assinaturas')}
       ORDER BY created_at DESC, id DESC LIMIT 21)
    ) e LEFT JOIN users a ON a.id = e.actor_id
    ORDER BY e.created_at DESC, e.event_key DESC LIMIT 21
  `,
    [...parametrosDaFonte(), ...parametrosDaFonte()]
  );
  const pagina = linhas.slice(0, 20);
  const ultimo = pagina.at(-1);
  return {
    events: pagina.map((row) => ({
      key: row.event_key,
      action: row.action,
      label:
        ACOES_DE_GESTAO[row.action as keyof typeof ACOES_DE_GESTAO] ??
        'Operação administrativa registrada',
      reason: row.reason,
      actorEmail: row.actor_email,
      createdAt: row.created_at.replace(' ', 'T') + 'Z',
      source: row.source,
    })),
    nextCursor:
      linhas.length > 20 && ultimo
        ? Buffer.from(
            JSON.stringify({ time: ultimo.created_at, key: ultimo.event_key })
          ).toString('base64url')
        : null,
  };
}
