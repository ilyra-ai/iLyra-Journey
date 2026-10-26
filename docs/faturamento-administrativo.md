# Faturamento administrativo · tarefa 100

## Inventário confirmado em 25/10/2026

A cobrança efetiva de assinaturas existe somente pela Stripe: checkout, portal, mapeamento de clientes e assinatura, webhook assinado e retenção de faturas pagas em `fiscal_records`. Mercado Pago e PayPal possuem configuração cifrada e teste de conexão; não possuem checkout nem recebimento de pagamentos do app. Não habilitar uma operação financeira fictícia só porque há campos de configuração para o provedor.

Nesta nuvem, `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` estão ausentes e os três provedores estão sem credenciais configuradas nos dois ambientes. Evidência segura: `/tmp/lyra100-readiness.mjs` verifica somente presença/estado, sem imprimir segredos. Assim, cancelamento/reembolso real no ambiente oficial de teste ainda não está comprovado. Não movimentar clientes de produção como QA. As implementações e validações independentes desta fronteira continuam.

## Pesquisa oficial consultada

Consulta em 25/10/2026, sem atribuir às fontes data de publicação que não foi comprovada:

- [Stripe OpenAPI](https://github.com/stripe/openapi/blob/master/openapi/spec3.json): estados de fatura, finalização, cancelamento por void, exclusão somente de rascunho, inadimplência assumida, pagamentos da fatura e reembolsos parciais/totais. Refund tem estados próprios; só `requires_action` pode ser cancelado. Fatura quitada e reembolso não implicam cancelar assinatura.
- [Stripe Node oficial](https://github.com/stripe/stripe-node): prazos, retries e chaves de idempotência. Contratos instalados no SDK 23 em `node_modules/stripe/cjs/resources/Invoices.d.ts`, `InvoicePayments.d.ts` e `Refunds.d.ts`; API vigente no app `2026-09-30.endive`.
- [Mercado Pago SDK oficial](https://github.com/mercadopago/sdk-nodejs/blob/master/src/clients/paymentRefund/index.ts): reembolso parcial e total existem na API, exigindo pagamento real identificável. Isso não equivale a integração de cobrança já existente no app.
- [PayPal OpenAPI](https://github.com/paypal/paypal-rest-api-specifications/blob/main/openapi/payments_payment_v2.json): refund de captura e consulta de refund; também exigem captura vinculada e credenciais do ambiente correto.
- Página pública oficial de moedas da Stripe recusada pelo proxy com 403; não tratar seu conteúdo como lido. Valores devem manter a unidade mínima real e moeda. Não assumir divisor 100 para todas as moedas.

Cópias das fontes consultadas nesta instância: `/tmp/lyra99-research/stripe-invoice` e `/tmp/lyra100-research/`.

## Contratos que orientam a implementação

- Fatura, pagamento, reembolso, registro fiscal e assinatura são entidades distintas. Reembolso ou cancelamento de uma fatura não cancela assinatura automaticamente; confirmação deve informar o efeito real.
- Teste e produção separados em persistência, consultas e operações. Histórico fiscal sem prova do ambiente fica identificado como legado sem classificação, sem inferir ambiente pela chave atual.
- Dados numéricos ausentes ficam NULL e sua cobertura é visível. Não preencher `amount_paid` ausente pelo total nominal. Valores quitados, valores fiscais, reembolsos e taxas devem ter definições diferentes; não apresentar projeção como receita realizada nem diferença antes de taxas como lucro líquido.
- Cada indicador terá origem, unidade, moeda, instante de referência UTC, granularidade diária/mensal/anual, filtros e limites. Moedas distintas não são somadas. Histórico não sincronizado não é tratado como ausência comprovada de transações.
- Novos espelhos financeiros guardam IDs do provedor, estados, valores e datas, sem cartão, comprador ou dados clínicos. Documentos fiscais originais continuam imutáveis. Nenhum cancelamento corresponde a apagar registro fiscal local.
- Ações exigem administrador real, estado confirmado no provedor, ambiente correspondente, confirmação explícita e identificador de operação persistido antes da chamada externa. Falha ambígua precisa ser retomada/reconciliada com a mesma chave; não gerar novo reembolso silenciosamente.
- Integrações HTTP controladas e eventos assinados de teste podem verificar contratos e persistência, mas não comprovam transação real no provedor. Essa fronteira ficará explicitamente bloqueada se a credencial oficial de teste continuar ausente.

## Implementação publicada como progresso da tarefa 100

Este registro **não encerra a tarefa 100**. O usuário solicitou commit e push do progresso na main; a conclusão continua condicionada às verificações restantes abaixo.

- Aba Faturamento em `/admin/dashboard?aba=faturamento`, com os mesmos primitivos de abas da Gestão de Conteúdo. URL, recarga, teclado e rascunhos das abas visitadas preservados.
- Consulta de faturas por criação; legado fiscal sem prova do ambiente permanece separado e usa a data de quitação, sem preencher `amount_paid` ausente. Uma mesma fatura não duplica na união das fontes. Estados e quitação da coorte são a última fotografia, não receita contábil ocorrida no período.
- Séries por dia/mês/ano: nominal por criação, quitação por `paid_at`, reembolso por criação do refund e saldo por criação do movimento. Moeda, ambiente e provedor separados. Dados ausentes ficam sem traço e sem valor fictício.
- Bruto, tarifas e líquido dos movimentos vêm de `BalanceTransaction.amount`, `fee` e `net`. Repasses e ajustes preservam seus sinais; a soma representa variação do saldo da Stripe, não lucro nem saldo bancário. Agregados monetários são strings exatas; apresentação usa BigInt para não perder centavos.
- Migração **044** cria seis tabelas: espelhos de faturas, vínculos de pagamentos, refunds, operações administrativas, execuções de sincronização e movimentos de saldo. Aplicada ao banco existente e comprovada também no banco isolado das integrações. Nenhuma migração anterior alterada.
- Sincronização real por páginas, com ambiente/conta validados, corte temporal no início, quatro fases, cursor persistido, lease, pausa e retomada. Fotografias posteriores ao início da página não são sobrescritas pelo retorno antigo dessa página.
- Webhooks de faturas e refunds são reconciliados com a API sob a trava do próprio registro. Leitura canônica evita interpretar IDs ou eventos do mesmo segundo como ordem cronológica. Evento de previsão `invoice.upcoming` não é registrado como fatura emitida. Rascunho excluído preserva a fotografia local.
- Cancelamento de fatura, exclusão de rascunho, finalização sem cobrança automática, envio manual quando aplicável, marcação de inadimplência, reembolso parcial, cancelamento de refund `requires_action` e controle da próxima renovação usam os métodos reais da SDK. Cancelar/reembolsar fatura não cancela assinatura; alteração da renovação preserva o status real e grava o flag correspondente na assinatura local ativa quando vinculada.
- Confirmação pelo ID da fatura, administrador validado no servidor, nonce estável no formulário e intenção persistida antes da chamada. Concorrência e novo pedido durante operação incerta são recusados. Reembolso ambíguo é recuperado também pelo metadado do pedido no provedor; pedido antigo não é reenviado com chave expirada. Retomada em outra conta é recusada. Pagamento compartilhado entre faturas exige revisão no provedor, sem alocação arbitrária.
- Detalhes de faturas e movimentos são paginados, com cartões no mobile e tabelas acessíveis no desktop. O modal pagina todos os refunds e operações em blocos de 20, com contagem e controles independentes. A presença de pedido pendente é consultada em todo o histórico, inclusive fora da página exibida.

### APIs administrativas

Todas exigem administrador real; leituras respondem `Cache-Control: no-store`.

| Rota                                                 | Contrato atual                                                                                                                                         |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /api/admin/faturamento`                         | `inicio`, `fim`, `ambiente`, `provedor`, `moeda`, `agrupamento`, `estado`, `pagina`; lista de faturas, fontes, cobertura e execuções de sincronização. |
| `GET /api/admin/faturamento/saldos`                  | Mesmos filtros de data, ambiente, provedor, moeda e agrupamento; estado de fatura não altera movimentos de saldo.                                      |
| `GET /api/admin/faturamento/:invoiceId`              | Fotografia financeira, pagamentos vinculados e históricos paginados por `paginaOperacoes` e `paginaReembolsos` (1–10.000), 20 itens por página.        |
| `POST /api/admin/faturamento/:invoiceId/reconciliar` | Leitura atual da API e atualização dos espelhos, sem gerar cobrança.                                                                                   |
| `POST /api/admin/faturamento/:invoiceId/acoes`       | Ação tipada, nonce UUID, confirmação, valor inteiro/identificador de pagamento quando aplicável e motivo fechado. Estado e saldo conferidos na Stripe. |
| `POST /api/admin/faturamento/sincronizar`            | Ambiente e `runId` opcional; uma página por pedido, com continuidade e limites persistidos.                                                            |

Períodos UTC incluem o dia final. Até 366 dias na visão diária ou 3.660 dias nas visões mensal/anual. Consultas não expõem comprador, dados clínicos, conteúdo de webhook, credenciais ou cartão.

## Evidências deste commit de progresso

- **573 unitários (71 arquivos)** e **375 integrações (43 arquivos)** aprovados; formatação, lint sem avisos, tipos e build de produção aprovados.
- Novos testes: 19 de unidades monetárias/filtros, 11 de espelhos/consultas no MySQL e 14 de operações/sincronização por contrato HTTP local com a SDK real. Cobrem inteiros exatos, datas, moedas/ambientes, legado, vínculo/ambiguidade de refunds, status, concorrência, idempotência, recuperação após falha ambígua, conta trocada, estado inválido e preservação fiscal. As 17 regressões existentes de cobrança/LGPD também passaram, incluindo reconciliação por HTTP local.
- QA do build de produção com a **base financeira vazia real**: APIs 200, ausência de chaves apresentada corretamente, sincronização recusada 503 sem criar registros; visitante 401 e paciente 403; aba por URL, recarga, teclado, rascunho entre abas, filtros diários/anuais, todos os ambientes, falha de rede e retentativa. 1440/390/320 px sem overflow; 28 regras axe aprovadas, zero violações e exceções JavaScript. Conta de QA excluída; nenhuma transação financeira fabricada no runtime.
- Evidências locais: `/tmp/lyra100-{unit,integration,types,lint,format,build,migrate,qa}.log`, `/tmp/lyra100-*.png`, `/tmp/lyra100-cdp.mjs` e testes versionados. Foram inspecionadas as capturas desktop e mobile do estado vazio.

## Pendências antes de finalizar a tarefa 100

1. Credenciais oficiais de teste da Stripe continuam ausentes tanto no processo quanto em `.env.local` e nas configurações do painel. Cancelamento, reembolso e sincronização externos reais **não estão comprovados**; contratos locais não substituem essa validação. Não utilizar transações de clientes de produção como QA.
2. Validar a interface com os movimentos reais do ambiente oficial de teste, efeitos e reconciliação dos webhooks correspondentes, incluindo os detalhes e confirmações das operações.
   A paginação e a exportação foram concluídas em 26/10/2026. A tarefa permanece bloqueada somente nas verificações oficiais externas dos itens 1–2.

## Complemento validado em 26/10/2026

- Históricos paginados e pedidos pendentes globais; o retorno à primeira página após uma operação evita apresentar resultados antigos. Teste de integração percorre 125 operações e 125 refunds sem perda/duplicação nas sete páginas.
- Exportação LGPD inclui faturas, pagamentos, refunds e estado/data das operações ligados ao titular. Usa registro fiscal ou assinatura/cliente comprovados no ambiente; não infere vínculo por nome/e-mail, não atribui legado ambíguo e não exporta autoria interna, parâmetros, resultados ou saldo global do comerciante. Valores em strings exatas de unidades mínimas. Retenção financeira e política de privacidade documentadas na versão 26/10/2026; migração 044 preservada.
- **573 unitários e 378 integrações**, tipos, lint, formatação e build aprovados. Três novas integrações cobrem paginação, exportação/isolamento/retenção e fatura sem documento fiscal com ambiente comprovado. Agregado monetário ímpar acima de MAX_SAFE_INTEGER também validado, sem perda de unidade mínima.
- QA do build de produção em banco temporário exclusivo, migrado do zero: 125 operações/125 refunds sintéticos para testar as sete páginas, pendência na última página e paginações independentes. Desktop 1440 e mobile 390/320 sem overflow da página ou modal, Escape funcionando, axe 27 regras sem violações e nenhuma exceção JavaScript. Capturas desktop/mobile inspecionadas. Banco temporário removido; a base financeira de desenvolvimento permaneceu vazia. Isso **não comprova transações oficiais Stripe**.
- Evidências: `/tmp/lyra100-final-{unit,integration,types,lint,format,build,modal-qa}.log`, `/tmp/lyra100-modal-isolado-{1440,390,320}.png`.

As tarefas 101–103 e 105–107 permanecem independentes e não são declaradas concluídas por este commit.
