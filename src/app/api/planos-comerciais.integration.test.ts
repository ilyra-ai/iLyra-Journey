import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import Layout from '@/app/planos/layout';
import { POST as checkout } from '@/app/api/billing/checkout/route';
import { GET as catalogo } from '@/app/api/public/plans/route';
import { executeStatement, queryRows } from '@/lib/mysql/pool';
import { assignPlanToUserByAdmin } from '@/lib/plans/service';
import {
  criarUsuario,
  type UsuarioDeTeste,
  reativarPlanoNoTeste,
} from '../../../tests/integration/fixtures';
import { chamar, entrarComo } from '../../../tests/integration/http';

describe('jornada comercial dos próprios planos', () => {
  let pessoa: UsuarioDeTeste, gestora: UsuarioDeTeste;
  beforeAll(async () => {
    pessoa = await criarUsuario();
    gestora = await criarUsuario('admin');
  });
  afterAll(async () => {
    await entrarComo(null);
    for (const u of [pessoa, gestora])
      if (u) await executeStatement('DELETE FROM users WHERE id = ?', [u.id]);
  });
  it('exige autenticação e encaminha administradores para a gestão', async () => {
    await entrarComo(null);
    await expect(Layout({ children: 'conteúdo' })).rejects.toMatchObject({
      digest: expect.stringContaining('/login'),
    });
    await entrarComo(gestora);
    await expect(Layout({ children: 'conteúdo' })).rejects.toMatchObject({
      digest: expect.stringContaining('/admin/plans'),
    });
    await entrarComo(pessoa);
    expect(await Layout({ children: 'conteúdo' })).toBe('conteúdo');
  });
  it('recusa contratação por administrador e requisições anônimas no servidor', async () => {
    const body = { planKey: 'meta', billingInterval: 'monthly' };
    expect(
      (await chamar(checkout, { method: 'POST', body, usuario: null })).status
    ).toBe(401);
    expect(
      (await chamar(checkout, { method: 'POST', body, usuario: gestora }))
        .status
    ).toBe(403);
    expect(
      (
        await chamar(checkout, {
          method: 'POST',
          body: { ...body, planKey: 'admin' },
          usuario: pessoa,
        })
      ).status
    ).toBe(400);
  });
  it.each(['is_public', 'is_active'] as const)(
    'um plano sem %s não pode ser contratado por chamada direta',
    async (campo) => {
      const [original] = await queryRows<{
        is_public: number;
        is_active: number;
      }>(
        "SELECT is_public,is_active FROM subscription_plans WHERE plan_key='meta'"
      );
      await executeStatement(
        `UPDATE subscription_plans SET ${campo}=FALSE WHERE plan_key='meta'`
      );
      try {
        const lista = await chamar(catalogo, { usuario: pessoa });
        expect(
          (lista.json as { plans: { key: string }[] }).plans.some(
            (p) => p.key === 'meta'
          )
        ).toBe(false);
        expect(
          (
            await chamar(checkout, {
              method: 'POST',
              body: { planKey: 'meta', billingInterval: 'monthly' },
              usuario: pessoa,
            })
          ).status
        ).toBe(404);
      } finally {
        await executeStatement(
          "UPDATE subscription_plans SET is_public=?,is_active=? WHERE plan_key='meta'",
          [original.is_public, original.is_active]
        );
      }
    }
  );
  it('recusa reduzir plano pelo checkout de upgrade, sem alterar a assinatura', async () => {
    // A regra continua no código; o Meta é reativado só para exercitá-la.
    const restaurarMeta = await reativarPlanoNoTeste('meta');
    try {
      await assignPlanToUserByAdmin({
        targetUserId: pessoa.id,
        actorUserId: gestora.id,
        planKey: 'care',
      });
      expect(
        (
          await chamar(checkout, {
            method: 'POST',
            body: { planKey: 'meta', billingInterval: 'monthly' },
            usuario: pessoa,
          })
        ).status
      ).toBe(400);
      const [atual] = await queryRows<{ plan_key: string }>(
        "SELECT p.plan_key FROM user_subscriptions s JOIN subscription_plans p ON p.id=s.plan_id WHERE s.user_id=? AND s.status='active'",
        [pessoa.id]
      );
      expect(atual.plan_key).toBe('care');
    } finally {
      await restaurarMeta();
    }
  });
  it('o Lyra Journey aparece com os dois valores, sem nome e sem o id da Stripe', async () => {
    const lista = await chamar(catalogo, { usuario: null });
    const plano = (
      lista.json as {
        plans: Array<{
          key: string;
          name: string;
          contributionOptions: unknown[];
        }>;
      }
    ).plans.find((p) => p.key === 'care');
    expect(plano?.name).toBe('Lyra Journey');
    // Só a chave e o valor: nenhum price id sai para a tela pública.
    expect(plano?.contributionOptions).toEqual([
      { key: 'colaboracao_999', monthlyPrice: 9.99 },
      { key: 'colaboracao_1999', monthlyPrice: 19.99 },
    ]);
  });
  it('o checkout do Lyra Journey exige um dos valores e é só mensal', async () => {
    const tentar = async (body: Record<string, unknown>) => {
      const resposta = await chamar(checkout, {
        method: 'POST',
        body: { planKey: 'care', ...body },
        usuario: pessoa,
      });
      return {
        status: resposta.status,
        erro: (resposta.json as { error?: string }).error ?? '',
      };
    };
    // Sem valor, valor desconhecido ou ciclo anual: 400, antes de olhar a
    // configuração da cobrança.
    expect(await tentar({ billingInterval: 'monthly' })).toEqual({
      status: 400,
      erro: expect.stringMatching(/Escolha com qual valor/),
    });
    expect(
      await tentar({
        billingInterval: 'monthly',
        contributionOption: 'colaboracao_5000',
      })
    ).toEqual({
      status: 400,
      erro: expect.stringMatching(/Escolha com qual valor/),
    });
    expect(
      await tentar({
        billingInterval: 'annual',
        contributionOption: 'colaboracao_999',
      })
    ).toEqual({
      status: 400,
      erro: expect.stringMatching(/assinatura mensal recorrente/),
    });
    expect(
      (
        await tentar({
          billingInterval: 'monthly',
          contributionOption: 'Valor Livre',
        })
      ).status
    ).toBe(400);
    // Valor válido: segue para a cobrança, que não está configurada no
    // ambiente de teste (503, sem expor configuração).
    expect(
      await tentar({
        billingInterval: 'monthly',
        contributionOption: 'colaboracao_1999',
      })
    ).toEqual({
      status: 503,
      erro: 'Os pagamentos online ainda não estão disponíveis neste ambiente.',
    });
  });
  it('plano sem valores de colaboração recusa um valor no checkout', async () => {
    // Meta (sem valores) e Free reativados só para exercitar a regra.
    const restaurarMeta = await reativarPlanoNoTeste('meta');
    const restaurarFree = await reativarPlanoNoTeste('free');
    const outra = await criarUsuario();
    try {
      await assignPlanToUserByAdmin({
        targetUserId: outra.id,
        actorUserId: gestora.id,
        planKey: 'free',
      });
      const resposta = await chamar(checkout, {
        method: 'POST',
        body: {
          planKey: 'meta',
          billingInterval: 'monthly',
          contributionOption: 'colaboracao_999',
        },
        usuario: outra,
      });
      expect(resposta.status).toBe(400);
      expect((resposta.json as { error: string }).error).toMatch(
        /não tem valores de colaboração/
      );
    } finally {
      await restaurarFree();
      await restaurarMeta();
      await executeStatement('DELETE FROM users WHERE id = ?', [outra.id]);
    }
  });
});
