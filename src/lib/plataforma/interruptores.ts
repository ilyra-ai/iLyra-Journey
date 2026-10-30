import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { PoolConnection } from 'mysql2/promise';
import type { AppSession } from '@/types/app-session';
import type { PlanFeatureKey } from '@/types/subscription';
import { HttpError } from '@/lib/http-error';
import { executeStatement, queryRows, withTransaction } from '@/lib/mysql/pool';

/**
 * Agendamentos (consultas e profissionais) ficam desativados para usuários
 * por padrão. O interruptor só restringe: ativado, os direitos do plano
 * continuam valendo; administradores sempre mantêm acesso para gerir o
 * recurso.
 */
export const INTERRUPTOR_AGENDAMENTOS = 'agendamentos_usuarios';
export const RECURSOS_DE_AGENDAMENTO: readonly PlanFeatureKey[] = [
  'appointments_active',
  'professionals_total',
];
export const alteracaoSchema = z
  .object({
    ativo: z.boolean({ error: 'Informe se o recurso fica ativo.' }),
    versao: z.number().int().positive('Versão inválida.'),
  })
  .strict();

export interface EstadoDoInterruptor {
  chave: string;
  ativo: boolean;
  versao: number;
  atualizadoEm: string;
  atualizadoPor: { id: string; nome: string } | null;
  historico: Array<{
    id: string;
    anterior: boolean;
    novo: boolean;
    em: string;
    responsavel: { id: string; nome: string } | null;
  }>;
}

const iso = (s: string) => s.replace(' ', 'T') + 'Z';
type Executor = PoolConnection | undefined;

/** Estado atual; ausência da linha vale como desativado (padrão seguro). */
export async function agendamentosLiberadosParaUsuarios(c?: Executor) {
  const [r] = await queryRows<{ enabled: number }>(
    'SELECT enabled FROM platform_feature_switches WHERE switch_key=?',
    [INTERRUPTOR_AGENDAMENTOS],
    c
  );
  return Boolean(r && Number(r.enabled) === 1);
}

export async function lerInterruptorDeAgendamentos(): Promise<EstadoDoInterruptor> {
  const [r] = await queryRows<{
    enabled: number;
    version: number;
    updated_at: string;
    updated_by: string | null;
    nome: string | null;
  }>(
    "SELECT s.enabled,s.version,s.updated_at,s.updated_by,TRIM(CONCAT(COALESCE(p.first_name,''),' ',COALESCE(p.last_name,''))) nome FROM platform_feature_switches s LEFT JOIN profiles p ON p.id=s.updated_by WHERE s.switch_key=?",
    [INTERRUPTOR_AGENDAMENTOS]
  );
  if (!r)
    throw new HttpError('Configuração de agendamentos não encontrada.', 500);
  const eventos = await queryRows<{
    id: string;
    previous_enabled: number;
    next_enabled: number;
    created_at: string;
    actor_id: string | null;
    nome: string | null;
  }>(
    "SELECT e.id,e.previous_enabled,e.next_enabled,e.created_at,e.actor_id,TRIM(CONCAT(COALESCE(p.first_name,''),' ',COALESCE(p.last_name,''))) nome FROM platform_feature_switch_events e LEFT JOIN profiles p ON p.id=e.actor_id WHERE e.switch_key=? ORDER BY e.created_at DESC,e.id DESC LIMIT 20",
    [INTERRUPTOR_AGENDAMENTOS]
  );
  const pessoa = (id: string | null, nome: string | null) =>
    id ? { id, nome: nome || 'Administrador' } : null;
  return {
    chave: INTERRUPTOR_AGENDAMENTOS,
    ativo: Number(r.enabled) === 1,
    versao: Number(r.version),
    atualizadoEm: iso(r.updated_at),
    atualizadoPor: pessoa(r.updated_by, r.nome),
    historico: eventos.map((e) => ({
      id: e.id,
      anterior: Number(e.previous_enabled) === 1,
      novo: Number(e.next_enabled) === 1,
      em: iso(e.created_at),
      responsavel: pessoa(e.actor_id, e.nome),
    })),
  };
}

export async function alterarInterruptorDeAgendamentos(
  s: AppSession,
  p: z.infer<typeof alteracaoSchema>,
  agora = new Date()
) {
  if (s.user.role !== 'admin')
    throw new HttpError('Acesso restrito a administradores.', 403);
  await withTransaction(async (c) => {
    const [r] = await queryRows<{ enabled: number; version: number }>(
      'SELECT enabled,version FROM platform_feature_switches WHERE switch_key=? FOR UPDATE',
      [INTERRUPTOR_AGENDAMENTOS],
      c
    );
    if (!r)
      throw new HttpError('Configuração de agendamentos não encontrada.', 500);
    if (Number(r.version) !== p.versao)
      throw new HttpError(
        'A configuração mudou em outra sessão. Atualize antes de alterar.',
        409
      );
    const anterior = Number(r.enabled) === 1;
    if (anterior === p.ativo) return;
    await executeStatement(
      'UPDATE platform_feature_switches SET enabled=?,version=version+1,updated_by=?,updated_at=? WHERE switch_key=?',
      [p.ativo, s.user.id, agora, INTERRUPTOR_AGENDAMENTOS],
      c
    );
    await executeStatement(
      'INSERT INTO platform_feature_switch_events(id,switch_key,previous_enabled,next_enabled,actor_id,created_at) VALUES(?,?,?,?,?,?)',
      [
        randomUUID(),
        INTERRUPTOR_AGENDAMENTOS,
        anterior,
        p.ativo,
        s.user.id,
        agora,
      ],
      c
    );
  });
  return lerInterruptorDeAgendamentos();
}
