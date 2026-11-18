import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  criarUsuario,
  type UsuarioDeTeste,
  definirAgendamentosParaUsuarios,
} from '../../../tests/integration/fixtures';
import { chamar } from '../../../tests/integration/http';
import { executeStatement, queryRows } from '@/lib/mysql/pool';
import {
  assignPlanToUserByAdmin,
  getPlanMatrix,
  requireFeatureEnabled,
  updatePlanMatrixByKey,
} from '@/lib/plans/service';
import { isPlanFeatureEnabled } from '@/lib/plans/access';
import { processarFilaDaMemoria } from '@/lib/memoria/servico';
import { criarNotificacao } from '@/lib/notificacoes/servico';
import {
  PLAN_FEATURE_KEYS,
  type AccountSubscriptionSummary,
  type PlanFeatureKey,
  type PlanMatrixPlan,
  PLANO_DE_BASE,
  PLANOS_COMERCIAIS_ATIVOS,
} from '@/types/subscription';
import * as matrix from './admin/plans/[planKey]/route';
import * as summary from './account/subscription/route';
import * as data from './data/[table]/route';
import * as scores from './functions/calculate-longevity-score/route';
import * as tips from './dicas/hoje/route';
import * as sensor from './metricas/sensor/route';
import * as checkin from './metricas/dia/route';
import * as chat from './functions/ask-ai-assistant/route';
import * as plan from './plano/route';
import * as week from './semana/route';
import * as breath from './respiracao/route';
import * as reflection from './reflexao/route';
import * as vedic from './astrologia/mapa/route';
import * as calendar from './calendario/assinatura/route';
import * as conversations from './chat/conversas/route';
import * as images from './chat/imagens/[id]/route';
import * as memory from './memoria/route';
import * as notifications from './notificacoes/route';
import * as users from './admin/users/route';
import * as generation from './functions/generate-ai-plan/route';
import * as oneConversation from './chat/conversas/[id]/route';
import * as feedback from './coach/feedback/route';
import * as ephemeris from './astrology/ephemeris/route';
import * as feed from './calendario/feed/[arquivo]/route';
import { cidadePorId } from '@/lib/geo/cidades';

// Pré-condição: agenda liberada para usuários (o padrão é desativado, tarefa
// 134). Este arquivo verifica os direitos do plano sobre consultas e
// profissionais.
beforeAll(() => definirAgendamentosParaUsuarios(true));
afterAll(() => definirAgendamentosParaUsuarios(false));

let admin: UsuarioDeTeste;
let original: PlanMatrixPlan[];
const contas: string[] = [];
const hoje = () => new Date().toISOString().slice(0, 10);
async function pessoa() {
  const u = await criarUsuario();
  contas.push(u.id);
  return u;
}
async function alterar(
  plano: PlanMatrixPlan,
  key: PlanFeatureKey,
  enabled: boolean,
  quotaValue: number | null = null
) {
  const f = plano.features.find((f) => f.key === key)!;
  return chamar(matrix.PATCH, {
    method: 'PATCH',
    usuario: admin,
    params: { planKey: plano.key },
    body: { ...plano, features: [{ ...f, enabled, quotaValue }] },
  });
}
const table = (name: string, usuario: UsuarioDeTeste) =>
  chamar(data.GET, { params: { table: name }, usuario });
async function serviceProbe(usuario: UsuarioDeTeste, key: PlanFeatureKey) {
  try {
    await requireFeatureEnabled(usuario.session, key);
    return 200;
  } catch (e) {
    if (e && typeof e === 'object' && 'statusCode' in e)
      return Number(e.statusCode);
    throw e;
  }
}

