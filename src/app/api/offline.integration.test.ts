import { randomUUID } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { criarUsuario, contar } from '../../../tests/integration/fixtures';
import { chamar } from '../../../tests/integration/http';
import { executeStatement, queryRows } from '@/lib/mysql/pool';
import {
  prepararContextoOffline,
  sincronizarOperacao,
  lerBaseOffline,
  ConflitoOffline,
} from '@/lib/offline/servidor';
import {
  emitirPermissaoOffline,
  exigirPermissaoOffline,
} from '@/lib/offline/permissao';
import { verifySessionToken } from '@/lib/auth/session';
import { exportarDadosDoTitular } from '@/lib/lgpd/conta';
import type { OperacaoOffline } from '@/lib/offline/esquema';
import * as contexto from './offline/contexto/route';
import * as sincronizar from './offline/sincronizar/route';
const agora = new Date('2026-10-28T12:00:00Z');
async function preparar(tipo: 'registro' | 'reflexao' = 'registro') {
  const u = await criarUsuario();
  await executeStatement(
    "UPDATE plan_entitlements e JOIN subscription_plans p ON p.id=e.plan_id JOIN plan_features f ON f.id=e.feature_id SET e.enabled=TRUE WHERE p.plan_key='care' AND f.feature_key IN ('daily_checkin','evening_reflection')"
  );
  const c = await prepararContextoOffline(u.session, agora);
  const base = c.bases.filter((b) => b.tipo === tipo).at(-1)!;
  const op: OperacaoOffline =
    tipo === 'registro'
      ? {
          id: randomUUID(),
          base: base.revisao,
          salvoLocalEm: agora.toISOString(),
          tipo,
          conteudo: { data: base.data, valores: { passos: 3210, agua: 1.25 } },
        }
      : {
          id: randomUUID(),
          base: base.revisao,
          salvoLocalEm: agora.toISOString(),
          tipo,
          conteudo: {
            data: base.data,
            emocional: 2,
            corpo: 3,
            espiritual: 4,
            frase: 'Minha reflexão sem conexão.',
          },
        };
  return { u, c, op };
}
describe('registros offline com recibos reais no MySQL', () => {
  it('exige sessão real nos dois endpoints', async () => {
    expect((await chamar(contexto.GET, { usuario: null })).status).toBe(401);
    expect(
      (
        await chamar(sincronizar.POST, {
          usuario: null,
          method: 'POST',
          body: {},
        })
      ).status
    ).toBe(401);
  });
  it('a permissão não é login, expira e não autoriza outro titular', async () => {
    const a = randomUUID(),
      b = randomUUID(),
      p = await emitirPermissaoOffline(a, agora);
    // Token ainda válido no relógio real: a recusa como login precisa decorrer da chave/escopo, não de uma data antiga.
    const fresco = await emitirPermissaoOffline(a);
    await exigirPermissaoOffline(fresco.token, a);
    expect(await verifySessionToken(fresco.token)).toBeNull();
    await exigirPermissaoOffline(p.token, a, agora);
    await expect(
      exigirPermissaoOffline(p.token, b, agora)
    ).rejects.toMatchObject({ statusCode: 403 });
    await expect(
      exigirPermissaoOffline(p.token, a, new Date(+agora + 86400001))
    ).rejects.toMatchObject({ statusCode: 403 });
  });
  it('copia somente a categoria escolhida e as datas reais permitidas', async () => {
    const { u } = await preparar();
    const c = await prepararContextoOffline(u.session, agora, {
      registro: false,
      reflexao: true,
    });
    expect(c.recursos.registro).toBe(false);
    expect(c.bases.every((b) => b.tipo === 'reflexao')).toBe(true);
    expect(c.bases.map((b) => b.data)).toEqual(['2026-10-28', '2026-10-27']);
  });
  it('confirma repetição concorrente sem duplicar dados ou recibo e rejeita alteração do mesmo ID', async () => {
    const { u, c, op } = await preparar();
    const r = await Promise.all([
      sincronizarOperacao(u.session, c.permissao, op, agora),
      sincronizarOperacao(u.session, c.permissao, op, agora),
    ]);
    expect(r.map((v) => v.repetida).sort()).toEqual([false, true]);
    expect(r[0].revisao).toBe(r[1].revisao);
    expect(
      await contar(
        'SELECT COUNT(*) total FROM offline_operation_receipts WHERE user_id=?',
        [u.id]
      )
    ).toBe(1);
    expect(
      await contar('SELECT COUNT(*) total FROM daily_metrics WHERE user_id=?', [
        u.id,
      ])
    ).toBe(1);
    expect(
      (await lerBaseOffline(u.id, 'registro', op.conteudo.data)).valores.passos
    ).toBe(3210);
    await expect(
      sincronizarOperacao(
        u.session,
        c.permissao,
        { ...op, salvoLocalEm: new Date(+agora + 1).toISOString() },
        agora
      )
    ).rejects.toMatchObject({ statusCode: 409 });
  });
  it('conflito não sobrescreve edição online nem deixa recibo incompleto; escolha explícita usa novo ID', async () => {
    const { u, c, op } = await preparar();
    await executeStatement(
      'INSERT INTO daily_metrics(id,user_id,date,steps) VALUES(?,?,?,?)',
      [randomUUID(), u.id, op.conteudo.data, 999]
    );
    await expect(
      sincronizarOperacao(u.session, c.permissao, op, agora)
    ).rejects.toBeInstanceOf(ConflitoOffline);
    expect(
      await contar(
        'SELECT COUNT(*) total FROM offline_operation_receipts WHERE user_id=?',
        [u.id]
      )
    ).toBe(0);
    const b = await lerBaseOffline(u.id, 'registro', op.conteudo.data);
    expect(b.valores.passos).toBe(999);
    await sincronizarOperacao(
      u.session,
      c.permissao,
      { ...op, id: randomUUID(), base: b.revisao },
      agora
    );
    expect(
      (await lerBaseOffline(u.id, 'registro', op.conteudo.data)).valores.passos
    ).toBe(3210);
  });
  it('duas propostas novas concorrentes para dia inexistente aplicam somente uma', async () => {
    const { u, c, op } = await preparar('reflexao');
    const r = await Promise.allSettled([
      sincronizarOperacao(u.session, c.permissao, op, agora),
      sincronizarOperacao(
        u.session,
        c.permissao,
        { ...op, id: randomUUID() },
        agora
      ),
    ]);
    expect(r.filter((v) => v.status === 'fulfilled')).toHaveLength(1);
    expect(r.filter((v) => v.status === 'rejected')).toHaveLength(1);
    expect(
      await contar(
        'SELECT COUNT(*) total FROM daily_reflections WHERE user_id=?',
        [u.id]
      )
    ).toBe(1);
  });
  it('grava reflexão integral, preserva isolamento e não confunde recibo com outro titular', async () => {
    const { u, c, op } = await preparar('reflexao'),
      outro = await criarUsuario();
    await sincronizarOperacao(u.session, c.permissao, op, agora);
    expect(
      (await lerBaseOffline(u.id, 'reflexao', op.conteudo.data)).reflexao?.frase
    ).toBe('Minha reflexão sem conexão.');
    const p = await emitirPermissaoOffline(outro.id, agora);
    await expect(
      sincronizarOperacao(outro.session, p.token, op, agora)
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(
      (await lerBaseOffline(outro.id, 'reflexao', op.conteudo.data)).reflexao
    ).toBeNull();
  });
  it('data vencida permanece recusada, mas recibo já aplicado pode ser confirmado com permissão renovada', async () => {
    const { u, c, op } = await preparar('reflexao');
    await sincronizarOperacao(u.session, c.permissao, op, agora);
    const depois = new Date(+agora + 10 * 86400000),
      p = await emitirPermissaoOffline(u.id, depois);
    expect(
      (await sincronizarOperacao(u.session, p.token, op, depois)).repetida
    ).toBe(true);
    await expect(
      sincronizarOperacao(
        u.session,
        p.token,
        { ...op, id: randomUUID() },
        depois
      )
    ).rejects.toMatchObject({ statusCode: 400 });
  });
  it('revalida recurso desabilitado antes de gravar', async () => {
    const { u, c, op } = await preparar();
    await executeStatement(
      "UPDATE plan_entitlements e JOIN subscription_plans p ON p.id=e.plan_id JOIN plan_features f ON f.id=e.feature_id SET e.enabled=FALSE WHERE p.plan_key='care' AND f.feature_key='daily_checkin'"
    );
    await expect(
      sincronizarOperacao(u.session, c.permissao, op, agora)
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(
      await contar(
        'SELECT COUNT(*) total FROM offline_operation_receipts WHERE user_id=?',
        [u.id]
      )
    ).toBe(0);
  });
  it('exporta recibos do titular e a exclusão os remove em cascade', async () => {
    const { u, c, op } = await preparar('reflexao');
    await sincronizarOperacao(u.session, c.permissao, op, agora);
    const exp = await exportarDadosDoTitular(u.id);
    expect(JSON.stringify(exp)).toContain(op.id);
    // A mesma remoção transacional de titular usada no serviço LGPD aciona a FK.
    await executeStatement('DELETE FROM users WHERE id=?', [u.id]);
    expect(
      await contar(
        'SELECT COUNT(*) total FROM offline_operation_receipts WHERE id=?',
        [op.id]
      )
    ).toBe(0);
    expect(
      await queryRows('SELECT id FROM daily_reflections WHERE user_id=?', [
        u.id,
      ])
    ).toHaveLength(0);
  });
});
