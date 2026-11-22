import { randomUUID } from 'node:crypto';

import { afterEach, describe, expect, it } from 'vitest';

import { contar, criarUsuario } from '../../../../tests/integration/fixtures';
import { chamar } from '../../../../tests/integration/http';
import { entrarComIdentidade } from '@/lib/auth/social/contas';
import { executeStatement, queryRows } from '@/lib/mysql/pool';

import { GET as GET_ADMIN, PUT } from '../admin/login-social/route';
import { GET as GET_PUBLICO } from '../public/login-social/route';
import { GET as INICIO } from './social/[provedor]/inicio/route';

const EMAILS: string[] = [];
function identidade(email: string | null, emailVerificado = true) {
  if (email) EMAILS.push(email);
  return {
    provedor: 'google' as const,
    sujeito: randomUUID(),
    email,
    emailVerificado,
    nome: { primeiro: 'Ana', sobrenome: 'Social' },
  };
}

async function desligarTudo() {
  await executeStatement(
    `UPDATE login_social_provedores
        SET ativo = FALSE, client_id = NULL, segredo_cifrado = NULL,
            apple_team_id = NULL, apple_key_id = NULL`
  );
}

afterEach(async () => {
  await desligarTudo();
  for (const email of EMAILS.splice(0))
    await executeStatement('DELETE FROM users WHERE email = ?', [email]);
});

describe('contas do login com Google e Apple (tarefas 164 e 165)', () => {
  it('conta nova com o aceite dos termos: perfil, consentimentos, plano e vínculo', async () => {
    const id = identidade(
      `social-${randomUUID().slice(0, 8)}@teste.lyra.local`
    );
    const conta = await entrarComIdentidade(id, {
      aceite: true,
      nome: id.nome,
      userAgent: 'teste',
    });
    expect(conta).toMatchObject({
      email: id.email,
      role: 'patient',
      first_name: 'Ana',
      last_name: 'Social',
      onboarding_completed: 0,
    });
    expect(
      await contar(
        'SELECT COUNT(*) AS total FROM consent_records WHERE user_id = ?',
        [conta.id]
      )
    ).toBe(2);
    expect(
      await contar(
        'SELECT COUNT(*) AS total FROM user_subscriptions WHERE user_id = ?',
        [conta.id]
      )
    ).toBe(1);
    // Segundo login pela mesma identidade: a mesma conta, sem duplicar.
    const deNovo = await entrarComIdentidade(id, {
      aceite: false,
      userAgent: null,
    });
    expect(deNovo.id).toBe(conta.id);
    expect(
      await contar(
        'SELECT COUNT(*) AS total FROM contas_sociais WHERE user_id = ?',
        [conta.id]
      )
    ).toBe(1);
  });

  it('sem o aceite dos termos, a conta nova não é criada', async () => {
    const id = identidade(
      `social-${randomUUID().slice(0, 8)}@teste.lyra.local`
    );
    await expect(
      entrarComIdentidade(id, { aceite: false, userAgent: null })
    ).rejects.toMatchObject({ codigo: 'termos', statusCode: 409 });
    expect(
      await contar('SELECT COUNT(*) AS total FROM users WHERE email = ?', [
        id.email,
      ])
    ).toBe(0);
  });

  it('e-mail verificado igual ao de uma conta com senha vincula, sem conta nova', async () => {
    const existente = await criarUsuario();
    const id = identidade(existente.email);
    const conta = await entrarComIdentidade(id, {
      aceite: false,
      userAgent: null,
    });
    expect(conta.id).toBe(existente.id);
    expect(
      await contar('SELECT COUNT(*) AS total FROM users WHERE email = ?', [
        existente.email,
      ])
    ).toBe(1);
  });

  it('e-mail não verificado não vincula nem cria conta', async () => {
    const existente = await criarUsuario();
    await expect(
      entrarComIdentidade(identidade(existente.email, false), {
        aceite: true,
        userAgent: null,
      })
    ).rejects.toMatchObject({ codigo: 'sem-email' });
    await expect(
      entrarComIdentidade(identidade(null), { aceite: true, userAgent: null })
    ).rejects.toMatchObject({ codigo: 'sem-email' });
  });

  it('conta bloqueada não entra pelo provedor', async () => {
    const existente = await criarUsuario();
    await executeStatement(
      'UPDATE users SET blocked_at = UTC_TIMESTAMP() WHERE id = ?',
      [existente.id]
    );
    await expect(
      entrarComIdentidade(identidade(existente.email), {
        aceite: false,
        userAgent: null,
      })
    ).rejects.toMatchObject({ codigo: 'bloqueada', statusCode: 403 });
  });
});