// Cada chave tem uma entrada real; monitoramento/voz e o painel executam no cliente.
const probes: Record<PlanFeatureKey, (u: UsuarioDeTeste) => Promise<number>> = {
  health_intelligence: (u) => serviceProbe(u, 'health_intelligence'),
  dashboard_access: (u) => serviceProbe(u, 'dashboard_access'),
  ai_scores: async (u) =>
    (await chamar(scores.POST, { method: 'POST', usuario: u, body: {} }))
      .status,
  ai_tips_feed: async (u) => (await chamar(tips.GET, { usuario: u })).status,
  profile_management: async (u) => (await table('profiles', u)).status,
  goal_progress_tracking: async (u) => (await table('goals', u)).status,
  wearable_bluetooth_connection: async (u) =>
    (
      await chamar(sensor.POST, {
        method: 'POST',
        usuario: u,
        body: {
          data: hoje(),
          minutos: 10,
          amostras: 600,
          fcMinima: 58,
          fcMaxima: 96,
          fcMedia: 72,
          fcRepousoEstimada: 61,
          rmssd: 48.2,
        },
      })
    ).status,
  realtime_monitoring: (u) => serviceProbe(u, 'realtime_monitoring'),
  voice_monitoring_updates: (u) => serviceProbe(u, 'voice_monitoring_updates'),
  ai_chat_messages: async (u) =>
    (
      await chamar(chat.POST, {
        method: 'POST',
        usuario: u,
        body: { query: 'Olá' },
      })
    ).status,
  ai_plan_generations: async (u) =>
    (await chamar(plan.GET, { usuario: u })).status,
  professionals_total: async (u) => (await table('professionals', u)).status,
  appointments_active: async (u) => (await table('appointments', u)).status,
  metrics_history_days: async (u) => (await table('daily_metrics', u)).status,
  daily_checkin: async (u) =>
    (
      await chamar(checkin.GET, {
        usuario: u,
        path: `/api/metricas/dia?data=${hoje()}`,
      })
    ).status,
  weekly_review: async (u) => (await chamar(week.GET, { usuario: u })).status,
  guided_breathing: async (u) =>
    (await chamar(breath.GET, { usuario: u })).status,
  evening_reflection: async (u) =>
    (await chamar(reflection.GET, { usuario: u })).status,
  vedic_insights: async (u) => (await chamar(vedic.GET, { usuario: u })).status,
  calendar_integration: async (u) =>
    (await chamar(calendar.GET, { usuario: u })).status,
  personal_habits: async (u) => (await table('habits', u)).status,
  wellbeing_assessments: async (u) =>
    (await table('user_assessments', u)).status,
  chat_history: async (u) =>
    (
      await chamar(conversations.GET, {
        usuario: u,
        path: '/api/chat/conversas',
      })
    ).status,
  chat_images: async (u) =>
    (
      await chamar(images.GET, {
        usuario: u,
        params: { id: randomUUID() },
        path: '/api/chat/imagens',
      })
    ).status,
  lyra_memory: async (u) =>
    (await chamar(memory.GET, { usuario: u, path: '/api/memoria' })).status,
  personal_notifications: async (u) =>
    (await chamar(notifications.GET, { usuario: u })).status,
};

beforeAll(async () => {
  admin = await criarUsuario('admin');
  contas.push(admin.id);
  original = (await getPlanMatrix()).plans;
});
afterAll(async () => {
  for (const p of original ?? [])
    if (p.key !== 'admin') await updatePlanMatrixByKey(p.key, p);
  for (const id of contas)
    await executeStatement('DELETE FROM users WHERE id=?', [id]);
});

