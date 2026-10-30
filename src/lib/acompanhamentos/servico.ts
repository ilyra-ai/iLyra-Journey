import { randomUUID } from 'node:crypto';
import type { PoolConnection } from 'mysql2/promise';
import type { AppSession } from '@/types/app-session';
import { HttpError } from '@/lib/http-error';
import { executeStatement, queryRows, withTransaction } from '@/lib/mysql/pool';
import { dataLocal } from '@/lib/astrology/tempo';
import { contextoDoDiario } from '@/lib/acontecimentos/servico';
import { mediana, somarDias } from '@/lib/acontecimentos/analise';
import {
  LIMITE_DE_ACOMPANHAMENTOS,
  escalaNormalizada,
  inicioDaSemana,
  mesmaEscala,
  rotuloDoValor,
  type Acompanhamento,
  type CentralDeAcompanhamentos,
  type DadosDoAcompanhamento,
  type DadosDoRegistro,
  type DefinicaoDoAcompanhamento,
  type DetalheDoAcompanhamento,
  type EdicaoDoAcompanhamento,
  type Escala,
  type Frequencia,
  type RegistroDoAcompanhamento,
} from './esquema';

type LinhaDoAcompanhamento = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  position: number;
  archived_at: string | null;
  version: number;
  created_at: string;
};
type LinhaDaDefinicao = {
  id: string;
  tracker_id: string;
  sequence: number;
  frequency: Frequencia;
  scale_min: number;
  scale_max: number;
  labels: unknown;
  created_at: string;
};
type LinhaDoRegistro = {
  id: string;
  tracker_id: string;
  definition_id: string;
  entry_date: string;
  value: number;
  note: string;
  version: number;
  updated_at: string;
};

const iso = (s: string) => s.replace(' ', 'T') + 'Z';

function lerRotulos(v: unknown): Escala['rotulos'] {
  const bruto = typeof v === 'string' ? (JSON.parse(v) as unknown) : v;
  if (!Array.isArray(bruto)) return [];
  return bruto
    .filter(
      (r): r is { valor: number; rotulo: string } =>
        typeof r === 'object' &&
        r !== null &&
        Number.isInteger((r as { valor: unknown }).valor) &&
        typeof (r as { rotulo: unknown }).rotulo === 'string'
    )
    .map((r) => ({ valor: r.valor, rotulo: r.rotulo }));
}
/** Escala gravada em uma definição, sem conversão de valores. */
export function escalaDoBanco(r: {
  scale_min: number;
  scale_max: number;
  labels: unknown;
}): Escala {
  return {
    minimo: Number(r.scale_min) as 0 | 1,
    maximo: Number(r.scale_max),
    rotulos: lerRotulos(r.labels),
  };
}
function definicao(r: LinhaDaDefinicao): DefinicaoDoAcompanhamento {
  return {
    id: r.id,
    sequencia: Number(r.sequence),
    frequencia: r.frequency,
    escala: escalaDoBanco(r),
    criadaEm: iso(r.created_at),
  };
}
function periodoAtual(frequencia: Frequencia, hoje: string) {
  return frequencia === 'semanal' ? inicioDaSemana(hoje) : hoje;
}
function conferirVersao(atual: number, recebida: number, oQue: string) {
  if (Number(atual) !== recebida)
    throw new HttpError(
      `${oQue} mudou em outra página. Atualize antes de tentar novamente.`,
      409
    );
}
async function travarTitular(userId: string, c: PoolConnection) {
  const [r] = await queryRows(
    'SELECT id FROM users WHERE id=? FOR UPDATE',
    [userId],
    c
  );
  if (!r) throw new HttpError('Conta não encontrada.', 404);
}
async function encontrar(
  userId: string,
  id: string,
  c: PoolConnection,
  travar = false
) {
  const [r] = await queryRows<LinhaDoAcompanhamento>(
    `SELECT * FROM personal_trackers WHERE id=? AND user_id=?${travar ? ' FOR UPDATE' : ''}`,
    [id, userId],
    c
  );
  if (!r) throw new HttpError('Acompanhamento não encontrado.', 404);
  return r;
}
async function definicoesDe(userId: string, ids: string[], c?: PoolConnection) {
  if (!ids.length) return new Map<string, DefinicaoDoAcompanhamento[]>();
  const rs = await queryRows<LinhaDaDefinicao>(
    `SELECT * FROM personal_tracker_definitions WHERE user_id=? AND tracker_id IN (${ids.map(() => '?').join(',')}) ORDER BY tracker_id,sequence`,
    [userId, ...ids],
    c
  );
  const mapa = new Map<string, DefinicaoDoAcompanhamento[]>();
  for (const r of rs)
    mapa.set(r.tracker_id, [...(mapa.get(r.tracker_id) ?? []), definicao(r)]);
  return mapa;
}
function montar(
  r: LinhaDoAcompanhamento,
  defs: DefinicaoDoAcompanhamento[],
  hoje: string,
  extra: {
    registros: number;
    ultimo: LinhaDoRegistro | null;
    respondido: boolean;
  }
): Acompanhamento {
  const atual = defs.at(-1);
  if (!atual)
    throw new Error(`Acompanhamento ${r.id} sem definição de escala.`);
  const defDoUltimo = extra.ultimo
    ? (defs.find((d) => d.id === extra.ultimo!.definition_id) ?? atual)
    : null;
  return {
    id: r.id,
    nome: r.name,
    descricao: r.description,
    posicao: Number(r.position),
    arquivado: r.archived_at !== null,
    arquivadoEm: r.archived_at ? iso(r.archived_at) : null,
    versao: Number(r.version),
    criadoEm: iso(r.created_at),
    definicao: atual,
    registros: extra.registros,
    ultimoRegistro:
      extra.ultimo && defDoUltimo
        ? {
            data: extra.ultimo.entry_date,
            valor: Number(extra.ultimo.value),
            rotulo: rotuloDoValor(
              defDoUltimo.escala,
              Number(extra.ultimo.value)
            ),
          }
        : null,
    periodoAtual: periodoAtual(atual.frequencia, hoje),
    respondidoNoPeriodoAtual: extra.respondido,
  };
}

