import type { PoolConnection } from 'mysql2/promise';
import type { AppSession } from '@/types/app-session';
import { HttpError } from '@/lib/http-error';
import { queryRows, withTransaction } from '@/lib/mysql/pool';
import { dataLocal, horaLocal } from '@/lib/astrology/tempo';
import { contextoDoDiario } from '@/lib/acontecimentos/servico';
import { somarDias } from '@/lib/acontecimentos/analise';
import { contaTemRecurso, requireFeatureEnabled } from '@/lib/plans/service';
import {
  CAMPOS_DO_REGISTRO,
  NOMES_DOS_CAMPOS,
} from '@/lib/metricas/registro-do-dia';
import {
  unidadeDoCampo,
  valorDoRelatorio,
} from '@/lib/relatorio-pessoal/esquema';
import { DEFINICOES, type Tecnica } from '@/lib/respiracao/tecnicas';
import { escalaDoBanco } from '@/lib/acompanhamentos/servico';
import { faixaDaEscala, rotuloDoValor } from '@/lib/acompanhamentos/esquema';
import {
  ASSUNTOS,
  ITENS_POR_PAGINA,
  LISTA_DE_ASSUNTOS,
  LISTA_DE_ORIGENS,
  ORIGENS,
  compararItens,
  type Consulta,
  type ItemDaLinhaDoTempo,
  type LinhaDoTempo,
  type Origem,
} from './esquema';

type Janela = { inicio: string; fim: string; fuso: string };
type Coletor = (
  userId: string,
  j: Janela,
  c: PoolConnection
) => Promise<ItemDaLinhaDoTempo[]>;

const iso = (s: string) => (s.includes('T') ? s : s.replace(' ', 'T') + 'Z');
const numero = (n: number) =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(n);
const dataCurta = (s: string) => s.split('-').reverse().join('/');
/** Data e hora locais (fuso do perfil) de um instante gravado em UTC. */
function local(instante: string, fuso: string) {
  const d = new Date(iso(instante));
  return { data: dataLocal(d, fuso), hora: horaLocal(d, fuso) };
}
/**
 * Instantes gravados em UTC são buscados com um dia de folga de cada lado e
 * filtrados pela data local, para respeitar fusos de -12 h a +14 h.
 */
function limitesUtc(j: Janela) {
  return [
    `${somarDias(j.inicio, -1)} 00:00:00`,
    `${somarDias(j.fim, 2)} 00:00:00`,
  ] as const;
}
const dentro = (data: string, j: Janela) => data >= j.inicio && data <= j.fim;
function item(
  origem: Origem,
  id: string,
  data: string,
  hora: string | null,
  titulo: string,
  resumo: string,
  detalhes: ItemDaLinhaDoTempo['detalhes'] = [],
  destino: string = ORIGENS[origem].destino
): ItemDaLinhaDoTempo {
  return {
    chave: `${origem}:${id}`,
    origem,
    assunto: ORIGENS[origem].assunto,
    data,
    hora,
    titulo,
    resumo,
    detalhes,
    destino,
  };
}

