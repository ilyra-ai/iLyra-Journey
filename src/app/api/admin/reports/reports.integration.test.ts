import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, expect, it } from 'vitest';
import { GET } from './route';
import {
  criarUsuario,
  type UsuarioDeTeste,
} from '../../../../../tests/integration/fixtures';
import { chamar } from '../../../../../tests/integration/http';
import { executeStatement, queryRows } from '@/lib/mysql/pool';
import { carregarPainel } from '@/lib/admin/analytics/consultas';
import { carregarFaturamento } from '@/lib/billing/admin/consultas';
import { carregarSaldo } from '@/lib/billing/admin/saldos';
import { lerFiltros } from '@/lib/admin/analytics/filtros';
import { lerFiltrosFaturamento } from '@/lib/billing/admin/filtros';
import type { RelatorioAdministrativo } from '@/lib/admin/reports/servico';
let admin: UsuarioDeTeste, pessoa: UsuarioDeTeste;
const invoices: string[] = [],
  balances: string[] = [],
  fiscals: string[] = [],
  refunds: string[] = [];
const segredo = 'CONTEUDO_PRIVADO_RELATORIO_' + randomUUID();
const uso =
  'tipo=uso&inicio=2024-02-01&fim=2024-02-29&plano=meta&agrupamento=mes';
const financeiro =
  'tipo=financeiro&inicio=2024-02-01&fim=2024-02-29&ambiente=test&agrupamento=mes';
const ler = (q: string, usuario: UsuarioDeTeste | null = admin) =>
  chamar(GET, { usuario, path: '/api/admin/reports?' + q });
