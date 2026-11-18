import * as sensor from './metricas/sensor/route';
import { randomUUID } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { criarUsuario, contar } from '../../../tests/integration/fixtures';
import { chamar } from '../../../tests/integration/http';
import { queryRows, executeStatement } from '@/lib/mysql/pool';
import {
  criarPeriodo,
  editarPeriodo,
  agirNoPeriodo,
  lerCentralDoDescanso,
} from '@/lib/descanso/servico';
import {
  resumoDoDescanso,
  adaptacoesDasMetas,
  periodosParaSequencias,
} from '@/lib/descanso/repositorio';
import { datasNeutras } from '@/lib/descanso/calendario';
import { atualizarMetasESequencias } from '@/lib/metas/servico';
import { getUserStreaks } from '@/lib/kpi/streak-repository';
import {
  criarLembrete,
  processarLembretes,
  agirSobreAviso,
} from '@/lib/lembretes/servico';
import {
  criarNotificacao,
  listarNotificacoes,
} from '@/lib/notificacoes/servico';
import { exportarDadosDoTitular, excluirConta } from '@/lib/lgpd/conta';
import { somarDias } from '@/lib/acontecimentos/analise';
import type { DadosDoPeriodo } from '@/lib/descanso/esquema';
import type { UsuarioDeTeste } from '../../../tests/integration/fixtures';
import * as central from './descanso/route';
import * as individual from './descanso/[id]/route';
const base = new Date('2026-10-20T12:00:00Z');
const quando = (dia: string, hora = '12:00') =>
  new Date(`2026-10-${dia}T${hora}:00Z`);
