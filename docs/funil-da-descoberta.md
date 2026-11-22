# Funil da descoberta

Tarefa 170. Painel em **Administração → Dados e relatórios → Funil da descoberta** (`/admin/funil`), só para administradores.

## Duas fontes, sem misturar

1. **Etapas anônimas**, na tabela `funil_contagens_diarias` (migração 082). Cada linha guarda dia, etapa, detalhe e total, e mais nada: nenhum nome, e-mail, data de nascimento, conversa, IP, agente do navegador, cookie ou identificador de pessoa ou aparelho. Sem dado pessoal, a tabela não entra na exportação nem na exclusão de conta da LGPD.
2. **Fatos que o banco já registra**, lidos na hora:
   - contas criadas (`users` + `profiles`, papel `patient`);
   - pagamentos confirmados (`billing_webhook_events`, `checkout.session.completed` processado);
   - faturas pagas (`invoice.paid` processado);
   - cancelamentos (`user_subscriptions.canceled_at`, origem `stripe`);
   - assinaturas ativas e a composição por opção de contribuição;
   - retorno D7/D30 (`chat_turns`);
   - custo de IA do mês (`ia_uso` com os preços de `ia_precos`).

Um pagamento só aparece depois de confirmado pelo webhook da Stripe. As etapas anônimas não seguem a mesma pessoa de uma etapa à outra, então as taxas do painel são tendência, não conversão individual.

## Etapas

A lista fechada fica em `src/lib/funil/etapas.ts`. Uma etapa ou detalhe fora dela é recusado com 400.

| Etapa                      | Quem conta | Detalhe                                | Onde                                                    |
| -------------------------- | ---------- | -------------------------------------- | ------------------------------------------------------- |
| `visita_landing`           | navegador  | —                                      | landing, uma vez por aba                                |
| `iniciou_descoberta`       | navegador  | `inicio`, `mapa`, `link`               | botão, cartão do mapa ocidental, link `/?experimente=1` |
| `nascimento_validado`      | servidor   | —                                      | `/api/public/descoberta`, dados aceitos                 |
| `leitura_entregue`         | servidor   | `signo`, `incerto`                     | `/api/public/descoberta`, leitura devolvida             |
| `cartao_compartilhado`     | navegador  | `compartilhar`, `baixar`               | cartão da tarefa 168, só depois de concluído            |
| `conteudo_premium_clicado` | navegador  | mapa pago da landing                   | cartões que abrem o convite                             |
| `modal_visto`              | navegador  | —                                      | convite da assinatura aberto                            |
| `modal_fechado`            | navegador  | —                                      | convite fechado sem escolher                            |
| `contribuicao_escolhida`   | navegador  | chave da opção (`colaboracao_999`…)    | convite                                                 |
| `login_iniciado`           | ambos      | `email` (navegador); `google`, `apple` | formulários; início do login social                     |
| `login_concluido`          | servidor   | `email`, `google`, `apple`             | depois da sessão criada                                 |
| `cadastro_concluido`       | servidor   | `email`, `google`, `apple`             | conta criada                                            |
| `checkout_iniciado`        | servidor   | chave da opção ou `plano`              | `/api/billing/checkout`, URL da Stripe criada           |

## Regras

- **Rota pública** `POST /api/public/funil`:
  - aceita só as etapas do navegador;
  - não lê cookie nem sessão;
  - limita o corpo a 512 bytes;
  - limita a 200 pedidos por hora por IP (o IP serve só para esse limite e não fica com a etapa);
  - não conta robôs conhecidos nem pedidos sem agente de navegador.
- **Deduplicação:** a visita conta uma vez por aba, com uma marca no `sessionStorage` que nunca é enviada. As demais etapas contam cada ação. A prévia do construtor não conta nada.
- **Fuso:** o dia é o civil de Brasília (UTC−3). Os períodos do painel são de 7, 30 ou 90 dias, até hoje.
- **Falhas:** medir nunca bloqueia a etapa medida. No servidor, a falha vai para o log só com o nome da etapa e o motivo técnico. No navegador, a falha é ignorada.
- **Retorno D7/D30:** entre as contas de pessoas criadas nos últimos 90 dias com pelo menos 7 (ou 30) dias de idade, quantas conversaram com a Lyra a partir do 7º (ou 30º) dia. Usa o que o banco já guarda; nenhuma visita nova é rastreada para isso.
- **Custo de IA:** usa os preços cadastrados em Configuração de IA. As chamadas em nuvem sem preço aparecem à parte e não entram no custo.

## Fora do escopo

Sem autorização comercial explícita, não há experimento A/B de preço ou de mensagem (item 6 da tarefa). Também não há coleta de renda, de identificador entre etapas, nem de dados de saúde, religião ou perfil emocional.
