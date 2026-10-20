export type EstadoDoTurno = 'processando' | 'concluido' | 'erro';

export interface ResumoDaConversa {
  id: string;
  titulo: string;
  atualizadaEm: string;
}

export interface PaginaDeConversas {
  conversas: ResumoDaConversa[];
  proximoCursor: string | null;
}

export interface TurnoDaConversa {
  id: string;
  sequencia: number;
  pergunta: string;
  resposta: string | null;
  estado: EstadoDoTurno;
  erro: string | null;
  criadaEm: string;
}

export interface PaginaDaConversa {
  conversa: ResumoDaConversa;
  turnos: TurnoDaConversa[];
  antes: number | null;
}

export interface PedidoComHistorico {
  conversationId: string;
  turnId: string;
  query: string;
  regenerate?: boolean;
}

export interface RespostaDoChat {
  response: string;
  conversationId?: string;
  turnId?: string;
}

/** Invalida as listas quando uma conversa é criada ou atualizada. */
export const EVENTO_DO_HISTORICO = 'lyra:historico-de-conversas-atualizado';
