import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { registrarEventoDeUsuario } from '@/lib/admin/eventos-usuarios';
import { comAdministradorAtivo } from '@/lib/admin/transacao';
import {
  LIMITE_CATALOGO_MARCADORES,
  LIMITE_MARCADORES_POR_CONTA,
} from '@/lib/admin/esquema-marcadores';
import { HttpError } from '@/lib/http-error';
import { queryRows } from '@/lib/mysql/pool';
import type { CorMarcador, MarcadorOperacional } from '@/types/gestao-usuarios';

interface MarcadorRow {
  id: string;
  name: string;
  color: CorMarcador;
  version: number;
  user_count: number;
  assigned: number;
}
const selecao = `SELECT m.id, m.name, m.color, m.version, (SELECT COUNT(*) FROM admin_user_marker_assignments c WHERE c.marker_id = m.id) AS user_count`;
const dto = (m: MarcadorRow): MarcadorOperacional => ({
  id: m.id,
  name: m.name,
  color: m.color,
  version: m.version,
  userCount: Number(m.user_count),
  assigned: Boolean(m.assigned),
});

export async function listarMarcadores(userId?: string) {
  if (
    userId &&
    !(await queryRows('SELECT id FROM users WHERE id = ?', [userId])).length
  )
    throw new HttpError('Conta não encontrada.', 404);
  const markers = await queryRows<MarcadorRow>(
    `${selecao}, ${userId ? 'EXISTS(SELECT 1 FROM admin_user_marker_assignments a WHERE a.user_id = ? AND a.marker_id = m.id)' : 'FALSE'} AS assigned FROM admin_user_markers m WHERE m.deleted_at IS NULL ORDER BY m.name, m.id LIMIT 50`,
    userId ? [userId] : []
  );
  return { markers: markers.map(dto) };
}
async function marcadorAtivo(db: PoolConnection, id: string) {
  const [rows] = await db.query<RowDataPacket[]>(
    'SELECT id, name, color, version, created_by, deleted_at FROM admin_user_markers WHERE id=? FOR UPDATE',
    [id]
  );
  const m = rows[0];
  if (!m || m.deleted_at)
    throw new HttpError('Marcador não encontrado. Atualize o catálogo.', 404);
  return m;
}
export function criarMarcador(
  actorId: string,
  id: string,
  name: string,
  color: CorMarcador
) {
  return comAdministradorAtivo(actorId, async (db) => {
    const [existentes] = await db.query<RowDataPacket[]>(
      'SELECT name,color,created_by,deleted_at FROM admin_user_markers WHERE id=? FOR UPDATE',
      [id]
    );
    if (existentes.length) {
      const m = existentes[0];
      if (
        m.deleted_at ||
        m.name !== name ||
        m.color !== color ||
        m.created_by !== actorId
      )
        throw new HttpError(
          'Este identificador já foi utilizado. Atualize o catálogo.',
          409
        );
      return { id, repeated: true };
    }
    const [contagem] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS total FROM admin_user_markers WHERE deleted_at IS NULL'
    );
    if (Number(contagem[0].total) >= LIMITE_CATALOGO_MARCADORES)
      throw new HttpError(
        'O catálogo atingiu o limite de 50 marcadores ativos.',
        409
      );
    await db.execute(
      'INSERT INTO admin_user_markers (id,name,color,created_by) VALUES (?,?,?,?)',
      [id, name, color, actorId]
    );
    await registrarEventoDeUsuario(db, {
      userId: actorId,
      actorId,
      action: 'marker_catalog_created',
      reason: id,
    });
    return { id, repeated: false };
  });
}
export function editarMarcador(
  actorId: string,
  id: string,
  name: string,
  color: CorMarcador,
  version: number
) {
  return comAdministradorAtivo(actorId, async (db) => {
    const m = await marcadorAtivo(db, id);
    if (m.version !== version)
      throw new HttpError(
        'O marcador foi alterado. Atualize o catálogo antes de editar.',
        409
      );
    if (m.name !== name || m.color !== color) {
      await db.execute(
        'UPDATE admin_user_markers SET name=?,color=?,version=version+1 WHERE id=?',
        [name, color, id]
      );
      await registrarEventoDeUsuario(db, {
        userId: actorId,
        actorId,
        action: 'marker_catalog_updated',
        reason: id,
      });
    }
    return { updated: true };
  });
}
export function excluirMarcador(
  actorId: string,
  id: string,
  version: number,
  expectedUsers: number
) {
  return comAdministradorAtivo(actorId, async (db) => {
    const m = await marcadorAtivo(db, id);
    if (m.version !== version)
      throw new HttpError(
        'O marcador foi alterado. Atualize o catálogo antes de excluir.',
        409
      );
    const [contas] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS total FROM admin_user_marker_assignments WHERE marker_id=?',
      [id]
    );
    const total = Number(contas[0].total);
    if (total !== expectedUsers)
      throw new HttpError(
        'O número de contas com este marcador mudou. Atualize o catálogo e confirme novamente.',
        409
      );
    // A trava compartilhada impede novas associações/exclusões de contas
    // durante a confirmação. Uma gravação em lote evita uma ida por pessoa.
    await db.execute(
      `INSERT INTO admin_user_events (id, user_id, actor_id, action, reason)
      SELECT UUID(), user_id, ?, 'marker_removed', ? FROM admin_user_marker_assignments WHERE marker_id=?`,
      [actorId, id, id]
    );
    await db.execute(
      'DELETE FROM admin_user_marker_assignments WHERE marker_id=?',
      [id]
    );
    // Reter somente a identidade impede ressuscitar um marcador excluído por
    // repetição de rede ou fazer um segmento antigo apontar a outra categoria.
    await db.execute(
      "UPDATE admin_user_markers SET deleted_at=UTC_TIMESTAMP(),name='',color='neutro',created_by=NULL,version=version+1 WHERE id=?",
      [id]
    );
    await registrarEventoDeUsuario(db, {
      userId: actorId,
      actorId,
      action: 'marker_catalog_deleted',
      reason: id,
    });
    return { deleted: true, affectedUsers: total };
  });
}
export function atribuirMarcador(
  actorId: string,
  userId: string,
  id: string,
  assigned: boolean
) {
  return comAdministradorAtivo(actorId, async (db) => {
    const [contas] = await db.query<RowDataPacket[]>(
      'SELECT id FROM users WHERE id=? FOR UPDATE',
      [userId]
    );
    if (!contas.length) throw new HttpError('Conta não encontrada.', 404);
    await marcadorAtivo(db, id);
    const [existentes] = await db.query<RowDataPacket[]>(
      'SELECT marker_id FROM admin_user_marker_assignments WHERE user_id=? AND marker_id=?',
      [userId, id]
    );
    if (Boolean(existentes.length) === assigned)
      return { assigned, repeated: true };
    if (assigned) {
      const [contagem] = await db.query<RowDataPacket[]>(
        'SELECT COUNT(*) AS total FROM admin_user_marker_assignments WHERE user_id=?',
        [userId]
      );
      if (Number(contagem[0].total) >= LIMITE_MARCADORES_POR_CONTA)
        throw new HttpError(
          'Esta conta atingiu o limite de 10 marcadores.',
          409
        );
      await db.execute(
        'INSERT INTO admin_user_marker_assignments (user_id,marker_id,assigned_by) VALUES (?,?,?)',
        [userId, id, actorId]
      );
    } else
      await db.execute(
        'DELETE FROM admin_user_marker_assignments WHERE user_id=? AND marker_id=?',
        [userId, id]
      );
    await registrarEventoDeUsuario(db, {
      userId,
      actorId,
      action: assigned ? 'marker_assigned' : 'marker_removed',
      reason: id,
    });
    return { assigned, repeated: false };
  });
}
