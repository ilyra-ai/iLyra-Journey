import { registrarEventoDeUsuario } from '@/lib/admin/eventos-usuarios';
import type { RowDataPacket } from 'mysql2/promise';
import { travarAdministracao } from '@/lib/auth/bloqueio';
import { HttpError } from '@/lib/http-error';
import { withTransaction } from '@/lib/mysql/pool';

export const MOTIVOS_ENCERRAMENTO = [
  'suspeita_de_acesso',
  'suporte',
  'solicitacao_do_titular',
] as const;
export type MotivoEncerramento = (typeof MOTIVOS_ENCERRAMENTO)[number];

export async function encerrarSessoes(
  actorId: string,
  userId: string,
  requestId: string,
  reason: MotivoEncerramento
) {
  return withTransaction(async (db) => {
    await travarAdministracao(db);
    const [atores] = await db.query<RowDataPacket[]>(
      `SELECT u.id FROM users u JOIN profiles p ON p.id = u.id WHERE u.id = ? AND u.blocked_at IS NULL AND p.role = 'admin' FOR UPDATE`,
      [actorId]
    );
    if (!atores.length)
      throw new HttpError('Acesso restrito a administradores ativos.', 403);
    const [alvos] = await db.query<RowDataPacket[]>(
      'SELECT id FROM users WHERE id = ? FOR UPDATE',
      [userId]
    );
    if (!alvos.length) throw new HttpError('Conta não encontrada.', 404);
    const [eventos] = await db.query<RowDataPacket[]>(
      'SELECT actor_id, action, reason FROM admin_user_events WHERE user_id = ? AND request_id = ?',
      [userId, requestId]
    );
    if (eventos.length) {
      const evento = eventos[0];
      if (
        evento.actor_id !== actorId ||
        evento.action !== 'sessions_revoked' ||
        evento.reason !== reason
      )
        throw new HttpError(
          'Esta solicitação já foi usada com outros dados.',
          409
        );
      return { revoked: true, repeated: true };
    }
    await db.execute(
      'UPDATE users SET session_version = session_version + 1 WHERE id = ?',
      [userId]
    );
    await registrarEventoDeUsuario(db, {
      userId,
      actorId,
      action: 'sessions_revoked',
      reason,
      requestId,
    });
    return { revoked: true, repeated: false };
  });
}
