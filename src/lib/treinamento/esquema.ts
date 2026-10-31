import { z } from 'zod';

/**
 * Treinamento por feedback humano no chat (tarefa 90). O administrador liga
 * o "Treinamento", avalia respostas das próprias conversas (boa ou precisa
 * melhorar, com a resposta ideal opcional) e, ao desligar, o serviço de
 * treinamento ajusta os pesos do modelo conectado com KTO + LoRA e aplica a
 * nova versão para todos.
 */
export const NOME_DO_MODELO_TREINAVEL = 'lyra-treinavel';
export const MECANISMO =
  'KTO (Kahneman-Tversky Optimization) com adaptadores LoRA: alinhamento por feedback humano da família do RLHF, sem o modelo de recompensa e o PPO do RLHF clássico.';

export const acaoSchema = z
  .object({
    acao: z.enum(['ativar', 'desativar'], { error: 'Ação inválida.' }),
  })
  .strict();

const correcao = z
  .string()
  .trim()
  .max(8000, 'Use até 8000 caracteres na resposta ideal.')
  .nullable();

export const avaliacaoSchema = z
  .object({
    turnoId: z.uuid({ error: 'Resposta inválida.' }),
    nota: z.union([z.literal(1), z.literal(-1)], {
      error: 'Escolha se a resposta foi boa ou precisa melhorar.',
    }),
    correcao,
  })
  .strict();
export type NovaAvaliacao = z.infer<typeof avaliacaoSchema>;

export const edicaoSchema = z
  .object({
    versao: z.number().int().positive('Versão inválida.'),
    nota: z.union([z.literal(1), z.literal(-1)], { error: 'Nota inválida.' }),
    correcao,
  })
  .strict();
export const versaoSchema = z
  .object({ versao: z.number().int().positive('Versão inválida.') })
  .strict();

export interface Avaliacao {
  id: string;
  turnoId: string;
  pergunta: string;
  resposta: string;
  nota: 1 | -1;
  correcao: string | null;
  versao: number;
  atualizadaEm: string;
}

export interface ExemploDeTreino {
  pergunta: string;
  resposta: string;
  desejavel: boolean;
}

/**
 * Converte avaliações em exemplos: resposta aprovada é desejável; reprovada
 * é indesejável; a resposta ideal escrita pelo administrador entra como
 * desejável para a mesma pergunta.
 */
export function exemplosDoTreino(
  avaliacoes: Array<
    Pick<Avaliacao, 'pergunta' | 'resposta' | 'nota' | 'correcao'>
  >
): ExemploDeTreino[] {
  return avaliacoes.flatMap((a) => [
    { pergunta: a.pergunta, resposta: a.resposta, desejavel: a.nota === 1 },
    ...(a.correcao
      ? [{ pergunta: a.pergunta, resposta: a.correcao, desejavel: true }]
      : []),
  ]);
}

export type EstadoDaSessao = 'ativa' | 'treinando' | 'aplicada' | 'falhou';

export interface Metricas {
  antes: {
    logprobDesejaveis: number | null;
    logprobIndesejaveis: number | null;
    margem: number | null;
  };
  depois: {
    logprobDesejaveis: number | null;
    logprobIndesejaveis: number | null;
    margem: number | null;
  };
  perdaFinal: number | null;
}

export interface SessaoDeTreino {
  id: string;
  estado: EstadoDaSessao;
  iniciadaEm: string;
  iniciadaPor: string | null;
  encerradaEm: string | null;
  exemplos: number | null;
  versaoDoModelo: number | null;
  aplicadaEm: string | null;
  metricas: Metricas | null;
  erro: string | null;
  avaliacoes: number;
}

export interface EstadoDoTreinamento {
  /** O modelo em uso (primeiro da ordem) é o modelo treinável da Lyra. */
  conectado: boolean;
  motivo: string | null;
  versaoAtiva: number | null;
  minimo: number;
  mecanismo: string;
  sessao: SessaoDeTreino | null;
  historico: SessaoDeTreino[];
}
