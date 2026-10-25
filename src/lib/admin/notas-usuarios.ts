import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { registrarEventoDeUsuario } from '@/lib/admin/eventos-usuarios';
import { comAdministradorAtivo } from '@/lib/admin/transacao';
import { LIMITE_NOTAS_POR_CONTA } from '@/lib/admin/esquema-notas';
import { HttpError } from '@/lib/http-error';
import { queryRows } from '@/lib/mysql/pool';
import type { NotaOperacional } from '@/types/gestao-usuarios';

interface NotaRow {
  id: string;
  body: string;
  version: number;
  author_email: string | null;
  editor_email: string | null;
  created_at: string;
  updated_at: string;
}
const selecao = `SELECT n.id, n.body, n.version, n.created_at, n.updated_at, a.email AS author_email, e.email AS editor_email FROM admin_user_notes n LEFT JOIN users a ON a.id = n.author_id LEFT JOIN users e ON e.id = n.editor_id`;
const dto = (n: NotaRow): NotaOperacional => ({
  id: n.id,
  body: n.body,
  version: n.version,
  authorEmail: n.author_email,
  editorEmail: n.editor_email,
  createdAt: n.created_at.replace(' ', 'T') + 'Z',
  updatedAt: n.updated_at.replace(' ', 'T') + 'Z',
});

export async function listarNotas(userId: string) {
  if (!(await queryRows('SELECT id FROM users WHERE id = ?', [userId])).length)
    throw new HttpError('Conta não encontrada.', 404);
  return {
    notes: (
      await queryRows<NotaRow>(
        `${selecao} WHERE n.user_id = ? ORDER BY n.created_at DESC, n.id DESC LIMIT 100`,
        [userId]
      )
    ).map(dto),
  };
}
function comConta<T>(
  actorId: string,
  userId: string,
  executar: (db: PoolConnection) => Promise<T>
) {
  return comAdministradorAtivo(actorId, async (db) => {
    const [alvos] = await db.query<RowDataPacket[]>(
      'SELECT id FROM users WHERE id = ? FOR UPDATE',
      [userId]
    );
    if (!alvos.length) throw new HttpError('Conta não encontrada.', 404);
    return executar(db);
  });
}
async function notaNoBanco(db: PoolConnection, userId: string, id: string) {
  const [rows] = await db.query<RowDataPacket[]>(
    `${selecao} WHERE n.user_id = ? AND n.id = ?`,
    [userId, id]
  );
  if (!rows[0])
    throw new HttpError('Nota não encontrada. Atualize a lista.', 404);
  return dto(rows[0] as RowDataPacket & NotaRow);
}
export function criarNota(
  actorId: string,
  userId: string,
  id: string,
  body: string
) {
  return comConta(actorId, userId, async (db) => {
    const [eventos] = await db.query<RowDataPacket[]>(
      'SELECT action, actor_id FROM admin_user_events WHERE user_id = ? AND request_id = ?',
      [userId, id]
    );
    if (eventos.length) {
      const [existentes] = await db.query<RowDataPacket[]>(
        'SELECT id, body FROM admin_user_notes WHERE user_id = ? AND id = ?',
        [userId, id]
      );
      if (
        eventos[0].action !== 'note_created' ||
        eventos[0].actor_id !== actorId ||
        existentes[0]?.body !== body
      )
        throw new HttpError(
          'Esta solicitação já foi usada. Atualize as notas antes de continuar.',
          409
        );
      return { note: await notaNoBanco(db, userId, id), repeated: true };
    }
    const [contagem] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS total FROM admin_user_notes WHERE user_id = ?',
      [userId]
    );
    if (Number(contagem[0].total) >= LIMITE_NOTAS_POR_CONTA)
      throw new HttpError(
        'Esta conta atingiu o limite de 100 notas. Revise as notas existentes antes de criar outra.',
        409
      );
    await db.execute(
      'INSERT INTO admin_user_notes (id, user_id, author_id, editor_id, body) VALUES (?, ?, ?, ?, ?)',
      [id, userId, actorId, actorId, body]
    );
    await registrarEventoDeUsuario(db, {
      userId,
      actorId,
      action: 'note_created',
      requestId: id,
    });
    return { note: await notaNoBanco(db, userId, id), repeated: false };
  });
}
export function atualizarNota(
  actorId: string,
  userId: string,
  id: string,
  body: string,
  version: number
) {
  return comConta(actorId, userId, async (db) => {
    const nota = await notaNoBanco(db, userId, id);
    if (nota.version !== version)
      throw new HttpError(
        'A nota foi alterada por outra operação. Atualize a lista antes de editar.',
        409
      );
    if (nota.body !== body) {
      await db.execute(
        'UPDATE admin_user_notes SET body = ?, editor_id = ?, version = version + 1 WHERE id = ? AND user_id = ?',
        [body, actorId, id, userId]
      );
      await registrarEventoDeUsuario(db, {
        userId,
        actorId,
        action: 'note_updated',
      });
    }
    return { note: await notaNoBanco(db, userId, id) };
  });
}
export function excluirNota(
  actorId: string,
  userId: string,
  id: string,
  version: number
) {
  return comConta(actorId, userId, async (db) => {
    const nota = await notaNoBanco(db, userId, id);
    if (nota.version !== version)
      throw new HttpError(
        'A nota mudou desde a leitura. Atualize a lista antes de excluir.',
        409
      );
    await db.execute(
      'DELETE FROM admin_user_notes WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    await registrarEventoDeUsuario(db, {
      userId,
      actorId,
      action: 'note_deleted',
    });
    return { deleted: true };
  });
}
