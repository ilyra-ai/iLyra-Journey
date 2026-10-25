import type { PoolConnection } from 'mysql2/promise';
import { queryRows, withTransaction } from '@/lib/mysql/pool';
import { HttpError } from '@/lib/http-error';
import { ACOES_DE_GESTAO } from '@/types/gestao-usuarios';
import {
  ATIVIDADE,
  DOMINIOS,
  type Dominio,
  type FiltrosAnaliticos,
  type PaginaDetalhes,
  type PainelAnalitico,
  type PontoTemporal,
} from './definicoes';
import { janela, preencherSerie } from './periodo';

/** Identificadores de SQL são exclusivamente desta lista interna, nunca da URL. */
const FONTES: Record<
  Dominio,
  { tabela: string; estado?: string; dono?: string; id?: string; join?: string }
> = {
  metricas: { tabela: 'daily_metrics' },
  reflexoes: { tabela: 'daily_reflections' },
  respiracao: { tabela: 'breathing_sessions' },
  chat: { tabela: 'chat_turns', estado: 't.status' },
  avaliacoes: { tabela: 'user_assessments' },
  metas: { tabela: 'goals', estado: 't.status' },
  habitos: { tabela: 'habits', estado: "IF(t.is_active,'Ativo','Inativo')" },
  consultas: { tabela: 'appointments', estado: 't.status' },
  profissionais: { tabela: 'professionals' },
  leituras: { tabela: 'daily_briefings' },
  planos: { tabela: 'ai_plans' },
  notificacoes: {
    tabela: 'user_notifications',
    estado: "IF(t.read_at IS NULL,'Não lida','Lida')",
  },
  memoria: { tabela: 'memory_episodes', estado: 't.status' },
  imagens: {
    tabela: 'chat_generated_images',
    estado: 't.status',
    id: 't.turn_id',
    dono: 'ct.user_id',
    join: 'JOIN chat_turns ct ON ct.id=t.turn_id',
  },
};
const ativosSQL = ATIVIDADE.map((k) => `'${k}'`).join(',');
// Espelha a escolha de assinatura vigente do serviço de planos, sem N+1.
// Desempate por id apenas quando período/criação coincidem; não concede papel.
const POPULACAO = `WITH candidatas AS (
 SELECT user_id,plan_id,COUNT(*) OVER(PARTITION BY user_id) quantidade,
 ROW_NUMBER() OVER(PARTITION BY user_id ORDER BY current_period_end DESC,created_at DESC,id DESC) posicao
 FROM user_subscriptions WHERE status='active' AND (ended_at IS NULL OR ended_at > UTC_TIMESTAMP())
), populacao AS (
 SELECT p.id,p.email,p.onboarding_completed,u.created_at,u.blocked_at,
 COALESCE(sp.plan_key,'sem_assinatura') plano,COALESCE(sp.name,'Sem assinatura vigente') nome_plano,COALESCE(c.quantidade,0) assinaturas
 FROM profiles p JOIN users u ON u.id=p.id LEFT JOIN candidatas c ON c.user_id=p.id AND c.posicao=1
 LEFT JOIN subscription_plans sp ON sp.id=c.plan_id
 WHERE p.role <> 'admin' AND (?='todos' OR COALESCE(sp.plan_key,'sem_assinatura')=?)
)`;
function eventosCTE() {
  return Object.entries(FONTES)
    .map(
      ([chave, s]) =>
        `SELECT ${s.id ?? 't.id'} id,${s.dono ?? 't.user_id'} usuario_id,t.created_at data,'${chave}' dominio,${s.estado ?? "'Registrado'"} estado FROM ${s.tabela} t ${s.join ?? ''} JOIN populacao p ON p.id=${s.dono ?? 't.user_id'} WHERE t.created_at>=? AND t.created_at<?`
    )
    .join(' UNION ALL ');
}
function parametrosEventos(inicio: string, fim: string) {
  return Object.keys(FONTES).flatMap(() => [inicio, fim]);
}
function cte(f: FiltrosAnaliticos, inicio: string, fim: string) {
  return {
    sql: POPULACAO + ', eventos AS (' + eventosCTE() + ')',
    params: [f.plano, f.plano, ...parametrosEventos(inicio, fim)],
  };
}
function bucket(coluna: string, grupo: FiltrosAnaliticos['agrupamento']) {
  return grupo === 'mes'
    ? `DATE_FORMAT(${coluna},'%Y-%m-01')`
    : grupo === 'semana'
      ? `DATE_FORMAT(DATE_SUB(DATE(${coluna}),INTERVAL WEEKDAY(${coluna}) DAY),'%Y-%m-%d')`
      : `DATE_FORMAT(${coluna},'%Y-%m-%d')`;
}
async function validarPlano(f: FiltrosAnaliticos, db: PoolConnection) {
  if (['todos', 'sem_assinatura'].includes(f.plano)) return;
  const r = await queryRows(
    "SELECT id FROM subscription_plans WHERE plan_key=? AND plan_key<>'admin'",
    [f.plano],
    db
  );
  if (!r.length)
    throw new HttpError(
      'O plano selecionado não existe ou não é comercial.',
      400
    );
}
async function periodo(
  f: FiltrosAnaliticos,
  inicio: string,
  fim: string,
  db: PoolConnection
) {
  const c = cte(f, inicio, fim);
  const [contagens] = await queryRows<{
    cadastros: number;
    concluidos: number;
    ativos: number;
  }>(
    `${c.sql}
 SELECT (SELECT COUNT(*) FROM populacao WHERE created_at>=? AND created_at<?) cadastros,
 (SELECT COUNT(*) FROM populacao WHERE created_at>=? AND created_at<? AND onboarding_completed=TRUE) concluidos,
 (SELECT COUNT(DISTINCT usuario_id) FROM eventos WHERE dominio IN (${ativosSQL})) ativos`,
    [...c.params, inicio, fim, inicio, fim],
    db
  );
  const dominios = await queryRows<{
    dominio: Dominio;
    registros: number;
    pessoas: number;
    erros: number;
  }>(
    `${c.sql} SELECT dominio,COUNT(*) registros,COUNT(DISTINCT usuario_id) pessoas,SUM(estado='erro') erros FROM eventos GROUP BY dominio`,
    c.params,
    db
  );
  const serie = await queryRows<PontoTemporal>(
    `${c.sql}, pontos AS (
 SELECT created_at data,'cadastros' dominio,id usuario_id FROM populacao WHERE created_at>=? AND created_at<?
 UNION ALL SELECT data,dominio,usuario_id FROM eventos
 ) SELECT ${bucket('data', f.agrupamento)} data,SUM(dominio='cadastros') cadastros,
 COUNT(DISTINCT CASE WHEN dominio IN (${ativosSQL}) THEN usuario_id END) ativos,
 SUM(dominio='chat') chat,SUM(dominio='metricas') metricas FROM pontos GROUP BY 1 ORDER BY 1`,
    [...c.params, inicio, fim],
    db
  );
  return {
    contagens,
    dominios,
    serie: serie.map((r) => ({
      ...r,
      cadastros: Number(r.cadastros),
      ativos: Number(r.ativos),
      chat: Number(r.chat),
      metricas: Number(r.metricas),
    })),
  };
}
const ESTADOS_SEGUROS = new Set([
  'Registrado',
  'Ativo',
  'Inativo',
  'Não lida',
  'Lida',
  'processando',
  'concluido',
  'erro',
  'fila',
  'pronto',
  'pendente',
  'gerando',
  'pronta',
  'scheduled',
  'completed',
  'cancelled',
  'canceled',
  'in_progress',
  'paused',
  'Perfil concluído',
  'Perfil pendente',
  'Atividade registrada',
]);
function estadoSeguro(estado: string) {
  return ESTADOS_SEGUROS.has(estado) ? estado : 'Outro estado registrado';
}
export async function carregarDetalhes(
  f: FiltrosAnaliticos,
  detalhe: string,
  pagina: number,
  db?: PoolConnection
): Promise<PaginaDetalhes> {
  if (!db)
    return withTransaction(async (conexao) => {
      await validarPlano(f, conexao);
      return carregarDetalhes(f, detalhe, pagina, conexao);
    });
  const j = janela(f);
  const c = cte(f, j.inicio, j.fim);
  const pessoas = detalhe === 'cadastros';
  const filtro = pessoas
    ? 'p.created_at>=? AND p.created_at<?'
    : detalhe === 'atividade'
      ? `e.dominio IN (${ativosSQL})`
      : 'e.dominio=?';
  const parametros = pessoas
    ? [j.inicio, j.fim]
    : detalhe === 'atividade'
      ? []
      : [detalhe];
  const fonte = pessoas
    ? 'FROM populacao p'
    : 'FROM eventos e JOIN populacao p ON p.id=e.usuario_id';
  const [n] = await queryRows<{ total: number }>(
    `${c.sql} SELECT COUNT(${detalhe === 'atividade' ? 'DISTINCT p.id' : '*'}) total ${fonte} WHERE ${filtro}`,
    [...c.params, ...parametros],
    db
  );
  // Atividade detalha pessoas únicas, não uma lista que duplicaria o KPI.
  const selecao = pessoas
    ? "p.id,p.id usuarioId,p.email,p.created_at data,IF(p.onboarding_completed,'Perfil concluído','Perfil pendente') estado,'cadastros' dominio"
    : detalhe === 'atividade'
      ? "p.id,p.id usuarioId,p.email,MAX(e.data) data,'Atividade registrada' estado,'atividade' dominio"
      : 'e.id,p.id usuarioId,p.email,e.data,e.estado,e.dominio';
  const itens = await queryRows<PaginaDetalhes['itens'][number]>(
    `${c.sql} SELECT ${selecao} ${fonte} WHERE ${filtro} ${detalhe === 'atividade' ? 'GROUP BY p.id,p.email' : ''} ORDER BY data DESC,id DESC LIMIT 20 OFFSET ?`,
    [...c.params, ...parametros, (pagina - 1) * 20],
    db
  );
  return {
    itens: itens.map((r) => ({
      ...r,
      data: r.data.replace(' ', 'T') + 'Z',
      estado: estadoSeguro(r.estado),
    })),
    total: Number(n.total),
    pagina,
    porPagina: 20,
  };
}
async function linhaTemporal(
  f: FiltrosAnaliticos,
  pagina: number,
  db: PoolConnection
): Promise<PaginaDetalhes> {
  const j = janela(f);
  const fontes = `${POPULACAO}, linha AS (
 SELECT CONCAT('cadastro:',p.id) id,p.id usuarioId,p.email,p.created_at data,'account_registered' estado,'Cadastro' dominio FROM populacao p WHERE p.created_at>=? AND p.created_at<?
 UNION ALL SELECT CONCAT('gestao:',e.id),p.id,p.email,e.created_at,e.action,'Gestão' FROM admin_user_events e JOIN populacao p ON p.id=e.user_id WHERE e.created_at>=? AND e.created_at<? AND e.action<>'account_created'
 UNION ALL SELECT CONCAT('assinatura:',e.id),p.id,p.email,e.created_at,e.event_type,'Assinatura' FROM subscription_audit_events e JOIN populacao p ON p.id=e.user_id WHERE e.created_at>=? AND e.created_at<?
 )`;
  const params = [
    f.plano,
    f.plano,
    j.inicio,
    j.fim,
    j.inicio,
    j.fim,
    j.inicio,
    j.fim,
  ];
  const [n] = await queryRows<{ total: number }>(
    `${fontes} SELECT COUNT(*) total FROM linha`,
    params,
    db
  );
  const rows = await queryRows<PaginaDetalhes['itens'][number]>(
    `${fontes} SELECT * FROM linha ORDER BY data DESC,id DESC LIMIT 20 OFFSET ?`,
    [...params, (pagina - 1) * 20],
    db
  );
  return {
    itens: rows.map((r) => ({
      ...r,
      data: r.data.replace(' ', 'T') + 'Z',
      estado:
        r.estado === 'account_registered'
          ? 'Conta cadastrada'
          : (ACOES_DE_GESTAO[r.estado as keyof typeof ACOES_DE_GESTAO] ??
            'Evento de assinatura registrado'),
    })),
    total: Number(n.total),
    pagina,
    porPagina: 20,
  };
}
export async function carregarPainel(
  f: FiltrosAnaliticos,
  paginaEventos = 1
): Promise<PainelAnalitico> {
  return withTransaction(async (db) => {
    await validarPlano(f, db);
    const j = janela(f);
    const atual = await periodo(f, j.inicio, j.fim, db);
    const anterior = await periodo(f, j.inicioAnterior, j.inicio, db);
    const [base] = await queryRows<PainelAnalitico['base']>(
      `${POPULACAO} SELECT COUNT(*) contas,COALESCE(SUM(blocked_at IS NOT NULL),0) bloqueadas,COALESCE(SUM(NOT onboarding_completed),0) pendentes,COALESCE(SUM(assinaturas=0),0) semAssinatura,COALESCE(SUM(assinaturas>1),0) multiplasAssinaturas FROM populacao`,
      [f.plano, f.plano],
      db
    );
    const planos = await queryRows<PainelAnalitico['planos'][number]>(
      `${POPULACAO} SELECT plano chave,nome_plano nome,COUNT(*) contas FROM populacao GROUP BY plano,nome_plano ORDER BY contas DESC,chave`,
      [f.plano, f.plano],
      db
    );
    const opcoesPlanos = await queryRows<
      PainelAnalitico['opcoesPlanos'][number]
    >(
      "SELECT plan_key chave,name nome FROM subscription_plans WHERE plan_key<>'admin' ORDER BY display_order,name",
      [],
      db
    );
    const [catalogo] = await queryRows<PainelAnalitico['catalogo']>(
      `SELECT (SELECT COUNT(*) FROM ai_tips WHERE is_active=TRUE) dicas,(SELECT COUNT(*) FROM suggested_habits WHERE is_active=TRUE) habitos,(SELECT COUNT(*) FROM subscription_plans WHERE is_active=TRUE AND plan_key<>'admin') planos,(SELECT COUNT(*) FROM ai_knowledge_documents) documentos`,
      [],
      db
    );
    return {
      filtros: f,
      geradoEm: new Date().toISOString(),
      anterior: j.anterior,
      atual: atual.contagens,
      comparacao: anterior.contagens,
      base,
      planos,
      opcoesPlanos,
      dominios: (Object.keys(DOMINIOS) as Dominio[]).map((chave) => {
        const a = atual.dominios.find((r) => r.dominio === chave),
          b = anterior.dominios.find((r) => r.dominio === chave);
        return {
          chave,
          registros: Number(a?.registros ?? 0),
          pessoas: Number(a?.pessoas ?? 0),
          erros: Number(a?.erros ?? 0),
          anterior: Number(b?.registros ?? 0),
        };
      }),
      serie: preencherSerie(f.inicio, f.fim, f.agrupamento, atual.serie),
      serieAnterior: preencherSerie(
        j.anterior.inicio,
        j.anterior.fim,
        f.agrupamento,
        anterior.serie
      ),
      eventos: await linhaTemporal(f, paginaEventos, db),
      catalogo,
    };
  });
}
