import { describe, expect, it } from 'vitest';
import { executeStatement, queryRows } from '@/lib/mysql/pool';
import { exportarDadosDoTitular, excluirConta } from '@/lib/lgpd/conta';
import {
  agirSobreAviso,
  criarLembrete,
  listarCentral,
  processarLembretes,
  salvarPreferencias,
} from '@/lib/lembretes/servico';
import type {
  CentralDeLembretes,
  DadosDoLembrete,
} from '@/lib/lembretes/esquema';
import { criarUsuario, contar } from '../../../tests/integration/fixtures';
import { chamar } from '../../../tests/integration/http';
import * as central from './lembretes/route';
import * as individual from './lembretes/[id]/route';
import * as preferencias from './lembretes/preferencias/route';
import * as verificar from './lembretes/verificar/route';
import * as avisos from './lembretes/avisos/[id]/route';
import * as notificacoes from './notificacoes/route';

const dados: DadosDoLembrete = {
  titulo: 'Respirar com calma',
  atividade: 'respiracao',
  hora: '09:00',
  dias: [0, 1, 2, 3, 4, 5, 6],
  ativo: true,
};
const agora = new Date('2026-10-28T12:05:00Z');
const antes = new Date('2026-10-27T00:00:00Z');
async function preparar() {
  const u = await criarUsuario();
  const c = await listarCentral(u.id);
  await salvarPreferencias(u.id, {
    ...c.preferencias,
    fuso: 'America/Sao_Paulo',
  });
  await executeStatement(
    "UPDATE reminder_preferences SET timezone_since='2026-10-27 00:00:00' WHERE user_id=?",
    [u.id]
  );
  return u;
}
async function recurso(habilitado: boolean, chave = 'personal_notifications') {
  await executeStatement(
    `UPDATE plan_entitlements e JOIN subscription_plans p ON p.id=e.plan_id JOIN plan_features f ON f.id=e.feature_id SET e.enabled=? WHERE p.plan_key='free' AND f.feature_key=?`,
    [habilitado, chave]
  );
}

