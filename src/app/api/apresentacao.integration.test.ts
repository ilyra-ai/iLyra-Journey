import { describe, it, expect } from 'vitest';
import { criarUsuario, contar } from '../../../tests/integration/fixtures';
import { chamar } from '../../../tests/integration/http';
import { executeStatement } from '@/lib/mysql/pool';
import {
  lerApresentacao,
  alterarApresentacao,
} from '@/lib/apresentacao/servico';
import { exportarDadosDoTitular } from '@/lib/lgpd/conta';
import * as api from './apresentacao/route';
async function recurso(enabled: boolean) {
  await executeStatement(
    "UPDATE plan_entitlements e JOIN subscription_plans p ON p.id=e.plan_id JOIN plan_features f ON f.id=e.feature_id SET e.enabled=? WHERE p.plan_key='free' AND f.feature_key IN ('daily_checkin','ai_scores','dashboard_access','ai_chat_messages')",
    [enabled]
  );
}
describe('apresentação opcional persistida no MySQL', () => {
  it('exige sessão e cadastro concluído', async () => {
    expect((await chamar(api.GET, { usuario: null })).status).toBe(401);
    expect(
      (await chamar(api.PUT, { usuario: null, method: 'PUT', body: {} })).status
    ).toBe(401);
    const u = await criarUsuario();
    u.session.user.onboarding_completed = false;
    await expect(lerApresentacao(u.session)).rejects.toMatchObject({
      statusCode: 403,
    });
  });
  it('primeira visita só lê, sem criar progresso ou modificar cadastro', async () => {
    const u = await criarUsuario(),
      r = await lerApresentacao(u.session);
    expect(r.estado).toBe('novo');
    expect(r.versao).toBe(0);
    expect(
      await contar(
        'SELECT COUNT(*) total FROM app_intro_progress WHERE user_id=?',
        [u.id]
      )
    ).toBe(0);
    expect(
      await contar(
        'SELECT COUNT(*) total FROM profiles WHERE id=? AND onboarding_completed=TRUE',
        [u.id]
      )
    ).toBe(1);
  });
  it('inicia, avança, retoma e dispensa sem apagar a última etapa', async () => {
    await recurso(true);
    const u = await criarUsuario();
    let r = await lerApresentacao(u.session);
    r = await alterarApresentacao(u.session, {
      acao: 'iniciar',
      passo: r.passo,
      versao: r.versao,
    });
    expect(r.estado).toBe('em_andamento');
    r = await alterarApresentacao(u.session, {
      acao: 'ir',
      passo: 'conversa',
      versao: r.versao,
    });
    expect((await lerApresentacao(u.session)).passo).toBe('conversa');
    r = await alterarApresentacao(u.session, {
      acao: 'dispensar',
      passo: r.passo,
      versao: r.versao,
    });
    expect(r.estado).toBe('dispensada');
    expect(r.passo).toBe('conversa');
  });
  it('plano sem recursos mostra somente perfil e recusa passo revogado', async () => {
    await recurso(true);
    const u = await criarUsuario();
    let r = await lerApresentacao(u.session);
    expect(r.passos).toContain('registro');
    r = await alterarApresentacao(u.session, {
      acao: 'ir',
      passo: 'registro',
      versao: r.versao,
    });
    await recurso(false);
    const novo = await lerApresentacao(u.session);
    expect(novo.passos).toEqual(['perfil']);
    expect(novo.passo).toBe('perfil');
    await expect(
      alterarApresentacao(u.session, {
        acao: 'ir',
        passo: 'registro',
        versao: r.versao,
      })
    ).rejects.toMatchObject({ statusCode: 403 });
  });
  it('não conclui em etapa intermediária; conclusão permite reinício explícito', async () => {
    await recurso(true);
    const u = await criarUsuario();
    await expect(
      alterarApresentacao(u.session, {
        acao: 'concluir',
        passo: 'registro',
        versao: 0,
      })
    ).rejects.toMatchObject({ statusCode: 400 });
    let r = await alterarApresentacao(u.session, {
      acao: 'concluir',
      passo: 'perfil',
      versao: 0,
    });
    expect(r.estado).toBe('concluida');
    r = await alterarApresentacao(u.session, {
      acao: 'iniciar',
      passo: 'registro',
      versao: r.versao,
    });
    expect(r.estado).toBe('em_andamento');
    expect(r.passo).toBe('registro');
  });
  it('concorrência usa versão e não perde o progresso da outra aba', async () => {
    const u = await criarUsuario();
    const p = { acao: 'iniciar' as const, passo: 'perfil' as const, versao: 0 };
    const r = await Promise.allSettled([
      alterarApresentacao(u.session, p),
      alterarApresentacao(u.session, p),
    ]);
    expect(r.filter((v) => v.status === 'fulfilled')).toHaveLength(1);
    expect(
      (r.find((v) => v.status === 'rejected') as PromiseRejectedResult).reason
        .statusCode
    ).toBe(409);
    expect((await lerApresentacao(u.session)).versao).toBe(1);
  });
  it('isola contas, exporta progresso e elimina em cascade', async () => {
    const a = await criarUsuario(),
      b = await criarUsuario();
    await alterarApresentacao(a.session, {
      acao: 'dispensar',
      passo: 'perfil',
      versao: 0,
    });
    expect((await lerApresentacao(b.session)).estado).toBe('novo');
    expect(JSON.stringify(await exportarDadosDoTitular(a.id))).toContain(
      'app_intro_progress'
    );
    await executeStatement('DELETE FROM users WHERE id=?', [a.id]);
    expect(
      await contar(
        'SELECT COUNT(*) total FROM app_intro_progress WHERE user_id=?',
        [a.id]
      )
    ).toBe(0);
  });
  it('recusa corpo livre e informa cache privado na leitura', async () => {
    const u = await criarUsuario();
    expect(
      (
        await chamar(api.PUT, {
          usuario: u,
          method: 'PUT',
          body: { versao: 0, acao: 'iniciar', passo: 'perfil', user_id: u.id },
        })
      ).status
    ).toBe(400);
    expect(
      (await chamar(api.GET, { usuario: u })).headers.get('Cache-Control')
    ).toBe('private, no-store');
  });
});
