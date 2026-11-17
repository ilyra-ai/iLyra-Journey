import { randomUUID } from 'node:crypto';

import { z } from 'zod';

import {
  cadeiaTemModelo,
  type EloDaCadeia,
  montarCadeia,
} from '@/lib/ai/cadeia-de-modelos';
import { lerAcessoInternet, registrarConsulta } from '@/lib/ai/internet/acesso';
import type { AmbienteDaBusca } from '@/lib/ai/internet/busca';
import type { AcessoInternet } from '@/lib/ai/internet/dominios';
import { pesquisarNaInternet } from '@/lib/ai/internet/pesquisa';
import { AcessoNegado, type Resolvedor } from '@/lib/ai/internet/seguranca';
import { lerConfiguracaoDeIa } from '@/lib/ai/provedores-da-plataforma';
import { HttpError } from '@/lib/http-error';
import { executeStatement, queryRows, withTransaction } from '@/lib/mysql/pool';

import {
  conferirPropostas,
  type DadosDaRecomendacao,
  type Decisao,
  INSTRUCOES_DA_ATUALIZACAO,
  recomendacaoSchema,
  resultadoDaAtualizacaoSchema,
  tarefaDaAtualizacao,
  type TipoDeProposta,
} from './atualizacao';
import { DIAS_ENTRE_REVISOES, lerCatalogo } from './servico';

/**
 * Atualização dos exames médicos pelo modelo de IA (tarefa 211): pedido do
 * administrador, pesquisa nas fontes oficiais em segundo plano, propostas
 * pendentes e decisão do administrador. O catálogo só muda quando o
 * administrador aprova; aprovar uma retirada desativa o exame.
 */

/** Pesquisa mais longa que a padrão: todos os exames e os que faltam. */
export const PASSOS_DA_ATUALIZACAO = 24;
/** Uma atualização parada há mais tempo que isto é dada como interrompida. */
export const MINUTOS_ATE_INTERROMPER = 60;
/**
 * A conclusão traz as recomendações completas, e modelos que raciocinam
 * gastam parte da resposta pensando: 12 mil tokens de resposta mais cerca de
 * 14 mil de pedido (registro de 40 mil caracteres, instrução e catálogo)
 * cabem num contexto de 32 mil tokens.
 */
export const TOKENS_DA_ATUALIZACAO = 12_288;
export const REGISTRO_DA_ATUALIZACAO = 40_000;
const ROTULO = 'exames-medicos';

/** Resultado do modelo em JSON Schema, sem a chave `$schema`. */
const ESQUEMA_BASE: Record<string, unknown> = Object.fromEntries(
  Object.entries(
    z.toJSONSchema(resultadoDaAtualizacaoSchema, {
      io: 'input',
      unrepresentable: 'any',
    })
  ).filter(([chave]) => chave !== '$schema')
);

/**
 * Resultado imposto ao modelo na conclusão (saída estruturada): toda
 * `fonteUrl` só aceita as páginas que ele realmente leu nesta pesquisa. Sem
 * página lida, nenhuma proposta é possível.
 */
export function esquemaDoResultado(
  fontes: Array<{ url: string }>
): Record<string, unknown> {
  const lidas = [...new Set(fontes.map((f) => f.url))];
  const trocar = (no: unknown): unknown => {
    if (Array.isArray(no)) return no.map(trocar);
    if (!no || typeof no !== 'object') return no;
    return Object.fromEntries(
      Object.entries(no).map(([chave, valor]) => [
        chave,
        chave === 'fonteUrl' ? { type: 'string', enum: lidas } : trocar(valor),
      ])
    );
  };
  const esquema = trocar(ESQUEMA_BASE) as {
    properties: { propostas: Record<string, unknown> };
  };
  if (lidas.length === 0) {
    esquema.properties.propostas = { type: 'array', maxItems: 0 };
  }
  return esquema;
}

/** Páginas oficiais por onde o modelo começa, além das fontes do catálogo. */
export const PONTOS_DE_PARTIDA_OFICIAIS = [
  'https://www.gov.br/inca/pt-br/assuntos/gestor-e-profissional-de-saude',
  'https://www.gov.br/inca/pt-br/assuntos/cancer/tipos',
  'https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z',
  'https://diretriz.diabetes.org.br/',
];

