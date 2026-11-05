import type { PoolConnection } from 'mysql2/promise';
import type { AppSession } from '@/types/app-session';
import { HttpError } from '@/lib/http-error';
import { executeStatement, queryRows, withTransaction } from '@/lib/mysql/pool';
import { contaTemRecurso, requireFeatureEnabled } from '@/lib/plans/service';
import { contextoDoDiario } from '@/lib/acontecimentos/servico';
import {
  cadeiaTemModelo,
  montarCadeia,
  somenteLocais,
} from '@/lib/ai/cadeia-de-modelos';
import { lerConfiguracaoDeIa } from '@/lib/ai/provedores-da-plataforma';
import {
  guardarRelato,
  preferenciasDaMemoria,
  recuperarMemorias,
} from '@/lib/memoria/servico';
import type { BriefingDoDia } from '@/lib/coach/tipos';
import { analisarComModelo, TEMPO_MAXIMO_DA_ANALISE_MS } from './analise';
import {
  type CeuDoRelato,
  type EstadoDaMemoria,
  LIMITE_POR_DIA,
  type MesDoDiario,
  type NovoRelato,
  type Relato,
} from './esquema';

type Linha = {
  id: string;
  user_id: string;
  entry_date: string;
  input_mode: Relato['modo'];
  speech_engine: Relato['motor'];
  original_text: string;
  organized_text: string | null;
  analysis: unknown;
  sky_snapshot: unknown;
  analysis_status: Relato['estadoDaAnalise'];
  analysis_reason: string | null;
  analysis_provider: string | null;
  analysis_model: string | null;
  analysis_local: number | null;
  analyzed_at: string | null;
  analysis_lease_until: string | null;
  analysis_attempts: number;
  memory_status: EstadoDaMemoria;
  version: number;
  created_at: string;
};

const iso = (s: string | null) => (s ? s.replace(' ', 'T') + 'Z' : null);
const json = <T>(v: unknown): T | null =>
  v === null || v === undefined
    ? null
    : ((typeof v === 'string' ? JSON.parse(v) : v) as T);

function converter(r: Linha): Relato {
  const analise = json<Relato['analise'] & { textoOrganizado?: string }>(
    r.analysis
  );
  if (analise) delete analise.textoOrganizado;
  // Relato antigo em geração interrompida (lease vencido) volta a pendente.
  const vencido =
    r.analysis_status === 'gerando' &&
    (!r.analysis_lease_until ||
      Date.parse(iso(r.analysis_lease_until)!) < Date.now());
  return {
    id: r.id,
    data: r.entry_date,
    modo: r.input_mode,
    motor: r.speech_engine,
    textoOriginal: r.original_text,
    textoOrganizado: r.organized_text,
    analise,
    ceu: json<CeuDoRelato>(r.sky_snapshot),
    estadoDaAnalise: vencido ? 'pendente' : r.analysis_status,
    motivo: r.analysis_reason,
    autor:
      r.analysis_provider && r.analysis_model
        ? {
            provedor: r.analysis_provider,
            modelo: r.analysis_model,
            local: Boolean(r.analysis_local),
          }
        : null,
    analisadoEm: iso(r.analyzed_at),
    memoria: r.memory_status,
    versao: Number(r.version),
    criadoEm: iso(r.created_at)!,
  };
}

/** O diário faz parte da reflexão do dia em /dia. */
export async function autorizarDiarioPessoal(s: AppSession) {
  await requireFeatureEnabled(s, 'evening_reflection');
}

function exigirData(data: string, ctx: { hoje: string; corte: string | null }) {
  if (data > ctx.hoje)
    throw new HttpError('Escolha uma data até o dia local de hoje.', 400);
  if (ctx.corte && data < ctx.corte)
    throw new HttpError(
      'Este dia está fora do histórico disponível no seu plano.',
      403
    );
}
function conferirVersao(atual: number, recebida: number) {
  if (Number(atual) !== recebida)
    throw new HttpError(
      'O relato mudou em outra página. Atualize antes de tentar novamente.',
      409
    );
}
async function encontrar(
  userId: string,
  id: string,
  c?: PoolConnection,
  travar = false
) {
  const [r] = await queryRows<Linha>(
    `SELECT * FROM personal_diary_entries WHERE id=? AND user_id=?${travar ? ' FOR UPDATE' : ''}`,
    [id, userId],
    c
  );
  if (!r) throw new HttpError('Relato não encontrado.', 404);
  return r;
}

