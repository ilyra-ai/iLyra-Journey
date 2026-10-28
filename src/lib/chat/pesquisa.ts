import { z } from 'zod';
import { HttpError } from '@/lib/http-error';
import { executeStatement, queryRows, withTransaction } from '@/lib/mysql/pool';
import { escaparBuscaLiteral, type PesquisaDoChat } from './pesquisa-esquema';
import type { PaginaDaPesquisa } from './tipos';

const cursorSchema = z
  .object({
    data: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d{1,3})?$/),
    id: z.uuid(),
    favoritos: z.boolean(),
    termo: z.string().max(160),
  })
  .strict();

export async function pesquisarNoChat(
  userId: string,
  p: PesquisaDoChat
): Promise<PaginaDaPesquisa> {
  let cursor: z.infer<typeof cursorSchema> | null = null;
  if (p.cursor) {
    try {
      cursor = cursorSchema.parse(
        JSON.parse(Buffer.from(p.cursor, 'base64url').toString('utf8'))
      );
    } catch {
      throw new HttpError('O marcador da busca não é válido.', 400);
    }
    if (cursor.favoritos !== p.favoritos || cursor.termo !== p.termo)
      throw new HttpError(
        'O marcador pertence a outra busca. Comece novamente.',
        400
      );
  }
  const colunaData = p.favoritos ? 'f.created_at' : 't.created_at';
  const filtros = ['t.user_id=?'];
  const valores: unknown[] = [userId];
  if (p.favoritos) filtros.push('f.turn_id IS NOT NULL');
  if (p.termo) {
    filtros.push(
      "(t.question LIKE ? ESCAPE '!' OR t.answer LIKE ? ESCAPE '!')"
    );
    valores.push(escaparBuscaLiteral(p.termo), escaparBuscaLiteral(p.termo));
  }
  if (cursor) {
    filtros.push(`(${colunaData}<? OR (${colunaData}=? AND t.id<?))`);
    valores.push(cursor.data, cursor.data, cursor.id);
  }
  const linhas = await queryRows<{
    id: string;
    conversation_id: string;
    title: string;
    question: string;
    answer: string | null;
    created_at: string;
    favorite_at: string | null;
    sort_date: string;
  }>(
    `SELECT t.id,t.conversation_id,c.title,t.created_at,f.created_at AS favorite_at,${colunaData} AS sort_date,
      SUBSTRING(t.question,GREATEST(1,LOCATE(?,t.question)-60),240) AS question,
      SUBSTRING(t.answer,GREATEST(1,LOCATE(?,t.answer)-60),320) AS answer
     FROM chat_turns t JOIN chat_conversations c ON c.id=t.conversation_id AND c.user_id=t.user_id
     LEFT JOIN chat_favorites f ON f.turn_id=t.id AND f.user_id=t.user_id
     WHERE ${filtros.join(' AND ')} ORDER BY ${colunaData} DESC,t.id DESC LIMIT 21`,
    [p.termo, p.termo, ...valores]
  );
  const pagina = linhas.slice(0, 20),
    ultima = pagina.at(-1);
  return {
    resultados: pagina.map((r) => ({
      turnoId: r.id,
      conversaId: r.conversation_id,
      titulo: r.title,
      pergunta: r.question,
      resposta: r.answer,
      criadaEm: r.created_at.replace(' ', 'T') + 'Z',
      favorita: r.favorite_at !== null,
      salvaEm: r.favorite_at ? r.favorite_at.replace(' ', 'T') + 'Z' : null,
    })),
    proximoCursor:
      linhas.length > 20 && ultima
        ? Buffer.from(
            JSON.stringify({
              data: ultima.sort_date,
              id: ultima.id,
              favoritos: p.favoritos,
              termo: p.termo,
            })
          ).toString('base64url')
        : null,
  };
}

export async function definirFavorita(
  userId: string,
  turnoId: string,
  favorita: boolean
) {
  await withTransaction(async (c) => {
    const [turno] = await queryRows<{ status: string; answer: string | null }>(
      'SELECT status,answer FROM chat_turns WHERE id=? AND user_id=? FOR UPDATE',
      [turnoId, userId],
      c
    );
    if (!turno) throw new HttpError('Mensagem não encontrada.', 404);
    if (favorita) {
      if (turno.status !== 'concluido' || !turno.answer?.trim())
        throw new HttpError(
          'Aguarde uma resposta concluída antes de salvar.',
          409
        );
      await executeStatement(
        'INSERT INTO chat_favorites(turn_id,user_id) VALUES(?,?) ON DUPLICATE KEY UPDATE turn_id=turn_id',
        [turnoId, userId],
        c
      );
    } else
      await executeStatement(
        'DELETE FROM chat_favorites WHERE turn_id=? AND user_id=?',
        [turnoId, userId],
        c
      );
  });
}