describe.each(PLANOS_COMERCIAIS_ATIVOS)('matriz real · %s', (key) => {
  let p: PlanMatrixPlan;
  let u: UsuarioDeTeste;
  beforeAll(async () => {
    p = original.find((p) => p.key === key)!;
    u = await pessoa();
    await assignPlanToUserByAdmin({
      targetUserId: u.id,
      actorUserId: admin.id,
      planKey: key,
    });
    expect(
      (
        await chamar(matrix.PATCH, {
          method: 'PATCH',
          usuario: admin,
          params: { planKey: key },
          body: {
            ...p,
            features: p.features.map((f) => ({
              ...f,
              enabled: true,
              quotaValue: null,
            })),
          },
        })
      ).status
    ).toBe(200);
  });
  afterAll(async () => {
    await updatePlanMatrixByKey(key, p);
  });
  for (const feature of PLAN_FEATURE_KEYS)
    it(`${feature}: persiste e controla a sessão já existente`, async () => {
      expect(Object.keys(probes).sort()).toEqual([...PLAN_FEATURE_KEYS].sort());
      const off = await alterar(p, feature, false);
      if (feature === 'profile_management') {
        expect(off.status).toBe(400);
        expect(await probes[feature](u)).toBe(200);
        return;
      }
      expect(off.status, off.texto).toBe(200);
      const s = (await chamar(summary.GET, { usuario: u }))
        .json as AccountSubscriptionSummary;
      expect(isPlanFeatureEnabled(s, feature)).toBe(false);
      expect(await probes[feature](u)).toBe(403);
      expect((await alterar(p, feature, true)).status).toBe(200);
      const updated = (await chamar(summary.GET, { usuario: u }))
        .json as AccountSubscriptionSummary;
      expect(isPlanFeatureEnabled(updated, feature)).toBe(true);
      // Sem uma imagem existente, a leitura habilitada chega ao isolamento/404.
      expect(await probes[feature](u)).toBe(
        feature === 'chat_images' ? 404 : 200
      );
      expect((await table('profiles', u)).status).toBe(200);
    });
});

it('Administradores conservam acesso; nenhum plano compra papel administrativo e o plano interno é imutável', async () => {
  const u = await pessoa();
  for (const key of PLANOS_COMERCIAIS_ATIVOS) {
    await assignPlanToUserByAdmin({
      targetUserId: u.id,
      actorUserId: admin.id,
      planKey: key,
    });
    expect((await chamar(users.GET, { usuario: u })).status).toBe(403);
    expect(
      (
        await chamar(matrix.PATCH, {
          method: 'PATCH',
          usuario: u,
          params: { planKey: key },
          body: original.find((p) => p.key === key),
        })
      ).status
    ).toBe(403);
    expect(
      (
        await queryRows<{ role: string }>(
          'SELECT role FROM profiles WHERE id=?',
          [u.id]
        )
      )[0].role
    ).toBe('patient');
  }
  const internal = original.find((p) => p.key === 'admin')!;
  expect(internal.isPublic).toBe(false);
  expect(internal.features.map((f) => f.key).sort()).toEqual(
    [...PLAN_FEATURE_KEYS].sort()
  );
  expect(
    internal.features.every((f) => f.enabled && f.quotaValue === null)
  ).toBe(true);
  expect(
    (
      await chamar(matrix.PATCH, {
        method: 'PATCH',
        usuario: admin,
        params: { planKey: 'admin' },
        body: internal,
      })
    ).status
  ).toBe(403);
  const base = original.find((p) => p.key === PLANO_DE_BASE)!;
  try {
    await alterar(base, 'guided_breathing', false);
    expect((await chamar(breath.GET, { usuario: admin })).status).toBe(200);
    expect(
      (
        (await chamar(summary.GET, { usuario: admin }))
          .json as AccountSubscriptionSummary
      ).administrativeAccess
    ).toBe(true);
  } finally {
    await updatePlanMatrixByKey(PLANO_DE_BASE, base);
  }
});

it('rejeita duplicidade e janelas inválidas atomicamente; plano inativo bloqueia uso sem cortar o perfil', async () => {
  const p = original.find((p) => p.key === PLANO_DE_BASE)!;
  const f = p.features.find((f) => f.key === 'ai_chat_messages')!;
  const u = await pessoa();
  try {
    expect(
      (
        await chamar(matrix.PATCH, {
          method: 'PATCH',
          usuario: admin,
          params: { planKey: PLANO_DE_BASE },
          body: { ...p, name: 'Não deve gravar', features: [f, f] },
        })
      ).status
    ).toBe(400);
    expect(
      (
        await chamar(matrix.PATCH, {
          method: 'PATCH',
          usuario: admin,
          params: { planKey: PLANO_DE_BASE },
          body: {
            ...p,
            name: 'Não deve gravar',
            features: [{ ...f, quotaValue: 2, resetInterval: 'rolling' }],
          },
        })
      ).status
    ).toBe(400);
    expect(
      (await getPlanMatrix()).plans.find((p) => p.key === PLANO_DE_BASE)?.name
    ).toBe(p.name);
    await updatePlanMatrixByKey(PLANO_DE_BASE, { ...p, isActive: false });
    expect(await probes.guided_breathing(u)).toBe(403);
    expect(await probes.profile_management(u)).toBe(200);
  } finally {
    await updatePlanMatrixByKey('care', p);
  }
});

