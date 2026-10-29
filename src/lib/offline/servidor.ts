import { createHash } from 'node:crypto';
import type { PoolConnection } from 'mysql2/promise';
import type { AppSession } from '@/types/app-session';
import { HttpError } from '@/lib/http-error';
import { queryRows, executeStatement, withTransaction } from '@/lib/mysql/pool';
import {
  contaTemRecurso,
  requireFeatureEnabled,
  limiteDeMetricasDaConta,
} from '@/lib/plans/service';
import { corteDoHistorico } from '@/lib/plans/historico';
import { lerPerfilAstrologico } from '@/lib/astrology/perfil-astrologico';
import { dataLocal } from '@/lib/astrology/tempo';
import { somarDias } from '@/lib/acontecimentos/analise';
import {
  CAMPOS_DO_REGISTRO,
  NOMES_DOS_CAMPOS,
  dataDoRegistroValida,
} from '@/lib/metricas/registro-do-dia';
import {
  persistirRegistroDoDia,
  depoisDeGravarRegistro,
} from '@/lib/metricas/gravacao';
import { persistirReflexao, datasDaReflexao } from '@/lib/reflexao/servico';
import { registrarErroInterno } from '@/lib/observability/log-seguro';
import { emitirPermissaoOffline, exigirPermissaoOffline } from './permissao';
import type {
  BaseOffline,
  ContextoOffline,
  OperacaoOffline,
  ReciboOffline,
  TipoOffline,
} from './esquema';
const hash = (v: unknown) =>
  createHash('sha256').update(JSON.stringify(v)).digest('hex');
