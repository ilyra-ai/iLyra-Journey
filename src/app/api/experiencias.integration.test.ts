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
  criarExperiencia,
  listarExperiencias,
  agirNaExperiencia,
  lerRevisao,
  salvarRelato,
  excluirRelato,
  excluirExperiencia,
} from '@/lib/experiencias/servico';
import { somarDias } from '@/lib/acontecimentos/analise';
import { exportarDadosDoTitular, excluirConta } from '@/lib/lgpd/conta';
import type {
  DadosDaExperiencia,
  DadosDaNota,
} from '@/lib/experiencias/esquema';
import * as central from './experiencias/route';
import * as individual from './experiencias/[id]/route';
import * as relatos from './experiencias/[id]/relatos/[data]/route';
const inicioReal = new Date('2026-10-20T12:00:00Z'),
  agora = new Date('2026-10-28T12:00:00Z');
const proposta = (): DadosDaExperiencia => ({
  pedidoId: randomUUID(),
  titulo: 'Minha leitura tranquila 🌙',
  objetivo: 'Observar sono e energia',
  mudanca: 'Reservar uma leitura tranquila à noite',
  inicio: '2026-10-20',
  dias: 14,
  inicioReferencia: '2026-10-13',
  fimReferencia: '2026-10-19',
  alinhamentoSono: 0,
  metaId: null,
  habitoId: null,
});
const anotacao = (data = '2026-10-20'): DadosDaNota => ({
  idRelato: randomUUID(),
  data,
  seguiu: null,
  percepcao: null,
  nota: 'Observei minha rotina.',
  versao: 0,
});
async function preparar() {
  const u = await criarUsuario(),
    p = proposta(),
    { id } = await criarExperiencia(u.session, p, inicioReal);
  return { u, p, id };
}
async function recurso(
  habilitado: boolean,
  chave = 'personal_habits',
  quota?: number
) {
  await executeStatement(
    `UPDATE plan_entitlements e JOIN subscription_plans p ON p.id=e.plan_id JOIN plan_features f ON f.id=e.feature_id SET e.enabled=?${quota === undefined ? '' : ',e.quota_value=?'} WHERE p.plan_key='care' AND f.feature_key=?`,
    quota === undefined ? [habilitado, chave] : [habilitado, quota, chave]
  );
}
async function metricas(userId: string) {
  for (let i = 0; i < 16; i++)
    await executeStatement(
      'INSERT INTO daily_metrics(id,user_id,date,sleep_duration_minutes,energy_level) VALUES(?,?,?,?,?)',
      [
        randomUUID(),
        userId,
        somarDias('2026-10-13', i),
        i < 7 ? 420 : 480,
        i < 7 ? 2 : 4,
      ]
    );
}
describe('experiências e acompanhamento persistidos com MySQL real', () => {
  // Os testes de janela usam um histórico de 30 dias no plano de base; desde
  // as tarefas 224 e 225 é o Care, sem esse limite, então ele é declarado aqui.
  let restaurarJanela: () => Promise<void>;
  beforeAll(async () => {
    restaurarJanela = await definirDireito('care', 'metrics_history_days', {
      enabled: true,
      quota: 30,
      reset: 'rolling',
    });
  });
  afterAll(async () => {
    await restaurarJanela();
  });

  it('exige sessão em todas as leituras e mutações', async () => {
    for (const [h, m] of [
      [central.GET, 'GET'],
      [central.POST, 'POST'],
      [individual.GET, 'GET'],
      [individual.POST, 'POST'],
      [individual.DELETE, 'DELETE'],
      [relatos.PUT, 'PUT'],
      [relatos.DELETE, 'DELETE'],
    ] as const)
      expect(
        (
          await chamar(h, {
            usuario: null,
            method: m,
            params: { id: randomUUID(), data: '2026-10-28' },
            ...(m === 'GET' ? {} : { body: {} }),
          })
        ).status
      ).toBe(401);
  });
  it('persiste a proposta com período, vínculo e criação idempotente inclusive simultânea', async () => {
    const u = await criarUsuario(),
      p = proposta();
    const rs = await Promise.all(
      Array.from({ length: 5 }, () =>
        criarExperiencia(u.session, p, inicioReal)
      )
    );
    expect(new Set(rs.map((r) => r.id)).size).toBe(1);
    expect(rs.filter((r) => r.criada)).toHaveLength(1);
    expect(
      await contar(
        'SELECT COUNT(*) total FROM personal_experiments WHERE user_id=?',
        [u.id]
      )
    ).toBe(1);
    const c = await listarExperiencias(u.session, agora);
    expect(c.experiencias[0]).toMatchObject({
      titulo: p.titulo,
      objetivo: p.objetivo,
      mudanca: p.mudanca,
      inicio: p.inicio,
      fim: '2026-11-02',
      inicioReferencia: p.inicioReferencia,
      fimReferencia: p.fimReferencia,
      estado: 'em_curso',
      versao: 1,
      retrospectiva: false,
    });
    await expect(
      criarExperiencia(
        u.session,
        { ...p, mudanca: 'Outra proposta' },
        inicioReal
      )
    ).rejects.toMatchObject({ statusCode: 409 });
  });
  it('limita trinta propostas sem exceder na concorrência', async () => {
    const u = await criarUsuario(),
      rs = await Promise.allSettled(
        Array.from({ length: 32 }, () =>
          criarExperiencia(u.session, proposta(), inicioReal)
        )
      );
    expect(rs.filter((r) => r.status === 'fulfilled')).toHaveLength(30);
    expect(rs.filter((r) => r.status === 'rejected')).toHaveLength(2);
  });
  it('recusa campos extras e períodos inválidos e identifica registro posterior ao início', async () => {
    const u = await criarUsuario(),
      p = proposta();
    expect(
      (
        await chamar(central.POST, {
          usuario: u,
          method: 'POST',
          body: { ...p, userId: u.id },
        })
      ).status
    ).toBe(400);
    await expect(
      criarExperiencia(u.session, { ...p, inicio: '2026-10-29' }, agora)
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      criarExperiencia(u.session, { ...p, inicio: '2026-09-01' }, agora)
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      criarExperiencia(
        u.session,
        { ...p, inicioReferencia: '2026-09-01' },
        agora
      )
    ).rejects.toMatchObject({ statusCode: 403 });
    const r = await criarExperiencia(u.session, p, agora);
    expect(
      (await lerRevisao(u.id, r.id, agora)).experiencia.retrospectiva
    ).toBe(true);
  });
  it('isola proposta, revisão, ações e relatos de outros titulares', async () => {
    const { u, id } = await preparar(),
      outra = await criarUsuario();
    await salvarRelato(u.id, id, anotacao(), agora);
    expect(
      (await listarExperiencias(outra.session, agora)).experiencias
    ).toEqual([]);
    for (const [h, m, body] of [
      [individual.GET, 'GET', undefined],
      [individual.POST, 'POST', { acao: 'pausar', versao: 1 }],
      [individual.DELETE, 'DELETE', { versao: 1 }],
      [relatos.PUT, 'PUT', anotacao()],
    ] as const)
      expect(
        (
          await chamar(h, {
            usuario: outra,
            method: m,
            params: { id, data: '2026-10-20' },
            ...(body ? { body } : {}),
          })
        ).status
      ).toBe(404);
  });
  it('reutiliza meta e hábito ativos sem atualizar seu progresso e valida o direito', async () => {
    const u = await criarUsuario(),
      outra = await criarUsuario(),
      meta = randomUUID(),
      habito = randomUUID();
    await executeStatement(
      'INSERT INTO goals(id,user_id,title,current_value) VALUES(?,?,?,?)',
      [meta, u.id, 'Cuidar do meu descanso', 2]
    );
    await executeStatement(
      'INSERT INTO habits(id,user_id,name) VALUES(?,?,?)',
      [habito, u.id, 'Separar um livro']
    );
    const p = { ...proposta(), metaId: meta, habitoId: habito };
    await criarExperiencia(u.session, p, inicioReal);
    const c = await listarExperiencias(u.session, agora);
    expect(c.metas).toContainEqual({
      id: meta,
      titulo: 'Cuidar do meu descanso',
    });
    expect(c.habitos).toContainEqual({ id: habito, nome: 'Separar um livro' });
    expect(c.experiencias[0]).toMatchObject({ metaId: meta, habitoId: habito });
    await expect(
      criarExperiencia(
        outra.session,
        { ...p, pedidoId: randomUUID() },
        inicioReal
      )
    ).rejects.toMatchObject({ statusCode: 404 });
    await recurso(false, 'goal_progress_tracking');
    try {
      await expect(
        criarExperiencia(
          u.session,
          { ...p, pedidoId: randomUUID() },
          inicioReal
        )
      ).rejects.toMatchObject({ statusCode: 403 });
      expect((await listarExperiencias(u.session, agora)).metas).toEqual([]);
    } finally {
      await recurso(true, 'goal_progress_tracking');
    }
    const [g] = await queryRows<{ current_value: number }>(
      'SELECT current_value FROM goals WHERE id=?',
      [meta]
    );
    expect(g.current_value).toBe(2);
  });
  it('registra percepção opcional e texto literal, permitindo revisão sem fabricar não seguimento', async () => {
    const { u, id } = await preparar(),
      n = anotacao();
    n.nota = 'Outra rotina. <script>texto literal</script>';
    await salvarRelato(u.id, id, n, agora);
    await salvarRelato(u.id, id, n, agora);
    let r = await lerRevisao(u.id, id, agora);
    expect(r.relatos).toHaveLength(1);
    expect(r.relatos[0]).toMatchObject({ ...n, versao: 1 });
    expect(r.revisao.join(' ')).toContain('0 não seguida');
    await salvarRelato(
      u.id,
      id,
      { ...n, seguiu: 'parcial', percepcao: 4, versao: 1 },
      agora
    );
    r = await lerRevisao(u.id, id, agora);
    expect(r.relatos[0]).toMatchObject({
      seguiu: 'parcial',
      percepcao: 4,
      versao: 2,
    });
    expect(
      await contar('SELECT COUNT(*) total FROM daily_metrics WHERE user_id=?', [
        u.id,
      ])
    ).toBe(0);
    expect(
      await contar(
        'SELECT COUNT(*) total FROM breathing_sessions WHERE user_id=?',
        [u.id]
      )
    ).toBe(0);
  });
  it('recusa data futura, fora do período e sobrescrita após exclusão e recriação', async () => {
    const { u, id } = await preparar(),
      n = anotacao();
    await expect(
      salvarRelato(u.id, id, { ...n, data: '2026-10-29' }, agora)
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      salvarRelato(u.id, id, { ...n, data: '2026-10-19' }, agora)
    ).rejects.toMatchObject({ statusCode: 400 });
    await salvarRelato(u.id, id, n, agora);
    await excluirRelato(u.id, id, n.data, n.idRelato, 1);
    const novo = { ...n, idRelato: randomUUID(), nota: 'Relato recriado' };
    await salvarRelato(u.id, id, novo, agora);
    await expect(
      salvarRelato(u.id, id, { ...n, versao: 1, nota: 'Relato antigo' }, agora)
    ).rejects.toMatchObject({ statusCode: 409 });
    await expect(
      excluirRelato(u.id, id, n.data, n.idRelato, 1)
    ).rejects.toMatchObject({ statusCode: 409 });
    expect((await lerRevisao(u.id, id, agora)).relatos[0].nota).toBe(
      'Relato recriado'
    );
  });
  it('serializa ações e notas concorrentes sem duas pausas nem perda de edição', async () => {
    const { u, id } = await preparar();
    const rs = await Promise.allSettled([
      agirNaExperiencia(u.id, id, 'pausar', 1, agora),
      agirNaExperiencia(u.id, id, 'encerrar', 1, agora),
    ]);
    expect(rs.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(rs.filter((r) => r.status === 'rejected')).toHaveLength(1);
    const r = await lerRevisao(u.id, id, agora);
    expect(r.experiencia.versao).toBe(2);
    const n = anotacao();
    await salvarRelato(u.id, id, n, agora);
    const ns = await Promise.allSettled([
      salvarRelato(u.id, id, { ...n, versao: 1, nota: 'A' }, agora),
      salvarRelato(u.id, id, { ...n, versao: 1, nota: 'B' }, agora),
    ]);
    expect(ns.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(ns.filter((r) => r.status === 'rejected')).toHaveLength(1);
  });
  it('persiste pausa/retomada, exclui dias tocados pela pausa e mantém o fim previsto', async () => {
    const { u, id } = await preparar();
    await metricas(u.id);
    await agirNaExperiencia(
      u.id,
      id,
      'pausar',
      1,
      new Date('2026-10-23T10:00Z')
    );
    await salvarRelato(
      u.id,
      id,
      { ...anotacao('2026-10-23'), seguiu: 'nao' },
      agora
    );
    let r = await lerRevisao(u.id, id, new Date('2026-10-24T10:00Z'));
    expect(r.experiencia.estado).toBe('pausada');
    expect(r.pausas[0].fim).toBeNull();
    await agirNaExperiencia(
      u.id,
      id,
      'retomar',
      2,
      new Date('2026-10-24T12:00Z')
    );
    r = await lerRevisao(u.id, id, agora);
    expect(r.experiencia.fim).toBe('2026-11-02');
    expect(r.pausas[0]).toMatchObject({
      inicio: '2026-10-23',
      fim: '2026-10-24',
    });
    expect(r.linhas.filter((l) => l.pausado).map((l) => l.data)).toEqual([
      '2026-10-23',
      '2026-10-24',
    ]);
    expect(r.comparacoes[0].nObservacao).toBe(7);
    expect(r.relatos[0].seguiu).toBe('nao');
  });
  it('compara somente métricas reais e alinha o sono sem ler datas futuras', async () => {
    const { u, p, id } = await preparar();
    await metricas(u.id);
    let r = await lerRevisao(u.id, id, agora);
    expect(r.comparacoes[0]).toMatchObject({
      nReferencia: 7,
      nObservacao: 9,
      medianaReferencia: 420,
      medianaObservacao: 480,
      diferenca: 60,
      apta: true,
    });
    expect(r.comparacoes[1]).toMatchObject({
      medianaReferencia: 2,
      medianaObservacao: 4,
      diferenca: 2,
    });
    const [m] = await queryRows<{ id: string }>(
      'SELECT id FROM daily_metrics WHERE user_id=? AND date=?',
      [u.id, '2026-10-20']
    );
    expect(r.linhas.find((l) => l.data === '2026-10-20')?.energiaId).toBe(m.id);
    const outra = await criarExperiencia(
      u.session,
      { ...p, pedidoId: randomUUID(), alinhamentoSono: 1 },
      inicioReal
    );
    await executeStatement(
      'INSERT INTO daily_metrics(id,user_id,date,sleep_duration_minutes) VALUES(?,?,?,?)',
      [randomUUID(), u.id, '2026-10-29', 600]
    );
    r = await lerRevisao(u.id, outra.id, agora);
    expect(r.comparacoes[0].nObservacao).toBe(8);
    expect(r.linhas.find((l) => l.data === '2026-10-28')).toMatchObject({
      dataSono: '2026-10-29',
      sono: null,
      sonoId: null,
    });
    expect(r.sobrepostas).toBe(1);
    expect(r.revisao.join(' ')).toContain('período sobreposto');
  });
  it('encerra de verdade, inclusive durante pausa, e não conta dias após interrupção', async () => {
    const { u, id } = await preparar();
    await metricas(u.id);
    await agirNaExperiencia(
      u.id,
      id,
      'pausar',
      1,
      new Date('2026-10-22T10:00Z')
    );
    await agirNaExperiencia(
      u.id,
      id,
      'encerrar',
      2,
      new Date('2026-10-23T10:00Z')
    );
    const r = await lerRevisao(u.id, id, agora);
    expect(r.experiencia).toMatchObject({
      estado: 'encerrada',
      versao: 3,
      dataEncerramento: '2026-10-23',
    });
    expect(r.pausas[0].fim).toBe('2026-10-23');
    expect(r.fimObservado).toBe('2026-10-23');
    expect(r.linhas.filter((l) => l.fase === 'observacao')).toHaveLength(4);
    await expect(
      agirNaExperiencia(u.id, id, 'retomar', 3, agora)
    ).rejects.toMatchObject({ statusCode: 409 });
    await expect(
      salvarRelato(u.id, id, anotacao('2026-10-24'), agora)
    ).rejects.toMatchObject({ statusCode: 400 });
    await salvarRelato(u.id, id, anotacao('2026-10-21'), agora);
    expect((await lerRevisao(u.id, id, agora)).relatos).toHaveLength(1);
  });
  it('expõe insuficiência e quota reduzida sem recuperar métricas antigas por snapshot', async () => {
    const { u, id } = await preparar();
    expect(
      (await lerRevisao(u.id, id, agora)).comparacoes.every(
        (c) => !c.apta && c.medianaReferencia === null
      )
    ).toBe(true);
    await metricas(u.id);
    await recurso(true, 'metrics_history_days', 7);
    try {
      const r = await lerRevisao(u.id, id, agora);
      expect(r.comparacoes[0]).toMatchObject({
        nReferencia: 0,
        apta: false,
        medianaReferencia: null,
      });
      expect(
        r.linhas
          .filter((l) => l.fase === 'referencia')
          .every(
            (l) => l.foraDoHistorico && l.sono === null && l.sonoId === null
          )
      ).toBe(true);
    } finally {
      await recurso(true, 'metrics_history_days', 30);
    }
  });
  it('usa o fuso preservado no início e recusa ações depois do período sem inventar conclusão', async () => {
    const u = await criarUsuario();
    await executeStatement(
      "UPDATE profiles SET residence_location='Apia',residence_latitude=-13.83,residence_longitude=-171.75,residence_timezone='Pacific/Apia' WHERE id=?",
      [u.id]
    );
    const p = {
      ...proposta(),
      pedidoId: randomUUID(),
      inicio: '2026-10-29',
      dias: 3,
      inicioReferencia: '2026-10-22',
      fimReferencia: '2026-10-28',
    };
    const { id } = await criarExperiencia(u.session, p, agora);
    await executeStatement(
      "UPDATE profiles SET residence_timezone='America/Los_Angeles',residence_location='Los Angeles',residence_latitude=34.05,residence_longitude=-118.24 WHERE id=?",
      [u.id]
    );
    const r = await lerRevisao(u.id, id, agora);
    expect(r.hoje).toBe('2026-10-29');
    expect(r.experiencia.fuso).toBe('Pacific/Apia');
    await expect(
      agirNaExperiencia(u.id, id, 'pausar', 1, new Date('2026-11-02T12:00Z'))
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(
      (await lerRevisao(u.id, id, new Date('2026-11-02T12:00Z'))).experiencia
        .estado
    ).toBe('em_curso');
  });
  it('respeita revogação e exportação, removendo só a experiência e seus vínculos', async () => {
    const { u, id } = await preparar();
    await salvarRelato(u.id, id, anotacao(), agora);
    await agirNaExperiencia(u.id, id, 'pausar', 1, agora);
    await metricas(u.id);
    const ex = await exportarDadosDoTitular(u.id);
    expect(ex.personal_experiments).toHaveLength(1);
    expect(ex.personal_experiment_notes).toHaveLength(1);
    expect(ex.personal_experiment_pauses).toHaveLength(1);
    await recurso(false);
    try {
      expect((await chamar(central.GET, { usuario: u })).status).toBe(403);
      expect(
        (
          await chamar(individual.POST, {
            usuario: u,
            method: 'POST',
            params: { id },
            body: { acao: 'encerrar', versao: 2 },
          })
        ).status
      ).toBe(403);
    } finally {
      await recurso(true);
    }
    expect(
      (
        await chamar(individual.GET, { usuario: u, params: { id } })
      ).headers.get('cache-control')
    ).toBe('private, no-store');
    await excluirExperiencia(u.id, id, 2);
    for (const tabela of [
      'personal_experiments',
      'personal_experiment_notes',
      'personal_experiment_pauses',
    ])
      expect(
        await contar(`SELECT COUNT(*) total FROM ${tabela} WHERE user_id=?`, [
          u.id,
        ])
      ).toBe(0);
    expect(
      await contar('SELECT COUNT(*) total FROM daily_metrics WHERE user_id=?', [
        u.id,
      ])
    ).toBe(16);
    const nova = await criarExperiencia(u.session, proposta(), inicioReal);
    await salvarRelato(u.id, nova.id, anotacao(), agora);
    await excluirConta(u.id);
    expect(
      await contar(
        'SELECT COUNT(*) total FROM personal_experiments WHERE user_id=?',
        [u.id]
      )
    ).toBe(0);
    expect(
      await contar(
        'SELECT COUNT(*) total FROM personal_experiment_notes WHERE user_id=?',
        [u.id]
      )
    ).toBe(0);
  });
});