export async function listarAcompanhamentos(
  s: AppSession,
  agora = new Date()
): Promise<CentralDeAcompanhamentos> {
  const ctx = await contextoDoDiario(s.user.id, agora);
  return withTransaction(async (c) => {
    const linhas = await queryRows<LinhaDoAcompanhamento>(
        'SELECT * FROM personal_trackers WHERE user_id=? ORDER BY archived_at IS NOT NULL,position,created_at,id',
        [s.user.id],
        c
      ),
      ids = linhas.map((l) => l.id),
      defs = await definicoesDe(s.user.id, ids, c);
    // Contagens e último registro respeitam o histórico vigente do plano.
    const contagens = ids.length
      ? await queryRows<{ tracker_id: string; total: number }>(
          `SELECT tracker_id,COUNT(*) total FROM personal_tracker_entries WHERE user_id=?${ctx.corte ? ' AND entry_date>=?' : ''} GROUP BY tracker_id`,
          ctx.corte ? [s.user.id, ctx.corte] : [s.user.id],
          c
        )
      : [];
    const ultimos = ids.length
      ? await queryRows<LinhaDoRegistro>(
          `SELECT e.* FROM personal_tracker_entries e JOIN (SELECT tracker_id,MAX(entry_date) d FROM personal_tracker_entries WHERE user_id=?${ctx.corte ? ' AND entry_date>=?' : ''} GROUP BY tracker_id) m ON m.tracker_id=e.tracker_id AND m.d=e.entry_date WHERE e.user_id=?`,
          ctx.corte
            ? [s.user.id, ctx.corte, s.user.id]
            : [s.user.id, s.user.id],
          c
        )
      : [];
    const total = new Map(
        contagens.map((x) => [x.tracker_id, Number(x.total)])
      ),
      ultimo = new Map(ultimos.map((x) => [x.tracker_id, x]));
    return {
      hoje: ctx.hoje,
      corte: ctx.corte,
      fuso: ctx.fuso,
      acompanhamentos: linhas.map((l) => {
        const ds = defs.get(l.id) ?? [],
          u = ultimo.get(l.id) ?? null,
          atual = ds.at(-1);
        return montar(l, ds, ctx.hoje, {
          registros: total.get(l.id) ?? 0,
          ultimo: u,
          respondido: Boolean(
            atual &&
            u &&
            u.entry_date === periodoAtual(atual.frequencia, ctx.hoje)
          ),
        });
      }),
    };
  });
}