export async function lerMesDoDiario(
  s: AppSession,
  mes: string | null,
  agora = new Date()
): Promise<MesDoDiario> {
  await autorizarDiarioPessoal(s);
  const ctx = await contextoDoDiario(s.user.id, agora),
    alvo = mes ?? ctx.hoje.slice(0, 7);
  // Fim do mês pelo próprio MySQL: um dia 31 fixo ("2026-11-31") é data
  // inválida e esvaziava os meses de 30 dias e fevereiro.
  const inicio = `${alvo}-01`;
  const dias = await queryRows<{ entry_date: string; total: number }>(
    `SELECT entry_date,COUNT(*) total FROM personal_diary_entries
     WHERE user_id=? AND entry_date >= ? AND entry_date < DATE_ADD(?, INTERVAL 1 MONTH)
       AND entry_date >= ?
     GROUP BY entry_date ORDER BY entry_date`,
    [s.user.id, inicio, inicio, ctx.corte ?? '0000-01-01']
  );
  return {
    mes: alvo,
    hoje: ctx.hoje,
    corte: ctx.corte,
    dias: dias.map((d) => ({ data: d.entry_date, total: Number(d.total) })),
  };
}

export async function lerRelatosDoDia(
  s: AppSession,
  data: string,
  agora = new Date()
): Promise<Relato[]> {
  await autorizarDiarioPessoal(s);
  exigirData(data, await contextoDoDiario(s.user.id, agora));
  const linhas = await queryRows<Linha>(
    'SELECT * FROM personal_diary_entries WHERE user_id=? AND entry_date=? ORDER BY created_at,id',
    [s.user.id, data]
  );
  return linhas.map(converter);
}

/**
 * Leva o relato à fila da memória individual (Graphiti), quando o plano e
 * a própria pessoa permitem. A memória guarda o que a pessoa contou; a
 * análise da Lyra fica no diário, rotulada como interpretação.
 */
async function enviarParaMemoria(
  userId: string,
  data: string,
  texto: string,
  corrigido: boolean
): Promise<EstadoDaMemoria> {
  if (!(await contaTemRecurso(userId, 'lyra_memory'))) return 'sem_plano';
  const preferencias = await preferenciasDaMemoria(userId);
  if (!preferencias?.enabled || preferencias.purge_pending) return 'desativada';
  await guardarRelato(
    userId,
    `${corrigido ? 'Relato corrigido' : 'Relato'} do diário pessoal de ${data}: ${texto}`
  );
  return 'na_fila';
}

export async function criarRelato(
  s: AppSession,
  p: NovoRelato,
  agora = new Date()
): Promise<Relato> {
  await autorizarDiarioPessoal(s);
  exigirData(p.data, await contextoDoDiario(s.user.id, agora));
  const { relato, novo } = await withTransaction(async (c) => {
    await queryRows(
      'SELECT id FROM users WHERE id=? FOR UPDATE',
      [s.user.id],
      c
    );
    const [existente] = await queryRows<Linha>(
      'SELECT * FROM personal_diary_entries WHERE id=? FOR UPDATE',
      [p.id],
      c
    );
    if (existente) {
      // Reenvio do mesmo pedido (rede instável) devolve o mesmo relato.
      if (
        existente.user_id !== s.user.id ||
        existente.original_text !== p.texto ||
        existente.entry_date !== p.data
      )
        throw new HttpError('Este identificador já foi usado.', 409);
      return { relato: existente, novo: false };
    }
    const [{ total }] = await queryRows<{ total: number }>(
      'SELECT COUNT(*) total FROM personal_diary_entries WHERE user_id=? AND entry_date=?',
      [s.user.id, p.data],
      c
    );
    if (Number(total) >= LIMITE_POR_DIA)
      throw new HttpError(
        `Cada dia aceita até ${LIMITE_POR_DIA} relatos no diário.`,
        409
      );
    await c.execute(
      'INSERT INTO personal_diary_entries(id,user_id,entry_date,input_mode,speech_engine,original_text) VALUES(?,?,?,?,?,?)',
      [p.id, s.user.id, p.data, p.modo, p.motor, p.texto]
    );
    return { relato: await encontrar(s.user.id, p.id, c), novo: true };
  });
  if (!novo) return converter(relato);
  const memoria = await enviarParaMemoria(s.user.id, p.data, p.texto, false);
  await executeStatement(
    'UPDATE personal_diary_entries SET memory_status=? WHERE id=? AND user_id=?',
    [memoria, p.id, s.user.id]
  );
  return converter(await encontrar(s.user.id, p.id));
}