const proposta = (): DadosDoPeriodo & { pedidoId: string } => ({
  pedidoId: randomUUID(),
  inicio: '2026-10-20',
  fim: null,
  retornoDias: 0,
  atividade: null,
  metas: [],
});
async function meta(u: UsuarioDeTeste, prazo = '2026-10-22') {
  const id = randomUUID();
  await executeStatement(
    'INSERT INTO goals(id,user_id,title,target_value,current_value,deadline,status) VALUES(?,?,?,?,?,?,?)',
    [id, u.id, 'Minha leitura', 10, 2, prazo, 'in_progress']
  );
  return id;
}
async function preparar(p: Partial<ReturnType<typeof proposta>> = {}) {
  const u = await criarUsuario(),
    dados = { ...proposta(), ...p },
    { id } = await criarPeriodo(u.session, dados, base);
  return { u, id, dados };
}
async function recurso(chave: string, enabled: boolean) {
  await executeStatement(
    "UPDATE plan_entitlements e JOIN subscription_plans p ON p.id=e.plan_id JOIN plan_features f ON f.id=e.feature_id SET e.enabled=? WHERE p.plan_key='care' AND f.feature_key=?",
    [enabled, chave]
  );
}
async function lembrete(
  u: UsuarioDeTeste,
  tipo: 'checkin' | 'respiracao' | 'habito' = 'checkin',
  hora = '08:00'
) {
  const id = await criarLembrete(
    u.id,
    {
      titulo: 'Meu convite ' + tipo,
      atividade: tipo,
      hora,
      dias: [0, 1, 2, 3, 4, 5, 6],
      ativo: true,
    },
    quando('19', '06:00')
  );
  await executeStatement(
    'UPDATE reminder_preferences SET timezone_since=?,quiet_enabled=FALSE WHERE user_id=?',
    [quando('19', '06:00'), u.id]
  );
  return id;
}
describe('descanso real, avisos, metas e dias neutros no MySQL', () => {
  it('exige sessão em todas as leituras e mutações', async () => {
    for (const [h, m] of [
      [central.GET, 'GET'],
      [central.POST, 'POST'],
      [individual.PUT, 'PUT'],
      [individual.POST, 'POST'],
    ] as const)
      expect(
        (
          await chamar(h, {
            usuario: null,
            method: m,
            params: { id: randomUUID() },
            ...(m === 'GET' ? {} : { body: {} }),
          })
        ).status
      ).toBe(401);
  });
  it('cria proposta idempotente concorrente com meta sem esgotar conexões nem duplicar período', async () => {
    const u = await criarUsuario(),
      g = await meta(u),
      p = { ...proposta(), metas: [g] };
    const rs = await Promise.all(
      Array.from({ length: 20 }, () => criarPeriodo(u.session, p, base))
    );
    expect(rs.filter((r) => r.criada)).toHaveLength(1);
    expect(new Set(rs.map((r) => r.id)).size).toBe(1);
    expect(
      await contar(
        'SELECT COUNT(*) total FROM rest_goal_links WHERE user_id=?',
        [u.id]
      )
    ).toBe(1);
    await expect(
      criarPeriodo(u.session, { ...p, retornoDias: 3 }, base)
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(
      (await lerCentralDoDescanso(u.session, null, base)).atual
    ).toMatchObject({ id: p.pedidoId, estado: 'ativa', fuso: 'UTC' });
  });
  it('serializa pedidos distintos, mantendo somente um descanso atual', async () => {
    const u = await criarUsuario(),
      rs = await Promise.allSettled(
        Array.from({ length: 8 }, () =>
          criarPeriodo(u.session, proposta(), base)
        )
      );
    expect(rs.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(
      await contar('SELECT COUNT(*) total FROM rest_periods WHERE user_id=?', [
        u.id,
      ])
    ).toBe(1);
  });
  it('recusa início passado, futuro excessivo e contratos com datas ou campos inválidos', async () => {
    const u = await criarUsuario();
    for (const inicio of ['2026-10-19', '2028-10-20'])
      await expect(
        criarPeriodo(u.session, { ...proposta(), inicio }, base)
      ).rejects.toMatchObject({ statusCode: 400 });
    for (const v of [
      { inicio: '2026-02-30' },
      { metas: ['outro'] },
      { retornoDias: 2 },
      { cancelarAssinatura: true },
    ])
      expect(
        (
          await chamar(central.POST, {
            usuario: u,
            method: 'POST',
            body: { ...proposta(), ...v },
          })
        ).status
      ).toBe(400);
  });
  it('isola períodos, edição, ações e cursor por titular, também na chave estrangeira', async () => {
    const { u: a, id, dados } = await preparar(),
      b = await criarUsuario(),
      g = await meta(b);
    for (const [h, m, body] of [
      [individual.PUT, 'PUT', { ...dados, pedidoId: undefined, versao: 1 }],
      [individual.POST, 'POST', { acao: 'encerrar', versao: 1 }],
    ] as const)
      expect(
        (await chamar(h, { usuario: b, method: m, params: { id }, body }))
          .status
      ).toBe(404);
    expect(
      (
        await chamar(central.GET, {
          usuario: b,
          path: '/api/descanso?antes=' + id,
        })
      ).status
    ).toBe(404);
    await expect(
      executeStatement(
        'INSERT INTO rest_goal_links(period_id,user_id,goal_id,original_deadline) VALUES(?,?,?,?)',
        [id, a.id, g, '2026-10-22']
      )
    ).rejects.toMatchObject({ code: 'ER_NO_REFERENCED_ROW_2' });
  });
  it('valida propriedade, andamento, prazo e permissão das metas relacionadas', async () => {
    const a = await criarUsuario(),
      b = await criarUsuario(),
      gb = await meta(b),
      g = await meta(a);
    await expect(
      criarPeriodo(a.session, { ...proposta(), metas: [gb] }, base)
    ).rejects.toMatchObject({ statusCode: 400 });
    await recurso('goal_progress_tracking', false);
    try {
      await expect(
        criarPeriodo(a.session, { ...proposta(), metas: [g] }, base)
      ).rejects.toMatchObject({ statusCode: 403 });
    } finally {
      await recurso('goal_progress_tracking', true);
    }
    expect(
      await contar('SELECT COUNT(*) total FROM rest_periods WHERE user_id=?', [
        a.id,
      ])
    ).toBe(0);
    await executeStatement("UPDATE goals SET status='completed' WHERE id=?", [
      g,
    ]);
    await expect(
      criarPeriodo(a.session, { ...proposta(), metas: [g] }, base)
    ).rejects.toMatchObject({ statusCode: 400 });
  });
  it('permite alterar o fim sem apagar dias passados ou trocar início e metas depois da ativação', async () => {
    const { u, id, dados } = await preparar();
    await expect(
      editarPeriodo(
        u.session,
        id,
        { ...dados, inicio: '2026-10-21', versao: 1 },
        quando('21')
      )
    ).rejects.toMatchObject({ statusCode: 409 });
    await expect(
      editarPeriodo(
        u.session,
        id,
        { ...dados, fim: '2026-10-20', versao: 1 },
        quando('21')
      )
    ).rejects.toMatchObject({ statusCode: 400 });
    await editarPeriodo(
      u.session,
      id,
      { ...dados, fim: '2026-10-22', retornoDias: 3, versao: 1 },
      quando('21')
    );
    expect(
      (await resumoDoDescanso(u.id, quando('22', '23:59'))).atual?.estado
    ).toBe('ativa');
    expect(
      (await resumoDoDescanso(u.id, quando('23', '00:00'))).atual?.estado
    ).toBe('retorno');
    expect((await resumoDoDescanso(u.id, quando('26'))).atual).toBeNull();
    const [p] = await queryRows<{ ended_at: string | null }>(
      'SELECT ended_at FROM rest_periods WHERE id=?',
      [id]
    );
    expect(p.ended_at).toBeNull();
  });
  it('agenda início e fim, permite reagendar e cancelar antes de começar sem neutralizar dias', async () => {
    const { u, id, dados } = await preparar({
      inicio: '2026-10-22',
      fim: '2026-10-23',
    });
    expect((await resumoDoDescanso(u.id, base)).atual?.estado).toBe('agendada');
    await editarPeriodo(
      u.session,
      id,
      { ...dados, inicio: '2026-10-23', fim: '2026-10-24', versao: 1 },
      quando('21')
    );
    await agirNoPeriodo(u.id, id, 'cancelar', 2, quando('22'));
    expect((await resumoDoDescanso(u.id, quando('24'))).atual).toBeNull();
    expect(
      datasNeutras(
        await periodosParaSequencias(u.id, '2026-10-25'),
        '2026-10-20',
        '2026-10-25'
      ).size
    ).toBe(0);
    await expect(
      editarPeriodo(u.session, id, { ...dados, versao: 3 }, quando('24'))
    ).rejects.toMatchObject({ statusCode: 409 });
  });
  it('encerra pausa aberta e retorno com horário real preservando o dia tocado', async () => {
    const { u, id } = await preparar({ retornoDias: 7, atividade: 'checkin' });
    await agirNoPeriodo(u.id, id, 'encerrar', 1, quando('22', '15:00'));
    let r = await resumoDoDescanso(u.id, quando('22', '15:01'));
    expect(r.atual).toMatchObject({
      estado: 'retorno',
      dataEncerramento: '2026-10-22',
      encerradaEm: '2026-10-22T15:00:00.000Z',
      inicioRetorno: '2026-10-22',
      fimRetorno: '2026-10-28',
    });
    await agirNoPeriodo(u.id, id, 'concluir_retorno', 2, quando('24', '16:00'));
    r = await resumoDoDescanso(u.id, quando('24', '16:01'));
    expect(r.atual).toBeNull();
    const datas = datasNeutras(
      await periodosParaSequencias(u.id, '2026-10-28'),
      '2026-10-20',
      '2026-10-28'
    );
    expect([...datas]).toEqual([
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
    ]);
  });
  it('recusa versão antiga em edições e encerramentos concorrentes', async () => {
    const { u, id, dados } = await preparar();
    const rs = await Promise.allSettled([
      editarPeriodo(
        u.session,
        id,
        { ...dados, fim: '2026-10-23', versao: 1 },
        quando('21')
      ),
      agirNoPeriodo(u.id, id, 'encerrar', 1, quando('21')),
    ]);
    expect(rs.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const r = rs.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(r.reason).toMatchObject({ statusCode: 409 });
  });
  it('adapta prazo efetivo sem alterar alvo, valor real ou prazo original', async () => {
    const u = await criarUsuario(),
      g = await meta(u);
    await criarPeriodo(u.session, { ...proposta(), metas: [g] }, base);
    await atualizarMetasESequencias(u.id, quando('23'));
    const [row] = await queryRows<{
      deadline: string;
      current_value: number;
      target_value: number;
      status: string;
    }>(
      'SELECT deadline,current_value,target_value,status FROM goals WHERE id=?',
      [g]
    );
    expect(row).toMatchObject({
      deadline: '2026-10-22',
      current_value: 2,
      target_value: 10,
      status: 'in_progress',
    });
    expect(await adaptacoesDasMetas(u.id, '2026-10-23', quando('23'))).toEqual([
      {
        id: g,
        prazoOriginal: '2026-10-22',
        prazoEfetivo: '2026-10-26',
        diasNeutros: 4,
        emDescanso: true,
      },
    ]);
  });
  it('combina pausas sucessivas sem dupla contagem e respeita edição manual do prazo', async () => {
    const u = await criarUsuario(),
      g = await meta(u);
    await criarPeriodo(
      u.session,
      { ...proposta(), fim: '2026-10-22', retornoDias: 3, metas: [g] },
      base
    );
    await atualizarMetasESequencias(u.id, quando('26'));
    expect(
      (await lerCentralDoDescanso(u.session, null, quando('26'))).metas.find(
        (m) => m.id === g
      )?.prazo
    ).toBe('2026-10-28');
    await criarPeriodo(
      u.session,
      { ...proposta(), inicio: '2026-10-26', metas: [g] },
      quando('26')
    );
    expect(
      (await adaptacoesDasMetas(u.id, '2026-10-26', quando('26')))[0]
    ).toMatchObject({ diasNeutros: 7, prazoEfetivo: '2026-10-29' });
    await executeStatement('UPDATE goals SET deadline=? WHERE id=?', [
      '2026-11-05',
      g,
    ]);
    expect(await adaptacoesDasMetas(u.id, '2026-10-27', quando('27'))).toEqual(
      []
    );
  });
  it('preserva registros e conta somente dias cumpridos fora de pausa e retorno nas sequências', async () => {
    const u = await criarUsuario();
    for (const d of ['18', '19', '20', '21'])
      await executeStatement(
        'INSERT INTO daily_metrics(id,user_id,date,steps) VALUES(?,?,?,?)',
        [randomUUID(), u.id, '2026-10-' + d, 9000]
      );
    await criarPeriodo(u.session, proposta(), base);
    await atualizarMetasESequencias(u.id, quando('21'));
    let streak = (await getUserStreaks(u.id)).find(
      (s) => s.streak_type === 'movement'
    );
    expect(streak).toMatchObject({
      current_streak: 2,
      longest_streak: 2,
      last_activity_date: '2026-10-19',
    });
    expect(
      await contar('SELECT COUNT(*) total FROM daily_metrics WHERE user_id=?', [
        u.id,
      ])
    ).toBe(4);
    const p = (await resumoDoDescanso(u.id, quando('21'))).atual!;
    await agirNoPeriodo(u.id, p.id, 'encerrar', 1, quando('21'));
    await atualizarMetasESequencias(u.id, quando('23'));
    streak = (await getUserStreaks(u.id)).find(
      (s) => s.streak_type === 'movement'
    );
    expect(streak?.current_streak).toBe(0);
  });
  it('dispensa pendências e silencia convites sem desligar recorrências nem mexer nos avisos comerciais', async () => {
    const u = await criarUsuario(),
      l = await lembrete(u);
    expect(await processarLembretes(u.id, quando('20', '09:00'))).toBe(1);
    await criarNotificacao(
      {
        userId: u.id,
        tipo: 'coach_dia',
        titulo: 'Seu dia',
        corpo: 'Convite',
        link: '/dia',
        chave: 'dia:qa',
      },
      quando('20', '09:01')
    );
    await criarPeriodo(u.session, proposta(), base);
    expect(await processarLembretes(u.id, quando('20', '13:00'))).toBe(0);
    expect(
      await criarNotificacao(
        {
          userId: u.id,
          tipo: 'coach_alerta',
          titulo: 'Convite',
          corpo: 'Texto',
          link: '/dia',
          chave: 'alerta:qa',
        },
        quando('20', '13:01')
      )
    ).toBe(false);
    const notifs = await listarNotificacoes(u.id, 30, quando('20', '13:02'));
    expect(notifs.naoLidas).toBe(0);
    expect(notifs.notificacoes.length).toBe(2);
    const [r] = await queryRows<{ enabled: number }>(
      'SELECT enabled FROM personal_reminders WHERE id=?',
      [l]
    );
    expect(r.enabled).toBe(1);
    expect(
      await contar(
        "SELECT COUNT(*) total FROM reminder_occurrences WHERE user_id=? AND state='dismissed'",
        [u.id]
      )
    ).toBe(1);
  });
  it('aplica início e fim programados nos avisos sem depender de página aberta no período', async () => {
    const u = await criarUsuario();
    await lembrete(u);
    await criarPeriodo(
      u.session,
      { ...proposta(), inicio: '2026-10-21', fim: '2026-10-21' },
      base
    );
    expect(await processarLembretes(u.id, quando('20', '13:00'))).toBe(1);
    expect(await processarLembretes(u.id, quando('21', '09:00'))).toBe(0);
    expect(await processarLembretes(u.id, quando('22', '09:00'))).toBe(1);
    expect(
      await contar(
        'SELECT COUNT(*) total FROM personal_reminders WHERE user_id=?',
        [u.id]
      )
    ).toBe(1);
  });
  it('retorno libera só a atividade escolhida e no máximo uma entrega diária, mesmo em várias abas', async () => {
    const u = await criarUsuario();
    await lembrete(u, 'checkin', '08:00');
    await lembrete(u, 'checkin', '08:01');
    await lembrete(u, 'respiracao', '08:00');
    await criarPeriodo(
      u.session,
      {
        ...proposta(),
        fim: '2026-10-20',
        retornoDias: 3,
        atividade: 'checkin',
      },
      base
    );
    const rs = await Promise.all(
      Array.from({ length: 5 }, () =>
        processarLembretes(u.id, quando('21', '09:00'))
      )
    );
    expect(rs.reduce((a, b) => a + b, 0)).toBe(1);
    expect(await processarLembretes(u.id, quando('21', '10:00'))).toBe(0);
    expect(await processarLembretes(u.id, quando('22', '09:00'))).toBe(1);
    const [aviso] = await queryRows<{ id: string; version: number }>(
      "SELECT id,version FROM reminder_occurrences WHERE user_id=? AND state='delivered' ORDER BY scheduled_at DESC",
      [u.id]
    );
    await expect(
      agirSobreAviso(
        u.id,
        aviso.id,
        { acao: 'adiar', minutos: 10, versao: aviso.version },
        quando('22', '09:01')
      )
    ).rejects.toMatchObject({ statusCode: 409 });
  });
  it('não entrega aviso originado durante a pausa depois que ela terminou', async () => {
    const u = await criarUsuario(),
      l = await lembrete(u);
    await criarPeriodo(u.session, { ...proposta(), fim: '2026-10-21' }, base);
    const id = randomUUID();
    await executeStatement(
      'INSERT INTO reminder_occurrences(id,user_id,reminder_id,occurrence_date,scheduled_at,next_delivery_at) VALUES(?,?,?,?,?,?)',
      [id, u.id, l, '2026-10-21', quando('21', '08:00'), quando('22', '08:00')]
    );
    await processarLembretes(u.id, quando('22', '09:00'));
    const [r] = await queryRows<{ state: string }>(
      'SELECT state FROM reminder_occurrences WHERE id=?',
      [id]
    );
    expect(r.state).toBe('dismissed');
    expect(
      await contar(
        'SELECT COUNT(*) total FROM user_notifications WHERE user_id=? AND dedupe_key LIKE ?',
        [u.id, '%' + id + '%']
      )
    ).toBe(0);
  });
  it('revalida atividade do retorno sem usar a pausa como acesso a recurso revogado', async () => {
    const u = await criarUsuario();
    await recurso('guided_breathing', false);
    try {
      await expect(
        criarPeriodo(
          u.session,
          { ...proposta(), retornoDias: 3, atividade: 'respiracao' },
          base
        )
      ).rejects.toMatchObject({ statusCode: 403 });
    } finally {
      await recurso('guided_breathing', true);
    }
    expect(
      await contar('SELECT COUNT(*) total FROM rest_periods WHERE user_id=?', [
        u.id,
      ])
    ).toBe(0);
  });
  it('preserva fuso da pausa após mudança no perfil e mantém a data real de encerramento', async () => {
    const u = await criarUsuario();
    await executeStatement(
      "UPDATE profiles SET residence_location='Apia',residence_latitude=-13.83,residence_longitude=-171.75,residence_timezone='Pacific/Apia' WHERE id=?",
      [u.id]
    );
    const { id } = await criarPeriodo(
      u.session,
      { ...proposta(), inicio: '2026-10-21' },
      base
    );
    await executeStatement(
      "UPDATE profiles SET residence_location='Los Angeles',residence_latitude=34.05,residence_longitude=-118.24,residence_timezone='America/Los_Angeles' WHERE id=?",
      [u.id]
    );
    expect((await resumoDoDescanso(u.id, base)).atual).toMatchObject({
      fuso: 'Pacific/Apia',
      hoje: '2026-10-21',
    });
    await agirNoPeriodo(u.id, id, 'encerrar', 1, base);
    const [p] = await queryRows<{ ended_date: string; ended_at: string }>(
      'SELECT ended_date,ended_at FROM rest_periods WHERE id=?',
      [id]
    );
    expect(p.ended_date).toBe('2026-10-21');
    expect(p.ended_at).toContain('2026-10-20 12:00:00');
  });
  it('pagina todo o histórico sem vazar o de outro titular', async () => {
    const u = await criarUsuario();
    for (let i = 0; i < 25; i++) {
      const data = somarDias('2026-01-01', i);
      await criarPeriodo(
        u.session,
        { ...proposta(), inicio: data, fim: data },
        new Date(data + 'T12:00:00Z')
      );
    }
    const a = await lerCentralDoDescanso(u.session, null, quando('28')),
      b = await lerCentralDoDescanso(u.session, a.proximo, quando('28'));
    expect(a.historico).toHaveLength(20);
    expect(b.historico).toHaveLength(5);
    expect(
      new Set([...a.historico, ...b.historico].map((p) => p.id)).size
    ).toBe(25);
    expect(b.proximo).toBeNull();
  });
  it('exporta e exclui os dados do descanso, preservando registros e assinatura durante o uso', async () => {
    const u = await criarUsuario(),
      g = await meta(u);
    await lerCentralDoDescanso(u.session, null, base);
    const antes = await queryRows(
      'SELECT plan_id,status,current_period_end,source FROM user_subscriptions WHERE user_id=?',
      [u.id]
    );
    await criarPeriodo(u.session, { ...proposta(), metas: [g] }, base);
    expect(
      await queryRows(
        'SELECT plan_id,status,current_period_end,source FROM user_subscriptions WHERE user_id=?',
        [u.id]
      )
    ).toEqual(antes);
    const exp = await exportarDadosDoTitular(u.id);
    expect((exp.rest_periods as unknown[]).length).toBe(1);
    expect((exp.rest_goal_links as unknown[]).length).toBe(1);
    expect(
      (
        await chamar(central.GET, {
          usuario: u,
          path: '/api/descanso?resumo=1',
        })
      ).headers.get('cache-control')
    ).toBe('private, no-store');
    await excluirConta(u.id);
    expect(
      await contar('SELECT COUNT(*) total FROM rest_periods WHERE user_id=?', [
        u.id,
      ])
    ).toBe(0);
    expect(
      await contar(
        'SELECT COUNT(*) total FROM rest_goal_links WHERE user_id=?',
        [u.id]
      )
    ).toBe(0);
  });
  it('não recria um horário vencido durante a pausa quando o app só volta depois do encerramento', async () => {
    const u = await criarUsuario();
    await lembrete(u, 'checkin', '13:00');
    const { id } = await criarPeriodo(u.session, proposta(), base);
    await agirNoPeriodo(u.id, id, 'encerrar', 1, quando('20', '14:00'));
    expect(await processarLembretes(u.id, quando('20', '14:01'))).toBe(0);
    expect(
      await contar(
        "SELECT COUNT(*) total FROM user_notifications WHERE user_id=? AND kind='lembrete_pessoal'",
        [u.id]
      )
    ).toBe(0);
  });
  it('não recupera horário do dia local pausado quando os fusos do lembrete e da pausa diferem', async () => {
    const u = await criarUsuario();
    await lembrete(u);
    await executeStatement(
      "UPDATE profiles SET residence_location='Apia',residence_latitude=-13.83,residence_longitude=-171.75,residence_timezone='Pacific/Apia' WHERE id=?",
      [u.id]
    );
    await criarPeriodo(
      u.session,
      {
        ...proposta(),
        fim: '2026-10-20',
        retornoDias: 3,
        atividade: 'checkin',
      },
      quando('19')
    );
    expect(await processarLembretes(u.id, quando('20', '12:00'))).toBe(0);
    expect(await processarLembretes(u.id, quando('21', '09:00'))).toBe(1);
  });
  it('preserva alertas anteriores do sensor como não lidos ao pausar e durante o retorno', async () => {
    const u = await criarUsuario();
    await criarNotificacao(
      {
        userId: u.id,
        tipo: 'coach_alerta',
        titulo: 'Alerta do sensor',
        corpo: 'Registro do sensor',
        link: '/monitoring',
        chave: 'fc-alta:2026-10-20',
      },
      quando('20', '11:00')
    );
    await criarNotificacao(
      {
        userId: u.id,
        tipo: 'coach_alerta',
        titulo: 'Convite do coach',
        corpo: 'Sugestão do dia',
        link: '/dia',
        chave: 'alerta:2026-10-20:contexto',
      },
      quando('20', '11:01')
    );
    const { id } = await criarPeriodo(
      u.session,
      { ...proposta(), retornoDias: 3 },
      base
    );
    let lista = await listarNotificacoes(u.id, 30, quando('20', '13:00'));
    expect(lista.naoLidas).toBe(1);
    expect(
      lista.notificacoes.find((n) => n.titulo === 'Alerta do sensor')?.lida
    ).toBe(false);
    expect(
      lista.notificacoes.find((n) => n.titulo === 'Convite do coach')?.lida
    ).toBe(true);
    await agirNoPeriodo(u.id, id, 'encerrar', 1, quando('20', '14:00'));
    lista = await listarNotificacoes(u.id, 30, quando('20', '14:01'));
    expect(lista.naoLidas).toBe(1);
  });
  it('continua emitindo o alerta real da rota do sensor durante o descanso', async () => {
    const u = await criarUsuario();
    const [plano] = await queryRows<{ id: string }>(
      "SELECT id FROM subscription_plans WHERE plan_key='care'"
    );
    await executeStatement(
      "INSERT INTO user_subscriptions(id,user_id,plan_id,current_period_end,source) VALUES(?,?,?,UTC_TIMESTAMP()+INTERVAL 1 MONTH,'teste-descanso')",
      [randomUUID(), u.id, plano.id]
    );
    await executeStatement('UPDATE profiles SET age=40 WHERE id=?', [u.id]);
    const hoje = new Date().toISOString().slice(0, 10);
    await criarPeriodo(u.session, { ...proposta(), inicio: hoje }, new Date());
    const r = await chamar(sensor.POST, {
      usuario: u,
      method: 'POST',
      body: {
        data: hoje,
        minutos: 10,
        amostras: 600,
        fcMinima: 60,
        fcMaxima: 180,
        fcMedia: 100,
        fcRepousoEstimada: 65,
        rmssd: 35,
      },
    });
    expect(r.status).toBe(200);
    const avisos = await queryRows<{
      kind: string;
      read_at: string | null;
      dedupe_key: string;
    }>(
      "SELECT kind,read_at,dedupe_key FROM user_notifications WHERE user_id=? AND dedupe_key LIKE 'fc-alta:%'",
      [u.id]
    );
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toMatchObject({ kind: 'coach_alerta', read_at: null });
    expect((await listarNotificacoes(u.id)).naoLidas).toBe(1);
  });
});