async function inserirDefinicao(
  c: PoolConnection,
  userId: string,
  trackerId: string,
  sequencia: number,
  frequencia: Frequencia,
  escala: Escala,
  agora: Date
) {
  const e = escalaNormalizada(escala);
  await executeStatement(
    'INSERT INTO personal_tracker_definitions(id,tracker_id,user_id,sequence,frequency,scale_min,scale_max,labels,created_at) VALUES(?,?,?,?,?,?,?,?,?)',
    [
      randomUUID(),
      trackerId,
      userId,
      sequencia,
      frequencia,
      e.minimo,
      e.maximo,
      JSON.stringify(e.rotulos),
      agora,
    ],
    c
  );
}

export async function criarAcompanhamento(
  s: AppSession,
  p: DadosDoAcompanhamento,
  agora = new Date()
) {
  return withTransaction(async (c) => {
    await travarTitular(s.user.id, c);
    const [existente] = await queryRows<LinhaDoAcompanhamento>(
      'SELECT * FROM personal_trackers WHERE id=? FOR UPDATE',
      [p.pedidoId],
      c
    );
    if (existente) {
      if (existente.user_id !== s.user.id)
        throw new HttpError('Acompanhamento não encontrado.', 404);
      const [d] = (await definicoesDe(s.user.id, [existente.id], c)).get(
        existente.id
      ) ?? [undefined];
      if (
        existente.name !== p.nome ||
        existente.description !== p.descricao ||
        !d ||
        d.frequencia !== p.frequencia ||
        !mesmaEscala(d.escala, p.escala)
      )
        throw new HttpError(
          'Este pedido já foi usado para outro acompanhamento.',
          409
        );
      return { id: existente.id, criado: false };
    }
    const [n] = await queryRows<{ total: number; posicao: number | null }>(
      'SELECT COUNT(*) total,MAX(position) posicao FROM personal_trackers WHERE user_id=?',
      [s.user.id],
      c
    );
    if (Number(n.total) >= LIMITE_DE_ACOMPANHAMENTOS)
      throw new HttpError(
        `Você já tem ${LIMITE_DE_ACOMPANHAMENTOS} acompanhamentos. Exclua um para criar outro.`,
        409
      );
    await executeStatement(
      'INSERT INTO personal_trackers(id,user_id,name,description,position,created_at,updated_at) VALUES(?,?,?,?,?,?,?)',
      [
        p.pedidoId,
        s.user.id,
        p.nome,
        p.descricao,
        Number(n.posicao ?? 0) + 1,
        agora,
        agora,
      ],
      c
    );
    await inserirDefinicao(
      c,
      s.user.id,
      p.pedidoId,
      1,
      p.frequencia,
      p.escala,
      agora
    );
    return { id: p.pedidoId, criado: true };
  });
}

/**
 * Nome e descrição mudam no próprio acompanhamento. Uma escala ou frequência
 * diferente cria nova definição: respostas antigas continuam ligadas à
 * definição com que foram dadas, sem conversão de valores.
 */
export async function editarAcompanhamento(
  userId: string,
  id: string,
  p: EdicaoDoAcompanhamento,
  agora = new Date()
) {
  return withTransaction(async (c) => {
    await travarTitular(userId, c);
    const r = await encontrar(userId, id, c, true);
    conferirVersao(r.version, p.versao, 'O acompanhamento');
    const atual = (await definicoesDe(userId, [id], c)).get(id)?.at(-1);
    if (!atual) throw new Error(`Acompanhamento ${id} sem definição.`);
    const novaDefinicao =
      atual.frequencia !== p.frequencia || !mesmaEscala(atual.escala, p.escala);
    if (!novaDefinicao && r.name === p.nome && r.description === p.descricao)
      return { novaDefinicao: false, versao: Number(r.version) };
    if (novaDefinicao)
      await inserirDefinicao(
        c,
        userId,
        id,
        atual.sequencia + 1,
        p.frequencia,
        p.escala,
        agora
      );
    await executeStatement(
      'UPDATE personal_trackers SET name=?,description=?,version=version+1,updated_at=? WHERE id=? AND user_id=?',
      [p.nome, p.descricao, agora, id, userId],
      c
    );
    return { novaDefinicao, versao: Number(r.version) + 1 };
  });
}