function pronto(s: AppSession) {
  if (!s.user.onboarding_completed)
    throw new HttpError(
      'Conclua seu cadastro antes de preparar ou enviar registros offline.',
      403
    );
}
export async function lerBaseOffline(
  userId: string,
  tipo: TipoOffline,
  data: string,
  c?: PoolConnection,
  travar = false
): Promise<BaseOffline> {
  const base = {
    tipo,
    data,
    registroId: null as string | null,
    valores: {} as BaseOffline['valores'],
    reflexao: null as BaseOffline['reflexao'],
  };
  if (tipo === 'registro') {
    const [r] = await queryRows<Record<string, unknown>>(
      `SELECT id,${NOMES_DOS_CAMPOS.map((k) => CAMPOS_DO_REGISTRO[k].coluna).join(',')} FROM daily_metrics WHERE user_id=? AND date=?${travar ? ' FOR UPDATE' : ''}`,
      [userId, data],
      c
    );
    base.registroId = r ? String(r.id) : null;
    base.valores = Object.fromEntries(
      NOMES_DOS_CAMPOS.map((k) => {
        const v = r?.[CAMPOS_DO_REGISTRO[k].coluna];
        return [k, v === null || v === undefined ? null : Number(v)];
      })
    );
  } else {
    const [r] = await queryRows<{
      id: string;
      emotional_score: number;
      body_score: number;
      spiritual_score: number;
      note: string | null;
    }>(
      `SELECT id,emotional_score,body_score,spiritual_score,note FROM daily_reflections WHERE user_id=? AND reflection_date=?${travar ? ' FOR UPDATE' : ''}`,
      [userId, data],
      c
    );
    base.registroId = r?.id ?? null;
    base.reflexao = r
      ? {
          emocional: Number(r.emotional_score),
          corpo: Number(r.body_score),
          espiritual: Number(r.spiritual_score),
          frase: r.note,
        }
      : null;
  }
  return { ...base, revisao: hash(base) };
}
export async function prepararContextoOffline(
  s: AppSession,
  agora = new Date(),
  selecao = { registro: true, reflexao: true }
): Promise<ContextoOffline> {
  pronto(s);
  const [perfil, registro, reflexao, limite, permitidas] = await Promise.all([
      lerPerfilAstrologico(s.user.id),
      selecao.registro
        ? contaTemRecurso(s.user.id, 'daily_checkin')
        : Promise.resolve(false),
      selecao.reflexao
        ? contaTemRecurso(s.user.id, 'evening_reflection')
        : Promise.resolve(false),
      limiteDeMetricasDaConta(s.user.id),
      datasDaReflexao(s.user.id, agora),
    ]),
    fuso = perfil.localDoDia?.fuso ?? 'UTC',
    hoje = dataLocal(agora, fuso),
    corte = corteDoHistorico(limite, agora);
  const bases: BaseOffline[] = [];
  for (let i = 7; i >= 0; i--) {
    const data = somarDias(hoje, -i);
    if (
      registro &&
      dataDoRegistroValida(data, agora) &&
      limite !== 0 &&
      (!corte || data >= corte)
    )
      bases.push(await lerBaseOffline(s.user.id, 'registro', data));
  }
  if (reflexao)
    for (const data of permitidas)
      bases.push(await lerBaseOffline(s.user.id, 'reflexao', data));
  const { token, expiraEm } = await emitirPermissaoOffline(s.user.id, agora);
  return {
    selecao,
    titular: s.user.id,
    nome: String(s.user.user_metadata?.first_name ?? 'Sua conta'),
    fuso,
    hoje,
    emitidoEm: agora.toISOString(),
    expiraEm,
    permissao: token,
    recursos: { registro, reflexao },
    bases,
  };
}
export class ConflitoOffline extends HttpError {
  constructor(public atual: BaseOffline) {
    super(
      'O registro mudou no servidor. Revise as duas versões antes de escolher o que manter.',
      409
    );
  }
}
interface LinhaDoRecibo {
  id: string;
  user_id: string;
  operation_kind: TipoOffline;
  record_date: string;
  request_hash: string;
  applied_revision: string | null;
  derived_processed: number;
  created_at: string;
}
export async function sincronizarOperacao(
  s: AppSession,
  token: string,
  op: OperacaoOffline,
  agora = new Date()
): Promise<ReciboOffline> {
  await exigirPermissaoOffline(token, s.user.id, agora);
  const requestHash = hash(op);
  // A confirmação de um recibo existente não reaplica dados nem exige o antigo intervalo de edição.
  const existente = await queryRows<LinhaDoRecibo>(
    'SELECT * FROM offline_operation_receipts WHERE id=?',
    [op.id]
  );
  if (!existente.length) {
    pronto(s);
    await requireFeatureEnabled(
      s,
      op.tipo === 'registro' ? 'daily_checkin' : 'evening_reflection'
    );
    if (op.tipo === 'registro') {
      if (!dataDoRegistroValida(op.conteudo.data, agora))
        throw new HttpError(
          'A data saiu da janela atual de edição do registro do dia. O rascunho continua no dispositivo.',
          400
        );
      const limite = await limiteDeMetricasDaConta(s.user.id),
        corte = corteDoHistorico(limite, agora);
      if (limite === 0 || (corte && op.conteudo.data < corte))
        throw new HttpError(
          'A data não está no histórico permitido pelo plano atual. O rascunho continua no dispositivo.',
          403
        );
    } else if (
      !(await datasDaReflexao(s.user.id, agora)).includes(op.conteudo.data)
    )
      throw new HttpError(
        'A reflexão saiu da janela atual de hoje ou ontem. O rascunho continua no dispositivo.',
        400
      );
  }
  const aplicar = async () =>
    withTransaction(async (c) => {
      const inserir = await executeStatement(
        'INSERT IGNORE INTO offline_operation_receipts(id,user_id,operation_kind,record_date,request_hash,applied_revision,created_at) VALUES(?,?,?,?,?,?,?)',
        [op.id, s.user.id, op.tipo, op.conteudo.data, requestHash, null, agora],
        c
      );
      if (!inserir.affectedRows) {
        const [r] = await queryRows<LinhaDoRecibo>(
          'SELECT * FROM offline_operation_receipts WHERE id=? FOR UPDATE',
          [op.id],
          c
        );
        if (!r || r.user_id !== s.user.id)
          throw new HttpError('Operação não encontrada para esta conta.', 404);
        if (r.request_hash !== requestHash)
          throw new HttpError(
            'O identificador já foi usado para outro conteúdo. A operação original não foi reaplicada.',
            409
          );
        return { row: r, repetida: true };
      }
      const atual = await lerBaseOffline(
        s.user.id,
        op.tipo,
        op.conteudo.data,
        c,
        true
      );
      if (atual.revisao !== op.base) throw new ConflitoOffline(atual);
      if (op.tipo === 'registro')
        await persistirRegistroDoDia(s.user.id, op.conteudo, c);
      else await persistirReflexao(s.user.id, op.conteudo.data, op.conteudo, c);
      const nova = await lerBaseOffline(
        s.user.id,
        op.tipo,
        op.conteudo.data,
        c
      );
      await executeStatement(
        'UPDATE offline_operation_receipts SET applied_revision=?,derived_processed=? WHERE id=? AND user_id=?',
        [nova.revisao, op.tipo === 'reflexao', op.id, s.user.id],
        c
      );
      const [row] = await queryRows<LinhaDoRecibo>(
        'SELECT * FROM offline_operation_receipts WHERE id=?',
        [op.id],
        c
      );
      return { row, repetida: false };
    });
  let tentativas = 0;
  let resultado: Awaited<ReturnType<typeof aplicar>>;
  while (true) {
    try {
      resultado = await aplicar();
      break;
    } catch (e) {
      if (
        e &&
        typeof e === 'object' &&
        'code' in e &&
        e.code === 'ER_LOCK_DEADLOCK' &&
        tentativas++ < 2
      )
        continue;
      throw e;
    }
  }
  if (!resultado.row.applied_revision)
    throw new HttpError(
      'A operação ainda não possui confirmação. Tente confirmar novamente.',
      503
    );
  let processado = Boolean(resultado.row.derived_processed);
  if (!processado) {
    try {
      await depoisDeGravarRegistro(s.user.id, op.conteudo.data);
      await executeStatement(
        'UPDATE offline_operation_receipts SET derived_processed=TRUE WHERE id=? AND user_id=?',
        [op.id, s.user.id]
      );
      processado = true;
    } catch (e) {
      registrarErroInterno(
        'offline: recálculos depois de confirmar registro',
        e
      );
    }
  }
  return {
    id: op.id,
    tipo: op.tipo,
    data: resultado.row.record_date,
    revisao: resultado.row.applied_revision,
    aplicadoEm: resultado.row.created_at.replace(' ', 'T') + 'Z',
    recalculos: processado ? 'concluidos' : 'pendentes',
    repetida: resultado.repetida,
  };
}
