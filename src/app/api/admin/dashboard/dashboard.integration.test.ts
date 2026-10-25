import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, expect, it } from 'vitest';
import { GET } from './route';
import {
  criarUsuario,
  type UsuarioDeTeste,
} from '../../../../../tests/integration/fixtures';
import { chamar } from '../../../../../tests/integration/http';
import { executeStatement, queryRows } from '@/lib/mysql/pool';
import type {
  PainelAnalitico,
  PaginaDetalhes,
} from '@/lib/admin/analytics/definicoes';
let admin: UsuarioDeTeste, a: UsuarioDeTeste, b: UsuarioDeTeste;
const conversa = randomUUID(),
  profissional = randomUUID();
const privado = 'CONTEUDO_PRIVADO_NAO_PODE_SAIR';
const query = 'inicio=2024-01-02&fim=2024-01-08&plano=meta';
const req = async (q = query, usuario: UsuarioDeTeste | null = admin) =>
  chamar(GET, { usuario, path: '/api/admin/dashboard?' + q });
const obter = async (q = query) => (await req(q)).json as PainelAnalitico;
beforeAll(async () => {
  admin = await criarUsuario('admin');
  a = await criarUsuario();
  b = await criarUsuario();
  for (const u of [a, b, admin]) {
    await executeStatement(
      "UPDATE users SET created_at='2024-01-02 00:00:00' WHERE id=?",
      [u.id]
    );
    await executeStatement(
      `INSERT INTO user_subscriptions(id,user_id,plan_id,current_period_end,created_at) SELECT ?,?,id,'2099-01-01','2024-01-02' FROM subscription_plans WHERE plan_key='meta'`,
      [randomUUID(), u.id]
    );
  }
  await executeStatement(
    'UPDATE profiles SET onboarding_completed=FALSE WHERE id=?',
    [b.id]
  );
  await executeStatement(
    'UPDATE users SET blocked_at=UTC_TIMESTAMP() WHERE id=?',
    [b.id]
  );
  for (const [usuario, fecha] of [
    [a.id, '2024-01-01 23:59:59'],
    [a.id, '2024-01-02 00:00:00'],
    [a.id, '2024-01-03 03:00:00'],
    [b.id, '2024-01-08 23:59:59'],
    [b.id, '2024-01-09 00:00:00'],
    [admin.id, '2024-01-02 10:00:00'],
  ]) {
    await executeStatement(
      'INSERT INTO daily_metrics(id,user_id,date,steps,created_at) VALUES(?,?,?,1234,?)',
      [randomUUID(), usuario, fecha.slice(0, 10), fecha]
    );
  }
  await executeStatement(
    "INSERT INTO daily_reflections(id,user_id,reflection_date,emotional_score,body_score,spiritual_score,note,created_at) VALUES(?,?,'2024-01-02',3,3,3,?,'2024-01-02')",
    [randomUUID(), a.id, privado]
  );
  await executeStatement(
    "INSERT INTO breathing_sessions(id,user_id,session_date,technique,cycles,duration_seconds,minutes_logged,created_at) VALUES(?,?,'2024-01-04','quadrada',3,60,1,'2024-01-04')",
    [randomUUID(), b.id]
  );
  await executeStatement(
    'INSERT INTO chat_conversations(id,user_id,title) VALUES(?,?,?)',
    [conversa, a.id, privado]
  );
  for (let n = 0; n < 25; n++)
    await executeStatement(
      "INSERT INTO chat_turns(id,conversation_id,user_id,question,answer,status,attempt_id,created_at) VALUES(?,?,?,?,?,'concluido',?,'2024-01-04 03:00:00')",
      [randomUUID(), conversa, a.id, privado, privado, randomUUID()]
    );
  await executeStatement(
    "UPDATE chat_turns SET status='erro' WHERE conversation_id=? ORDER BY id LIMIT 1",
    [conversa]
  );
  await executeStatement(
    "INSERT INTO user_assessments(id,user_id,assessment_type,score_value,notes,created_at) VALUES(?,?,'nps',10,?,'2024-01-04')",
    [randomUUID(), a.id, privado]
  );
  await executeStatement(
    "INSERT INTO goals(id,user_id,title,status,created_at) VALUES(?,?,?,?,'2024-01-04')",
    [randomUUID(), a.id, privado, privado]
  );
  await executeStatement(
    "INSERT INTO habits(id,user_id,name,created_at) VALUES(?,?,?,'2024-01-04')",
    [randomUUID(), a.id, privado]
  );
  await executeStatement(
    "INSERT INTO professionals(id,user_id,name,specialty,created_at) VALUES(?,?,?,?,'2024-01-04')",
    [profissional, a.id, privado, privado]
  );
  await executeStatement(
    "INSERT INTO appointments(id,user_id,professional_id,appointment_time,notes,created_at) VALUES(?,?,?,'2024-02-01',?,'2024-01-04')",
    [randomUUID(), a.id, profissional, privado]
  );
  await executeStatement(
    "INSERT INTO daily_briefings(id,user_id,briefing_date,content,source,inputs_hash,created_at) VALUES(?,?,'2024-01-04',?,'local',?,'2024-01-04')",
    [randomUUID(), a.id, JSON.stringify({ texto: privado }), 'a'.repeat(64)]
  );
  await executeStatement(
    "INSERT INTO ai_plans(id,user_id,plan_data,created_at) VALUES(?,?,?,'2024-01-04')",
    [randomUUID(), a.id, JSON.stringify({ texto: privado })]
  );
  await executeStatement(
    "INSERT INTO user_notifications(id,user_id,kind,title,body,dedupe_key,created_at) VALUES(?,?,'dia',?,?,?,'2024-01-04')",
    [randomUUID(), a.id, privado, privado, randomUUID()]
  );
  await executeStatement(
    "INSERT INTO memory_episodes(id,user_id,content,reference_at,generation,status,created_at) VALUES(?,?,?,'2024-01-04',1,'erro','2024-01-04')",
    [randomUUID(), a.id, privado]
  );
  const [turno] = await queryRows<{ id: string }>(
    'SELECT id FROM chat_turns WHERE conversation_id=? LIMIT 1',
    [conversa]
  );
  await executeStatement(
    "INSERT INTO chat_generated_images(turn_id,request_kind,status,prompt,attempt_id,deadline_at,created_at) VALUES(?,'solicitada','erro',?,?,'2024-01-04','2024-01-04')",
    [turno.id, privado, randomUUID()]
  );
  await executeStatement(
    "INSERT INTO admin_user_events(id,user_id,actor_id,action,created_at) VALUES(?,?,?,'account_blocked','2024-01-05')",
    [randomUUID(), b.id, admin.id]
  );
});
afterAll(async () => {
  await executeStatement('DELETE FROM users WHERE id IN (?,?,?)', [
    a.id,
    b.id,
    admin.id,
  ]);
});
it('recusa visitante e conta comum no servidor', async () => {
  expect((await req(query, null)).status).toBe(401);
  expect((await req(query, a)).status).toBe(403);
});
it.each([
  'plano=admin',
  'plano=inexistente',
  'inicio=2024-01-02&fim=2024-01-01',
  'inicio=2024-02-30',
  'detalhe=users',
  'pagina=0',
  'outro=true',
])('valida consultas antes de usar SQL: %s', async (q) => {
  expect((await req(q)).status).toBe(400);
});
it('confronta coortes, período anterior, limites UTC, exclusão administrativa e união de atividades com SQL real', async () => {
  const r = await req();
  expect(r.status).toBe(200);
  expect(r.headers.get('cache-control')).toBe('no-store');
  const d = r.json as PainelAnalitico;
  expect(d.atual).toEqual({ cadastros: 2, concluidos: 1, ativos: 2 });
  expect(d.comparacao).toEqual({ cadastros: 0, concluidos: 0, ativos: 1 });
  expect(d.serie.map((p) => p.metricas)).toEqual([1, 1, 0, 0, 0, 0, 1]);
  expect(d.dominios.find((p) => p.chave === 'metricas')).toMatchObject({
    registros: 3,
    pessoas: 2,
    anterior: 1,
  });
  expect(d.dominios.find((p) => p.chave === 'chat')).toMatchObject({
    registros: 25,
    pessoas: 1,
    erros: 1,
  });
  for (const p of d.dominios) expect(p.registros).toBeGreaterThan(0);
  expect(d.eventos.itens.some((e) => e.email === admin.email)).toBe(false);
  expect(d.eventos.itens.some((e) => e.estado === 'Conta bloqueada')).toBe(
    true
  );
  expect(JSON.stringify(d)).not.toContain(privado);
  expect(JSON.stringify(d)).not.toContain('1234');
});
it('não soma pessoas distintas entre dias ou domínios ao agrupar semanas e meses', async () => {
  const semanal = await obter(query + '&agrupamento=semana');
  expect(semanal.serie.map((p) => p.ativos)).toEqual([2, 1]);
  expect(semanal.atual.ativos).toBe(2);
  const mensal = await obter(query + '&agrupamento=mes');
  expect(mensal.serie).toHaveLength(1);
  expect(mensal.serie[0]).toMatchObject({
    ativos: 2,
    metricas: 3,
    chat: 25,
    cadastros: 2,
  });
});
it('detalhes usam a mesma população, sem dados clínicos e com paginação estável', async () => {
  const p1 = (await req(query + '&detalhe=chat')).json as PaginaDetalhes;
  const p2 = (await req(query + '&detalhe=chat&pagina=2'))
    .json as PaginaDetalhes;
  expect(p1.total).toBe(25);
  expect(p1.itens).toHaveLength(20);
  expect(p2.itens).toHaveLength(5);
  expect(new Set([...p1.itens, ...p2.itens].map((i) => i.id)).size).toBe(25);
  for (const p of [p1, p2]) {
    expect(JSON.stringify(p)).not.toContain(privado);
    for (const item of p.itens)
      expect(Object.keys(item).sort()).toEqual([
        'data',
        'dominio',
        'email',
        'estado',
        'id',
        'usuarioId',
      ]);
  }
  const metas = await req(query + '&detalhe=metas');
  expect(JSON.stringify(metas.json)).not.toContain(privado);
  expect((metas.json as PaginaDetalhes).itens[0].estado).toBe(
    'Outro estado registrado'
  );
  const ativos = (await req(query + '&detalhe=atividade'))
    .json as PaginaDetalhes;
  expect(ativos.total).toBe(2);
  expect(ativos.itens).toHaveLength(2);
  const cadastros = (await req(query + '&detalhe=cadastros'))
    .json as PaginaDetalhes;
  expect(cadastros.total).toBe(2);
});
it('filtra pelo plano vigente sem multiplicar contas quando há várias assinaturas ativas', async () => {
  const id = randomUUID();
  try {
    await executeStatement(
      `INSERT INTO user_subscriptions(id,user_id,plan_id,current_period_end) SELECT ?,?,id,'2099-02-01' FROM subscription_plans WHERE plan_key='care'`,
      [id, a.id]
    );
    const d = await obter();
    expect(d.atual.cadastros).toBe(1);
    expect(d.atual.ativos).toBe(1);
    expect(d.dominios.find((p) => p.chave === 'chat')?.registros).toBe(0);
    const care = await obter(query.replace('meta', 'care'));
    expect(care.atual.cadastros).toBe(1);
    expect(care.base.multiplasAssinaturas).toBeGreaterThan(0);
  } finally {
    await executeStatement('DELETE FROM user_subscriptions WHERE id=?', [id]);
  }
});
it('zero é contagem real de linhas retidas; séries vazias não fabricam conversão', async () => {
  const d = await obter(
    'inicio=2001-01-01&fim=2001-01-03&plano=sem_assinatura'
  );
  expect(d.atual).toEqual({ cadastros: 0, concluidos: 0, ativos: 0 });
  expect(d.serie).toHaveLength(3);
  expect(d.dominios.every((p) => p.registros === 0)).toBe(true);
});
it('índices da migração cobrem cada fonte temporal sem alterar migrações antigas', async () => {
  const r = await queryRows<{ n: number }>(
    "SELECT COUNT(DISTINCT TABLE_NAME) n FROM information_schema.statistics WHERE table_schema=DATABASE() AND column_name='created_at' AND seq_in_index=1 AND table_name IN ('daily_metrics','daily_reflections','breathing_sessions','chat_turns','user_assessments','goals','habits','appointments','professionals','daily_briefings','ai_plans','user_notifications','memory_episodes','chat_generated_images','users','admin_user_events','subscription_audit_events')"
  );
  expect(r[0].n).toBe(17);
});
