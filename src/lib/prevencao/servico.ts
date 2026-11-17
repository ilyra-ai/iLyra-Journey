import { lerPerfilAstrologico } from '@/lib/astrology/perfil-astrologico';
import { dataLocal } from '@/lib/astrology/tempo';
import { HttpError } from '@/lib/http-error';
import { executeStatement, queryRows, withTransaction } from '@/lib/mysql/pool';

import {
  CONDICOES,
  type Condicao,
  type Genero,
  montarPlanoDePrevencao,
  type Parente,
  PARENTES,
  type PlanoDePrevencao,
  type Publico,
  type Recomendacao,
} from './plano';

/**
 * Persistência da prevenção (tarefa 209). Histórico da família, exames e
 * vínculos são dados de saúde do titular: só ele lê e altera os próprios.
 * O catálogo de recomendações é do motor e só a administração o altera.
 */

/** Revisão mensal do catálogo pela administração. */
export const DIAS_ENTRE_REVISOES = 30;

interface LinhaDaRecomendacao {
  id: string;
  nome: string;
  procura: string;
  publico: Publico;
  idade_minima: number;
  idade_maxima: number | null;
  intervalo_meses: number | null;
  tipo: 'rotina' | 'conversa';
  orientacao: string;
  historico_relevante: unknown;
  fonte_nome: string;
  fonte_url: string;
  conferido: number | boolean;
  revisado_em: string | Date;
  ativo: number | boolean;
  ordem: number;
}

function instante(valor: string | Date) {
  return valor instanceof Date
    ? valor.toISOString()
    : new Date(`${valor.replace(' ', 'T')}Z`).toISOString();
}

function condicoes(valor: unknown): Condicao[] {
  const dados =
    typeof valor === 'string' ? (JSON.parse(valor) as unknown) : valor;
  return Array.isArray(dados)
    ? dados.filter((item): item is Condicao =>
        (CONDICOES as readonly string[]).includes(item)
      )
    : [];
}

function daLinha(
  linha: LinhaDaRecomendacao
): Recomendacao & { ativo: boolean } {
  return {
    id: linha.id,
    nome: linha.nome,
    procura: linha.procura,
    publico: linha.publico,
    idadeMinima: Number(linha.idade_minima),
    idadeMaxima:
      linha.idade_maxima === null ? null : Number(linha.idade_maxima),
    intervaloMeses:
      linha.intervalo_meses === null ? null : Number(linha.intervalo_meses),
    tipo: linha.tipo,
    orientacao: linha.orientacao,
    historicoRelevante: condicoes(linha.historico_relevante),
    fonteNome: linha.fonte_nome,
    fonteUrl: linha.fonte_url,
    conferido: Boolean(linha.conferido),
    revisadoEm: instante(linha.revisado_em),
    ativo: Boolean(linha.ativo),
    ordem: Number(linha.ordem),
  };
}

export async function lerCatalogo(apenasAtivos: boolean) {
  const linhas = await queryRows<LinhaDaRecomendacao>(
    `SELECT id, nome, procura, publico, idade_minima, idade_maxima,
            intervalo_meses, tipo, orientacao, historico_relevante, fonte_nome,
            fonte_url, conferido, revisado_em, ativo, ordem
       FROM prevencao_recomendacoes
      ${apenasAtivos ? 'WHERE ativo = TRUE' : ''}
      ORDER BY ordem, id`
  );
  return linhas.map(daLinha);
}

function dataIso(valor: string | Date | null) {
  if (!valor) return null;
  return valor instanceof Date
    ? valor.toISOString().slice(0, 10)
    : valor.slice(0, 10);
}

export type PlanoComDados = PlanoDePrevencao & {
  historico: Array<{ parente: Parente; condicao: Condicao }>;
  vinculosRespondidos: Record<string, 'sim' | 'as-vezes' | 'nao'>;
};

/** Plano de prevenção do próprio titular. */
export async function lerPlanoDoTitular(
  userId: string,
  agora = new Date()
): Promise<PlanoComDados> {
  const [perfil] = await queryRows<{
    birth_date: string | Date | null;
    gender: string | null;
  }>('SELECT birth_date, gender FROM profiles WHERE id = ? LIMIT 1', [userId]);
  if (!perfil) throw new HttpError('Perfil não encontrado.', 404);
  const astrologico = await lerPerfilAstrologico(userId);
  const fuso = astrologico.localDoDia?.fuso;
  const hoje = fuso ? dataLocal(agora, fuso) : agora.toISOString().slice(0, 10);

  const [catalogo, exames, historico, vinculos] = await Promise.all([
    lerCatalogo(true),
    queryRows<{ recomendacao_id: string; realizado_em: string | Date }>(
      'SELECT recomendacao_id, realizado_em FROM prevencao_exames_realizados WHERE user_id = ?',
      [userId]
    ),
    queryRows<{ parente: Parente; condicao: Condicao }>(
      'SELECT parente, condicao FROM prevencao_historico_familiar WHERE user_id = ? ORDER BY parente, condicao',
      [userId]
    ),
    queryRows<{ vinculo_id: string; pesa: 'sim' | 'as-vezes' | 'nao' }>(
      'SELECT vinculo_id, pesa FROM prevencao_vinculos WHERE user_id = ?',
      [userId]
    ),
  ]);
  const genero = ['male', 'female', 'other', 'prefer_not-to-say'].includes(
    perfil.gender ?? ''
  )
    ? (perfil.gender as Genero)
    : null;
  return {
    ...montarPlanoDePrevencao({
      nascimento: dataIso(perfil.birth_date),
      genero,
      catalogo,
      exames: Object.fromEntries(
        exames.map((e) => [e.recomendacao_id, dataIso(e.realizado_em)!])
      ),
      historico,
      vinculos: vinculos.map((v) => ({
        vinculoId: v.vinculo_id,
        pesa: v.pesa,
      })),
      hoje,
    }),
    historico,
    vinculosRespondidos: Object.fromEntries(
      vinculos.map((v) => [v.vinculo_id, v.pesa])
    ),
  };
}