export async function editarRelato(
  s: AppSession,
  id: string,
  p: { versao: number; texto: string },
  agora = new Date()
): Promise<Relato> {
  await autorizarDiarioPessoal(s);
  const ctx = await contextoDoDiario(s.user.id, agora);
  const atual = await withTransaction(async (c) => {
    const r = await encontrar(s.user.id, id, c, true);
    exigirData(r.entry_date, ctx);
    conferirVersao(r.version, p.versao);
    if (r.original_text === p.texto) return { r, mudou: false };
    // O texto mudou: organização e análise antigas deixam de valer.
    await c.execute(
      `UPDATE personal_diary_entries SET original_text=?,organized_text=NULL,analysis=NULL,
       analysis_status='pendente',analysis_reason=NULL,analysis_provider=NULL,analysis_model=NULL,
       analysis_local=NULL,analyzed_at=NULL,analysis_lease_until=NULL,analysis_attempts=0,version=version+1
       WHERE id=? AND user_id=?`,
      [p.texto, id, s.user.id]
    );
    return { r, mudou: true };
  });
  if (atual.mudou) {
    const memoria = await enviarParaMemoria(
      s.user.id,
      atual.r.entry_date,
      p.texto,
      true
    );
    await executeStatement(
      'UPDATE personal_diary_entries SET memory_status=? WHERE id=? AND user_id=?',
      [memoria, id, s.user.id]
    );
  }
  return converter(await encontrar(s.user.id, id));
}

export async function excluirRelato(s: AppSession, id: string, versao: number) {
  await autorizarDiarioPessoal(s);
  await withTransaction(async (c) => {
    const r = await encontrar(s.user.id, id, c, true);
    conferirVersao(r.version, versao);
    await c.execute(
      'DELETE FROM personal_diary_entries WHERE id=? AND user_id=?',
      [id, s.user.id]
    );
  });
}

/** Fatos do céu do dia e do mapa da pessoa, do briefing guardado da data. */
export async function ceuDoDia(
  userId: string,
  data: string
): Promise<CeuDoRelato | null> {
  const [linha] = await queryRows<{ content: unknown }>(
    'SELECT content FROM daily_briefings WHERE user_id=? AND briefing_date=? LIMIT 1',
    [userId, data]
  );
  const b = linha ? json<BriefingDoDia>(linha.content) : null;
  if (!b?.ceuSimples || !b.ceu) return null;
  return {
    data: b.data,
    tom: b.tom,
    manchete: b.manchete,
    signoDaLua: b.ceu.signoDaLua,
    itens: b.ceuSimples.itens.map((i) => ({
      termo: i.termo,
      valor: i.valor,
      ...(i.detalhe ? { detalhe: i.detalhe } : {}),
    })),
    estrelaPessoal: b.ceu.tara
      ? { nome: b.ceu.tara.nome, sentido: b.ceu.tara.sentido }
      : null,
    periodoDeVida: b.ceu.dasha,
  };
}

/**
 * Organiza o texto e escreve a análise com o primeiro modelo autorizado que
 * entregar uma versão fiel. Sem consentimento para nuvem na memória, só
 * modelos locais recebem o relato. Nada é simulado: sem modelo, o relato
 * fica guardado como foi contado e a análise aparece como indisponível.
 */