function instante(valor: string | Date | null) {
  if (valor === null) return null;
  return valor instanceof Date
    ? valor.toISOString()
    : new Date(`${valor.replace(' ', 'T')}Z`).toISOString();
}

function json<T>(valor: unknown): T | null {
  if (valor === null || valor === undefined) return null;
  return (typeof valor === 'string' ? JSON.parse(valor) : valor) as T;
}

export interface Atualizacao {
  id: string;
  situacao: 'em-andamento' | 'concluida' | 'falhou';
  iniciadaEm: string;
  concluidaEm: string | null;
  mensagem: string | null;
  autor: string | null;
  fontes: Array<{ url: string; titulo: string }>;
  propostasNovas: number;
}

export interface Proposta {
  id: string;
  tipo: TipoDeProposta;
  recomendacaoId: string;
  dados: DadosDaRecomendacao | null;
  motivo: string;
  fonteNome: string;
  fonteUrl: string;
  criadaEm: string;
}

interface LinhaDaAtualizacao {
  id: string;
  situacao: Atualizacao['situacao'];
  iniciada_em: string | Date;
  concluida_em: string | Date | null;
  mensagem: string | null;
  autor: string | null;
  fontes: unknown;
  propostas_novas: number;
}

function daAtualizacao(linha: LinhaDaAtualizacao): Atualizacao {
  return {
    id: linha.id,
    situacao: linha.situacao,
    iniciadaEm: instante(linha.iniciada_em)!,
    concluidaEm: instante(linha.concluida_em),
    mensagem: linha.mensagem,
    autor: linha.autor,
    fontes: json<Atualizacao['fontes']>(linha.fontes) ?? [],
    propostasNovas: Number(linha.propostas_novas),
  };
}

/** Marca como falhas as atualizações paradas além do limite. */
async function encerrarInterrompidas() {
  await executeStatement(
    `UPDATE prevencao_atualizacoes
        SET situacao = 'falhou', concluida_em = CURRENT_TIMESTAMP(3),
            mensagem = 'A pesquisa foi interrompida antes de terminar (o servidor reiniciou ou o modelo não respondeu a tempo).'
      WHERE situacao = 'em-andamento'
        AND iniciada_em < CURRENT_TIMESTAMP(3) - INTERVAL ${MINUTOS_ATE_INTERROMPER} MINUTE`
  );
}

/**
 * Registra o pedido do administrador. Recusa um segundo pedido enquanto o
 * anterior ainda está em andamento.
 */
export async function iniciarAtualizacao(administrador: string) {
  await encerrarInterrompidas();
  return withTransaction(async (conexao) => {
    const [andamento] = await queryRows<{ id: string }>(
      `SELECT id FROM prevencao_atualizacoes
        WHERE situacao = 'em-andamento' LIMIT 1 FOR UPDATE`,
      [],
      conexao
    );
    if (andamento) {
      throw new HttpError(
        'Já existe uma atualização dos exames em andamento. Aguarde o término.',
        409
      );
    }
    const id = randomUUID();
    await executeStatement(
      'INSERT INTO prevencao_atualizacoes (id, iniciada_por) VALUES (?, ?)',
      [id, administrador],
      conexao
    );
    return id;
  });
}

async function lerDecisoes(): Promise<Decisao[]> {
  const linhas = await queryRows<{
    tipo: TipoDeProposta;
    recomendacao_id: string;
    dados: unknown;
    situacao: 'aprovada' | 'reprovada';
    assinatura: string;
    nome: string | null;
  }>(
    `SELECT p.tipo, p.recomendacao_id, p.dados, p.situacao, p.assinatura,
            r.nome
       FROM prevencao_propostas p
       LEFT JOIN prevencao_recomendacoes r ON r.id = p.recomendacao_id
      WHERE p.situacao <> 'pendente'
      ORDER BY p.decidida_em`
  );
  return linhas.map((linha) => ({
    tipo: linha.tipo,
    recomendacaoId: linha.recomendacao_id,
    nome:
      json<DadosDaRecomendacao>(linha.dados)?.nome ??
      linha.nome ??
      linha.recomendacao_id,
    situacao: linha.situacao,
    assinatura: linha.assinatura,
  }));
}

