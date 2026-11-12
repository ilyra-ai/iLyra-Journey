import { createHash } from 'node:crypto';
import { z } from 'zod';
import { executeStatement, queryRows, withTransaction } from '@/lib/mysql/pool';
import { lerMapaTropical } from '@/lib/lyra/leitura-tropical';
import { lerPerfilAstrologico } from './perfil-astrologico';
import {
  calcularBaseTropical,
  calcularSolPorData,
  montarMapaTropical,
  planetasTropicais,
  prepararNascimentoTropical,
} from './tropical';

const metodo = 'ocidental-tropical';
// Incrementar ao alterar as posições ou o formato da base persistida.
const versao = 1;
const longitude = z.number().finite().min(0).lt(360);
const esquemaBase = z.object({
  planetas: z.record(z.enum(planetasTropicais), longitude),
  ascendente: longitude.nullable(),
});

/** Consulta privada: serializa a leitura do perfil e a gravação da base natal. */
export async function tropicalDoTitular(
  userId: string,
  agora = new Date(),
  ocorrencia?: 'anterior' | 'posterior'
) {
  const mapa = await withTransaction(async (connection) => {
    await queryRows(
      'SELECT id FROM profiles WHERE id = ? FOR UPDATE',
      [userId],
      connection
    );
    const { nascimento } = await lerPerfilAstrologico(userId, connection);
    const { data, hora, local } = nascimento;
    if (!data || !hora || !local) {
      await executeStatement(
        'DELETE FROM astrological_natal_bases WHERE user_id=? AND method=?',
        [userId, metodo],
        connection
      );
      return data ? calcularSolPorData(data, agora) : null;
    }

    const entrada = prepararNascimentoTropical(
      {
        data,
        hora,
        ocorrencia,
        local: {
          nome: local.rotulo,
          latitude: local.latitude,
          longitude: local.longitude,
          fuso: local.fuso,
        },
      },
      agora
    );
    const assinatura = createHash('sha256')
      .update(JSON.stringify(entrada))
      .digest('hex');
    const [salva] = await queryRows<{
      engine_version: number;
      input_hash: string;
      payload: unknown;
    }>(
      'SELECT engine_version,input_hash,payload FROM astrological_natal_bases WHERE user_id=? AND method=?',
      [userId, metodo],
      connection
    );
    if (salva?.engine_version === versao && salva.input_hash === assinatura) {
      let payload = salva.payload;
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch {
          payload = null;
        }
      }
      const base = esquemaBase.safeParse(payload);
      if (base.success) return montarMapaTropical(entrada, base.data);
    }

    const base = esquemaBase.parse(calcularBaseTropical(entrada));
    await executeStatement(
      `INSERT INTO astrological_natal_bases (user_id,method,engine_version,input_hash,payload)
       VALUES (?,?,?,?,?) AS nova ON DUPLICATE KEY UPDATE
       engine_version=nova.engine_version,input_hash=nova.input_hash,payload=nova.payload,revision=revision+1`,
      [userId, metodo, versao, assinatura, JSON.stringify(base)],
      connection
    );
    return montarMapaTropical(entrada, base);
  });
  return {
    mapa,
    leitura: mapa ? lerMapaTropical(mapa) : null,
    faltando: mapa?.faltando ?? ['data'],
  };
}
