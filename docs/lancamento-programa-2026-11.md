# Lançamento do programa de descoberta e assinatura única (tarefa 172)

Estado em 23/11/2026, na `main`. Este documento reúne as notas de mudança, como cada recurso fica exposto, a reversão de cada migração e o plano de incidentes. Os itens que dependem do titular (preço final, domínio, credenciais e produção) estão no fim, sem marcação de concluído.

## O que muda para quem usa

**Grátis, sem conta:**

- **Experimente Grátis:** signo solar ocidental, com incerteza na troca de signo, a partir de 13 anos.
- Leitura e reflexão do dia pelo Motor da Lyra, sem IA.
- Microconversa pela base curada.
- Cartão para compartilhar ou baixar, sem dado pessoal.

**Com conta:**

- **Cadastro:** e-mail e senha continuam. Google, Apple e chave de acesso entram quando você liga e configura cada um.
- **Leitura levada ao cadastro:** se a pessoa marcar a opção, nome e data seguem só na memória da janela até o cadastro e o onboarding.

**Assinatura única:**

- **Lyra Journey com duas contribuições** de mesmo acesso, R$ 9,99 e R$ 19,99, mostradas no convite e em /planos.
- **Mapa do assinante:**
  - Astrolábio Vivo (roda do mapa sideral);
  - "Perguntar à Lyra sobre este ponto", com o cartão do ponto na resposta;
  - Teatro dos Futuros (três histórias, NÃO É PREVISÃO).

**Administração:**

- Login social;
- Funil da descoberta, com produção e teste da Stripe, faturamento e coorte mínima;
- Centro de qualidade (37 verificações do Motor e qualidade da IA);
- Estúdio de publicação (versões, diferença e reversão).

## Como cada recurso fica exposto (padrão seguro)

| Recurso                          | Padrão                                                                                    | Quem liga                                                                                                         |
| -------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Checkout das duas contribuições  | **Fechado**: as opções aparecem como "sem preço na Stripe" e o servidor recusa o checkout | O titular: cria os dois preços na Stripe e cadastra os IDs e as credenciais em Visão Geral Admin → aba Pagamentos |
| Google e Apple                   | **Desligados** (migração 081) e o botão some da tela de login                             | O titular, em Administração → Login social                                                                        |
| Chaves de acesso                 | Botão só onde o navegador oferece WebAuthn; criar exige sessão                            | Cada pessoa, no Perfil                                                                                            |
| Grupos desativados da tarefa 144 | Continuam desligados; nada novo os reativa                                                | O titular, pelos interruptores existentes                                                                         |
| Mapas, Teatro e ponto do mapa    | Exigem o recurso `vedic_insights` do plano, conferido no servidor                         | Matriz de planos                                                                                                  |

Os interruptores não substituem permissões: toda rota confere sessão e plano no servidor. `pnpm check:rotas` prova isso: 231 rotas privadas recusam sem sessão, e as públicas por desenho estão listadas no script com o motivo.

## Banco: backup, repetição e reversão

- **Backup e restauração provados sem tocar no banco em uso:** `bash scripts/verificar-backup-restauracao.sh` faz um dump consistente, restaura num banco descartável e compara linhas e `CHECKSUM TABLE` de cada tabela. Em 23/11/2026: 111 tabelas idênticas; o descartável foi apagado.
- **Idempotência:** rodar `pnpm db:migrate` de novo não aplica nada (86 já aplicadas). Os gates aplicam todas as migrações num banco vazio a cada execução.
- **Reversão das migrações do programa:** todas são aditivas. Nenhuma altera ou apaga pagamento, fatura, assinatura ou registro fiscal. Reverter o código não exige reverter o banco: as tabelas novas ficam sem uso. Para remover de fato, faça backup antes e siga a ordem abaixo.

