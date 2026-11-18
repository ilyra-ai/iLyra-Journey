import { randomUUID } from 'node:crypto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { criarUsuario, contar } from '../../../tests/integration/fixtures';
import { chamar } from '../../../tests/integration/http';
import { executeStatement, queryRows } from '@/lib/mysql/pool';
import {
  montarRelatorio,
  opcoesDoRelatorio,
} from '@/lib/relatorio-pessoal/servico';
import { gerarPdfPessoal } from '@/lib/relatorio-pessoal/pdf';
import type { Selecao } from '@/lib/relatorio-pessoal/esquema';
import * as central from './relatorio-pessoal/route';
import * as pdf from './relatorio-pessoal/pdf/route';
const agora = new Date('2026-10-28T12:00:00Z');
const selecao = (): Selecao => ({
  inicio: '2026-10-20',
  fim: '2026-10-28',
  metricas: ['sono', 'energia'],
  reflexoes: false,
  acontecimentos: false,
  acompanhamentos: [],
  alimentacao: false,
  notas: false,
});
async function preparar() {
  const u = await criarUsuario();
  await executeStatement(
    'INSERT INTO daily_metrics(id,user_id,date,sleep_duration_minutes,energy_level,weight_kg) VALUES(?,?,?,?,?,?)',
    [randomUUID(), u.id, '2026-10-20', 0, 2, 78]
  );
  await executeStatement(
    'INSERT INTO daily_metrics(id,user_id,date,sleep_duration_minutes,energy_level) VALUES(?,?,?,?,?)',
    [randomUUID(), u.id, '2026-10-22', 480, 4]
  );
  await executeStatement(
    'INSERT INTO daily_reflections(id,user_id,reflection_date,emotional_score,body_score,spiritual_score,note) VALUES(?,?,?,?,?,?,?)',
    [
      randomUUID(),
      u.id,
      '2026-10-20',
      2,
      3,
      4,
      'Anotação íntima 🌙 <script>não executar</script>',
    ]
  );
  await executeStatement(
    'INSERT INTO personal_event_days(user_id,event_date,note,confirmed) VALUES(?,?,?,?)',
    [u.id, '2026-10-20', 'Outra nota reservada', false]
  );
  const marker = randomUUID();
  await executeStatement(
    'INSERT INTO personal_event_markers(id,user_id,name) VALUES(?,?,?)',
    [marker, u.id, 'Visita familiar']
  );
  await executeStatement(
    'INSERT INTO personal_event_day_markers(user_id,event_date,marker_id) VALUES(?,?,?)',
    [u.id, '2026-10-20', marker]
  );
  return u;
}
async function recurso(chave: string, enabled: boolean) {
  await executeStatement(
    "UPDATE plan_entitlements e JOIN subscription_plans p ON p.id=e.plan_id JOIN plan_features f ON f.id=e.feature_id SET e.enabled=? WHERE p.plan_key='care' AND f.feature_key=?",
    [enabled, chave]
  );
}
describe('relatório pessoal e PDF com registros reais no MySQL', () => {
  // As rotas usam o relógio atual: fixar apenas Date mantém as datas das fixtures estáveis após a virada do dia.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(agora);
  });
  afterEach(() => vi.useRealTimers());
  it('exige sessão nas opções, prévia e PDF', async () => {
    for (const [h, m] of [
      [central.GET, 'GET'],
      [central.POST, 'POST'],
      [pdf.POST, 'POST'],
    ] as const)
      expect(
        (
          await chamar(h, {
            usuario: null,
            method: m,
            ...(m === 'POST' ? { body: {} } : {}),
          })
        ).status
      ).toBe(401);
  });
  it('retorna somente métricas selecionadas, zeros, lacunas e medianas verificáveis', async () => {
    const u = await preparar(),
      r = await montarRelatorio(u.session, selecao(), agora);
    expect(r.dias).toHaveLength(9);
    expect(r.dias[0].valores).toEqual({ energia: 2, sono: 0 });
    expect(r.dias[1].valores).toEqual({ energia: null, sono: null });
    expect(r.dias[0].reflexao).toBeNull();
    expect(r.dias[0].acontecimentos).toBeNull();
    expect(JSON.stringify(r)).not.toContain('íntima');
    expect(r.resumos.find((s) => s.campo === 'sono')).toMatchObject({
      n: 2,
      ausentes: 7,
      mediana: 240,
      minimo: 0,
      maximo: 480,
    });
    expect(r.dias[0].registroId).toBeTruthy();
  });
  it('inclui escalas e marcadores apenas quando escolhidos, sem notas por padrão', async () => {
    const u = await preparar(),
      r = await montarRelatorio(
        u.session,
        { ...selecao(), metricas: [], reflexoes: true, acontecimentos: true },
        agora
      );
    expect(r.resumos).toEqual([]);
    expect(r.dias[0].valores).toEqual({});
    expect(r.dias[0].registroId).toBeNull();
    expect(r.dias[0].reflexao).toMatchObject({
      emocional: 2,
      corpo: 3,
      espiritual: 4,
    });
    expect(r.dias[0].reflexao).not.toHaveProperty('nota');
    expect(r.dias[0].acontecimentos).toEqual({
      revisado: false,
      marcadores: ['Visita familiar'],
    });
    expect(r.dias[1].acontecimentos).toBeNull();
    expect(JSON.stringify(r)).not.toContain('reservada');
  });
  it('preserva notas e Unicode por seleção explícita, sem executar texto', async () => {
    const u = await preparar(),
      r = await montarRelatorio(
        u.session,
        { ...selecao(), reflexoes: true, acontecimentos: true, notas: true },
        agora
      );
    expect(r.dias[0].reflexao?.nota).toBe(
      'Anotação íntima 🌙 <script>não executar</script>'
    );
    expect(r.dias[0].acontecimentos?.nota).toBe('Outra nota reservada');
    expect(
      await contar('SELECT COUNT(*) total FROM daily_metrics WHERE user_id=?', [
        u.id,
      ])
    ).toBe(2);
  });
  it('isola titulares e não aceita identificar outro usuário pela seleção', async () => {
    const a = await preparar(),
      b = await criarUsuario();
    const r = await montarRelatorio(b.session, selecao(), agora);
    expect(r.dias.every((d) => d.registroId === null)).toBe(true);
    expect(JSON.stringify(r)).not.toContain(a.id);
    expect(
      (
        await chamar(central.POST, {
          usuario: b,
          method: 'POST',
          body: { ...selecao(), userId: a.id },
        })
      ).status
    ).toBe(400);
  });
  it('recusa futuro, calendário, métrica desconhecida e período excessivo', async () => {
    const u = await criarUsuario();
    for (const v of [
      { fim: '2026-10-29' },
      { fim: '2026-02-30' },
      { metricas: ['senha'] },
      { inicio: '2026-01-01' },
    ])
      expect(
        (
          await chamar(central.POST, {
            usuario: u,
            method: 'POST',
            body: { ...selecao(), ...v },
          })
        ).status
      ).toBe(400);
  });
  it('aplica corte atual do plano e revalida categorias autorizadas', async () => {
    const u = await preparar();
    await expect(
      montarRelatorio(u.session, { ...selecao(), inicio: '2000-01-01' }, agora)
    ).rejects.toMatchObject({ statusCode: 403 });
    for (const chave of [
      'daily_checkin',
      'evening_reflection',
      'metrics_history_days',
    ]) {
      await recurso(chave, false);
      try {
        expect(
          (
            await chamar(central.POST, {
              usuario: u,
              method: 'POST',
              body: { ...selecao(), reflexoes: true },
            })
          ).status
        ).toBe(403);
        if (chave === 'daily_checkin') {
          const r = await montarRelatorio(
            u.session,
            { ...selecao(), metricas: [], reflexoes: true },
            agora
          );
          expect(r.dias[0].reflexao).toBeTruthy();
        }
      } finally {
        await recurso(chave, true);
      }
    }
  });
  it('gera PDF real paginado com fonte incorporada e sem persistir arquivo pessoal', async () => {
    const u = await preparar(),
      r = await montarRelatorio(
        u.session,
        { ...selecao(), reflexoes: true, acontecimentos: true, notas: true },
        agora
      ),
      b = await gerarPdfPessoal(r);
    expect(b.subarray(0, 5).toString()).toBe('%PDF-');
    expect(b.subarray(-20).toString()).toContain('%%EOF');
    expect(b.length).toBeGreaterThan(10000);
    expect(b.toString('latin1')).toContain('/FontFile');
    expect(b.toString('latin1')).toContain('/StructTreeRoot');
    expect([
      ...b.toString('latin1').matchAll(/\/Type\s*\/Page\b/g),
    ]).toHaveLength(5);
    expect(b.toString('latin1')).not.toContain('/JavaScript');
  });
  it('protege o download contra prévia desatualizada e alteração de seleção', async () => {
    const u = await preparar();
    const previa = await chamar(central.POST, {
        usuario: u,
        method: 'POST',
        body: selecao(),
      }),
      dados = previa.json as { selecao: Selecao; revisao: string },
      r = { selecao: dados.selecao, revisao: dados.revisao };
    expect(previa.status).toBe(200);
    const ok = await chamar(pdf.POST, { usuario: u, method: 'POST', body: r });
    expect(ok.status).toBe(200);
    expect(ok.headers.get('content-type')).toBe('application/pdf');
    expect(ok.headers.get('content-disposition')).toContain('attachment');
    expect(ok.headers.get('cache-control')).toBe('private, no-store');
    await executeStatement(
      'UPDATE daily_metrics SET energy_level=5 WHERE user_id=? AND date=?',
      [u.id, '2026-10-20']
    );
    expect(
      (await chamar(pdf.POST, { usuario: u, method: 'POST', body: r })).status
    ).toBe(409);
    expect(
      (
        await chamar(pdf.POST, {
          usuario: u,
          method: 'POST',
          body: { ...r, selecao: { ...r.selecao, notas: true } },
        })
      ).status
    ).toBe(409);
  });
  it('mantém revisão estável se apenas horário de extração ou ordem da seleção mudou', async () => {
    const u = await preparar(),
      a = await montarRelatorio(u.session, selecao(), agora),
      b = await montarRelatorio(
        u.session,
        { ...selecao(), metricas: ['energia', 'sono'] },
        new Date('2026-10-28T13:00:00Z')
      );
    expect(a.revisao).toBe(b.revisao);
    expect(a.extraidoEm).not.toBe(b.extraidoEm);
    await executeStatement(
      'UPDATE daily_reflections SET note=? WHERE user_id=?',
      ['Outra nota não selecionada', u.id]
    );
    expect((await montarRelatorio(u.session, selecao(), agora)).revisao).toBe(
      a.revisao
    );
  });
  it('revalida direito revogado entre prévia e PDF e mantém leitura sem cache', async () => {
    const u = await preparar(),
      r = await montarRelatorio(u.session, selecao(), agora);
    await recurso('metrics_history_days', false);
    try {
      expect(
        (
          await chamar(pdf.POST, {
            usuario: u,
            method: 'POST',
            body: { selecao: r.selecao, revisao: r.revisao },
          })
        ).status
      ).toBe(403);
      expect((await chamar(central.GET, { usuario: u })).status).toBe(403);
    } finally {
      await recurso('metrics_history_days', true);
    }
    expect(
      (await chamar(central.GET, { usuario: u })).headers.get('cache-control')
    ).toBe('private, no-store');
    expect((await opcoesDoRelatorio(u.session, agora)).fuso).toBe('UTC');
  });
  it('aplica redução da janela histórica na prévia e no download sem usar cópia anterior', async () => {
    const u = await preparar(),
      r = await montarRelatorio(u.session, selecao(), agora);
    const sql =
      "SELECT e.quota_value FROM plan_entitlements e JOIN subscription_plans p ON p.id=e.plan_id JOIN plan_features f ON f.id=e.feature_id WHERE p.plan_key='care' AND f.feature_key='metrics_history_days'";
    const [antes] = await queryRows<{ quota_value: number | null }>(sql);
    const atualizar = (v: number | null) =>
      executeStatement(
        "UPDATE plan_entitlements e JOIN subscription_plans p ON p.id=e.plan_id JOIN plan_features f ON f.id=e.feature_id SET e.quota_value=? WHERE p.plan_key='care' AND f.feature_key='metrics_history_days'",
        [v]
      );
    await atualizar(7);
    try {
      expect(
        (
          await chamar(central.POST, {
            usuario: u,
            method: 'POST',
            body: selecao(),
          })
        ).status
      ).toBe(403);
      expect(
        (
          await chamar(pdf.POST, {
            usuario: u,
            method: 'POST',
            body: { selecao: r.selecao, revisao: r.revisao },
          })
        ).status
      ).toBe(403);
      expect(
        (
          await chamar(central.POST, {
            usuario: u,
            method: 'POST',
            body: { ...selecao(), inicio: '2026-10-22' },
          })
        ).status
      ).toBe(200);
    } finally {
      await atualizar(antes.quota_value);
    }
  });
  it('usa a data local do perfil nas fronteiras de dia sem deslocar registros consolidados', async () => {
    const u = await preparar();
    await executeStatement(
      "UPDATE profiles SET residence_location='Apia',residence_latitude=-13.83,residence_longitude=-171.75,residence_timezone='Pacific/Apia' WHERE id=?",
      [u.id]
    );
    const ctx = await opcoesDoRelatorio(u.session, agora);
    expect(ctx.hoje).toBe('2026-10-29');
    expect(ctx.fuso).toBe('Pacific/Apia');
    const r = await montarRelatorio(
      u.session,
      { ...selecao(), fim: '2026-10-29' },
      agora
    );
    expect(r.dias.at(-1)?.data).toBe('2026-10-29');
    expect(r.dias.at(-1)?.valores.sono).toBeNull();
    expect(r.dias[0].valores.sono).toBe(0);
  });
});