export async function registrarExame(
  userId: string,
  recomendacaoId: string,
  realizadoEm: string | null,
  hoje: string
) {
  if (realizadoEm !== null && realizadoEm > hoje) {
    throw new HttpError('A data do exame não pode estar no futuro.', 400);
  }
  const [existe] = await queryRows<{ id: string }>(
    'SELECT id FROM prevencao_recomendacoes WHERE id = ? AND ativo = TRUE',
    [recomendacaoId]
  );
  if (!existe) throw new HttpError('Exame não encontrado.', 404);
  if (realizadoEm === null) {
    await executeStatement(
      'DELETE FROM prevencao_exames_realizados WHERE user_id = ? AND recomendacao_id = ?',
      [userId, recomendacaoId]
    );
    return;
  }
  await executeStatement(
    `INSERT INTO prevencao_exames_realizados (user_id, recomendacao_id, realizado_em)
     VALUES (?, ?, ?) AS novo
     ON DUPLICATE KEY UPDATE realizado_em = novo.realizado_em`,
    [userId, recomendacaoId, realizadoEm]
  );
}

export async function definirHistorico(
  userId: string,
  parente: Parente,
  condicao: Condicao,
  presente: boolean
) {
  if (!PARENTES.includes(parente) || !CONDICOES.includes(condicao)) {
    throw new HttpError('Parente ou condição inválidos.', 400);
  }
  await executeStatement(
    presente
      ? 'INSERT IGNORE INTO prevencao_historico_familiar (user_id, parente, condicao) VALUES (?, ?, ?)'
      : 'DELETE FROM prevencao_historico_familiar WHERE user_id = ? AND parente = ? AND condicao = ?',
    [userId, parente, condicao]
  );
}

export async function definirVinculo(
  userId: string,
  vinculoId: string,
  pesa: 'sim' | 'as-vezes' | 'nao'
) {
  await executeStatement(
    `INSERT INTO prevencao_vinculos (user_id, vinculo_id, pesa) VALUES (?, ?, ?)
     AS novo ON DUPLICATE KEY UPDATE pesa = novo.pesa`,
    [userId, vinculoId, pesa]
  );
}

/** Situação da revisão mensal do catálogo. */
export async function situacaoDaRevisao(agora = new Date()) {
  const catalogo = await lerCatalogo(false);
  const maisAntiga = catalogo
    .map((r) => new Date(r.revisadoEm).getTime())
    .reduce((a, b) => Math.min(a, b), Number.POSITIVE_INFINITY);
  const venceEm = Number.isFinite(maisAntiga)
    ? new Date(maisAntiga + DIAS_ENTRE_REVISOES * 86_400_000)
    : agora;
  return {
    catalogo,
    venceEm: venceEm.toISOString(),
    vencida:
      venceEm.getTime() <= agora.getTime() ||
      catalogo.some((r) => !r.conferido),
    naoConferidas: catalogo.filter((r) => !r.conferido).map((r) => r.id),
  };
}

export interface AlteracaoDaRecomendacao {
  nome?: string;
  procura?: string;
  idadeMinima?: number;
  idadeMaxima?: number | null;
  intervaloMeses?: number | null;
  orientacao?: string;
  fonteNome?: string;
  fonteUrl?: string;
  ativo?: boolean;
}

/**
 * Edita uma recomendação e a marca como conferida e revisada agora pelo
 * administrador.
 */
export async function alterarRecomendacao(
  id: string,
  alteracao: AlteracaoDaRecomendacao,
  administrador: string
) {
  const colunas: Record<keyof AlteracaoDaRecomendacao, string> = {
    nome: 'nome',
    procura: 'procura',
    idadeMinima: 'idade_minima',
    idadeMaxima: 'idade_maxima',
    intervaloMeses: 'intervalo_meses',
    orientacao: 'orientacao',
    fonteNome: 'fonte_nome',
    fonteUrl: 'fonte_url',
    ativo: 'ativo',
  };
  const campos = Object.entries(alteracao).filter(
    ([, valor]) => valor !== undefined
  ) as Array<[keyof AlteracaoDaRecomendacao, unknown]>;
  const resultado = await executeStatement(
    `UPDATE prevencao_recomendacoes
        SET ${[
          ...campos.map(([campo]) => `${colunas[campo]} = ?`),
          'conferido = TRUE',
          'revisado_em = CURRENT_TIMESTAMP(3)',
          'revisado_por = ?',
        ].join(', ')}
      WHERE id = ?`,
    [...campos.map(([, valor]) => valor), administrador, id]
  );
  if (resultado.affectedRows === 0) {
    throw new HttpError('Recomendação não encontrada.', 404);
  }
}

/**
 * O administrador confirma que conferiu todas as recomendações nas fontes:
 * marca todas como conferidas e revisadas agora.
 */
export async function confirmarRevisao(administrador: string) {
  await withTransaction(async (conexao) => {
    await executeStatement(
      `UPDATE prevencao_recomendacoes
          SET conferido = TRUE, revisado_em = CURRENT_TIMESTAMP(3),
              revisado_por = ?`,
      [administrador],
      conexao
    );
  });
}
