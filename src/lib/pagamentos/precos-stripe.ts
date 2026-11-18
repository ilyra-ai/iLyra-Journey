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

/** Linha da tela: o plano do catálogo e os ids dele neste ambiente. */
export interface PrecoDoPlanoNaStripe extends PrecosDoPlanoNaStripe {
  plano: PlanKey;
  nome: string;
  valorMensal: number;
  valorAnual: number;
  moeda: string;
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

/** Planos pagos com os ids da Stripe do ambiente (vazios quando faltam). */
export async function listarPrecosDaStripe(
  ambiente: AmbienteDaStripe
): Promise<PrecoDoPlanoNaStripe[]> {
  const linhas = await linhasDosPrecos(ambiente);
  return linhas.map((linha) => ({
    plano: linha.plan_key,
    nome: linha.name,
    valorMensal: Number(linha.monthly_price),
    valorAnual: Number(linha.annual_price),
    moeda: linha.currency_code,
    produto: linha.product_id,
    mensal: linha.monthly_price_id,
    anual: linha.annual_price_id,
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
    try {
      if (!produto && !mensal && !anual) {
        await executar(
          'DELETE FROM stripe_plan_prices WHERE plan_id = ? AND environment = ?',
          [planId, ambiente]
        );
        continue;
      }
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
    for (const [ciclo, precoId, valor, intervalo] of [
      ['mensal', plano.mensal, plano.valorMensal, 'month'],
      ['anual', plano.anual, plano.valorAnual, 'year'],
    ] as const) {
      if (!precoId) continue;
      conferidos += 1;
      const rotulo = `${plano.nome} ${ciclo}`;
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