export async function analisarRelato(
  s: AppSession,
  id: string,
  versao: number,
  agora = new Date()
): Promise<Relato> {
  await autorizarDiarioPessoal(s);
  const ctx = await contextoDoDiario(s.user.id, agora);
  const configuracao = await lerConfiguracaoDeIa();
  const consentimento = await preferenciasDaMemoria(s.user.id);
  const nuvem = Boolean(consentimento?.allow_cloud);
  const cadeia = nuvem
    ? montarCadeia(configuracao)
    : somenteLocais(montarCadeia(configuracao));
  const segundos = Math.ceil(TEMPO_MAXIMO_DA_ANALISE_MS / 1000) + 15;
  const r = await withTransaction(async (c) => {
    const r = await encontrar(s.user.id, id, c, true);
    exigirData(r.entry_date, ctx);
    conferirVersao(r.version, versao);
    const emAndamento =
      r.analysis_status === 'gerando' &&
      r.analysis_lease_until &&
      Date.parse(iso(r.analysis_lease_until)!) > Date.now();
    if (emAndamento)
      throw new HttpError('A análise deste relato já está em andamento.', 409);
    if (r.analysis_status === 'pronta')
      throw new HttpError('Este relato já foi analisado.', 409);
    if (!cadeiaTemModelo(cadeia)) {
      await c.execute(
        "UPDATE personal_diary_entries SET analysis_status='indisponivel',analysis_reason=? WHERE id=? AND user_id=?",
        [
          nuvem
            ? 'Nenhum modelo de IA autorizado está configurado para organizar e analisar o relato.'
            : 'Nenhum modelo de IA local está configurado. Para usar modelos em nuvem, autorize o envio na página Memória.',
          id,
          s.user.id,
        ]
      );
      return null;
    }
    await c.execute(
      "UPDATE personal_diary_entries SET analysis_status='gerando',analysis_reason=NULL,analysis_attempts=analysis_attempts+1,analysis_lease_until=TIMESTAMPADD(SECOND,?,UTC_TIMESTAMP(3)) WHERE id=? AND user_id=?",
      [segundos, id, s.user.id]
    );
    return r;
  });
  if (!r) return converter(await encontrar(s.user.id, id));

  try {
    const [ceu, anteriores, memoria] = await Promise.all([
      ceuDoDia(s.user.id, r.entry_date),
      queryRows<Linha>(
        `SELECT * FROM personal_diary_entries WHERE user_id=? AND analysis_status='pronta'
         AND id<>? AND entry_date <= ? ORDER BY entry_date DESC,created_at DESC LIMIT 6`,
        [s.user.id, id, r.entry_date]
      ),
      recuperarMemorias(s.user.id, r.original_text, false, nuvem),
    ]);
    const historico = anteriores.flatMap((a) => {
      const analise = json<{
        acontecimentos: string[];
        caracteristicasDoDia: string;
      }>(a.analysis);
      return analise
        ? [
            {
              data: a.entry_date,
              acontecimentos: analise.acontecimentos,
              caracteristicas: analise.caracteristicasDoDia,
            },
          ]
        : [];
    });
    const resultado = await analisarComModelo(
      cadeia,
      {
        data: r.entry_date,
        texto: r.original_text,
        ceu,
        historico,
        memoria: memoria.map((m) => m.relato).slice(0, 8),
      },
      { cancelamento: AbortSignal.timeout(TEMPO_MAXIMO_DA_ANALISE_MS) }
    );
    if (!resultado.ok) {
      await executeStatement(
        "UPDATE personal_diary_entries SET analysis_status='falhou',analysis_reason=?,analysis_lease_until=NULL WHERE id=? AND user_id=? AND version=?",
        [resultado.motivo, id, s.user.id, r.version]
      );
    } else {
      const { textoOrganizado, ...analise } = resultado.analise;
      // Só grava se o relato não mudou durante a geração.
      await executeStatement(
        `UPDATE personal_diary_entries SET organized_text=?,analysis=?,sky_snapshot=?,analysis_status='pronta',
         analysis_reason=NULL,analysis_provider=?,analysis_model=?,analysis_local=?,analyzed_at=UTC_TIMESTAMP(3),
         analysis_lease_until=NULL WHERE id=? AND user_id=? AND version=?`,
        [
          textoOrganizado,
          JSON.stringify(analise),
          ceu ? JSON.stringify(ceu) : null,
          resultado.autor.provedor,
          resultado.autor.modelo,
          resultado.autor.local,
          id,
          s.user.id,
          r.version,
        ]
      );
    }
  } catch (e) {
    await executeStatement(
      "UPDATE personal_diary_entries SET analysis_status='falhou',analysis_reason=?,analysis_lease_until=NULL WHERE id=? AND user_id=? AND version=?",
      [
        e instanceof Error && e.name === 'TimeoutError'
          ? 'O modelo demorou demais para responder. Tente de novo.'
          : 'A análise falhou antes de terminar. Tente de novo.',
        id,
        s.user.id,
        r.version,
      ]
    );
  }
  return converter(await encontrar(s.user.id, id));
}
