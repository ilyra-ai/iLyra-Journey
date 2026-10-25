import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { travarAdministracao } from '@/lib/auth/bloqueio';
import { HttpError } from '@/lib/http-error';
import { withTransaction } from '@/lib/mysql/pool';

/** Revalida a administração depois da espera pela trava compartilhada. */
export function comAdministradorAtivo<T>(
  actorId: string,
  executar: (db: PoolConnection) => Promise<T>
) {
  return withTransaction(async (db) => {
    await travarAdministracao(db);
    const [atores] = await db.query<RowDataPacket[]>(
      "SELECT u.id FROM users u JOIN profiles p ON p.id = u.id WHERE u.id = ? AND p.role = 'admin' AND u.blocked_at IS NULL FOR UPDATE",
      [actorId]
    );
    if (!atores.length)
      throw new HttpError('Acesso restrito a administradores ativos.', 403);
    return executar(db);
  });
}
