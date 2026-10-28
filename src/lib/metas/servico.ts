import { withTransaction } from '@/lib/mysql/pool';
import { travarConta } from '@/lib/descanso/avisos';
import { lerPerfilAstrologico } from '@/lib/astrology/perfil-astrologico';
import { dataLocal } from '@/lib/astrology/tempo';
import { recalcularSequencias } from '@/lib/kpi/streak-repository';

import { recalcularMetas } from './automaticas';

/**
 * Dia local da pessoa: no fuso da cidade onde mora (ou nasceu); sem cidade,
 * o dia UTC. É o mesmo "hoje" do coach diário.
 */
export async function hojeDaPessoa(userId: string, agora = new Date()) {
  const perfil = await lerPerfilAstrologico(userId);
  const fuso = perfil.localDoDia?.fuso ?? 'UTC';
  return dataLocal(agora, fuso);
}

/** Recalcula metas automáticas, prazos e sequências da pessoa. */
export async function atualizarMetasESequencias(
  userId: string,
  agora = new Date()
) {
  const hoje = await hojeDaPessoa(userId, agora);
  return withTransaction(async (c) => {
    await travarConta(userId, c);
    const metasAlteradas = await recalcularMetas(userId, hoje, agora, c);
    await recalcularSequencias(userId, hoje, c);
    return { hoje, metasAlteradas };
  });
}
