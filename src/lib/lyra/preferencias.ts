import { executeStatement, queryRows } from '@/lib/mysql/pool';

import {
  nomeDeTratamento,
  pedidoDeTratamento,
  type PreferenciaDeTratamento,
} from './tratamento';

/** A conta vem exclusivamente da sessão; nunca de um nome digitado no chat. */
export async function resolverTratamento(
  userId: string,
  pergunta: string,
  nomeDoPerfil: string | null | undefined,
  apelido?: string | null
) {
  const pedido = pedidoDeTratamento(pergunta);
  if (pedido) {
    await executeStatement(
      `INSERT INTO lyra_address_preferences (user_id, mode, preferred_name)
       VALUES (?, ?, ?) AS nova
       ON DUPLICATE KEY UPDATE mode = nova.mode, preferred_name = nova.preferred_name`,
      [userId, pedido.modo, pedido.nome]
    );
  }
  const [salva] = await queryRows<{
    mode: PreferenciaDeTratamento['modo'];
    preferred_name: string | null;
  }>(
    'SELECT mode, preferred_name FROM lyra_address_preferences WHERE user_id = ?',
    [userId]
  );
  const preferencia: PreferenciaDeTratamento | null = !salva
    ? null
    : salva.mode === 'personalizado' && salva.preferred_name
      ? { modo: 'personalizado', nome: salva.preferred_name }
      : {
          modo:
            salva.mode === 'carinhoso'
              ? 'carinhoso'
              : salva.mode === 'apelido'
                ? 'apelido'
                : 'perfil',
          nome: null,
        };
  const nome = nomeDeTratamento(preferencia, nomeDoPerfil, apelido);
  return {
    nome,
    carinhoso:
      !preferencia || preferencia.modo === 'carinhoso' || nome === 'xuxuzinho',
    confirmacao: pedido
      ? nome === 'você'
        ? 'Combinado. Vou deixar de usar apelidos carinhosos. Se quiser, me diga o nome ou a forma de tratamento que prefere.'
        : `Combinado, ${nome}. Vou respeitar essa forma de tratamento nas próximas conversas. Você pode mudá-la quando quiser.`
      : null,
  };
}
