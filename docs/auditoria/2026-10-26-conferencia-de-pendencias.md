# Conferência da continuidade e dos acessos por plano

Verificação da `main` em `1182e6cda2f56f009088d00b363779a5afe74339`, antes de implementar qualquer tarefa. O código atual e as evidências publicadas são a referência; a lembrança de outro chat não substitui essa conferência.

## Trabalho reaproveitado

- A landing `LandingPage.tsx`, `LandingJornada.css` e as quatro artes locais já estão publicadas e receberam alterações posteriores. O ZIP antigo não foi reaplicado.
- A tarefa 96 já implementou a fonte compartilhada de direitos, as dependências, os portões de páginas e as autorizações das APIs. A tarefa 104 já preserva o Perfil em todos os planos.
- A tarefa 105 foi conferida sobre essa implementação, sem reconstruir a matriz ou alterar regras comerciais. Navegação desktop/móvel e `AppShell` usam a mesma decisão de acesso; os serviços revalidam a matriz persistida.
- A tarefa 106 ainda não tem entrada comercial própria no menu. O painel existente de cobrança no Perfil e os serviços de checkout/portal serão reaproveitados quando ela for implementada.
- A tarefa 107 tem identificação do plano no rodapé do sidebar, mas ainda não ao lado do logo. O componente `PlanBadge` já existe; não há motivo para duplicar sua apresentação.

## Execução real nesta instância

Node 24.22.1, pnpm 11.28.4 e MySQL Community 9.7.2. A instalação congelada preservou o lockfile. Os 594 testes unitários e as 384 integrações em 44 arquivos passaram, assim como lint, formatação, tipos e build de produção. As integrações usam as Route Handlers e MySQL reais, com criação/remoção do banco de teste e cobertura de CRUD, isolamento, limites e revogação.

O runtime de produção respondeu `200` em `/api/health`, com banco saudável e 46 migrações aplicadas. Docker não está instalado nesta instância: o banco usado foi o binário oficial da mesma versão do Compose, em diretório temporário exclusivo de QA. Isso não comprova execução do Docker nem dos launchers Windows.

O ambiente isola a rede de cada comando e recusa sockets Unix. Banco, aplicação e testes foram executados como processos da mesma sessão, com MySQL em TCP local. O Chrome completo falhou no socket de instância; o Chromium Headless Shell oficial 151.0.7922.34 executou o Playwright. Não foram modificadas as proteções do ambiente nem o código do app para adaptar o QA.

## Percurso da tarefa 105

Em cada plano Free, Meta e Care, o QA habilitou os direitos pela API administrativa real, confirmou a assinatura efetiva, abriu as 11 rotas de usuário e conferiu conteúdo sem bloqueio comercial contraditório. A navegação móvel foi aberta em 390 e 320 pixels e seus 11 destinos foram conferidos, com clique no Perfil. No desktop, a largura foi de 1440 pixels. Não houve estouro horizontal nos estados verificados.

A desativação de Respiração pela matriz bloqueou a página direta e a API com `403`; a reativação restabeleceu a API em `200` e o conteúdo depois da recarga, na mesma sessão. Usuários comuns receberam `403` no catálogo administrativo. Os 78 controles individuais nos três planos, as dependências, cotas, sessões existentes e proteção de titular são cobertos também pela suíte de integração já existente e reexecutada.

As contas de QA usam dados sintéticos exclusivamente no banco temporário. Foram excluídas e a matriz foi restaurada ao final de cada percurso. Esses registros não representam usuários, medições, compras ou inferência de produção. O percurso foi repetido com sete páginas administrativas e axe-core 4.14.0 no chat, Perfil e matriz: 28–30 regras aprovadas, sem violações nos estados conferidos. Foram inspecionadas capturas desktop e mobile do Perfil; não se alegou pareamento de hardware, geração externa de imagem, RLHF ou transação oficial de pagamento.

## Evidências e limites

Logs locais desta execução: `/tmp/lyra-baseline-{unit,integration,lint,format,types,build,audit,outdated}.log`, `/tmp/lyra-qa-migrations.log` e `/tmp/lyra105-{browser,browser-exec,fix-format,fix-lint,lint,check-format}.log`. Capturas: `/tmp/lyra105-<plano>-<largura>.png` e desktop. Os logs e capturas são evidência local, não arquivos versionados nem garantia de disponibilidade em outra instância. `@current_problems` não está disponível neste ambiente.

A auditoria de dependências encontrou 15 avisos (2 críticos, 4 altos, 6 moderados e 3 baixos). A checagem funcional da 105 não é uma aprovação de segurança do aplicativo. Esses avisos precisam de investigação e atualização em tarefa própria; não foram ocultados ou tratados como corrigidos. As fronteiras externas das tarefas 86, 90 e 100 continuam válidas.
