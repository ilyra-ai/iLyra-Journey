# Tarefa 106 · Compra e upgrade reais com a Stripe de teste (2026-11-02)

Usamos o mesmo ambiente da tarefa 100: app em produção, conta de teste da
Stripe "Área restrita de New business" configurada pelo próprio app e webhooks
reais entregues pelo Stripe CLI oficial. O navegador (Chromium) foi conduzido
como uma pessoa comum, com uma conta nova no plano Free.

## Compra do plano Meta

1. Em `/planos`, clique em **Assinar Meta mensal**. O app abriu o Checkout
   hospedado da Stripe (`checkout.stripe.com`, modo teste).
2. Pagamento com o cartão de teste oficial 4242, em BRL.
3. A Stripe devolveu a pessoa a `/billing/success`, que mostrou "Checkout
   recebido" enquanto o webhook era processado.
4. O Stripe CLI entregou 12 eventos e o app respondeu 200 em todos. Entre eles:
   - `checkout.session.completed`;
   - `customer.subscription.created`;
   - `invoice.paid`.
5. Banco: `meta · active · monthly · stripe`, preço
   `price_1URtTY2WNvNFeBpkQznk0VQ7`, período até 03/12/2026. O Free ficou
   `replaced`.
6. Portal da Stripe: fatura de R$ 79,90 paga.

## Upgrade para Care

1. Como assinante Meta, `/planos` passou a mostrar **Gerenciar cobrança no
   portal**, a jornada prevista para quem já tem assinatura na Stripe.
2. No portal: Atualizar assinatura → Care (R$ 249,90/mês) → Confirmar. A
   Stripe calculou o rateio da troca.
3. O webhook `customer.subscription.updated` chegou com 200, e o banco passou a
   `care · active · monthly`, preço `price_1URtTZ2WNvNFeBpkkhz36F71`.
4. O selo ao lado do logo e o menu passaram a mostrar **Care**.

## Menu e perfis

- Pessoa comum: o link **Planos** leva a `/planos`.
- Administrador: `/planos` redireciona para a gestão (`/admin/plans`), e o
  link **Planos** do menu aponta para a gestão, não para a compra.
- `/planos` sem transbordo e sem erros de console em 1440, 390 e 320 px, nos
  dois perfis.

## Observação sobre moeda no Checkout

Com o navegador da sessão localizado nos EUA, o Checkout abriu em USD
(conversão automática da Stripe, _Adaptive Pricing_), com a opção BRL ao lado.
A compra foi feita em BRL, como no catálogo. Uma pessoa no Brasil vê BRL. Essa
conversão é uma configuração da conta da Stripe e não foi alterada no app.
