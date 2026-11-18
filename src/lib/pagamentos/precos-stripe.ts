import { HttpError } from '@/lib/http-error';
import { executeStatement, queryRows } from '@/lib/mysql/pool';
import type { PlanKey } from '@/types/subscription';

import type { PrecosInformados } from './formatos';
import { chamarProvedor, textoDe } from './http';

/**
 * Produto e preços de cada plano pago na Stripe, por ambiente (tabela
 * `stripe_plan_prices`, migração 029). O price id de teste não existe na conta
 * de produção e vice-versa: o checkout usa os preços do ambiente em uso e o
 * webhook descobre o plano pelo preço pago, em qualquer ambiente.
 */

export type AmbienteDaStripe = 'test' | 'live';

export interface PrecosDoPlanoNaStripe {
  produto: string | null;
  mensal: string | null;
  anual: string | null;
}

/**
 * Valor de colaboração de um plano (tarefa 226) e o preço mensal recorrente
 * dele na Stripe neste ambiente. Com valores, o plano não usa os preços
 * mensal e anual próprios: cada valor tem o seu.
 */
export interface PrecoDaOpcaoNaStripe {
  opcao: string;
  valorMensal: number;
  mensal: string | null;
}

/** Linha da tela: o plano do catálogo e os ids dele neste ambiente. */
export interface PrecoDoPlanoNaStripe extends PrecosDoPlanoNaStripe {
  plano: PlanKey;
  nome: string;
  valorMensal: number;
  valorAnual: number;
  moeda: string;
  opcoes: PrecoDaOpcaoNaStripe[];
}

interface LinhaDoPreco {
  plan_id: string;
  plan_key: PlanKey;
  name: string;
  monthly_price: number | string;
  annual_price: number | string;
  currency_code: string;
  product_id: string | null;
  monthly_price_id: string | null;
  annual_price_id: string | null;
}

async function linhasDosPrecos(ambiente: AmbienteDaStripe) {
  return queryRows<LinhaDoPreco>(
    `SELECT p.id AS plan_id, p.plan_key, p.name, p.monthly_price,
            p.annual_price, p.currency_code, s.product_id,
            s.monthly_price_id, s.annual_price_id
       FROM subscription_plans p
       LEFT JOIN stripe_plan_prices s
         ON s.plan_id = p.id AND s.environment = ?
      WHERE p.plan_key IN ('meta', 'care') AND p.is_active = TRUE
      ORDER BY p.display_order ASC`,
    [ambiente]
  );
}

interface LinhaDaOpcao {
  option_id: string;
  plan_id: string;
  option_key: string;
  monthly_price: number | string;
  monthly_price_id: string | null;
}

async function linhasDasOpcoes(ambiente: AmbienteDaStripe) {
  return queryRows<LinhaDaOpcao>(
    `SELECT o.id AS option_id, o.plan_id, o.option_key, o.monthly_price,
            c.monthly_price_id
       FROM plan_contribution_options o
       LEFT JOIN stripe_contribution_prices c
         ON c.option_id = o.id AND c.environment = ?
      WHERE o.is_active = TRUE
      ORDER BY o.display_order ASC, o.monthly_price ASC`,
    [ambiente]
  );
}

/**
 * Preço mensal da Stripe de cada valor de colaboração ativo, por id do plano
 * (planos sem valores ficam de fora). `mensal` é nulo quando o valor ainda
 * não tem preço neste ambiente.
 */
export async function precosDasOpcoesNaStripe(
  ambiente: AmbienteDaStripe
): Promise<Map<string, PrecoDaOpcaoNaStripe[]>> {
  const porPlano = new Map<string, PrecoDaOpcaoNaStripe[]>();
  for (const linha of await linhasDasOpcoes(ambiente)) {
    const lista = porPlano.get(linha.plan_id) ?? [];
    lista.push({
      opcao: linha.option_key,
      valorMensal: Number(linha.monthly_price),
      mensal: linha.monthly_price_id,
    });
    porPlano.set(linha.plan_id, lista);
  }
  return porPlano;
}