const coletores: Record<Origem, Coletor> = {
  async registro(userId, j, c) {
    const colunas = NOMES_DOS_CAMPOS.map((n) => CAMPOS_DO_REGISTRO[n].coluna);
    const rs = await queryRows<Record<string, unknown>>(
      `SELECT id,date,${colunas.join(',')} FROM daily_metrics WHERE user_id=? AND date BETWEEN ? AND ?`,
      [userId, j.inicio, j.fim],
      c
    );
    return rs.flatMap((r) => {
      const detalhes = NOMES_DOS_CAMPOS.flatMap((n) => {
        const v = valorDoRelatorio(n, r[CAMPOS_DO_REGISTRO[n].coluna]);
        return v === null
          ? []
          : [
              {
                rotulo: CAMPOS_DO_REGISTRO[n].rotulo,
                valor: `${numero(v)} ${unidadeDoCampo(n)}`,
              },
            ];
      });
      // Linha sem nenhum campo válido não é apresentada como registro.
      if (!detalhes.length) return [];
      return [
        item(
          'registro',
          String(r.id),
          String(r.date),
          null,
          'Registro do dia',
          `${detalhes.length} ${detalhes.length === 1 ? 'campo registrado' : 'campos registrados'} no registro consolidado`,
          detalhes
        ),
      ];
    });
  },
  async reflexao(userId, j, c) {
    const rs = await queryRows<{
      id: string;
      reflection_date: string;
      emotional_score: number;
      body_score: number;
      spiritual_score: number;
      com_nota: number;
    }>(
      "SELECT id,reflection_date,emotional_score,body_score,spiritual_score,(note IS NOT NULL AND note<>'') com_nota FROM daily_reflections WHERE user_id=? AND reflection_date BETWEEN ? AND ?",
      [userId, j.inicio, j.fim],
      c
    );
    return rs.map((r) =>
      item(
        'reflexao',
        r.id,
        r.reflection_date,
        null,
        'Reflexão da noite',
        `Emocional ${r.emotional_score}/5 · Corpo ${r.body_score}/5 · Espiritual ${r.spiritual_score}/5`,
        Number(r.com_nota)
          ? [{ rotulo: 'Nota pessoal', valor: 'Registrada (veja na origem)' }]
          : []
      )
    );
  },
  async avaliacao(userId, j, c) {
    const [de, ate] = limitesUtc(j),
      nomes: Record<string, string> = {
        mood: 'Humor',
        who5: 'Bem-estar (WHO-5)',
        nps: 'Avaliação do app (NPS)',
        adherence: 'Adesão ao plano',
      };
    const rs = await queryRows<{
      id: string;
      assessment_type: string;
      score_value: string | number | null;
      created_at: string;
    }>(
      'SELECT id,assessment_type,score_value,created_at FROM user_assessments WHERE user_id=? AND created_at>=? AND created_at<?',
      [userId, de, ate],
      c
    );
    return rs.flatMap((r) => {
      const l = local(r.created_at, j.fuso);
      if (!dentro(l.data, j)) return [];
      return [
        item(
          'avaliacao',
          r.id,
          l.data,
          l.hora,
          nomes[r.assessment_type] ?? 'Avaliação',
          r.score_value === null
            ? 'Avaliação registrada'
            : `Pontuação ${numero(Number(r.score_value))}`
        ),
      ];
    });
  },
  async acompanhamento(userId, j, c) {
    const rs = await queryRows<{
      id: string;
      tracker_id: string;
      name: string;
      entry_date: string;
      value: number;
      com_nota: number;
      frequency: 'diaria' | 'semanal';
      scale_min: number;
      scale_max: number;
      labels: unknown;
    }>(
      "SELECT e.id,e.tracker_id,t.name,e.entry_date,e.value,(e.note<>'') com_nota,d.frequency,d.scale_min,d.scale_max,d.labels FROM personal_tracker_entries e JOIN personal_trackers t ON t.id=e.tracker_id AND t.user_id=e.user_id JOIN personal_tracker_definitions d ON d.id=e.definition_id AND d.tracker_id=e.tracker_id AND d.user_id=e.user_id WHERE e.user_id=? AND e.entry_date BETWEEN ? AND ?",
      [userId, j.inicio, j.fim],
      c
    );
    return rs.map((r) => {
      const escala = escalaDoBanco(r);
      return item(
        'acompanhamento',
        r.id,
        r.entry_date,
        null,
        r.name,
        `${rotuloDoValor(escala, Number(r.value))} (escala ${faixaDaEscala(escala)})`,
        [
          {
            rotulo: 'Frequência',
            valor:
              r.frequency === 'semanal'
                ? `Semanal, semana de ${dataCurta(r.entry_date)}`
                : 'Diária',
          },
          ...(Number(r.com_nota)
            ? [{ rotulo: 'Nota pessoal', valor: 'Registrada (veja na origem)' }]
            : []),
        ],
        `/acompanhamentos?acompanhamento=${encodeURIComponent(r.tracker_id)}`
      );
    });
  },
  async respiracao(userId, j, c) {
    const rs = await queryRows<{
      id: string;
      session_date: string;
      technique: Tecnica;
      cycles: number;
      duration_seconds: number;
      minutes_logged: number;
      created_at: string;
    }>(
      'SELECT id,session_date,technique,cycles,duration_seconds,minutes_logged,created_at FROM breathing_sessions WHERE user_id=? AND session_date BETWEEN ? AND ?',
      [userId, j.inicio, j.fim],
      c
    );
    return rs.map((r) => {
      const l = local(r.created_at, j.fuso);
      return item(
        'respiracao',
        r.id,
        r.session_date,
        // O horário de gravação só é mostrado quando cai no mesmo dia da sessão.
        l.data === r.session_date ? l.hora : null,
        `Respiração ${DEFINICOES[r.technique]?.nome ?? r.technique}`,
        `${r.cycles} ${Number(r.cycles) === 1 ? 'ciclo' : 'ciclos'} · ${Math.round(Number(r.duration_seconds) / 60)} min de prática`,
        [{ rotulo: 'Minutos registrados', valor: `${r.minutes_logged} min` }]
      );
    });
  },
  async foco(userId, j, c) {
    const [de, ate] = limitesUtc(j),
      estados: Record<string, string> = {
        running: 'Em andamento',
        paused: 'Pausada',
        completed: 'Concluída',
        ended: 'Encerrada antes do tempo',
      };
    const rs = await queryRows<{
      id: string;
      kind: 'foco' | 'pausa';
      target_seconds: number;
      state: string;
      elapsed_ms: number;
      started_at: string;
      perception: number | null;
    }>(
      'SELECT id,kind,target_seconds,state,elapsed_ms,started_at,perception FROM focus_sessions WHERE user_id=? AND started_at>=? AND started_at<?',
      [userId, de, ate],
      c
    );
    return rs.flatMap((r) => {
      const l = local(r.started_at, j.fuso);
      if (!dentro(l.data, j)) return [];
      return [
        item(
          'foco',
          r.id,
          l.data,
          l.hora,
          r.kind === 'pausa' ? 'Sessão de pausa' : 'Sessão de foco',
          `${estados[r.state] ?? r.state} · ${Math.round(Number(r.target_seconds) / 60)} min planejados`,
          r.perception === null
            ? []
            : [{ rotulo: 'Percepção', valor: `${r.perception}/5` }]
        ),
      ];
    });
  },
  async rotina(userId, j, c) {
    const [de, ate] = limitesUtc(j),
      estados: Record<string, string> = {
        em_curso: 'Em andamento',
        pausada: 'Pausada',
        encerrada: 'Encerrada',
      };
    const rs = await queryRows<{
      id: string;
      title: string;
      steps: unknown;
      state: string;
      created_at: string;
    }>(
      'SELECT id,title,steps,state,created_at FROM personal_routine_runs WHERE user_id=? AND created_at>=? AND created_at<?',
      [userId, de, ate],
      c
    );
    return rs.flatMap((r) => {
      const l = local(r.created_at, j.fuso);
      if (!dentro(l.data, j)) return [];
      const bruto =
          typeof r.steps === 'string'
            ? (JSON.parse(r.steps) as unknown)
            : r.steps,
        passos = Array.isArray(bruto)
          ? (bruto as Array<{ estado?: string }>)
          : [],
        feitos = passos.filter((p) => p.estado === 'concluido').length;
      return [
        item(
          'rotina',
          r.id,
          l.data,
          l.hora,
          r.title,
          `${estados[r.state] ?? r.state} · ${feitos} de ${passos.length} ${passos.length === 1 ? 'passo concluído' : 'passos concluídos'}`
        ),
      ];
    });
  },
  async meta(userId, j, c) {
    const [de, ate] = limitesUtc(j);
    const criadas = await queryRows<{
      id: string;
      title: string;
      status: string;
      created_at: string;
    }>(
      'SELECT id,title,status,created_at FROM goals WHERE user_id=? AND created_at>=? AND created_at<?',
      [userId, de, ate],
      c
    );
    const prazos = await queryRows<{
      id: string;
      title: string;
      status: string;
      deadline: string;
    }>(
      'SELECT id,title,status,deadline FROM goals WHERE user_id=? AND deadline BETWEEN ? AND ?',
      [userId, j.inicio, j.fim],
      c
    );
    const situacao = (s: string) =>
      s === 'completed'
        ? 'concluída'
        : s === 'paused'
          ? 'pausada'
          : 'em andamento';
    return [
      ...criadas.flatMap((r) => {
        const l = local(r.created_at, j.fuso);
        return dentro(l.data, j)
          ? [
              item(
                'meta',
                `criada:${r.id}`,
                l.data,
                l.hora,
                `Meta criada: ${r.title}`,
                `Situação atual: ${situacao(r.status)}`
              ),
            ]
          : [];
      }),
      ...prazos.map((r) =>
        item(
          'meta',
          `prazo:${r.id}`,
          r.deadline,
          null,
          `Prazo da meta: ${r.title}`,
          `Situação atual: ${situacao(r.status)}`
        )
      ),
    ];
  },
  async acontecimento(userId, j, c) {
    const dias = await queryRows<{
      event_date: string;
      confirmed: number;
      com_nota: number;
    }>(
      "SELECT event_date,confirmed,(note<>'') com_nota FROM personal_event_days WHERE user_id=? AND event_date BETWEEN ? AND ?",
      [userId, j.inicio, j.fim],
      c
    );
    const marcadores = await queryRows<{ event_date: string; name: string }>(
      'SELECT v.event_date,m.name FROM personal_event_day_markers v JOIN personal_event_markers m ON m.id=v.marker_id AND m.user_id=v.user_id WHERE v.user_id=? AND v.event_date BETWEEN ? AND ? ORDER BY m.name,m.id',
      [userId, j.inicio, j.fim],
      c
    );
    const porDia = new Map<string, string[]>();
    for (const m of marcadores)
      porDia.set(m.event_date, [...(porDia.get(m.event_date) ?? []), m.name]);
    return dias.map((d) => {
      const nomes = porDia.get(d.event_date) ?? [];
      return item(
        'acontecimento',
        d.event_date,
        d.event_date,
        null,
        'Acontecimentos do dia',
        Number(d.confirmed)
          ? nomes.length
            ? nomes.join(' · ')
            : 'Dia revisado sem marcadores selecionados'
          : 'Revisão pendente de nova confirmação',
        Number(d.com_nota)
          ? [{ rotulo: 'Nota pessoal', valor: 'Registrada (veja na origem)' }]
          : []
      );
    });
  },
  async descanso(userId, j, c) {
    const rs = await queryRows<{
      id: string;
      start_date: string;
      planned_end: string | null;
      ended_date: string | null;
      cancelled_at: string | null;
    }>(
      'SELECT id,start_date,planned_end,ended_date,cancelled_at FROM rest_periods WHERE user_id=? AND ((start_date BETWEEN ? AND ?) OR (ended_date BETWEEN ? AND ?))',
      [userId, j.inicio, j.fim, j.inicio, j.fim],
      c
    );
    return rs.flatMap((r) => [
      ...(dentro(r.start_date, j)
        ? [
            item(
              'descanso',
              `inicio:${r.id}`,
              r.start_date,
              null,
              'Início do modo descanso',
              r.planned_end
                ? `Previsto até ${dataCurta(r.planned_end)}`
                : 'Sem data prevista de término'
            ),
          ]
        : []),
      ...(r.ended_date && dentro(r.ended_date, j)
        ? [
            item(
              'descanso',
              `fim:${r.id}`,
              r.ended_date,
              null,
              r.cancelled_at
                ? 'Modo descanso cancelado'
                : 'Fim do modo descanso',
              `Iniciado em ${dataCurta(r.start_date)}`
            ),
          ]
        : []),
    ]);
  },
  async experiencia(userId, j, c) {
    const notas = await queryRows<{
      id: string;
      experiment_id: string;
      title: string;
      note_date: string;
      followed: string | null;
      perception: number | null;
      com_nota: number;
    }>(
      "SELECT n.id,n.experiment_id,e.title,n.note_date,n.followed,n.perception,(n.note<>'') com_nota FROM personal_experiment_notes n JOIN personal_experiments e ON e.id=n.experiment_id AND e.user_id=n.user_id WHERE n.user_id=? AND n.note_date BETWEEN ? AND ?",
      [userId, j.inicio, j.fim],
      c
    );
    const inicios = await queryRows<{
      id: string;
      title: string;
      observation_start: string;
    }>(
      'SELECT id,title,observation_start FROM personal_experiments WHERE user_id=? AND observation_start BETWEEN ? AND ?',
      [userId, j.inicio, j.fim],
      c
    );
    const seguiu: Record<string, string> = {
      sim: 'seguiu a mudança',
      parcial: 'seguiu parcialmente',
      nao: 'não seguiu a mudança',
    };
    const destino = (id: string) =>
      `/experiencias?experiencia=${encodeURIComponent(id)}`;
    return [
      ...notas.map((n) =>
        item(
          'experiencia',
          `relato:${n.id}`,
          n.note_date,
          null,
          `Relato: ${n.title}`,
          [
            n.followed ? seguiu[n.followed] : null,
            n.perception === null ? null : `percepção ${n.perception}/5`,
            Number(n.com_nota) ? 'com nota pessoal' : null,
          ]
            .filter(Boolean)
            .join(' · ')
            .replace(/^./, (x) => x.toUpperCase()) || 'Relato registrado',
          [],
          destino(n.experiment_id)
        )
      ),
      ...inicios.map((e) =>
        item(
          'experiencia',
          `inicio:${e.id}`,
          e.observation_start,
          null,
          `Início da experiência: ${e.title}`,
          'Começo do período de observação',
          [],
          destino(e.id)
        )
      ),
    ];
  },
};

