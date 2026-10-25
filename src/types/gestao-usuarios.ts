export const ACOES_DE_GESTAO = {
  sessions_revoked: 'Sessões anteriores encerradas',
  account_blocked: 'Conta bloqueada',
  account_unblocked: 'Conta desbloqueada',
  account_created: 'Conta criada pela administração',
  role_changed: 'Papel da conta alterado',
  onboarding_changed: 'Estado do onboarding alterado',
  subscription_assigned: 'Plano atribuído pela administração',
} as const;

export interface EventoDeUsuario {
  key: string;
  action: string;
  label: string;
  reason: string | null;
  actorEmail: string | null;
  createdAt: string;
  source: 'gestao' | 'assinaturas';
}
export interface HistoricoDeUsuario {
  events: EventoDeUsuario[];
  nextCursor: string | null;
}
