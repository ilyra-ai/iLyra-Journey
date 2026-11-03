# QA geral no navegador (2026-11-03)

O app rodou em produção (`next start`, build da `main` em `d676eb8`) com o
MySQL 9.7.2 do Compose. O Chromium (Playwright) foi conduzido como uma pessoa
real, com sessão própria em cada perfil.

## Perfis

| Perfil        | Conta                                                           |
| ------------- | --------------------------------------------------------------- |
| Free          | conta nova, com mapa natal, criada pela própria API de cadastro |
| Care          | assinante real da Stripe de teste (tarefa 106)                  |
| Administrador | conta administrativa de QA                                      |

## Varredura de rotas

Cada perfil visitou as 35 rotas do menu lateral e do menu do usuário (todas as
de `src/components/layout/navigation.ts`), além de `/`, `/chat`, `/privacidade`,
`/termos` e `/onboarding`. Cada rota foi aberta em 1440 px e em 390 px.

Para cada página foram registrados:

- o status HTTP e o destino final;
- o título principal;
- os erros de console e de página;
- as respostas 4xx/5xx do próprio app;
- o transbordo horizontal;
- telas de erro.

| Perfil        | Páginas abertas                                                                   | Falhas do app |
| ------------- | --------------------------------------------------------------------------------- | ------------- |
| Free          | 70                                                                                | 0             |
| Care          | 70                                                                                | 0             |
| Administrador | 70 + varredura profunda de 39 links internos, inclusive as abas `?aba=` do painel | 0             |

A única resposta 404 foi `/billing`, que eu mesmo incluí na lista e que não
existe como página (o retorno do checkout é `/billing/success`). Nenhum link do
app aponta para ela.

Redirecionamentos conferidos:

- Free e Care: as rotas `/admin/*` voltam para o Painel (`/`), e `/onboarding`
  volta para `/` porque o cadastro já está concluído.
- Administrador: `/planos` vai para a gestão `/admin/plans`.

## Interações

- **Menu do usuário** (desktop e celular): Meu perfil, Privacidade e dados,
  escolha de tema (Claro, Escuro, Do sistema) e Sair.
- **Navegação móvel:** "Abrir navegação" mostra os 25 links. Tocar em "Metas"
  leva a `/goals` e fecha o painel.
- **Notificações:** o painel abre com o estado vazio explicado e com o atalho
  "Gerenciar lembretes".
- **Busca de páginas e ações** (Ctrl+K): "metas" lista Metas e páginas
  relacionadas, e a primeira opção leva a `/goals`.
- **Apresentação opcional:** "Agora não" fecha a apresentação.
- **CRUD de metas pela tela**, conferido no MySQL:
  1. Criar meta manual (título, categoria, unidade, alvo 12, progresso 2).
  2. Atualizar o progresso para 5.
  3. Excluir, com confirmação.

  A linha foi criada, atualizada (`current_value = 5`) e removida; o cartão
  sumiu da tela.

- **Gestão de usuários:** a busca encontrou a assinante pelo e-mail, mostrando
  plano Care, ciclo Mensal e status.
- **Abas administrativas de conteúdo:** Experiência Web, Hábitos Sugeridos,
  Dicas de IA, Conteúdo guiado e JSON completo. As demais páginas
  administrativas não têm abas.

Nenhuma etapa interativa gerou erro de console, erro de página, resposta 5xx do
app ou transbordo.

## Etapas anteriores com QA própria (registradas no painel)

- Faturamento: tarefa 100, com Stripe de teste real.
- Compra e upgrade: tarefa 106.
- Anexos: tarefa 127.
- Painel com IA: tarefa 115.
- Diário pessoal e `/dia` em abas: tarefas 135 e 136.
- Imagens do chat: tarefa 86.
- Treinamento por feedback: tarefa 90.

Os CRUDs de cada funcionalidade estão cobertos pelas 601 integrações com MySQL
real.