/** Planos pagos com os ids da Stripe do ambiente (vazios quando faltam). */
export async function listarPrecosDaStripe(
  ambiente: AmbienteDaStripe
): Promise<PrecoDoPlanoNaStripe[]> {
  const [linhas, opcoes] = await Promise.all([
    linhasDosPrecos(ambiente),
    precosDasOpcoesNaStripe(ambiente),
  ]);
  return linhas.map((linha) => ({
    plano: linha.plan_key,
    nome: linha.name,
    valorMensal: Number(linha.monthly_price),
    valorAnual: Number(linha.annual_price),
    moeda: linha.currency_code,
    produto: linha.product_id,
    mensal: linha.monthly_price_id,
    anual: linha.annual_price_id,
    opcoes: opcoes.get(linha.plan_id) ?? [],
  }));
}

/** Preços do ambiente por id do plano (planos sem linha ficam de fora). */
export async function mapaDePrecosDaStripe(
  ambiente: AmbienteDaStripe
): Promise<Map<string, PrecosDoPlanoNaStripe>> {
  const linhas = await queryRows<{
    plan_id: string;
    product_id: string | null;
    monthly_price_id: string | null;
    annual_price_id: string | null;
  }>(
    `SELECT plan_id, product_id, monthly_price_id, annual_price_id
       FROM stripe_plan_prices
      WHERE environment = ?`,
    [ambiente]
  );
  return new Map(
    linhas.map((linha) => [
      linha.plan_id,
      {
        produto: linha.product_id,
        mensal: linha.monthly_price_id,
        anual: linha.annual_price_id,
      },
    ])
  );
}

/** O plano e o ambiente de um price id recebido da Stripe. */
export async function planoPeloPrecoDaStripe(
  precoId: string
): Promise<{ planId: string; ambiente: AmbienteDaStripe } | null> {
  const [linha] = await queryRows<{
    plan_id: string;
    environment: AmbienteDaStripe;
  }>(
    `SELECT plan_id, environment
       FROM stripe_plan_prices
      WHERE monthly_price_id = ? OR annual_price_id = ?
      LIMIT 1`,
    [precoId, precoId]
  );
  return linha ? { planId: linha.plan_id, ambiente: linha.environment } : null;
}

function limpo(valor: string | null | undefined) {
  const texto = valor?.trim();
  return texto ? texto : null;
}

/**
 * Grava os ids do ambiente. Plano com os três campos vazios perde a linha;
 * plano que não veio na lista fica como está. Plano desconhecido ou o Free
 * (que não tem cobrança) é recusado.
 */
export async function salvarPrecosDaStripe(
  ambiente: AmbienteDaStripe,
  precos: PrecosInformados[],
  usuarioId: string
): Promise<void> {
  if (precos.length === 0) return;
  const planos = await queryRows<{ id: string; plan_key: string }>(
    "SELECT id, plan_key FROM subscription_plans WHERE plan_key IN ('meta', 'care')"
  );
  const idDoPlano = new Map(planos.map((p) => [p.plan_key, p.id]));
  const executar = (sql: string, parametros: unknown[]) =>
    executeStatement(sql, parametros);

  for (const preco of precos) {
    const planId = idDoPlano.get(preco.plano);
    if (!planId) {
      throw new HttpError(
        `O plano "${preco.plano}" não existe ou não tem cobrança.`,
        400
      );
    }
    const produto = limpo(preco.produto);
    const mensal = limpo(preco.mensal);
    const anual = limpo(preco.anual);
    await recusarPrecoDeOutraTabela(
      [mensal, anual].filter((id): id is string => Boolean(id)),
      'opcoes',
      preco.plano
    );
    try {
      // Sem produto nem preços próprios, a linha do plano sai; os preços dos
      // valores de colaboração (abaixo) são gravados do mesmo jeito.
      if (!produto && !mensal && !anual) {
        await executar(
          'DELETE FROM stripe_plan_prices WHERE plan_id = ? AND environment = ?',
          [planId, ambiente]
        );
      } else
        await executar(
          `INSERT INTO stripe_plan_prices (
           plan_id, environment, product_id, monthly_price_id,
           annual_price_id, updated_by
         ) VALUES (?, ?, ?, ?, ?, ?) AS novo
         ON DUPLICATE KEY UPDATE
           product_id = novo.product_id,
           monthly_price_id = novo.monthly_price_id,
           annual_price_id = novo.annual_price_id,
           updated_by = novo.updated_by`,
          [planId, ambiente, produto, mensal, anual, usuarioId]
        );
    } catch (erro) {
      if ((erro as { code?: string }).code === 'ER_DUP_ENTRY') {
        throw new HttpError(
          `Um dos preços do plano "${preco.plano}" já está cadastrado em outro plano ou ambiente; cada plano e ciclo usa um preço próprio.`,
          409
        );
      }
      throw erro;
    }
    if (preco.opcoes && preco.opcoes.length > 0) {
      await salvarPrecosDasOpcoes(
        ambiente,
        planId,
        preco.plano,
        preco.opcoes,
        usuarioId
      );
    }
  }
}

