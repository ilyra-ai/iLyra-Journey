/** Vocabulário público único para dashboard e relatórios; não contém SQL. */
export const DOMINIOS = {
  metricas: {
    nome: 'Registros de métricas',
    fonte: 'daily_metrics.created_at',
    limite:
      'Conta a criação da linha diária; alterações posteriores e sensores ao vivo não são novas linhas.',
  },
  reflexoes: {
    nome: 'Reflexões registradas',
    fonte: 'daily_reflections.created_at',
    limite:
      'Uma linha por data local. Reedições não contam como nova reflexão.',
  },
  respiracao: {
    nome: 'Sessões de respiração',
    fonte: 'breathing_sessions.created_at',
    limite:
      'Sessões persistidas, inclusive interrupções que atingiram o mínimo válido.',
  },
  chat: {
    nome: 'Perguntas salvas no chat',
    fonte: 'chat_turns.created_at',
    limite:
      'Exclui conversas efêmeras e turnos apagados. Estado atual, sem contar tentativas novamente.',
  },
  avaliacoes: {
    nome: 'Avaliações registradas',
    fonte: 'user_assessments.created_at',
    limite:
      'Volume de registros, sem expor respostas ou inferir resultado clínico.',
  },
  metas: {
    nome: 'Metas criadas',
    fonte: 'goals.created_at',
    limite:
      'Inclui metas automáticas; não mede adesão nem conclusão histórica.',
  },
  habitos: {
    nome: 'Hábitos criados',
    fonte: 'habits.created_at',
    limite: 'Criação de hábitos, sem inferir execução diária.',
  },
  consultas: {
    nome: 'Agendamentos criados',
    fonte: 'appointments.created_at',
    limite:
      'Data de criação, não data da consulta. Estado atual não comprova atendimento.',
  },
  profissionais: {
    nome: 'Profissionais vinculados',
    fonte: 'professionals.created_at',
    limite: 'Vínculos por conta, não pessoas únicas entre contas.',
  },
  leituras: {
    nome: 'Leituras diárias criadas',
    fonte: 'daily_briefings.created_at',
    limite:
      'Geração automática, não leitura pelo usuário. Retenção de até 90 dias.',
  },
  planos: {
    nome: 'Planos pessoais criados',
    fonte: 'ai_plans.created_at',
    limite:
      'Primeira criação da linha por pessoa, não quantidade de regenerações.',
  },
  notificacoes: {
    nome: 'Notificações criadas',
    fonte: 'user_notifications.created_at',
    limite: 'Retenção de até 90 dias. Não comprova entrega ou leitura.',
  },
  memoria: {
    nome: 'Episódios de memória',
    fonte: 'memory_episodes.created_at',
    limite:
      'Fila persistida e estado atual, sem conteúdo das memórias. Não representa treinamento RLHF.',
  },
  imagens: {
    nome: 'Pedidos de imagem',
    fonte: 'chat_generated_images.created_at',
    limite:
      'Pedidos e estado atual. Pedido não equivale a imagem gerada nem valida provedor externo.',
  },
} as const;
export type Dominio = keyof typeof DOMINIOS;
export const ATIVIDADE = [
  'metricas',
  'reflexoes',
  'respiracao',
  'chat',
  'avaliacoes',
  'habitos',
  'consultas',
  'profissionais',
] as const;
export type Agrupamento = 'dia' | 'semana' | 'mes';
export interface FiltrosAnaliticos {
  inicio: string;
  fim: string;
  plano: string;
  agrupamento: Agrupamento;
}
export interface PontoTemporal {
  data: string;
  cadastros: number;
  ativos: number;
  chat: number;
  metricas: number;
}
export interface Contagens {
  cadastros: number;
  ativos: number;
  concluidos: number;
}
export interface DetalheAnalitico {
  id: string;
  usuarioId: string;
  email: string;
  data: string;
  estado: string;
  dominio: string;
}
export interface PaginaDetalhes {
  itens: DetalheAnalitico[];
  total: number;
  pagina: number;
  porPagina: number;
}
export interface PainelAnalitico {
  filtros: FiltrosAnaliticos;
  geradoEm: string;
  anterior: { inicio: string; fim: string };
  atual: Contagens;
  comparacao: Contagens;
  base: {
    contas: number;
    bloqueadas: number;
    pendentes: number;
    semAssinatura: number;
    multiplasAssinaturas: number;
  };
  planos: { chave: string; nome: string; contas: number }[];
  opcoesPlanos: { chave: string; nome: string }[];
  dominios: {
    chave: Dominio;
    registros: number;
    pessoas: number;
    anterior: number;
    erros: number;
  }[];
  serie: PontoTemporal[];
  serieAnterior: PontoTemporal[];
  eventos: PaginaDetalhes;
  catalogo: {
    dicas: number;
    habitos: number;
    planos: number;
    documentos: number;
  };
}
export function percentual(
  numerador: number,
  denominador: number
): number | null {
  return denominador === 0 ? null : (100 * numerador) / denominador;
}
export function variacao(atual: number, anterior: number): number | null {
  return anterior === 0 ? null : ((atual - anterior) / anterior) * 100;
}
