import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  contar,
  criarUsuario,
  definirDireito,
} from '../../../tests/integration/fixtures';
import { chamar } from '../../../tests/integration/http';
import { executeStatement, queryRows } from '@/lib/mysql/pool';
import {
  salvarMarcador,
  excluirMarcador,
  salvarDia,
  excluirDia,
  listarDiario,
  contextoDoDiario,
  compararAcontecimentos,
} from '@/lib/acontecimentos/servico';
import { somarDias } from '@/lib/acontecimentos/analise';
import { exportarDadosDoTitular, excluirConta } from '@/lib/lgpd/conta';
import * as central from './acontecimentos/route';
import * as marcadores from './acontecimentos/marcadores/route';
import * as marcadorIndividual from './acontecimentos/marcadores/[id]/route';
import * as diaIndividual from './acontecimentos/dias/[data]/route';
import * as comparar from './acontecimentos/comparar/route';
const agora = new Date('2026-10-28T12:00:00Z');
const pedido = (id: string) => ({
  inicio: '2026-10-01',
  fim: '2026-10-16',
  marcadorId: id,
  metrica: 'sono' as const,
  deslocamento: 1 as const,
});
async function preparar() {
  const u = await criarUsuario(),
    id = await salvarMarcador(u.id, 'Café tarde 🌙');
  return { u, id };
}
async function dia(
  userId: string,
  marcadores: string[],
  data = '2026-10-10',
  versao = 0,
  nota = ''
) {
  await salvarDia(
    userId,
    { data, marcadores, versao, nota, confirmado: true },
    agora
  );
}
async function recurso(
  habilitado: boolean,
  chave = 'daily_checkin',
  quota?: number
) {
  await executeStatement(
    `UPDATE plan_entitlements e JOIN subscription_plans p ON p.id=e.plan_id JOIN plan_features f ON f.id=e.feature_id SET e.enabled=?${quota === undefined ? '' : ',e.quota_value=?'} WHERE p.plan_key='free' AND f.feature_key=?`,
    quota === undefined ? [habilitado, chave] : [habilitado, quota, chave]
  );
}
async function serie() {
  const { u, id } = await preparar();
  for (let i = 0; i < 16; i++) {
    const data = somarDias('2026-10-01', i);
    await dia(u.id, i % 2 === 0 ? [id] : [], data);
    await executeStatement(
      'INSERT INTO daily_metrics(id,user_id,date,sleep_duration_minutes,energy_level) VALUES(?,?,?,?,?)',
      [
        randomUUID(),
        u.id,
        somarDias(data, 1),
        i % 2 === 0 ? 360 : 480,
        i % 2 === 0 ? 2 : 4,
      ]
    );
  }
  return { u, id };
}
describe('diário pessoal e comparações com registros MySQL reais', () => {
  // Os testes de janela usam o histórico de 30 dias do Free; desde a tarefa
  // 224 a matriz parte do acesso do Care, então o limite é declarado aqui.
  let restaurarJanela: () => Promise<void>;
  beforeAll(async () => {
    restaurarJanela = await definirDireito('free', 'metrics_history_days', {
      enabled: true,
      quota: 30,
      reset: 'rolling',
    });
  });
  afterAll(async () => {
    await restaurarJanela();
  });

  it('exige sessão em leituras, marcações e comparação', async () => {
    for (const [handler, method] of [
      [central.GET, 'GET'],
      [marcadores.POST, 'POST'],
      [marcadorIndividual.PUT, 'PUT'],
      [marcadorIndividual.DELETE, 'DELETE'],
      [diaIndividual.GET, 'GET'],
      [diaIndividual.PUT, 'PUT'],
      [diaIndividual.DELETE, 'DELETE'],
      [comparar.POST, 'POST'],
    ] as const)
      expect(
        (
          await chamar(handler, {
            usuario: null,
            method,
            params: { id: randomUUID(), data: '2026-10-28' },
            ...(method === 'GET' ? {} : { body: {} }),
          })
        ).status
      ).toBe(401);
  });
  it('cria, renomeia e recusa nomes repetidos sem alterar referências', async () => {
    const { u, id } = await preparar();
    await dia(u.id, [id]);
    await expect(salvarMarcador(u.id, 'CAFE TARDE 🌙')).rejects.toMatchObject({
      statusCode: 409,
    });
    await salvarMarcador(u.id, 'Café depois do jantar', id, 1);
    const d = await listarDiario(u.id, undefined, agora);
    expect(d.marcadores[0]).toMatchObject({
      id,
      nome: 'Café depois do jantar',
      versao: 2,
    });
    expect(d.dias[0].marcadores).toEqual([id]);
    await expect(
      salvarMarcador(u.id, 'Outra edição', id, 1)
    ).rejects.toMatchObject({ statusCode: 409 });
  });
  it('limita criações simultâneas a trinta marcadores por conta', async () => {
    const u = await criarUsuario();
    const rs = await Promise.allSettled(
      Array.from({ length: 32 }, (_, i) =>
        salvarMarcador(u.id, `Marcador ${i}`)
      )
    );
    expect(rs.filter((r) => r.status === 'fulfilled')).toHaveLength(30);
    expect(rs.filter((r) => r.status === 'rejected')).toHaveLength(2);
  });
  it('salva ausência confirmada, notas e edição com versão, sem inventar medição', async () => {
    const { u, id } = await preparar();
    await dia(u.id, [], '2026-10-10', 0, 'Nenhum destes marcadores hoje.');
    let c = await listarDiario(u.id, undefined, agora);
    expect(c.dias[0]).toMatchObject({
      confirmado: true,
      marcadores: [],
      nota: 'Nenhum destes marcadores hoje.',
      versao: 1,
    });
    await dia(u.id, [id], '2026-10-10', 1, 'Nota atualizada');
    c = await listarDiario(u.id, undefined, agora);
    expect(c.dias[0]).toMatchObject({ marcadores: [id], versao: 2 });
    await expect(dia(u.id, [], '2026-10-10', 1)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(
      await contar('SELECT COUNT(*) total FROM daily_metrics WHERE user_id=?', [
        u.id,
      ])
    ).toBe(0);
  });
  it('resolve duas edições concorrentes sem perder atualização', async () => {
    const { u, id } = await preparar();
    await dia(u.id, [id]);
    const rs = await Promise.allSettled([
      dia(u.id, [], '2026-10-10', 1, 'A'),
      dia(u.id, [id], '2026-10-10', 1, 'B'),
    ]);
    expect(rs.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(rs.filter((r) => r.status === 'rejected')).toHaveLength(1);
    expect((await listarDiario(u.id, undefined, agora)).dias[0].versao).toBe(2);
  });
  it('isola nomes, dias, notas e cálculo por titular, inclusive na chave estrangeira', async () => {
    const { u, id } = await preparar(),
      outra = await criarUsuario();
    await dia(u.id, [id], '2026-10-10', 0, 'Privado');
    expect((await listarDiario(outra.id, undefined, agora)).dias).toEqual([]);
    expect((await listarDiario(outra.id, undefined, agora)).marcadores).toEqual(
      []
    );
    await expect(dia(outra.id, [id])).rejects.toMatchObject({
      statusCode: 404,
    });
    await expect(
      compararAcontecimentos(outra.id, pedido(id), agora)
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(
      (
        await chamar(marcadorIndividual.DELETE, {
          usuario: outra,
          method: 'DELETE',
          params: { id },
          body: { versao: 1 },
        })
      ).status
    ).toBe(404);
    await dia(outra.id, []);
    await expect(
      executeStatement(
        'INSERT INTO personal_event_day_markers(user_id,event_date,marker_id) VALUES(?,?,?)',
        [outra.id, '2026-10-10', id]
      )
    ).rejects.toMatchObject({ code: 'ER_NO_REFERENCED_ROW_2' });
  });
  it('invalida dias afetados ao excluir marcador e não reclassifica como ausência', async () => {
    const { u, id } = await serie(),
      outro = await salvarMarcador(u.id, 'Viagem');
    await dia(u.id, [id, outro], '2026-10-01', 1);
    expect(
      (await compararAcontecimentos(u.id, pedido(id), agora)).resumo
    ).not.toBeNull();
    await excluirMarcador(u.id, outro, 1);
    const c = await listarDiario(u.id, undefined, agora);
    expect(c.dias.find((d) => d.data === '2026-10-01')).toMatchObject({
      confirmado: false,
      versao: 3,
      marcadores: [id],
    });
    const r = await compararAcontecimentos(u.id, pedido(id), agora);
    expect(r.pares[0]).toMatchObject({
      confirmado: false,
      presenca: null,
      valor: 360,
    });
    expect(r.qualidade.paresValidos).toBe(15);
    await expect(dia(u.id, [id], '2026-10-01', 2)).rejects.toMatchObject({
      statusCode: 409,
    });
    await dia(u.id, [id], '2026-10-01', 3);
    expect(
      (await compararAcontecimentos(u.id, pedido(id), agora)).qualidade
        .paresValidos
    ).toBe(16);
  });
  it('reproduz medianas e pares do dia seguinte a partir dos IDs reais', async () => {
    const { u, id } = await serie();
    const r = await compararAcontecimentos(u.id, pedido(id), agora);
    expect(r.qualidade).toMatchObject({
      paresValidos: 16,
      com: 8,
      sem: 8,
      cobertura: 1,
      apta: true,
    });
    expect(r.resumo).toMatchObject({
      medianaCom: 360,
      medianaSem: 480,
      diferenca: -120,
      contraditorio: false,
    });
    const [m] = await queryRows<{ id: string; date: string }>(
      'SELECT id,date FROM daily_metrics WHERE user_id=? AND date=?',
      [u.id, '2026-10-02']
    );
    expect(r.pares[0]).toMatchObject({
      data: '2026-10-01',
      dataMetrica: m.date,
      metricaId: m.id,
      valor: 360,
    });
    const energia = await compararAcontecimentos(
      u.id,
      { ...pedido(id), metrica: 'energia' },
      agora
    );
    expect(energia.resumo).toMatchObject({
      medianaCom: 2,
      medianaSem: 4,
      diferenca: -2,
    });
    const mesmoDia = await compararAcontecimentos(
      u.id,
      { ...pedido(id), deslocamento: 0 },
      agora
    );
    expect(mesmoDia.pares[0].valor).toBeNull();
    expect(mesmoDia.pares[1].valor).toBe(360);
  });
  it('expõe dados contraditórios e outros marcadores sem afirmar causa', async () => {
    const { u, id } = await serie(),
      outro = await salvarMarcador(u.id, 'Viagem');
    for (let i = 8; i < 16; i += 2) {
      await executeStatement(
        'UPDATE daily_metrics SET sleep_duration_minutes=600 WHERE user_id=? AND date=?',
        [u.id, somarDias('2026-10-02', i)]
      );
      await dia(u.id, [id, outro], somarDias('2026-10-01', i), 1);
    }
    const r = await compararAcontecimentos(u.id, pedido(id), agora);
    expect(r.resumo).toMatchObject({
      medianaCom: 480,
      medianaSem: 480,
      diferenca: 0,
      contraditorio: true,
      outrosMarcadoresEm: 4,
    });
  });
  it('preserva lacunas, recusa insuficiência e não lê métrica futura', async () => {
    const { u, id } = await preparar();
    let r = await compararAcontecimentos(u.id, pedido(id), agora);
    expect(r.resumo).toBeNull();
    expect(r.pares).toHaveLength(16);
    expect(r.pares.every((p) => p.presenca === null && p.valor === null)).toBe(
      true
    );
    await dia(u.id, [id], '2026-10-28');
    await executeStatement(
      'INSERT INTO daily_metrics(id,user_id,date,sleep_duration_minutes) VALUES(?,?,?,?)',
      [randomUUID(), u.id, '2026-10-29', 480]
    );
    r = await compararAcontecimentos(
      u.id,
      { ...pedido(id), inicio: '2026-10-28', fim: '2026-10-28' },
      agora
    );
    expect(r.pares[0].valor).toBeNull();
    expect(r.pares[0].metricaId).toBeNull();
  });
  it('valida calendário real, confirmação, data da rota, campos extras e intervalo', async () => {
    const { u, id } = await preparar();
    for (const patch of [
      { confirmado: false },
      { data: '2026-02-30' },
      { data: '2026-10-27' },
      { userId: u.id },
    ])
      expect(
        (
          await chamar(diaIndividual.PUT, {
            usuario: u,
            method: 'PUT',
            params: { data: '2026-10-28' },
            body: {
              data: '2026-10-28',
              marcadores: [id],
              nota: '',
              confirmado: true,
              versao: 0,
              ...patch,
            },
          })
        ).status
      ).toBe(400);
    expect(
      (
        await chamar(comparar.POST, {
          usuario: u,
          method: 'POST',
          body: { ...pedido(id), inicio: '2026-10-20', fim: '2026-10-01' },
        })
      ).status
    ).toBe(400);
    await expect(dia(u.id, [id], '2026-10-29')).rejects.toMatchObject({
      statusCode: 400,
    });
  });
  it('usa data civil do fuso do perfil na passagem de meia-noite', async () => {
    const { u, id } = await preparar();
    await executeStatement(
      "UPDATE profiles SET residence_location='Apia',residence_latitude=-13.83,residence_longitude=-171.75,residence_timezone='Pacific/Apia' WHERE id=?",
      [u.id]
    );
    const c = await contextoDoDiario(u.id, agora);
    expect(c.hoje).toBe('2026-10-29');
    expect(c.fuso).toBe('Pacific/Apia');
    await salvarDia(
      u.id,
      {
        data: '2026-10-29',
        marcadores: [id],
        nota: 'Data local',
        confirmado: true,
        versao: 0,
      },
      agora
    );
    await executeStatement(
      "UPDATE profiles SET residence_location='Los Angeles',residence_latitude=34.05,residence_longitude=-118.24,residence_timezone='America/Los_Angeles' WHERE id=?",
      [u.id]
    );
    expect(
      (await contextoDoDiario(u.id, new Date('2026-10-28T01:00Z'))).hoje
    ).toBe('2026-10-27');
  });
  it('respeita a janela e a dependência do check-in em relação ao histórico', async () => {
    const { u, id } = await preparar();
    await expect(
      compararAcontecimentos(
        u.id,
        { ...pedido(id), inicio: '2026-09-01' },
        agora
      )
    ).rejects.toMatchObject({ statusCode: 403 });
    await dia(u.id, [id], '2026-10-28');
    await recurso(false, 'metrics_history_days');
    try {
      expect((await chamar(central.GET, { usuario: u })).status).toBe(403);
      expect(
        (
          await chamar(diaIndividual.PUT, {
            usuario: u,
            method: 'PUT',
            params: { data: '2026-10-28' },
            body: {
              data: '2026-10-28',
              marcadores: [],
              nota: '',
              confirmado: true,
              versao: 1,
            },
          })
        ).status
      ).toBe(403);
      expect(
        (
          await chamar(comparar.POST, {
            usuario: u,
            method: 'POST',
            body: pedido(id),
          })
        ).status
      ).toBe(403);
    } finally {
      await recurso(true, 'metrics_history_days');
    }
    expect(
      (await listarDiario(u.id, undefined, agora)).dias[0].marcadores
    ).toEqual([id]);
  });
  it('revoga o diário sem apagar dados e devolve leitura sem cache após restauração', async () => {
    const { u, id } = await preparar();
    await dia(u.id, [id]);
    await recurso(false);
    try {
      expect((await chamar(central.GET, { usuario: u })).status).toBe(403);
      expect(
        (
          await chamar(marcadores.POST, {
            usuario: u,
            method: 'POST',
            body: { nome: 'Outro' },
          })
        ).status
      ).toBe(403);
    } finally {
      await recurso(true);
    }
    const r = await chamar(central.GET, { usuario: u });
    expect(r.status).toBe(200);
    expect(r.headers.get('cache-control')).toBe('private, no-store');
  });
  it('exporta e exclui diário e vínculos sem apagar métricas ao excluir apenas um dia', async () => {
    const { u, id } = await serie();
    const ex = await exportarDadosDoTitular(u.id);
    expect(ex.personal_event_markers).toHaveLength(1);
    expect(ex.personal_event_days).toHaveLength(16);
    expect(ex.personal_event_day_markers).toHaveLength(8);
    await excluirDia(u.id, '2026-10-01', 1);
    expect(
      await contar(
        'SELECT COUNT(*) total FROM personal_event_days WHERE user_id=?',
        [u.id]
      )
    ).toBe(15);
    expect(
      await contar('SELECT COUNT(*) total FROM daily_metrics WHERE user_id=?', [
        u.id,
      ])
    ).toBe(16);
    await excluirConta(u.id);
    for (const tabela of [
      'personal_event_markers',
      'personal_event_days',
      'personal_event_day_markers',
    ])
      expect(
        await contar(`SELECT COUNT(*) total FROM ${tabela} WHERE user_id=?`, [
          u.id,
        ])
      ).toBe(0);
    expect(id).toBeTruthy();
  });
});