export async function agirNoAcompanhamento(
  userId: string,
  id: string,
  acao: 'arquivar' | 'restaurar',
  versao: number,
  agora = new Date()
) {
  await withTransaction(async (c) => {
    await travarTitular(userId, c);
    const r = await encontrar(userId, id, c, true);
    conferirVersao(r.version, versao, 'O acompanhamento');
    if (acao === 'arquivar') {
      if (r.archived_at)
        throw new HttpError('O acompanhamento já está arquivado.', 409);
      await executeStatement(
        'UPDATE personal_trackers SET archived_at=?,version=version+1,updated_at=? WHERE id=? AND user_id=?',
        [agora, agora, id, userId],
        c
      );
      return;
    }
    if (!r.archived_at)
      throw new HttpError('O acompanhamento já está ativo.', 409);
    // Ao restaurar, volta ao fim da lista ativa sem reordenar os demais.
    const [m] = await queryRows<{ posicao: number | null }>(
      'SELECT MAX(position) posicao FROM personal_trackers WHERE user_id=? AND archived_at IS NULL',
      [userId],
      c
    );
    await executeStatement(
      'UPDATE personal_trackers SET archived_at=NULL,position=?,version=version+1,updated_at=? WHERE id=? AND user_id=?',
      [Number(m.posicao ?? 0) + 1, agora, id, userId],
      c
    );
  });
}

/** Recebe a ordem completa dos acompanhamentos ativos do titular. */
export async function reordenarAcompanhamentos(
  userId: string,
  ids: string[],
  agora = new Date()
) {
  await withTransaction(async (c) => {
    await travarTitular(userId, c);
    const ativos = await queryRows<{ id: string }>(
      'SELECT id FROM personal_trackers WHERE user_id=? AND archived_at IS NULL FOR UPDATE',
      [userId],
      c
    );
    const conjunto = new Set(ativos.map((a) => a.id));
    if (ids.length !== conjunto.size || ids.some((x) => !conjunto.has(x)))
      throw new HttpError(
        'A lista mudou em outra página. Atualize antes de reorganizar.',
        409
      );
    for (const [i, x] of ids.entries())
      await executeStatement(
        'UPDATE personal_trackers SET position=?,updated_at=? WHERE id=? AND user_id=?',
        [i + 1, agora, x, userId],
        c
      );
  });
}

export async function excluirAcompanhamento(
  userId: string,
  id: string,
  versao: number
) {
  await withTransaction(async (c) => {
    await travarTitular(userId, c);
    conferirVersao(
      (await encontrar(userId, id, c, true)).version,
      versao,
      'O acompanhamento'
    );
    await executeStatement(
      'DELETE FROM personal_trackers WHERE id=? AND user_id=?',
      [id, userId],
      c
    );
  });
}

