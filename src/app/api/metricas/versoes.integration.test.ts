import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  criarUsuario,
  contar,
  type UsuarioDeTeste,
} from '../../../../tests/integration/fixtures';
import { chamar } from '../../../../tests/integration/http';
import { assignPlanToUserByAdmin } from '@/lib/plans/service';
import { executeStatement, queryRows } from '@/lib/mysql/pool';
import { exportarDadosDoTitular } from '@/lib/lgpd/conta';
import {
  gravarSessaoDoSensor,
  somarMinutosDeMeditacao,
} from '@/lib/metricas/gravacao';
import {
  prepararContextoOffline,
  sincronizarOperacao,
} from '@/lib/offline/servidor';
import type { VersaoDoRegistro } from '@/lib/metricas/versoes';
import * as registro from './dia/route';
import * as versoes from './versoes/route';

const data = new Date().toISOString().slice(0, 10);
async function gravar(u: UsuarioDeTeste, valores: Record<string, number>) {
  return chamar(registro.POST, {
    method: 'POST',
    body: { data, valores },
    usuario: u,
  });
}
async function listar(u: UsuarioDeTeste, antes?: number) {
  return chamar(versoes.GET, {
    path: `/api/metricas/versoes?data=${data}${antes === undefined ? '' : `&antes=${antes}`}`,
    usuario: u,
  });
}
function corpo(r: Awaited<ReturnType<typeof listar>>) {
  return r.json as { versoes: VersaoDoRegistro[]; proximo: number | null };
}
async function desfazer(u: UsuarioDeTeste, id: string, dia = data) {
  return chamar(versoes.POST, {
    method: 'POST',
    body: { data: dia, id },
    usuario: u,
  });
}
async function atual(u: UsuarioDeTeste) {
  return (
    await chamar(registro.GET, {
      path: `/api/metricas/dia?data=${data}`,
      usuario: u,
    })
  ).json as { registro: Record<string, number | null> };
}

