import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { HttpError } from '@/lib/http-error';
import { withTransaction } from '@/lib/mysql/pool';

/** Bloqueio e exclusão compartilham a mesma trava antes de travar a conta. */
export async function travarAdministracao(db: PoolConnection) {
  await db.query('SELECT id FROM admin_access_lock WHERE id = 1 FOR UPDATE');
}

export async function definirBloqueio(
  actorId: string,
  userId: string,
  blocked: boolean
) {
  return withTransaction(async (db) => {
    await travarAdministracao(db);
    // Revalidar depois de obter a trava: outro administrador pode ter
    // bloqueado o autor enquanto esta requisição aguardava.
    const [admins] = await db.query<RowDataPacket[]>(
      `SELECT u.id FROM users u JOIN profiles p ON p.id = u.id
       WHERE p.role = 'admin' AND u.blocked_at IS NULL ORDER BY u.id FOR UPDATE`
    );
    if (!admins.some((admin) => admin.id === actorId)) {
      throw new HttpError('Acesso restrito a administradores ativos.', 403);
    }
    const [users] = await db.query<RowDataPacket[]>(
      `SELECT u.blocked_at, p.role FROM users u JOIN profiles p ON p.id = u.id WHERE u.id = ? FOR UPDATE`,
      [userId]
    );
    const user = users[0];
    if (!user) throw new HttpError('Conta não encontrada.', 404);
    if (blocked && actorId === userId) {
      throw new HttpError(
        'Você não pode bloquear a própria conta administrativa.',
        409
      );
    }
    if (
      blocked &&
      user.role === 'admin' &&
      !user.blocked_at &&
      admins.length <= 1
    ) {
      throw new HttpError('É necessário manter um administrador ativo.', 409);
    }
    // Repetir uma operação não revoga sessões novas nem troca a data original.
    if (Boolean(user.blocked_at) !== blocked) {
      await db.execute(
        `UPDATE users SET blocked_at = ${blocked ? 'UTC_TIMESTAMP()' : 'NULL'},
         session_version = session_version + ? WHERE id = ?`,
        [blocked ? 1 : 0, userId]
      );
    }
    return { blocked };
  });
}
