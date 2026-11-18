import { randomUUID } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { criarUsuario, contar } from '../../../tests/integration/fixtures';
import { chamar } from '../../../tests/integration/http';
import { executeStatement, queryRows } from '@/lib/mysql/pool';
import {
  agirNaMeditacao,
  iniciarMeditacao,
  lerCentralDeMeditacoes,
} from '@/lib/meditacoes/servico';
import { praticaPorId } from '@/lib/meditacoes/catalogo';
import { exportarDadosDoTitular, excluirConta } from '@/lib/lgpd/conta';
import { lerLinhaDoTempo } from '@/lib/linha-do-tempo/servico';
import * as central from './meditacoes/route';
import * as individual from './meditacoes/[id]/route';

const t0 = new Date('2026-10-29T12:00:00Z');
const mais = (s: number) => new Date(t0.getTime() + s * 1000);
const pausa = praticaPorId('pausa-de-tres-minutos')!;
const pedido = (extra = {}) => ({
  id: randomUUID(),
  pratica: pausa.id,
  versao: pausa.versao,
  ...extra,
});
async function meditacaoDoDia(userId: string, data = '2026-10-29') {
  const [r] = await queryRows<{ m: number | null }>(
    'SELECT meditation_minutes m FROM daily_metrics WHERE user_id=? AND date=?',
    [userId, data]
  );
  return r ? r.m : null;
}
async function recurso(habilitado: boolean) {
  await executeStatement(
    "UPDATE plan_entitlements e JOIN subscription_plans p ON p.id=e.plan_id JOIN plan_features f ON f.id=e.feature_id SET e.enabled=? WHERE p.plan_key='care' AND f.feature_key='guided_breathing'",
    [habilitado]
  );
}