describe('configuração do login social pelo administrador (tarefa 235)', () => {
  const google = {
    provedor: 'google',
    ativo: true,
    clientId: 'cliente.apps.googleusercontent.com',
    segredo: 'segredo-google',
  };

  it('só administradores leem e gravam; o segredo nunca volta', async () => {
    const pessoa = await criarUsuario();
    const admin = await criarUsuario('admin');
    expect((await chamar(GET_ADMIN, { usuario: null })).status).toBe(401);
    expect((await chamar(GET_ADMIN, { usuario: pessoa })).status).toBe(403);
    expect(
      (await chamar(PUT, { usuario: pessoa, method: 'PUT', body: google }))
        .status
    ).toBe(403);
    const gravado = await chamar(PUT, {
      usuario: admin,
      method: 'PUT',
      body: google,
    });
    expect(gravado.status).toBe(200);
    expect(gravado.texto).not.toContain('segredo-google');
    const [linha] = await queryRows<{ segredo_cifrado: string }>(
      "SELECT segredo_cifrado FROM login_social_provedores WHERE provedor = 'google'"
    );
    expect(linha.segredo_cifrado.startsWith('v1.')).toBe(true);
    expect(linha.segredo_cifrado).not.toContain('segredo-google');
    expect(
      (
        gravado.json as { provedores: Array<Record<string, unknown>> }
      ).provedores.find((p) => p.provedor === 'google')
    ).toMatchObject({ ativo: true, segredoConfigurado: true, pronto: true });
  });

  it('a tela de login só mostra o provedor ligado e com credenciais completas', async () => {
    const admin = await criarUsuario('admin');
    expect((await chamar(GET_PUBLICO)).json).toEqual({ provedores: [] });
    await chamar(PUT, { usuario: admin, method: 'PUT', body: google });
    expect((await chamar(GET_PUBLICO)).json).toEqual({
      provedores: ['google'],
    });
    // Desligado: some da tela de login, mesmo com as credenciais salvas.
    await chamar(PUT, {
      usuario: admin,
      method: 'PUT',
      body: { ...google, ativo: false, segredo: undefined },
    });
    expect((await chamar(GET_PUBLICO)).json).toEqual({ provedores: [] });
    // Apple ligada sem Team ID e Key ID: incompleta, não aparece.
    await chamar(PUT, {
      usuario: admin,
      method: 'PUT',
      body: {
        provedor: 'apple',
        ativo: true,
        clientId: 'br.lyra.web',
        segredo: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----',
      },
    });
    expect((await chamar(GET_PUBLICO)).json).toEqual({ provedores: [] });
  });

  it('recusa chave da Apple sem o formato .p8 e Team ID inválido', async () => {
    const admin = await criarUsuario('admin');
    expect(
      (
        await chamar(PUT, {
          usuario: admin,
          method: 'PUT',
          body: {
            provedor: 'apple',
            ativo: false,
            clientId: 'x',
            segredo: 'texto qualquer',
          },
        })
      ).status
    ).toBe(400);
    expect(
      (
        await chamar(PUT, {
          usuario: admin,
          method: 'PUT',
          body: {
            provedor: 'apple',
            ativo: false,
            clientId: 'x',
            appleTeamId: 'curto',
          },
        })
      ).status
    ).toBe(400);
  });

  it('o início leva ao Google com PKCE só quando o provedor está ligado', async () => {
    const admin = await criarUsuario('admin');
    const params = { provedor: 'google' };
    const desligado = await chamar(INICIO, {
      params,
      path: '/api/auth/social/google/inicio',
    });
    expect(desligado.status).toBe(303);
    expect(desligado.headers.get('location')).toMatch(
      /\/login\?erro=indisponivel$/
    );
    await chamar(PUT, { usuario: admin, method: 'PUT', body: google });
    const ligado = await chamar(INICIO, {
      params,
      path: '/api/auth/social/google/inicio?aceite=1&destino=planos',
    });
    const destino = new URL(ligado.headers.get('location')!);
    expect(destino.origin).toBe('https://accounts.google.com');
    expect(destino.searchParams.get('code_challenge_method')).toBe('S256');
    expect(destino.searchParams.get('redirect_uri')).toMatch(
      /\/api\/auth\/social\/google\/retorno$/
    );
    expect(ligado.headers.get('set-cookie')).toMatch(
      /lyra_login_social=.+HttpOnly/i
    );
    // Nada pessoal na URL do provedor.
    expect(destino.search).not.toMatch(/planos|aceite/);
    const invalido = await chamar(INICIO, {
      params: { provedor: 'facebook' },
      path: '/api/auth/social/facebook/inicio',
    });
    expect(invalido.headers.get('location')).toMatch(/erro=indisponivel/);
  });
});