it('limites de profissionais e consultas são atômicos em insert, upsert e atualização concorrente', async () => {
  const p = original.find((p) => p.key === 'care')!;
  const u = await pessoa();
  const post = (table: string, values: object, upsert = false) =>
    chamar(data.POST, {
      method: 'POST',
      usuario: u,
      params: { table },
      body: { values, upsert, onConflict: 'id' },
    });
  const future = new Date(Date.now() + 86400000).toISOString();
  try {
    await alterar(p, 'professionals_total', true, 1);
    const attempts = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        post(
          'professionals',
          { id: randomUUID(), name: `Profissional ${i}`, specialty: 'Clínica' },
          Boolean(i % 2)
        )
      )
    );
    expect(attempts.filter((a) => a.status === 200)).toHaveLength(1);
    expect(attempts.filter((a) => a.status === 403)).toHaveLength(7);
    const [professional] = await queryRows<{ id: string }>(
      'SELECT id FROM professionals WHERE user_id=?',
      [u.id]
    );
    expect(
      (
        await post(
          'professionals',
          {
            id: professional.id,
            name: 'Nome atualizado',
            specialty: 'Clínica',
          },
          true
        )
      ).status
    ).toBe(200);
    await alterar(p, 'appointments_active', true, 1);
    const appointments = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        post(
          'appointments',
          {
            id: randomUUID(),
            professional_id: professional.id,
            appointment_time: future,
            status: 'scheduled',
          },
          Boolean(i % 2)
        )
      )
    );
    expect(appointments.filter((a) => a.status === 200)).toHaveLength(1);
    expect(appointments.filter((a) => a.status === 403)).toHaveLength(7);
    await executeStatement('DELETE FROM appointments WHERE user_id=?', [u.id]);
    const ids = [randomUUID(), randomUUID()];
    for (const id of ids)
      expect(
        (
          await post('appointments', {
            id,
            professional_id: professional.id,
            appointment_time: new Date(Date.now() - 86400000).toISOString(),
            status: 'scheduled',
          })
        ).status
      ).toBe(200);
    const edits = await Promise.all(
      ids.map((id) =>
        chamar(data.PATCH, {
          method: 'PATCH',
          usuario: u,
          params: { table: 'appointments' },
          body: {
            values: { appointment_time: future },
            filters: [{ type: 'eq', column: 'id', value: id }],
          },
        })
      )
    );
    expect(edits.filter((a) => a.status === 200)).toHaveLength(1);
    expect(edits.filter((a) => a.status === 403)).toHaveLength(1);
    expect(
      (
        await queryRows<{ total: number }>(
          'SELECT COUNT(*) total FROM appointments WHERE user_id=? AND appointment_time>=UTC_TIMESTAMP()',
          [u.id]
        )
      )[0].total
    ).toBe(1);
  } finally {
    await updatePlanMatrixByKey('care', p);
  }
});

it('a janela vale na API genérica, check-in, score e retrospectiva; zero impede consulta e gravação manual', async () => {
  const p = original.find((p) => p.key === 'care')!;
  const u = await pessoa();
  const past = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  try {
    for (const date of [hoje(), past])
      await executeStatement(
        'INSERT INTO daily_metrics(id,user_id,date,sleep_duration_minutes) VALUES(?,?,?,?)',
        [randomUUID(), u.id, date, 420]
      );
    await alterar(p, 'metrics_history_days', true, 1);
    const r = await table('daily_metrics', u);
    expect(r.status).toBe(200);
    expect(
      (r.json as { data: { date: string }[] }).data.map((d) => d.date)
    ).toEqual([hoje()]);
    expect(
      (
        await chamar(checkin.GET, {
          usuario: u,
          path: `/api/metricas/dia?data=${past}`,
        })
      ).status
    ).toBe(403);
    expect(
      (
        await chamar(scores.POST, {
          method: 'POST',
          usuario: u,
          body: { data: past },
        })
      ).status
    ).toBe(403);
    const w = await chamar(week.GET, { usuario: u });
    expect(w.status).toBe(200);
    expect(
      (
        w.json as { dias: { data: string; sonoMinutos: number | null }[] }
      ).dias.find((d) => d.data === past)?.sonoMinutos
    ).toBeNull();
    await alterar(p, 'metrics_history_days', true, 0);
    expect((await table('daily_metrics', u)).status).toBe(403);
    expect(
      (
        await chamar(checkin.POST, {
          method: 'POST',
          usuario: u,
          body: { data: hoje(), valores: { sono: 8 } },
        })
      ).status
    ).toBe(403);
    expect((await table('profiles', u)).status).toBe(200);
  } finally {
    await updatePlanMatrixByKey('care', p);
  }
});

