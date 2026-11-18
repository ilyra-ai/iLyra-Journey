import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import {
  contar,
  criarUsuario,
  definirAgendamentosParaUsuarios,
  type UsuarioDeTeste,
} from '../../../tests/integration/fixtures';
import { chamar } from '../../../tests/integration/http';
import { executeStatement } from '@/lib/mysql/pool';
import { contaTemRecurso, requireFeatureEnabled } from '@/lib/plans/service';
import type { AccountSubscriptionSummary } from '@/types/subscription';
import type { EstadoDoInterruptor } from '@/lib/plataforma/interruptores';
import * as dados from './data/[table]/route';
import * as assinatura from './account/subscription/route';
import * as controle from './admin/agendamentos/route';

const tabela = (nome: string, u: UsuarioDeTeste) =>
  chamar(dados.GET, { params: { table: nome }, usuario: u });
async function profissional(u: UsuarioDeTeste) {
  await executeStatement(
    "INSERT INTO professionals(id,user_id,name,specialty) VALUES(?,?,'Dra. Teste','Nutrição')",
    [randomUUID(), u.id]
  );
}
async function estado(admin: UsuarioDeTeste) {
  return (await chamar(controle.GET, { usuario: admin }))
    .json as EstadoDoInterruptor;
}
async function recursoNoPlano(habilitado: boolean) {
  await executeStatement(
    "UPDATE plan_entitlements e JOIN subscription_plans p ON p.id=e.plan_id JOIN plan_features f ON f.id=e.feature_id SET e.enabled=? WHERE p.plan_key='care' AND f.feature_key='professionals_total'",
    [habilitado]
  );
}
afterAll(() => definirAgendamentosParaUsuarios(false));

describe('Agendamentos exclusivos do administrador por padrão (tarefa 134)', () => {
  it('nasce desativado para usuários e recusa a API mesmo com o plano liberando', async () => {
    const pessoa = await criarUsuario(),
      admin = await criarUsuario('admin', 'Admin');
    await profissional(pessoa);
    for (const t of ['appointments', 'professionals']) {
      const r = await tabela(t, pessoa);
      expect(r.status).toBe(403);
      expect(r.json).toMatchObject({
        data: null,
        error: {
          message: 'Agendamentos estão desativados pelo administrador do app.',
        },
      });
    }
    await expect(
      requireFeatureEnabled(pessoa.session, 'appointments_active')
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(await contaTemRecurso(pessoa.id, 'professionals_total')).toBe(false);
    const resumo = (await chamar(assinatura.GET, { usuario: pessoa }))
      .json as AccountSubscriptionSummary;
    expect(
      resumo.features
        .filter((f) =>
          ['appointments_active', 'professionals_total'].includes(f.key)
        )
        .map((f) => [f.key, f.enabled, f.globalmenteDesativado])
    ).toEqual(
      expect.arrayContaining([
        ['appointments_active', false, true],
        ['professionals_total', false, true],
      ])
    );
    // Outros recursos do plano não mudam.
    expect(
      resumo.features.find((f) => f.key === 'daily_checkin')?.enabled
    ).toBe(true);
    // O administrador mantém acesso para gerir o recurso.
    expect((await tabela('appointments', admin)).status).toBe(200);
    expect((await tabela('professionals', admin)).status).toBe(200);
    const resumoAdmin = (await chamar(assinatura.GET, { usuario: admin }))
      .json as AccountSubscriptionSummary;
    expect(
      resumoAdmin.features.find((f) => f.key === 'appointments_active')?.enabled
    ).toBe(true);
    // Os dados continuam guardados.
    expect(
      await contar('SELECT COUNT(*) total FROM professionals WHERE user_id=?', [
        pessoa.id,
      ])
    ).toBe(1);
  });

  it('só o administrador consulta e altera, com versão, trilha e efeito imediato', async () => {
    const pessoa = await criarUsuario(),
      admin = await criarUsuario('admin', 'Ana');
    await profissional(pessoa);
    expect((await chamar(controle.GET, { usuario: null })).status).toBe(401);
    expect((await chamar(controle.GET, { usuario: pessoa })).status).toBe(403);
    const inicial = await estado(admin);
    expect(inicial.ativo).toBe(false);
    expect(
      (
        await chamar(controle.PUT, {
          usuario: pessoa,
          method: 'PUT',
          body: { ativo: true, versao: inicial.versao },
        })
      ).status
    ).toBe(403);
    for (const body of [
      { ativo: 'sim', versao: inicial.versao },
      { ativo: true },
      { ativo: true, versao: inicial.versao, extra: 1 },
    ])
      expect(
        (await chamar(controle.PUT, { usuario: admin, method: 'PUT', body }))
          .status
      ).toBe(400);
    const ligado = await chamar(controle.PUT, {
      usuario: admin,
      method: 'PUT',
      body: { ativo: true, versao: inicial.versao },
    });
    expect(ligado.status).toBe(200);
    const e1 = ligado.json as EstadoDoInterruptor;
    expect(e1).toMatchObject({
      ativo: true,
      versao: inicial.versao + 1,
      atualizadoPor: { id: admin.id, nome: 'Ana Teste' },
    });
    expect(e1.historico[0]).toMatchObject({
      anterior: false,
      novo: true,
      responsavel: { id: admin.id },
    });
    // Versão antiga é recusada; a sessão já aberta da pessoa vê o efeito.
    expect(
      (
        await chamar(controle.PUT, {
          usuario: admin,
          method: 'PUT',
          body: { ativo: false, versao: inicial.versao },
        })
      ).status
    ).toBe(409);
    const leitura = await tabela('professionals', pessoa);
    expect(leitura.status).toBe(200);
    expect((leitura.json as { data: unknown[] }).data).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'Dra. Teste' })])
    );
    // Ativado, o plano continua valendo: sem o recurso no plano, segue 403.
    await recursoNoPlano(false);
    try {
      const r = await tabela('professionals', pessoa);
      expect(r.status).toBe(403);
      expect((r.json as { error: { message: string } }).error.message).toMatch(
        /plano .* não inclui/
      );
    } finally {
      await recursoNoPlano(true);
    }
    // Desativar de novo não apaga nada; reativar devolve os mesmos dados.
    const desligado = await chamar(controle.PUT, {
      usuario: admin,
      method: 'PUT',
      body: { ativo: false, versao: e1.versao },
    });
    expect((desligado.json as EstadoDoInterruptor).ativo).toBe(false);
    expect((await tabela('professionals', pessoa)).status).toBe(403);
    expect(
      await contar('SELECT COUNT(*) total FROM professionals WHERE user_id=?', [
        pessoa.id,
      ])
    ).toBe(1);
    const e2 = desligado.json as EstadoDoInterruptor;
    await chamar(controle.PUT, {
      usuario: admin,
      method: 'PUT',
      body: { ativo: true, versao: e2.versao },
    });
    expect((await tabela('professionals', pessoa)).status).toBe(200);
    const final = await estado(admin);
    expect(
      final.historico.slice(0, 3).map((h) => [h.anterior, h.novo])
    ).toEqual([
      [false, true],
      [true, false],
      [false, true],
    ]);
    // Repetir o mesmo estado não cria evento novo.
    const antes = final.historico.length;
    await chamar(controle.PUT, {
      usuario: admin,
      method: 'PUT',
      body: { ativo: true, versao: final.versao },
    });
    expect((await estado(admin)).historico).toHaveLength(antes);
  });
});