async function obter(q: string) {
  const r = await ler(q);
  expect(r.status).toBe(200);
  return r.json as RelatorioAdministrativo;
}
beforeAll(async () => {
  admin = await criarUsuario('admin');
  pessoa = await criarUsuario();
  for (const u of [admin, pessoa]) {
    await executeStatement(
      "UPDATE users SET created_at='2024-02-02' WHERE id=?",
      [u.id]
    );
    await executeStatement(
      "INSERT INTO user_subscriptions(id,user_id,plan_id,current_period_end) SELECT ?,?,id,'2099-01-01' FROM subscription_plans WHERE plan_key='meta'",
      [randomUUID(), u.id]
    );
  }
  for (const dia of ['2024-02-02', '2024-02-29'])
    await executeStatement(
      'INSERT INTO daily_metrics(id,user_id,date,steps,created_at) VALUES(?,?,?,5555,?)',
      [randomUUID(), pessoa.id, dia, dia]
    );
  await executeStatement(
    "INSERT INTO daily_reflections(id,user_id,reflection_date,emotional_score,body_score,spiritual_score,note,created_at) VALUES(?,?,'2024-02-02',4,4,4,?,'2024-02-02')",
    [randomUUID(), pessoa.id, segredo]
  );
  for (let n = 0; n < 25; n++) {
    const id = randomUUID();
    invoices.push(id);
    await executeStatement(
      "INSERT INTO billing_invoice_records(id,provider,environment,external_invoice_id,currency_code,status,amount_total,amount_paid,provider_created_at,paid_at) VALUES(?,'stripe','test',?,'BRL','paid',1000,1000,'2024-02-02','2024-02-02')",
      [id, 'in_reports_' + id]
    );
    const bid = randomUUID();
    balances.push(bid);
    await executeStatement(
      "INSERT INTO billing_balance_records(id,provider,environment,external_transaction_id,currency_code,amount,fee,net,type,reporting_category,status,provider_created_at,available_at) VALUES(?,'stripe','test',?,'BRL',?,10,?,'charge','charge','available','2024-02-02','2024-02-03')",
      [
        bid,
        'txn_reports_' + bid,
        n < 2 ? 9007199254740000 + n : 1000,
        n < 2 ? 9007199254739990 + n : 990,
      ]
    );
  }
  const anterior = randomUUID();
  invoices.push(anterior);
  await executeStatement(
    "INSERT INTO billing_invoice_records(id,provider,environment,external_invoice_id,currency_code,status,amount_total,amount_paid,provider_created_at) VALUES(?,'stripe','test',?,'JPY','open',5000,NULL,'2024-01-10')",
    [anterior, 'in_reports_' + anterior]
  );
  const live = randomUUID();
  invoices.push(live);
  await executeStatement(
    "INSERT INTO billing_invoice_records(id,provider,environment,external_invoice_id,currency_code,status,amount_total,amount_paid,provider_created_at) VALUES(?,'stripe','live',?,'BRL','paid',9999,9999,'2024-02-02')",
    [live, 'in_reports_' + live]
  );
  const fid = randomUUID();
  fiscals.push(fid);
  await executeStatement(
    "INSERT INTO fiscal_records(id,provider,external_invoice_id,user_id,buyer_email,currency_code,amount_subtotal,amount_total,paid_at) VALUES(?,'stripe',?,?,?,'BRL',9999,9999,'2024-02-02')",
    [fid, 'in_reports_' + live, pessoa.id, segredo + '@teste.local']
  );
  const refund = randomUUID();
  refunds.push(refund);
  await executeStatement(
    "INSERT INTO billing_refund_records(id,provider,environment,external_refund_id,invoice_record_id,currency_code,amount,status,provider_created_at) VALUES(?,'stripe','test',?,?,'BRL',100,'succeeded','2024-02-10')",
    [refund, 're_reports_' + refund, invoices[0]]
  );
});
afterAll(async () => {
  for (const id of refunds)
    await executeStatement('DELETE FROM billing_refund_records WHERE id=?', [
      id,
    ]);
  for (const id of invoices)
    await executeStatement('DELETE FROM billing_invoice_records WHERE id=?', [
      id,
    ]);
  for (const id of balances)
    await executeStatement('DELETE FROM billing_balance_records WHERE id=?', [
      id,
    ]);
  for (const id of fiscals)
    await executeStatement('DELETE FROM fiscal_records WHERE id=?', [id]);
  await executeStatement('DELETE FROM users WHERE id IN (?,?)', [
    admin.id,
    pessoa.id,
  ]);
});
it('usa exatamente as definições e consultas do dashboard, sem duplicar administradores ou pessoas entre dias', async () => {
  const d = await obter(uso);
  if (d.tipo !== 'uso') throw new Error('Tipo incorreto');
  const canonico = await carregarPainel(
    lerFiltros(new URLSearchParams(uso.replace('tipo=uso&', '')))
  );
  expect(d.dados.atual).toEqual(canonico.atual);
  expect(d.dados.dominios).toEqual(canonico.dominios);
  expect(d.dados.serie).toEqual(canonico.serie);
  expect(d.dados.atual).toMatchObject({
    cadastros: 1,
    ativos: 1,
    concluidos: 1,
  });
  expect(d.dados.serie[0]).toMatchObject({ ativos: 1, metricas: 2 });
  expect(
    d.exportacao.linhas.filter(
      (l) =>
        l.secao === 'Áreas' &&
        l.periodo === 'atual' &&
        l.unidade === 'registros'
    )
  ).toHaveLength(14);
  expect(
    d.exportacao.linhas.find(
      (l) =>
        l.indicador === 'Perfis completos entre os cadastros' &&
        l.periodo === 'atual'
    )?.valor
  ).toBe(100);
});
it('exporta somente agregados, com todas as datas/filtros/origens e nenhum dado pessoal ou clínico', async () => {
  const d = await obter(uso);
  const text = JSON.stringify(d.exportacao);
  expect(text).not.toContain(segredo);
  expect(text).not.toContain(pessoa.email);
  expect(text).not.toMatch(/5555|password|buyer_email|question|answer/);
  expect(d.exportacao).toMatchObject({
    formato: 'lyra-metacare/indicadores-administrativos',
    anterior: { inicio: '2024-01-03', fim: '2024-01-31' },
  });
  expect(
    d.exportacao.linhas.every((l) => !!l.origem && !!l.unidade && !!l.limite)
  ).toBe(true);
});
it('reutiliza faturamento e saldo, sem misturar ambiente, moeda, coorte e movimentos', async () => {
  const d = await obter(financeiro);
  if (d.tipo !== 'financeiro') throw new Error('Tipo incorreto');
  const f = lerFiltrosFaturamento(
    new URLSearchParams(financeiro.replace('tipo=financeiro&', ''))
  );
  const canonico = await carregarFaturamento(f),
    saldo = await carregarSaldo(f);
  expect(d.faturas.resumos).toEqual(canonico.resumos);
  expect(d.faturas.serie).toEqual(canonico.serie);
  expect(d.saldos.grupos).toEqual(saldo.grupos);
  expect(d.saldos.serie).toEqual(saldo.serie);
  expect(d.faturas.faturas.total).toBe(25);
  expect(d.saldos.total).toBe(25);
  expect(
    d.exportacao.linhas.find(
      (l) =>
        l.secao === 'Faturas' &&
        l.indicador === 'Valor total das faturas selecionadas' &&
        l.periodo === 'atual'
    )?.valor
  ).toBe('25000');
  const bruto = d.exportacao.linhas.find(
    (l) =>
      l.secao.startsWith('Saldo') &&
      l.indicador === 'Bruto dos movimentos' &&
      l.periodo === 'atual'
  );
  expect(bruto?.valor).toBe('18014398509503001');
  expect(
    d.exportacao.linhas.find(
      (l) =>
        l.indicador === 'Valor quitado das faturas selecionadas' &&
        l.moeda === 'JPY' &&
        l.periodo === 'anterior'
    )?.valor
  ).toBeNull();
  expect(JSON.stringify(d.exportacao)).not.toContain(segredo);
});
it('pagina faturas e saldo independentemente, mantendo os indicadores completos', async () => {
  const d = await obter(financeiro + '&pagina=2&paginaSaldos=1');
  if (d.tipo !== 'financeiro') throw new Error('Tipo incorreto');
  expect(d.faturas.faturas.itens).toHaveLength(5);
  expect(d.saldos.itens).toHaveLength(20);
  expect(
    d.exportacao.linhas.find(
      (l) => l.indicador === 'Faturas selecionadas' && l.periodo === 'atual'
    )?.valor
  ).toBe(25);
  const outra = await obter(financeiro + '&pagina=1&paginaSaldos=2');
  if (outra.tipo !== 'financeiro') throw new Error('Tipo incorreto');
  expect(outra.saldos.itens).toHaveLength(5);
  expect(outra.faturas.faturas.itens).toHaveLength(20);
});
it('filtros sem registros não viram percentuais inventados e datas finais incluem o dia inteiro', async () => {
  const vazio = await obter(uso.replace('plano=meta', 'plano=free'));
  if (vazio.tipo !== 'uso') throw new Error('Tipo incorreto');
  expect(vazio.dados.atual.cadastros).toBe(0);
  expect(
    vazio.exportacao.linhas.find(
      (l) =>
        l.indicador === 'Perfis completos entre os cadastros' &&
        l.periodo === 'atual'
    )?.valor
  ).toBeNull();
  const jpy = await obter(financeiro + '&moeda=JPY');
  if (jpy.tipo !== 'financeiro') throw new Error('Tipo incorreto');
  expect(jpy.faturas.faturas.total).toBe(0);
  expect(jpy.saldos.total).toBe(0);
  const [sql] = await queryRows<{ n: number }>(
    "SELECT COUNT(*) n FROM daily_metrics WHERE user_id=? AND created_at>='2024-02-01' AND created_at<'2024-03-01'",
    [pessoa.id]
  );
  expect(sql.n).toBe(2);
});
it('recusa visitantes, pacientes e filtros inválidos no servidor', async () => {
  expect((await ler(uso, null)).status).toBe(401);
  expect((await ler(uso, pessoa)).status).toBe(403);
  for (const q of [
    'tipo=uso&agrupamento=ano',
    'tipo=financeiro&moeda=brl',
    'tipo=uso&detalhe=chat',
    'tipo=financeiro&plano=meta',
    'tipo=financeiro&paginaSaldos=0',
  ])
    expect((await ler(q)).status).toBe(400);
  const r = await ler(uso);
  expect(r.headers.get('cache-control')).toBe('private, no-store');
});