it('desligar escores interrompe cálculo automático; memória e notificações desligadas não coletam nem processam', async () => {
  const p = original.find((p) => p.key === 'care')!;
  const u = await pessoa();
  try {
    await alterar(p, 'ai_scores', false);
    expect(
      (
        await chamar(checkin.POST, {
          method: 'POST',
          usuario: u,
          body: {
            data: hoje(),
            valores: { sono: 8, humor: 4, energia: 4, estresse: 2 },
          },
        })
      ).status
    ).toBe(200);
    expect(
      (
        await queryRows<{ readiness_score: number | null }>(
          'SELECT readiness_score FROM daily_metrics WHERE user_id=?',
          [u.id]
        )
      )[0].readiness_score
    ).toBeNull();
    await executeStatement(
      'UPDATE daily_metrics SET readiness_score=70,recovery_score=60 WHERE user_id=?',
      [u.id]
    );
    const read = await table('daily_metrics', u);
    expect(
      (
        read.json as {
          data: {
            readiness_score: number | null;
            recovery_score: number | null;
          }[];
        }
      ).data[0]
    ).toMatchObject({ readiness_score: null, recovery_score: null });
    await alterar(p, 'lyra_memory', false);
    await executeStatement(
      'INSERT INTO memory_preferences(user_id,enabled) VALUES(?,TRUE)',
      [u.id]
    );
    const conversationId = randomUUID(),
      turnId = randomUUID();
    expect(
      (
        await chamar(chat.POST, {
          method: 'POST',
          usuario: u,
          body: { query: 'Olá', conversationId, turnId },
        })
      ).status
    ).toBe(200);
    expect(
      await queryRows('SELECT id FROM memory_episodes WHERE user_id=?', [u.id])
    ).toEqual([]);
    await executeStatement(
      'INSERT INTO memory_episodes(id,user_id,content,reference_at,generation) VALUES(?,?,?,UTC_TIMESTAMP(3),1)',
      [randomUUID(), u.id, 'Relato de teste isolado']
    );
    expect(await processarFilaDaMemoria()).toMatchObject({ processado: false });
    await alterar(p, 'personal_notifications', false);
    await criarNotificacao({
      userId: u.id,
      tipo: 'coach_dia',
      titulo: 'Teste isolado',
      corpo: 'Aviso de teste',
      link: '/dia',
      chave: randomUUID(),
    });
    expect(
      await queryRows('SELECT id FROM user_notifications WHERE user_id=?', [
        u.id,
      ])
    ).toEqual([]);
    // Um replay não contorna a revogação do chat.
    await alterar(p, 'ai_chat_messages', false);
    expect(
      (
        await chamar(chat.POST, {
          method: 'POST',
          usuario: u,
          body: { query: 'Olá', conversationId, turnId },
        })
      ).status
    ).toBe(403);
  } finally {
    await updatePlanMatrixByKey('care', p);
  }
});

