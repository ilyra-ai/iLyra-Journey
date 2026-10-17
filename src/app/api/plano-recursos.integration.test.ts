import { describe, expect, it } from 'vitest';

import { executeStatement } from '@/lib/mysql/pool';
import type { PlanFeatureKey } from '@/types/subscription';
import type { SemanaDaPessoa } from '@/lib/semana/servico';

import { criarUsuario } from '../../../tests/integration/fixtures';
import { chamar } from '../../../tests/integration/http';

import * as dados from './data/[table]/route';
import * as metas from './metas/route';
import * as semana from './semana/route';

// Liga ou desliga um recurso no plano Free (como o admin faz na matriz).
async function recursoNoFree(recurso: PlanFeatureKey, habilitado: boolean) {
  await executeStatement(
    `UPDATE plan_entitlements e
       JOIN subscription_plans p ON p.id = e.plan_id
       JOIN plan_features f ON f.id = e.feature_id
        SET e.enabled = ?
      WHERE p.plan_key = 'free' AND f.feature_key = ?`,
    [habilitado, recurso]
  );
}

async function comRecursoDesligado(
  recurso: PlanFeatureKey,
  teste: () => Promise<void>
) {
  await recursoNoFree(recurso, false);
  try {
    await teste();
  } finally {
    await recursoNoFree(recurso, true);
  }
}

const lerTabela = (
  tabela: 'appointments' | 'professionals',
  usuario: Awaited<ReturnType<typeof criarUsuario>>
) =>
  chamar(dados.GET, {
    path: `/api/data/${tabela}`,
    params: { table: tabela },
    usuario,
  });

describe('recursos desligados no plano não aparecem nem pela API', () => {
  it('agenda: consultas e profissionais só com o recurso no plano', async () => {
    const pessoa = await criarUsuario('patient', 'Agenda');
    expect((await lerTabela('appointments', pessoa)).status).toBe(200);
    expect((await lerTabela('professionals', pessoa)).status).toBe(200);

    await comRecursoDesligado('appointments_active', async () => {
      expect((await lerTabela('appointments', pessoa)).status).toBe(403);
    });
    await comRecursoDesligado('professionals_total', async () => {
      expect((await lerTabela('professionals', pessoa)).status).toBe(403);
      const novo = await chamar(dados.POST, {
        method: 'POST',
        params: { table: 'professionals' },
        body: { values: { name: 'Dra. Teste', specialty: 'Clínica' } },
        usuario: pessoa,
      });
      expect(novo.status).toBe(403);
    });

    // Administrador não depende do plano.
    const admin = await criarUsuario('admin', 'Admin');
    await comRecursoDesligado('appointments_active', async () => {
      expect((await lerTabela('appointments', admin)).status).toBe(200);
    });
  });

  it('Sua semana só traz metas com o acompanhamento de metas no plano', async () => {
    const pessoa = await criarUsuario('patient', 'Metas');
    const meta = await chamar(metas.POST, {
      method: 'POST',
      body: { metrica: 'sono', alvo: 7 },
      usuario: pessoa,
    });
    expect(meta.status).toBe(201);

    const comMetas = await chamar(semana.GET, { usuario: pessoa });
    expect(comMetas.status).toBe(200);
    expect((comMetas.json as SemanaDaPessoa).metas.length).toBeGreaterThan(0);

    await comRecursoDesligado('goal_progress_tracking', async () => {
      const semMetas = await chamar(semana.GET, { usuario: pessoa });
      expect(semMetas.status).toBe(200);
      expect((semMetas.json as SemanaDaPessoa).metas).toEqual([]);
    });
  });
});