| Migração | O que criou                                                                         | Reversão (só com backup)                                                                                                                                                                                                                                                                                                                                             |
| -------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 084      | `site_page_config_versoes` (histórico de publicações)                               | `DROP TABLE site_page_config_versoes;` (o publicado atual continua em `site_page_configs`)                                                                                                                                                                                                                                                                           |
| 083      | `chaves_de_acesso`, `desafios_de_chave`                                             | `DROP TABLE desafios_de_chave; DROP TABLE chaves_de_acesso;` (as pessoas voltam a entrar por e-mail, Google ou Apple)                                                                                                                                                                                                                                                |
| 082      | `funil_contagens_diarias` (contagens anônimas)                                      | `DROP TABLE funil_contagens_diarias;`                                                                                                                                                                                                                                                                                                                                |
| 081      | `login_social_provedores`, `contas_sociais`                                         | Desligue os provedores primeiro; depois `DROP TABLE contas_sociais; DROP TABLE login_social_provedores;`. **Atenção:** contas criadas só pelo login social não têm senha utilizável, e o app não tem redefinição de senha por e-mail. Elas só entram de novo se tiverem uma chave de acesso cadastrada; antes de remover, avise essas pessoas e ofereça outro acesso |
| 080      | `ia_uso`, `ia_precos`                                                               | `DROP TABLE ia_uso; DROP TABLE ia_precos;` (perde o histórico de custo de IA)                                                                                                                                                                                                                                                                                        |
| 079      | Coluna `chat_conversations.title_source`                                            | `ALTER TABLE chat_conversations DROP COLUMN title_source;`                                                                                                                                                                                                                                                                                                           |
| 078      | `plan_contribution_options`, `stripe_contribution_prices` e o texto do plano `care` | Não reverter com assinaturas ativas nesses preços: a contribuição de cada assinatura vem do preço da Stripe. Sem assinaturas: `DROP TABLE stripe_contribution_prices; DROP TABLE plan_contribution_options;`                                                                                                                                                         |

## Testar o checkout no computador local

A Stripe não consegue chamar `localhost`, por isso o Stripe CLI recebe os eventos e repassa para o app.

1. Instale o CLI: `winget install Stripe.StripeCli`.
2. Faça `stripe login` ou passe a chave de teste pela variável `STRIPE_API_KEY`, nunca pela linha de comando.
3. Rode `stripe listen --print-secret`. Cole o `whsec_` que ele mostrar em Visão Geral Admin → aba Pagamentos → "Segredo de assinatura do webhook" e salve.
4. Deixe rodando: `stripe listen --events <lista da aba Pagamentos> --forward-to localhost:3000/api/webhooks/stripe`. A versão 1.55 exige a lista de eventos.
5. Assine em /planos com o cartão de teste `4242 4242 4242 4242`. A assinatura só fica ativa quando `checkout.session.completed` chega com resposta 200.

## Plano de incidentes

O responsável é o titular do projeto ou quem ele designar. Para cada gatilho, verificar e agir assim:

| Gatilho                   | Como aparece                                                                                     | Primeira ação                                                                                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Checkout duplicado        | Duas assinaturas ativas para a mesma pessoa em Administração → Faturamento                       | Cancelar a duplicada no portal da Stripe; o webhook atualiza o banco. O evento tem chave única, então reenviar não duplica                                                                               |
| Falha de webhook          | `billing_webhook_events` com status `error`; pagamento confirmado na Stripe sem assinatura ativa | Corrigir a causa e reenviar o evento pelo painel da Stripe; o reenvio é idempotente                                                                                                                      |
| Custo inesperado de IA    | Custo do mês no Centro de qualidade e em Configuração de IA acima do esperado                    | Rebaixar ou desligar o modelo em nuvem na cadeia; o modelo local e o Motor da Lyra continuam respondendo                                                                                                 |
| Dado vazado               | Relato ou achado em log                                                                          | Revogar sessões em Administração → Usuários (versão de sessão), rotacionar `AUTH_SECRET` se necessário (todas as sessões caem) e seguir a LGPD (comunicação à ANPD e às pessoas afetadas, quando couber) |
| Login social com problema | Erros `recusado` ou `expirou` repetidos                                                          | Desligar o provedor em Administração → Login social; e-mail e senha continuam                                                                                                                            |

## Depende do titular (não marcado como concluído)

1. **Preço final:** os valores implementados são R$ 9,99 e R$ 19,99 (tarefas 160 e 226).
   - **Em teste, já cadastrados e cobrados (24/11/2026):** produto Lyra Journey com os dois preços mensais em BRL. Um checkout real em modo teste ativou a assinatura pelo webhook, com 5 eventos e todos respondidos com 200.
   - **Falta para produção:** criar os mesmos preços em modo live e confirmar a decisão comercial.
2. **Domínio e HTTPS de produção:** `APP_BASE_URL` com https, retorno do Google e da Apple cadastrado, e chaves de acesso no domínio final (o RP ID é o domínio).
3. **Stripe de produção:** chaves live e webhook de produção com os eventos `checkout.session.completed`, `customer.subscription.*`, `invoice.*` e `refund.*`, conforme a lista da aba Pagamentos do admin.
4. **Publicação no servidor de produção e monitoramento na janela de lançamento:** o funil, o centro de qualidade e o faturamento já são os painéis para isso.
5. **QA pós-lançamento no ambiente real**, com contas de validação, sem cobrança live sem autorização.