export async function salvarRegistro(
  userId: string,
  id: string,
  p: DadosDoRegistro,
  agora = new Date()
) {
  const ctx = await contextoDoDiario(userId, agora);
  return withTransaction(async (c) => {
    await travarTitular(userId, c);
    const r = await encontrar(userId, id, c, true);
    if (r.archived_at)
      throw new HttpError(
        'Restaure o acompanhamento para registrar novas respostas.',
        409
      );
    const atual = (await definicoesDe(userId, [id], c)).get(id)?.at(-1);
    if (!atual) throw new Error(`Acompanhamento ${id} sem definição.`);
    if (p.data > ctx.hoje)
      throw new HttpError('Escolha uma data até o dia local de hoje.', 400);
    if (ctx.corte && p.data < ctx.corte)
      throw new HttpError(
        'Este dia está fora do histórico disponível no seu plano.',
        403
      );
    if (atual.frequencia === 'semanal' && inicioDaSemana(p.data) !== p.data)
      throw new HttpError(
        'Acompanhamentos semanais usam a segunda-feira de cada semana.',
        400
      );
    if (p.valor < atual.escala.minimo || p.valor > atual.escala.maximo)
      throw new HttpError(
        `Escolha um ponto entre ${atual.escala.minimo} e ${atual.escala.maximo}.`,
        400
      );
    const [existente] = await queryRows<LinhaDoRegistro>(
      'SELECT * FROM personal_tracker_entries WHERE tracker_id=? AND user_id=? AND entry_date=? FOR UPDATE',
      [id, userId, p.data],
      c
    );
    if (existente && existente.id !== p.idRegistro)
      throw new HttpError(
        'A resposta deste período mudou. Atualize antes de salvar.',
        409
      );
    if (
      existente &&
      existente.definition_id === atual.id &&
      Number(existente.value) === p.valor &&
      existente.note === p.nota
    )
      return { salvo: false, versao: Number(existente.version) };
    conferirVersao(existente?.version ?? 0, p.versao, 'A resposta');
    if (existente) {
      await executeStatement(
        'UPDATE personal_tracker_entries SET definition_id=?,value=?,note=?,version=version+1,updated_at=? WHERE id=? AND user_id=?',
        [atual.id, p.valor, p.nota, agora, p.idRegistro, userId],
        c
      );
      return { salvo: true, versao: Number(existente.version) + 1 };
    }
    const [usado] = await queryRows(
      'SELECT id FROM personal_tracker_entries WHERE id=?',
      [p.idRegistro],
      c
    );
    if (usado)
      throw new HttpError('Use um novo identificador para esta resposta.', 409);
    await executeStatement(
      'INSERT INTO personal_tracker_entries(id,tracker_id,user_id,definition_id,entry_date,value,note,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)',
      [
        p.idRegistro,
        id,
        userId,
        atual.id,
        p.data,
        p.valor,
        p.nota,
        agora,
        agora,
      ],
      c
    );
    return { salvo: true, versao: 1 };
  });
}

export async function excluirRegistro(
  userId: string,
  id: string,
  data: string,
  idRegistro: string,
  versao: number,
  agora = new Date()
) {
  const ctx = await contextoDoDiario(userId, agora);
  await withTransaction(async (c) => {
    await travarTitular(userId, c);
    await encontrar(userId, id, c, true);
    if (ctx.corte && data < ctx.corte)
      throw new HttpError(
        'Este dia está fora do histórico disponível no seu plano.',
        403
      );
    const [r] = await queryRows<LinhaDoRegistro>(
      'SELECT * FROM personal_tracker_entries WHERE tracker_id=? AND user_id=? AND entry_date=? FOR UPDATE',
      [id, userId, data],
      c
    );
    if (!r) throw new HttpError('Resposta não encontrada.', 404);
    if (r.id !== idRegistro)
      throw new HttpError(
        'A resposta deste período mudou. Atualize antes de excluir.',
        409
      );
    conferirVersao(r.version, versao, 'A resposta');
    await executeStatement(
      'DELETE FROM personal_tracker_entries WHERE id=? AND user_id=?',
      [idRegistro, userId],
      c
    );
  });
}

function janelaPadrao(frequencia: Frequencia, hoje: string) {
  return frequencia === 'semanal'
    ? { inicio: somarDias(inicioDaSemana(hoje), -7 * 11), fim: hoje }
    : { inicio: somarDias(hoje, -29), fim: hoje };
}