describe('histórico recuperável dos registros manuais (129)', () => {
  it('registra zero, ausência, campos e valores anteriores; restaura sem duplicar o dia', async () => {
    const u = await criarUsuario();
    expect((await gravar(u, { passos: 0, agua: 1.25 })).status).toBe(200);
    let historico = corpo(await listar(u));
    expect(historico.versoes[0]).toMatchObject({
      tipo: 'registro',
      podeDesfazer: true,
      mudancas: {
        passos: { anterior: null, novo: 0 },
        agua: { anterior: null, novo: 1.25 },
      },
    });
    expect((await gravar(u, { passos: 4200 })).status).toBe(200);
    historico = corpo(await listar(u));
    expect(historico.versoes).toHaveLength(2);
    expect(historico.versoes[0].mudancas).toEqual({
      passos: { anterior: 0, novo: 4200 },
    });
    expect((await desfazer(u, historico.versoes[0].id)).status).toBe(200);
    expect((await atual(u)).registro).toMatchObject({
      steps: 0,
      water_liters: 1.25,
    });
    expect(
      await contar('SELECT COUNT(*) total FROM daily_metrics WHERE user_id=?', [
        u.id,
      ])
    ).toBe(1);
    const novas = corpo(await listar(u)).versoes;
    expect(novas).toHaveLength(3);
    expect(novas[0]).toMatchObject({
      tipo: 'desfazer',
      podeDesfazer: true,
      mudancas: { passos: { anterior: 4200, novo: 0 } },
    });
    expect(novas.slice(1).every((v) => !v.podeDesfazer)).toBe(true);
  });
  it('restaura NULL de um primeiro preenchimento e mantém os demais campos ausentes', async () => {
    const u = await criarUsuario();
    await gravar(u, { passos: 0 });
    const id = corpo(await listar(u)).versoes[0].id;
    expect((await desfazer(u, id)).status).toBe(200);
    expect((await atual(u)).registro).toMatchObject({
      steps: null,
      sleep_duration_minutes: null,
      mood_score: null,
    });
  });
  it('gravação sem mudança não cria versões ou invalida o desfazer', async () => {
    const u = await criarUsuario();
    await gravar(u, { agua: 0 });
    await gravar(u, { agua: 0 });
    const h = corpo(await listar(u));
    expect(h.versoes).toHaveLength(1);
    expect(h.versoes[0].podeDesfazer).toBe(true);
  });
  it('recusa versão antiga mesmo quando o valor foi alterado e voltou ao original', async () => {
    const u = await criarUsuario();
    await gravar(u, { passos: 1 });
    const id = corpo(await listar(u)).versoes[0].id;
    await gravar(u, { passos: 2 });
    await gravar(u, { passos: 1 });
    expect((await desfazer(u, id)).status).toBe(409);
    expect((await atual(u)).registro.steps).toBe(1);
  });
  it('apenas uma tentativa concorrente consegue desfazer a mesma revisão', async () => {
    const u = await criarUsuario();
    await gravar(u, { passos: 7 });
    const id = corpo(await listar(u)).versoes[0].id;
    const r = await Promise.all([desfazer(u, id), desfazer(u, id)]);
    expect(r.map((x) => x.status).sort()).toEqual([200, 409]);
    expect(corpo(await listar(u)).versoes).toHaveLength(2);
  });
  it('gravações concorrentes de campos diferentes preservam ambos', async () => {
    const u = await criarUsuario();
    await gravar(u, { passos: 1 });
    const r = await Promise.all([
      gravar(u, { agua: 2 }),
      gravar(u, { passos: 500 }),
    ]);
    expect(r.map((x) => x.status)).toEqual([200, 200]);
    expect((await atual(u)).registro).toMatchObject({
      steps: 500,
      water_liters: 2,
    });
    expect(corpo(await listar(u)).versoes).toHaveLength(3);
  });
  it('sensor posterior impede restaurar valor antigo e mantém a origem da medição', async () => {
    const u = await criarUsuario();
    await gravar(u, { fcRepouso: 70 });
    const id = corpo(await listar(u)).versoes[0].id;
    await gravarSessaoDoSensor(u.id, {
      data,
      minutos: 5,
      amostras: 300,
      fcMinima: 55,
      fcMedia: 65,
      fcMaxima: 85,
      fcRepousoEstimada: 60,
      rmssd: 30,
    });
    expect((await desfazer(u, id)).status).toBe(409);
    expect((await atual(u)).registro).toMatchObject({
      resting_heart_rate: 60,
      sensor_minutes: 5,
    });
    expect(corpo(await listar(u)).versoes).toHaveLength(1);
  });
  it('prática posterior não é anulada por uma revisão manual antiga', async () => {
    const u = await criarUsuario();
    await gravar(u, { meditacao: 3 });
    const id = corpo(await listar(u)).versoes[0].id;
    await somarMinutosDeMeditacao(u.id, data, 2);
    expect((await desfazer(u, id)).status).toBe(409);
    expect((await atual(u)).registro.meditation_minutes).toBe(5);
  });
  it('recusa acesso cruzado, sessão ausente e manipulação da data', async () => {
    const u = await criarUsuario(),
      outra = await criarUsuario();
    await gravar(u, { passos: 10 });
    const id = corpo(await listar(u)).versoes[0].id;
    expect(corpo(await listar(outra)).versoes).toEqual([]);
    expect((await desfazer(outra, id)).status).toBe(404);
    expect(
      (
        await chamar(versoes.GET, {
          path: `/api/metricas/versoes?data=${data}`,
          usuario: null,
        })
      ).status
    ).toBe(401);
    expect(
      (
        await chamar(versoes.POST, {
          method: 'POST',
          body: { data, id },
          usuario: null,
        })
      ).status
    ).toBe(401);
    const ontem = new Date();
    ontem.setUTCDate(ontem.getUTCDate() - 1);
    expect(
      (await desfazer(u, id, ontem.toISOString().slice(0, 10))).status
    ).toBe(404);
    expect((await desfazer(u, id, '2020-01-01')).status).toBe(400);
  });
  it('limites do plano são verificados no servidor para leitura e desfazer', async () => {
    const u = await criarUsuario();
    await gravar(u, { passos: 8 });
    const id = corpo(await listar(u)).versoes[0].id;
    const originais = await queryRows<{ id: string; enabled: number }>(
      "SELECT e.id,e.enabled FROM plan_entitlements e JOIN subscription_plans p ON p.id=e.plan_id JOIN plan_features f ON f.id=e.feature_id WHERE p.plan_key='care' AND f.feature_key='daily_checkin'"
    );
    try {
      for (const e of originais)
        await executeStatement(
          'UPDATE plan_entitlements SET enabled=FALSE WHERE id=?',
          [e.id]
        );
      expect((await listar(u)).status).toBe(403);
      expect((await desfazer(u, id)).status).toBe(403);
    } finally {
      for (const e of originais)
        await executeStatement(
          'UPDATE plan_entitlements SET enabled=? WHERE id=?',
          [e.enabled, e.id]
        );
    }
  });
  it('exclui histórico expirado e o inclui na exportação apenas enquanto retido', async () => {
    const u = await criarUsuario();
    await gravar(u, { passos: 20 });
    const id = corpo(await listar(u)).versoes[0].id;
    const exportacao = await exportarDadosDoTitular(u.id);
    expect(JSON.stringify(exportacao)).toContain(id);
    await executeStatement(
      'UPDATE manual_metric_versions SET created_at=UTC_TIMESTAMP()-INTERVAL 91 DAY WHERE id=?',
      [id]
    );
    expect(corpo(await listar(u)).versoes).toEqual([]);
    expect(
      await contar(
        'SELECT COUNT(*) total FROM manual_metric_versions WHERE user_id=?',
        [u.id]
      )
    ).toBe(0);
    expect((await desfazer(u, id)).status).toBe(404);
    expect(JSON.stringify(await exportarDadosDoTitular(u.id))).not.toContain(
      id
    );
  });
  it('exclusão definitiva do registro impede recuperar a versão após recriar o mesmo dia', async () => {
    const u = await criarUsuario();
    await gravar(u, { passos: 123 });
    const id = corpo(await listar(u)).versoes[0].id;
    await executeStatement('DELETE FROM daily_metrics WHERE user_id=?', [u.id]);
    expect(
      await contar(
        'SELECT COUNT(*) total FROM manual_metric_versions WHERE user_id=?',
        [u.id]
      )
    ).toBe(0);
    await gravar(u, { passos: 456 });
    expect((await desfazer(u, id)).status).toBe(404);
    expect((await atual(u)).registro.steps).toBe(456);
    await executeStatement('DELETE FROM users WHERE id=?', [u.id]);
    expect(
      await contar(
        'SELECT COUNT(*) total FROM manual_metric_versions WHERE user_id=?',
        [u.id]
      )
    ).toBe(0);
  });
  it('pagina 20 alterações sem duplicar nem perder as demais', async () => {
    const u = await criarUsuario();
    for (let i = 0; i < 23; i++) await gravar(u, { passos: i });
    const p1 = corpo(await listar(u));
    expect(p1.versoes).toHaveLength(20);
    expect(p1.proximo).not.toBeNull();
    const p2 = corpo(await listar(u, p1.proximo!));
    expect(p2.versoes).toHaveLength(3);
    expect(p2.proximo).toBeNull();
    expect(new Set([...p1.versoes, ...p2.versoes].map((v) => v.id)).size).toBe(
      23
    );
  });
  it('sincronização offline produz uma versão e não a duplica ao repetir o recibo', async () => {
    const u = await criarUsuario();
    const contexto = await prepararContextoOffline(u.session);
    const base = contexto.bases.find(
      (b) => b.tipo === 'registro' && b.data === data
    )!;
    const op = {
      id: randomUUID(),
      tipo: 'registro' as const,
      salvoLocalEm: new Date().toISOString(),
      base: base.revisao,
      conteudo: { data, valores: { passos: 21 } },
    };
    await sincronizarOperacao(u.session, contexto.permissao, op);
    await sincronizarOperacao(u.session, contexto.permissao, op);
    expect(corpo(await listar(u)).versoes).toHaveLength(1);
    expect((await atual(u)).registro.steps).toBe(21);
  });
  it('consulta versões antigas retidas, mas não desfaz fora da janela de edição', async () => {
    const u = await criarUsuario(),
      admin = await criarUsuario('admin');
    await assignPlanToUserByAdmin({
      targetUserId: u.id,
      actorUserId: admin.id,
      planKey: 'care',
    });
    await gravar(u, { passos: 30 });
    const id = corpo(await listar(u)).versoes[0].id;
    const antiga = new Date();
    antiga.setUTCDate(antiga.getUTCDate() - 8);
    const dia = antiga.toISOString().slice(0, 10);
    await executeStatement('UPDATE daily_metrics SET date=? WHERE user_id=?', [
      dia,
      u.id,
    ]);
    await executeStatement(
      'UPDATE manual_metric_versions SET record_date=? WHERE user_id=?',
      [dia, u.id]
    );
    const r = await chamar(versoes.GET, {
      path: `/api/metricas/versoes?data=${dia}`,
      usuario: u,
    });
    expect(r.status).toBe(200);
    expect(corpo(r).versoes).toHaveLength(1);
    expect(corpo(r).versoes[0].podeDesfazer).toBe(false);
    expect((await desfazer(u, id, dia)).status).toBe(400);
  });
  it('recalcula os resultados dependentes ao restaurar os sinais anteriores', async () => {
    const u = await criarUsuario(),
      admin = await criarUsuario('admin');
    await assignPlanToUserByAdmin({
      targetUserId: u.id,
      actorUserId: admin.id,
      planKey: 'care',
    });
    await gravar(u, { sono: 480, energia: 4, estresse: 20 });
    const antes = (await atual(u)).registro;
    expect(antes.readiness_score).not.toBeNull();
    await gravar(u, { energia: 1, estresse: 90 });
    const depois = (await atual(u)).registro;
    expect(depois.readiness_score).not.toBe(antes.readiness_score);
    const id = corpo(await listar(u)).versoes[0].id;
    expect((await desfazer(u, id)).status).toBe(200);
    const restaurado = (await atual(u)).registro;
    expect(restaurado.readiness_score).toBe(antes.readiness_score);
    expect(restaurado.recovery_score).toBe(antes.recovery_score);
  });
});