async function origensPermitidas(userId: string) {
  const recursos = Array.from(
    new Set(LISTA_DE_ORIGENS.flatMap((o) => [...ORIGENS[o].recursos]))
  );
  const habilitado = new Map(
    await Promise.all(
      recursos.map(async (r) => [r, await contaTemRecurso(userId, r)] as const)
    )
  );
  return LISTA_DE_ORIGENS.filter((o) =>
    ORIGENS[o].recursos.every((r) => habilitado.get(r))
  );
}

/**
 * Reúne, somente para leitura, os registros reais do titular no período. Não
 * grava cópias: edições e exclusões feitas nas origens aparecem na próxima
 * consulta. Notas e conteúdos de conversas não são incluídos.
 */
export async function lerLinhaDoTempo(
  s: AppSession,
  p: Consulta,
  agora = new Date()
): Promise<LinhaDoTempo> {
  await requireFeatureEnabled(s, 'metrics_history_days');
  const [ctx, permitidas] = await Promise.all([
    contextoDoDiario(s.user.id, agora),
    origensPermitidas(s.user.id),
  ]);
  if (p.fim > ctx.hoje)
    throw new HttpError('Escolha datas até o dia local de hoje.', 400);
  if (ctx.corte && p.inicio < ctx.corte)
    throw new HttpError(
      'Este período está fora do histórico disponível no plano.',
      403
    );
  const disponiveis = new Set(permitidas.map((o) => ORIGENS[o].assunto)),
    pedidos = p.assuntos ?? LISTA_DE_ASSUNTOS.filter((a) => disponiveis.has(a));
  const negado = pedidos.find((a) => !disponiveis.has(a));
  if (negado)
    throw new HttpError(
      `O assunto ${ASSUNTOS[negado]} não está disponível no seu plano.`,
      403
    );
  const janela = { inicio: p.inicio, fim: p.fim, fuso: ctx.fuso };
  const todos = await withTransaction(async (c) => {
    const lista: ItemDaLinhaDoTempo[] = [];
    for (const o of permitidas)
      lista.push(...(await coletores[o](s.user.id, janela, c)));
    return lista;
  });
  // A chave identifica origem e registro: a mesma linha nunca aparece duas vezes.
  const unicos = Array.from(new Map(todos.map((i) => [i.chave, i])).values());
  const filtrados = unicos
    .filter((i) => pedidos.includes(i.assunto))
    .sort(compararItens);
  const inicioDaPagina = p.pagina * ITENS_POR_PAGINA,
    itens = filtrados.slice(inicioDaPagina, inicioDaPagina + ITENS_POR_PAGINA);
  return {
    hoje: ctx.hoje,
    corte: ctx.corte,
    fuso: ctx.fuso,
    inicio: p.inicio,
    fim: p.fim,
    assuntos: LISTA_DE_ASSUNTOS.map((a) => ({
      id: a,
      nome: ASSUNTOS[a],
      disponivel: disponiveis.has(a),
      selecionado: pedidos.includes(a),
      total: unicos.filter((i) => i.assunto === a).length,
    })),
    origensIndisponiveis: LISTA_DE_ORIGENS.filter(
      (o) => !permitidas.includes(o)
    ),
    itens,
    total: filtrados.length,
    pagina: p.pagina,
    proximaPagina:
      inicioDaPagina + ITENS_POR_PAGINA < filtrados.length
        ? p.pagina + 1
        : null,
  };
}

/** Contexto para montar a primeira consulta (dia de hoje e corte do plano). */
export async function contextoDaLinhaDoTempo(
  userId: string,
  agora = new Date()
) {
  return contextoDoDiario(userId, agora);
}
