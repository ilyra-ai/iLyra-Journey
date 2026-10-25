export type EstadoDoTurno = 'processando' | 'concluido' | 'erro';

export interface ImagemDoTurno {
  turnoId: string;
  tipo: 'solicitada' | 'mapa';
  estado: 'pendente' | 'gerando' | 'pronta' | 'erro';
  provedor: string | null;
  modelo: string | null;
  largura: number | null;
  altura: number | null;
  erro: string | null;
}
export interface PedidoDeImagemDoTurno {
  tipo: ImagemDoTurno['tipo'];
  prompt: string;
}

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
  imagem?: ImagemDoTurno | null;
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
  imagem?: ImagemDoTurno | null;
  response: string;
  conversationId?: string;
  turnId?: string;
}

/** Invalida as listas quando uma conversa é criada ou atualizada. */
export const EVENTO_DO_HISTORICO = 'lyra:historico-de-conversas-atualizado';