async function concluir(
  id: string,
  campos: {
    situacao: 'concluida' | 'falhou';
    mensagem: string;
    autor?: string | null;
    fontes?: Atualizacao['fontes'];
    propostasNovas?: number;
  }
) {
  await executeStatement(
    `UPDATE prevencao_atualizacoes
        SET situacao = ?, concluida_em = CURRENT_TIMESTAMP(3), mensagem = ?,
            autor = ?, fontes = ?, propostas_novas = ?
      WHERE id = ? AND situacao = 'em-andamento'`,
    [
      campos.situacao,
      campos.mensagem.slice(0, 600),
      campos.autor ?? null,
      campos.fontes ? JSON.stringify(campos.fontes) : null,
      campos.propostasNovas ?? 0,
      id,
    ]
  );
}

export interface DependenciasDaAtualizacao {
  cadeia?: EloDaCadeia[];
  acesso?: AcessoInternet;
  buscar?: typeof fetch;
  resolver?: Resolvedor;
  buscarModelo?: typeof fetch;
  env?: AmbienteDaBusca;
}

/**
 * Executa a pesquisa do modelo e grava as propostas conferidas. Nunca lança:
 * o resultado, bom ou ruim, fica na própria atualização para o administrador.
 */
export async function executarAtualizacao(
  id: string,
  dependencias: DependenciasDaAtualizacao = {}
) {
  try {
    const cadeia =
      dependencias.cadeia ?? montarCadeia(await lerConfiguracaoDeIa());
    if (!cadeiaTemModelo(cadeia)) {
      await concluir(id, {
        situacao: 'falhou',
        mensagem:
          'Nenhum modelo de IA está configurado. Configure um em Admin → Modelos de IA.',
      });
      return;
    }
    const acesso = dependencias.acesso ?? (await lerAcessoInternet());
    const catalogo = await lerCatalogo(false);
    const decisoes = await lerDecisoes();
    const pontosDePartida = [
      ...new Set([
        ...catalogo.filter((r) => r.ativo).map((r) => r.fonteUrl),
        ...PONTOS_DE_PARTIDA_OFICIAIS,
      ]),
    ];
    const pesquisa = await pesquisarNaInternet({
      cadeia,
      tarefa: tarefaDaAtualizacao(catalogo, decisoes),
      rotulo: ROTULO,
      instrucoes: INSTRUCOES_DA_ATUALIZACAO,
      acesso,
      pontosDePartida,
      maximoDePassos: PASSOS_DA_ATUALIZACAO,
      maximoDeTokens: TOKENS_DA_ATUALIZACAO,
      limiteDoRegistro: REGISTRO_DA_ATUALIZACAO,
      esquemaDoResultado,
      validarResultado: (resultado) => {
        const lido = resultadoDaAtualizacaoSchema.safeParse(resultado);
        return lido.success
          ? null
          : `resultado fora do formato: ${lido.error.issues
              .slice(0, 3)
              .map((i) => `${i.path.join('.')} ${i.message}`)
              .join('; ')}`;
      },
      registrar: registrarConsulta,
      buscar: dependencias.buscar,
      resolver: dependencias.resolver,
      buscarModelo: dependencias.buscarModelo,
      env: dependencias.env,
    });
    const resultado = resultadoDaAtualizacaoSchema.parse(pesquisa.resultado);
    const existentes = await queryRows<{ assinatura: string }>(
      'SELECT assinatura FROM prevencao_propostas'
    );
    const { aceitas, descartadas } = conferirPropostas(resultado, {
      catalogo,
      fontesLidas: pesquisa.fontes,
      assinaturasExistentes: new Set(existentes.map((e) => e.assinatura)),
      decisoes,
    });
    let gravadas = 0;
    for (const proposta of aceitas) {
      const gravada = await executeStatement(
        `INSERT IGNORE INTO prevencao_propostas
           (id, atualizacao_id, tipo, recomendacao_id, dados, motivo,
            fonte_nome, fonte_url, assinatura)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          id,
          proposta.tipo,
          proposta.recomendacaoId,
          proposta.dados ? JSON.stringify(proposta.dados) : null,
          proposta.motivo.slice(0, 1000),
          proposta.fonteNome.slice(0, 200),
          proposta.fonteUrl.slice(0, 400),
          proposta.assinatura,
        ]
      );
      gravadas += gravada.affectedRows;
    }
    const partes = [
      gravadas === 0
        ? 'Nenhum exame novo para revisar.'
        : `${gravadas} ${gravadas === 1 ? 'exame marcado' : 'exames marcados'} para revisão.`,
      `${pesquisa.fontes.length} ${pesquisa.fontes.length === 1 ? 'página oficial lida' : 'páginas oficiais lidas'}.`,
      descartadas.length
        ? `${descartadas.length} ${descartadas.length === 1 ? 'proposta descartada' : 'propostas descartadas'} na conferência (${[...new Set(descartadas.map((d) => d.motivo))].join('; ')}).`
        : '',
      resultado.resumo ? `Resumo do modelo: ${resultado.resumo}` : '',
    ];
    await concluir(id, {
      situacao: 'concluida',
      mensagem: partes.filter(Boolean).join(' '),
      autor: `${pesquisa.autor.provedor} · ${pesquisa.autor.modelo}`,
      fontes: pesquisa.fontes,
      propostasNovas: gravadas,
    });
  } catch (erro) {
    const mensagem =
      erro instanceof AcessoNegado
        ? `${erro.message} Ajuste em Admin → Configuração de IA → Acesso do modelo de IA à internet.`
        : erro instanceof Error
          ? `A pesquisa não terminou: ${erro.message}`
          : 'A pesquisa não terminou por um erro inesperado.';
    await concluir(id, { situacao: 'falhou', mensagem }).catch(() => undefined);
  }
}

/** Situação para a tela: última atualização e propostas pendentes. */
export async function situacaoDaAtualizacao(agora = new Date()) {
  await encerrarInterrompidas();
  const [ultima] = await queryRows<LinhaDaAtualizacao>(
    `SELECT id, situacao, iniciada_em, concluida_em, mensagem, autor, fontes,
            propostas_novas
       FROM prevencao_atualizacoes ORDER BY iniciada_em DESC LIMIT 1`
  );
  const pendentes = await queryRows<{
    id: string;
    tipo: TipoDeProposta;
    recomendacao_id: string;
    dados: unknown;
    motivo: string;
    fonte_nome: string;
    fonte_url: string;
    created_at: string | Date;
  }>(
    `SELECT id, tipo, recomendacao_id, dados, motivo, fonte_nome, fonte_url,
            created_at
       FROM prevencao_propostas
      WHERE situacao = 'pendente'
      ORDER BY created_at, recomendacao_id`
  );
  const [concluida] = await queryRows<{ concluida_em: string | Date }>(
    `SELECT concluida_em FROM prevencao_atualizacoes
      WHERE situacao = 'concluida' ORDER BY concluida_em DESC LIMIT 1`
  );
  const ultimaConcluida = concluida ? instante(concluida.concluida_em) : null;
  return {
    /** Sem atualização concluída nos últimos ${DIAS_ENTRE_REVISOES} dias. */
    mensalPendente:
      ultimaConcluida === null ||
      agora.getTime() - Date.parse(ultimaConcluida) >=
        DIAS_ENTRE_REVISOES * 86_400_000,
    ultima: ultima ? daAtualizacao(ultima) : null,
    pendentes: pendentes.map((linha): Proposta => ({
      id: linha.id,
      tipo: linha.tipo,
      recomendacaoId: linha.recomendacao_id,
      dados: json<DadosDaRecomendacao>(linha.dados),
      motivo: linha.motivo,
      fonteNome: linha.fonte_nome,
      fonteUrl: linha.fonte_url,
      criadaEm: instante(linha.created_at)!,
    })),
  };
}

async function proximaOrdem(conexao: Parameters<typeof queryRows>[2]) {
  const [linha] = await queryRows<{ ordem: number | null }>(
    'SELECT MAX(ordem) AS ordem FROM prevencao_recomendacoes',
    [],
    conexao
  );
  return Number(linha?.ordem ?? 0) + 10;
}

/**
 * Aprova ou reprova propostas pendentes (todas ou as indicadas). Aprovar
 * aplica a proposta ao catálogo do motor, conferida e revisada agora pelo
 * administrador. Proposta decidida não volta a ser apresentada.
 */
export async function decidirPropostas(
  ids: string[] | 'todas',
  decisao: 'aprovar' | 'reprovar',
  administrador: string
) {
  return withTransaction(async (conexao) => {
    const pendentes = await queryRows<{
      id: string;
      tipo: TipoDeProposta;
      recomendacao_id: string;
      dados: unknown;
    }>(
      `SELECT id, tipo, recomendacao_id, dados FROM prevencao_propostas
        WHERE situacao = 'pendente'
          ${ids === 'todas' ? '' : `AND id IN (${ids.map(() => '?').join(', ')})`}
        ORDER BY created_at FOR UPDATE`,
      ids === 'todas' ? [] : ids,
      conexao
    );
    if (ids !== 'todas' && pendentes.length !== ids.length) {
      throw new HttpError(
        'Alguma proposta não existe ou já foi decidida. Atualize a página.',
        409
      );
    }
    for (const proposta of pendentes) {
      if (decisao === 'aprovar') {
        if (proposta.tipo === 'retirar') {
          await executeStatement(
            `UPDATE prevencao_recomendacoes
                SET ativo = FALSE, conferido = TRUE,
                    revisado_em = CURRENT_TIMESTAMP(3), revisado_por = ?
              WHERE id = ?`,
            [administrador, proposta.recomendacao_id],
            conexao
          );
        } else {
          const dados = recomendacaoSchema.parse(json(proposta.dados));
          const valores = [
            dados.nome,
            dados.procura,
            dados.publico,
            dados.idadeMinima,
            dados.idadeMaxima,
            dados.intervaloMeses,
            dados.tipo,
            dados.orientacao,
            JSON.stringify(dados.historicoRelevante),
            dados.fonteNome,
            dados.fonteUrl,
          ];
          if (proposta.tipo === 'atualizar') {
            const alterado = await executeStatement(
              `UPDATE prevencao_recomendacoes
                  SET nome = ?, procura = ?, publico = ?, idade_minima = ?,
                      idade_maxima = ?, intervalo_meses = ?, tipo = ?,
                      orientacao = ?, historico_relevante = ?, fonte_nome = ?,
                      fonte_url = ?, conferido = TRUE,
                      revisado_em = CURRENT_TIMESTAMP(3), revisado_por = ?
                WHERE id = ?`,
              [...valores, administrador, proposta.recomendacao_id],
              conexao
            );
            if (alterado.affectedRows === 0) {
              throw new HttpError(
                `O exame ${proposta.recomendacao_id} não está mais no catálogo.`,
                409
              );
            }
          } else {
            const [existente] = await queryRows<{ id: string }>(
              'SELECT id FROM prevencao_recomendacoes WHERE id = ?',
              [proposta.recomendacao_id],
              conexao
            );
            if (existente) {
              throw new HttpError(
                `Já existe um exame com o identificador ${proposta.recomendacao_id}.`,
                409
              );
            }
            await executeStatement(
              `INSERT INTO prevencao_recomendacoes
                 (id, nome, procura, publico, idade_minima, idade_maxima,
                  intervalo_meses, tipo, orientacao, historico_relevante,
                  fonte_nome, fonte_url, conferido, revisado_em, revisado_por,
                  ativo, ordem)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE,
                       CURRENT_TIMESTAMP(3), ?, TRUE, ?)`,
              [
                proposta.recomendacao_id,
                ...valores,
                administrador,
                await proximaOrdem(conexao),
              ],
              conexao
            );
          }
        }
      }
      await executeStatement(
        `UPDATE prevencao_propostas
            SET situacao = ?, decidida_em = CURRENT_TIMESTAMP(3),
                decidida_por = ?
          WHERE id = ?`,
        [
          decisao === 'aprovar' ? 'aprovada' : 'reprovada',
          administrador,
          proposta.id,
        ],
        conexao
      );
    }
    return pendentes.length;
  });
}
