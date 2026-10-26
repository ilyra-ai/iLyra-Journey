import {
  NOMES_DE_MOVIMENTOS,
  ESTADOS_FINANCEIROS,
} from '@/lib/billing/admin/rotulos';
import { gerarCsv } from '@/lib/csv/gerar-csv';
import type { PainelAnalitico } from '@/lib/admin/analytics/definicoes';
import { DOMINIOS, percentual } from '@/lib/admin/analytics/definicoes';
import type { PainelDeFaturamento } from '@/lib/billing/admin/consultas';
import type { PainelDeSaldo } from '@/lib/billing/admin/saldos';

export interface LinhaDoRelatorio {
  secao: string;
  indicador: string;
  periodo: string;
  data: string;
  ambiente: string;
  provedor: string;
  moeda: string;
  valor: number | string | null;
  unidade: string;
  origem: string;
  limite: string;
}
export const CAMPOS_FATURAS = {
  faturas: 'Faturas selecionadas',
  valorNominal: 'Valor total das faturas selecionadas',
  valorQuitado: 'Valor quitado das faturas selecionadas',
  quitadas: 'Faturas quitadas',
  rascunhos: 'Rascunhos',
  abertas: 'Faturas abertas',
  inadimplentes: 'Inadimplência assumida',
  canceladas: 'Faturas canceladas',
  excluidas: 'Rascunhos excluídos',
  vencidas: 'Faturas vencidas',
  saldoAberto: 'Saldo aberto das faturas',
  semValorPago: 'Faturas sem valor pago conhecido',
  semValorTotal: 'Faturas sem valor total conhecido',
  pendentesConciliacao: 'Faturas a reconciliar',
} as const;
export const CAMPOS_REFUNDS = {
  total: 'Reembolsos registrados',
  concluidos: 'Reembolsos concluídos',
  pendentes: 'Reembolsos pendentes',
  falhos: 'Reembolsos falhos',
  cancelados: 'Reembolsos cancelados',
  semVinculo: 'Reembolsos sem vínculo',
  semValor: 'Reembolsos sem valor conhecido',
  valorConcluido: 'Valor dos reembolsos concluídos',
  valorPendente: 'Valor reservado em reembolsos pendentes',
} as const;
export const CAMPOS_SALDO = {
  movimentos: 'Movimentos',
  bruto: 'Bruto dos movimentos',
  taxas: 'Tarifas dos movimentos',
  liquido: 'Variação líquida de saldo',
} as const;
const linha = (
  secao: string,
  indicador: string,
  valor: LinhaDoRelatorio['valor'],
  origem: string,
  limite: string,
  extras: Partial<LinhaDoRelatorio> = {}
): LinhaDoRelatorio => ({
  secao,
  indicador,
  valor,
  origem,
  limite,
  periodo: 'atual',
  data: '',
  ambiente: '',
  provedor: '',
  moeda: '',
  unidade: 'registros',
  ...extras,
});
export function linhasDeUso(d: PainelAnalitico): LinhaDoRelatorio[] {
  const limite =
    'População sem administradores e plano vigente; somente registros retidos. Não equivale a visitas nem histórico imutável.';
  const principais = [
    ['cadastros', 'Cadastros retidos'],
    ['ativos', 'Pessoas com atividade persistida'],
    ['concluidos', 'Perfis atualmente completos entre os cadastros'],
  ] as const;
  const linhas = principais.flatMap(([chave, nome]) => [
    linha(
      'Indicadores',
      nome,
      d.atual[chave],
      'users/profiles e oito fontes de atividade',
      limite,
      { unidade: 'pessoas' }
    ),
    linha(
      'Indicadores',
      nome,
      d.comparacao[chave],
      'users/profiles e oito fontes de atividade',
      limite,
      { periodo: 'anterior', unidade: 'pessoas' }
    ),
  ]);
  for (const [periodo, c] of [
    ['atual', d.atual],
    ['anterior', d.comparacao],
  ] as const)
    linhas.push(
      linha(
        'Indicadores',
        'Perfis completos entre os cadastros',
        percentual(c.concluidos, c.cadastros),
        'profiles.onboarding_completed/users.created_at',
        'Percentual atual entre as contas criadas no período; sem data histórica de conclusão.',
        { periodo, unidade: '%' }
      )
    );
  for (const dominio of d.dominios) {
    const def = DOMINIOS[dominio.chave];
    linhas.push(
      linha('Áreas', def.nome, dominio.registros, def.fonte, def.limite),
      linha('Áreas', def.nome, dominio.anterior, def.fonte, def.limite, {
        periodo: 'anterior',
      }),
      linha(
        'Áreas',
        `${def.nome} · titulares`,
        dominio.pessoas,
        def.fonte,
        def.limite,
        { unidade: 'pessoas' }
      )
    );
    if (['chat', 'memoria', 'imagens'].includes(dominio.chave))
      linhas.push(
        linha(
          'Qualidade',
          `${def.nome} · erros atuais`,
          dominio.erros,
          def.fonte,
          'Estado atual de linhas criadas no período; não representa tentativas ou disponibilidade do provedor.'
        )
      );
  }
  for (const [periodo, serie] of [
    ['atual', d.serie],
    ['anterior', d.serieAnterior],
  ] as const)
    for (const p of serie)
      for (const [chave, nome] of [
        ['cadastros', 'Cadastros'],
        ['ativos', 'Pessoas com atividade'],
        ['chat', 'Perguntas salvas'],
        ['metricas', 'Registros de métricas'],
      ] as const)
        linhas.push(
          linha(
            'Evolução',
            nome,
            p[chave],
            'Mesmas fontes do dashboard',
            limite,
            {
              periodo,
              data: p.data,
              unidade:
                chave === 'cadastros' || chave === 'ativos'
                  ? 'pessoas'
                  : 'registros',
            }
          )
        );
  for (const [chave, nome] of [
    ['contas', 'Contas atuais'],
    ['bloqueadas', 'Contas bloqueadas'],
    ['pendentes', 'Onboarding pendente'],
    ['semAssinatura', 'Sem assinatura vigente'],
    ['multiplasAssinaturas', 'Múltiplas assinaturas ativas'],
  ] as const)
    linhas.push(
      linha(
        'Base atual',
        nome,
        d.base[chave],
        'users/profiles/user_subscriptions',
        'Fotografia atual, independente do período de criação.',
        { periodo: 'fotografia', unidade: 'pessoas' }
      )
    );
  for (const p of d.planos)
    linhas.push(
      linha(
        'Planos atuais',
        p.nome,
        p.contas,
        'user_subscriptions/subscription_plans',
        'Plano vigente; não comprova pagamento.',
        { periodo: 'fotografia', unidade: 'pessoas' }
      )
    );
  for (const [chave, nome] of [
    ['dicas', 'Dicas ativas'],
    ['habitos', 'Hábitos sugeridos ativos'],
    ['planos', 'Planos comerciais ativos'],
    ['documentos', 'Documentos de conhecimento'],
  ] as const)
    linhas.push(
      linha(
        'Catálogo global',
        nome,
        d.catalogo[chave],
        'Catálogos administrativos',
        'Fotografia global sem filtro de plano ou período; conhecimento não é RLHF.',
        { periodo: 'fotografia' }
      )
    );
  return linhas;
}
export function linhasFinanceiras(
  f: PainelDeFaturamento,
  s: PainelDeSaldo,
  periodo: 'atual' | 'anterior'
): LinhaDoRelatorio[] {
  const linhas: LinhaDoRelatorio[] = [];
  for (const r of f.resumos)
    for (const [chave, nome] of Object.entries(CAMPOS_FATURAS)) {
      const k = chave as keyof typeof CAMPOS_FATURAS;
      linhas.push(
        linha(
          'Faturas',
          nome,
          r[k],
          'billing_invoice_records/fiscal_records',
          'Faturas por criação; legado por quitação, sem ambiente comprovado. Estado e quitação acumulados atuais, não receita ocorrida no período.',
          {
            periodo,
            ambiente: r.ambiente,
            provedor: r.provedor,
            moeda: r.moeda ?? '',
            unidade: ['valorNominal', 'valorQuitado', 'saldoAberto'].includes(k)
              ? 'unidades mínimas'
              : 'registros',
          }
        )
      );
    }
  for (const r of f.reembolsos)
    for (const [chave, nome] of Object.entries(CAMPOS_REFUNDS)) {
      const k = chave as keyof typeof CAMPOS_REFUNDS;
      linhas.push(
        linha(
          'Reembolsos',
          nome,
          r[k],
          'billing_refund_records',
          'Por criação do reembolso; estados atuais, sem somar pendências a reembolsos concluídos.',
          {
            periodo,
            ambiente: r.ambiente,
            provedor: r.provedor,
            moeda: r.moeda ?? '',
            unidade: k.startsWith('valor') ? 'unidades mínimas' : 'registros',
          }
        )
      );
    }
  for (const r of s.grupos)
    for (const [chave, nome] of Object.entries(CAMPOS_SALDO)) {
      const k = chave as keyof typeof CAMPOS_SALDO;
      linhas.push(
        linha(
          `Saldo · ${NOMES_DE_MOVIMENTOS[r.tipo] ?? r.tipo} · ${NOMES_DE_MOVIMENTOS[r.categoria] ?? r.categoria} · ${ESTADOS_FINANCEIROS[r.estado] ?? r.estado}`,
          nome,
          r[k],
          'billing_balance_records',
          'Movimentos reais da conta do provedor; inclui repasses e ajustes com sinal. Não é lucro, receita contábil ou saldo bancário.',
          {
            periodo,
            ambiente: r.ambiente,
            provedor: 'stripe',
            moeda: r.moeda,
            unidade: k === 'movimentos' ? 'registros' : 'unidades mínimas',
          }
        )
      );
    }
  for (const p of f.serie)
    for (const [chave, nome] of [
      ['nominal', 'Nominal por criação'],
      ['quitado', 'Quitação por data de pagamento'],
      ['reembolsado', 'Reembolsos concluídos por criação'],
    ] as const)
      linhas.push(
        linha(
          'Evolução financeira',
          nome,
          p[chave],
          'billing_invoice_records/billing_refund_records/fiscal_records',
          'Fontes e datas distintas; não somar fatura e movimento de saldo.',
          {
            periodo,
            data: p.data,
            ambiente: p.ambiente,
            provedor: p.provedor,
            moeda: p.moeda ?? '',
            unidade: 'unidades mínimas',
          }
        )
      );
  for (const p of s.serie)
    for (const [chave, nome] of Object.entries(CAMPOS_SALDO)) {
      const k = chave as keyof typeof CAMPOS_SALDO;
      linhas.push(
        linha(
          'Evolução do saldo',
          nome,
          p[k],
          'billing_balance_records',
          'Por criação do movimento, sem soma a faturas.',
          {
            periodo,
            data: p.data,
            ambiente: p.ambiente,
            provedor: 'stripe',
            moeda: p.moeda,
            unidade: k === 'movimentos' ? 'registros' : 'unidades mínimas',
          }
        )
      );
    }
  linhas.push(
    linha(
      'Cobertura',
      'Faturas sem data conhecida',
      f.semData,
      'billing_invoice_records/fiscal_records',
      'Não entram na evolução temporal.',
      { periodo }
    )
  );
  return linhas;
}

/** CSV do mesmo resultado consultado, com recorte/proveniência e unidades exatas. */
export function csvDoRelatorio(e: {
  tipo: string;
  filtros: { inicio: string; fim: string };
  anterior: { inicio: string; fim: string };
  iniciadoEm: string;
  geradoEm: string;
  linhas: LinhaDoRelatorio[];
}) {
  return gerarCsv(
    e.linhas.map((l) => ({
      tipo: e.tipo,
      consulta_inicio: e.filtros.inicio,
      consulta_fim: e.filtros.fim,
      anterior_inicio: e.anterior.inicio,
      anterior_fim: e.anterior.fim,
      fuso: 'UTC',
      filtros: JSON.stringify(e.filtros),
      leitura_iniciada_em: e.iniciadoEm,
      gerado_em: e.geradoEm,
      ...l,
      valor:
        typeof l.valor === 'string' && /^-?\d+$/.test(l.valor)
          ? BigInt(l.valor)
          : l.valor,
    }))
  );
}