/**
 * O webhook descobre o plano pelo preço pago: um mesmo price id não pode
 * estar ao mesmo tempo nos preços do plano e nos valores de colaboração.
 */
async function recusarPrecoDeOutraTabela(
  ids: string[],
  outra: 'planos' | 'opcoes',
  plano: string
) {
  if (ids.length === 0) return;
  const marcadores = ids.map(() => '?').join(', ');
  const repetidos = await queryRows<{ id: string }>(
    outra === 'opcoes'
      ? `SELECT monthly_price_id AS id FROM stripe_contribution_prices
          WHERE monthly_price_id IN (${marcadores}) LIMIT 1`
      : `SELECT monthly_price_id AS id FROM stripe_plan_prices
          WHERE monthly_price_id IN (${marcadores})
         UNION
         SELECT annual_price_id FROM stripe_plan_prices
          WHERE annual_price_id IN (${marcadores})
         LIMIT 1`,
    outra === 'opcoes' ? ids : [...ids, ...ids]
  );
  if (repetidos.length > 0) {
    throw new HttpError(
      `O preço ${repetidos[0].id} do plano "${plano}" já está cadastrado ${outra === 'opcoes' ? 'em um valor de colaboração' : 'como preço de um plano'}; cada plano, ciclo e valor usa um preço próprio.`,
      409
    );
  }
}

async function salvarPrecosDasOpcoes(
  ambiente: AmbienteDaStripe,
  planId: string,
  plano: string,
  opcoes: NonNullable<PrecosInformados['opcoes']>,
  usuarioId: string
) {
  const existentes = await queryRows<{ id: string; option_key: string }>(
    'SELECT id, option_key FROM plan_contribution_options WHERE plan_id = ? AND is_active = TRUE',
    [planId]
  );
  const idDaOpcao = new Map(existentes.map((o) => [o.option_key, o.id]));
  for (const opcao of opcoes) {
    const optionId = idDaOpcao.get(opcao.opcao);
    if (!optionId) {
      throw new HttpError(
        `O plano "${plano}" não tem o valor de colaboração "${opcao.opcao}".`,
        400
      );
    }
    const mensal = limpo(opcao.mensal);
    if (!mensal) {
      await executeStatement(
        'DELETE FROM stripe_contribution_prices WHERE option_id = ? AND environment = ?',
        [optionId, ambiente]
      );
      continue;
    }
    await recusarPrecoDeOutraTabela([mensal], 'planos', plano);
    try {
      await executeStatement(
        `INSERT INTO stripe_contribution_prices (
           option_id, environment, monthly_price_id, updated_by
         ) VALUES (?, ?, ?, ?) AS novo
         ON DUPLICATE KEY UPDATE
           monthly_price_id = novo.monthly_price_id,
           updated_by = novo.updated_by`,
        [optionId, ambiente, mensal, usuarioId]
      );
    } catch (erro) {
      if ((erro as { code?: string }).code === 'ER_DUP_ENTRY') {
        throw new HttpError(
          `O preço ${mensal} do plano "${plano}" já está cadastrado em outro valor ou ambiente; cada valor de colaboração usa um preço próprio.`,
          409
        );
      }
      throw erro;
    }
  }
}

// Moedas sem centavos na Stripe (unit_amount já é o valor inteiro).
const MOEDAS_SEM_CENTAVOS = new Set([
  'bif',
  'clp',
  'djf',
  'gnf',
  'jpy',
  'kmf',
  'krw',
  'mga',
  'pyg',
  'rwf',
  'ugx',
  'vnd',
  'vuv',
  'xaf',
  'xof',
  'xpf',
]);

function emCentavos(valor: number, moeda: string) {
  return MOEDAS_SEM_CENTAVOS.has(moeda.toLowerCase())
    ? Math.round(valor)
    : Math.round(valor * 100);
}

const formatoDoValor = (valor: number, moeda: string) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: moeda.toUpperCase(),
  }).format(valor);

