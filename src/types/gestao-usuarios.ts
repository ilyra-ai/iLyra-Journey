export const ACOES_DE_GESTAO = {
  sessions_revoked: 'Sessões anteriores encerradas',
  account_blocked: 'Conta bloqueada',
  account_unblocked: 'Conta desbloqueada',
  account_created: 'Conta criada pela administração',
  role_changed: 'Papel da conta alterado',
  onboarding_changed: 'Estado do onboarding alterado',
  marker_catalog_created: 'Marcador criado no catálogo',
  marker_catalog_updated: 'Marcador atualizado no catálogo',
  marker_catalog_deleted: 'Marcador excluído do catálogo',
  marker_assigned: 'Marcador adicionado à conta',
  marker_removed: 'Marcador removido da conta',
  note_created: 'Nota operacional criada',
  note_updated: 'Nota operacional atualizada',
  note_deleted: 'Nota operacional excluída',
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

export interface NotaOperacional {
  id: string;
  body: string;
  version: number;
  authorEmail: string | null;
  editorEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

export const CORES_MARCADOR = [
  'neutro',
  'azul',
  'verde',
  'amarelo',
  'roxo',
  'rosa',
] as const;
export type CorMarcador = (typeof CORES_MARCADOR)[number];
export interface MarcadorOperacional {
  id: string;
  name: string;
  color: CorMarcador;
  version: number;
  userCount: number;
  assigned?: boolean;
}