export async function lerAcompanhamento(
  userId: string,
  id: string,
  periodo: { inicio: string; fim: string } | null,
  agora = new Date()
): Promise<DetalheDoAcompanhamento> {
  const ctx = await contextoDoDiario(userId, agora);
  return withTransaction(async (c) => {
    const r = await encontrar(userId, id, c),
      defs = (await definicoesDe(userId, [id], c)).get(id) ?? [],
      atual = defs.at(-1);
    if (!atual) throw new Error(`Acompanhamento ${id} sem definição.`);
    let { inicio, fim } = periodo ?? janelaPadrao(atual.frequencia, ctx.hoje);
    if (periodo) {
      if (fim > ctx.hoje)
        throw new HttpError('Escolha datas até o dia local de hoje.', 400);
      if (ctx.corte && inicio < ctx.corte)
        throw new HttpError(
          'Este período está fora do histórico disponível no plano.',
          403
        );
    } else if (ctx.corte && inicio < ctx.corte) inicio = ctx.corte;
    if (fim < inicio) fim = inicio;
    const linhas = await queryRows<LinhaDoRegistro>(
        'SELECT * FROM personal_tracker_entries WHERE tracker_id=? AND user_id=? AND entry_date BETWEEN ? AND ? ORDER BY entry_date',
        [id, userId, inicio, fim],
        c
      ),
      [total] = await queryRows<{ total: number }>(
        `SELECT COUNT(*) total FROM personal_tracker_entries WHERE tracker_id=? AND user_id=?${ctx.corte ? ' AND entry_date>=?' : ''}`,
        ctx.corte ? [id, userId, ctx.corte] : [id, userId],
        c
      ),
      porId = new Map(defs.map((d) => [d.id, d]));
    const registros: RegistroDoAcompanhamento[] = linhas.map((l) => {
      const d = porId.get(l.definition_id) ?? atual;
      return {
        idRegistro: l.id,
        data: l.entry_date,
        valor: Number(l.value),
        rotulo: rotuloDoValor(d.escala, Number(l.value)),
        nota: l.note,
        versao: Number(l.version),
        definicaoId: l.definition_id,
        definicaoAnterior: l.definition_id !== atual.id,
        atualizadoEm: iso(l.updated_at),
      };
    });
    // Períodos esperados pela frequência atual, a partir do primeiro período
    // acompanhado na janela: criação do acompanhamento ou primeira resposta.
    const criadoLocal = dataLocal(new Date(iso(r.created_at)), ctx.fuso),
      primeira = [criadoLocal, registros[0]?.data ?? criadoLocal].sort()[0],
      base = [inicio, primeira].sort().at(-1)!,
      passo = atual.frequencia === 'semanal' ? 7 : 1,
      periodos: string[] = [];
    let d = atual.frequencia === 'semanal' ? inicioDaSemana(base) : base;
    // Uma semana iniciada antes da janela não pertence a ela.
    if (d < inicio) d = somarDias(d, passo);
    for (; d <= fim; d = somarDias(d, passo)) periodos.push(d);
    const respondidas = new Set(registros.map((x) => x.data));
    const resumos = defs
      .map((d) => {
        const vs = registros
          .filter((x) => x.definicaoId === d.id)
          .map((x) => x.valor);
        return {
          definicaoId: d.id,
          sequencia: d.sequencia,
          respostas: vs.length,
          mediana: mediana(vs),
          minimo: vs.length ? Math.min(...vs) : null,
          maximo: vs.length ? Math.max(...vs) : null,
        };
      })
      .filter((x) => x.respostas > 0 || x.definicaoId === atual.id);
    const [u] = await queryRows<LinhaDoRegistro>(
      `SELECT * FROM personal_tracker_entries WHERE tracker_id=? AND user_id=?${ctx.corte ? ' AND entry_date>=?' : ''} ORDER BY entry_date DESC LIMIT 1`,
      ctx.corte ? [id, userId, ctx.corte] : [id, userId],
      c
    );
    return {
      hoje: ctx.hoje,
      corte: ctx.corte,
      fuso: ctx.fuso,
      inicio,
      fim,
      acompanhamento: montar(r, defs, ctx.hoje, {
        registros: Number(total.total),
        ultimo: u ?? null,
        respondido: Boolean(
          u && u.entry_date === periodoAtual(atual.frequencia, ctx.hoje)
        ),
      }),
      definicoes: defs,
      registros,
      periodos,
      semRegistro: periodos.filter((d) => !respondidas.has(d)).length,
      resumos,
      calculadoEm: agora.toISOString(),
    };
  });
}

/** Opções do relatório pessoal: acompanhamentos do titular, ativos ou não. */
export async function acompanhamentosDoRelatorio(userId: string) {
  return queryRows<{ id: string; name: string; archived_at: string | null }>(
    'SELECT id,name,archived_at FROM personal_trackers WHERE user_id=? ORDER BY archived_at IS NOT NULL,position,created_at,id',
    [userId]
  );
}
