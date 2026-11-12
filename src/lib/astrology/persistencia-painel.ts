import { createHash } from 'node:crypto';
import { executeStatement, queryRows, withTransaction } from '@/lib/mysql/pool';
import {
  montarPainelCelestial,
  type PainelCelestial,
} from './painel-celestial';
import { carregarNatalDoTitular } from './persistencia-natal';
import { mapaParaJson } from './serializacao';
import { dataLocal } from './tempo';

// Incrementar quando mudar a composição da leitura diária ou seu formato.
const versaoDoPainel = 1;

function hash(texto: string) {
  return createHash('sha256').update(texto).digest('hex');
}

/** O chamador deve autorizar o acesso ao painel antes de consultar o cache. */
export async function carregarPainelDoTitular(
  userId: string,
  agora = new Date()
): Promise<PainelCelestial> {
  return withTransaction(async (connection) => {
    const { perfil, mapa } = await carregarNatalDoTitular(
      userId,
      agora,
      connection
    );
    const local = perfil.localDoDia;
    if (!local) {
      await executeStatement(
        'DELETE FROM astrological_daily_panels WHERE user_id = ?',
        [userId],
        connection
      );
      return montarPainelCelestial(perfil, agora, mapa);
    }

    // O mapa inclui os períodos vigentes. A troca de Dasha dentro do
    // mesmo dia também invalida a leitura, mesmo com o nascimento intacto.
    const assinatura = hash(
      JSON.stringify([
        versaoDoPainel,
        dataLocal(agora, local.fuso),
        perfil,
        mapa ? mapaParaJson(mapa) : null,
      ])
    );
    const [salvo] = await queryRows<{
      payload: string;
      payload_hash: string;
    }>(
      'SELECT payload, payload_hash FROM astrological_daily_panels WHERE user_id = ? AND input_hash = ?',
      [userId, assinatura],
      connection
    );
    if (salvo && hash(salvo.payload) === salvo.payload_hash) {
      // A versão identifica o serializador e o hash valida seu texto integral.
      return JSON.parse(salvo.payload) as PainelCelestial;
    }

    const painel = montarPainelCelestial(perfil, agora, mapa);
    const payload = JSON.stringify(painel);
    await executeStatement(
      `INSERT INTO astrological_daily_panels (user_id, input_hash, payload, payload_hash)
       VALUES (?, ?, ?, ?) AS novo ON DUPLICATE KEY UPDATE
       input_hash = novo.input_hash, payload = novo.payload, payload_hash = novo.payload_hash`,
      [userId, assinatura, payload, hash(payload)],
      connection
    );
    return painel;
  });
}