it('bloqueia também as vias alternativas de escrita, feedback, replay e leitura personalizada', async () => {
  const p = original.find((p) => p.key === 'care')!;
  const u = await pessoa();
  const id = randomUUID();
  const cases: Array<{
    key: PlanFeatureKey;
    run: () => Promise<{ status: number }>;
  }> = [
    {
      key: 'guided_breathing',
      run: () =>
        chamar(breath.POST, {
          method: 'POST',
          usuario: u,
          body: { tecnica: 'quadrada', ciclos: 2, segundos: 32 },
        }),
    },
    {
      key: 'evening_reflection',
      run: () =>
        chamar(reflection.PUT, {
          method: 'PUT',
          usuario: u,
          body: { data: hoje(), emocional: 4, corpo: 4, espiritual: 4 },
        }),
    },
    {
      key: 'evening_reflection',
      run: () => chamar(reflection.DELETE, { method: 'DELETE', usuario: u }),
    },
    {
      key: 'calendar_integration',
      run: () =>
        chamar(calendar.POST, {
          method: 'POST',
          usuario: u,
          path: '/api/calendario/assinatura',
        }),
    },
    {
      key: 'personal_notifications',
      run: () =>
        chamar(notifications.PATCH, {
          method: 'PATCH',
          usuario: u,
          body: { todas: true },
        }),
    },
    {
      key: 'lyra_memory',
      run: () =>
        chamar(memory.POST, {
          method: 'POST',
          usuario: u,
          body: { acao: 'relato', texto: 'Relato de teste isolado' },
        }),
    },
    {
      key: 'chat_images',
      run: () =>
        chamar(images.POST, {
          method: 'POST',
          usuario: u,
          params: { id },
          body: { privacyMode: false },
        }),
    },
    {
      key: 'chat_history',
      run: () =>
        chamar(oneConversation.GET, {
          usuario: u,
          params: { id },
          path: '/api/chat/conversas/' + id,
        }),
    },
    {
      key: 'chat_history',
      run: () =>
        chamar(chat.POST, {
          method: 'POST',
          usuario: u,
          body: {
            query: 'Olá',
            conversationId: randomUUID(),
            turnId: randomUUID(),
          },
        }),
    },
    {
      key: 'ai_plan_generations',
      run: () =>
        chamar(generation.POST, { method: 'POST', usuario: u, body: {} }),
    },
    {
      key: 'ai_tips_feed',
      run: () =>
        chamar(feedback.POST, {
          method: 'POST',
          usuario: u,
          body: { data: hoje(), util: true },
        }),
    },
    {
      key: 'vedic_insights',
      run: () =>
        chamar(ephemeris.GET, { usuario: u, path: '/api/astrology/ephemeris' }),
    },
    {
      key: 'personal_habits',
      run: () =>
        chamar(data.POST, {
          method: 'POST',
          usuario: u,
          params: { table: 'habits' },
          body: { values: { title: 'Hábito de teste' } },
        }),
    },
  ];
  try {
    for (const c of cases) {
      expect((await alterar(p, c.key, false)).status).toBe(200);
      expect((await c.run()).status, c.key).toBe(403);
      expect((await alterar(p, c.key, true)).status).toBe(200);
    }
    for (const table of ['ai_plans', 'user_assessments']) {
      expect(
        (
          await chamar(data.POST, {
            method: 'POST',
            usuario: u,
            params: { table },
            body: {
              upsert: true,
              values: {
                id: randomUUID(),
                plan_data: {},
                assessment_type: 'who5',
                score_value: 100,
              },
            },
          })
        ).status
      ).toBe(403);
    }
    expect(
      (
        await chamar(ephemeris.GET, {
          usuario: null,
          path: '/api/astrology/ephemeris',
        })
      ).status
    ).toBe(200);
    // O chat sem histórico continua funcional e não grava conversa.
    await alterar(p, 'chat_history', false);
    expect(
      (
        await chamar(chat.POST, {
          method: 'POST',
          usuario: u,
          body: { query: 'Olá' },
        })
      ).status
    ).toBe(200);
    expect(
      await queryRows('SELECT id FROM chat_conversations WHERE user_id=?', [
        u.id,
      ])
    ).toEqual([]);
  } finally {
    await updatePlanMatrixByKey('care', p);
  }
});

