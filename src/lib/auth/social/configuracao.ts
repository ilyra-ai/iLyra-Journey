import { z } from 'zod';

import { executeStatement, queryRows } from '@/lib/mysql/pool';
import { cifrar, decifrar } from '@/lib/security/cifra';

/**
 * Configuração do login com Google e Apple (tarefas 164 e 165), feita pela
 * administração. O segredo fica cifrado no banco e só é decifrado no
 * servidor, no momento do login.
 */

export const PROVEDORES_SOCIAIS = ['google', 'apple'] as const;
export type ProvedorSocial = (typeof PROVEDORES_SOCIAIS)[number];

export const NOME_DO_PROVEDOR: Record<ProvedorSocial, string> = {
  google: 'Google',
  apple: 'Apple',
};

const FINALIDADE = 'login-social';

interface Linha {
  provedor: ProvedorSocial;
  ativo: number;
  client_id: string | null;
  segredo_cifrado: string | null;
  apple_team_id: string | null;
  apple_key_id: string | null;
}

/** O que a tela da administração recebe: nunca o segredo. */
export interface ConfiguracaoPublica {
  provedor: ProvedorSocial;
  ativo: boolean;
  clientId: string | null;
  segredoConfigurado: boolean;
  appleTeamId: string | null;
  appleKeyId: string | null;
  /** Credenciais completas para entrar (o botão só aparece assim). */
  pronto: boolean;
}

/** Só no servidor, durante o login. */
export interface CredenciaisDoProvedor {
  provedor: ProvedorSocial;
  clientId: string;
  segredo: string;
  appleTeamId: string | null;
  appleKeyId: string | null;
}

function completo(l: Linha, segredo: string | null) {
  if (!l.client_id || !segredo) return false;
  return l.provedor === 'google' || Boolean(l.apple_team_id && l.apple_key_id);
}

async function linhas() {
  return queryRows<Linha>(
    `SELECT provedor, ativo, client_id, segredo_cifrado, apple_team_id, apple_key_id
       FROM login_social_provedores ORDER BY provedor`
  );
}

export async function lerConfiguracoes(): Promise<ConfiguracaoPublica[]> {
  return (await linhas()).map((l) => {
    const segredo = l.segredo_cifrado
      ? decifrar(l.segredo_cifrado, FINALIDADE)
      : null;
    return {
      provedor: l.provedor,
      ativo: Boolean(l.ativo),
      clientId: l.client_id,
      segredoConfigurado: segredo !== null,
      appleTeamId: l.apple_team_id,
      appleKeyId: l.apple_key_id,
      pronto: completo(l, segredo),
    };
  });
}

/** Provedores que aparecem na tela de login: ligados e configurados. */
export async function provedoresDisponiveis(): Promise<ProvedorSocial[]> {
  return (await lerConfiguracoes())
    .filter((c) => c.ativo && c.pronto)
    .map((c) => c.provedor);
}

/** Credenciais decifradas de um provedor ligado e pronto; senão `null`. */
export async function credenciaisDoProvedor(
  provedor: ProvedorSocial
): Promise<CredenciaisDoProvedor | null> {
  const l = (await linhas()).find((x) => x.provedor === provedor);
  if (!l || !l.ativo) return null;
  const segredo = l.segredo_cifrado
    ? decifrar(l.segredo_cifrado, FINALIDADE)
    : null;
  if (!completo(l, segredo)) return null;
  return {
    provedor,
    clientId: l.client_id!,
    segredo: segredo!,
    appleTeamId: l.apple_team_id,
    appleKeyId: l.apple_key_id,
  };
}

export const esquemaDaConfiguracao = z
  .object({
    provedor: z.enum(PROVEDORES_SOCIAIS),
    ativo: z.boolean(),
    clientId: z.string().trim().max(255).nullable(),
    /** Ausente: mantém o segredo salvo. `null`: apaga. Texto: novo segredo. */
    segredo: z.string().trim().min(1).max(4000).nullable().optional(),
    appleTeamId: z
      .string()
      .trim()
      .regex(/^[A-Z0-9]{10}$/, 'O Team ID da Apple tem 10 letras ou números.')
      .nullable()
      .optional(),
    appleKeyId: z
      .string()
      .trim()
      .regex(/^[A-Z0-9]{10}$/, 'O Key ID da Apple tem 10 letras ou números.')
      .nullable()
      .optional(),
  })
  .strict()
  .superRefine((c, ctx) => {
    if (
      c.provedor === 'apple' &&
      typeof c.segredo === 'string' &&
      !c.segredo.includes('BEGIN PRIVATE KEY')
    )
      ctx.addIssue({
        code: 'custom',
        path: ['segredo'],
        message:
          'Cole a chave privada .p8 da Apple inteira, com BEGIN PRIVATE KEY.',
      });
  });

export async function gravarConfiguracao(
  c: z.infer<typeof esquemaDaConfiguracao>,
  administrador: string
) {
  const campos = [
    'ativo = ?',
    'client_id = ?',
    'apple_team_id = ?',
    'apple_key_id = ?',
    'atualizado_por = ?',
  ];
  const valores: unknown[] = [
    c.ativo,
    c.clientId || null,
    c.provedor === 'apple' ? (c.appleTeamId ?? null) : null,
    c.provedor === 'apple' ? (c.appleKeyId ?? null) : null,
    administrador,
  ];
  if (c.segredo !== undefined) {
    campos.push('segredo_cifrado = ?');
    valores.push(c.segredo === null ? null : cifrar(c.segredo, FINALIDADE));
  }
  await executeStatement(
    `UPDATE login_social_provedores SET ${campos.join(', ')} WHERE provedor = ?`,
    [...valores, c.provedor]
  );
}
