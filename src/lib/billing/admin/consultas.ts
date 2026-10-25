import { queryRows, withTransaction } from '@/lib/mysql/pool';
import { credenciaisDoStripe } from '@/lib/pagamentos/credenciais';
import type { FiltrosFaturamento } from './filtros';
import { faturaLocal } from './provedor';
import { listarOperacoes } from './operacoes';
import type { ReembolsoFinanceiro } from './espelhos';

export interface ResumoDeFaturamento {
  ambiente: string;
  provedor: string;
  moeda: string | null;
  faturas: number;
  valorNominal: string | null;
  valorQuitado: string | null;
  quitadas: number;
  rascunhos: number;
  abertas: number;
  inadimplentes: number;
  canceladas: number;
  excluidas: number;
  vencidas: number;
  saldoAberto: string | null;
  semValorPago: number;
  semValorTotal: number;
  pendentesConciliacao: number;
}
export interface ResumoDeReembolsos {
  ambiente: string;
  provedor: string;
  moeda: string | null;
  total: number;
  concluidos: number;
  pendentes: number;
  falhos: number;
  cancelados: number;
  semVinculo: number;
  semValor: number;
  valorConcluido: string | null;
  valorPendente: string | null;
}
export interface FaturaListada {
  id: string;
  ambiente: string;
  provedor: string;
  externa: string;
  numero: string | null;
  moeda: string | null;
  estado: string;
  total: string | null;
  pago: string | null;
  referencia: string | null;
  criada: string | null;
  quitada: string | null;
  legado: number;
  needs_reconciliation: number;
}
export interface PontoFinanceiro {
  data: string;
  ambiente: string;
  provedor: string;
  moeda: string | null;
  faturas: number;
  nominal: string | null;
  quitado: string | null;
  reembolsado: string | null;
}
interface Run {
  id: string;
  environment: string;
  stage: string;
  provider_cursor: string | null;
  provider_account_id: string;
  imported_invoices: number;
  imported_payments: number;
  imported_refunds: number;
  imported_balances: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  error_code: string | null;
}
export interface PainelDeFaturamento {
  filtros: FiltrosFaturamento;
  atualizadoEm: string;
  conexao: {
    configurada: boolean;
    ambiente: string;
    webhookConfigurado: boolean;
  };
  resumos: ResumoDeFaturamento[];
  reembolsos: ResumoDeReembolsos[];
  serie: PontoFinanceiro[];
  faturas: {
    itens: FaturaListada[];
    total: number;
    pagina: number;
    porPagina: number;
  };
  semData: number;
  sincronizacoes: Run[];
}
// Legado fiscal permanece identificado sem ambiente e sem amount_paid inventado.
// A presença de um espelho impede duplicar a mesma fatura na união.
const FATURAS = `WITH faturas AS (
 SELECT i.id,i.environment ambiente,i.provider provedor,i.external_invoice_id externa,i.invoice_number numero,i.currency_code moeda,i.status estado,i.amount_total total,i.amount_paid pago,i.amount_remaining saldo,i.provider_created_at criada,i.paid_at quitada,i.due_at vencimento,i.voided_at cancelada,i.needs_reconciliation,0 legado
 FROM billing_invoice_records i
 UNION ALL
 SELECT f.id,'legado',f.provider,f.external_invoice_id,f.invoice_number,f.currency_code,'paid',f.amount_total,NULL,NULL,NULL,f.paid_at,NULL,NULL,0,1
 FROM fiscal_records f WHERE NOT EXISTS(SELECT 1 FROM billing_invoice_records i WHERE i.provider=f.provider AND i.external_invoice_id=f.external_invoice_id)
), selecionadas AS (SELECT *,COALESCE(quitada,criada) referencia FROM faturas WHERE (?='todos' OR ambiente=?) AND (?='todos' OR provedor=?) AND (? IS NULL OR moeda=?) AND (?='todos' OR estado=?))`;
const parametros = (f: FiltrosFaturamento) => [
  f.ambiente,
  f.ambiente,
  f.provedor,
  f.provedor,
  f.moeda ?? null,
  f.moeda ?? null,
  f.estado,
  f.estado,
];
function limite(f: FiltrosFaturamento) {
  return [
    f.inicio + ' 00:00:00',
    new Date(Date.parse(f.fim) + 86400000).toISOString().slice(0, 10) +
      ' 00:00:00',
  ];
}
function balde(c: string, g: FiltrosFaturamento['agrupamento']) {
  return `DATE_FORMAT(${c},'${g === 'dia' ? '%Y-%m-%d' : g === 'mes' ? '%Y-%m-01' : '%Y-01-01'}')`;
}
const SOMA = (c: string) => `CAST(SUM(${c}) AS CHAR)`;
export async function carregarFaturamento(
  f: FiltrosFaturamento
): Promise<PainelDeFaturamento> {
  const config = await credenciaisDoStripe();
  return withTransaction(async (db) => {
    const p = parametros(f),
      datas = limite(f);
    // Coorte principal de faturas por criação (legado sem criação usa paid_at e é identificado).
    const resumos = await queryRows<ResumoDeFaturamento>(
      `${FATURAS} SELECT ambiente,provedor,moeda,COUNT(*) faturas,${SOMA('total')} valorNominal,${SOMA('pago')} valorQuitado,SUM(estado='paid') quitadas,SUM(estado='draft') rascunhos,SUM(estado='open') abertas,SUM(estado='uncollectible') inadimplentes,SUM(estado='void') canceladas,SUM(estado='deleted') excluidas,SUM(estado='open' AND vencimento<UTC_TIMESTAMP()) vencidas,${SOMA("CASE WHEN estado IN ('open','uncollectible') THEN saldo ELSE 0 END")} saldoAberto,SUM(pago IS NULL) semValorPago,SUM(total IS NULL) semValorTotal,SUM(needs_reconciliation) pendentesConciliacao FROM selecionadas WHERE COALESCE(criada,quitada)>=? AND COALESCE(criada,quitada)<? GROUP BY ambiente,provedor,moeda ORDER BY ambiente,provedor,moeda`,
      [...p, ...datas],
      db
    );
    const [n] = await queryRows<{ total: number }>(
      `${FATURAS} SELECT COUNT(*) total FROM selecionadas WHERE COALESCE(criada,quitada)>=? AND COALESCE(criada,quitada)<?`,
      [...p, ...datas],
      db
    );
    const itens = await queryRows<FaturaListada>(
      `${FATURAS} SELECT id,ambiente,provedor,externa,numero,moeda,estado,CAST(total AS CHAR) total,CAST(pago AS CHAR) pago,referencia,criada,quitada,legado,needs_reconciliation FROM selecionadas WHERE COALESCE(criada,quitada)>=? AND COALESCE(criada,quitada)<? ORDER BY COALESCE(criada,quitada) DESC,id DESC LIMIT 20 OFFSET ?`,
      [...p, ...datas, (f.pagina - 1) * 20],
      db
    );
    const [semData] = await queryRows<{ n: number }>(
      `${FATURAS} SELECT COUNT(*) n FROM selecionadas WHERE criada IS NULL AND quitada IS NULL`,
      p,
      db
    );
    const filtroRefund =
      "(?='todos' OR r.environment=?) AND (?='todos' OR r.provider=?) AND (? IS NULL OR r.currency_code=?)";
    const refundParams = [
      f.ambiente,
      f.ambiente,
      f.provedor,
      f.provedor,
      f.moeda ?? null,
      f.moeda ?? null,
    ];
    // Refund é um fluxo na própria data de criação. Não herda estado de fatura/coorte.
    const reembolsos = await queryRows<ResumoDeReembolsos>(
      `SELECT r.environment ambiente,r.provider provedor,r.currency_code moeda,COUNT(*) total,SUM(r.status='succeeded') concluidos,SUM(r.status IN ('pending','requires_action')) pendentes,SUM(r.status='failed') falhos,SUM(r.status='canceled') cancelados,SUM(r.invoice_record_id IS NULL) semVinculo,SUM(r.amount IS NULL) semValor,${SOMA("CASE WHEN r.status='succeeded' THEN r.amount ELSE 0 END")} valorConcluido,${SOMA("CASE WHEN r.status IN ('pending','requires_action') THEN r.amount ELSE 0 END")} valorPendente FROM billing_refund_records r WHERE ${filtroRefund} AND r.provider_created_at>=? AND r.provider_created_at<? GROUP BY r.environment,r.provider,r.currency_code ORDER BY 1,2,3`,
      [...refundParams, ...datas],
      db
    );
    // Cada série tem instante próprio: emissão em created, quitação em paid_at,
    // refund em created. Não subtrai coorte de fatura de fluxo de reembolso.
    const serie = await queryRows<PontoFinanceiro>(
      `${FATURAS}, movimentos AS (
 SELECT ${balde('COALESCE(criada,quitada)', f.agrupamento)} data,ambiente,provedor,moeda,1 faturas,total nominal,NULL quitado,NULL reembolsado FROM selecionadas WHERE COALESCE(criada,quitada)>=? AND COALESCE(criada,quitada)<?
 UNION ALL SELECT ${balde('quitada', f.agrupamento)},ambiente,provedor,moeda,0,NULL,pago,NULL FROM selecionadas WHERE quitada>=? AND quitada<?
 UNION ALL SELECT ${balde('r.provider_created_at', f.agrupamento)},r.environment,r.provider,r.currency_code,0,NULL,NULL,r.amount FROM billing_refund_records r WHERE ${filtroRefund} AND r.status='succeeded' AND r.provider_created_at>=? AND r.provider_created_at<?
 ) SELECT data,ambiente,provedor,moeda,SUM(faturas) faturas,${SOMA('nominal')} nominal,${SOMA('quitado')} quitado,${SOMA('reembolsado')} reembolsado FROM movimentos GROUP BY data,ambiente,provedor,moeda ORDER BY data,ambiente,provedor,moeda`,
      [...p, ...datas, ...datas, ...refundParams, ...datas],
      db
    );
    const sincronizacoes = await queryRows<Run>(
      'SELECT id,environment,stage,provider_cursor,provider_account_id,imported_invoices,imported_payments,imported_refunds,imported_balances,created_at,updated_at,completed_at,error_code FROM billing_admin_sync_runs ORDER BY created_at DESC,id DESC LIMIT 10',
      [],
      db
    );
    return {
      filtros: f,
      atualizadoEm: new Date().toISOString(),
      conexao: {
        configurada: Boolean(config.chaveSecreta),
        webhookConfigurado: Boolean(config.segredoDoWebhook),
        ambiente: config.ambiente,
      },
      resumos,
      reembolsos,
      serie,
      faturas: {
        itens,
        total: Number(n.total),
        pagina: f.pagina,
        porPagina: 20,
      },
      semData: Number(semData.n),
      sincronizacoes,
    };
  });
}
export async function carregarDetalheFinanceiro(id: string) {
  const fatura = await faturaLocal(id);
  const reembolsos = await queryRows<ReembolsoFinanceiro>(
    'SELECT id,environment,external_refund_id,invoice_record_id,payment_kind,external_payment_id,currency_code,amount,status,provider_created_at,source_event_created,source_event_id,needs_reconciliation,synced_at FROM billing_refund_records WHERE invoice_record_id=? ORDER BY provider_created_at DESC,id DESC LIMIT 100',
    [id]
  );
  const pagamentos = await queryRows<{
    payment_kind: string;
    external_payment_id: string;
    external_invoice_payment_id: string;
    amount_paid: number | null;
  }>(
    'SELECT payment_kind,external_payment_id,external_invoice_payment_id,amount_paid FROM billing_invoice_payments WHERE invoice_record_id=? ORDER BY external_invoice_payment_id',
    [id]
  );
  return {
    fatura,
    reembolsos,
    pagamentos,
    operacoes: await listarOperacoes(id),
  };
}
