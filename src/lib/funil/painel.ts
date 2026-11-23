import { z } from 'zod';

import { resumoDoUso } from '@/lib/ai/uso-servico';
import { queryRows } from '@/lib/mysql/pool';

import {
  diaDoFunil,
  ETAPAS_DO_FUNIL,
  NOMES_DAS_ETAPAS,
  type EtapaDoFunil,
} from './etapas';

/**
 * Painel do funil (tarefa 170). Duas fontes, sem misturar:
 * - as etapas anônimas contadas por dia (funil_contagens_diarias);
 * - os fatos que o banco já registra: contas criadas, pagamentos confirmados
 *   pelo webhook da Stripe, assinaturas, cancelamentos, retorno das contas e
 *   o custo de IA. Esses números não dependem do funil e batem com as
 *   tabelas de cobrança.
 * Sem dado, o painel mostra zero ou "sem dados", nunca um número estimado.
 */

/** Muda quando o significado de um número do painel muda (tarefa 185). */
export const VERSAO_DO_PAINEL = 2;

/**
 * Abaixo disso a porcentagem não aparece: com poucas pessoas ela engana e
 * pode apontar alguém (tarefa 185).
 */
export const COORTE_MINIMA = 10;

export const PERIODOS_DO_PAINEL = [7, 30, 90] as const;

/** Produção ou teste da Stripe, pelo `livemode` de cada evento. */
export const esquemaDoAmbiente = z.enum(['live', 'test']);
export type AmbienteDoPainel = z.infer<typeof esquemaDoAmbiente>;
export const esquemaDoPeriodo = z.coerce
  .number()
  .refine((n) => (PERIODOS_DO_PAINEL as readonly number[]).includes(n), {
    message: 'Período inválido.',
  });

export interface EtapaNoPainel {
  etapa: EtapaDoFunil;
  rotulo: string;
  total: number;
  detalhes: { detalhe: string; total: number }[];
}

export interface Taxa {
  rotulo: string;
  numerador: number;
  denominador: number;
  /** `null` sem denominador ou com amostra abaixo da coorte mínima. */
  valor: number | null;
  amostraPequena: boolean;
}

export interface Valor {
  moeda: string;
  /** Na unidade da moeda (reais, não centavos). */
  total: number;
}

export interface PainelDoFunil {
  versao: number;
  ambiente: AmbienteDoPainel;
  coorteMinima: number;
  periodo: { dias: number; de: string; ate: string };
  etapas: EtapaNoPainel[];
  taxas: Taxa[];
  fatos: {
    contasCriadas: number;
    pagamentosConfirmados: number;
    faturasPagas: number;
    cancelamentos: number;
    assinaturasAtivas: number;
    contribuicoes: { opcao: string; assinaturas: number }[];
  };
  faturamento: {
    receita: Valor[];
    reembolsos: number;
    reembolsado: Valor[];
  };
  retencao: {
    d7: { coorte: number; retornaram: number };
    d30: { coorte: number; retornaram: number };
  };
  custoDeIa: {
    mes: string;
    chamadas: number;
    chamadasSemPreco: number;
    porMoeda: { moeda: string; total: number; porAssinante: number | null }[];
  };
}

const UM_DIA = 24 * 60 * 60 * 1000;
/** Brasília está em UTC−3 o ano todo desde 2019. */
const BRASILIA = '-03:00';

function inicioDoDia(dia: string) {
  return new Date(`${dia}T00:00:00${BRASILIA}`);
}

export function intervaloDoPeriodo(dias: number, agora = new Date()) {
  const ate = diaDoFunil(agora);
  const de = diaDoFunil(
    new Date(inicioDoDia(ate).getTime() - (dias - 1) * UM_DIA)
  );
  return {
    de,
    ate,
    inicio: inicioDoDia(de),
    fim: new Date(inicioDoDia(ate).getTime() + UM_DIA),
  };
}

export function taxa(
  rotulo: string,
  numerador: number,
  denominador: number
): Taxa {
  return {
    rotulo,
    numerador,
    denominador,
    valor: denominador >= COORTE_MINIMA ? numerador / denominador : null,
    amostraPequena: denominador > 0 && denominador < COORTE_MINIMA,
  };
}

const numero = (valor: unknown) => Number(valor ?? 0);

async function contagensDasEtapas(de: string, ate: string) {
  const linhas = await queryRows<{
    etapa: string;
    detalhe: string;
    total: string;
  }>(
    `SELECT etapa, detalhe, SUM(total) AS total
       FROM funil_contagens_diarias
      WHERE dia BETWEEN ? AND ?
      GROUP BY etapa, detalhe`,
    [de, ate]
  );
  return NOMES_DAS_ETAPAS.map((etapa): EtapaNoPainel => {
    const daEtapa = linhas.filter((l) => l.etapa === etapa);
    const detalhes = daEtapa
      .filter((l) => l.detalhe !== '')
      .map((l) => ({ detalhe: l.detalhe, total: numero(l.total) }))
      .sort((a, b) => b.total - a.total);
    return {
      etapa,
      rotulo: ETAPAS_DO_FUNIL[etapa].rotulo,
      total: daEtapa.reduce((soma, l) => soma + numero(l.total), 0),
      detalhes,
    };
  });
}

