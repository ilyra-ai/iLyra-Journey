import { randomUUID } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { criarUsuario, contar } from '../../../tests/integration/fixtures';
import { chamar } from '../../../tests/integration/http';
import { executeStatement } from '@/lib/mysql/pool';
import {
  salvarRotina,
  listarRotinas,
  iniciarRotina,
  agirNaRotina,
  excluirRotina,
} from '@/lib/rotinas/servico';
import { exportarDadosDoTitular, excluirConta } from '@/lib/lgpd/conta';
import type { DadosDaRotina } from '@/lib/rotinas/esquema';
import * as central from './rotinas/route';
import * as individual from './rotinas/[id]/route';
import * as inicio from './rotinas/[id]/iniciar/route';
import * as acoes from './rotinas/execucoes/[id]/route';
const dados = (): DadosDaRotina => ({
  titulo: 'Minha manhã 🌤️',
  dias: [1, 2, 3, 4, 5],
  passos: [
    {
      id: randomUUID(),
      titulo: 'Observar como acordei',
      atividade: 'livre',
      habitoId: null,
      minutos: 2,
    },
    {
      id: randomUUID(),
      titulo: 'Uma pausa sem pressa',
      atividade: 'livre',
      habitoId: null,
      minutos: null,
    },
  ],
});
async function preparar() {
  const u = await criarUsuario(),
    d = dados(),
    id = await salvarRotina(u.session, d);
  return { u, d, id };
}
async function recurso(valor: boolean, chave = 'personal_habits') {
  await executeStatement(
    "UPDATE plan_entitlements e JOIN subscription_plans p ON p.id=e.plan_id JOIN plan_features f ON f.id=e.feature_id SET e.enabled=? WHERE p.plan_key='free' AND f.feature_key=?",
    [valor, chave]
  );
}
describe('rotinas pessoais e retomada com MySQL real', () => {
  it('exige autenticação em leituras e todas as mutações', async () => {
    for (const [handler, method] of [
      [central.GET, 'GET'],
      [central.POST, 'POST'],
      [individual.PUT, 'PUT'],
      [individual.DELETE, 'DELETE'],
      [inicio.POST, 'POST'],
      [acoes.POST, 'POST'],
    ] as const)
      expect(
        (
          await chamar(handler, {
            usuario: null,
            method,
            params: { id: randomUUID() },
            ...(method === 'GET' ? {} : { body: {} }),
          })
        ).status
      ).toBe(401);
  });
  it('faz CRUD autorizado e preserva a ordem informada', async () => {
    const u = await criarUsuario(),
      d = dados();
    const r = await chamar(central.POST, {
      usuario: u,
      method: 'POST',
      body: d,
    });
    expect(r.status).toBe(201);
    const id = (r.json as { id: string }).id;
    let c = await listarRotinas(u.id);
    expect(c.rotinas[0]).toMatchObject({ ...d, id, versao: 1, execucao: null });
    const passos = [...d.passos].reverse();
    expect(
      (
        await chamar(individual.PUT, {
          usuario: u,
          method: 'PUT',
          params: { id },
          body: { ...d, titulo: 'Preparar o descanso', passos, versao: 1 },
        })
      ).status
    ).toBe(200);
    c = await listarRotinas(u.id);
    expect(c.rotinas[0]).toMatchObject({ versao: 2, passos });
    expect(
      (
        await chamar(individual.DELETE, {
          usuario: u,
          method: 'DELETE',
          params: { id },
          body: { versao: 2 },
        })
      ).status
    ).toBe(200);
    expect((await listarRotinas(u.id)).rotinas).toEqual([]);
  });
  it('recusa dados inválidos, campos extras e passos de hábito sem referência', async () => {
    const u = await criarUsuario();
    for (const d of [
      { ...dados(), userId: u.id },
      { ...dados(), dias: [1, 1] },
      { ...dados(), passos: [{ ...dados().passos[0], atividade: 'habito' }] },
    ])
      expect(
        (await chamar(central.POST, { usuario: u, method: 'POST', body: d }))
          .status
      ).toBe(400);
  });
  it('isola definições, execuções e hábitos entre titulares', async () => {
    const { u, d, id } = await preparar(),
      outra = await criarUsuario();
    const e = await iniciarRotina(u.session, id, randomUUID(), 1);
    expect((await listarRotinas(outra.id)).rotinas).toEqual([]);
    for (const [handler, method, body] of [
      [individual.PUT, 'PUT', { ...d, versao: 1 }],
      [individual.DELETE, 'DELETE', { versao: 1 }],
      [inicio.POST, 'POST', { idExecucao: randomUUID(), versao: 1 }],
      [acoes.POST, 'POST', { acao: 'pausar', versao: 1 }],
    ] as const)
      expect(
        (
          await chamar(handler, {
            usuario: outra,
            method,
            params: { id: handler === acoes.POST ? e.id : id },
            body,
          })
        ).status
      ).toBe(404);
    await expect(
      iniciarRotina(
        outra.session,
        await salvarRotina(outra.session, dados()),
        e.id,
        1
      )
    ).rejects.toMatchObject({ statusCode: 404 });
  });
  it('limita criações concorrentes a trinta definições', async () => {
    const u = await criarUsuario();
    const rs = await Promise.allSettled(
      Array.from({ length: 32 }, () => salvarRotina(u.session, dados()))
    );
    expect(rs.filter((r) => r.status === 'fulfilled')).toHaveLength(30);
    expect(rs.filter((r) => r.status === 'rejected')).toHaveLength(2);
    expect((await listarRotinas(u.id)).rotinas).toHaveLength(30);
  });
  it('mantém uma execução ativa e repetições não duplicam o início', async () => {
    const { u, id } = await preparar();
    const rs = await Promise.all(
      Array.from({ length: 5 }, () =>
        iniciarRotina(u.session, id, randomUUID(), 1)
      )
    );
    expect(new Set(rs.map((r) => r.id)).size).toBe(1);
    expect(
      await contar(
        'SELECT COUNT(*) total FROM personal_routine_runs WHERE user_id=?',
        [u.id]
      )
    ).toBe(1);
    expect(await iniciarRotina(u.session, id, rs[0].id, 1)).toEqual(rs[0]);
  });
  it('pausa e retoma após nova leitura, sem perder passos', async () => {
    const { u, d, id } = await preparar();
    let e = await iniciarRotina(u.session, id, randomUUID(), 1);
    e = await agirNaRotina(u.id, e.id, {
      acao: 'concluir',
      passoId: d.passos[0].id,
      versao: e.versao,
    });
    e = await agirNaRotina(u.id, e.id, { acao: 'pausar', versao: e.versao });
    expect((await listarRotinas(u.id)).rotinas[0].execucao).toEqual(e);
    await expect(
      agirNaRotina(u.id, e.id, {
        acao: 'pular',
        passoId: d.passos[1].id,
        versao: e.versao,
      })
    ).rejects.toMatchObject({ statusCode: 409 });
    e = await agirNaRotina(u.id, e.id, { acao: 'retomar', versao: e.versao });
    expect(e.estado).toBe('em_curso');
    expect(e.passos[0].estado).toBe('concluido');
  });
  it('impõe sequência e resolve concorrência sem duas transições', async () => {
    const { u, d, id } = await preparar();
    const e = await iniciarRotina(u.session, id, randomUUID(), 1);
    await expect(
      agirNaRotina(u.id, e.id, {
        acao: 'concluir',
        passoId: d.passos[1].id,
        versao: 1,
      })
    ).rejects.toMatchObject({ statusCode: 409 });
    const rs = await Promise.allSettled([
      agirNaRotina(u.id, e.id, {
        acao: 'concluir',
        passoId: d.passos[0].id,
        versao: 1,
      }),
      agirNaRotina(u.id, e.id, {
        acao: 'pular',
        passoId: d.passos[0].id,
        versao: 1,
      }),
    ]);
    expect(rs.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(rs.filter((r) => r.status === 'rejected')).toHaveLength(1);
    const atual = (await listarRotinas(u.id)).rotinas[0].execucao!;
    expect(atual.versao).toBe(2);
    expect(atual.passos[1].estado).toBe('pendente');
  });
  it('encerra com conclusão e pulo distintos sem somar minutos ou metas', async () => {
    const { u, d, id } = await preparar();
    const metricas = await contar(
        'SELECT COUNT(*) total FROM daily_metrics WHERE user_id=?',
        [u.id]
      ),
      metas = await contar('SELECT COUNT(*) total FROM goals WHERE user_id=?', [
        u.id,
      ]);
    let e = await iniciarRotina(u.session, id, randomUUID(), 1);
    e = await agirNaRotina(u.id, e.id, {
      acao: 'concluir',
      passoId: d.passos[0].id,
      versao: e.versao,
    });
    e = await agirNaRotina(u.id, e.id, {
      acao: 'pular',
      passoId: d.passos[1].id,
      versao: e.versao,
    });
    expect(e.estado).toBe('encerrada');
    expect(e.finalizadaEm).not.toBeNull();
    expect(e.passos.map((p) => p.estado)).toEqual(['concluido', 'pulado']);
    await expect(
      agirNaRotina(u.id, e.id, { acao: 'pausar', versao: e.versao })
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(
      await contar('SELECT COUNT(*) total FROM daily_metrics WHERE user_id=?', [
        u.id,
      ])
    ).toBe(metricas);
    expect(
      await contar('SELECT COUNT(*) total FROM goals WHERE user_id=?', [u.id])
    ).toBe(metas);
    expect(
      await contar(
        'SELECT COUNT(*) total FROM breathing_sessions WHERE user_id=?',
        [u.id]
      )
    ).toBe(0);
    expect(await iniciarRotina(u.session, id, e.id, 1)).toEqual(e);
    const nova = await iniciarRotina(u.session, id, randomUUID(), 1);
    expect(nova.id).not.toBe(e.id);
    expect((await listarRotinas(u.id)).rotinas[0].execucao?.id).toBe(nova.id);
  });
  it('preserva a execução original após editar e impede sobrescrita de versão antiga', async () => {
    const { u, d, id } = await preparar();
    const e = await iniciarRotina(u.session, id, randomUUID(), 1);
    await salvarRotina(
      u.session,
      { ...d, titulo: 'Outro nome', passos: [...d.passos].reverse() },
      id,
      1
    );
    await expect(salvarRotina(u.session, d, id, 1)).rejects.toMatchObject({
      statusCode: 409,
    });
    await expect(excluirRotina(u.id, id, 1)).rejects.toMatchObject({
      statusCode: 409,
    });
    const r = (await listarRotinas(u.id)).rotinas[0];
    expect(r.titulo).toBe('Outro nome');
    expect(r.execucao).toEqual(e);
    expect(r.execucao?.passos[0].id).toBe(d.passos[0].id);
  });
  it('reutiliza somente hábitos ativos da conta e recusa prática revogada', async () => {
    const { u, d, id } = await preparar(),
      outra = await criarUsuario(),
      habito = randomUUID();
    await executeStatement(
      'INSERT INTO habits(id,user_id,name) VALUES(?,?,?)',
      [habito, u.id, 'Desligar as telas']
    );
    const p = {
      ...d,
      passos: [
        { ...d.passos[0], atividade: 'habito' as const, habitoId: habito },
      ],
    };
    await salvarRotina(u.session, p, id, 1);
    expect((await listarRotinas(u.id)).habitos).toContainEqual({
      id: habito,
      nome: 'Desligar as telas',
    });
    await expect(salvarRotina(outra.session, p)).rejects.toMatchObject({
      statusCode: 400,
    });
    await executeStatement('UPDATE habits SET is_active=FALSE WHERE id=?', [
      habito,
    ]);
    await expect(
      iniciarRotina(u.session, id, randomUUID(), 2)
    ).rejects.toMatchObject({ statusCode: 400 });
    await recurso(false, 'guided_breathing');
    try {
      expect(
        (
          await chamar(central.POST, {
            usuario: u,
            method: 'POST',
            body: {
              ...d,
              passos: [{ ...d.passos[0], atividade: 'respiracao' }],
            },
          })
        ).status
      ).toBe(403);
    } finally {
      await recurso(true, 'guided_breathing');
    }
  });
  it('revoga leitura e mutações na matriz sem apagar os dados', async () => {
    const { u, id } = await preparar();
    await recurso(false);
    try {
      expect((await chamar(central.GET, { usuario: u })).status).toBe(403);
      expect(
        (
          await chamar(inicio.POST, {
            usuario: u,
            method: 'POST',
            params: { id },
            body: { idExecucao: randomUUID(), versao: 1 },
          })
        ).status
      ).toBe(403);
    } finally {
      await recurso(true);
    }
    expect((await listarRotinas(u.id)).rotinas).toHaveLength(1);
    expect(
      (await chamar(central.GET, { usuario: u })).headers.get('cache-control')
    ).toBe('private, no-store');
  });
  it('exporta definições e execuções e remove em cascata sem apagar hábito real', async () => {
    const { u, id } = await preparar();
    await iniciarRotina(u.session, id, randomUUID(), 1);
    const exportacao = await exportarDadosDoTitular(u.id);
    expect(exportacao.personal_routines).toHaveLength(1);
    expect(exportacao.personal_routine_runs).toHaveLength(1);
    const h = randomUUID();
    await executeStatement(
      'INSERT INTO habits(id,user_id,name) VALUES(?,?,?)',
      [h, u.id, 'Ler']
    );
    await excluirRotina(u.id, id, 1);
    expect(
      await contar(
        'SELECT COUNT(*) total FROM personal_routine_runs WHERE user_id=?',
        [u.id]
      )
    ).toBe(0);
    expect(
      await contar('SELECT COUNT(*) total FROM habits WHERE id=?', [h])
    ).toBe(1);
    await salvarRotina(u.session, dados());
    await excluirConta(u.id);
    expect(
      await contar(
        'SELECT COUNT(*) total FROM personal_routines WHERE user_id=?',
        [u.id]
      )
    ).toBe(0);
    expect(
      await contar(
        'SELECT COUNT(*) total FROM personal_routine_runs WHERE user_id=?',
        [u.id]
      )
    ).toBe(0);
  });
});