describe('lembretes pessoais persistidos no MySQL', () => {
  it('limita a criação simultânea sem exceder 50 lembretes', async () => {
    const u = await preparar();
    const criacoes = await Promise.allSettled(
      Array.from({ length: 52 }, () => criarLembrete(u.id, dados, antes))
    );
    expect(criacoes.filter((r) => r.status === 'fulfilled')).toHaveLength(50);
    expect(criacoes.filter((r) => r.status === 'rejected')).toHaveLength(2);
    expect((await listarCentral(u.id)).lembretes).toHaveLength(50);
  });
  it('leva o aviso preparado durante o silêncio noturno até a manhã, sem duplicar', async () => {
    const u = await preparar();
    const c = await listarCentral(u.id);
    await salvarPreferencias(u.id, { ...c.preferencias, silencioAtivo: true });
    await criarLembrete(u.id, { ...dados, hora: '23:00' }, antes);
    expect(await processarLembretes(u.id, new Date('2026-10-29T02:05Z'))).toBe(
      0
    );
    expect(await processarLembretes(u.id, new Date('2026-10-29T09:59Z'))).toBe(
      0
    );
    expect(await processarLembretes(u.id, new Date('2026-10-29T10:00Z'))).toBe(
      1
    );
    expect(await processarLembretes(u.id, new Date('2026-10-29T10:01Z'))).toBe(
      0
    );
  });
  it('troca o fuso de verdade e cancela pendências do fuso anterior', async () => {
    const u = await preparar();
    let c = await listarCentral(u.id);
    await salvarPreferencias(u.id, {
      ...c.preferencias,
      silencioAtivo: true,
      inicioSilencio: '08:00',
      fimSilencio: '10:00',
    });
    await criarLembrete(u.id, dados, antes);
    expect(await processarLembretes(u.id, agora)).toBe(0);
    c = await listarCentral(u.id);
    await salvarPreferencias(u.id, { ...c.preferencias, fuso: 'Asia/Tokyo' });
    const [p] = await queryRows<{ timezone: string; timezone_since: string }>(
      'SELECT timezone,timezone_since FROM reminder_preferences WHERE user_id=?',
      [u.id]
    );
    expect(p.timezone).toBe('Asia/Tokyo');
    expect(p.timezone_since).not.toBe('2026-10-27 00:00:00');
    const [o] = await queryRows<{ state: string }>(
      'SELECT state FROM reminder_occurrences WHERE user_id=?',
      [u.id]
    );
    expect(o.state).toBe('dismissed');
  });
  it('excluir um lembrete remove também os avisos persistidos do sino', async () => {
    const u = await preparar();
    const id = await criarLembrete(u.id, dados, antes);
    await processarLembretes(u.id, agora);
    expect(
      (
        await chamar(individual.DELETE, {
          method: 'DELETE',
          usuario: u,
          params: { id },
          body: { versao: 1 },
        })
      ).status
    ).toBe(200);
    expect(
      await contar(
        'SELECT COUNT(*) AS total FROM user_notifications WHERE user_id=?',
        [u.id]
      )
    ).toBe(0);
    expect(
      await contar(
        'SELECT COUNT(*) AS total FROM reminder_occurrences WHERE user_id=?',
        [u.id]
      )
    ).toBe(0);
  });
  it('exige sessão em todos os pontos de entrada', async () => {
    for (const [handler, method] of [
      [central.GET, 'GET'],
      [central.POST, 'POST'],
      [individual.PUT, 'PUT'],
      [individual.DELETE, 'DELETE'],
      [preferencias.PUT, 'PUT'],
      [verificar.POST, 'POST'],
      [avisos.POST, 'POST'],
    ] as const) {
      const r = await chamar(handler, {
        method,
        usuario: null,
        body: method === 'GET' ? undefined : {},
        params: { id: crypto.randomUUID() },
      });
      expect(r.status).toBe(401);
    }
  });
  it('faz CRUD, pausa/retoma e recusa conflito sem sobrescrever', async () => {
    const u = await preparar();
    const r = await chamar(central.POST, {
      method: 'POST',
      usuario: u,
      body: dados,
    });
    expect(r.status).toBe(201);
    const { id } = r.json as { id: string };
    const ler = await chamar(central.GET, { usuario: u });
    expect(ler.headers.get('cache-control')).toBe('private, no-store');
    const c = ler.json as CentralDeLembretes;
    expect(c.lembretes).toMatchObject([{ id, ...dados, versao: 1 }]);
    expect(
      (
        await chamar(individual.PUT, {
          method: 'PUT',
          params: { id },
          body: {
            ...dados,
            titulo: 'Pausa de verdade',
            ativo: false,
            versao: 1,
          },
          usuario: u,
        })
      ).status
    ).toBe(200);
    expect(
      (
        await chamar(individual.PUT, {
          method: 'PUT',
          params: { id },
          body: { ...dados, versao: 1 },
          usuario: u,
        })
      ).status
    ).toBe(409);
    expect((await listarCentral(u.id)).lembretes[0]).toMatchObject({
      titulo: 'Pausa de verdade',
      ativo: false,
      versao: 2,
    });
    expect(
      (
        await chamar(individual.PUT, {
          method: 'PUT',
          params: { id },
          body: { ...dados, versao: 2 },
          usuario: u,
        })
      ).status
    ).toBe(200);
    expect(
      (
        await chamar(individual.DELETE, {
          method: 'DELETE',
          params: { id },
          body: { versao: 2 },
          usuario: u,
        })
      ).status
    ).toBe(409);
    expect(
      (
        await chamar(individual.DELETE, {
          method: 'DELETE',
          params: { id },
          body: { versao: 3 },
          usuario: u,
        })
      ).status
    ).toBe(200);
    expect((await listarCentral(u.id)).lembretes).toEqual([]);
  });
  it('não permite ler, alterar, excluir nem adiar por outra conta', async () => {
    const a = await preparar(),
      b = await preparar();
    const id = await criarLembrete(a.id, dados, antes);
    await processarLembretes(a.id, agora);
    const [o] = await queryRows<{ id: string; version: number }>(
      'SELECT id,version FROM reminder_occurrences WHERE user_id=?',
      [a.id]
    );
    expect((await chamar(central.GET, { usuario: b })).json).toMatchObject({
      lembretes: [],
      avisos: [],
    });
    for (const [handler, method, body] of [
      [individual.PUT, 'PUT', { ...dados, versao: 1 }],
      [individual.DELETE, 'DELETE', { versao: 1 }],
    ] as const)
      expect(
        (await chamar(handler, { method, usuario: b, params: { id }, body }))
          .status
      ).toBe(404);
    expect(
      (
        await chamar(avisos.POST, {
          method: 'POST',
          params: { id: o.id },
          body: { acao: 'adiar', minutos: 10, versao: o.version },
          usuario: b,
        })
      ).status
    ).toBe(404);
  });
  it('entrega uma vez entre chamadas concorrentes e reutiliza o sino real', async () => {
    const u = await preparar();
    await criarLembrete(u.id, dados, antes);
    const resultados = await Promise.all(
      Array.from({ length: 5 }, () => processarLembretes(u.id, agora))
    );
    expect(resultados.reduce((s, n) => s + n, 0)).toBe(1);
    expect(await processarLembretes(u.id, new Date('2026-10-28T18:00Z'))).toBe(
      0
    );
    const n = await chamar(notificacoes.GET, { usuario: u });
    expect(n.json).toMatchObject({
      notificacoes: [
        { tipo: 'lembrete_pessoal', titulo: dados.titulo, link: '/lembretes' },
      ],
      naoLidas: 1,
    });
    expect(
      await contar(
        'SELECT COUNT(*) AS total FROM reminder_occurrences WHERE user_id=?',
        [u.id]
      )
    ).toBe(1);
  });
  it('silencia, adia, entrega novamente no horário e recusa repetição da ação', async () => {
    const u = await preparar();
    const c = await listarCentral(u.id);
    await salvarPreferencias(u.id, {
      ...c.preferencias,
      silencioAtivo: true,
      inicioSilencio: '08:00',
      fimSilencio: '10:00',
    });
    await criarLembrete(u.id, dados, antes);
    expect(await processarLembretes(u.id, agora)).toBe(0);
    expect(await processarLembretes(u.id, new Date('2026-10-28T13:00Z'))).toBe(
      1
    );
    let [o] = await queryRows<{ id: string; version: number }>(
      'SELECT id,version FROM reminder_occurrences WHERE user_id=?',
      [u.id]
    );
    await agirSobreAviso(
      u.id,
      o.id,
      { acao: 'adiar', minutos: 10, versao: o.version },
      new Date('2026-10-28T13:01Z')
    );
    await expect(
      agirSobreAviso(
        u.id,
        o.id,
        { acao: 'adiar', minutos: 10, versao: o.version },
        agora
      )
    ).rejects.toThrow(/mudou/);
    expect(await processarLembretes(u.id, new Date('2026-10-28T13:10Z'))).toBe(
      0
    );
    expect(await processarLembretes(u.id, new Date('2026-10-28T13:11Z'))).toBe(
      1
    );
    [o] = await queryRows<{ id: string; version: number }>(
      'SELECT id,version FROM reminder_occurrences WHERE user_id=?',
      [u.id]
    );
    await agirSobreAviso(
      u.id,
      o.id,
      { acao: 'dispensar', versao: o.version },
      new Date('2026-10-28T13:12Z')
    );
    expect(await processarLembretes(u.id, new Date('2026-10-28T15:00Z'))).toBe(
      0
    );
  });
  it('preserva recorrência no dia seguinte e não fabrica horários anteriores à criação', async () => {
    const u = await preparar();
    await criarLembrete(u.id, dados, new Date('2026-10-28T12:01Z'));
    expect(await processarLembretes(u.id, agora)).toBe(0);
    expect(await processarLembretes(u.id, new Date('2026-10-29T12:01Z'))).toBe(
      1
    );
    expect(await processarLembretes(u.id, new Date('2026-10-29T18:01Z'))).toBe(
      0
    );
  });
  it('desativar recurso impede CRUD e entrega; atividade também respeita plano', async () => {
    const u = await preparar();
    await criarLembrete(u.id, dados, antes);
    await recurso(false);
    try {
      expect((await chamar(central.GET, { usuario: u })).status).toBe(403);
      expect(
        (
          await chamar(central.POST, {
            method: 'POST',
            usuario: u,
            body: dados,
          })
        ).status
      ).toBe(403);
      expect(
        (await chamar(verificar.POST, { method: 'POST', usuario: u })).status
      ).toBe(403);
      expect(await processarLembretes(u.id, agora)).toBe(0);
    } finally {
      await recurso(true);
    }
    await recurso(false, 'guided_breathing');
    try {
      expect(
        (
          await chamar(central.POST, {
            method: 'POST',
            usuario: u,
            body: dados,
          })
        ).status
      ).toBe(403);
      expect(await processarLembretes(u.id, agora)).toBe(0);
    } finally {
      await recurso(true, 'guided_breathing');
    }
    expect(await processarLembretes(u.id, agora)).toBe(1);
  });
  it('recusa campos de titular, horários inválidos, silêncio integral e versão obsoleta', async () => {
    const u = await preparar();
    for (const body of [
      { ...dados, user_id: u.id },
      { ...dados, hora: '25:00' },
      { ...dados, dias: [] },
      { ...dados, dias: [1, 1] },
    ])
      expect(
        (await chamar(central.POST, { method: 'POST', usuario: u, body }))
          .status
      ).toBe(400);
    const c = await listarCentral(u.id);
    expect(
      (
        await chamar(preferencias.PUT, {
          method: 'PUT',
          usuario: u,
          body: {
            ...c.preferencias,
            silencioAtivo: true,
            inicioSilencio: '09:00',
            fimSilencio: '09:00',
          },
        })
      ).status
    ).toBe(400);
    expect(
      (
        await chamar(preferencias.PUT, {
          method: 'PUT',
          usuario: u,
          body: { ...c.preferencias, versao: 1 },
        })
      ).status
    ).toBe(409);
  });
  it('exporta os registros e exclui todos os vínculos ao apagar a conta', async () => {
    const u = await preparar();
    const id = await criarLembrete(u.id, dados, antes);
    await processarLembretes(u.id, agora);
    const exportacao = await exportarDadosDoTitular(u.id);
    expect(exportacao.personal_reminders).toHaveLength(1);
    expect(exportacao.reminder_preferences).toHaveLength(1);
    expect(exportacao.reminder_occurrences).toHaveLength(1);
    await excluirConta(u.id);
    for (const tabela of [
      'personal_reminders',
      'reminder_preferences',
      'reminder_occurrences',
      'user_notifications',
    ])
      expect(
        await contar(
          `SELECT COUNT(*) AS total FROM ${tabela} WHERE user_id=?`,
          [u.id]
        )
      ).toBe(0);
    expect(
      await contar(
        'SELECT COUNT(*) AS total FROM reminder_occurrences WHERE reminder_id=?',
        [id]
      )
    ).toBe(0);
  });
});