async function contar(sql: string, parametros: unknown[]) {
  const [linha] = await queryRows<{ total: string | number }>(sql, parametros);
  return numero(linha?.total);
}

/** Eventos da Stripe do ambiente escolhido, pelo `livemode` gravado. */
const DO_AMBIENTE = `JSON_UNQUOTE(JSON_EXTRACT(payload, '$.livemode')) = ?`;
/** Assinatura do ambiente escolhido, pelo cliente de cobrança dela. */
const ASSINATURA_DO_AMBIENTE = `EXISTS (
  SELECT 1 FROM billing_customers bc
   WHERE bc.provider = 'stripe' AND bc.environment = ?
     AND bc.external_customer_id = s.external_customer_id)`;

async function fatosDoPeriodo(
  inicio: Date,
  fim: Date,
  ambiente: AmbienteDoPainel
) {
  const livemode = ambiente === 'live' ? 'true' : 'false';
  const [
    contasCriadas,
    pagamentosConfirmados,
    faturasPagas,
    cancelamentos,
    assinaturasAtivas,
    contribuicoes,
  ] = await Promise.all([
    contar(
      `SELECT COUNT(*) AS total
         FROM users u INNER JOIN profiles p ON p.id = u.id
        WHERE p.role = 'patient' AND u.created_at >= ? AND u.created_at < ?`,
      [inicio, fim]
    ),
    contar(
      `SELECT COUNT(*) AS total FROM billing_webhook_events
        WHERE provider = 'stripe' AND status = 'processed'
          AND event_type = 'checkout.session.completed'
          AND ${DO_AMBIENTE}
          AND created_at >= ? AND created_at < ?`,
      [livemode, inicio, fim]
    ),
    contar(
      `SELECT COUNT(*) AS total FROM billing_webhook_events
        WHERE provider = 'stripe' AND status = 'processed'
          AND event_type = 'invoice.paid'
          AND ${DO_AMBIENTE}
          AND created_at >= ? AND created_at < ?`,
      [livemode, inicio, fim]
    ),
    contar(
      `SELECT COUNT(*) AS total FROM user_subscriptions s
        WHERE s.source = 'stripe' AND ${ASSINATURA_DO_AMBIENTE}
          AND s.canceled_at >= ? AND s.canceled_at < ?`,
      [ambiente, inicio, fim]
    ),
    contar(
      `SELECT COUNT(*) AS total FROM user_subscriptions s
        WHERE s.source = 'stripe' AND s.status = 'active'
          AND ${ASSINATURA_DO_AMBIENTE}`,
      [ambiente]
    ),
    queryRows<{ opcao: string | null; assinaturas: string }>(
      `SELECT o.option_key AS opcao, COUNT(*) AS assinaturas
         FROM user_subscriptions s
         LEFT JOIN stripe_contribution_prices c
           ON c.monthly_price_id = s.external_price_id
         LEFT JOIN plan_contribution_options o ON o.id = c.option_id
        WHERE s.source = 'stripe' AND s.status = 'active'
          AND ${ASSINATURA_DO_AMBIENTE}
        GROUP BY o.option_key
        ORDER BY assinaturas DESC`,
      [ambiente]
    ),
  ]);
  return {
    contasCriadas,
    pagamentosConfirmados,
    faturasPagas,
    cancelamentos,
    assinaturasAtivas,
    contribuicoes: contribuicoes.map((c) => ({
      // Assinatura com preço fora das opções de contribuição (plano antigo
      // ou preço cadastrado só na Stripe).
      opcao: c.opcao ?? 'outro_preco',
      assinaturas: numero(c.assinaturas),
    })),
  };
}

/**
 * Retorno das contas (D7/D30): entre as contas de pessoas criadas nos
 * últimos 90 dias que já têm pelo menos 7 (ou 30) dias, quantas voltaram a
 * conversar com a Lyra a partir do 7º (ou 30º) dia. A conversa é o uso
 * registrado no banco; nenhuma visita nova é rastreada para isso.
 */
async function retornoDasContas(agora: Date, dias: 7 | 30) {
  const limite = new Date(agora.getTime() - dias * UM_DIA);
  const desde = new Date(agora.getTime() - 90 * UM_DIA);
  const [linha] = await queryRows<{ coorte: string; retornaram: string }>(
    `SELECT COUNT(*) AS coorte,
            COALESCE(SUM(EXISTS (
              SELECT 1 FROM chat_turns t
               WHERE t.user_id = u.id
                 AND t.created_at >= DATE_ADD(u.created_at, INTERVAL ? DAY)
            )), 0) AS retornaram
       FROM users u INNER JOIN profiles p ON p.id = u.id
      WHERE p.role = 'patient' AND u.created_at >= ? AND u.created_at <= ?`,
    [dias, desde, limite]
  );
  return {
    coorte: numero(linha?.coorte),
    retornaram: numero(linha?.retornaram),
  };
}

