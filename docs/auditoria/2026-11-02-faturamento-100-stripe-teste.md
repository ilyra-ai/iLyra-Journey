# Tarefa 100 · Faturamento com a Stripe de teste (2026-11-02)

Ambiente: app em produção (`next start`) na sessão de trabalho, MySQL 9.7.2 e
a conta de teste da Stripe "Área restrita de New business" (`livemode: false`,
BR, BRL). A chave restrita de teste foi informada pelo usuário e gravada pelo
próprio app em Admin → Pagamentos, cifrada; ela não está neste repositório. Os
webhooks reais foram entregues ao app pelo Stripe CLI oficial
(`stripe/stripe-cli:v1.32.0`, `stripe listen --forward-to`). Os segredos ficaram
só no processo e não aparecem aqui.

## Configuração pelo app

- `PUT /api/admin/pagamentos/stripe/test` com a chave, o segredo do webhook e os
  preços de Meta e Care: 200.
- Teste de conexão pelo app: "Conta acct_1SSyvB2WNvNFeBpk (BR, moeda BRL) em
  modo de teste. 4 preços de planos conferidos (valor, moeda e ciclo iguais ao
  catálogo)."
- Ativação do ambiente de teste: 200.

## Operações reais pela tela Admin → Faturamento

Todas foram feitas pelos botões e diálogos da tela, com a confirmação pelo
identificador da fatura. Cada resultado foi conferido na API da Stripe e no
MySQL.

| Operação                               | Fatura                          | Resultado no app                                                                     | Conferência na Stripe                                  |
| -------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| Atualizar histórico                    | conta de teste                  | 14 faturas, 14 pagamentos, 14 movimentos; depois 17 faturas e 1 reembolso            | páginas reais da API                                   |
| Reembolso parcial R$ 30,00             | `BQX215BE-0001` (R$ 79,90 paga) | Concluído; reembolso vinculado                                                       | `re_…u0jI` 3000 BRL `succeeded`, metadados da operação |
| Reembolso de R$ 60,00 (acima do saldo) | `BQX215BE-0001`                 | Recusado: "O valor solicitado supera o saldo reembolsável confirmado pelo provedor." | nenhum reembolso criado                                |
| Cancelar próxima renovação             | assinatura Care                 | `cancel_at_period_end = 1` no banco                                                  | `cancel_at_period_end: true`                           |
| Manter renovação                       | assinatura Care                 | `cancel_at_period_end = 0`                                                           | `cancel_at_period_end: false`                          |
| Excluir rascunho                       | `in_…5MFes7E6` (R$ 20,00)       | Concluído; registro local `deleted`                                                  | "No such invoice"                                      |
| Emitir fatura                          | R$ 10,00                        | Concluído; número `BQX215BE-0002`                                                    | `open`                                                 |
| Enviar fatura por e-mail               | `BQX215BE-0002`                 | Concluído                                                                            | `open` (envio aceito)                                  |
| Cancelar fatura                        | `BQX215BE-0002`                 | Concluído; local `void`                                                              | `void`                                                 |
| Emitir fatura                          | R$ 30,00                        | Concluído; `BQX215BE-0003`                                                           | `open`                                                 |
| Registrar inadimplência                | `BQX215BE-0003`                 | Concluído; local `uncollectible`                                                     | `uncollectible`                                        |

As três faturas de QA (R$ 10, R$ 20 e R$ 30) foram criadas na conta de teste
pela API, em rascunho e com cobrança manual, só para exercitar as ações.

## Idempotência, concorrência e permissões

- Dois pedidos simultâneos de reembolso de R$ 1,00 com o mesmo `requestId`: um
  retornou 200 e o outro 409 ("A operação ainda está em andamento"). Na Stripe
  existe um único reembolso de 100 centavos com esse identificador.
- Repetir o mesmo pedido devolveu o mesmo resultado, sem novo reembolso.
- O mesmo `requestId` com outro valor: 409 ("Este identificador já pertence a
  outra operação").
- Rotas de faturamento e de pagamentos: paciente 403 e visitante 401.

## Métricas por dia, mês e ano

Com dados reais importados: 17 faturas, valor nominal R$ 6.878,90, quitação
acumulada R$ 6.818,90 e reembolsos concluídos R$ 31,00 em 2 registros. Bruto,
taxas e líquido vêm dos movimentos de saldo. A série diária mostrou
18/10/2026 R$ 6.739,00 e 03/11/2026 R$ 79,90, e a anual mostrou 2026
R$ 6.818,90, coerentes com os movimentos.

## Defeitos encontrados e corrigidos

1. **Filtro de ambiente abria em "Produção" com a Stripe em modo de teste:**
   o histórico recém-importado ficava invisível e a tela dizia "Nenhuma fatura
   importada". Agora o primeiro recorte segue o ambiente em uso. Depois de
   atualizar o histórico, o filtro passa ao ambiente importado, a menos que o
   administrador tenha escolhido "Todos".
2. **Transbordo horizontal em 320 px:** eram três causas:
   - os seletores da série financeira tinham largura intrínseca maior que o
     cartão;
   - o identificador longo de uma fatura sem número não quebrava;
   - o botão "Atualizar conta da Stripe (Teste)" não quebrava a linha.

   Corrigidas com `min-w-0`/`w-full` nos campos, `break-all` no identificador e
   quebra permitida no botão. O transbordo caiu de 29 px para 0 em 1440, 390 e
   320 px, sem erros de console.

## Fronteira registrada

"Cancelar reembolso" só existe para reembolsos em `requires_action`. Reembolsos
de cartão de teste concluem na hora, então essa ação não pôde ser exercida com
um objeto real. Ela continua coberta pelos testes de contrato da SDK.
