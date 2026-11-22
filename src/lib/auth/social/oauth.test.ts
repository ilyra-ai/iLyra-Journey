import {
  createLocalJWKSet,
  decodeProtectedHeader,
  exportJWK,
  exportPKCS8,
  generateKeyPair,
  jwtVerify,
  SignJWT,
} from 'jose';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  conferirEstado,
  conferirIdToken,
  desafioPkce,
  nomeDaApple,
  novoEstado,
  segredoDoClienteApple,
  trocarCodigo,
  urlDeAutorizacao,
} from './oauth';

const CLIENTE = 'cliente-teste.apps.googleusercontent.com';

// Segredo só deste teste: o estado do login é assinado com o AUTH_SECRET.
beforeAll(() => {
  vi.stubEnv(
    'AUTH_SECRET',
    'segredo-de-teste-do-login-social-com-32-caracteres'
  );
});
afterAll(() => {
  vi.unstubAllEnvs();
});

describe('login social: PKCE, estado e autorização (tarefas 164 e 165)', () => {
  it('o desafio PKCE segue o vetor da RFC 7636', () => {
    expect(desafioPkce('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'
    );
  });

  it('o estado assinado volta igual e recusa troca, adulteração e ausência', async () => {
    const { estado, cookie } = await novoEstado('google', {
      retorno: 'planos',
      aceite: true,
    });
    expect(estado.verificador).toBeTruthy();
    expect(await conferirEstado(cookie, 'google', estado.state)).toMatchObject({
      provedor: 'google',
      nonce: estado.nonce,
      retorno: 'planos',
      aceite: true,
    });
    const recusa = (p: Promise<unknown>) =>
      p.then(
        () => 'aceito',
        (e: { statusCode?: number }) => e.statusCode
      );
    expect(await recusa(conferirEstado(cookie, 'google', 'outro-state'))).toBe(
      400
    );
    expect(await recusa(conferirEstado(cookie, 'apple', estado.state))).toBe(
      400
    );
    expect(
      await recusa(conferirEstado(`${cookie}x`, 'google', estado.state))
    ).toBe(400);
    expect(
      await recusa(conferirEstado(undefined, 'google', estado.state))
    ).toBe(400);
  });

  it('a URL do Google pede PKCE e escolha de conta; a da Apple, form_post', async () => {
    const google = await novoEstado('google', { retorno: null, aceite: false });
    const urlGoogle = new URL(
      urlDeAutorizacao(
        { provedor: 'google', clientId: CLIENTE },
        google.estado,
        'https://app.test/api/auth/social/google/retorno'
      )
    );
    expect(urlGoogle.origin + urlGoogle.pathname).toBe(
      'https://accounts.google.com/o/oauth2/v2/auth'
    );
    expect(Object.fromEntries(urlGoogle.searchParams)).toMatchObject({
      client_id: CLIENTE,
      response_type: 'code',
      scope: 'openid email profile',
      code_challenge: desafioPkce(google.estado.verificador!),
      code_challenge_method: 'S256',
      state: google.estado.state,
      nonce: google.estado.nonce,
    });
    const apple = await novoEstado('apple', { retorno: null, aceite: false });
    expect(apple.estado.verificador).toBeNull();
    const urlApple = new URL(
      urlDeAutorizacao(
        { provedor: 'apple', clientId: 'br.lyra.web' },
        apple.estado,
        'https://app.test/api/auth/social/apple/retorno'
      )
    );
    expect(urlApple.searchParams.get('response_mode')).toBe('form_post');
    expect(urlApple.searchParams.get('scope')).toBe('name email');
    expect(urlApple.searchParams.has('code_challenge')).toBe(false);
  });
});

describe('login social: id_token, segredo da Apple e troca do código', () => {
  let chavePrivada: CryptoKey;
  let chaves: ReturnType<typeof createLocalJWKSet>;

  beforeAll(async () => {
    const par = await generateKeyPair('RS256');
    chavePrivada = par.privateKey;
    chaves = createLocalJWKSet({
      keys: [{ ...(await exportJWK(par.publicKey)), kid: 'k1', alg: 'RS256' }],
    });
  });

  function token(claims: Record<string, unknown>) {
    return new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(chavePrivada);
  }
  const valido = {
    iss: 'https://accounts.google.com',
    aud: CLIENTE,
    sub: '1234567890',
    nonce: 'n-1',
    email: 'Pessoa@Exemplo.com',
    email_verified: true,
    given_name: 'Ana',
    family_name: 'Teste',
  };
  const esperado = {
    provedor: 'google' as const,
    clientId: CLIENTE,
    nonce: 'n-1',
  };

  it('aceita o id_token certo e normaliza o e-mail', async () => {
    expect(
      await conferirIdToken(await token(valido), esperado, chaves)
    ).toEqual({
      provedor: 'google',
      sujeito: '1234567890',
      email: 'pessoa@exemplo.com',
      emailVerificado: true,
      nome: { primeiro: 'Ana', sobrenome: 'Teste' },
    });
  });

  it('recusa emissor, audiência, nonce ou assinatura errados', async () => {
    for (const claims of [
      { ...valido, iss: 'https://outro.example' },
      { ...valido, aud: 'outro-cliente' },
      { ...valido, nonce: 'outro-nonce' },
    ])
      await expect(
        conferirIdToken(await token(claims), esperado, chaves)
      ).rejects.toMatchObject({
        statusCode: 401,
      });
    const outra = await generateKeyPair('RS256');
    const forjado = await new SignJWT(valido)
      .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
      .setExpirationTime('5m')
      .sign(outra.privateKey);
    await expect(
      conferirIdToken(forjado, esperado, chaves)
    ).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('e-mail sem verificação não conta como verificado; a Apple manda "true" como texto', async () => {
    const naoVerificado = await conferirIdToken(
      await token({ ...valido, email_verified: false }),
      esperado,
      chaves
    );
    expect(naoVerificado.emailVerificado).toBe(false);
    const apple = await conferirIdToken(
      await token({
        ...valido,
        iss: 'https://appleid.apple.com',
        email_verified: 'true',
      }),
      { ...esperado, provedor: 'apple' },
      chaves
    );
    expect(apple.emailVerificado).toBe(true);
  });

  it('o segredo do cliente da Apple é um JWT ES256 com as declarações exigidas', async () => {
    const par = await generateKeyPair('ES256', { extractable: true });
    const segredo = await segredoDoClienteApple(
      {
        provedor: 'apple',
        clientId: 'br.lyra.web',
        segredo: await exportPKCS8(par.privateKey),
        appleTeamId: 'ABCDE12345',
        appleKeyId: 'KEY1234567',
      },
      new Date()
    );
    expect(decodeProtectedHeader(segredo)).toEqual({
      alg: 'ES256',
      kid: 'KEY1234567',
    });
    const { payload } = await jwtVerify(segredo, par.publicKey, {
      issuer: 'ABCDE12345',
      audience: 'https://appleid.apple.com',
      subject: 'br.lyra.web',
    });
    expect(Number(payload.exp) - Number(payload.iat)).toBe(300);
  });

  it('o nome da Apple vem do campo user do primeiro login', () => {
    expect(
      nomeDaApple('{"name":{"firstName":"Ana","lastName":"Teste"}}')
    ).toEqual({
      primeiro: 'Ana',
      sobrenome: 'Teste',
    });
    expect(nomeDaApple('não é json')).toBeNull();
    expect(nomeDaApple(null)).toBeNull();
  });

  it('a troca do código manda o verificador PKCE e recusa resposta sem id_token', async () => {
    const { estado } = await novoEstado('google', {
      retorno: null,
      aceite: false,
    });
    const credenciais = {
      provedor: 'google' as const,
      clientId: CLIENTE,
      segredo: 'segredo-de-teste',
      appleTeamId: null,
      appleKeyId: null,
    };
    let corpo = new URLSearchParams();
    const buscar = (async (_url: unknown, init?: RequestInit) => {
      corpo = new URLSearchParams(String(init?.body));
      return Response.json({ id_token: 'cabecalho.carga.assinatura' });
    }) as typeof fetch;
    expect(
      await trocarCodigo(
        credenciais,
        'codigo-1',
        estado,
        'https://app.test/retorno',
        buscar
      )
    ).toBe('cabecalho.carga.assinatura');
    expect(Object.fromEntries(corpo)).toMatchObject({
      grant_type: 'authorization_code',
      code: 'codigo-1',
      code_verifier: estado.verificador,
      client_secret: 'segredo-de-teste',
    });
    const recusa = (async () =>
      Response.json(
        { error: 'invalid_grant' },
        { status: 400 }
      )) as typeof fetch;
    await expect(
      trocarCodigo(credenciais, 'x', estado, 'https://app.test/retorno', recusa)
    ).rejects.toMatchObject({ statusCode: 502 });
  });
});