it('assinaturas de calendário antigas revalidam a matriz e o bloqueio do dono sem cookie', async () => {
  const p = original.find((p) => p.key === 'care')!;
  const u = await pessoa();
  const city = cidadePorId(3448439)!;
  expect(city).toBeTruthy();
  await executeStatement(
    'UPDATE profiles SET birth_date=?,birth_city_id=?,birth_location=?,birth_latitude=?,birth_longitude=?,birth_timezone=? WHERE id=?',
    [
      '1990-05-15',
      city.id,
      city.rotulo,
      city.latitude,
      city.longitude,
      city.fuso,
      u.id,
    ]
  );
  try {
    expect((await alterar(p, 'calendar_integration', true)).status).toBe(200);
    const created = await chamar(calendar.POST, {
      method: 'POST',
      usuario: u,
      path: '/api/calendario/assinatura',
    });
    expect(created.status).toBe(201);
    const url = (created.json as { url: string }).url;
    const arquivo = new URL(url).pathname.split('/').at(-1)!;
    const open = () =>
      chamar(feed.GET, { usuario: null, params: { arquivo }, path: url });
    expect((await open()).status).toBe(200);
    await alterar(p, 'calendar_integration', false);
    expect((await open()).status).toBe(404);
    await alterar(p, 'calendar_integration', true);
    expect((await open()).status).toBe(200);
    await executeStatement(
      'UPDATE users SET blocked_at=UTC_TIMESTAMP() WHERE id=?',
      [u.id]
    );
    expect((await open()).status).toBe(404);
  } finally {
    await updatePlanMatrixByKey('care', p);
  }
});

it('consultas recusam profissionais de outra conta; upserts concorrentes não transferem nem sobrescrevem dados entre titulares', async () => {
  const a = await pessoa(),
    b = await pessoa();
  const id = randomUUID();
  const post = (u: UsuarioDeTeste) =>
    chamar(data.POST, {
      method: 'POST',
      usuario: u,
      params: { table: 'professionals' },
      body: { upsert: true, values: { id, name: u.id, specialty: 'Clínica' } },
    });
  const results = await Promise.all([post(a), post(b)]);
  expect(results.map((r) => r.status).sort()).toEqual([200, 403]);
  const [stored] = await queryRows<{ user_id: string; name: string }>(
    'SELECT user_id,name FROM professionals WHERE id=?',
    [id]
  );
  expect(stored.name).toBe(stored.user_id);
  const other = stored.user_id === a.id ? b : a;
  const future = new Date(Date.now() + 86400000).toISOString();
  expect(
    (
      await chamar(data.POST, {
        method: 'POST',
        usuario: other,
        params: { table: 'appointments' },
        body: {
          values: {
            professional_id: id,
            appointment_time: future,
            status: 'scheduled',
          },
        },
      })
    ).status
  ).toBe(403);
  expect(
    await queryRows('SELECT id FROM appointments WHERE user_id=?', [other.id])
  ).toEqual([]);
});

it('cota de consultas usa UTC mesmo quando o processo está em outro fuso', async () => {
  const p = original.find((p) => p.key === 'care')!;
  const u = await pessoa();
  const tzAnterior = process.env.TZ;
  try {
    process.env.TZ = 'Asia/Tokyo';
    await alterar(p, 'appointments_active', true, 1);
    const professional = await chamar(data.POST, {
      method: 'POST',
      usuario: u,
      params: { table: 'professionals' },
      body: { values: { name: 'Profissional UTC', specialty: 'Clínica' } },
    });
    expect(professional.status).toBe(200);
    const id = (professional.json as { data: { id: string } }).data.id;
    const create = (minutes: number) =>
      chamar(data.POST, {
        method: 'POST',
        usuario: u,
        params: { table: 'appointments' },
        body: {
          values: {
            professional_id: id,
            appointment_time: new Date(
              Date.now() + minutes * 60000
            ).toISOString(),
            status: 'scheduled',
          },
        },
      });
    expect((await create(30)).status).toBe(200);
    expect((await create(45)).status).toBe(403);
    expect((await create(-30)).status).toBe(200);
  } finally {
    if (tzAnterior === undefined) delete process.env.TZ;
    else process.env.TZ = tzAnterior;
    await updatePlanMatrixByKey('care', p);
  }
});