/**
 * Receita e reembolsos do período (tarefa 185), somados dos eventos da
 * Stripe já processados: faturas pagas (`amount_paid`) e cobranças
 * reembolsadas (`amount_refunded`), em centavos da moeda de cada evento.
 * O evento fica uma vez só (chave única do provedor), então não há soma
 * duplicada por reenvio do webhook.
 */
async function faturamentoDoPeriodo(
  inicio: Date,
  fim: Date,
  ambiente: AmbienteDoPainel
) {
  const livemode = ambiente === 'live' ? 'true' : 'false';
  const somar = (tipo: string, campo: string) =>
    queryRows<{
      moeda: string | null;
      centavos: string | null;
      eventos: string;
    }>(
      `SELECT UPPER(JSON_UNQUOTE(JSON_EXTRACT(payload, '$.data.object.currency'))) AS moeda,
              SUM(CAST(JSON_EXTRACT(payload, '$.data.object.${campo}') AS UNSIGNED)) AS centavos,
              COUNT(*) AS eventos
         FROM billing_webhook_events
        WHERE provider = 'stripe' AND status = 'processed'
          AND event_type = ? AND ${DO_AMBIENTE}
          AND created_at >= ? AND created_at < ?
        GROUP BY moeda`,
      [tipo, livemode, inicio, fim]
    );
  const [pagas, reembolsadas] = await Promise.all([
    somar('invoice.paid', 'amount_paid'),
    somar('charge.refunded', 'amount_refunded'),
  ]);
  const valores = (linhas: typeof pagas): Valor[] =>
    linhas
      .filter((l) => l.moeda)
      .map((l) => ({ moeda: l.moeda!, total: numero(l.centavos) / 100 }));
  return {
    receita: valores(pagas),
    reembolsos: reembolsadas.reduce((soma, l) => soma + numero(l.eventos), 0),
    reembolsado: valores(reembolsadas),
  };
}

async function custoDoMes(agora: Date, assinaturasAtivas: number) {
  const mes = diaDoFunil(agora).slice(0, 7);
  const linhas = await resumoDoUso(mes);
  const porMoeda = new Map<string, number>();
  let chamadasSemPreco = 0;
  for (const linha of linhas) {
    if (linha.custo === null || !linha.moeda) {
      // Modelos locais não têm custo por token; só a nuvem sem preço conta.
      if (!linha.local) chamadasSemPreco += linha.chamadas;
      continue;
    }
    porMoeda.set(linha.moeda, (porMoeda.get(linha.moeda) ?? 0) + linha.custo);
  }
  return {
    mes,
    chamadas: linhas.reduce((soma, l) => soma + l.chamadas, 0),
    chamadasSemPreco,
    porMoeda: [...porMoeda].map(([moeda, total]) => ({
      moeda,
      total,
      porAssinante: assinaturasAtivas > 0 ? total / assinaturasAtivas : null,
    })),
  };
}

export async function painelDoFunil(
  dias: number,
  ambiente: AmbienteDoPainel = 'live',
  agora = new Date()
): Promise<PainelDoFunil> {
  const { de, ate, inicio, fim } = intervaloDoPeriodo(dias, agora);
  const [etapas, fatos, faturamento, d7, d30] = await Promise.all([
    contagensDasEtapas(de, ate),
    fatosDoPeriodo(inicio, fim, ambiente),
    faturamentoDoPeriodo(inicio, fim, ambiente),
    retornoDasContas(agora, 7),
    retornoDasContas(agora, 30),
  ]);
  const total = (etapa: EtapaDoFunil) =>
    etapas.find((e) => e.etapa === etapa)?.total ?? 0;
  return {
    versao: VERSAO_DO_PAINEL,
    ambiente,
    coorteMinima: COORTE_MINIMA,
    periodo: { dias, de, ate },
    etapas,
    taxas: [
      taxa(
        'Abriram o Experimente Grátis, por visita',
        total('iniciou_descoberta'),
        total('visita_landing')
      ),
      taxa(
        'Receberam a leitura, por abertura',
        total('leitura_entregue'),
        total('iniciou_descoberta')
      ),
      taxa(
        'Escolheram uma contribuição, por convite exibido',
        total('contribuicao_escolhida'),
        total('modal_visto')
      ),
      taxa(
        'Concluíram o cadastro, por login iniciado',
        total('cadastro_concluido'),
        total('login_iniciado')
      ),
      taxa(
        'Pagamento confirmado pela Stripe, por pagamento iniciado',
        fatos.pagamentosConfirmados,
        total('checkout_iniciado')
      ),
    ],
    fatos,
    faturamento,
    retencao: { d7, d30 },
    custoDeIa: await custoDoMes(agora, fatos.assinaturasAtivas),
  };
}
