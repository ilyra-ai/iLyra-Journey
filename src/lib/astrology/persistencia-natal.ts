import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { PoolConnection } from 'mysql2/promise';
import { executeStatement, queryRows, withTransaction } from '@/lib/mysql/pool';
import { HttpError } from '@/lib/http-error';
import { lerPerfilAstrologico, mapaDoPerfil } from './perfil-astrologico';
import { mapaNatalNaData, type MapaNatal } from './mapa-natal';
import { NOME_DO_GRAHA, REGENTE_DO_SIGNO, posicao } from './sideral';
import { senhorDoNakshatra } from './vimshottari';

// Incrementar ao alterar efemérides, ayanamsha, casas ou serialização da base.
const VERSAO = 1;
const METODO = 'sideral-lahiri';
const longitude = z.number().finite().min(0).lt(360);
const baseSchema = z
  .object({
    nascimentoUtc: z.iso.datetime(),
    horaConhecida: z.boolean(),
    lagna: longitude.nullable(),
    planetas: z
      .array(
        z.object({
          graha: z.enum([
            'sol',
            'lua',
            'marte',
            'mercurio',
            'jupiter',
            'venus',
            'saturno',
            'rahu',
            'ketu',
          ]),
          longitude,
          retrogrado: z.boolean(),
        })
      )
      .length(9)
      .refine((itens) => new Set(itens.map((item) => item.graha)).size === 9),
  })
  .refine((base) => base.horaConhecida === (base.lagna !== null));

function gravavel(mapa: MapaNatal): z.infer<typeof baseSchema> {
  return {
    nascimentoUtc: mapa.nascimentoUtc.toISOString(),
    horaConhecida: mapa.horaConhecida,
    lagna: mapa.lagna?.longitude ?? null,
    planetas: mapa.planetas.map(({ graha, longitude, retrogrado }) => ({
      graha,
      longitude,
      retrogrado,
    })),
  };
}

function restaurar(base: z.infer<typeof baseSchema>, agora: Date): MapaNatal {
  const lagnaPos = base.lagna === null ? null : posicao(base.lagna);
  const regente = lagnaPos ? REGENTE_DO_SIGNO[lagnaPos.signo] : null;
  const planetas = base.planetas.map((planeta) => {
    const pos = posicao(planeta.longitude);
    return {
      ...pos,
      ...planeta,
      nome: NOME_DO_GRAHA[planeta.graha],
      casa: lagnaPos ? ((pos.signo - lagnaPos.signo + 12) % 12) + 1 : null,
    };
  });
  const lua = planetas.find((planeta) => planeta.graha === 'lua')!;
  return mapaNatalNaData(
    {
      nascimentoUtc: new Date(base.nascimentoUtc),
      horaConhecida: base.horaConhecida,
      lagna:
        lagnaPos && regente
          ? { ...lagnaPos, regente, nomeDoRegente: NOME_DO_GRAHA[regente] }
          : null,
      planetas,
      lua,
      senhorDoNakshatraNatal: senhorDoNakshatra(lua.nakshatra),
      dasha: null,
    },
    agora
  );
}

/**
 * Somente para fluxos autenticados, após autorização do recurso pelo chamador.
 * Lê o perfil sob o mesmo bloqueio da base: acessos concorrentes não recalculam
 * e uma alteração simultânea de nascimento não grava um retrato obsoleto.
 * Não deve ser usado na experiência anônima.
 */
export async function carregarNatalDoTitular(
  userId: string,
  agora = new Date(),
  transacao?: PoolConnection
) {
  const carregar = async (connection: PoolConnection) => {
    const [titular] = await queryRows<{ id: string }>(
      'SELECT id FROM profiles WHERE id = ? FOR UPDATE',
      [userId],
      connection
    );
    if (!titular) throw new HttpError('Perfil não encontrado.', 404);
    const perfil = await lerPerfilAstrologico(userId, connection);
    const { data, local } = perfil.nascimento;
    if (!data || !local) {
      await executeStatement(
        'DELETE FROM astrological_natal_bases WHERE user_id=? AND method=?',
        [userId, METODO],
        connection
      );
      return { perfil, mapa: null, reutilizado: false };
    }
    const assinatura = createHash('sha256')
      .update(JSON.stringify(perfil.nascimento))
      .digest('hex');
    const [salva] = await queryRows<{
      engine_version: number;
      input_hash: string;
      payload: unknown;
    }>(
      'SELECT engine_version,input_hash,payload FROM astrological_natal_bases WHERE user_id=? AND method=?',
      [userId, METODO],
      connection
    );
    if (salva?.engine_version === VERSAO && salva.input_hash === assinatura) {
      let payload = salva.payload;
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch {
          payload = null;
        }
      }
      const conferida = baseSchema.safeParse(payload);
      if (conferida.success)
        return {
          perfil,
          mapa: restaurar(conferida.data, agora),
          reutilizado: true,
        };
    }
    const mapa = mapaDoPerfil(perfil, agora)!;
    const payload = baseSchema.parse(gravavel(mapa));
    await executeStatement(
      `INSERT INTO astrological_natal_bases (user_id,method,engine_version,input_hash,payload)
       VALUES (?,?,?,?,?) AS nova ON DUPLICATE KEY UPDATE
       engine_version=nova.engine_version,input_hash=nova.input_hash,payload=nova.payload,revision=revision+1`,
      [userId, METODO, VERSAO, assinatura, JSON.stringify(payload)],
      connection
    );
    return { perfil, mapa, reutilizado: false };
  };
  return transacao ? carregar(transacao) : withTransaction(carregar);
}