/**
 * Confere na Stripe cada preço cadastrado no ambiente: existe nesta conta e
 * neste ambiente, está ativo, é recorrente no ciclo certo, na moeda e no
 * valor do catálogo e pertence ao produto informado. Devolve os problemas
 * em português e quantos preços foram conferidos.
 */
export async function conferirPrecosNaStripe(
  chaveSecreta: string,
  ambiente: AmbienteDaStripe
): Promise<{ conferidos: number; problemas: string[] }> {
  const planos = await listarPrecosDaStripe(ambiente);
  const problemas: string[] = [];
  let conferidos = 0;
  for (const plano of planos) {
    // Cada valor de colaboração é um preço mensal recorrente próprio.
    const itens: Array<{
      rotulo: string;
      ciclo: 'mensal' | 'anual';
      precoId: string | null;
      valor: number;
      intervalo: 'month' | 'year';
    }> = [
      {
        rotulo: `${plano.nome} mensal`,
        ciclo: 'mensal',
        precoId: plano.mensal,
        valor: plano.valorMensal,
        intervalo: 'month',
      },
      {
        rotulo: `${plano.nome} anual`,
        ciclo: 'anual',
        precoId: plano.anual,
        valor: plano.valorAnual,
        intervalo: 'year',
      },
      ...plano.opcoes.map((opcao) => ({
        rotulo: `${plano.nome} ${formatoDoValor(opcao.valorMensal, plano.moeda)} por mês`,
        ciclo: 'mensal' as const,
        precoId: opcao.mensal,
        valor: opcao.valorMensal,
        intervalo: 'month' as const,
      })),
    ];
    for (const { rotulo, ciclo, precoId, valor, intervalo } of itens) {
      if (!precoId) continue;
      conferidos += 1;
      const { status, corpo } = await chamarProvedor(
        `https://api.stripe.com/v1/prices/${encodeURIComponent(precoId)}`,
        { headers: { Authorization: `Bearer ${chaveSecreta}` } }
      );
      if (status === 404) {
        problemas.push(
          `${rotulo}: o preço ${precoId} não existe nesta conta da Stripe no ambiente de ${ambiente === 'live' ? 'produção' : 'teste'}.`
        );
        continue;
      }
      if (status !== 200 || !corpo) {
        const erro = (corpo?.error ?? null) as Record<string, unknown> | null;
        problemas.push(
          status === 403
            ? `${rotulo}: a chave não tem permissão para ler preços (libere "Prices: Read" na chave restrita).`
            : `${rotulo}: a Stripe respondeu ${status} (${textoDe(erro?.message) ?? 'erro desconhecido'}).`
        );
        continue;
      }
      const recorrencia = (corpo.recurring ?? null) as Record<
        string,
        unknown
      > | null;
      if (corpo.livemode !== (ambiente === 'live')) {
        problemas.push(
          `${rotulo}: o preço é do ambiente de ${corpo.livemode ? 'produção' : 'teste'}.`
        );
      }
      if (corpo.active !== true) {
        problemas.push(`${rotulo}: o preço está arquivado na Stripe.`);
      }
      if (recorrencia?.interval !== intervalo) {
        problemas.push(
          `${rotulo}: o preço não é uma assinatura ${ciclo === 'mensal' ? 'mensal' : 'anual'}.`
        );
      }
      const moeda = textoDe(corpo.currency) ?? '';
      if (moeda.toLowerCase() !== plano.moeda.toLowerCase()) {
        problemas.push(
          `${rotulo}: a moeda na Stripe é ${moeda.toUpperCase() || '—'} e a do catálogo é ${plano.moeda.toUpperCase()}.`
        );
      } else if (corpo.unit_amount !== emCentavos(valor, plano.moeda)) {
        const naStripe =
          typeof corpo.unit_amount === 'number'
            ? formatoDoValor(
                MOEDAS_SEM_CENTAVOS.has(moeda.toLowerCase())
                  ? corpo.unit_amount
                  : corpo.unit_amount / 100,
                moeda
              )
            : '—';
        problemas.push(
          `${rotulo}: a Stripe cobra ${naStripe} e o catálogo diz ${formatoDoValor(valor, plano.moeda)}.`
        );
      }
      if (plano.produto && textoDe(corpo.product) !== plano.produto) {
        problemas.push(
          `${rotulo}: o preço pertence a outro produto (${textoDe(corpo.product) ?? '—'}), não a ${plano.produto}.`
        );
      }
    }
  }
  return { conferidos, problemas };
}
