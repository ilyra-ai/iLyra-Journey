import { randomUUID } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { criarUsuario, contar } from '../../../tests/integration/fixtures';
import { chamar } from '../../../tests/integration/http';
import { executeStatement } from '@/lib/mysql/pool';
import {
  iniciarFoco,
  agirNoFoco,
  lerCentralDeFoco,
  perceberFoco,
  excluirFoco,
  reservarAviso,
} from '@/lib/foco/servico';
import { exportarDadosDoTitular } from '@/lib/lgpd/conta';
import { criarPeriodo } from '@/lib/descanso/servico';
import * as central from './foco/route';
import * as individual from './foco/[id]/route';
import * as aviso from './foco/[id]/aviso/route';
const base = new Date('2026-10-29T12:00:00Z'),
  t = (s: number) => new Date(+base + s * 1000);
const proposta = () => ({
  id: randomUUID(),
  tipo: 'foco' as const,
  minutos: 1,
});
async function preparar() {
  const u = await criarUsuario(),
    p = proposta(),
    r = await iniciarFoco(u.session, p, base);
  return { u, p, r };
}
describe('sessões de foco persistidas e tempo real de servidor', () => {
  it('protege todos os handlers com sessão', async () => {
    for (const [h, method] of [
      [central.GET, 'GET'],
      [central.POST, 'POST'],
      [individual.POST, 'POST'],
      [individual.PUT, 'PUT'],
      [individual.DELETE, 'DELETE'],
      [aviso.POST, 'POST'],
    ] as const)
      expect(
        (
          await chamar(h, {
            usuario: null,
            method,
            params: { id: randomUUID() },
            ...(method === 'GET' ? {} : { body: {} }),
          })
        ).status
      ).toBe(401);
  });
  it('repetição concorrente de início mantém uma única sessão e recusa ID alterado', async () => {
    const u = await criarUsuario(),
      p = proposta(),
      rs = await Promise.all([
        iniciarFoco(u.session, p, base),
        iniciarFoco(u.session, p, base),
      ]);
    expect(rs[0].id).toBe(rs[1].id);
    expect(
      await contar(
        'SELECT COUNT(*) total FROM focus_sessions WHERE user_id=?',
        [u.id]
      )
    ).toBe(1);
    await expect(
      iniciarFoco(u.session, { ...p, minutos: 2 }, base)
    ).rejects.toMatchObject({ statusCode: 409 });
    await expect(
      iniciarFoco(u.session, proposta(), base)
    ).rejects.toMatchObject({ statusCode: 409 });
  });
  it('exclui pausas do tempo e preserva a sessão após nova leitura', async () => {
    const { u, r } = await preparar();
    let atual = await agirNoFoco(
      u.session,
      r.id,
      { acao: 'pausar', versao: 1 },
      t(20)
    );
    expect(atual.decorridoMs).toBe(20000);
    expect(
      (await lerCentralDeFoco(u.session, null, t(600))).ativa?.decorridoMs
    ).toBe(20000);
    atual = await agirNoFoco(
      u.session,
      r.id,
      { acao: 'retomar', versao: atual.versao },
      t(600)
    );
    atual = await agirNoFoco(
      u.session,
      r.id,
      { acao: 'encerrar', versao: atual.versao },
      t(610)
    );
    expect(atual.decorridoMs).toBe(30000);
    expect(atual.estado).toBe('ended');
    expect(atual.encerradaEm).toBe(t(610).toISOString());
  });
  it('atingir alvo não encerra automaticamente; confirmação após suspensão fica limitada ao alvo', async () => {
    const { u, r } = await preparar();
    expect(
      (await lerCentralDeFoco(u.session, null, t(86400))).ativa
    ).toMatchObject({ estado: 'running', decorridoMs: 60000 });
    const fim = await agirNoFoco(
      u.session,
      r.id,
      { acao: 'encerrar', versao: 1 },
      t(86400)
    );
    expect(fim.estado).toBe('completed');
    expect(fim.encerradaEm).toBe(t(86400).toISOString());
    expect(fim.decorridoMs).toBe(60000);
    expect(
      (
        await agirNoFoco(
          u.session,
          r.id,
          { acao: 'encerrar', versao: 1 },
          t(86410)
        )
      ).encerradaEm
    ).toBe(fim.encerradaEm);
    expect((await lerCentralDeFoco(u.session)).totais).toMatchObject({
      focos: 1,
      focoMs: 60000,
      pausaMs: 0,
    });
  });
  it('versão antiga e transições inválidas não alteram o relógio', async () => {
    const { u, r } = await preparar();
    await agirNoFoco(u.session, r.id, { acao: 'pausar', versao: 1 }, t(10));
    await expect(
      agirNoFoco(u.session, r.id, { acao: 'retomar', versao: 1 }, t(20))
    ).rejects.toMatchObject({ statusCode: 409 });
    await expect(
      agirNoFoco(u.session, r.id, { acao: 'pausar', versao: 2 }, t(20))
    ).rejects.toMatchObject({ statusCode: 409 });
  });
  it('percepção só após encerramento, editável sem alterar minutos ou métricas', async () => {
    const { u, r } = await preparar();
    await expect(
      perceberFoco(
        u.session,
        r.id,
        { versao: 1, percepcao: 3, nota: 'Antes' },
        t(10)
      )
    ).rejects.toMatchObject({ statusCode: 400 });
    let fim = await agirNoFoco(
      u.session,
      r.id,
      { acao: 'encerrar', versao: 1 },
      t(15)
    );
    fim = await perceberFoco(
      u.session,
      r.id,
      { versao: fim.versao, percepcao: 4, nota: 'Mais disposto' },
      t(20)
    );
    expect(fim.percepcao).toBe(4);
    expect(fim.decorridoMs).toBe(15000);
    expect(
      await contar('SELECT COUNT(*) total FROM daily_metrics WHERE user_id=?', [
        u.id,
      ])
    ).toBe(0);
  });
  it('pausa é sessão independente; exclusão atualiza totais sem dupla contagem', async () => {
    const { u, r } = await preparar();
    await agirNoFoco(u.session, r.id, { acao: 'encerrar', versao: 1 }, t(10));
    const p = await iniciarFoco(
      u.session,
      { id: randomUUID(), tipo: 'pausa', minutos: 1 },
      t(12)
    );
    const fim = await agirNoFoco(
      u.session,
      p.id,
      { acao: 'encerrar', versao: 1 },
      t(20)
    );
    expect((await lerCentralDeFoco(u.session)).totais).toEqual({
      focos: 1,
      pausas: 1,
      focoMs: 10000,
      pausaMs: 8000,
    });
    await excluirFoco(u.session, p.id, fim.versao);
    expect((await lerCentralDeFoco(u.session)).totais.pausaMs).toBe(0);
  });
  it('silêncio suprime aviso e não recupera som tardiamente', async () => {
    const { u, r } = await preparar();
    await executeStatement(
      "INSERT INTO reminder_preferences(user_id,quiet_enabled,quiet_start,quiet_end) VALUES(?,TRUE,'00:00','23:59')",
      [u.id]
    );
    expect((await reservarAviso(u.session, r.id, t(61))).permitido).toBe(false);
    await executeStatement(
      'UPDATE reminder_preferences SET quiet_enabled=FALSE WHERE user_id=?',
      [u.id]
    );
    expect((await reservarAviso(u.session, r.id, t(62))).permitido).toBe(false);
  });
  it('descanso protege silêncio e apenas uma aba obtém decisão de aviso', async () => {
    const { u, r } = await preparar();
    const rs = await Promise.all([
      reservarAviso(u.session, r.id, t(61)),
      reservarAviso(u.session, r.id, t(61)),
    ]);
    expect(rs.filter((x) => x.permitido)).toHaveLength(1);
    const outro = await preparar();
    await criarPeriodo(
      outro.u.session,
      {
        pedidoId: randomUUID(),
        inicio: '2026-10-29',
        fim: null,
        retornoDias: 0,
        atividade: null,
        metas: [],
      },
      base
    );
    expect(
      (await reservarAviso(outro.u.session, outro.r.id, t(61))).permitido
    ).toBe(false);
  });
  it('histórico paginado, isolamento, exportação e remoção em cascade', async () => {
    const { u, r } = await preparar(),
      outro = await criarUsuario();
    await expect(
      agirNoFoco(outro.session, r.id, { acao: 'encerrar', versao: 1 }, t(10))
    ).rejects.toMatchObject({ statusCode: 404 });
    await agirNoFoco(u.session, r.id, { acao: 'encerrar', versao: 1 }, t(10));
    for (let i = 1; i <= 21; i++) {
      const s = await iniciarFoco(u.session, proposta(), t(i * 20));
      await agirNoFoco(
        u.session,
        s.id,
        { acao: 'encerrar', versao: 1 },
        t(i * 20 + 1)
      );
    }
    const primeira = await lerCentralDeFoco(u.session);
    expect(primeira.historico).toHaveLength(20);
    expect(
      (await lerCentralDeFoco(u.session, primeira.proximo)).historico
    ).toHaveLength(2);
    await expect(
      lerCentralDeFoco(outro.session, primeira.proximo)
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(JSON.stringify(await exportarDadosDoTitular(u.id))).toContain(r.id);
    await executeStatement('DELETE FROM users WHERE id=?', [u.id]);
    expect(
      await contar(
        'SELECT COUNT(*) total FROM focus_sessions WHERE user_id=?',
        [u.id]
      )
    ).toBe(0);
  });
});
