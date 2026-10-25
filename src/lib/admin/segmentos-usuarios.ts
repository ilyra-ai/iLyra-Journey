import type { RowDataPacket } from 'mysql2/promise';
import { queryRows } from '@/lib/mysql/pool';
import { HttpError } from '@/lib/http-error';
import { comAdministradorAtivo } from './transacao';
import { registrarEventoDeUsuario } from './eventos-usuarios';
import {
  consultaUsuariosSchema,
  type ConsultaUsuarios,
  type SegmentoUsuarios,
} from './esquema-filtros';
interface SegmentoRow {
  id: string;
  name: string;
  query_json: unknown;
  version: number;
}
const dto = (s: SegmentoRow): SegmentoUsuarios => ({
  id: s.id,
  name: s.name,
  query: consultaUsuariosSchema.parse(
    typeof s.query_json === 'string' ? JSON.parse(s.query_json) : s.query_json
  ),
  version: s.version,
});
export async function listarSegmentos(owner: string) {
  return {
    segments: (
      await queryRows<SegmentoRow>(
        'SELECT id,name,query_json,version FROM admin_user_segments WHERE user_id=? ORDER BY name,id',
        [owner]
      )
    ).map(dto),
  };
}
export function salvarSegmento(
  owner: string,
  id: string,
  name: string,
  query: ConsultaUsuarios,
  version?: number
) {
  return comAdministradorAtivo(owner, async (db) => {
    const [rows] = await db.query<Array<RowDataPacket & SegmentoRow>>(
      'SELECT id,name,query_json,version FROM admin_user_segments WHERE user_id=? AND id=? FOR UPDATE',
      [owner, id]
    );
    const old = rows[0];
    if (query.filters.markerId) {
      const [markers] = await db.query<RowDataPacket[]>(
        'SELECT id FROM admin_user_markers WHERE id=? AND deleted_at IS NULL',
        [query.filters.markerId]
      );
      if (!markers.length)
        throw new HttpError(
          'O marcador foi removido. Revise os filtros antes de salvar.',
          409
        );
    }
    if (version !== undefined) {
      if (!old) throw new HttpError('Segmento não encontrado.', 404);
      if (old.version !== version)
        throw new HttpError(
          'O segmento foi alterado. Atualize a lista antes de salvar.',
          409
        );
      if (
        old.name !== name ||
        JSON.stringify(dto(old).query) !== JSON.stringify(query)
      ) {
        await db.execute(
          'UPDATE admin_user_segments SET name=?,query_json=?,version=version+1 WHERE id=? AND user_id=?',
          [name, JSON.stringify(query), id, owner]
        );
        await registrarEventoDeUsuario(db, {
          userId: owner,
          actorId: owner,
          action: 'segment_updated',
          reason: id,
        });
      }
      return { id, repeated: false };
    }
    if (old) {
      if (
        old.name !== name ||
        JSON.stringify(dto(old).query) !== JSON.stringify(query)
      )
        throw new HttpError(
          'Esta solicitação já foi usada com outros dados.',
          409
        );
      return { id, repeated: true };
    }
    const [eventos] = await db.query<RowDataPacket[]>(
      'SELECT id FROM admin_user_events WHERE user_id=? AND request_id=?',
      [owner, id]
    );
    if (eventos.length)
      throw new HttpError(
        'Esta solicitação já foi utilizada. Atualize a lista.',
        409
      );
    const [count] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS total FROM admin_user_segments WHERE user_id=?',
      [owner]
    );
    if (Number(count[0].total) >= 20)
      throw new HttpError(
        'Limite de 20 segmentos salvos. Exclua um antes de criar outro.',
        409
      );
    await db.execute(
      'INSERT INTO admin_user_segments (id,user_id,name,query_json) VALUES (?,?,?,?)',
      [id, owner, name, JSON.stringify(query)]
    );
    await registrarEventoDeUsuario(db, {
      userId: owner,
      actorId: owner,
      action: 'segment_created',
      reason: id,
      requestId: id,
    });
    return { id, repeated: false };
  });
}
export function excluirSegmento(owner: string, id: string, version: number) {
  return comAdministradorAtivo(owner, async (db) => {
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT version FROM admin_user_segments WHERE user_id=? AND id=? FOR UPDATE',
      [owner, id]
    );
    if (!rows.length) throw new HttpError('Segmento não encontrado.', 404);
    if (rows[0].version !== version)
      throw new HttpError('O segmento mudou. Atualize antes de excluir.', 409);
    await db.execute(
      'DELETE FROM admin_user_segments WHERE user_id=? AND id=?',
      [owner, id]
    );
    await registrarEventoDeUsuario(db, {
      userId: owner,
      actorId: owner,
      action: 'segment_deleted',
      reason: id,
    });
    return { deleted: true };
  });
}