describe('biblioteca de práticas guiadas com MySQL real', () => {
  it('exige sessão nas leituras e mutações', async () => {
    expect((await chamar(central.GET, { usuario: null })).status).toBe(401);
    expect(
      (await chamar(central.POST, { usuario: null, method: 'POST', body: {} }))
        .status
    ).toBe(401);
    expect(
      (
        await chamar(individual.POST, {
          usuario: null,
          method: 'POST',
          params: { id: randomUUID() },
          body: {},
        })
      ).status
    ).toBe(401);
  });

  it('inicia com idempotência e recusa prática desconhecida, versão antiga e segunda sessão', async () => {
    const u = await criarUsuario(),
      p = pedido();
    const a = await iniciarMeditacao(u.session, p, t0),
      b = await iniciarMeditacao(u.session, p, mais(5));
    expect(b.id).toBe(a.id);
    expect(a).toMatchObject({
      pratica: pausa.id,
      titulo: pausa.titulo,
      alvoSegundos: 180,
      estado: 'running',
      dataLocal: '2026-10-29',
      minutosRegistrados: null,
    });
    await expect(
      iniciarMeditacao(u.session, { ...p, pratica: 'preparar-o-sono' }, t0)
    ).rejects.toMatchObject({ statusCode: 409 });
    await expect(
      iniciarMeditacao(u.session, pedido({ pratica: 'nao-existe' }), t0)
    ).rejects.toMatchObject({ statusCode: 404 });
    await expect(
      iniciarMeditacao(u.session, pedido({ versao: pausa.versao + 1 }), t0)
    ).rejects.toMatchObject({ statusCode: 409 });
    await expect(
      iniciarMeditacao(u.session, pedido(), t0)
    ).rejects.toMatchObject({ statusCode: 409 });
    for (const corpo of [
      { ...pedido(), extra: 1 },
      { ...pedido(), pratica: '../x' },
      { ...pedido(), id: 'x' },
    ])
      expect(
        (
          await chamar(central.POST, {
            usuario: u,
            method: 'POST',
            body: corpo,
          })
        ).status
      ).toBe(400);
  });

  it('mede pausas pelo servidor e soma só minutos inteiros, uma única vez', async () => {
    const u = await criarUsuario(),
      s = await iniciarMeditacao(u.session, pedido(), t0);
    let r = await agirNaMeditacao(
      u.session,
      s.id,
      { acao: 'pausar', versao: 1 },
      mais(70)
    );
    expect(r).toMatchObject({ estado: 'paused', decorridoMs: 70000 });
    // Tempo pausado não conta.
    r = await agirNaMeditacao(
      u.session,
      s.id,
      { acao: 'retomar', versao: 2 },
      mais(500)
    );
    expect(r.decorridoMs).toBe(70000);
    await expect(
      agirNaMeditacao(
        u.session,
        s.id,
        { acao: 'retomar', versao: 2 },
        mais(510)
      )
    ).rejects.toMatchObject({ statusCode: 409 });
    r = await agirNaMeditacao(
      u.session,
      s.id,
      { acao: 'encerrar', versao: 3 },
      mais(560)
    );
    expect(r).toMatchObject({
      estado: 'ended',
      decorridoMs: 130000,
      minutosRegistrados: 2,
    });
    expect(await meditacaoDoDia(u.id)).toBe(2);
    // Repetir o encerramento confirma sem somar de novo.
    const repetido = await agirNaMeditacao(
      u.session,
      s.id,
      { acao: 'encerrar', versao: 1 },
      mais(900)
    );
    expect(repetido.minutosRegistrados).toBe(2);
    expect(await meditacaoDoDia(u.id)).toBe(2);
    await expect(
      agirNaMeditacao(u.session, s.id, { acao: 'pausar', versao: 4 }, mais(901))
    ).rejects.toMatchObject({ statusCode: 409 });

    // Prática completa: limitada à duração, mesmo encerrada depois.
    const c = await iniciarMeditacao(u.session, pedido(), mais(1000));
    await expect(
      agirNaMeditacao(
        u.session,
        c.id,
        { acao: 'retomar', versao: 1 },
        mais(1010)
      )
    ).rejects.toMatchObject({ statusCode: 409 });
    const completa = await agirNaMeditacao(
      u.session,
      c.id,
      { acao: 'encerrar', versao: 1 },
      mais(1000 + 400)
    );
    expect(completa).toMatchObject({
      estado: 'completed',
      decorridoMs: 180000,
      minutosRegistrados: 3,
    });
    expect(await meditacaoDoDia(u.id)).toBe(5);

    // Menos de um minuto: nada é somado à meditação.
    const curta = await iniciarMeditacao(u.session, pedido(), mais(2000));
    const r2 = await agirNaMeditacao(
      u.session,
      curta.id,
      { acao: 'encerrar', versao: 1 },
      mais(2045)
    );
    expect(r2).toMatchObject({ estado: 'ended', minutosRegistrados: 0 });
    expect(await meditacaoDoDia(u.id)).toBe(5);

    const c2 = await lerCentralDeMeditacoes(u.session, mais(3000));
    expect(c2.ativa).toBeNull();
    expect(c2.totais).toEqual({ sessoes: 3, concluidas: 1, minutos: 5 });
    expect(c2.historico.map((h) => h.estado)).toEqual([
      'ended',
      'completed',
      'ended',
    ]);
    // A prática aparece na linha do tempo como prática, no dia local.
    const linha = await lerLinhaDoTempo(
      u.session,
      { inicio: '2026-10-29', fim: '2026-10-29', pagina: 0 },
      mais(3000)
    );
    expect(
      linha.itens.filter((i) => i.origem === 'meditacao').map((i) => i.resumo)
    ).toEqual([
      'Interrompida · 2 de 3 min · 2 min somados à meditação do dia',
      'Concluída · 3 de 3 min · 3 min somados à meditação do dia',
      'Interrompida · 0 de 3 min · nenhum minuto somado',
    ]);
  });

  it('isola titulares, respeita o plano, exporta e exclui com a conta', async () => {
    const dono = await criarUsuario(),
      outro = await criarUsuario(),
      s = await iniciarMeditacao(dono.session, pedido());
    expect(
      (
        await chamar(individual.POST, {
          usuario: outro,
          method: 'POST',
          params: { id: s.id },
          body: { acao: 'pausar', versao: 1 },
        })
      ).status
    ).toBe(404);
    expect(
      (
        await chamar(central.POST, {
          usuario: outro,
          method: 'POST',
          body: { id: s.id, pratica: pausa.id, versao: pausa.versao },
        })
      ).status
    ).toBe(404);
    const lista = await chamar(central.GET, { usuario: outro });
    expect(lista.status).toBe(200);
    expect(lista.headers.get('cache-control')).toBe('private, no-store');
    expect((lista.json as { ativa: unknown }).ativa).toBeNull();
    await recurso(false);
    try {
      expect((await chamar(central.GET, { usuario: dono })).status).toBe(403);
      expect(
        (
          await chamar(individual.POST, {
            usuario: dono,
            method: 'POST',
            params: { id: s.id },
            body: { acao: 'pausar', versao: 1 },
          })
        ).status
      ).toBe(403);
    } finally {
      await recurso(true);
    }
    const ex = await exportarDadosDoTitular(dono.id);
    expect(ex.meditation_sessions).toHaveLength(1);
    await excluirConta(dono.id);
    expect(
      await contar(
        'SELECT COUNT(*) total FROM meditation_sessions WHERE user_id=?',
        [dono.id]
      )
    ).toBe(0);
  });
});
