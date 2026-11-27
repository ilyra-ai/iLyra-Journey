import { describe, expect, it } from 'vitest';

import { criarUsuario } from '../../../../tests/integration/fixtures';
import { chamar } from '../../../../tests/integration/http';
import { buildAppSession } from '@/lib/auth/session';
import { queryRows } from '@/lib/mysql/pool';

import { PUT } from './tema/route';

async function temaNoBanco(id: string) {
  const [linha] = await queryRows<{ tema_preferido: string | null }>(
    'SELECT tema_preferido FROM profiles WHERE id = ?',
    [id]
  );
  return linha.tema_preferido;
}

describe('tema preferido da conta (migração 086)', () => {
  it('exige sessão, grava só o próprio perfil e recusa valor fora da lista', async () => {
    expect(
      (
        await chamar(PUT, {
          usuario: null,
          method: 'PUT',
          body: { tema: 'dark' },
        })
      ).status
    ).toBe(401);
    const pessoa = await criarUsuario();
    const outra = await criarUsuario();
    expect(await temaNoBanco(pessoa.id)).toBeNull();
    const resposta = await chamar(PUT, {
      usuario: pessoa,
      method: 'PUT',
      body: { tema: 'dark' },
    });
    expect(resposta.status).toBe(200);
    expect(await temaNoBanco(pessoa.id)).toBe('dark');
    expect(await temaNoBanco(outra.id)).toBeNull();
    for (const body of [{ tema: 'system' }, { tema: 'dark', userId: outra.id }])
      expect(
        (await chamar(PUT, { usuario: pessoa, method: 'PUT', body })).status
      ).toBe(400);
    expect(await temaNoBanco(outra.id)).toBeNull();
  });

  it('a sessão leva o tema da conta para o app abrir nele', () => {
    const base = { sub: 'id', email: 'a@b.c', role: 'patient' };
    expect(
      buildAppSession(base, { onboarding_completed: 1, tema_preferido: 'dark' })
        .user.tema_preferido
    ).toBe('dark');
    expect(
      buildAppSession(base, { onboarding_completed: 1, tema_preferido: 'roxo' })
        .user.tema_preferido
    ).toBeNull();
  });
});
