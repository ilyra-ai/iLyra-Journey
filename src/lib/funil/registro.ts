import { executeStatement } from '@/lib/mysql/pool';

import { diaDoFunil, etapaValida, type EtapaDoFunil } from './etapas';

/**
 * Soma 1 na contagem anônima do dia (tarefa 170). Só o nome da etapa e um
 * detalhe da lista fechada chegam ao banco.
 */
export async function contarEtapa(
  etapa: EtapaDoFunil,
  detalhe = '',
  agora = new Date()
) {
  if (!etapaValida(etapa, detalhe))
    throw new Error(`Etapa do funil inválida: ${etapa}/${detalhe}`);
  await executeStatement(
    `INSERT INTO funil_contagens_diarias (dia, etapa, detalhe, total)
     VALUES (?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE total = total + 1`,
    [diaDoFunil(agora), etapa, detalhe]
  );
}

/**
 * Para as rotas do produto (login, cadastro, pagamento, descoberta): a
 * medição nunca derruba a etapa que está sendo medida. A falha vai para o
 * log, só com o nome da etapa e o motivo técnico, sem dado da pessoa.
 */
export async function contarEtapaSemBloquear(
  etapa: EtapaDoFunil,
  detalhe = ''
) {
  try {
    await contarEtapa(etapa, detalhe);
  } catch (erro) {
    console.warn(
      `[funil] não foi possível contar ${etapa}:`,
      erro instanceof Error ? erro.message : String(erro)
    );
  }
}
