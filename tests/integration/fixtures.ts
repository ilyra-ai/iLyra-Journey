import { randomUUID } from 'node:crypto';

import { executeStatement, queryRows } from '@/lib/mysql/pool';
import type { AppSession } from '@/types/app-session';

export interface UsuarioDeTeste {
  id: string;
  email: string;
  role: string;
  session: AppSession;
}

/**
 * Cria uma conta real (users + profiles) no banco de teste e devolve a sessão
 * equivalente à que o login emitiria. O hash não corresponde a nenhuma senha:
 * os testes de integração usam a sessão diretamente.
 */
export async function criarUsuario(
  role: 'patient' | 'admin' = 'patient',
  nome = 'Pessoa'
): Promise<UsuarioDeTeste> {
  const id = randomUUID();
  const email = `${role}-${id.slice(0, 8)}@teste.lyra.local`;
  await executeStatement(
    'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)',
    [id, email, '$2b$12$hashinvalidohashinvalidohashinvalidohashinvalidoxxxx']
  );
  await executeStatement(
    `INSERT INTO profiles (id, first_name, last_name, email, onboarding_completed, role)
     VALUES (?, ?, 'Teste', ?, TRUE, ?)`,
    [id, nome, email, role]
  );
  return {
    id,
    email,
    role,
    session: {
      user: {
        id,
        email,
        role,
        // Igual ao perfil inserido acima (onboarding_completed = TRUE).
        onboarding_completed: true,
        user_metadata: {
          first_name: nome,
          last_name: 'Teste',
          full_name: `${nome} Teste`,
        },
      },
    },
  };
}

export async function contar(
  sql: string,
  params: readonly unknown[] = []
): Promise<number> {
  const linhas = await queryRows<{ total: number }>(sql, params);
  return Number(linhas[0]?.total ?? 0);
}

/**
 * Configuração global de Agendamentos (tarefa 134). O padrão do produto é
 * desativado para usuários; testes de direitos do plano da agenda ligam o
 * recurso como pré-condição e restauram o padrão ao terminar.
 */
export async function definirAgendamentosParaUsuarios(ativo: boolean) {
  await executeStatement(
    "UPDATE platform_feature_switches SET enabled=?,version=version+1 WHERE switch_key='agendamentos_usuarios'",
    [ativo]
  );
}

/**
 * Fixa um direito da matriz de planos para o teste e devolve a função que
 * restaura o valor anterior. Testes do mecanismo de cota e de recurso
 * declaram o limite que testam, sem depender da matriz que a administração
 * edita (desde a tarefa 224, Free e Meta partem do mesmo acesso do Care).
 */
export async function definirDireito(
  plano: string,
  recurso: string,
  valores: {
    enabled: boolean;
    quota?: number | null;
    reset?: string | null;
  }
): Promise<() => Promise<void>> {
  const [anterior] = await queryRows<{
    enabled: number;
    quota_value: number | null;
    reset_interval: string | null;
  }>(
    `SELECT pe.enabled, pe.quota_value, pe.reset_interval
       FROM plan_entitlements pe
       JOIN plan_features f ON f.id = pe.feature_id
       JOIN subscription_plans p ON p.id = pe.plan_id
      WHERE p.plan_key = ? AND f.feature_key = ?`,
    [plano, recurso]
  );
  if (!anterior) {
    throw new Error(`Direito ausente na matriz: ${plano}/${recurso}`);
  }
  const gravar = (
    enabled: boolean,
    quota: number | null,
    reset: string | null
  ) =>
    executeStatement(
      `UPDATE plan_entitlements pe
         JOIN plan_features f ON f.id = pe.feature_id
         JOIN subscription_plans p ON p.id = pe.plan_id
          SET pe.enabled = ?, pe.quota_value = ?, pe.reset_interval = ?
        WHERE p.plan_key = ? AND f.feature_key = ?`,
      [enabled, quota, reset, plano, recurso]
    );
  await gravar(
    valores.enabled,
    valores.quota === undefined ? anterior.quota_value : valores.quota,
    valores.reset === undefined ? anterior.reset_interval : valores.reset
  );
  return async () => {
    await gravar(
      Boolean(anterior.enabled),
      anterior.quota_value,
      anterior.reset_interval
    );
  };
}
