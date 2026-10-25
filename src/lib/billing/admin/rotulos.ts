export const NOMES_DE_MOVIMENTOS: Record<string, string> = {
  charge: 'Cobrança',
  payment: 'Pagamento',
  refund: 'Reembolso',
  payment_refund: 'Reembolso de pagamento',
  adjustment: 'Ajuste',
  advance: 'Antecipação',
  advance_funding: 'Financiamento de antecipação',
  application_fee: 'Tarifa da plataforma',
  application_fee_refund: 'Devolução de tarifa',
  connect_collection_transfer: 'Transferência de cobrança',
  contribution: 'Contribuição',
  issuing_authorization_hold: 'Reserva de autorização',
  issuing_authorization_release: 'Liberação de autorização',
  issuing_dispute: 'Contestação de cartão',
  issuing_transaction: 'Transação de cartão',
  obligation_outbound: 'Obrigação de saída',
  obligation_reversal_inbound: 'Reversão de obrigação',
  payment_failure_refund: 'Devolução por falha',
  payment_network_reserve_hold: 'Reserva da rede de pagamento',
  payment_network_reserve_release: 'Liberação de reserva da rede',
  payment_unreconciled: 'Pagamento sem conciliação',
  payout: 'Repasse de saldo',
  payout_cancel: 'Cancelamento de repasse',
  payout_failure: 'Falha de repasse',
  refund_failure: 'Falha de reembolso',
  reserve_transaction: 'Movimento de reserva',
  reserved_funds: 'Fundos reservados',
  stripe_fee: 'Tarifa da Stripe',
  stripe_fx_fee: 'Tarifa de câmbio',
  tax_fee: 'Tarifa tributária',
  topup: 'Adição de saldo',
  topup_reversal: 'Reversão de adição',
  transfer: 'Transferência',
  transfer_cancel: 'Cancelamento de transferência',
  transfer_failure: 'Falha de transferência',
  transfer_refund: 'Devolução de transferência',
  dispute: 'Contestação',
  dispute_reversal: 'Reversão de contestação',
  fee: 'Tarifa',
  fee_refund: 'Devolução de tarifa',
  reserve: 'Reserva',
  reserve_release: 'Liberação de reserva',
  other_adjustment: 'Outro ajuste',
};
export const ESTADOS_FINANCEIROS: Record<string, string> = {
  draft: 'Rascunho',
  open: 'Aberta',
  paid: 'Quitada',
  void: 'Cancelada',
  uncollectible: 'Inadimplência assumida',
  deleted: 'Rascunho excluído',
  desconhecido: 'Estado não informado',
  succeeded: 'Concluído',
  pending: 'Pendente',
  requires_action: 'Aguardando ação',
  failed: 'Falhou',
  canceled: 'Cancelado',
  reserved: 'Em processamento',
  uncertain: 'Resultado a conferir',
  active: 'Ativa',
  trialing: 'Período de teste',
  past_due: 'Pagamento em atraso',
  available: 'Disponível',
};
export const ACOES_FINANCEIRAS = {
  void: {
    nome: 'Cancelar fatura',
    efeito:
      'Anula a fatura aberta no provedor e preserva o histórico. A assinatura continua com sua regra atual de renovação.',
  },
  delete_draft: {
    nome: 'Excluir rascunho',
    efeito:
      'Exclui o rascunho na Stripe e mantém a fotografia e a auditoria locais. Registros fiscais não serão apagados.',
  },
  finalize: {
    nome: 'Emitir fatura',
    efeito:
      'Finaliza o rascunho. Esta ação mantém a cobrança automática da fatura desligada; não realiza uma cobrança imediata.',
  },
  send: {
    nome: 'Enviar fatura por e-mail',
    efeito:
      'Pede à Stripe que envie a fatura ao endereço cadastrado no provedor. Aplicável às faturas de envio manual.',
  },
  uncollectible: {
    nome: 'Registrar inadimplência',
    efeito:
      'Marca a fatura aberta como de difícil recebimento na Stripe. Não registra pagamento nem cancela a assinatura.',
  },
  refund: {
    nome: 'Reembolsar pagamento',
    efeito:
      'Devolve o valor solicitado ao meio de pagamento original, conforme o estado confirmado pela Stripe. A assinatura permanece vigente; o resultado pode ficar pendente.',
  },
  cancel_refund: {
    nome: 'Cancelar reembolso',
    efeito:
      'Cancela um reembolso que aguarda ação. Reembolsos já concluídos não podem ser desfeitos por esta operação.',
  },
  cancel_subscription_at_period_end: {
    nome: 'Cancelar próxima renovação',
    efeito:
      'Solicita o encerramento da assinatura ao fim do período vigente. Mantém o acesso até esse fim e não reembolsa faturas anteriores.',
  },
  resume_subscription: {
    nome: 'Manter renovação',
    efeito:
      'Remove o cancelamento programado de uma assinatura ainda ativa. A renovação volta a seguir a cobrança contratada no provedor.',
  },
} as const;
export const nomeDoAmbiente = (v: string) =>
  v === 'test'
    ? 'Teste'
    : v === 'live'
      ? 'Produção'
      : v === 'todos'
        ? 'Todos os ambientes (separados)'
        : 'Legado sem ambiente comprovado';
export const nomeDoProvedor = (v: string) =>
  (
    ({
      stripe: 'Stripe',
      mercado_pago: 'Mercado Pago',
      paypal: 'PayPal',
    }) as Record<string, string>
  )[v] ?? v;
