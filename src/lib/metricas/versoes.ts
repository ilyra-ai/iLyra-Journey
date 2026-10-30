import { randomUUID } from 'node:crypto';
import type { PoolConnection } from 'mysql2/promise';
import { HttpError } from '@/lib/http-error';
import { executeStatement, queryRows, withTransaction } from '@/lib/mysql/pool';
import {
  CAMPOS_DO_REGISTRO,
  dataDoRegistroValida,
  NOMES_DOS_CAMPOS,
  type CampoDoRegistro,
} from './registro-do-dia';

export type MudancasManuais = Partial<
  Record<CampoDoRegistro, { anterior: number | null; novo: number | null }>
>;
export interface VersaoDoRegistro {
  id: string;
  data: string;
  registradaEm: string;
  tipo: 'registro' | 'desfazer';
  mudancas: MudancasManuais;
  podeDesfazer: boolean;
}
interface LinhaDaVersao {
  id: string;
  metric_id: string;
  record_date: string;
  revision: number;
  change_kind: 'registro' | 'desfazer';
  changes: MudancasManuais;
  created_at: string;
}
export const COLUNAS_MANUAIS = NOMES_DOS_CAMPOS.map(
  (k) => CAMPOS_DO_REGISTRO[k].coluna
);
export type RegistroVersionado = {
  id: string;
  record_revision: number;
} & Record<string, number | string | null>;

export async function limparVersoesAntigas(userId: string, c?: PoolConnection) {
  await executeStatement(
    'DELETE FROM manual_metric_versions WHERE user_id=? AND created_at < UTC_TIMESTAMP(3) - INTERVAL 90 DAY',
    [userId],
    c
  );
}

export async function registrarVersaoManual(
  userId: string,
  linha: RegistroVersionado,
  data: string,
  mudancas: MudancasManuais,
  tipo: 'registro' | 'desfazer',
  c: PoolConnection
) {
  await executeStatement(
    'INSERT INTO manual_metric_versions(id,metric_id,user_id,record_date,revision,change_kind,changes) VALUES(?,?,?,?,?,?,?)',
    [
      randomUUID(),
      linha.id,
      userId,
      data,
      Number(linha.record_revision) + 1,
      tipo,
      JSON.stringify(mudancas),
    ],
    c
  );
}

export async function listarVersoes(
  userId: string,
  data: string,
  antes?: number
) {
  await limparVersoesAntigas(userId);
  const linhas = await queryRows<LinhaDaVersao & { atual: number }>(
    `SELECT v.*,m.record_revision AS atual FROM manual_metric_versions v
     JOIN daily_metrics m ON m.id=v.metric_id AND m.user_id=v.user_id
     WHERE v.user_id=? AND v.record_date=? AND v.created_at>=UTC_TIMESTAMP(3)-INTERVAL 90 DAY
     ${antes === undefined ? '' : 'AND v.revision < ?'}
     ORDER BY v.revision DESC LIMIT 21`,
    [userId, data, ...(antes === undefined ? [] : [antes])]
  );
  const pagina = linhas.slice(0, 20);
  return {
    versoes: pagina.map(
      (v) =>
        ({
          id: v.id,
          data: v.record_date,
          registradaEm: v.created_at.replace(' ', 'T') + 'Z',
          tipo: v.change_kind,
          mudancas: v.changes,
          podeDesfazer:
            dataDoRegistroValida(v.record_date) &&
            Number(v.revision) === Number(v.atual),
        }) satisfies VersaoDoRegistro
    ),
    proximo: linhas.length > 20 ? Number(pagina.at(-1)?.revision) : null,
  };
}

/** Desfaz somente a última revisão intacta, sob o mesmo bloqueio da gravação.
 * Não recria a linha do dia: o FK e a busca obrigatória impedem restaurar exclusões. */
export async function desfazerVersao(
  userId: string,
  id: string,
  data: string
): Promise<string> {
  return withTransaction(async (c) => {
    // Descobre o registro sem travar o histórico; todas as escritas travam primeiro
    // daily_metrics para manter uma ordem de bloqueios consistente com o offline.
    const [referencia] = await queryRows<LinhaDaVersao>(
      'SELECT * FROM manual_metric_versions WHERE id=? AND user_id=? AND created_at>=UTC_TIMESTAMP(3)-INTERVAL 90 DAY',
      [id, userId],
      c
    );
    if (!referencia || referencia.record_date !== data)
      throw new HttpError('Versão não encontrada para esta conta.', 404);
    const [linha] = await queryRows<RegistroVersionado>(
      `SELECT id,record_revision,${COLUNAS_MANUAIS.join(',')} FROM daily_metrics WHERE id=? AND user_id=? FOR UPDATE`,
      [referencia.metric_id, userId],
      c
    );
    const [versao] = await queryRows<LinhaDaVersao>(
      'SELECT * FROM manual_metric_versions WHERE id=? AND user_id=? AND created_at>=UTC_TIMESTAMP(3)-INTERVAL 90 DAY FOR UPDATE',
      [id, userId],
      c
    );
    if (!linha || !versao)
      throw new HttpError('O registro ou sua versão foi excluído.', 404);
    if (Number(linha.record_revision) !== Number(versao.revision))
      throw new HttpError(
        'O registro mudou depois desta versão. Atualize o histórico; nenhum dado foi sobrescrito.',
        409
      );
    const campos = NOMES_DOS_CAMPOS.filter(
      (k) => versao.changes[k] !== undefined
    );
    if (!campos.length)
      throw new HttpError(
        'Esta versão não contém alterações recuperáveis.',
        409
      );
    const inversas: MudancasManuais = {};
    for (const k of campos) {
      const m = versao.changes[k]!;
      const atual = linha[CAMPOS_DO_REGISTRO[k].coluna];
      if ((atual === null ? null : Number(atual)) !== m.novo)
        throw new HttpError(
          'O valor atual mudou. Atualize o histórico; nenhum dado foi sobrescrito.',
          409
        );
      inversas[k] = { anterior: m.novo, novo: m.anterior };
    }
    await executeStatement(
      `UPDATE daily_metrics SET ${campos.map((k) => `${CAMPOS_DO_REGISTRO[k].coluna}=?`).join(',')},record_revision=record_revision+1,metrics_updated_at=UTC_TIMESTAMP() WHERE id=? AND user_id=?`,
      [...campos.map((k) => inversas[k]!.novo), linha.id, userId],
      c
    );
    await registrarVersaoManual(
      userId,
      linha,
      versao.record_date,
      inversas,
      'desfazer',
      c
    );
    return versao.record_date;
  });
}
