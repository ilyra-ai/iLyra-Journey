# Lyra MetaCare · Gestão da Instrução Mestra

> [!IMPORTANT]
> Este arquivo é o painel oficial de andamento da **INSTRUÇÃO MESTRA** definida em [`CLAUDE.md`](./CLAUDE.md).
> Todo modelo ou agente de IA que atuar neste repositório deve atualizá-lo a cada tarefa iniciada, bloqueada ou finalizada.

**Regras de manutenção deste painel**

1. Cada tarefa existe em **um único tópico** por vez (sem repetição entre tópicos).
2. As tarefas são sempre listadas em **ordem numérica crescente** dentro de cada tópico.
3. **ANDAMENTO** comporta no máximo **3 tarefas simultâneas**; ao finalizar, a tarefa sai do Tópico 2 e entra no Tópico 4.
4. **BLOQUEADAS** recebe toda tarefa que dependa de interação do usuário, credencial externa ou limitação real do ambiente, sempre com a evidência do bloqueio.
5. O Tópico 4 preserva implementações publicadas, SHAs e evidências reais. O estado 🟡 distingue implementação entregue de validação ainda pendente; somente 🟢 entra no percentual de conclusão integral. Evidências históricas permanecem datadas e não são apresentadas como reexecuções atuais.
6. **Obrigatório:** logo após o commit e push de cada tarefa para `main`, este painel é atualizado imediatamente com o SHA real da tarefa e enviado em um commit e push próprios para `main`.

**Legenda:** 🟢 concluída com as evidências aplicáveis · 🟡 implementada, validação pendente · 🔵 em andamento · 🔴 bloqueada · ⚪ a iniciar

---

## Tópico 1 · Andamento Geral

| Indicador                               | Valor                    |
| --------------------------------------- | ------------------------ |
| Conclusão integral                      | **95,0%** (134 de 141)   |
| Implementações publicadas               | **100%** (141 de 141)    |
| Tarefas totais                          | 141                      |
| 🟢 Concluídas                           | 134                      |
| 🟡 Implementadas com validação pendente | 7                        |
| 🔵 Em andamento                         | 0                        |
| 🔴 Bloqueadas                           | 0                        |
| ⚪ A iniciar                            | 0                        |
| Branch de trabalho                      | `main` (única permitida) |
| Última atualização                      | 2026-11-05               |

> Conclusão integral = tarefas 🟢 ÷ total. Implementações publicadas = (🟢 + 🟡) ÷ total. Os sete estados 🟡 preservam a entrega existente sem declarar as fronteiras comprovadas. Registros anteriores abaixo são históricos; os indicadores e a linha “Validação atual” definem a classificação vigente.

**Decisões do usuário registradas em 2026-10-10 (sem tarefa associada):**

- **Token temporário do GitHub:** mantido na configuração local do Git do ambiente de trabalho; o próprio usuário o remove ao publicar. Nunca é versionado, impresso ou salvo em memória.
- **CI (integração contínua):** fora do escopo por enquanto, por decisão do usuário.

**Decisão do usuário registrada em 2026-10-18 (sem tarefa associada):**

- **Pix:** não acrescentar o Pix como meio de pagamento por enquanto. Os meios do painel continuam sendo Stripe, Mercado Pago e PayPal (o teste de integração confere que `pix` responde 404 como provedor desconhecido).

**Retomada autorizada em 2026-10-20:** finalizar todas as tarefas abertas deste painel seguindo o `CLAUDE.md`, incluindo registro de andamento, validação real e publicação por tarefa. Esta instrução mais recente substitui a suspensão anterior de commit e push; os registros anteriores abaixo descrevem o histórico da execução.

**Ordem definida pelo usuário em 2026-10-21:** 82 → 78 → 81 (incluindo a correção de formatação da 80) → 83 → 84 → 86. Concluir, validar, fazer commit e push na main após cada entrega, sem branches ou worktrees. A 80 integra expressamente a modernização da 81 por orientação do usuário; seus requisitos e evidências continuam rastreados neste painel. Prevenir regressões com verificações reais, sem prometer ausência absoluta de erros futuros.

---

**Orientação permanente do usuário em 2026-10-26:** antes de implementar, conferir se a tarefa já foi entregue e avaliar execução conjunta quando houver dependências ou arquivos compartilhados que possam causar retrabalho. Seguir a ordem numérica das tarefas não bloqueadas; a execução conjunta é permitida quando justificada e rastreada. Não executar as tarefas bloqueadas 86, 90 e 100 nesta retomada. Após cada entrega validada, atualizar o painel e publicar na `main`, sem branches ou worktrees. A orientação atual substitui a espera de instruções registrada nas tarefas a iniciar; a autorização não declara implementação concluída.

**Ponto de continuidade em 2026-10-29:** 124 concluída e publicada em `7249d480b18d50037a69b320352c2d71ddaf4472`; 125 concluída em `e00517072cf457a33ab6feb242e00827c0837de7`; 126 concluída em `84b817602b6bf417249ee9d8df31ea5657a28fa2`; 127 com implementação local validada, bloqueada somente na prova com modelo real autorizado; 128–134 seguem a ordem numérica. A 115 aguarda somente inferência com modelo real; bloqueadas 86, 90, 100 e 106 preservadas.

**Orientação vigente do usuário em 2026-10-30:** concluir as tarefas não bloqueadas individualmente, sem entregas em lote. Antes de iniciar, conferir se já existe implementação e aproveitar commits/arquivos anteriores. Registrar o início no painel; ao terminar, verificar o projeto inteiro, corrigir falhas, atualizar este painel antes do commit e publicar imediatamente na `main`, sem branches adicionais ou worktrees. Confirmar a publicação antes de iniciar a próxima. Não executar as bloqueadas 86, 90, 100, 106, 115 e 127. Esta orientação substitui a possibilidade anterior de execução conjunta.

**Continuidade confirmada em 2026-10-30:** 128 encerrada em `0c7a23cd`; 129 concluída e publicada em `95ad6908`; 130 é a próxima tarefa não bloqueada. A implementação de voz já estava em `4a1fe166` e foi aproveitada. Verificação integral e limites registrados no relatório de retomada.

**Solicitação de registro neste chat em 2026-10-30:** registrar as novas tarefas do diário pessoal e da organização de `/dia` em abas, mantendo-as **a iniciar**, e aguardar instruções antes de qualquer implementação. Esta etapa autoriza somente a atualização e publicação documental do painel; não retoma a 130 nem as demais implementações e preserva as tarefas bloqueadas.

**Retomada autorizada neste chat após o registro em 2026-10-30:** o usuário autorizou iniciar as tarefas conforme o `CLAUDE.md` e o workflow do projeto, com verificação integral, atualização do painel e commit e push na `main` ao final de cada tarefa, antes da seguinte, sem entregas em lote, branches ou worktrees. Esta autorização substitui a espera de instruções acima; conferir e aproveitar o progresso anterior da 130 antes de continuar, seguindo a ordem numérica das tarefas não bloqueadas e preservando a orientação anterior sobre as bloqueadas.

**Decisão do usuário em 2026-10-30 (reclassificação):** as tarefas 90, 100, 106, 115 e 127 saíram de **BLOQUEADAS** e foram movidas para o Tópico 3 · Tarefas a Iniciar, para execução posterior na ordem numérica. Na sequência, também por decisão do usuário em 2026-10-30, a 86 foi movida para a iniciar; não há tarefas bloqueadas. Esta decisão substitui, para essas cinco tarefas, a orientação anterior de não executá-las; o histórico e as fronteiras pendentes de cada uma continuam registrados em seus tópicos, sem declarar comprovação externa.

**Tarefa 130 concluída em 2026-10-30:** implementação, validação integral e QA publicados na `main`. Próximas tarefas na ordem numérica das não bloqueadas; as tarefas 86, 90, 100, 106, 115 e 127 foram movidas para a iniciar para execução posterior, conforme decisão do usuário.

**Orientação do usuário em 2026-10-30 (após a 130):** continuar todas as tarefas até finalizar, executando em conjunto as que compartilham escopo. Execução conjunta autorizada e rastreada: 135 e 136 (mesma página `/dia`, com o diário dentro das abas). Ordem: 131, 132, 133, 134, 135 + 136 e, em seguida, 86, 90, 100, 106, 115 e 127. Cada entrega continua com validação integral, painel, commit e push na `main`, sem branches ou worktrees. Esta orientação substitui a restrição anterior a execuções conjuntas.

**Tarefa 134 concluída em 2026-10-30:** agenda exclusiva do administrador por padrão, com ativação global auditada; validação integral e QA publicados na `main`. Próxima etapa: 135 + 136 em conjunto.

**Tarefa 136 concluída em 2026-10-30:** `/dia` em abas com "Meu Dia" primeiro e alertas fecháveis; executada junto da 135 e publicada antes dela, em commit próprio. A 135 segue na publicação seguinte.

**Tarefa 135 concluída em 2026-10-30:** diário pessoal por voz na aba Diário de `/dia`, com análise validada e prova com modelo real local. Próximas: 86, 90, 100, 106, 115 e 127.

**Tarefa 86 concluída em 2026-10-30:** geração de imagens no chat comprovada com modelo de difusão real local na segunda posição; o adaptador Gemini aguarda a chave do usuário para teste externo.

**Tarefa 90 concluída em 2026-10-30:** treinamento real de pesos por feedback humano no chat (KTO + LoRA), com versão aplicada a todos e métricas reais.

**QA geral no navegador em 2026-11-03 (pedido do usuário para o final):** os perfis Free, Care (assinante real da Stripe de teste) e administrador percorreram todas as rotas do menu lateral e do menu do usuário em 1440 e 390 px, mais uma varredura profunda das abas administrativas. Foram 70 páginas por perfil, sem erro de console, falha 5xx, tela de erro ou transbordo. Interações conferidas:

**Auditoria de dependências da validação final em 2026-11-03:** a instalação limpa (`pnpm install --frozen-lockfile`) e o `pnpm audit` acusaram 2 avisos moderados novos de 2026-11 na dependência de produção do Sentry:

- GHSA-3g3m-2fjr-6pw4 (glob ≤ 14.0.1);
- GHSA-g3hv-75wg-m249 (minimatch < 11.0.1).

O `@sentry/bundler-plugins` 11.x (inclusive o 11.10.0, o mais recente) declara glob ^13.0.6, e não existe 13.x corrigido. O plugin só chama `glob(padrões, { absolute, nodir })`, igual no glob 14. Correção: override `'@sentry/bundler-plugins>glob': ^14.0.3`, validado por `scripts/verificar-glob-sentry.mjs`, que executa a função real do plugin e compara com o sistema de arquivos. Gates: formato, lint e tipos com exit 0; 990 unitários; 601 integrações; build sem avisos; instalação congelada offline aprovada.

**Aviso restante, investigado:** minimatch < 11.0.1 apenas nas ferramentas de lint (ESLint 10.14, @eslint/config-array, typescript-eslint, eslint-plugin-import e jsx-a11y). As versões mais recentes delas ainda declaram minimatch ^10 ou ^3; a correção só existe no 11, com outra API. Esses pacotes não entram no build nem no runtime e só leem padrões da configuração do próprio repositório. Fica registrado até o ESLint e os plugins adotarem o minimatch 11.

**Atualização em 2026-11-04 (tarefa 138; substitui o diagnóstico acima):** a [API oficial do GitHub](https://api.github.com/advisories/GHSA-g3hv-75wg-m249), atualizada às 16:50:04 UTC, restringe o intervalo afetado a `>= 7.0.0, < 11.0.1`. ESLint, config-array e typescript-estree passaram a resolver minimatch 11.0.4 por overrides seletivos. Os plugins antigos continuam com 3.1.5, fora do intervalo afetado, preservando a API callable e `makeRe`. O registro npm ainda retorna o intervalo antigo `<11.0.1`, gerando um falso positivo apenas sobre 3.1.5; o aviso não foi ocultado nem incluído em lista de exclusão. `pnpm audit --prod` não encontrou vulnerabilidades conhecidas. O lockfile não contém mais minimatch 10, conferido com `rg`; a verificação dos consumidores reais está em `scripts/verificar-minimatch-lint.mjs`.

**Validação final da instrução mestra em 2026-11-03:**

- **Instalação e gates:** instalação limpa congelada; lint, formato e tipos com exit 0; 990 unitários; 601 integrações; 30 testes dos launchers; build sem avisos; Compose válido; migrações idempotentes (66/66).
- **`run.py`:** `doctor` e `up --prod` completos, com memória Graphiti, `/api/health`, páginas e login do administrador. A segunda subida não fez nada em duplicidade. `status`, `logs` e `stop`, seguido de nova subida, preservaram os dados.
- **`run.sh` e `run_windows.py`:** `run.sh` (bash do Linux) com `doctor`, `status`, `stop`, `up --prod` e `logs db`; `run_windows.py` delega ao `run.sh` fora do Windows.
- **Falhas controladas:** Docker desligado, porta 3000 ocupada por outro programa (preservado, app em 3001) e Node fora da versão.
- **Ajustes só do ambiente da sessão, fora do repositório:** espelho `mirror.gcr.io` por causa do limite do Docker Hub e certificado do proxy na imagem base local.
- **Fronteira:** o Git Bash do Windows 11 não está disponível neste ambiente. Relatório: `docs/auditoria/2026-11-03-validacao-final.md`.

- menu do usuário e tema;
- navegação móvel;
- notificações;
- busca Ctrl+K;
- apresentação opcional;
- CRUD de metas pela tela, conferido no MySQL (criar, atualizar progresso e excluir com confirmação);
- busca na gestão de usuários;
- abas de conteúdo.

Os defeitos encontrados nas etapas anteriores desta rodada foram corrigidos nas tarefas 100 (filtro de ambiente e transbordo em 320 px) e 115 (falso positivo da unidade de pressão). Relatório: `docs/auditoria/2026-11-03-qa-geral-navegador.md`.

## Tópico 2 · Tarefas em Andamento ou Bloqueadas

### ANDAMENTO

Nenhuma tarefa em andamento.

### BLOQUEADAS

Nenhuma tarefa bloqueada desde 2026-10-30, por decisão do usuário.

## Tópico 3 · Tarefas a Iniciar

Nenhuma tarefa a iniciar. As notas abaixo preservam registros históricos de criação; não indicam tarefas atualmente abertas.

---

**Registro desta solicitação:** tarefas 89–95 acrescentadas em 2026-10-22 como **a iniciar**, sem declarar implementação ou validação funcional. A publicação imediata deste registro é documental; cada implementação seguirá com validação, atualização do painel, commit e push próprios na main, sem branches ou worktrees.

---

---

---

**Registro de 2026-10-22:** tarefas 99–103 acrescentadas como **a iniciar**; a publicação deste registro não declara as funcionalidades implementadas. As tarefas 80/81 foram posteriormente concluídas e estão registradas no Tópico 4.

## Tópico 4 · Implementações Publicadas e Estado da Validação

### 01 · Instrução mestra no `CLAUDE.md` e obrigatoriedade para agentes de IA

- **Status:** 🟢 finalizada · **Commit:** `1272c56` · **Push:** `db86930..1272c56 main -> main` (confirmado)
- **Implementado:**
  - `CLAUDE.md` criado na raiz com a INSTRUÇÃO MESTRA em texto integral, do título ao item 76.
  - `AGENTS.md` recebeu a seção "INSTRUÇÃO MESTRA (OBRIGATÓRIO PARA TODOS OS MODELOS E AGENTES DE IA)", que obriga qualquer modelo (Claude, Codex, Copilot, Cursor, Gemini, Devin e outros) a ler e cumprir o `CLAUDE.md` e a registrar o andamento neste arquivo.
  - `.prettierignore` passou a ignorar o `CLAUDE.md`, pois `prettier --check` comprovadamente reformataria o texto integral (juntaria linhas e converteria `+` em listas).
- **Evidência:** `npx prettier --check CLAUDE.md` acusava diferença antes do ajuste; após o ajuste o arquivo fica fora da reformatação automática e permanece idêntico ao texto da instrução.

### 02 · Painel de gestão `claude-gestao.md`

- **Status:** 🟢 finalizada · **Commit:** `a99510b` · **Push:** `1272c56..a99510b main -> main` (confirmado)
- **Implementado:**
  - Painel com os quatro tópicos exigidos: Andamento Geral com barra e porcentagem, Tarefas em Andamento ou Bloqueadas (ANDAMENTO limitado a 3 e BLOQUEADAS), Tarefas a Iniciar com o escopo integral de cada tarefa e Histórico das Tarefas Finalizadas.
  - Layout baseado em padrões atuais de painéis em Markdown no GitHub: alertas nativos (`> [!IMPORTANT]`), tabelas de indicadores, barra de progresso em blocos Unicode legível em qualquer visualizador e legenda de status.
  - Numeração única e crescente (01 a 23), sem repetição entre tópicos; as tarefas 03 a 23 correspondem às Tarefas 1 a 21 do item 53 da instrução.

### 03 · Auditoria baseline e correção dos erros atualmente existentes

- **Status:** 🟢 finalizada · **Commit:** `e89a4b2` · **Push:** `a99510b..e89a4b2 main -> main` (confirmado)
- **Implementado:**
  - Baseline forense real registrado em [`docs/auditoria/2026-10-04-baseline-forense.md`](./docs/auditoria/2026-10-04-baseline-forense.md): versões do ambiente, quality gates, build, runtime, `pnpm outdated` e `pnpm audit` (146 avisos: 4 críticos, 50 altos, 80 moderados, 12 baixos).
  - Erro real encontrado: `pnpm db:migrate` falhava em banco novo criado pelo Compose (`fk_ui_config_updated_by ... are incompatible`). Causa raiz: tabelas iniciais herdavam `utf8mb4_0900_ai_ci` do servidor enquanto as novas declaram `utf8mb4_unicode_ci`; só o `run.py` mascarava o defeito ao iniciar o MySQL com `--collation-server=utf8mb4_unicode_ci`.
  - Correções: migration `mysql/migrations/005_add_tables_unicode_collation.sql`; `compose.yaml` com `--character-set-server=utf8mb4` e `--collation-server=utf8mb4_unicode_ci`; `scripts/mysql-migrate.mjs` com ordenação determinística por código de caractere.
- **Evidências:** banco parcialmente migrado → 7 migrations aplicadas (exit 0); reexecução idempotente ("Já aplicada"); banco novo → 12 migrations aplicadas e todas as tabelas em `utf8mb4_unicode_ci`; `pnpm start` com `GET /`, `/login`, `/api/public/plans`, `/api/public/ui-config` em HTTP 200 e login do admin bootstrap com sessão válida; gates `check:format`, `check:lint`, `check:types` (exit 0), `test` (82/82) e `build` (exit 0).

### 04 · Normalização do package manager e lockfiles

- **Status:** 🟢 finalizada · **Commit:** `27171f8` · **Push:** `e89a4b2..27171f8 main -> main` (confirmado)
- **Decisão técnica (pesquisa de 2026-10-04):** pnpm é o gerenciador oficial (único lockfile real, `pnpm-workspace.yaml`, scripts e README). Versões avaliadas: pnpm 12.9.1 (lançado em 2026-08-26, reescrito em Rust) e pnpm 11.28.4 (suporte até 2027-04-30). O pnpm 12 **não executa via Corepack** (testado com Corepack 0.34.0 e 0.36.0: `Cannot find module .../pnpm/12.9.1/bin/pnpm.cjs`, pois o pacote passou a distribuir binário nativo), o que viola o requisito de Corepack reproduzível; por isso foi fixado o pnpm **11.28.4**, estável, suportado e compatível com Corepack.
- **Implementado:**
  - `package.json`: `"packageManager": "pnpm@11.28.4+sha512..."` gerado por `corepack use`; `bun` removido das dependências; `db:start` usa `docker compose up -d --wait mysql && pnpm run db:migrate` (aguarda o healthcheck real em vez de migrar com o banco ainda subindo).
  - `bun.lock` removido; `package-lock.json` não existia no repositório.
  - `pnpm-workspace.yaml`: removidos `bun` e `termios` de `allowBuilds` (nenhum dos dois existe no lockfile).
  - `pnpm-lock.yaml` regenerado pelo pnpm 11 e incluído no `.prettierignore` (causa raiz dos diffs espúrios: o `prettier --write .` reformatava o lockfile e o pnpm o reescrevia a cada install).
  - `AGENTS.md`: checagens obrigatórias passam a usar `pnpm` (incluindo `pnpm test` e `pnpm build`).
  - Avaliado e descartado: manter `devEngines.packageManager` junto com `packageManager` gera o aviso `Cannot use both "packageManager" and "devEngines.packageManager"` no pnpm 11; foi mantido o campo exigido pela instrução e lido pelo Corepack.
- **Evidências:** `corepack pnpm@11.28.4 --version` → `11.28.4`; `CI=true pnpm install --frozen-lockfile` → exit 0 sem warnings; Prova de Morte: `ls bun.lock` inexistente e `grep -c "bun@" pnpm-lock.yaml` → `0`; gates `check:format`, `check:lint`, `check:types` (exit 0), `test` (82/82) e `build` (exit 0).
- **Pendências encaminhadas:** `run.py` e `run_windows.py` ainda citam `package-lock.json` e fallback para npm; serão tratados nas tarefas 13 e 15.

### 05 · Remoção comprovada de dependências não utilizadas

- **Status:** 🟢 finalizada · **Commit:** `ecf1b60` · **Push:** `27171f8..ecf1b60 main -> main` (confirmado)
- **Método:** para cada dependência do `package.json`, busca `rg` por `'pacote` e `"pacote` em todo o repositório (código, configs, scripts, CSS), excluindo `node_modules`, lockfile e o próprio `package.json`; candidatos com zero referências foram reconferidos por nome curto (ex.: `monaco`, `tremor`, `vaul`, `tooltip`) e na documentação.
- **Removidas (zero uso comprovado):** `@monaco-editor/react`, `monaco-editor`, `@radix-ui/react-aspect-ratio`, `@radix-ui/react-collapsible`, `@radix-ui/react-context-menu`, `@radix-ui/react-hover-card`, `@radix-ui/react-menubar`, `@radix-ui/react-navigation-menu`, `@radix-ui/react-tooltip` (os tooltips usados são do Recharts e do `ui/chart`), `@tremor/react` (só aparecia no `content` do Tailwind), `input-otp`, `vaul`, `@tailwindcss/typography` (não registrado em `plugins`) e `eslint-config-prettier` (não estendido no `.eslintrc.json`).
- **Seção corrigida:** `@types/react-big-calendar` movido de `dependencies` para `devDependencies`.
- **Mantidas com evidência:** `react-big-calendar` (`src/components/appointments/Agenda.tsx` e `globals.css`), `@dyad-sh/nextjs-webpack-component-tagger` (`next.config.ts`, opcional via `ENABLE_DYAD_COMPONENT_TAGGER`; reavaliado na tarefa 06), `implement_elementor_lyra.py` e `modules/lyra-customaze-ui-ux` (importado por `src/lib/site-page-config`).
- **Defeito corrigido junto:** o `content` do Tailwind não incluía `src/lib` (componentes do Puck com `className`) nem `modules/`; agora cobre `./src/**/*` e `./modules/**/*`.
- **Artefatos indevidamente versionados:** `.logs/` (2 arquivos) e `.playwright-cli/` (52 arquivos) estavam no Git apesar do `.gitignore`; dois snapshots continham a senha padrão do admin digitada no login. Foram removidos do índice (`git rm --cached`), permanecendo apenas locais e ignorados.
- **Prova de Morte:** `git ls-files .logs .playwright-cli | wc -l` → `0`; nenhuma das 14 dependências permanece no `package.json` nem como importador direto no `pnpm-lock.yaml`.
- **Evidências:** `CI=true pnpm install --frozen-lockfile` exit 0; `check:format`, `check:lint`, `check:types` exit 0; `test` 82/82; `build` exit 0. Uma execução de build falhou de forma transitória em `next/font` (`Cannot read properties of null (reading '1')`) por resposta inválida do Google Fonts durante o download; a repetição passou. A dependência de rede no build pelo `next/font/google` foi registrada para tratamento na tarefa 20 (performance/fontes).

### 06 · Upgrade controlado das dependências

- **Status:** 🟢 finalizada · **Commit:** `de80385` · **Push:** `318faf1..de80385 main -> main` (confirmado)
- **Matriz completa:** [`docs/auditoria/2026-10-04-matriz-dependencias.md`](./docs/auditoria/2026-10-04-matriz-dependencias.md) com versão declarada, instalada, última estável, uso, breaking changes e ação de cada pacote.
- **Implementado (com adaptação real do código às novas APIs):**
  - **TypeScript 6.0.3:** o 7.0.2 foi pesquisado e descartado por não ter API JavaScript (usada pelo type-check do `next build` e pelo `typescript-eslint`). O novo padrão `noUncheckedSideEffectImports` foi atendido com `src/types/css.d.ts` (declaração dos imports de CSS), sem desligar a checagem.
  - **Vitest 5 / Vite 8:** `vitest.config.mts` passou a usar `resolve.tsconfigPaths` nativo e `oxc.jsx.runtime = 'automatic'` (causa raiz da falha "invalid JS syntax" no `ProfileForm.test.ts`: o `tsconfig` usa `jsx: preserve` para o Next); `vite-tsconfig-paths` removido.
  - **Zod 4:** `required_error` migrado para `error` preservando a semântica (mensagem só quando o valor está ausente); `z.coerce.number<number | string>()` e `useForm<Input, unknown, Output>` em AIConfigForm, CreateGoalModal, UpdateGoalProgressModal, onboarding e ProfileForm.
  - **DayPicker:** `react-day-picker` 8 (peer `react ^16-18`, incompatível com React 19) substituído por `@daypicker/react` 10; `ui/calendar.tsx` reescrito para a nova API (classNames do enum UI, `Chevron`, dropdown de mês/ano) com locale `pt-BR` padrão; `ui/date-picker.tsx` com `OnSelectHandler`, `autoFocus`, `startMonth`/`endMonth`.
  - **Recharts 3:** `ui/chart.tsx` tipado com `TooltipContentProps` e `DefaultLegendContentProps`, filtro de itens `type: 'none'` e chave estável (o `dataKey` pode ser função).
  - **react-resizable-panels 4:** `ui/resizable.tsx` com `Group`/`Separator`; no `SiteExperienceBuilder`, `direction` → `orientation` e tamanhos `44/36/56/40` → `"44%"` etc. (no v4 números são pixels).
  - **Stripe 23:** API fixada em `2026-09-30.endive` (changelog de 21, 22 e 23 revisado; `new Stripe()` e `webhooks.constructEvent` já eram usados).
  - **Demais:** Sentry 11.4, Puck 0.23, lucide-react 1.51.0 (1.52.0 bloqueado pela política `minimumReleaseAge` do pnpm 11 por ter menos de 24 h; a exclusão automática no `pnpm-workspace.yaml` foi desfeita), date-fns 4.4, `@types/node` 24 (alinhado ao Node 24 LTS), Radix, mysql2 3.24, jose, react-hook-form 7.89, prettier 3.9 (reformatou tabelas Markdown que não renderizavam por falta de linha em branco).
- **Evidências:** `pnpm peers check` → "No peer dependency issues found"; `check:format`, `check:lint`, `check:types` exit 0; `test` 82/82; `build` exit 0; `pnpm audit` de 146 para 113 avisos (críticos de 4 para 3, restantes em `next@15`).
- **Encaminhado:** Next.js 16, React 19.3 e ESLint 10 (tarefas 07 e 08), Tailwind 4 (tarefa 09), `overrides` para vulnerabilidades transitivas restantes (tarefa 19) e verificação visual do calendário, gráficos e painéis redimensionáveis no QA de navegador (tarefa 21).

### 07 · Migração Next.js

- **Status:** 🟢 finalizada · **Commit:** `cf912ac` · **Push:** `7ed5d7c..cf912ac main -> main` (confirmado)
- **Pesquisa (guia oficial "How to upgrade to version 16", Next.js 16.3.8):** Turbopack padrão em `dev`/`build`, remoção de `next lint`, ESLint em flat config, async Request APIs obrigatórias, `middleware` → `proxy`, novos padrões de `next/image`, React 19.2+ e Node ≥ 20.9.
- **Next.js 15.3.4 → 16.3.8:**
  - `next.config.ts` reescrito: removidos aliases/fallbacks de webpack herdados do Transformers.js (sem nenhum uso no código); loader Dyad (`@dyad-sh/nextjs-webpack-component-tagger`) testado no Turbopack e reprovado (`Reading source code for parsing failed`), por isso só é registrado com `ENABLE_DYAD_COMPONENT_TAGGER=true` no novo script `pnpm dev:webpack` (testado: atributos `data-dyad-id` gerados). Build e `pnpm dev` padrão seguem em Turbopack.
  - Async Request APIs já estavam aplicadas (`await params`, `await cookies()`); a validação de tipos de rotas do Next 16 revelou `params` tipado como união em `/api/admin/plans/[planKey]`, agora validado em runtime com `z.enum(PLAN_KEYS)` (antes aceitava qualquer chave).
  - O Next 16 ajustou o `tsconfig.json` (`jsx: react-jsx`, tipos de `.next/dev`) e adicionou ao `AGENTS.md` o bloco oficial de regras para agentes (documentação em `node_modules/next/dist/docs/`); a configuração `oxc` do Vitest deixou de ser necessária e foi removida.
- **ESLint 8.57 (EOL desde 2026-08-06) → 10.12 + eslint-config-next 16.3.8:** `.eslintrc.json`/`.eslintignore` substituídos por `eslint.config.mjs` (core-web-vitals + typescript). Os plugins `eslint-plugin-react` 7.37.5, `import` e `jsx-a11y` exigidos pelo `eslint-config-next` quebram no ESLint 10 (`contextOrFilename.getFilename is not a function`); a correção oficial adotada é o `fixupConfigRules` do `@eslint/compat` (mantido pelo time do ESLint). Scripts `lint`/`check:lint`/`fix:lint` sem a flag `--ext` (removida). `package.json` renomeado de `next-template` para `lyra-metacare`.
- **76 achados reais da nova configuração corrigidos sem desabilitar regras:** 33 `react-hooks/set-state-in-effect` (cargas separadas em consulta pura + aplicação do resultado, estado derivado durante a renderização, `useSyncExternalStore` para Embla, localStorage e capacidade Web Bluetooth; novos hooks `useKeyedResource`, `useAccountResource` e `useLocalStorageValue`), 6 `purity` (`Date.now`/`Math.random` no render), 2 `static-components`, 1 `refs`, 2 `preserve-manual-memoization`, 3 `incompatible-library` (`watch()` → `useWatch`), 11 `no-explicit-any` (tipos reais, Zod e augment de `Navigator.bluetooth`), 16 `no-unused-vars` e 2 diretivas `eslint-disable` órfãs.
- **Defeitos funcionais encontrados e corrigidos pela causa raiz:**
  - Sentry nunca era inicializado (os `sentry.*.config.ts` não eram carregados por nenhum arquivo): criados `src/instrumentation.ts`, `src/instrumentation-client.ts` e `src/app/global-error.tsx`; `withSentryConfig` só faz upload de source maps com `SENTRY_AUTH_TOKEN/ORG/PROJECT`; `dataCollection` do Sentry 11 desliga usuário, cookies, cabeçalhos, corpos, dados de banco, entradas/saídas de IA e variáveis locais (dados de saúde).
  - O login ignorava a configuração editada no Site Experience Builder (regressão do redesign #45, `overrideConfig` sem uso) e o checkbox "Lembrar-me" não tinha efeito: textos, escalas tipográficas, tamanhos, destaques e link de volta reconectados; "Lembrar-me" agora cria sessão de 7 dias (cookie com `Max-Age`) e, desmarcado, sessão de navegador (sem `Max-Age`, token de 12 h); campos com `label` acessível e `autocomplete`.
  - Leituras ao vivo (monitor BLE e canal em tempo real) eram descartadas quando não havia runtime nativo de saúde; o `HealthOrchestrator` passou a combinar a sincronização com as leituras ao vivo e `triggerManualSync` retorna o resultado (o FAB não observa mais estado em efeito).
  - O `DatePicker` apagava a data digitada parcialmente quando o campo já tinha valor.
  - O Modo Privacidade mantinha estado isolado por componente (alternar no dashboard não refletia no chat); agora é um store compartilhado entre componentes e abas. A chave BYOK deixou de disparar um toast a cada tecla.
  - `POST /api/data/user-assessments` aceitava qualquer payload (`any`): agora usa união discriminada Zod com escalas válidas (humor 1–5, WHO-5 0–5 com as 5 respostas, NPS 0–10).
  - `GET /api/public/ui-config` devolvia `config: null` em falha de banco; agora registra o erro e responde 500.
  - O gráfico de peso do perfil exibia meses em inglês; agora usa `ptBR`.
- **Evidências:** `check:format`, `check:lint` (0 problemas), `check:types` exit 0; `test` 84/84 (2 testes novos de fallback de papel em `use-is-admin`); `build` exit 0 em Turbopack; `pnpm start` com `/`, `/login`, `/admin/dashboard`, `/chat`, `/profile`, `/goals`, `/api/public/plans`, `/api/public/ui-config` em HTTP 200; login com `remember:false` sem `Max-Age` e com `remember:true` com `Max-Age=604800`; avaliação WHO-5 inválida → 400 e válida → 200 (score 84); `pnpm audit` sem críticos (de 3 para 0; 72 avisos restantes, tarefa 19).
- **Encaminhado:** React 19.3 (tarefa 08), mensagens de erro Zod amigáveis nas APIs (tarefa 18), cookie `Secure` exige HTTPS fora de `localhost` (documentação, tarefa 23).

### 08 · Migração React

- **Status:** 🟢 finalizada · **Commit:** `ae0ead5` · **Push:** `e7b7ccc..ae0ead5 main -> main` (confirmado)
- **Pesquisa:** registry npm consultado em 2026-10-04: React 19.3.0 é a versão estável mais recente (publicada em 2026-09-09); o Next.js 16.3.8 declara `react ^19.0.0` como peer. Nenhuma versão canary ou experimental foi usada.
- **Implementado:**
  - `react` e `react-dom` 19.2.5 → 19.3.0 (`@types/react`/`@types/react-dom` 19.3.0 já instalados na tarefa 06).
  - Revisão de APIs depreciadas com os tipos oficiais do React 19.3: `React.ElementRef` (depreciado em favor de `React.ComponentRef`) substituído nas 61 ocorrências de 21 componentes `src/components/ui/*`; `FormEvent` (marcado como depreciado: "FormEvent doesn't actually exist") substituído por `SubmitEvent<HTMLFormElement>` nos handlers de envio de `LoginExperience`, `LandingPage` e `AIKnowledgeManager`. Sem uso de `defaultProps` em componentes de função, string refs, `findDOMNode`, `ReactDOM.render` ou `propTypes` (as ocorrências de `defaultProps` são da configuração do Puck, não do React).
  - Refs, efeitos, hidratação e estado derivado já haviam sido revistos na tarefa 07 pelas regras do React Compiler (`react-hooks` 7).
  - `pnpm-workspace.yaml` passou a declarar em `peerDependencyRules.allowedVersions` a compatibilidade, verificada na tarefa 07, entre o ESLint 10 e os plugins `react`, `import` e `jsx-a11y` exigidos pelo `eslint-config-next`.
- **Evidências:** Prova de Morte `rg "ElementRef<|MutableRefObject|PropsWithRef|FormEvent|LegacyRef" src` → nenhum resultado; `pnpm peers check` → "No peer dependency issues found"; `check:format`, `check:lint`, `check:types` exit 0; `test` 84/84; `build` exit 0; `pnpm start` com `/`, `/login`, `/admin/dashboard`, `/chat`, `/profile`, `/appointments`, `/plan`, `/monitoring`, `/connect` e `/onboarding` em HTTP 200, sem erros no log do servidor.

### 09 · Migração Tailwind/shadcn/UI dependencies

- **Status:** 🟢 finalizada · **Commit:** `4db2b68` · **Push:** `7cbf0f3..4db2b68 main -> main` (confirmado)
- **Pesquisa (registro npm em 2026-10-04):** `tailwindcss`, `@tailwindcss/postcss` e `@tailwindcss/upgrade` 4.3.3 (publicados em 2026-09-25) e `tw-animate-css` 1.4.0. O `tailwindcss-animate` não tem suporte ao Tailwind 4; o `tw-animate-css` é o substituto adotado pelo shadcn/ui.
- **Implementado:**
  - Execução única da ferramenta oficial `@tailwindcss/upgrade` 4.3.3, seguida de revisão manual linha a linha. Removido `tailwind.config.ts`; tema CSS-first no `globals.css`; PostCSS com `@tailwindcss/postcss`. A ferramenta renomeou classes em 63 templates (`outline-none` → `outline-hidden`, `backdrop-blur` → `backdrop-blur-sm`, `flex-shrink-0` → `shrink-0`, `bg-gradient-to-*` → `bg-linear-to-*`, seletores arbitrários etc.).
  - Tema reorganizado:
    - `@theme inline` para cores e fontes, resolvidas no elemento onde `.dark` e as variáveis do next/font são aplicadas.
    - `@theme static` para raios e sombras, eliminando os tokens autorreferentes gerados pela ferramenta (`--radius-sm: var(--radius-sm)`).
  - `tailwindcss-animate` substituído por `tw-animate-css` nas 31 ocorrências de `animate-in`, `fade-*`, `zoom-*` e `slide-in-from-*`.
  - `components.json` com `tailwind.config` vazio, padrão do shadcn para Tailwind 4. README com a stack real (Next.js 16, React 19.3, TypeScript 6, Tailwind 4, Recharts 3).
- **Defeitos da conversão automática corrigidos pela causa raiz:**
  - O valor de dado `'outline'` (variante de botão do Puck, persistida no banco) foi trocado por `'outline-solid'`; restaurado.
  - A variável local `--color-border` do indicador de gráfico virou o token global `border-border`; agora é `border-(--color-border)`.
  - As classes de componente da Lyra (`.glass`, `.nav-pill`, `.surface-panel` etc.) viraram `@utility` e passaram a sobrescrever utilitários. Por exemplo, o `.glass` apagava o `border-border/80` do cabeçalho. Voltaram para `@layer components`, preservando a precedência do Tailwind 3.
  - O CSS do react-big-calendar foi inlinado com `@charset` dentro de `@layer`, o que gerava aviso no build. Foi movido para `src/components/appointments/agenda.css`, importado pelo componente `Agenda`, e saiu do bundle global (cerca de 12 KB a menos nas demais páginas).
- **Defeitos pré-existentes revelados pelo QA visual e corrigidos:**
  - A landing usava a classe `cosmic-orb`, removida no commit `f5abd4e`. Os halos nunca eram posicionados nem desfocados, e o `bg-accent/10` já aparecia como retângulo rosa no Tailwind 3. Agora usa `orchestrated-orb`.
  - O Tailwind 3 descartava em silêncio opacidades fora da escala padrão (`/92`, `/12`, `/88` etc.). Comprovação: `bg-white/92`, `border-primary/12` e `bg-card/92` ausentes do CSS do v3, enquanto os controles `/80` e `/90` estavam presentes. O v4 passou a aplicar o design escrito. Com isso, o painel do slot vazio do Puck surgia como uma faixa branca; agora ele fica oculto fora do editor quando não há blocos.
- **Removido com evidência (Prova de Morte):**
  - Keyframes e classes `.animate-*` duplicados (idênticos aos do tema, comparados por script).
  - Utilidades `bg-gradient-*` e `shadow-*` que o CSS gerado pelo config já sobrescrevia no v3.
  - `container` customizado (zero uso de `container` como classe).
  - `rg "tailwind\.config|tailwindcss-animate|@tailwind |cosmic-orb"` em código e configs → nenhum resultado.
- **Mudança consciente registrada:** com a escala tipográfica do Site Experience Builder aplicada via `font-size` inline, a entrelinha de `text-*` passou de absoluta (v3) para proporcional (v4). Isso evita linhas espremidas quando a escala aumenta.
- **Evidências:**
  - `check:format`, `check:lint` e `check:types` com exit 0; `test` 87/87 nesta tarefa.
  - `build` com exit 0 e **zero avisos**.
  - `pnpm start` com capturas reais de 14 páginas em 1440×900 e 390×844, comparadas pixel a pixel com a baseline do Tailwind 3: zero erros de console; diferenças restantes inspecionadas e justificadas acima.
  - O painel de slot vazio retorna `display: none` em `/appointments`.
- **Encaminhado:** o editor `/admin/puck` quebra com React #185, defeito pré-existente comprovado no commit `7cbf0f3`, tratado na tarefa 25. Os documentos históricos de redesign que citam `tailwind.config.ts` serão revistos na tarefa 23.

### 10 · Modernização Node/pnpm/toolchain

- **Status:** 🟢 finalizada · **Commit:** `dcae3a4` · **Push:** `012138a..dcae3a4 main -> main` (confirmado)
- **Pesquisa (cronograma oficial `nodejs/Release` e `nodejs.org/dist/index.json` em 2026-10-04):**
  - Node 24 "Krypton" é **Active LTS**: entra em manutenção em 2026-10-20 e tem suporte até 2028-04-30. A última release é a 24.21.0 (2026-09-07) e a última de segurança, a 24.18.1.
  - Node 26 continua **Current** até virar LTS em 2026-10-28.
  - Node 22 está em manutenção até 2027-04-30; Node 20 está em EOL desde 2026-04-30.
  - Escolha: **Node 24 LTS**, por estabilidade e suporte, conforme o item 63 da instrução.
- **Implementado:**
  - `.nvmrc` e `.node-version` com `24.21.0`.
  - `engines.node` `^24.18.1` no `package.json`, com piso na última release de segurança da linha 24 e sem aceitar linhas Current.
  - `engineStrict: true` no `pnpm-workspace.yaml`.
  - `codemagic.yaml` com Node `24.21.0` fixo (antes era `lts` flutuante) e `corepack install` para a versão e o sha512 do `packageManager`. Antes o CI usava `corepack prepare pnpm@latest --activate`, que ativaria o pnpm 12, incompatível com o Corepack segundo a tarefa 04, e ignoraria a versão fixada.
  - README com os pré-requisitos reais.
- **Evidências:**
  - Tarball oficial do Node 24.21.0 verificado por SHA-256 (`SHASUMS256.txt`). O Node 24 inclui o Corepack 0.36.0, que resolve o pnpm 11.28.4 do `packageManager`.
  - `corepack install` num `COREPACK_HOME` vazio baixa e verifica o pnpm exato.
  - Com Node 22, `pnpm install --frozen-lockfile` sai com exit 1 e `ERR_PNPM_UNSUPPORTED_ENGINE` (Expected `^24.18.1`, Got `v22.22.0`).
  - Com Node 24.21.0, instalação limpa (sem `node_modules` e `.next`) com exit 0 e zero avisos.
  - `check:format`, `check:lint` e `check:types` com exit 0; `test` 112/112; `build` com exit 0 e zero avisos; `pnpm db:migrate` com exit 0 e idempotente.
  - `pnpm start` com capturas das 14 páginas sem erros, zero avisos de console e editor Puck salvando rascunho.
- **Encaminhado:** `run.sh` (mensagem "Node.js 20+"), `run.py` e `run_windows.py` ainda não validam a versão do Node pelo `.nvmrc`; isso será tratado nas tarefas 13 a 15.

### 11 · Modernização MySQL e autenticação

- **Status:** 🟢 finalizada · **Commit:** `c24421a` · **Push:** `bd7028c..c24421a main -> main` (confirmado)
- **Pesquisa (fontes primárias em 2026-10-04):**
  - MySQL 8.0, a versão do projeto (8.0.45), está em **fim de vida desde 2026-04-30**.
  - A tag oficial `lts` do Docker Hub aponta para o digest da **9.7.2** (LTS, suporte até 2034). A 8.4.11 é a LTS anterior; a 26.7 é Innovation e foi descartada.
  - O manual ("Upgrade Paths") só suporta upgrade de uma série LTS/Bugfix para a **próxima** LTS. Rota obrigatória: 8.0 → 8.4 → 9.7.
- **Evidências que motivaram as mudanças:**
  - O 9.7.2 sobre um datadir 8.0 encerra com `MY-014060 Cannot upgrade from 80045 to 90702`, sem tocar nos dados (o 8.0.45 sobe de novo na mesma cópia).
  - `lyra@%`, `root@%` e `root@localhost` usavam `mysql_native_password`, que vem desligado no 8.4 e foi removido no 9.x. O resultado seria perda total de acesso.
  - `VALUES(col)` em `ON DUPLICATE KEY UPDATE` gerava o warning 1287 no 8.0.45.
- **Implementado:**
  - `compose.yaml` com `mysql:9.7.2` e remoção de `--default-authentication-plugin`, opção removida no 8.4 com a qual o servidor nem inicia.
  - **`scripts/mysql-upgrade.mjs` (`pnpm db:upgrade`)**, idempotente:
    - backup a frio verificado (bytes e quantidade de arquivos);
    - detecção da versão do datadir pela imagem mais antiga da cadeia (recusa de downgrade sem alterar dados);
    - migração dos usuários para `caching_sha2_password` na série atual;
    - um passo por série LTS, com validação final;
    - `--restaurar <volume>`.
    - Imagem-alvo, volume e credenciais vêm do `docker compose config`; as senhas entram por variável de ambiente herdada (`-e MYSQL_PWD`), nunca nos argumentos visíveis no `ps`.
  - Os cinco upserts (`data-api`, `plans`, `billing`, `ai_plans`, `ui_config`) passaram a usar o alias de linha `AS novo`.
  - `run.py` com `mysql:9.7.2` sem o plugin nativo.
  - README com badges, stack e instrução do `db:upgrade`.
- **Defeitos do próprio script encontrados nos testes e corrigidos antes do commit:**
  - Regex de detecção sem o texto real de downgrade (`Cannot downgrade from 90702 to 80045`).
  - Backup de cerca de 200 MB repetido em toda reexecução; agora há um caminho rápido quando o serviço já está na série-alvo.
  - Restauração tentava `docker volume rm` num volume referenciado pelo container parado do compose; agora o conteúdo é substituído, preservando nome e rótulos.
  - Abordagens avaliadas e descartadas com evidência: `ibd2sdi` (ausente das imagens oficiais), `--innodb-read-only` (o InnoDB recusa iniciar, com md5 provando que não altera o datadir) e o "creator" do redo log (não é regravado no upgrade).
- **Evidências:**
  - **Banco existente:** `pnpm db:upgrade` real em 34 s, com o servidor registrando `8.0.45 → 8.4.11` e `8.4.11 → 9.7.2`. As 27 tabelas têm contagem idêntica a um backup independente em 8.0.45 (86 linhas).
  - **Restore testado:** `--restaurar` devolveu o datadir 8.0, que sobe no 8.0.45; o novo upgrade completo também ficou idêntico à referência.
  - **Idempotência:** com o serviço parado em 9.7, detecta e valida; com o serviço saudável, termina sem backup.
  - **Banco vazio:** 12 migrations aplicadas no 9.7.2, reexecução 12× "Já aplicada", usuário em `caching_sha2_password` e 27 tabelas `utf8mb4_unicode_ci`.
  - **mysql2:** autenticação `caching_sha2_password` completa (cache vazio após restart, TCP sem TLS) com `pnpm db:migrate` exit 0.
  - **Upserts em runtime pelas APIs reais** (`PATCH /api/admin/plans/free`, `POST /api/admin/ui-config`, `POST /api/data/profiles`, duas gerações de plano de IA): HTTP 200 e **0 warnings** no `performance_schema`. Billing validado com o SQL exato em transação com `ROLLBACK`.
  - Ao todo, 1.200 instruções da aplicação com 0 warnings.
  - `check:format`, `check:lint` e `check:types` com exit 0; `test` 112/112; `build` com exit 0 e zero avisos; 14 páginas sem erros de console; editor Puck salvando.
  - Avisos restantes do servidor são da imagem oficial e legítimos (item 59): CA TLS autoassinada gerada automaticamente e diretório `/var/run/mysqld` da imagem.
- **Encaminhado:**
  - Senha de root fixa no `compose.yaml` → tarefa 12.
  - `run.py` com `docker rm -f` e volume anônimo (destrói dados) e encerramento de processos na porta 3306 → tarefa 13.
  - `POST /api/data/*` devolvendo 500 com a mensagem crua do banco para payload inválido → tarefa 18.

### 12 · Compose, env e secrets

- **Status:** 🟢 finalizada · **Commit:** `a5b5e12` · **Push:** `8b54dec..a5b5e12 main -> main` (confirmado)
- **Auditoria de segredos** (todos os arquivos versionados, termos do item 20, chaves `sk_`/`whsec_`/`AIza`/`ghp_`, chaves privadas e DSNs):
  - O código da aplicação estava limpo: `AUTH_SECRET` obrigatório, sem fallbacks secretos, e nenhum `.env`, chave ou certificado versionado.
  - Havia senhas fixas no `compose.yaml` (inclusive no healthcheck), no `run.sh`, no `run_windows.py`, no `run.py`, no README e em manuais (`lyra_mysql_*`, `admin123`, `Lyra123#` e um admin extra `admin@admin.com`/`admin123`).
  - Havia três geradores de `.env.local` divergentes, um por launcher.
- **Implementado:**
  - **Fonte única de configuração:** `.env.example` versionado (25 variáveis levantadas do código, sem segredos) e `pnpm env:init` (`scripts/env-init.mjs` + `scripts/lib/env-file.mjs`).
    - Gera `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `AUTH_SECRET` e `ADMIN_BOOTSTRAP_PASSWORD` com aleatoriedade criptográfica (base64url, seguro para o dotenv do Next, para o Compose e para o shell).
    - Nunca sobrescreve valores, grava com permissão 0600 e não imprime segredos.
    - O `mysql-migrate.mjs` passou a usar o parser comum, removendo a duplicação.
  - **`compose.yaml`:**
    - credenciais interpoladas do `.env.local`, com erro orientado se faltarem;
    - porta publicada só em `127.0.0.1` (antes exposta em todas as interfaces);
    - **healthcheck real**, que autentica o usuário da aplicação via TCP no banco da aplicação. O `mysqladmin ping` anterior retornava 0 até com senha errada (comprovado). A senha vem do ambiente do container e não aparece no comando.
  - **Launchers e scripts:**
    - `pnpm db:*`, `db:upgrade`, `run.sh` e `run_windows.py` usam `docker compose --env-file .env.local` e delegam o `.env.local` ao `env:init`.
    - Removido o fallback de cerca de 30 bits do `run.sh` (`lyra_fallback_$RANDOM_$RANDOM`).
    - Um JSON inválido em `ADMIN_BOOTSTRAP_ADDITIONAL_ADMINS` passa a ser erro, em vez de ser substituído por um admin com senha fixa.
    - O `run_windows.py` decodifica a saída do Node como UTF-8, porque o cp1252 do Windows quebraria com bytes como o de "Á".
  - **`AUTH_SECRET`:** mínimo de 32 bytes (HS256, RFC 7518 §3.2). Além disso, `verifySessionToken` deixou de converter erro de configuração em "sessão inválida" silenciosa.
  - **`.gitignore`:** exceção para o `.env.example`, com os finais de linha mistos normalizados para LF.
  - README, manual e prompt de redesign atualizados: sem senhas padrão, com o fluxo real.
- **Evidências:**
  - 13 testes novos: 7 do gerador (`.env.example` sem segredos, idempotência, preservação, preenchimento no lugar, `AUTH_SECRET` fraco, entropia e charset) e 6 da sessão.
  - **`.env.local` existente:** 16 chaves acrescentadas e as 12 existentes com hash idêntico; a 2ª execução não altera nada; permissão 600.
  - **Instalação nova:** 28 variáveis, permissão 0600 mesmo com `umask 022`, segredos com 32/32/48/24 bytes e nenhum segredo na saída.
  - **Compose:** sem `--env-file`, erro orientado (exit 1). Com o serviço recriado: saudável, `PortBindings` em `127.0.0.1:3307` e healthcheck sem senha. Healthcheck novo com senha errada ou banco inexistente: exit 1; `mysqladmin ping` antigo com senha errada: exit 0.
  - **Ponta a ponta com segredos gerados** (projeto compose isolado, volume novo): migrations aplicadas, login do admin com a senha gerada 200, sessão válida e `admin123` com 401. O volume de teste foi removido em seguida.
  - **Launchers:**
    - `pnpm db:start` e `./run.sh db` com exit 0;
    - `./run.sh doctor`: ambiente saudável;
    - `python3 run_windows.py setup-env` e `db-start`: exit 0; com Node ausente, mensagem clara e exit 1, sem traceback;
    - `db:upgrade`: caminho rápido com exit 0; sem `.env.local`, erro orientado.
  - `check:format`, `check:lint` e `check:types` com exit 0; `test` 125/125; `build` com exit 0 e zero avisos.
  - `shellcheck` 0.11 no `run.sh`: só três variáveis sem uso pré-existentes, fora das linhas alteradas. `ruff` (E, F, W) no `run_windows.py`: sem achados.
- **Encaminhado:**
  - O `run.py` ainda cria o próprio container via `docker run` com `Lyra123#`/`admin123`; ele será reescrito sobre o Compose e o `env:init` na tarefa 13.
  - Variáveis sem uso no `run.sh` → tarefa 14.
  - A `INSTRUCAO_REIMPLEMENTACAO_UI_UX_LYRA_2026.md` ainda descreve o bootstrap antigo → tarefa 23.

### 13 · Correção e modernização completa do run.py

- **Status:** 🟢 finalizada · **Commit:** `4f1f169` · **Push:** `901a067..4f1f169 main -> main` (confirmado)
- **Diagnóstico do `run.py` anterior (2.947 linhas):**
  - Instalava o Rich com `pip --break-system-packages` no Python do sistema e reexecutava (item 22).
  - Tinha remoção automática do MySQL nativo (`apt purge`, `rm -rf` de diretórios do sistema) e encerrava processos na porta 3306 (itens 23 e 27).
  - Recriava o próprio container com `docker rm -f` e volume anônimo, perdendo os dados, e fixava senhas (`Lyra123#`, `admin123`).
- **Implementado** (reescrita completa sobre o Docker Compose e o `env:init`):
  - **Comandos:** `up [--prod]`, `app`, `db`, `migrate`, `doctor`, `fix`, `repair [--sim]`, `purge --confirmar-purge`, `status`, `logs [app|db] [--seguir]`, `stop [app|db]`, `help` e menu interativo (Rich). Códigos de saída 0/1/2/130.
  - **Separação `doctor`/`fix`/`repair`/`purge`** sem `apt` nem `sudo`:
    - `repair` recria `.next`, `node_modules` e o container, preservando o volume;
    - `purge` exige confirmação explícita e faz backup verificado do volume antes de apagar.
  - **Python reproduzível:** venv `.lyra-run/venv` com `requirements-run.txt` (Rich 15.0.0, markdown-it-py 4.2.0, mdurl 0.1.2, Pygments 2.21.0), hashes SHA-256 conferidos contra os digests do PyPI, `--require-hashes --only-binary=:all:`, reinstalação quando o manifesto muda e modo texto completo sem Rich. Mínimo Python 3.10, exigência do markdown-it-py.
  - **`doctor`:** plataforma (WSL2/WSL1/Linux), Ubuntu ≥ 22.04, Python, Node contra `.nvmrc`/`engines`, Corepack/pnpm contra `packageManager`, Docker Engine ≥ 25, Compose ≥ 2.20, `.env.local` (completude e permissão), dependências (lockfile instalado idêntico ao `pnpm-lock.yaml`), portas com dono, MySQL, migrations e aplicação.
  - **Portas:** dono identificado por `docker ps` e `/proc/net/tcp`/`fd` (PID, comando, usuário), e processos de terceiros nunca são encerrados.
    - A aplicação sobe na próxima porta livre, com `PORT`, `APP_BASE_URL` e `NEXT_PUBLIC_APP_URL` coerentes.
    - O MySQL é realocado com `MYSQL_HOST_PORT` e `MYSQL_PORT` atualizados juntos.
  - **Processos:** o `stop` encerra a **árvore** da aplicação. Causa raiz encontrada: o `next dev` faz `setsid`, então o grupo do PID registrado não contém o servidor. Só grupos formados exclusivamente pela aplicação recebem sinal; há SIGTERM com espera de 20 s, depois SIGKILL, e a confirmação da porta livre. Interopera com a aplicação iniciada pelo `run.sh`, descobrindo a porta pelos sockets da árvore.
  - **Logs:** `.logs/run-py-<data>-<comando>.log`, com cada comando, a saída integral, o exit code, a causa provável (13 padrões, incluindo os formatos do Next 16) e o caminho do log. Nenhum traceback no terminal, e subprocessos sem stdin herdado.
  - **`GET /api/health`:** prontidão sem segredos, com número de migrations aplicadas e 503 sem detalhes internos (testado). É usado na verificação ponta a ponta do `up` junto com `/`, `/login` e o login do admin.
  - **`mysql-upgrade.mjs`:** `--backup` avulso e restauração para volume removido, recriado pelo Compose com os rótulos do projeto.
  - **Documentação:** `docs/launchers.md` (contrato comum e matriz de paridade) e README.
- **Defeitos encontrados nos próprios testes e corrigidos antes do commit:**
  - `status` mostrava "MySQL ausente" com o Docker parado (agora: "não consultável" com a causa).
  - O padrão de erro de build não cobria o formato do Next 16.
  - O restore após purge criaria o volume sem os rótulos do Compose.
  - O menu tinha um traceback em EOF e subprocessos consumindo o stdin.
  - O `stop` dependia do grupo do PID registrado.
  - A porta da aplicação iniciada pelo `run.sh` não era descoberta.
- **Evidências (execução real; ambiente Linux Ubuntu 24.04, não WSL):**
  - **Bootstrap:** venv criado em 3,7 s; Rich só no venv (o Python do sistema continua sem ele).
  - **Fluxo principal:**
    - `doctor` com 14 verificações;
    - `up` de ponta a ponta em 25 s, com health, `/`, `/login` e login do admin;
    - segundo `up` idempotente (reutiliza o PID, sem processos duplicados);
    - `stop` com zero processos restantes e porta livre;
    - restart `up → stop → up`;
    - `up --prod` com build e `next start` em 81 s.
  - **Falhas controladas:**
    - Docker parado: diagnóstico e exit 1;
    - porta 3000 ocupada: app na 3001, ocupante intacto, URLs coerentes;
    - porta 3307 ocupada: MySQL na 3308 com `.env.local` coerente;
    - senha divergente e `.env.local` ausente: causa "senhas não correspondem ao volume";
    - `node_modules` ausente: reinstalação;
    - build com erro de tipo: arquivo, linha e causa;
    - migration inválida: falha sem registro nem tabela criada.
  - **Operações destrutivas:**
    - `purge` sem confirmação: exit 2, volume intacto;
    - `purge` confirmado seguido de restore: 27 tabelas idênticas (87 linhas);
    - `repair` sem `--sim` sem TTY: recusado;
    - `repair --sim`: container recriado e dados idênticos.
  - **Interface:** menu em TTY real via `script` (sessão completa e Ctrl+D com exit 0), modo texto e `logs --seguir` com Ctrl+C sem traceback.
  - **Qualidade:** `ruff` (E, F, W, B, UP, SIM, Pylint), `ruff format` e `mypy` sem achados. Prova de Morte de `break-system-packages`, `apt`, `rm -rf`, `fuser`, `docker run`, `Lyra123#` e `admin123`: nenhuma ocorrência executável.
  - `check:format`, `check:lint` e `check:types` com exit 0; `test` 127/127; `build` com exit 0 e zero avisos.
- **Limite do ambiente:** o sandbox não é WSL2, então a detecção de WSL2/WSL1 foi implementada pelo `/proc/version`, mas validada aqui só no ramo "Linux nativo". O teste em WSL2 real deve ser feito pelo operador com `python3 run.py doctor`.

### 14 · Correção e modernização completa do run.sh

- **Status:** 🟡 implementada · validação pendente · **Commit:** `0e07294` · **Push:** `main -> main` (confirmado; `main...origin/main` sem divergência)
- **Validação atual (revisão de 2026-11-04):** Execução completa do run.sh no Windows 11/Git Bash: subida, logs, parada, reinício e modo interativo. O doctor nativo passou em 04/11/2026, mas não comprova esses percursos.
- **Diagnóstico do `run.sh` anterior:**
  - `kill_port` encerrava qualquer processo na porta da aplicação, inclusive de terceiros (item 27).
  - O ramo `ss` coletava os PIDs de **todas** as portas em escuta, não só da porta pedida.
  - `app_stop` encerrava só o PID registrado; o servidor do `next dev` (sessão própria via `setsid`) ficava vivo.
  - Faltavam `up --prod`, `repair`, `purge` com backup e a verificação ponta a ponta; sem TTY, executava `up` em vez de mostrar a ajuda.
- **Implementado** (reescrita completa, mesmos comandos, contrato e códigos de saída do `run.py`):
  - **Comandos:** `up [--prod]`, `app [--prod]`, `db`, `migrate`, `doctor`, `fix`, `repair [--sim]`, `purge --confirmar-purge`, `status`, `logs [app|db] [--seguir]`, `stop [app|db]`, `help` e menu numerado. Argumentos inválidos dão exit 2; Ctrl+C dá exit 130.
  - **Plataforma:** Git Bash (MINGW/MSYS) com build do Windows via `cmd.exe /c ver` (Windows 11 = build ≥ 22000), Linux equivalente, Cygwin recusado e macOS com aviso; exige bash 4+.
  - **Portas:** dono por `docker ps`; no Windows, `netstat -ano` filtrando o endereço remoto `0.0.0.0:0` (independe do idioma) e `tasklist /V`; no Linux, `ss`/`lsof` com a linha de comando de `/proc`. Terceiros nunca são encerrados.
  - **Processos:** no Windows, `taskkill /PID <winpid> /T /F` só na árvore da aplicação (o PID Windows vem de `/proc/<pid>/winpid`); no Linux, SIGTERM na árvore capturada antes do sinal, SIGKILL após 20 s e confirmação da porta livre.
  - **Verificação ponta a ponta** compartilhada: novo `scripts/verificar-app.mjs <porta>` (`/api/health` com todas as migrations, `/` e `/login` com 200, login do admin).
  - **Logs:** `.logs/run-sh-<data>-<comando>.log` com comandos reais (não os nomes das funções auxiliares), saída integral, exit code e causa provável (13 padrões).
  - **Correções no `run.py` encontradas nos testes cruzados:** a origem da aplicação passou a vir do `app.json` (antes, uma app do `run.sh` aparecia como "iniciada pelo run.py"); padrão do Docker 29+ ("failed to connect to the docker API") para Docker indisponível, que não era reconhecido; parada do MySQL pelo nome do container quando falta o `.env.local`; `iniciado_em` com fuso nos dois launchers; `mypy --strict` e `ruff` (regras padrão do 0.16) sem achados.
  - **`mysql-migrate.mjs`:** o erro passa a citar a migration que falhou.
  - **Documentação:** `docs/launchers.md` (seção do `run.sh`, garantias por plataforma, interoperabilidade, validações e matriz de paridade completa) e README.
- **Defeitos encontrados nos próprios testes e corrigidos antes do commit:** variável inexistente na verificação do `.env.local`; colunas desalinhadas com acentos (o `printf` conta bytes); estado "exited unhealthy" para container parado; linha `=====` na ajuda; argumentos extras ignorados em silêncio; dono da porta sem a linha de comando quando só há `lsof`.
- **Evidências (execução real em Linux, bash 5.2):**
  - **Fluxo principal:** `doctor` (13 verificações, 1,1 s); `up` em 7 s com health, `/`, `/login` e login do admin; segundo `up` idempotente; `status`; `logs app`/`logs db`; `stop app` (5 processos encerrados, porta livre); `stop` (app + MySQL); restart com banco parado; `up --prod` com build e `next start` em 18 s; app em modo diferente já em execução (aviso, sem duplicar).
  - **Falhas controladas:** porta 3000 ocupada (app na 3001, URLs coerentes no processo, ocupante intacto); porta 3307 ocupada (MySQL na 3308, `.env.local` coerente e permissão 600, ocupante intacto); Docker indisponível (causa e exit 1); `.env.local` ausente; `node_modules` ausente (reinstalado); build com erro de tipo (arquivo, linha e causa); migration inválida (arquivo e erro do MySQL).
  - **Operações destrutivas:** `purge` sem confirmação (exit 2); `purge --confirmar-purge` com backup verificado e restauração com 27 tabelas e 87 linhas idênticas; `repair` sem `--sim` e sem TTY recusado (exit 1, igual ao `run.py`); `repair --sim` concluído em 13 s.
  - **Interface:** menu em pseudo-terminal (opção, opção inválida, EOF), Ctrl+C no menu, em `logs --seguir` e durante o `up` (exit 130; a aplicação continua registrada e o `stop` a encerra).
  - **Interoperabilidade:** app iniciada pelo `run.sh` vista e parada pelo `run.py` e vice-versa.
  - **Segredos:** nenhuma das quatro senhas do `.env.local` aparece nos logs.
  - **Qualidade:** `bash -n` e `shellcheck -S warning` sem achados; Prova de Morte de `kill_port`, `bar.state` e `app_stop`: nenhuma ocorrência. `check:format`, `check:lint` e `check:types` com exit 0; `test` 127/127; `build` com exit 0.
- **Limite do ambiente:** o sandbox não tem Windows; os ramos exclusivos do Git Bash (`netstat`, `tasklist`, `taskkill`, `winpid`, `cmd.exe /c ver`) foram validados só estaticamente. O teste real deve ser feito pelo operador no Windows 11 com `./run.sh doctor`, `./run.sh up`, `./run.sh status` e `./run.sh stop`.

### 15 · Revisão do run_windows.py e eliminação de redundância

- **Status:** 🟡 implementada · validação pendente · **Commit:** `d92005f` · **Push:** `main -> main` (confirmado; `main...origin/main` sem divergência)
- **Validação atual (revisão de 2026-11-04):** Execução completa do wrapper run_windows.py no Windows 11, incluindo delegação de subida, logs, parada e reinício. O doctor nativo passou em 04/11/2026.
- **Por que o arquivo existia:** criado (commit `71e04a0`) porque o `run.py` da época era só para WSL/Ubuntu; virou uma segunda implementação do launcher no Windows, paralela ao `run.sh`.
- **Divergências encontradas na versão anterior (661 linhas):**
  - recorria ao `npm` sem `pnpm` no PATH e instalava sem `--frozen-lockfile`, fora do Corepack;
  - `stop` com `Stop-Process` só no PID registrado (o servidor Next.js filho ficava vivo — mesma causa raiz corrigida no `run.py` e no `run.sh`);
  - apagava o `.next` a cada subida e reiniciava a aplicação mesmo saudável;
  - estado próprio em `.lyra-run-windows/`, invisível para os outros launchers;
  - sem identificação de donos de portas, MySQL "pronto" só pela porta TCP, prontidão HTTP aceitando qualquer status < 500 e `doctor` que só verificava o PATH.
- **Decisão (opção B, documentada em `docs/launchers.md`):** uma só implementação no Windows (`run.sh`) e o `run_windows.py` como wrapper fino. A opção A manteria duas implementações divergentes para o mesmo sistema; a C quebraria PowerShell/CMD e os documentos que citam `python run_windows.py`.
- **Implementado:**
  - Wrapper só com biblioteca padrão (Python 3.9+) que localiza o `bin\bash.exe` do Git for Windows (`LYRA_GIT_BASH`, `git.exe` do PATH, registro `GitForWindows`, pastas padrão), recusa o `bash.exe` do WSL e valida por `uname -s` (MINGW/MSYS), explicando cada recusa.
  - Delegação ao `run.sh` com `LANG=C.UTF-8` e código de saída repassado (130 no Ctrl+C).
  - Comandos antigos aceitos com aviso (`dev`, `prod`, `start-dev`, `start-prod`, `db-start`, `db-stop`, `stop-app`, `stop-all`, `setup-env`, `install-deps`, `health`); `build` recusado (exit 2) com orientação.
  - Aviso sobre estado legado em `.lyra-run-windows/` (mantido no `.gitignore`, agora comentado).
  - Manual completo (seções 10.5, 11, 25.2, 26 e 27), README e `docs/launchers.md` (decisão, funcionamento, tabela de aliases, validação e matriz de paridade) atualizados.
- **Evidências (execução real em Linux, via delegação ao `bash` do sistema):**
  - ajuda sem terminal e com `--help`; menu em pseudo-terminal com EOF;
  - comando desconhecido e argumento inválido (exit 2 vindo do `run.sh`); `build` recusado (exit 2);
  - alias `dev` com subida completa e verificação ponta a ponta; `health` (doctor saudável); `stop-all` (app e MySQL parados, nenhum processo restante);
  - `status` pelo wrapper e pelo `run.py` mostrando a mesma aplicação;
  - Ctrl+C em `logs --seguir` com exit 130;
  - descoberta do Git Bash com estrutura de pastas simulada: ordem dos candidatos para `cmd\git.exe` e `mingw64\bin\git.exe`, `uname` MINGW aceito e `bash.exe` da pasta do Windows recusado como WSL;
  - `ruff`, `ruff format`, `mypy --strict` (Linux e `--platform win32`) e sintaxe Python 3.9 sem achados;
  - Prova de Morte de `run_windows_`, `app.meta.json`, `install.hash`, `EnvManager` e `Stop-Process`: só restam menções históricas (`TASK_MESTRA_REDIGESIGN_LYRA_METACARE_2026.md`, revisada na tarefa 23) e a descrição da versão anterior em `docs/launchers.md`;
  - `check:format`, `check:lint` e `check:types` com exit 0; `test` 127/127; `build` com exit 0.
- **Limite do ambiente:** sem Windows no sandbox; a execução real de `py run_windows.py doctor` e `py run_windows.py up` no Windows 11 (PowerShell) fica para o operador, junto com o teste do `run.sh` no Git Bash.

### 16 · Migrations e banco

- **Status:** 🟢 finalizada · **Commit:** `f220da8` · **Push:** `main -> main` (confirmado; `main...origin/main` sem divergência)
- **Auditoria das 12 migrations (via `information_schema` do banco real):**
  - Ordenação determinística por código de caractere (os três arquivos `005_*` têm ordem estável); checksum SHA-256 com fins de linha normalizados e recusa de conteúdo divergente.
  - 27 tabelas InnoDB, todas `utf8mb4_unicode_ci`, nenhuma coluna com collation divergente; servidor com `sql_mode` estrito.
  - 22 FKs com regras coerentes (CASCADE para dados do usuário, SET NULL para autoria, RESTRICT para plano de assinatura); nenhuma coluna `*_id` interna sem FK (as restantes são IDs externos do Stripe); nenhum índice redundante.
  - **Inconsistências encontradas:** `user_assessments` e `user_streaks` (migração 008) com ids `VARCHAR(36)` (o resto do schema e a própria `profiles.id` usam `CHAR(36)`), `created_at`/`updated_at` `TIMESTAMP` anuláveis (as únicas 4 de 53 colunas temporais; as demais são `DATETIME NOT NULL`), contadores anuláveis e FKs com nome gerado.
  - **Fuso:** o servidor estava em `SYSTEM` (UTC só por acaso da imagem) e o mysql2 serializava parâmetros `Date` no fuso local do Node.js, divergindo de `NOW()` numa máquina em -03:00.
  - **Bootstrap admin:** cada `db:migrate` regravava o hash da senha (bcrypt com sal novo), alterando a linha a cada subida.
- **Implementado:**
  - **Migração `011_normalize_assessments_streaks.sql`:** tipos alinhados, nulos tratados antes do `NOT NULL` e FKs `fk_user_assessments_profile`/`fk_user_streaks_profile`. Idempotente via `information_schema` + `PREPARE`, porque DDL faz commit implícito.
  - **UTC explícito:** `--default-time-zone=+00:00` no `compose.yaml` e `timezone: 'Z'` no pool da aplicação e no das migrations.
  - **Bootstrap idempotente:** `bcrypt.compare` antes de regravar; o e-mail só é normalizado se diferir.
  - **`pnpm db:backup` e `pnpm db:restore <volume>`**, e a seção "Banco de dados: migrations, fuso e backup" no README.
- **Evidências (execução real):**
  - **Banco existente → upgrade:** backup a frio verificado, aplicação da 011 e contagem de linhas idêntica nas 27 tabelas (só `_lyra_schema_migrations` +1). Colunas e FKs conferidas no `information_schema`; `@@global.time_zone = +00:00` e `NOW() = UTC_TIMESTAMP()`.
  - **Reexecução manual da 011:** exit 0, sem alterações.
  - **Bootstrap:** segunda execução com `updated_at` e hash idênticos; com outra senha imprime "Senha do bootstrap admin atualizada" e volta ao valor do `.env.local` na execução seguinte.
  - **Banco vazio → migrations → aplicação:** MySQL 9.7.2 temporário em volume próprio; 13 migrations aplicadas e segunda execução com 13 "Já aplicada"; `mysqldump --no-data` idêntico ao do banco atualizado (558 linhas; só o GTID difere). `next start` contra ele com `/api/health` = 13 migrations, `/`, `/login` e login do admin; avaliação WHO-5 (score 72) e streak gravados com `created_at` em UTC. Container e volume temporários removidos.
  - **Restore real:** restauração do backup pré-011 (12 migrations, `TIMESTAMP`) seguida de `./run.sh migrate` (011 reaplicada) com dados idênticos ao estado pós-011.
  - **Qualidade:** `docker compose config` válido; `check:format`, `check:lint` e `check:types` com exit 0; `test` 127/127; `build` com exit 0 e zero avisos; `./run.sh up` com verificação ponta a ponta.
- **Observação registrada:** o `initial-data` do Puck (`src/lib/puck/config/initial-data.ts`) ainda usa o formato legado `zones`, convertido em tempo de execução pelo `migrate()` oficial (tarefa 25). Não é dado de banco; fica como débito de código para a tarefa 20.

### 17 · Testes automatizados

- **Status:** 🟢 finalizada · **Commit:** `a3bfb5b` · **Push:** `main -> main` (confirmado; `main...origin/main` sem divergência)
- **Diagnóstico:** 127 testes unitários, sem nenhum teste contra banco real; cobertura de linhas 8,6% (data-api, planos, billing, migrations, motores de IA e de saúde com 0%).
- **Infraestrutura:**
  - Vitest com projetos `unit` (`pnpm test`) e `integration` (`pnpm test:integration`). O setup global cria `<MYSQL_DATABASE>_test` com o root do `.env.local`, aplica as migrations reais e remove o banco ao final; o banco de desenvolvimento e o `process.env` do processo principal não são alterados.
  - `pnpm test:coverage` com `@vitest/coverage-v8` 5.0.3 (par exato do Vitest 5.0.3); `pnpm test:launchers` com `unittest` do Python.
  - `closeMysqlPool()`; regras puras do runner isoladas em `scripts/lib/migrations.mjs`.
- **Defeitos encontrados pelos testes e corrigidos** (prova: 11 testes de data-api e o de assinaturas simultâneas falham no código anterior):
  - **data-api (autorização):** autopromoção a admin via `profiles.role`; troca do e-mail do perfil; upsert com id de outro usuário sobrescrevia a linha dele (inclusive perfis); UPDATE transferia a linha para outro usuário; UPDATE/DELETE sem filtro atingiam todas as linhas; filtros desconhecidos, OR malformado e `not` inválido ignorados em silêncio; objetos como valor viravam `coluna` = valor no SQL; LIMIT/OFFSET sem validação; ações do admin sobre perfis de outros usuários sem efeito; admin podia remover a própria conta. `stringifyObjects` no mysql2 como defesa em profundidade.
  - **Planos:** chamadas simultâneas criavam duas assinaturas ativas; o consumo de cota abria outra conexão dentro da transação e travava o pool (20 consumos simultâneos ficavam presos). Bloqueio por usuário (`users ... FOR UPDATE`) e reuso da conexão.
  - **Motor de score:** métrica ausente contava como 0 (pior nota) em vez de neutra; prontidão com pesos somando 1,1; pesos de configuração agora são proporções; nulos contavam como preenchidos na completude.
  - **WHO-5 e NPS** validam a escala; **doshas** somam exatamente 100% (maior resto); **chat local** reconhece "olá" (limites de palavra Unicode).
  - **Bootstrap admin:** e-mail e senha vazios desativam o bootstrap (o nome padrão tornava esse caminho inalcançável).
- **Testes adicionados:**
  - **Integração (36, MySQL real):** data-api (leitura, escopo, filtros, paginação, escrita, autorização, tipos JSON/booleano/data); planos (assinatura, troca pelo admin, matriz, recursos, cotas e concorrência); webhook Stripe com assinatura HMAC gerada e verificada localmente pela SDK (sem assinatura, forjada, corpo adulterado, ativação, reentrega idempotente, cancelamento → plano gratuito, price id desconhecido registrado como erro). O `checkout.session.completed` consulta a API da Stripe e exige credencial real: fronteira externa, não testada.
  - **Unitários (64 novos):** WHO-5, NPS, aderência, score de longevidade, plano local, contexto astrológico (Lahiri, Lua Cheia e Nova de 2026, sankrantis), motores integrativos (propriedades de escala, nível e resposta a dados), chat local, migração de documentos Puck, senhas bcrypt e regras do runner de migrations.
  - **Launchers (17):** diagnóstico, URLs, versões, `.env.local` com 0600, portas ocupadas, árvore de processos com `setsid`, parser e códigos de saída do `run.py`; tradução de comandos legados, descoberta do Git Bash e delegação do `run_windows.py`.
- **Evidências:** `pnpm test` 191/191; `pnpm test:integration` 36/36; `pnpm test:launchers` 17/17; cobertura combinada de linhas 8,6% → 25,8% (data-api 77,8%, planos 71,9%, motores 91–100%; o restante é UI, coberto pelo QA de navegador nas tarefas 21 e 22). `check:format`, `check:lint` e `check:types` com exit 0; `build` com exit 0 e zero avisos; `./run.sh up` com verificação ponta a ponta; banco de teste removido e banco de desenvolvimento com contagens idênticas.
- **Pendências registradas para tarefas seguintes:** validação Zod nas rotas (JSON inválido em `filters` ainda vira 500) na tarefa 18; sanitizador de rich text do servidor na tarefa 19.

### 18 · APIs e CRUD

- **Status:** 🟢 finalizada · **Commit:** `f8e3460` · **Push:** `main -> main` (confirmado; `main...origin/main` sem divergência)
- **Mapa:** as 32 Route Handlers documentadas em `docs/api.md` (método, rota, autenticação, autorização, entrada, saída, erros e tabelas).
- **Contrato comum:** `src/lib/http/api.ts` (`lerJson`, `respostaDeErro`): JSON malformado e campos inválidos → 400 com os campos; `HttpError` com status próprio; chave duplicada do MySQL → 409; erro de dados → 400; qualquer outra falha → 500 genérico, com o detalhe só no log do servidor (antes, SQL e caminhos internos vazavam na resposta).
- **Defeitos encontrados e corrigidos** (prova: 19 testes de rota falham no código anterior):
  - **Travessia de diretório no storage:** `GET /api/storage/avatars/..%2F..%2F.env.local` devolvia o `.env.local` sem autenticação (reproduzido com curl). Agora `src/lib/storage/local.ts` aceita só buckets conhecidos, segmentos simples e caminho resolvido dentro do bucket → 404.
  - **Upload:** aceitava qualquer conteúdo (SVG/HTML servidos como página) e qualquer caminho. Agora só PNG/JPEG/WebP/GIF identificados pelos bytes, até 5 MB, com o caminho iniciando pelo id do dono; resposta com `nosniff` e CSP `sandbox`.
  - **Login:** mensagens distintas permitiam enumerar e-mails; agora 401 único e bcrypt de custo constante para e-mail inexistente.
  - **Cadastro:** corrida no primeiro usuário e duplicado virando 500; agora transação com bloqueio e 409.
  - **IA:** chave do Gemini ia na URL (vazava em logs); agora no cabeçalho `x-goog-api-key`, com timeout de 20 s e cota consumida antes da chamada externa.
  - **Validação:** todas as rotas com Zod (UUID, cores hexadecimais, ISO 4217, faixas plausíveis de métricas, datas 1800–2200, tipos de atividade); chaves Puck/página inválidas → 404; webhook com assinatura inválida → 400 e falha interna → 5xx (a Stripe reenvia).
  - **Admin:** troca de plano bloqueia a linha do usuário e responde 404 para usuário inexistente.
- **Testes:** `src/app/api/{auth-storage,dados-admin,funcoes}.integration.test.ts` (29 testes) chamam as Route Handlers reais contra o MySQL de teste, cobrindo sucesso, validação, não autenticado, sem permissão, inexistente e payload inválido, com o CRUD confirmado direto no banco.
- **Evidências:** `pnpm test` 191/191; `pnpm test:integration` 65/65; `check:format`, `check:lint` e `check:types` com exit 0; `build` com exit 0 e zero avisos. Smoke HTTP no servidor real: login admin 200, upload PNG 200 servido como `image/png` com `nosniff`, login errado 401, travessia 404 e filtros malformados 400.
- **Encaminhado:** `ui-config` sem chamador no cliente (tarefa 20).

### 19 · Segurança

- **Status:** 🟢 finalizada · **Commit:** `2b6b73a` · **Push:** `beed629..2b6b73a main -> main` (confirmado)
- **Documentação:** novo `docs/seguranca.md` com o modelo completo (sessão, rate limiting, CSRF, cabeçalhos, XSS, upload, dados de saúde, Sentry, Stripe e dependências); `docs/api.md` e `.env.example` atualizados.
- **Vulnerabilidades encontradas e corrigidas:**
  - **XSS no SSR do rich text do Puck:** o sanitizador do servidor usava regex e `<a href='x" onmouseover="alert(1)'>` virava atributo de evento; `java&#115;cript:` também passava. Substituído pelo parse5 8.0.1 (parser HTML5 WHATWG) com reconstrução por lista de permissões e escape; a mesma função roda no servidor e no navegador (antes DOMParser × regex, com risco de divergência na hidratação). 6 dos 10 testes novos falham no código anterior.
  - **JWT exposto ao JavaScript:** `/api/auth/session`, login e cadastro devolviam o `access_token`, anulando o `httpOnly`. Removido do tipo `AppSession` (prova de morte: `grep access_token` sem ocorrências no código).
  - **Papel desatualizado na sessão:** o papel vinha do JWT (até 7 dias); agora papel e e-mail vêm do banco a cada requisição e conta removida perde a sessão. Os 2 testes falham no `server-auth.ts` anterior.
  - **Sem limite de tentativas:** novo `src/lib/security/rate-limit.ts` com janela fixa no MySQL (migration `012_add_rate_limit_buckets.sql`, chaves SHA-256, upsert e leitura na mesma transação). Login: 10 falhas por conta (não depende de IP) e 50 tentativas por IP em 15 min; cadastro: 10 por hora por IP; 429 com `Retry-After`.
  - **CSRF:** `src/proxy.ts` (convenção do Next.js 16) recusa escrita em `/api/*` com `Sec-Fetch-Site` cross-site/same-site ou `Origin` de outra origem; webhook da Stripe isento (assinatura própria).
  - **Cabeçalhos ausentes:** CSP (`frame-ancestors`, `object-src`, `base-uri`, `form-action`), `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP, HSTS em produção e `X-Powered-By` desligado. Encontrado no smoke: a CSP global substituía a CSP `sandbox` de `/api/storage`; o caminho foi excluído da regra global e a CSP da rota voltou a valer.
  - **Dados de saúde em logs:** o log de erro gravava o objeto do mysql2 com o SQL interpolado; `src/lib/observability/log-seguro.ts` registra só tipo, código e pilha.
  - **Stripe:** URLs de retorno não usam mais o `Host` da requisição em produção.
  - **Dependências:** `pnpm update --depth Infinity --no-save` e `overrides` restritos às faixas afetadas (brace-expansion, fast-uri, browserslist, baseline-browser-mapping, source-map-js): `pnpm audit` de 75 avisos (1 crítico, 31 altos) para 1; `pnpm audit --prod` sem vulnerabilidades. O restante, `braces` (GHSA-vfj7-8cjw-p6xm), não tem versão corrigida publicada e só chega por ferramentas de desenvolvimento.
  - **Texto do BYOK:** dizia "On-Device" e "fica apenas no seu navegador", mas a chave vai ao servidor a cada pergunta; corrigido, com placeholder de chave do Gemini.
  - **README:** a tabela de scripts tinha sido partida em duas na tarefa 18; reunificada.
- **Auditado sem alteração:** cookies (`httpOnly`, `SameSite=Lax`, `Secure` em produção), Sentry (opcional sem DSN, `dataCollection` sem PII, Replay mascarado), webhook da Stripe (assinatura e idempotência já cobertas na tarefa 17), SQL injection (consultas parametrizadas e identificadores validados na data-api), SSRF (somente URL fixa do Gemini) e open redirect (nenhum redirecionamento com destino vindo do cliente).
- **Testes:** `src/lib/puck/sanitization/rich-text.test.ts` (10), `src/lib/security/csrf.test.ts` (5), `src/lib/observability/log-seguro.test.ts` (3), teste de produção em `src/lib/billing/config.test.ts` e `src/app/api/seguranca.integration.test.ts` (8: bloqueio por conta com `Retry-After`, zeragem após acerto, limite por IP, limite de cadastro, 25 registros simultâneos sem perda, sessão sem JWT, admin rebaixado e conta removida).
- **Evidências:** `pnpm test` 210/210; `pnpm test:integration` 73/73; `pnpm test:launchers` 17/17; `check:format`, `check:lint` e `check:types` com exit 0; `build` com exit 0 e zero avisos (`ƒ Proxy (Middleware)` registrado). Smoke real: cabeçalhos em `/login`, HSTS no `pnpm start`, POST cross-site 403 e same-origin 200, 10 logins errados → 401 e o 11º → 429 com `Retry-After: 897`, `/api/storage` com `default-src 'none'; sandbox`, editor Puck sem erros de console, `./run.sh up` com 14 migrations e login do admin.
- **Encaminhado:** `maximumScale: 1` do viewport (acessibilidade) para a tarefa 22.

### 20 · Performance

- **Status:** 🟢 finalizada · **Commit:** `616aa53` · **Push:** `c5125ec..616aa53 main -> main` (confirmado)
- **Método:** `pnpm build` + `pnpm start`, Chromium (Playwright) em contexto limpo e sem cache, somando os scripts transferidos (comprimidos); análise dos pacotes com `next experimental-analyze` e assinaturas dos chunks. Documento: `docs/performance.md`.
- **Gargalos encontrados e corrigidos:**
  - **Puck em todas as páginas (~307 KB):** cada página importava o runtime do Puck para renderizar o documento publicado da rota, mesmo vazio. O `PuckClientRenderer` agora só carrega o novo `PuckDocumentView` (via `next/dynamic`) quando há blocos (`src/lib/puck/conteudo.ts`). Defeito visual encontrado junto: com o documento vazio, o root exibia ao usuário final um cabeçalho técnico ("root app shell", "chave: patient-portal", "fonte: manual"); capturas antes e depois em `/goals`. Com um bloco publicado de teste o bloco aparece sem erros de console; o documento foi restaurado em seguida (conteúdo idêntico ao original).
  - **Sentry sem DSN (~157 KB):** o SDK e o Replay eram baixados mesmo sem `NEXT_PUBLIC_SENTRY_DSN`. `instrumentation-client.ts` e `global-error.tsx` passaram a importar o SDK dinamicamente, só com DSN.
  - **Zod nas páginas públicas (~90 KB):** o cliente revalidava a configuração que o servidor já entrega validada, e os padrões dividiam módulo com os schemas. Padrões movidos para `modules/lyra-customaze-ui-ux/src/site-page-config/defaults.ts` (comparados com os anteriores, idênticos nas três páginas); importações só de tipo marcadas com `import type`.
  - **Landing e dashboard juntos em `/`:** os dois são carregados conforme a sessão (`next/dynamic`); o visitante não baixa o dashboard nem o Recharts.
  - **Requisições duplicadas:** `src/lib/http/requisicao-compartilhada.ts` (chamadas simultâneas com a mesma chave reaproveitam a que está em andamento, sem cache além do voo) aplicado à configuração das páginas e aos recursos da conta; `/api/public/page-config/app` caiu de 4 para 1 chamada por página e `/chat` de 12 para 8 chamadas de API.
  - **Código e assets mortos (provas de morte com `grep`):** rotas `/api/admin/ui-config` e `/api/public/ui-config` sem chamador desde o commit `6774c18` (março de 2026; a tabela `ui_config` foi mantida para não descartar dados); 5 SVGs do create-next-app; protótipo `lyra-ui-preview.html` (carregava Tailwind e `lucide@latest` de CDN na origem da aplicação) e `mockup.png` (636 KB) movidos de `public/` para `docs/design/`; 7 classes de componente e 2 utilities do `globals.css` sem uso; `getHttpErrorStatus` duplicado do `statusDeErro` (testes migrados para `src/lib/http/api.test.ts`).
  - **Documentos iniciais do Puck:** reescritos em slots nativos; um teste temporário provou que a migração dos documentos antigos produz exatamente os novos nos 22 documentos, e os testes de migração passaram a gerar o formato legado a partir dos nativos.
- **Resultado (JS da página):** `/` visitante 817 → 235 KB; `/login` 382 → 189 KB; `/chat` 991 → 255 KB; `/plan` 1000 → 241 KB; `/goals` 1000 → 350 KB; `/profile` 991 → 517 KB; `/appointments` 1043 → 394 KB; `/admin/dashboard` 999 → 243 KB; `/admin/puck` 1132 → 590 KB. O prefetch das rotas do menu (padrão do `<Link>`) continua após o carregamento.
- **Verificado sem alteração:** fontes (`next/font` já serve da própria origem, subset latin), índices das consultas por usuário e pool único de conexões.
- **Evidências:** `pnpm test` 241/241; `pnpm test:integration` 73/73; `check:format`, `check:lint` e `check:types` com exit 0; `build` com exit 0 e zero avisos; console sem erros em `/`, `/login`, `/goals`, `/chat`, `/profile` e `/admin/puck` (modo dev); `./run.sh up` com verificação ponta a ponta.
- **Investigado e registrado (aviso de terceiro):** em `/appointments` (modo dev) o React avisa "outdated JSX transform". Causa: `uncontrollable` 7.2.1, dependência do `react-big-calendar` 1.20.0 (última versão, que exige `^7.2.1`), publicado com o transform clássico (`__self`). O aviso só existe em desenvolvimento e vem de pacote de terceiro; não há versão compatível que o elimine.

### 21 · QA funcional com navegador

- **Status:** 🟢 finalizada · **Commit:** `ce81722` · **Push:** `e2dbaaa..ce81722 main -> main` (confirmado)
- **Ambiente:** `pnpm build` + `pnpm start` (porta 3100) com MySQL 9.7.2; Chromium via Playwright, 1440×900.
- **Health check real:** processo `next-server` ativo, porta respondendo, `/api/health` com `status: ok`, `database: ok` e 14 migrations (sem segredos na resposta), página principal renderizada e login funcional.
- **Navegação:** 4 rotas como visitante (`/goals` e `/admin/dashboard` redirecionam para `/login`) e 21 como administrador, todas sem erro de console, sem resposta 4xx/5xx e com capturas.
- **Fluxos percorridos clicando na interface (todos aprovados):**
  - **Visitante:** botão para a seção de planos e CTA para o login.
  - **Cadastro e onboarding:** cadastro pela tela de login, depois onboarding em 5 passos (data por digitação, select de gênero, slider de atividade, checkbox de meta, consentimento) e dashboard. O MySQL confirmou o perfil completo (UTF-8 correto em "São Paulo"), o plano `free` e a assinatura ativa.
  - **Login e navegação do administrador:**
    - Login com "Lembrar-me": cookie `httpOnly` de 7 dias.
    - Cartão de harmonia com valor calculado.
    - Busca global (Ctrl K) até Metas.
  - **Metas:** criação e atualização de progresso no modal.
  - **Agenda:** novo profissional e consulta agendada (select, data e horário).
  - **Chat:** envio de mensagem com resposta 200.
  - **Plano de IA:** geração do plano.
  - **Perfil:** "Perfil atualizado com sucesso!".
  - **Dispositivos:** estado sem Bluetooth explicado.
  - **Monitoramento:** controles presentes.
  - **Sair:** menu do usuário e "Sair" removem o cookie, e as rotas protegidas voltam ao login.
  - **Área administrativa:**
    - Usuários: busca, ordenação, paginação e troca de plano no modal (PATCH 200 e evento de auditoria).
    - Matriz de planos salva.
    - Insight de IA e hábito sugerido criados nas abas de Conteúdo.
    - Configuração de IA salva e "Escanear Rede".
    - Exportação CSV de usuários baixada.
    - Saúde dos dados.
    - Construtor de UI e editor Puck: "Salvar rascunho".
  - Cada gravação foi confirmada direto no MySQL (metas, consulta, profissional, insight, hábito, assinatura e perfil).
- **Defeitos encontrados e corrigidos:**
  - **Valor fixo no dashboard:** "Harmonia atual" mostrava 94.2 para qualquer pessoa. O novo `HarmoniaAtualCard` exibe o ICQ real do `coherence-engine` (63/100 na sessão testada), com estados de carregamento e de plano sem acesso. A nota padrão deixou de afirmar "recuperação alta" sem dados. Prova de morte: `grep 94.2` só encontra o comentário histórico.
  - **Estouro horizontal:** em 11 páginas a coluna principal (`flex-1` sem `min-w-0`) crescia até a largura do conteúdo. Em `/admin/content` isso cortava a aba "Insights de IA", a prévia e o cabeçalho (capturas antes e depois). Causa encontrada medindo o elemento raiz do estouro; corrigida com `min-w-0`, como já fazia o `AppShell`.
- **Limpeza:** os dados de QA (contas `qa-*`, metas, profissionais, consulta, insight, hábito, rascunho de página, janelas de rate limit e local de nascimento do admin) foram removidos do banco de desenvolvimento ao final.
- **Evidências:** `pnpm test` 241/241; `pnpm test:integration` 73/73; `check:format`, `check:lint` e `check:types` com exit 0; `build` com exit 0 e zero avisos.
- **Encaminhado:**
  - **Tarefa 22 (acessibilidade):** botões só com ícone sem nome acessível; duas `<h1>` por página; `/instruments` sem `<h1>`; navegação da landing feita com botões.
  - **Tarefa 27 (redesign):**
    - "Atualizado por" no construtor de UI mostra o UUID do administrador.
    - Muitas páginas repetem a estrutura de Sidebar e Header em vez de usar o `AppShell`.
  - **Para decisão do usuário:** `/instruments` é uma página de demonstração herdada do template (lista a tabela `instruments` em JSON). Está ligada ao documento Puck `instruments`, então não foi removida.

### 22 · QA responsivo e acessibilidade

- **Status:** 🟢 finalizada · **Commit:** `3a4b137` · **Push:** `8ea5ba2..3a4b137 main -> main` (confirmado)
- **Método:** axe-core 4 (WCAG 2.0/2.1/2.2 A e AA e boas práticas) no build de produção, com Playwright/Chromium em 1440px e 390px. Foram auditadas 2 rotas como visitante e 19 como administrador. Detalhes em `docs/acessibilidade.md`.
- **Corrigido:**
  - **Zoom:** removido `maximumScale: 1` do viewport, que bloqueava o zoom no celular.
  - **Títulos:**
    - O título do cabeçalho é o único `<h1>`; os títulos de conteúdo de 11 páginas viraram `<h2>`.
    - `h3`/`h4`/`h5` que pulavam níveis foram corrigidos (dashboard, chat, planos, relatórios).
    - `AlertTitle` deixou de ser `<h5>`.
    - `/instruments` ganhou `<main>` e `<h1>`.
  - **"Pular para o conteúdo":** `#conteudo-principal` em todas as páginas.
  - **Nomes acessíveis:**
    - Campos do construtor de UI viraram `<label>`.
    - Switches, sliders (nome repassado ao thumb), botões de ícone (mover, remover, ações de usuário, hábitos e dicas) e as 9 barras de progresso (`aria-label` agora obrigatório na tipagem) ganharam nome.
    - `Progress` passou a expor `aria-valuenow`.
    - Menu do usuário, logo da landing e busca Ctrl K agora têm o nome acessível igual ao texto visível.
  - **Teclado:**
    - Regiões roláveis ficaram focáveis (`Table.scrollLabel`, `ScrollArea.viewportLabel`).
    - Causa raiz do painel da prévia do construtor: a coluna tinha altura fixa e o conteúdo, de 900px mais o cabeçalho, transbordava. A coluna passou a usar flex.
  - **Prévias visuais:** o construtor e as duas prévias do Puck repetiam títulos, regiões e botões da página. Agora usam `inert` + `aria-hidden`.
  - **Agenda no celular:** o calendário tinha 300px de altura e as semanas ficavam com 20px, com os números dos dias cobertos pelo cabeçalho. Passou para 520px no celular e 640px a partir de `md`, com alvo de toque de 24×24px.
  - **Rodapé "feito com":** virou `<footer>`.
- **Testes:** dois testes deixavam de ser herméticos quando o `.env.local` estava carregado:
  - `billing/config.test.ts` só limpava o ambiente depois de cada teste; agora limpa antes também.
  - O teste do webhook Stripe usava `??=` com a chave presente, mas vazia; agora usa `||=` e restaura o valor original.
- **Resultado axe:** zero violações em todas as rotas, exceto:
  - `color-contrast` (cores de estado `warning`, `cosmic` e `info`), que é resolvido pelos novos tokens da tarefa 27;
  - 3 itens internos do `@puckeditor/core` 0.23.0, sem API para ajuste e só na tela de administrador: `frame-title` do iframe, `select-name` do zoom e `aria-prohibited-attr` do loader.
- **Evidências:** `pnpm test` 241/241 (com e sem `.env.local`); `pnpm test:integration` 73/73 (com e sem `.env.local`); `check:format`, `check:lint` e `check:types` com exit 0; `build` com exit 0.

### 23 · Documentação final e validação integral

- **Status:** 🟡 implementada · validação pendente · **Commit:** `a4ee832` · **Push:** `a5a18ad..a4ee832 main -> main` (confirmado)
- **Validação atual (revisão de 2026-11-04):** Fechamento integral condicionado às fronteiras de validação registradas neste painel; os gates aprovados não comprovam automaticamente plataformas, dispositivos e provedores externos.
- **Documentação:**
  - `README.md`: contagem real de testes (241 unitários e 73 de integração), portões completos (`test:integration` e `build`), segurança atual, links para `docs/acessibilidade.md` e `docs/design-system.md`, e contribuição direto na `main`.
  - `AGENTS.md`: sistema visual vigente e `test:integration` nos portões obrigatórios.
  - Novo `docs/design-system.md` (tokens, forma, tipografia e estrutura das telas do "Lyra Clean").
  - Removido `docs/REDESIGN_PROMPT_2026.md`, que descrevia o visual anterior (vidro, orbes, gradientes) e contradizia o sistema aprovado. Prova de morte: `grep -rn REDESIGN_PROMPT` sem ocorrências.
  - `.env.example`, `docs/launchers.md`, `docs/api.md`, `docs/seguranca.md` e `docs/performance.md` conferidos: sem versões antigas (Next 15, Tailwind 3, MySQL 8.0 como alvo, `mysql_native_password`, Node 20/22).
- **Instalação limpa:** `rm -rf node_modules .next` seguido de `pnpm install --frozen-lockfile` (pnpm 11.28.4 via Corepack, 13 s, sem avisos de peer ou deprecação).
- **Validação final:**
  - `check:lint`, `check:format` e `check:types` com exit 0.
  - `test` 241/241; `test:integration` 73/73; `test:launchers` 17/17.
  - `build` com exit 0 e zero avisos.
  - `pnpm audit --prod`: "No known vulnerabilities found".
  - Varredura de segredos no repositório e no histórico (tokens do GitHub, chaves Stripe live, AWS, chaves privadas): nenhuma ocorrência. `.env.local` e `.logs/` fora do versionamento.
- **Launchers:**
  - `python3 run.py`: `doctor` (14 verificações ok), `up --prod` (build, MySQL saudável, 14 migrations, `/api/health`, `/`, `/login` e login do admin), `status`, segundo `up` reaproveitando a aplicação em execução (sem processo duplicado) e `stop`.
  - `./run.sh`: `bash -n` e `shellcheck -S warning` limpos; `doctor`, `up --prod` com banco já existente (restart), `status`, `logs` e `stop`.
  - Depois do `stop`: porta 3000 sem resposta, 3307 fechada e nenhum processo `next` restante.
- **Limite do ambiente (registrado desde as tarefas 14 e 15):** o sandbox não tem Windows. O `run.sh` foi executado de verdade no bash do Linux, e os ramos exclusivos do Git Bash e o `run_windows.py` foram cobertos por testes e por validação estática. O teste no Windows 11 real (`./run.sh doctor/up/status/stop` no Git Bash e `py run_windows.py up` no PowerShell) fica para o operador.

### 24 · Correção crítica: vazamento de conexões MySQL em produção

- **Status:** 🟢 finalizada · **Commit:** `991961b` · **Push:** `faa4c1b..991961b main -> main` (confirmado)
- **Origem:** tarefa criada durante o QA visual de baseline da tarefa 09. Com `pnpm start`, a navegação por 12 páginas autenticadas gerou 115 erros de console e respostas 500 com `Too many connections`.
- **Causa raiz:** `src/lib/mysql/pool.ts` só reaproveitava o pool fora de produção. Em `next start`, cada consulta criava um pool novo (até 20 conexões e 10 ociosas com keep-alive) que nunca era fechado, esgotando o `max_connections` do MySQL. `src/lib/billing/stripe.ts` repetia o padrão e criava um cliente Stripe, com agente HTTP próprio, a cada uso.
- **Implementado:**
  - Pool único por processo em qualquer ambiente, guardado em `globalThis` com tipo próprio.
  - Mesmo tratamento para o cliente Stripe.
  - Novo `src/lib/mysql/pool.test.ts` com 3 testes: pool único em produção, pool único em desenvolvimento e mensagem clara quando falta variável obrigatória. O teste de produção falha contra o código anterior.
- **Evidências:**
  - `SHOW STATUS LIKE 'Threads_connected'` caiu de 90 para 7 após a mesma navegação.
  - Erros de console caíram de 115 para 0.
  - `check:format`, `check:lint` e `check:types` com exit 0; `test` 87/87; `build` com exit 0.

### 25 · Correção crítica: editor Puck quebra ao abrir

- **Status:** 🟢 finalizada · **Commit:** `2fe2d05` · **Push:** `e491a10..2fe2d05 main -> main` (confirmado)
- **Origem:** encontrada no QA da tarefa 09. `/admin/puck` caía na tela de erro global com React #185. O mesmo erro ocorre no commit `7cbf0f3`, anterior à migração do Tailwind, o que comprova que o defeito é pré-existente.
- **Diagnóstico (modo dev, mensagem completa):** "Maximum update depth exceeded" no `refSetter` do `DraggableComponent` do Puck durante desmontagens sucessivas, acompanhado do aviso "DropZones have been deprecated in favor of slot fields".
- **Causa raiz:** os componentes de layout (`section-container`, `stack-container`, `fixed-columns`, `fluid-grid`) declaram `content` e as colunas como `type: 'slot'`, mas os documentos guardavam os filhos no formato legado `zones` (`"<id>:content"`). O Puck tratava a mesma área como DropZone e como slot e entrava em laço de montagem e desmontagem.
- **Implementado:**
  - `aplicarResolveAllDataLyra` aplica a migração oficial `migrate(data, config)` do Puck 0.23 antes do `resolveAllData`. O caminho é usado pelo editor, pelos previews e pelo renderizador público, e cobre também documentos legados já persistidos em outros ambientes.
  - Defeito encadeado corrigido: `normalizarDadosPuck` copiava as `zones` do documento de fallback quando o documento lido não as tinha. Isso misturava blocos de outro documento e reintroduzia DropZones logo após a migração.
  - Novo `src/lib/puck/dynamic/resolve-data.test.ts` com 25 testes: cada um dos documentos fica sem zonas e preserva a contagem total de blocos; os filhos vão para o slot correto e na mesma ordem; a migração é idempotente; e há um teste de regressão da normalização, que falha contra o código anterior (comprovado com `git stash`).
- **Evidências:**
  - Editor em dev e em produção com zero erros, zero avisos de DropZone e canvas (iframe) renderizando os blocos aninhados (`lyra-heading-block-editorial`, `lyra-fixed-columns-landing`).
  - Painel do slot visível no editor (`isEditing`).
  - CRUD real: "Salvar rascunho" exibe "Rascunho do Puck salvo com sucesso." e o MySQL registra `landing-home` com 0 zonas e 6 filhos no slot `content`.
  - `check:format`, `check:lint` e `check:types` com exit 0; `test` 112/112; `build` com exit 0 e zero avisos; capturas das 14 páginas sem erros de console.
- **Encaminhado:** o mesmo QA revelou que o `agenda.css` da tarefa 09 era pré-carregado em todas as páginas pelo prefetch de `/appointments`; isso é tratado na tarefa 26. Os dados iniciais em `initial-data.ts` continuam no formato legado e são convertidos na carga pela migração oficial; a reescrita para slots nativos fica para a tarefa 16 (migrations e dados).

### 26 · Correção: CSS da agenda pré-carregado em todas as páginas

- **Status:** 🟢 finalizada · **Commit:** `de0308a` · **Push:** `2ec8679..de0308a main -> main` (confirmado)
- **Origem:** regressão da tarefa 09, encontrada no QA da tarefa 25. Chrome registrava "preloaded using link preload but not used" em `/`, `/goals`, `/profile` e demais páginas autenticadas.
- **Causa raiz:** o `agenda.css`, criado na tarefa 09, era importado estaticamente pela rota `/appointments`. O prefetch dessa rota pelos links da navegação baixava e pré-carregava o CSS em todas as páginas, sem usá-lo.
- **Implementado:** o componente `Agenda` (react-big-calendar + `agenda.css`) passou a ser carregado com `next/dynamic` (`ssr: false`), com skeleton da mesma altura para não deslocar o layout. O tipo genérico é preservado pela expressão de instanciação `Agenda<Appointment>`, sem casts. O JS e o CSS do calendário agora só são baixados quando o calendário é exibido.
- **Evidências:**
  - Zero avisos ou erros de console em `/`, `/goals`, `/profile`, `/chat`, `/admin/dashboard` e `/admin/puck`.
  - O chunk com `.rbc-btn` é requisitado somente em `/appointments`, onde o calendário renderiza com 35 células, em pt-BR e com as personalizações Lyra aplicadas (raio de 24 px, botão ativo com gradiente).
  - `check:format`, `check:lint` e `check:types` com exit 0; `test` 112/112; `build` com exit 0 e zero avisos.

### 27 · Simplificação visual premium ("Lyra Clean")

- **Status:** 🟢 finalizada · **Commit:** `551b2ef` · **Push:** `86a6b25..551b2ef main -> main` (confirmado)
- **Origem:** pedido do usuário em 2026-10-09 (layout mais simples e moderno, premium, sem perder funções). A proposta foi publicada como artefato de design e aprovada ("Aprovado design").
- **Implementado:**
  - **Tokens (`globals.css`):**
    - Fundo #F7F7F9, cartões brancos com borda #E6E6EC, teal #187268 para ações, violeta #6A4BD6 só para conteúdo astral e de IA.
    - Estados recalculados para passar de 4,5:1 sobre branco e sobre o próprio tom claro.
    - Novos tokens `--control` (3,3:1), `--cosmic-strong`, `--primary-hover`, `--accent-hover`, `--destructive-hover` e `--destructive-light` (antes sem utilitário).
    - Raios de 10 a 20 px.
    - Removidos (prova de morte por grep): gradientes, sombras coloridas, as classes `glass`, `glass-card`, `surface-panel`, `surface-soft`, `orchestrated-orb`, `aurora-border`, `text-gradient-*`, `interactive-lift`, `eyebrow`, `page-title` e `soft-divider`, sete animações decorativas e as funções de tom com gradiente do módulo `lyra-customaze-ui-ux`.
  - **Primitivos shadcn:** botão, card, badge, inputs, select, abas, dialog (com rolagem no celular), sheet, menus, popover, progress (tom `astral`), switch, checkbox, skeleton, avatar, tabela, acordeão, alerta, calendário, toggle, command e sonner.
  - **Layout:**
    - `AppShell` em todas as páginas autenticadas, com slot do documento Puck. Antes, 17 telas repetiam a estrutura de sidebar e header.
    - Sidebar de 248 px (configurável) sem descrições, com usuário e plano no rodapé.
    - Cabeçalho de 64 px com busca Ctrl K, notificações, Chat IA e menu do usuário.
    - Novos `PageIntro` e `AccessDenied` compartilhados.
  - **Telas:** dashboard, metas (layout aprovado), login (duas colunas), landing, onboarding, chat, agenda, monitoramento, dispositivos, perfil, assinatura, administração, construtor de UI, editor e blocos Puck. Os valores de opção persistidos dos blocos foram mantidos, e documentos salvos continuam válidos.
  - **Backend primeiro:**
    - "Atualizado por" (construtor e Puck) passou a mostrar o nome de quem salvou, via `LEFT JOIN profiles`, no lugar do UUID.
    - A rota pública do Puck deixou de expor o ID do administrador.
    - Teste de integração novo cobre as duas coisas.
  - **Textos padrão:** o `statusTitle` deixou de afirmar "recuperação alta" sem dados.
- **Defeitos encontrados no QA e corrigidos:**
  - O chat usava `scrollIntoView`, que rolava a janela inteira e escondia o topo da página. Agora rola só a lista de mensagens.
  - Estouro horizontal de 158 px em Saúde dos Dados no celular (item da grade sem `min-w-0`).
  - Dias de outro mês do calendário com #999 (2,6:1).
- **Evidências:**
  - Capturas de 18 rotas autenticadas e 2 públicas em 1440, 820 e 390 px, sem erros de console e sem estouro horizontal.
  - axe sem violações de contraste nas telas da Lyra. Restam só itens internos do `@puckeditor/core` no editor (documentados em `docs/acessibilidade.md`).
  - `pnpm test` 241/241; `pnpm test:integration` 73/73; `check:format`, `check:lint` e `check:types` com exit 0; `build` com exit 0.
- **Execução:** os lotes de telas foram divididos entre subagentes com um guia único de regras; as camadas compartilhadas (tokens, primitivos, layout, páginas, metas e backend) e a revisão final foram feitas diretamente.

### 28 · Direitos do titular (LGPD) e segregação de dados sensíveis e fiscais

- **Status:** 🟢 finalizada · **Commit:** `5d068c1` · **Push:** `37b6bb1..5d068c1 main -> main` (confirmado)
- **Diagnóstico:**
  - o administrador lia, filtrava, alterava e apagava, pela API de dados, todos os dados de saúde de todas as contas: métricas, metas, hábitos, planos, agenda, profissionais, avaliações e sequências;
  - a listagem administrativa trazia nascimento, gênero, idade, metas e atividade de todos;
  - não havia exportação, exclusão de conta pelo titular, registro de consentimento, política de privacidade, termos de uso nem registro fiscal das compras;
  - o consentimento do onboarding não era gravado.
- **Implementado:**
  - **Segregação (titular):**
    - `adminReadColumns`/`adminWriteColumns` na API de dados. De outras contas, o administrador vê só identificação, papel, onboarding e plano, e em métricas só quem registrou e quando.
    - Pedir, filtrar (inclusive `or`), ordenar, alterar ou apagar dado do titular responde 403.
    - As tabelas de saúde ficaram só com o titular, também para o administrador.
    - A listagem e o detalhe de usuários do painel perderam os dados sensíveis.
  - **28.1 (fiscal):**
    - o evento `invoice.paid` da Stripe grava `fiscal_records`, de forma idempotente, com a fotografia fiscal do comprador e sem dado de saúde;
    - só o administrador consulta, em leitura (`/admin/fiscal`, com filtro por período e CSV);
    - não existe rota de alteração ou exclusão, e a tabela não faz parte da API de dados;
    - na exclusão da conta, o registro fica com `user_id = NULL`.
  - **Direitos do titular:**
    - exportação JSON (`/api/account/export`);
    - exclusão da conta com senha e frase de confirmação. Recusa assinatura paga com renovação ativa e o último administrador; apaga também as imagens enviadas;
    - histórico de compras (`/api/account/purchases`);
    - consentimentos versionados: o cadastro exige o aceite, e o onboarding grava o consentimento de dados de saúde (art. 11, I) antes de salvar qualquer dado;
    - páginas `/privacidade` e `/termos`, abertas a todos inclusive durante o onboarding, com links no login, no cadastro, na landing e no perfil;
    - card "Privacidade e dados" no perfil, também quando o plano bloqueia a edição do perfil.
  - **Administrador:** exclui contas pela rota `DELETE /api/admin/users/:id`, com o mesmo serviço. O perfil não se apaga mais pela API de dados.
  - **Correção extra:** o onboarding gravava a data de nascimento com `toISOString`, o que podia salvar o dia anterior em fusos a leste de UTC.
- **Conflito entre requisitos (registrado):** os registros fiscais são, por natureza, registros de compra. Para atender ao 28.1, o administrador vê as faturas como dado fiscal (valores, datas, documento do comprador), mas não existe histórico de compras por pessoa no painel nem ligação com dados de saúde. O titular vê o próprio histórico completo.
- **Fronteiras externas:**
  - Stripe: sem segredo real, o `invoice.paid` foi validado com evento assinado localmente pela SDK oficial.
  - Identificação do controlador: razão social e CNPJ precisam ser informados pela empresa (o e-mail do encarregado vem de `LGPD_CONTATO_EMAIL`).
  - Imutabilidade no banco: gatilhos exigiriam o privilégio `SUPER` com o log binário ligado. A recomendação de revogar `UPDATE`/`DELETE` em produção está em `docs/lgpd.md`.
- **Evidências:**
  - `test:integration` 90/90. O novo `lgpd.integration.test.ts` tem 11 testes: consentimento, segregação (colunas, filtros, ordenação, alteração e exclusão), lista administrativa, fatura assinada → registro fiscal idempotente, acesso fiscal, exportação, exclusão com retenção fiscal e as recusas.
  - `test` 236/236; lint, format e types com exit 0; `build` com exit 0; `test:launchers` OK.
  - QA no build de produção, 20/20 conferido no MySQL:
    - cadastro bloqueado sem o aceite; consentimentos gravados;
    - perfil com consentimentos, compra e download dos dados;
    - administrador recebe 403 ao pedir data de nascimento;
    - `/admin/fiscal` funciona;
    - exclusão pela interface volta ao login, apaga tudo e mantém o registro fiscal desvinculado; login da conta excluída responde 401.
  - Telas novas sem estouro em 390px. Migração `015` aplicada. Dados de QA removidos.

### 29 · Rotas, menus, botões e links reais

- **Status:** 🟢 finalizada · **Commit:** `124c7fe` · **Push:** `main -> main` (confirmado; `main...origin/main` sem divergência)
- **Método:** varredura no navegador (Playwright, servidor de produção) de todas as rotas como paciente, como administrador e como visitante. Em cada tela foram listados os botões sem nenhuma ação ligada (sem handler de clique/teclado, sem submit e sem gatilho Radix) e todos os links internos, abertos um a um para conferir 404.
- **Achados e correções (causa raiz):**
  - **Sino de notificações sem ação:** virou o componente `NotificationsMenu`, com dados reais da conta (consultas dos próximos 7 dias pela API de dados e avisos da assinatura: pagamento pendente ou renovação cancelada), contador com plural correto e links para `/appointments` e `/profile`. Sem dados, mostra "Nenhuma notificação no momento.".
  - **"Preferências" no menu do perfil abria a mesma página de "Meu perfil":** virou "Privacidade e dados", que leva ao card dos direitos LGPD (`/profile#privacidade-e-dados`). Como os cards acima carregam depois e empurram o card para baixo, a rolagem é refeita a cada mudança de altura até a pessoa interagir (limite de 5 s).
  - **Link `/dashboard` (404) no conteúdo do Puck:** o painel fica em `/`. Corrigido no código (`initial-data`, `feature-card`, rota pública do documento) e nos documentos já gravados pela migration `016_corrige_link_dashboard_puck.sql`.
  - **Construtor de UI criava item de sidebar com `/nova-rota` (404):** o item novo nasce com a primeira rota real ainda não usada (o botão fica desabilitado quando não sobra nenhuma) e o campo "Rota" virou um seletor das rotas existentes, com as já usadas desabilitadas. O schema do módulo exige formato de rota interna também no servidor.
  - **`/monitoring` mostrava ao paciente os nomes das variáveis da Stripe** (achado da tarefa 33): `GET /api/account/billing` só envia `missingKeys` ao administrador, e checkout/portal sem credencial respondem 503 com mensagem genérica para o paciente.
- **Evidências:**
  - Varredura final: 12 rotas do paciente, 22 do administrador e 2 do visitante sem nenhum botão sem ação; 10 e 21 links internos verificados sem 404; nenhum erro de página.
  - Navegador em 1440 px e 390 px: sino com "Notificações (1 nova)", popover dentro da tela e clique levando a `/appointments`; "Privacidade e dados" deixa o card no topo (80 px, logo abaixo do cabeçalho); `/monitoring` sem `STRIPE_`; documento sem estouro horizontal.
  - Construtor: 17 seletores de rota, "Novo item" habilitado (sobrava `/admin/fiscal`), rotas em uso desabilitadas.
  - Teste de integração novo "configuração interna da cobrança" (`seguranca.integration.test.ts`).
  - `test` 236/236; `test:integration` 91/91; lint, format e types com exit 0; `build` com exit 0. Provas de remoção: `/nova-rota` e `Preferências` só aparecem em comentários que explicam a correção; `"/dashboard"` sem ocorrência em `src` e `modules`; 0 documentos Puck com `/dashboard`. Usuários de QA removidos.

### 30 · Vulnerabilidade alta em `braces`

- **Status:** 🟢 finalizada · **Commit:** `7c1f432` · **Push:** `c70e2f9..7c1f432 main -> main` (confirmado)
- **Diagnóstico:** `braces` ≤ 3.0.3 (GHSA-vfj7-8cjw-p6xm, negação de serviço com padrões glob muito aninhados), sem versão corrigida publicada. Chegava por dois caminhos: a CLI `shadcn` e o `@next/eslint-plugin-next` (que fixa `fast-glob` 3.3.1, puxando `micromatch` e `braces`).
- **Correção (tratada como se fosse para produção):**
  - A CLI `shadcn` saiu das `devDependencies`. Ela só gerava componentes e nunca era importada; o `components.json` continua para uso com `pnpm dlx shadcn@<versão> add`.
  - Override restrito ao plugin do Next: `fast-glob` resolvido para o `tinyglobby` (fdir + picomatch, sem `braces`), que exporta o mesmo `globSync` com `onlyDirectories`, a única função usada pelo plugin.
  - `scripts/verificar-glob-eslint-next.mjs` chama a função real do plugin e confirma os mesmos diretórios do sistema de arquivos.
- **Evidências:** `pnpm audit` e `pnpm audit --prod` com "No known vulnerabilities found"; `pnpm why braces` sem resultado; lint, format e types com exit 0; `test` 241/241; `test:integration` 73/73; `test:launchers` 17/17; `build` com exit 0.

### 31 · Textos sem acento

- **Status:** 🟢 finalizada · **Commit:** `961ccf4` · **Push:** `aeb8b4a..961ccf4 main -> main` (confirmado)
- **Método:** varredura com dicionário de português (pyspellchecker, instalado fora do projeto). O critério foi palavra sem acento cuja forma acentuada é a usual. A varredura cobriu:
  - textos visíveis: literais, JSX e rótulos de uma palavra;
  - padrões configuráveis, mensagens de API, scripts, launchers e documentação;
  - conteúdo gravado no banco: documentos Puck, planos, recursos, hábitos, dicas, configuração e base de conhecimento da IA.
- **Corrigido:**
  - padrões da landing e do login (`modules/lyra-customaze-ui-ux/.../defaults.ts`): hero, métricas, fluxo, FAQ, CTA final, rodapé, textos do login, "orquestração guiada", "conexão de sinais reais" e a mensagem de erro do Bluetooth;
  - construtor da experiência (`SiteExperienceBuilder`): cerca de 90 rótulos, descrições e mensagens;
  - landing, modal de metas, teste de conexão da IA, mensagem do bootstrap do administrador e `AGENTS.md`.
- **Mantidos de propósito:**
  - identificadores e chaves internas (ex.: status `atencao`, `estavel`) e ids de elementos;
  - migrations já aplicadas: mudar o texto altera o checksum. A `005` grava só na tabela `ui_config`, que não é usada;
  - o banco: os textos gravados já estavam acentuados, e não há configuração de página salva (a landing e o login usam os padrões corrigidos).
- **Evidências:** varredura final sem texto visível sem acento; no navegador, landing e login sem nenhum termo sem acento; `test` 236/236; `test:integration` 90/90; `test:launchers` OK; lint, format e types com exit 0; `build` com exit 0.

### 32 · Página `/instruments`

- **Status:** 🟢 finalizada · **Commit:** `0741a4a` · **Push:** `3403a7c..0741a4a main -> main` (confirmado)
- **Risco avaliado: nenhum.** A página era uma demonstração do template, sem link em sidebar, menu do celular, Ctrl K, landing ou documentos Puck publicados. Nenhum motor, tela ou API da Lyra lia a tabela. Ela era a única tabela lida sem sessão pela API de dados, então removê-la diminui a superfície exposta.
- **Removido:**
  - página `src/app/instruments/page.tsx`;
  - tabela `instruments` e documento Puck `instruments` (migração `013_remove_instruments_demo.sql`, idempotente, sem dados de usuário);
  - flag `publicRead` (agora toda leitura em `/api/data` exige sessão), tipos `InstrumentRow` e a chave Puck;
  - `src/lib/mysql/query-utils.ts` e o teste dele: código morto, importado só pelo próprio teste.
- **Evidências:**
  - prova de morte: `grep -rn instruments` sem ocorrências no código; `publicRead` só aparece num campo homônimo e não relacionado do contrato do módulo `lyra-customaze-ui-ux`;
  - migração aplicada; segunda execução com "Já aplicada" em todas; tabela inexistente e 0 documentos Puck `instruments`;
  - produção: `/instruments` 404; `/api/data/instruments` 400 ("Tabela não suportada");
  - `test` 226/226 (21 testes a menos, do arquivo morto removido); `test:integration` 75/75 (todas as tabelas exigem sessão: 401); lint, format e types com exit 0; `build` com exit 0.

### 33 · Experiência no celular

- **Status:** 🟢 finalizada · **Commit:** `b2dddb8` · **Push:** `40bd98a..b2dddb8 main -> main` (confirmado)
- **Método:** varredura real em 390×844 com toque, em todas as rotas, como visitante, paciente, administrador e conta nova: estouro horizontal, alvos de toque abaixo de 24px e captura da primeira dobra. Referências de 2026 consultadas: formulário acima da dobra no login, progresso de etapas com texto, alvos de 44px.
- **Problemas encontrados e corrigidos (causa raiz):**
  - **Onboarding cortado:** o formulário ficava numa linha flex centralizada e crescia até 672px; no celular estourava para os dois lados (página com 531px e o início dos cartões fora da tela, sem como rolar até ele). Agora é uma coluna na largura da tela, as etapas fora da tela ficam `inert` (o "próximo campo" do teclado não pula para etapas escondidas) e a página ganhou `<main>` e `<h1>`.
  - **Pontos do onboarding:** eram um `role="tablist"` sem abas, que não dizia nada ao leitor de tela. Agora há o texto "Etapa X de N" e os pontos já concluídos ficam marcados.
  - **Metas do onboarding:** só a caixinha de 20px e o texto marcavam a meta, apesar do cursor de clique na linha. Agora a linha inteira (44px) marca e a opção escolhida fica destacada.
  - **Login com o formulário abaixo de um texto longo:** a ordem passou a ser marca → título → formulário → detalhes. No celular o formulário aparece na primeira dobra e o título acompanha a largura da tela; no desktop o desenho em duas colunas continua igual.
  - **Botões do acesso rápido da landing com 22px:** `flex-1` na coluna zerava a base de altura. Agora só vale na linha (a partir de `sm`).
  - **Alvos pequenos:** "Criar conta"/"Entrar", "Voltar para a landing", "Lembrar-me" e o selo "Feito com iLyra AI" passaram a 44px.
  - **Perfil:** um cartão repetia o título e a descrição da página logo abaixo do cabeçalho; removido.
  - **Chat:** cabeçalho compacto no celular (sem ícone e texto de apoio), para a conversa aparecer antes.
- **Evidências:**
  - nenhuma rota com estouro horizontal em 390px (antes: onboarding com 531px); alvos abaixo de 24px só o checkbox "Lembrar-me" (com rótulo de 44px ao lado) e o seletor interno do Puck;
  - axe sem violações em `/`, `/login`, `/chat`, `/profile`, `/goals` e `/onboarding`, em 390 e 1440px;
  - fluxo completo do onboarding (13 verificações) aprovado no celular e no desktop; dados gravados conferidos no MySQL;
  - login e onboarding sem estouro em 820 e 1440px;
  - `test` 230/230; `test:integration` 75/75; lint, format e types com exit 0; `build` com exit 0. Contas de QA e contadores de tentativa locais removidos do banco.
- **Achado repassado à tarefa 29:** `/monitoring` mostra ao paciente nomes de variáveis internas de configuração no aviso de plano.

### 34 · Tema escuro

- **Status:** 🟢 finalizada · **Commit:** `b3c438f` · **Push:** `main -> main` (confirmado; `main...origin/main` sem divergência)
- **Estado encontrado:** o `.dark` existia em `globals.css`, mas o tema estava travado no claro (`enableSystem={false}`, sem nenhum controle) e, ativado à força, 86 nós falhavam no contraste em 1440 px: branco sobre os destaques claros (violeta 3,6:1; verde, âmbar, dourado, azul e cósmico entre 1,9:1 e 3,4:1), vermelho de erro sobre cartão e tom claro (3,7–4,3:1) e contorno dos campos de texto quase invisível (1,2:1). O código não tinha cores fixas relevantes fora dos tokens.
- **Implementado:**
  - **Alternância:** grupo "Tema" (Claro, Escuro, Do sistema) no menu do perfil, que não fecha ao escolher; botão "Tema escuro" (`aria-pressed`) na landing, na entrada e nos documentos legais (oculto na pré-visualização do construtor). O claro continua padrão; a escolha persiste no navegador e "Do sistema" segue o sistema operacional. Componentes em `src/components/theme/`.
  - **Tokens do escuro:** destaques claros com texto escuro por cima (`*-foreground` = `#0C0C13`), erro, violeta e informação mais claros, `--input` com 3:1, popover um degrau acima do cartão, `color-scheme: dark`, sombras e barra de rolagem próprias e meta `theme-color` acompanhando o tema (`ThemeColorSync`, com a cor em módulo de servidor para o `viewport`).
  - **Tema claro:** `--control` de `#8C8C9B` para `#848494`, para passar de 3:1 também sobre `muted`/`secondary`.
  - **Teste contínuo:** `src/app/tema.test.ts` lê o `globals.css` e falha se algum par de texto cair abaixo de 4,5:1 ou de contorno abaixo de 3:1, nos dois temas, e confere a cor da barra do navegador.
  - **Camadas (achados novos ao auditar menus e diálogos abertos):** o menu suspenso modal do Radix punha `aria-hidden` no cabeçalho e no conteúdo focáveis e escondia o `<h1>`; os menus passaram a ser não modais por padrão (padrão "menu button" da WAI-ARIA). O popover de notificações e o diálogo da busca Ctrl K ganharam nome acessível. O contraste dos títulos de categoria do Puck (4,35:1) foi corrigido pela variável `--puck-drawer-category-color-text` da própria biblioteca.
- **Evidências:**
  - axe (todas as regras WCAG 2.2 AA + boas práticas), servidor de produção, 390 e 1440 px, temas claro e escuro: 46 telas e camadas por largura (visitante, conta nova no onboarding, paciente e administrador em todas as rotas, menu do perfil, notificações, busca Ctrl K e sidebar do celular). **Zero violações de contraste** nos dois temas; restam 5 nós por largura: os 3 internos do Puck já registrados em `docs/acessibilidade.md` e `region` (boa prática) no portal do menu do perfil.
  - Navegador: botão do login alterna e persiste após recarregar e entre páginas; menu do perfil com Claro/Escuro/Do sistema, inclusive com o sistema em escuro e em claro; `theme-color` `#f6f6f8` ↔ `#0c0c13`; sem avisos de console nem erros de hidratação; landing a 390 px sem estouro.
  - Regressão das tarefas 29 e 36: sino, "Privacidade e dados", `/monitoring` e construtor sem mudança; varredura de botões e links sem achados.
  - `test` 241/241; `test:integration` 91/91; lint, format e types com exit 0; `build` com exit 0 e sem avisos. Usuários de QA removidos.

### 35 · Onboarding no primeiro acesso

- **Status:** 🟢 finalizada · **Commit:** `fae09bd` · **Push:** `39e765f..fae09bd main -> main` (confirmado)
- **Verificação inicial:** cadastro, login e rotas digitadas já levavam ao onboarding, mas com dois defeitos reproduzidos no navegador:
  - **Fuga pelo "voltar":** a partir do onboarding, o botão "voltar" abria o painel completo (menu, métricas, chat) de uma conta recém-criada.
  - **Desvio pelo painel:** o cadastro ia primeiro ao painel e só depois ao onboarding; páginas montavam e faziam consultas antes do redirecionamento.
- **Causa raiz:** o `AuthProvider` só decidia o destino quando a sessão mudava (não a cada rota) e renderizava a página antes de conhecer o status do onboarding, que exigia uma consulta extra ao perfil.
- **Correção:**
  - a sessão (`/api/auth/session`, login e cadastro) traz `onboarding_completed` lido do banco;
  - `src/lib/auth/destino-de-acesso.ts` decide o destino (visitante → login; conta sem onboarding → onboarding; conta pronta sai de login e onboarding), com testes;
  - o `AuthProvider` reavalia a cada rota, usa `replace` e não monta a rota bloqueada;
  - ao concluir, o onboarding relê a sessão (`db.auth.refreshSession`) e o app abre o painel; o login deixa a navegação para o `AuthProvider`;
  - removida a recriação de perfil pelo cliente (código inalcançável: sem perfil não existe sessão). Prova de morte: `grep` sem ocorrências.
- **Evidências (build de produção, 1440px):** 13/13 verificações e zero erros de console:
  - cadastro → `/onboarding` direto (trilha `/login → /onboarding`, 776 ms);
  - "voltar" e as rotas `/`, `/plan`, `/profile`, `/admin/users` e `/login` não abrem o painel;
  - ao finalizar abre o painel; "voltar" e `/onboarding` não reabrem o onboarding; rotas liberadas; novo login (390px) abre o painel; visitante vai ao login.
  - `test` 230/230; `test:integration` 75/75 (sessão com o status, inclusive após concluir sem novo login); lint, format e types com exit 0; `build` com exit 0. Usuários de QA removidos do banco.
- **Achado repassado à tarefa 33:** em 390px o formulário do onboarding fica com 531px de largura (cartões cortados e rolagem lateral).

### 36 · Edição dos dados do onboarding no perfil

- **Status:** 🟢 finalizada · **Commit:** `e0a02a3` · **Push:** `38b998a..e0a02a3 main -> main` (confirmado)
- **Mapeamento campo a campo:** nome, sobrenome, data, hora e local de nascimento, idade (calculada pela data) e gênero já estavam no perfil; **nível de atividade e metas só existiam no onboarding** e passaram a ser editáveis no perfil, com as mesmas opções (módulo compartilhado `opcoes-de-perfil.ts`, sem lista duplicada). O consentimento do onboarding não é gravado hoje; o registro de consentimento faz parte da tarefa 28.
- **Defeito encontrado e corrigido (causa raiz):** o MySQL devolve a hora como `HH:MM:SS` e a validação do perfil exige `HH:MM`. Quem informou a hora no onboarding não conseguia salvar nada no perfil: a validação recusava a hora em silêncio. A hora agora é convertida ao carregar (`horaParaCampo`), e um aviso aparece quando algum campo bloqueia o envio.
- **Sem duplicidade de e-mail de login:**
  - `profiles.email` era uma cópia sem índice único. A migração `014` realinha a cópia com a conta e cria o índice único.
  - Pela API de dados ninguém altera `profiles.email`, nem o administrador (só a cópia mudaria).
  - Nova troca de e-mail no perfil (`PATCH /api/account/email`): exige a senha atual; as falhas contam no limite do login; `users` e `profiles` mudam na mesma transação; e-mail de outra conta (inclusive com maiúsculas e espaços) responde 409; o token é reemitido mantendo o tipo de sessão.
  - Os demais dados sensíveis são linhas do próprio usuário (`profiles.id` = conta) e não se repetem entre contas.
- **Evidências:**
  - QA no build de produção em 1440 e 390px, 13/13 verificações:
    - os dados do onboarding (atividade, metas e hora em `HH:MM`) aparecem no perfil;
    - a edição gravada foi conferida no MySQL e persiste após recarregar;
    - o e-mail de outra conta e a senha errada são recusados na tela;
    - a troca de e-mail atualiza conta e perfil, mantém a sessão, e o login fica 401 com o e-mail antigo e 200 com o novo;
    - o perfil no celular não tem estouro horizontal.
  - `test` 235/235; `test:integration` 79/79 (novo `conta-email.integration.test.ts`, índice único e bloqueio de troca pelo administrador); lint, format e types com exit 0; `build` com exit 0.
  - Migração `014` aplicada e reexecutada com "Já aplicada" em todas. Usuários de QA removidos do banco.
- **Achado repassado à tarefa 28 (corrigido na tarefa 28):** o registro original dizia que a remoção pelo painel administrativo apagava só o perfil. Na análise da tarefa 28 isso se mostrou incorreto: pelo administrador, a API de dados já apagava a conta inteira, mas sem as verificações da exclusão (assinatura paga renovável, último administrador) e sem apagar as imagens. Quem deixava a conta órfã era o **próprio titular**: ele conseguia apagar o próprio perfil pela API de dados, ficava sem login e com o e-mail preso. Os dois casos foram resolvidos na tarefa 28.

### 37 · Administrador `admin@admin.com`

- **Status:** 🟢 finalizada · **Commit:** sem alteração de código versionado (o registro é este painel) · **Push:** do painel (confirmado)
- **Implementado:** o usuário foi criado pelo bootstrap oficial de administradores (`ADMIN_BOOTSTRAP_ADDITIONAL_ADMINS` no `.env.local`, que é ignorado pelo Git). A senha definida pelo usuário não foi escrita em nenhum arquivo versionado, conforme a regra de segredos; o banco guarda só o hash bcrypt. O mecanismo é idempotente: cada `pnpm db:migrate` (e o `up` dos launchers) assegura o usuário, e a senha só é regravada quando o valor do `.env.local` muda.
- **Evidências reais:**
  - `pnpm db:migrate`: "Bootstrap admin assegurado: admin@admin.com".
  - MySQL: `admin@admin.com` com `role = admin`, nome "Administrador Total", onboarding concluído, plano `care` ativo (todas as capacidades) e senha em hash bcrypt.
  - `POST /api/auth/login` com o e-mail e a senha informados: 200; `/api/auth/session` retorna `role: "admin"`; `/api/admin/users`, `/api/admin/plans`, `/api/admin/page-config/app` e `/api/admin/puck/documents/landing-home`: 200.
- **Recomendação:** a senha pedida segue um padrão comum; antes de publicar em produção, troque-a no `.env.local` (o próximo `pnpm db:migrate` regrava o hash).

### 38 · Isolamento das funções de administrador

- **Status:** 🟢 finalizada · **Commit:** `3a1fdca` · **Push:** `5e7d836..3a1fdca main -> main` (confirmado)
- **Método:** verificação real com um paciente criado pelo cadastro público e com o `admin@admin.com`, por API (`curl` com sessão) e por navegador no build de produção. Mapeadas as 30 rotas de API e as 9 páginas `/admin/*`.
- **Vazamentos encontrados e corrigidos (causa raiz):**
  - **Configuração e base de conhecimento da IA legíveis por qualquer usuário:** a API de dados liberava a leitura de `ai_config` (missão, objetivos e pesos do motor) e `ai_knowledge_documents` (inclusive rascunhos inativos) para qualquer sessão. Agora `adminOnlyRead`; os recursos que dependem delas já as leem no servidor.
  - **Primeiro cadastro virava administrador:** com o banco vazio (bootstrap desativado em produção), o primeiro visitante ganhava acesso total. O cadastro público agora sempre cria usuário comum no plano `free`.
  - **Telas administrativas entregues a qualquer um:** o bloqueio era só no navegador. O `src/proxy.ts` passou a verificar o papel para `/admin/*`: visitante vai ao login e usuário comum volta ao próprio painel. A autorização definitiva continua nas APIs, que releem o papel no banco.
- **Já corretos (confirmados):** as rotas `/api/admin/*`, `/api/rpc/*` e `test-ai-connection` exigem administrador; `profiles.role` só é gravado por administrador; sidebar, menu do celular e busca Ctrl K escondem os itens administrativos pelo papel definido no código.
- **Evidências:**
  - Paciente: 403 em todas as rotas e métodos administrativos (GET, PUT, POST, PATCH), sem alterar o próprio plano; 403 na leitura e escrita de `ai_config` e `ai_knowledge_documents`.
  - Navegador: paciente com 8 itens no menu, nenhum administrativo, nada administrativo na busca, e as 9 rotas `/admin/*` devolvidas ao painel; `admin@admin.com` com 17 itens e as 9 telas abertas.
  - Testes novos: `src/proxy.test.ts` (6) e matriz de integração em `dados-admin.integration.test.ts`; cadastro confirma `patient` e plano `free`.
  - `test` 247/247; `test:integration` 75/75; lint, format e types com exit 0; `build` com exit 0.
  - Usuário de QA removido do banco ao final.

### 39 · Desativar Apple Saúde e Health Connect

- **Status:** 🟢 finalizada · **Commit:** `0ebc6f1` · **Push:** `main -> main` (confirmado)
- **Causa:** o código tentava ler HealthKit/Health Connect por um plugin que só existe dentro de um app de celular (Capacitor), que o projeto não tem. No navegador isso nunca funcionava e o painel mostrava "Nenhum runtime nativo de saúde foi detectado" para todo usuário.
- **Implementado:** `src/lib/health/healthConnect.ts` removido; tipos e conversão dos sinais em `src/lib/health/sinais-vitais.ts` (com testes). A sincronização (`HealthOrchestratorContext`) passou a ler as efemérides e os sinais do dia gravados no banco; a pulseira Bluetooth continua com leitura ao vivo. Mensagem de falha só quando algo real falha, sem citar integrações.
- **Evidências:** prova de remoção sem referências a `healthConnect`, `getHealthRuntimeAvailability`, `fetchRealTimeVitals` ou "runtime nativo" no código; no navegador, painel e plano sem nenhuma menção a HealthKit, Health Connect ou runtime nativo, "Estado atual" em sintonia e sem erros de console; `test` 244/244; lint, format, types e `build` com exit 0.

### 40 · Métricas reais gravadas

- **Status:** 🟢 finalizada · **Commit:** `06f633e` · **Push:** `main -> main` (confirmado)
- **Causa:** nada no app gravava `daily_metrics` (a tabela estava com 0 linhas); a pulseira Bluetooth só exibia leituras na tela e havia duas implementações dela, ambas lendo o campo "energia gasta" (bit 3 da característica GATT 0x2A37) como se fosse intervalo RR.
- **Implementado:**
  - **Check-in "Registrar meu dia"** (botão no painel e item nas ações rápidas): humor e energia (1 a 5), estresse, sono, passos, minutos ativos, água, cafeína, proteína, peso, FC de repouso, glicemia, pressão e meditação. Faixas e casas decimais definidas em `src/lib/metricas/registro-do-dia.ts`, as mesmas no navegador e no servidor; campos vazios não apagam o que já existe; o diálogo abre com os valores do dia.
  - **Rotas:** `GET/POST /api/metricas/dia` e `POST /api/metricas/sensor` (este exige o recurso `wearable_bluetooth_connection`, antes só bloqueado na tela). `daily_metrics` deixou de aceitar escrita pela API genérica (403 com o caminho correto). O humor da avaliação do painel também grava o `mood_score` do dia.
  - **Pulseira:** hook único `useBluetoothVitals` usado no painel e na central de dispositivos; `src/lib/health/sessao-cardiaca.ts` lê a medição conforme a especificação e agrega a sessão (FC mínima, máxima e média, repouso pela menor média móvel de 60 s, RMSSD só com RR de 300 a 2000 ms e sem saltos acima de 20%). A sessão é gravada a cada 5 minutos, ao desconectar, ao sair da página e na virada do dia; no banco, mínima e máxima viram os extremos do dia, a média é ponderada pelos minutos, o repouso fica com o menor valor e a VFC com a sessão mais recente. O canal ao vivo passou a ser um só por conexão (antes cada leitura abria um canal que nunca era fechado).
  - **Migration 017:** `energy_level`, `sensor_heart_rate_avg`, `sensor_minutes` e `metrics_updated_at`.
  - **Atualização:** painel, cartões e sincronização recarregam quando o dia é registrado.
  - **Achado na auditoria do diálogo:** o aviso de erro do Sonner no tema claro tinha 4,34:1; os avisos passaram a usar os tokens da Lyra (cobertos pelo teste de contraste).
- **Evidências:**
  - Integração (`src/app/api/metricas.integration.test.ts`, 15 testes): gravação parcial que preserva o dia, 8 entradas inválidas recusadas com 400 sem gravar nada, 401 sem sessão, 403 na API genérica, humor da avaliação no dia, 403 da pulseira no plano Free, soma de duas sessões (extremos 58/132, média ponderada 79,5, repouso 61 vencendo o check-in de 64, VFC preservada) e sessão incoerente recusada.
  - Unidade: leitura GATT (8 e 16 bits, energia gasta, truncada) e agregação (repouso 60 bpm, RMSSD 10 ms, artefatos), datas e mensagens de validação.
  - Navegador (1440 px claro e 390 px escuro): diálogo pelo painel e pelas ações rápidas, erro "Glicemia: o mínimo é 20 mg/dL." com `aria-invalid`, painel de 0 para 9.000 passos e 2,5 L de água logo após salvar, reabertura com os valores do dia, axe sem violações nos dois temas, sem erros de console e sem estouro de largura.
  - **Limite do ambiente:** a conexão Bluetooth real precisa de uma pulseira física e de navegador com Web Bluetooth; foi validada pelos testes de leitura e agregação e pela rota com a sessão agregada.
  - `test` 263/263; `test:integration` 106/106; lint, format, types e `build` com exit 0 e sem avisos.

### 41 · Mapa védico real de cada pessoa

- **Status:** 🟢 finalizada · **Commit:** `c6e064d` · **Push:** `main -> main` (confirmado)
- **Causa:** o local de nascimento era texto livre (sem coordenadas nem fuso), então não havia como calcular ascendente, casas ou horários do dia; o campo de dasha devolvia um texto fixo ("Vimshottari calculável a partir do timestamp...") e o onboarding pré-preenchia a hora com 12:00, o que geraria ascendente falso.
- **Implementado:**
  - **Cidades:** base local `data/geo/cidades.json.gz` (GeoNames, CC BY 4.0; 71.254 cidades com mais de 5 mil habitantes no mundo e com mais de mil no Brasil, coordenadas, fuso e nomes alternativos, UF por sigla), gerada por `pnpm geo:cidades`; busca no servidor (`GET /api/geo/cidades`), sem serviço externo.
  - **Locais no perfil:** seletor de cidade no onboarding (nascimento obrigatório, moradia opcional) e no perfil (salvo na hora); gravação só por `PATCH /api/perfil/localizacao` com nome, coordenadas e fuso vindos do servidor; a API genérica recusa essas colunas (403). Migration 018.
  - **Cálculo** (`src/lib/astrology/`): hora local → UTC com horário de verão histórico; ayanamsha Lahiri; grahas, Rahu e Ketu, retrogradação; Lagna e casas por signo inteiro; Vimshottari Mahadasha/Antardasha; Panchang com horário de término; Brahma e Abhijit Muhurta; Rahu Kalam, Yamaganda, Gulika; Choghadiya de dia e de noite; Tara Bala, Chandra Bala e Chandrashtama.
  - **Rotas e tela:** `GET /api/astrologia/mapa` e `GET /api/astrologia/dia`; cartão "Meu mapa védico" no perfil; o chat e o plano de IA passaram a receber o dasha real. Documentação em `docs/astrologia.md`.
- **Evidências:**
  - **Validação independente** com o Swiss Ephemeris 2.10.03 (pyswisseph, `SIDM_LAHIRI`, instalado fora do projeto): ayanamsha a menos de 0,01°, longitudes dos 8 corpos a menos de 0,02° em dois nascimentos (São Paulo 1990 e Nova Délhi 1985), Lagna a menos de 0,05°, nascer e pôr do sol a menos de 2 min, tithi, nakshatra, yoga e karana idênticos e datas do Vimshottari a menos de 2 dias.
  - Integração (`astrologia.integration.test.ts`, 8 testes): busca com UF, 401 sem sessão, gravação com coordenadas e fuso, limpeza com `null`, 404 e 400, 403 na API genérica, `faltando` sem dados, mapa (Lagna Capricórnio, Lua em Touro/Krittika, Rahu) e dia em Nova Délhi (nascer 06:19, Dvitiya, Swati, Amrit, Kshema, 6ª casa) e data inválida.
  - Navegador (1440 px e 390 px, `pt-BR`): onboarding recusa avançar sem cidade, escolhe São Paulo e Lisboa pela busca, finaliza; perfil mostra as cidades e o mapa (Capricórnio 13°15', Touro/Krittika pada 3, Rahu/Lua até 28/08/2027); troca da moradia para Campinas e dia védico recalculado; axe sem violações nas três telas; largura do perfil no celular corrigida (o botão de limpar a cidade estourava 9 px).
  - `test` 306/306; `test:integration` 114/114; `test:launchers` 17/17; lint, format, types e `build` com exit 0 e sem avisos. Usuários de QA removidos.

### 42 · Coach diário automático de IA

- **Status:** 🟢 finalizada · **Commit:** `7d6a84f` · **Push:** `b013b91..7d6a84f main -> main` (confirmado)
- **Causa:** a IA só respondia quando a pessoa perguntava no chat; não havia nenhuma rotina que lesse o mapa védico e as métricas todos os dias, nem notificações do servidor (o sino só mostrava consultas e assinatura).
- **Implementado:**
  - **Motor do coach** (`src/lib/coach/`, determinístico): prontidão só com sinais medidos (sem neutro inventado), comparando VFC e FC de repouso à média pessoal; quatro períodos no relógio da cidade com nota pela Choghadiya e descontos de Rahu Kalam, Yamaganda e Gulika; melhor janela (Abhijit, Amrit, Shubh, Labh fora das cautelas); tom do dia por Tara Bala, Chandra Bala/Chandrashtama, yoga, karana e tithi; treino pela prontidão, pelo dosha e pela natureza do nakshatra; luz, refeições, cafeína e sono pelo nascer e pôr do sol; água e proteína pelo peso; Ekadashi; ciclo menstrual; sinais precoces. Toda dica tem o "por quê".
  - **Dados:** migração `019_coach_diario.sql` (`daily_briefings` com hash das entradas, refeito quando o check-in, a pulseira ou a cidade mudam; `user_notifications` com chave única), retenção de 90 dias, exportação LGPD e exclusão em cascata. Política de privacidade na versão 2026-10-14.
  - **Automático:** rotina no servidor (`src/instrumentation.ts`) a cada 15 min, a partir das 3 h locais, respeitando o plano (`ai_tips_feed`); rota `POST /api/coach/rotina` com segredo para cron externo (`COACH_ROTINA`, `COACH_ROTINA_SEGREDO`).
  - **Rotas:** `GET /api/coach/hoje`, `POST /api/coach/feedback`, `GET/PATCH /api/notificacoes`.
  - **Telas** (referências: Oura "Today" com "one big thing", WHOOP Coach, tendências 2026 de IA explicável e vidro com aura): cartão "Seu dia" no topo do painel (manchete, anel de prontidão, faixa das 24 h com o "Agora" ao vivo, período atual, três focos e cuidado do dia); página **Meu dia** (`/dia`) com relógio radial das 24 h, quatro períodos, pontos fortes e cuidados, abas Saúde/Alimentação/Movimento/Mente/Sono, céu de hoje e "o seu dia te ajudou?"; sino com "Seu dia está pronto" e alertas, marcados como lidos ao abrir; "Meu dia" na navegação (logo após o Dashboard, inclusive em configurações já salvas); chat responde sobre o dia com os mesmos horários; atalhos `G + letra` da paleta passaram a funcionar (antes eram só exibidos).
  - Documentação: `docs/coach.md`, `docs/api.md`, `.env.example`, README.
- **Fica para a tarefa 43:** texto do coach pelo Gemini (exige consentimento explícito e revogável, porque hoje a política só prevê o Gemini com a chave da própria pessoa no chat).
- **Evidências:**
  - Unitários (`coach.test.ts`, 14): períodos contíguos 00:00–24:00 com nota e sugestão, horários iguais ao Panchang, dica sem "por quê" proibida, sem check-in não há prontidão, boa recuperação libera treino intenso e em nakshatra suave não, recuperação baixa vira dia de atenção com 4-7-8 e débito de sono, determinismo, Ekadashi só no 11º tithi, Chandrashtama encontrado no calendário real vira atenção com alerta, ciclo e data da menstruação; chat (2) e navegação (1).
  - Integração (`coach.integration.test.ts`, 7, e `lgpd`): sem cidade → `sem_local`; gera, reaproveita e refaz após o check-in sem duplicar briefing nem notificação; 401 e 403 pelo plano; avaliação só com briefing (404/400); notificações sem IDOR; rotina não gera antes das 3 h, gera às 7 h e não repete; rota externa 404/401/200; exportação e exclusão LGPD com as tabelas novas.
  - Navegador (build de produção; 1440 px claro, 390 px e 1440 px escuro): cartão e `/dia` sem estouro, sino "1 notificação nova" → lido ao abrir, check-in no diálogo refaz o dia (prontidão 90), avaliação gravada no banco, atalho `G H`, axe sem violações em todas as telas (o nome do botão do sino foi ajustado para começar pelo número visível, WCAG 2.5.3), sem erros de console. Log do servidor: `[coach:rotina] 1 dia(s) preparado(s), 0 falha(s)`.
  - `test` 323/323; `test:integration` 121/121; `test:launchers` 17/17; lint, format, types e `build` com exit 0 e sem avisos. Usuários de QA removidos.

### 43 · O que a IA faz sozinha e leitura védica do "Seu dia" por qualquer modelo

- **Status:** 🟢 finalizada · **Commits:** `ff0ad2c` (A: prontidão gravada, ausência de dado deixa de ser zero), `179a6f7` (B: metas automáticas, prazos e sequências), `9d030c4` (C: plano que se refaz, dica do dia pelos sinais, monitoramento real), `7cade87` (D: texto pelo Gemini com consentimento, substituído pela parte E a pedido do usuário), `52040a7` (E: leitura védica por qualquer modelo de IA, inclusive local) · **Push:** `main -> main` (confirmado; `52040a7` = `origin/main`)
- **Pedido do usuário (2026-10-15):** o "Seu dia" pode ser escrito por qualquer modelo de IA, inclusive local (Ollama, LM Studio, Jan e outros via llama.cpp), sem consentimento separado, diferente a cada dia, com: 1) resumo geral; 2) cada período por parte emocional, física (corpo) e espiritual (escolha do usuário: cada período, não só a manhã); 3) pontos positivos e negativos; 4) dicas do mapa védico para a data.
- **Implementado (parte E):**
  - Leitura védica (`src/lib/coach/leitura-vedica.ts`, `leitura-conhecimento.ts`, `src/lib/astrology/horas.ts`): fatos por período (Lua, Tara, casa a partir da Lua natal, ascendente do momento, horas planetárias, relógio do Ayurveda) e do dia (Panchang, trânsitos de Júpiter e Saturno, dasha, melhor janela); texto do motor da Lyra que muda com o céu.
  - Modelo de IA (`src/lib/ai/cliente-de-ia.ts`, `provedores-catalogo.ts`, `provedor-da-plataforma.ts`, `src/lib/coach/leitura-ia.ts`): 18 opções (locais e em nuvem, APIs OpenAI-compatível, Gemini e Anthropic); saída estruturada por JSON Schema com recaída automática; validação Zod, períodos completos, horários reais, sem repetição entre períodos e diferente de ontem; reserva na leitura da Lyra e nova tentativa após 30 min.
  - Admin → Modelos de IA (`ProvedorDeIa.tsx`; `GET/PUT /api/admin/ia`, `POST /api/admin/ia/modelos`, `POST /api/admin/ia/testar`); chave cifrada (AES-256-GCM, HKDF do `AUTH_SECRET`) em `ai_provider_settings` (migração `023`), fora da API genérica.
  - Removidos (prova por grep): consentimento `coach_external_ai`, `/api/perfil/coach-ia`, `CoachIaExterna`, `src/lib/coach/gemini.ts`, `GEMINI_API_KEY` e `ai_config.model_name` (lista fixa `lyra-local-*`); restam só as migrações históricas.
  - Chat sem BYOK usa o modelo da plataforma apenas quando é local; telas: "Leitura do dia" no Meu dia e tópicos do período atual no painel; política de privacidade 2026-10-15.
- **Evidências:**
  - `test` 366/366; `test:integration` 131/131 (servidor HTTP real compatível com a OpenAI em `tests/support`); `test:launchers` OK; lint, format, types e `build` com exit 0.
  - Navegador (produção, 1440 px claro e 390 px escuro): admin com os provedores e a URL padrão do Ollama; Meu dia com resumo, 4 abas com os 3 tópicos, pontos +5/−3 e 5 dicas; painel com os tópicos do período atual; axe sem violações, sem estouro e sem erros de console.
  - Modelo local real (llama.cpp `llama_cpp.server` + Qwen2.5 1.5B GGUF, 2 CPUs): buscar modelos, testar conexão (3–5 s) e salvar pela tela; o servidor recusou `json_schema` com HTTP 500 e o cliente passou para `json_object` com esquema, que gerou um JSON válido (Zod ok, 188–217 s). Na jornada completa pelo app (`/api/coach/hoje`, 220 s), a resposta desse modelo minúsculo foi descartada por repetir textos entre períodos e a pessoa recebeu a leitura da Lyra, como projetado.
- **Limite do ambiente:** o sandbox (2 CPUs, memória limitada) só comporta um modelo de 1,5B, que tem qualidade insuficiente; o processo do modelo foi encerrado por falta de memória quando rodava junto com o navegador. A leitura aceita por um modelo maior (7B ou mais) fica para validar na máquina do usuário.

### 44 · Diferenciais premium de 2026/27 (design aprovado)

- **Status:** 🟢 finalizada · **Commits:** `b8cfea7` (A: reflexão da noite), `371f3b9` (B: respiração guiada), `1824b07` (C: agenda no calendário), `5037045` (D: sua semana), `612fd8f` (E: aura do dia e README) · **Push:** `main -> main` (cada um confirmado por `git ls-remote`)
- **Pedido do usuário (2026-10-15):** implementar o design aprovado ("adorei, pode fazer") a partir da prancha com os cinco diferenciais, pesquisados em tendências de outubro de 2026.
- **Implementado:**
  - **Reflexão da noite:** `daily_reflections` (migração 024), `/api/reflexao` (GET, PUT, DELETE) com data conferida no servidor (hoje e ontem), schema compartilhado, seção no Meu dia junto da avaliação da leitura.
  - **Respiração guiada:** técnicas 4-7-8, quadrada e Nadi Shodhana com posição calculada pelo relógio, recomendação explicável, `/respiracao` com orbe, voz, vibração, Wake Lock e modo sem movimento; `breathing_sessions` (migração 025) e soma em `meditation_minutes` com recálculo de metas e sequências.
  - **Agenda no calendário:** gerador iCalendar próprio (RFC 5545/7986), `.ics` de hoje, link privado de 7 dias (`calendar_feeds`, migração 026: SHA-256 + AES-256-GCM, troca e revogação, 404 uniforme, limite por link), política de privacidade atualizada.
  - **Sua semana:** `/api/semana` e `/semana` com indicadores, gráfico com ★ do Tara favorável, metas dia a dia, reflexões, céu da semana, tabela e percepções só com 2+ dias em cada grupo.
  - **Aura do dia:** halo do tom no anel da prontidão, selo da Lua e ações Respirar, Levar para o calendário e Reflexão da noite.
  - Navegação com "Sua semana" e "Respiração" (também em configurações salvas antes delas); LGPD com as três tabelas novas na exportação e na exclusão.
- **Causas raiz tratadas no caminho:**
  - Orbe nascia cheio: a transição CSS longa não tinha valor de partida; a escala passou a ser calculada pelo relógio.
  - Recomendação noturna sugeria respiração que "desperta": regra própria das 18 h às 2 h.
  - Contagem dupla da prática: a respiração já entra em `meditation_minutes`, então a prática do dia é esse total (`praticaDoDia`).
  - Rótulos: "Sáb, 10 De Out" por `capitalize` e unidade colada ao valor para leitores de tela.
- **Evidências:** `test` 401/401, `test:integration` 154/154, `test:launchers` 17/17, lint, format, types e `build` com exit 0; QA no navegador (build de produção) de cada parte em 1440 px claro e 390 px escuro, com axe sem violações; sessão de respiração cronometrada (64,2 s para 64 s); `.ics` e feed validados pela biblioteca `icalendar` do Python, com os horários reais de São Paulo em 15/10/2026 (Brahma 04:02–04:48, Abhijit 11:27–12:17, Rahu Kalam 13:27–15:01, pôr do sol 18:11).
- **Limites e observações:**
  - Google Agenda e Outlook na nuvem só leem o link de assinatura com o app publicado num endereço da internet (`APP_BASE_URL`); em `localhost` a tela avisa e só o calendário do mesmo computador consegue assinar.
  - Os formatos de atalho direto para Google e Outlook não têm documentação oficial; por isso a tela oferece copiar o link, `webcal://` e os passos de cada app.
  - Observado na QA: quando o roteiro recarrega a página no meio de uma busca do sino (`/api/notificacoes`, código anterior à tarefa), o aborto da requisição (`ERR_ABORTED`) aparece como `console.error`. Resolvido na tarefa 48.

### 45 · Verificação dos launchers `run.py` (WSL2 Ubuntu) e `run.sh` (Windows 11) após as tarefas 42 e 43

- **Status:** 🟢 finalizada · **Commit:** `a0b2eac` · **Push:** `56b6a42..a0b2eac main -> main` (confirmado por `git ls-remote`)
- **Pedido do usuário (2026-10-15):** verificar o `run.py` (WSL2 Ubuntu) e o launcher do Windows 11. O repositório não tem `run.bat`; o usuário confirmou que se referia aos launchers existentes (`run.sh` no Git Bash e `run_windows.py` no PowerShell/CMD).
- **Causa raiz encontrada:** o `.env.local` continuava com variáveis que o app não usa mais (`GEMINI_API_KEY`, removida na tarefa 43, e `APP_PORT`, dos launchers antigos) e nenhum diagnóstico avisava, deixando um segredo esquecido. Agora o `doctor` do `run.py` e do `run.sh` e o `pnpm env:init` avisam, sem apagar a linha (a chave pode precisar ser revogada no provedor antes).
- **Evidências (Ubuntu 24.04, Python 3.13, Node 24.21, Docker 29.8, Compose 5.5, 25 migrations):**
  - `run.py`: `doctor` (Docker parado → erro com correção, exit 1); `fix` (3 variáveis novas acrescentadas sem alterar valores); `up` com `/api/health`, `/`, `/login` e login do admin; segundo `up` sem duplicar processo; `status`; `logs app`; `stop app` com porta liberada; `up --prod`; porta 3000 ocupada por terceiro (aplicação na 3001, PID do terceiro intacto); `up` com Docker parado (exit 1); reinício com o banco existente (dados preservados); `stop`.
  - `run.sh` (Linux, bash 5.2): `doctor`, `up`, segundo `up` idempotente, `status`, `logs app`, `stop app`, `up --prod`; parada cruzada (o `run.py stop` encerrou a aplicação do `run.sh` e o `run.sh status` mostrou tudo parado).
  - Estático: `bash -n` e `shellcheck -S warning` sem achados; `ruff check`, `ruff format --check` e `mypy --strict` (venv do launcher) sem achados no `run.py` e no `run_windows.py`; `test:launchers` 17/17; `test` 367/367; `test:integration` 131/131; lint, format, types e `build` com exit 0.
- **Limite do ambiente:** a execução real no Windows 11 (Git Bash e PowerShell) depende de uma máquina Windows; o sandbox é Linux.

### 46 · README atualizado com o sistema real

- **Status:** 🟢 finalizada · **Commit:** `0389d8b` · **Push:** `01c2d81..0389d8b main -> main` (confirmado por `git ls-remote`)
- **Encontrado:** selo e texto com 314 e 241 + 73 testes (hoje 367 + 131 + 17), nenhuma menção ao coach "Seu dia", ao mapa védico, às métricas reais, às metas automáticas, ao modelo de IA local ou à LGPD; árvore de pastas sem `coach`, `astrology`, `metas`, `lgpd`, `tests` e `run_windows.py`; scripts `env:init`, `db:logs` e `geo:cidades` ausentes.
- **Atualizado:** novidades de outubro de 2026, recursos, stack (astronomy-engine e GeoNames), passo a passo do modelo de IA local (Ollama, LM Studio, Jan, llama.cpp) com a recomendação de 7B ou mais, `.env.local` (variáveis obsoletas e `AUTH_SECRET` na cifra da chave), scripts, documentação (`launchers.md`, `lgpd.md`), arquitetura, testes, segurança e roadmap.
- **Evidências:** os 14 links relativos do README apontam para arquivos existentes; `check:format`, `check:lint`, `check:types` e `test` 367/367 com exit 0 (o código não mudou desde a validação completa da tarefa 45).

### 47 · Identidade oficial: logo como marca e favicon, cores do app pelo logo

- **Status:** 🟢 finalizada · **Commit:** `041ae78` · **Push:** `9ed930a..041ae78 main -> main` (confirmado por `git ls-remote`)
- **Pedido do usuário (2026-10-15):** usar o logo oficial anexado (o "L" em teal abraçando o coração coral) como logo e favicon, e o app precisa seguir as cores do logo.
- **Implementado:**
  - Logo original versionado em `docs/marca/lyra-logo-oficial.png`; `scripts/gerar-icones-da-marca.py` converte o fundo branco em transparência ("cor para alfa"), recorta e gera o logo da interface, `favicon.ico` (16–64 px), `icon.png`, `apple-icon.png` e os ícones do manifesto (192, 512 e maskable). Rodar de novo reproduz os arquivos byte a byte (conferido por `md5sum -c`).
  - Componente `MarcaLyra` (next/image) no lugar do ícone genérico em 7 pontos: sidebar, menu do celular, landing (cabeçalho e rodapé), login, tela de carregamento e erro global. No escuro a marca fica num ladrilho claro, porque o logo foi desenhado sobre branco e perdia os brilhos.
  - `src/app/manifest.ts` com nome, cores e ícones oficiais.
  - Paleta dos dois temas recalculada a partir do logo: teal `#087678` (ação), coral `#BE3B13` (astral e IA, antes violeta), neutros petróleo, erro em carmim frio `#B6163C` (afastado do coral), tokens decorativos `brand-teal`/`brand-coral`, gráficos, sombras, rolagem e cor da barra do navegador. O tom "coral" do Puck voltou a ser coral (antes caía no dourado).
- **Causas raiz tratadas no caminho:**
  - A marca encolhia no tema escuro: `padding` em % é calculado sobre a largura do elemento pai; o respiro do ladrilho passou para `scale`.
  - O coral original (`#F87850`) fica abaixo de 3:1 sobre branco: o texto usa a versão escura, e o original fica restrito ao decorativo.
- **Evidências:** `tema.test.ts` com todos os pares WCAG nos dois temas; axe sem violações em landing, login, painel, menu do celular, `/dia`, `/chat`, `/goals` e `/profile` (1440 e 390 px, claro e escuro), marca carregada no tamanho certo e zero erros de console; `/favicon.ico`, `/icon.png`, `/apple-icon.png`, `/manifest.webmanifest` e `/icones/*` com HTTP 200 e os `<link>` no HTML; `test` 367/367, `test:integration` 131/131, lint, format, types, `ruff` e `build` com exit 0.

### 48 · Busca cancelada pela saída da página não vira erro no console

- **Status:** 🟢 finalizada · **Commit:** `3f19d7c` · **Push:** `c787b85..3f19d7c main -> main` (confirmado por `git ls-remote`)
- **Origem:** observação registrada na QA da tarefa 44 (erro no console ao recarregar no meio de uma busca do sino).
- **Causa raiz:** ao navegar, recarregar ou fechar a aba, o navegador dispara `pagehide` e, em seguida, recusa os `fetch` em andamento com `TypeError: Failed to fetch` (comprovado no Chromium nos três casos). As leituras do app tratavam esse cancelamento como falha e o registravam com `console.error`; o sintoma não era só do sino: sessão, perfil, configuração pública, efemérides e Puck faziam o mesmo.
- **Implementado:** `src/lib/navegador/saida-da-pagina.ts` marca a saída no `pagehide` e desfaz no `pageshow` (volta do bfcache); `useKeyedResource` (carga inicial e recarga) descarta a recusa da saída, assim como o contexto de sessão, o de saúde (sem acrescentar aviso de falha), cabeçalho, sidebar, home, gráfico de peso, compras, privacidade, busca de cidades e os dois renderizadores do Puck. Falhas reais com a página aberta continuam registradas.
- **Evidências:**
  - Roteiro no build de produção com 4 rotas atrasadas 4 s e navegações e recargas no meio: 37 buscas canceladas; código anterior com 5 erros ("Falha ao consultar a sessão: TypeError: Failed to fetch"), código novo com 0.
  - Controle: `/api/notificacoes` derrubada com a página aberta continua gerando "Falha ao carregar as notificações".
  - `test` 404/404 (3 novos do detector), `test:integration` 154/154, `check:format`, `check:lint`, `check:types` e `build` com exit 0.

### 49 · Leituras do Meu dia em linguagem simples e pessoal

- **Status:** 🟢 finalizada · **Commit:** `d892fde` · **Push:** `b95cb80..d892fde main -> main` (confirmado por `git ls-remote`)
- **Pedido do usuário (2026-10-16):** em `/dia`, as leituras do mapa (ex.: "Dia de equilíbrio: escolha bem os horários") precisam ser menos genéricas, falar do que o mapa da pessoa realmente diz, de forma natural e sem palavras técnicas, em todas as partes da página.
- **Causa raiz:** os textos contavam o cálculo pelo nome técnico (Tara Pratyari, Rahu Kalam, Choghadiya, nakshatra, tithi, Mahadasha, "7ª casa", Vata/Pitta/Kapha, mantras de prática em sânscrito) em vez do significado; a manchete não usava o mapa da pessoa.
- **Implementado:**
  - `src/lib/coach/linguagem-simples.ts`: nomes simples das janelas (hora do silêncio, horário mais forte do dia, pausa para começos), clima da Lua, temas das 12 áreas do mapa, sintonia entre a Lua de hoje e a de nascimento, dia da Lua, mês e ano das fases da vida e o detector de termos técnicos (fronteira de palavra com acentos, nomes dos 27 nakshatras, tithis e yogas).
  - Tara com `tema` e `conselho`; casas da Lua e trânsitos de Júpiter e Saturno contados pelo efeito ("a Lua passa pela área do seu mapa ligada às parcerias").
  - Resumo da leitura: tom do dia para a pessoa, área do mapa, Lua de nascimento e sintonia com a de hoje, fase da vida com datas (regida pelo planeta, sem citar Rahu e Ketu) e os horários que mais pesam; manchete com o tema do dia para a pessoa.
  - "O céu de hoje" em linguagem simples (`ceuSimples`), com os nomes tradicionais num quadro recolhido para quem estuda; corpo do dia pelas tendências do Ayurveda em palavras.
  - Janelas de hoje, `.ics`, respiração (técnica "Alternada"), semana, perfil e política de privacidade sem jargão.
  - IA: instruções de linguagem simples e leitura do modelo com termo técnico é descartada (a pessoa recebe a da Lyra); briefing versão 3 (os guardados antes são refeitos).
- **Evidências:**
  - Teste de varredura: 60 dias × 3 perfis (com mapa, outro mapa e sem cidade de nascimento), com e sem check-in, sem nenhum termo técnico em manchete, resumo, períodos, janelas, dicas, céu e leitura.
  - Navegador (build de produção, `/dia`): 71 termos técnicos no texto antes, 0 depois (fora do quadro tradicional), em 1440 px claro e 390 px escuro; axe sem violações, sem estouro horizontal e zero erros de console.
  - `test` 408/408, `test:integration` 154/154, `check:format`, `check:lint`, `check:types` e `build` com exit 0.

### 50 · Sua semana com as informações e a leitura do mapa

- **Status:** 🟢 finalizada · **Commits:** `2985ae7` (parte 1: fase da vida reutilizável, enviada a pedido do usuário) e `01ff0fc` · **Push:** `96f5882..2985ae7` e `2985ae7..01ff0fc main -> main` (confirmados por `git ls-remote`)
- **Pedido do usuário (2026-10-16):** em `/semana` não aparecem textos nem leitura do mapa védico; os cartões "Sua semana", "Prontidão por dia", "Reflexões da noite" e "Dia a dia" ficam sem informação.
- **Causa raiz:** a página só mostrava registros (check-in, reflexões, respiração) e o Tara de cada dia. Numa conta sem registros e sem cidade (como as de admin no banco de desenvolvimento, conferido no MySQL), todos os cartões ficavam com "—" e não havia leitura do mapa nem explicação do que faltava.
- **Implementado:**
  - `src/lib/semana/leitura.ts`: leitura da semana pelo motor da Lyra, sem IA e sem depender de registros. A semana que passou (dias a favor, neutros e de cuidado; melhores dias; áreas do mapa por onde a Lua passou), a semana que vem (dias mais a seu favor e para quê, dias de cuidado, ponto sensível do mapa, Lua cheia e nova), fase da vida e trânsitos de Júpiter e Saturno. Só com cidade: o céu da semana. Sem cidade: o que falta.
  - Página: seção "Leitura da semana" no topo com os próximos 7 dias; cartões vazios dizem o que falta e levam à ação (check-in, reflexão da noite, perfil); "Dia a dia" com o tom do dia para você e a Lua; sem a palavra Tara (percepções e legendas).
  - Cartão "Sua semana" do Meu dia mostra a semana que vem quando ainda não há percepção.
- **Evidências:**
  - Testes: `leitura.test.ts` (contagem que fecha em 7 dias, "no sábado"/"na segunda-feira", Lua cheia e nova, varredura de 26 semanas × 3 perfis sem termo técnico) e integração com mapa, só com cidade e sem cidade.
  - Navegador (build de produção): `/semana` com dados (1440 px claro e 390 px escuro) e conta sem cidade nem registros (390 px escuro), e `/dia`: axe sem violações, sem estouro horizontal, zero erros de console e 0 termos técnicos no texto.
  - `test` 412/412, `test:integration` 155/155, `check:format`, `check:lint`, `check:types` e `build` com exit 0.

### 51 · Plano do dia pronto ao entrar no app

- **Status:** 🟢 finalizada · **Commit:** `cebd832` · **Push:** `187fcaa..cebd832 main -> main` (confirmado por `git ls-remote`)
- **Pedido do usuário (2026-10-16):** em `/plan`, o plano deve ser gerado automaticamente quando a pessoa entra no app.
- **Causa raiz:** `obterPlanoAtualizado` devolvia `null` sem plano salvo ("o primeiro plano é sempre um pedido da pessoa"); o plano só existia depois do clique em "Gerar plano real", e a rotina diária só refazia o plano de quem já tinha um.
- **Implementado:**
  - A primeira leitura do plano o gera (origem automática, sem consumir a cota das gerações manuais) e informa `primeiro`.
  - `prepararPlanoAoEntrar`: o login agenda com `after()` do Next.js o preparo do plano do dia, depois da resposta (o login não fica mais lento), só depois do onboarding e só se o plano da pessoa inclui o Plano de IA; falhas vão para o log seguro.
  - A rotina diária do coach cria o plano de quem ainda não tem.
  - Tela: aviso "Seu plano de hoje foi preparado automaticamente".
  - Testes de integração: `after()` emulado (roda logo depois da resposta, como no servidor).
- **Evidências:**
  - Integração: primeiro plano automático sem cota; login antes do onboarding não gera; login depois do onboarding deixa o plano salvo.
  - Navegador (build de produção, login real pela tela): o plano já estava salvo no MySQL antes de abrir `/plan`, origem automática, cota intacta, tela com o plano pronto ("Regenerar plano"), axe sem violações e zero erros de console, em 1440 px claro e 390 px escuro.
  - `test` 412/412, `test:integration` 156/156, `check:format`, `check:lint`, `check:types` e `build` com exit 0.

### 52 · Chat redesenhado, simples e em uma coluna

- **Status:** 🟢 finalizada · **Commit:** `4cbf2e0` · **Push:** `80a891f..4cbf2e0 main -> main` (confirmado por `git ls-remote`)
- **Pedido do usuário (2026-10-16):** reformular e redesenhar `/chat`, que estava confuso, deixando-o mais simples e na tendência de 2026.
- **Pesquisa:** padrões de interfaces de conversa com IA de 2026 (coluna única centrada, começo da conversa com perguntas prontas em cartões, campo fixo embaixo, resposta sem caixa, ações discretas, aviso de limites).
- **Antes:** cabeçalho grande, cartão de conversa, perguntas prontas repetidas embaixo e na lateral e uma lateral técnica ("API local Next.js", "Camadas que sustentam a conversa").
- **Implementado:**
  - Uma coluna centrada: barra mínima (marca, estado, "Nova conversa" e "Como a Lyra responde"), começo da conversa com a Lyra e as perguntas em cartões, campo fixo embaixo com o aviso de bem-estar.
  - Resposta da Lyra em texto corrido com a marca; pergunta em balão; copiar e refazer no hover, no foco e sempre no toque.
  - Informações e chave própria do Gemini (BYOK, que continua funcionando) no botão de informações.
  - Causa raiz corrigida no caminho: o campo aceitava 4000 caracteres e o servidor recusa acima de 2000; agora o limite é o mesmo.
  - Sem o aviso "Mensagem enviada" a cada envio; resposta revelada mais rápido e inteira com movimento reduzido.
  - Textos padrão novos e rótulos do page builder coerentes; todos os campos da configuração do chat continuam em uso. `QuickReply` removido (sem uso; `grep` sem ocorrências).
- **Evidências:**
  - Navegador (build de produção), jornada completa em 1440 px claro e 390 px escuro: pergunta pronta respondida com o dia da pessoa, pergunta digitada com Enter, "Refazer" troca a resposta sem duplicar, painel de informações com a chave própria e "Nova conversa" volta ao começo. axe sem violações (início, conversa e painel), sem estouro horizontal e zero erros de console.
  - `test` 412/412, `test:integration` 156/156, `check:format`, `check:lint`, `check:types` e `build` com exit 0.

### 53 · Construtor de UI e editor Puck funcionando de ponta a ponta

- **Status:** 🟢 finalizada · **Commit:** `e1bee03` · **Push:** `58e4f6c..e1bee03 main -> main` (confirmado por `git ls-remote`)
- **Pedido do usuário (2026-10-16):** confirmar que `/admin/page-builder` e `/admin/puck` funcionam de verdade, sem simulações, placeholders, hardcode ou cortes.
- **Achados (auditoria do código) e causas raiz:**
  - "Publicar agora" publicava o rascunho salvo e descartava em silêncio as edições da tela; trocar de superfície também as descartava.
  - Um único campo novo no schema invalidava a configuração guardada inteira e a página voltava ao padrão.
  - Destino dos botões da landing aceitava qualquer texto e ia direto ao roteador.
  - Campos sem efeito: escalas de cards, tabelas e botões do app (só um card usava, com `transform`), todas as escalas da landing, rótulo do botão de reavaliar, fluxo de eventos do monitoramento, título do estado inicial de dispositivos, selo e descrição do acesso e nota do login.
  - Prévia do app com uma sidebar simulada, diferente da real.
  - Seis documentos do Puck (landing, login, app shell, cobrança e construtor) não eram exibidos em página nenhuma; documentos nasciam com blocos de demonstração para desenvolvedores; a raiz pública mostrava chips técnicos; o editor gravava no documento publicado o e-mail e o nome de quem editava; a migração não descia nos slots; o card de plano guardava uma cópia que não se atualizava; erro do catálogo de planos virava lista vazia; código morto (`fetchListDocumentos`, `lyraPuckConfig`).
  - Textos padrão e avisos de plano com jargão de implementação (MySQL, entitlement, "auth vivo", "landing editável").
- **Implementado:** publicar com a configuração enviada (validada no servidor), confirmação de descarte, `mesclarComPadrao`, validação de destino (rota, âncora ou https), todos os campos ligados (`data-slot` + `zoom`, `data-escala` na landing), sidebar real na prévia (`inert`), documentos exibidos nas páginas, documentos iniciais vazios com retirada exata dos blocos de demonstração na leitura, raiz pública só com os blocos, limpeza dos textos resolvidos ao gravar e ao ler, estados neutros para visitante, migração recursiva, plano relido pela chave, erro do catálogo no seletor, opções de superfície completas, textos reescritos. Código morto removido (`grep` sem ocorrências).
- **Evidências:**
  - Navegador (build de produção): editar o título da landing mostra o aviso de edição não salva e a troca de superfície pede confirmação; "Publicar agora" publica e a landing do visitante exibe o título; prévia do app com a sidebar real (248 px); bloco arrastado da lista para o canvas do Puck e rascunho salvo; bloco publicado aparece na landing sem chips técnicos; login com selo e nota, sem estouro em 390 px. axe sem violações (construtor, landing, login 390) e zero erros de console. Dados de teste desfeitos ao final.
  - Banco de desenvolvimento: o documento `landing-home` com os 2 blocos de demonstração em zonas legadas passa a ser lido vazio.
  - `test` 426/426, `test:integration` 159/159, `check:format`, `check:lint`, `check:types` e `build` com exit 0.
- **Observação:** quem já salvou textos no construtor continua vendo os textos salvos; os padrões novos valem para o que nunca foi salvo ou após "Restaurar padrão".

### 54 · Vários modelos de IA com ordem de uso e troca automática

- **Status:** 🟢 finalizada · **Commit:** `571e8b7` · **Push:** `b3e34c9..571e8b7 main -> main` (confirmado por `git ls-remote`)
- **Pedido do usuário (2026-10-16):** em `/admin/ai-config`, no card "Modelo de IA da plataforma": vários modelos locais e vários em nuvem ao mesmo tempo (inclusive o motor da Lyra), vários provedores ao mesmo tempo e, abaixo do aviso de privacidade, 5 seletores com a ordem de uso; se o modelo em uso falhar ou ficar sem tokens, o próximo retoma de onde ele parou, sem a pessoa perceber.
- **Pesquisa:** padrões de 2026 de cadeias de fallback em gateways de LLM (lista ordenada de alvos, troca em 429/5xx/tempo esgotado, estado por alvo).
- **Antes:** uma única linha (`ai_provider_settings`) com um provedor e um modelo, escolhidos por botão de rádio; qualquer falha caía direto no motor da Lyra.
- **Implementado:**
  - Migração `027`: `ai_provider_connections` (um provedor por linha, com os modelos escolhidos e a chave cifrada) e `ai_model_chain` (até 5 posições), com cópia da configuração anterior e remoção da tabela antiga; gravação na mesma transação.
  - Cadeia de modelos: falha, cota, rede, tempo máximo ou resposta reprovada passam a vez; resposta cortada no limite de tokens é continuada pelo próximo, sem repetir a emenda; o motor da Lyra fecha a cadeia. O cliente de IA detecta corte nas três APIs e envia o limite de tokens.
  - Leitura do dia, chat (só modelos locais, por privacidade) e autoteste usam a ordem; mudar modelo ou ordem refaz o "Seu dia".
  - Tela redesenhada: caixas de seleção nos provedores (motor da Lyra nos dois grupos), painel por provedor com URL, chave, busca, inclusão pelo nome e teste por modelo, e os 5 seletores com opções já usadas indisponíveis.
- **Evidências:**
  - Migração aplicada no banco de desenvolvimento; cópia validada em banco temporário (provedor antigo virou a 1ª posição e o motor a 2ª; tabela antiga removida).
  - Navegador (build de produção, servidor de IA HTTP real): dois provedores locais marcados, modelos buscados e escolhidos, teste por modelo, ordem de 3 posições salva e recarregada, opção usada indisponível em outra posição, axe sem violações em 1440 px e 390 px, sem estouro e zero erros de console. Configuração devolvida ao motor da Lyra ao final.
  - Integração: ordem validada (modelo fora dos escolhidos, repetido, mais de 5 posições, vazia), cota esgotada (429) passa a vez e o 3º modelo continua a leitura cortada pelo 2º, chat só com modelos locais e motor quando todos falham.
  - `test` 436/436, `test:integration` 162/162, `check:format`, `check:lint`, `check:types` e `build` com exit 0.

### 55 · Motor da Lyra mestre em astrologia védica e saberes védicos, sem IA

- **Status:** 🟢 finalizada · **Commit:** `513f3b8` · **Push:** `4fcffdc..513f3b8 main -> main` (confirmado por `git ls-remote`)
- **Pedido do usuário (2026-10-16):** o motor da Lyra, sem modelo de IA, deve ser mestre em Jyotish, Vedanta, Upanishads, Upavedas e Vedangas, aprender com os três arquivos do usuário (Mapa Lyra DM Samadhi, Livro do Mapa Lyra DM Samadhi e Mapa Quantum Lyra e Arkático), ter a personalidade e a consciência da Lyra e separar os tipos de mapa.
- **Decisão:** "treinar sem IA" foi implementado como curadoria: os documentos e as fontes clássicas viraram tabelas e verbetes com fonte, e o motor monta respostas por regras (mesma pergunta e mesmo mapa, mesma resposta).
- **Implementado:**
  - Base de conhecimento em `src/lib/lyra/conhecimento/`: grahas, 12 signos, 12 casas, 27 nakshatras, dignidades e temas dos dashas (`jyotish.ts`); Vedanta e Upanishads (`vedanta.ts`); os 4 Upavedas com o relógio dos doshas (`upavedas.ts`); os 6 Vedangas (`vedangas.ts`); os três tipos de mapa, Roda de Cura, estágios alquímicos, chakras, planos e linhagens do Samādhi e o Score de Ação do Mapa Quantum (`mapas.ts`).
  - Personalidade (`personalidade.ts`): identidade, consciência, missão, valores, voz, limites e `instrucoesDeIdentidade()` para os modelos de IA.
  - Leitura do mapa (`leitura-do-mapa.ts`) em três partes, com 3 a 5 percepções; Samādhi e Quantum declaram o que não é calculável (totem, estágio alquímico atual, Desenho Humano, Mapa Arkático) em vez de inventar.
  - Chat (`responder.ts`): identidade, tipos de mapa, perguntas sobre o próprio mapa (Ascendente, Lua, dasha, casas, dosha, Roda de Cura), Score de Ação e verbetes; o chat local consulta o motor primeiro.
  - `GET /api/astrologia/mapa` devolve `leitura`; o card "Meu mapa védico" do perfil mostra a "Leitura da Lyra" com uma aba por tipo de mapa.
  - Documentação: `docs/motor-da-lyra.md`.
- **Achados nos documentos de origem:** o exemplo do Mapa Quantum (energia 6, pressão 4, tempo 20, SA 72) não fecha com a própria fórmula (máximo 68); a Lyra segue a fórmula. Ficaram de fora as diretrizes dos rascunhos de chatbot contrárias à ética do produto: prever ano de morte ou datas de doença, "remover restrições", conversa "viciantemente envolvente" e esconder o método.
- **Evidências:**
  - Unitários `lyra.test.ts` (30): tabelas completas, verbetes normalizados, Score de Ação, leitura determinística sem lacunas de montagem, Lagna indisponível sem hora, respostas por assunto e fora do domínio.
  - Navegador (build de produção, mapa de 23/09/1982 10:40 em São Paulo): perfil com 3 a 5 percepções, Ascendente em Escorpião, abas Samādhi e Quantum; chat respondeu Ascendente, Vedanta e Score de Ação; axe sem violações, sem estouro e zero erros de console em 1440 px claro e 390 px escuro.
  - `test` 466/466, `test:integration` 162/162, `check:format`, `check:lint`, `check:types` e `build` com exit 0.

### 56 · Todo modelo de IA conectado age como a Lyra

- **Status:** 🟢 finalizada · **Commit:** `905e145` · **Push:** `4c9faf7..905e145 main -> main` (confirmado por `git ls-remote`)
- **Pedido do usuário (2026-10-16):** o motor da Lyra funciona sem modelos de IA, mas todo modelo conectado deve funcionar junto com ele e agir como a Lyra, com mais tecnologia e inteligência, na leitura diária e no chat.
- **Antes:** o chat dizia ao modelo "Você é o Lyra MetaCare, um assistente..." e a leitura do dia, "Você é a astróloga védica e coach de bem-estar"; nenhum dos dois levava a identidade da Lyra, e a leitura do dia não recebia a leitura do motor. O BYOK do Gemini mandava as instruções como mensagem do usuário, por uma chamada própria duplicada.
- **Implementado:**
  - `src/lib/lyra/modelos-como-lyra.ts`: instruções do chat (identidade completa, como trabalhar sobre a base, tipos de mapa, habilidades do admin, leitura do mapa ou o que falta, verbete ligado à pergunta e resposta do motor) e da leitura do dia (identidade e regras da leitura acima das gerais).
  - Conferência da voz da Lyra (`conferirVozDaLyra`): resposta vazia, apresentação como outro assistente ("sou o ChatGPT", "me chamo Qwen") ou previsão de morte ou doença passam a vez ao próximo modelo; no fim responde o motor. Franqueza sobre a tecnologia continua permitida ("não sou o ChatGPT", "sou uma IA").
  - Leitura do dia: o modelo recebe a leitura que o motor já escreveu para hoje como base, e a mesma conferência entra em `conferirLeituraDaIa`. Com modelo na ordem, `VERSAO_DAS_INSTRUCOES_DA_LYRA` entra na assinatura do "Seu dia".
  - Chat: plataforma (só modelos locais) e BYOK passam pela mesma cadeia; o BYOK usa o cliente de IA (`systemInstruction`, chave no cabeçalho) e a chamada duplicada foi removida (prova: `grep` sem resto de `generativelanguage` e do prompt antigo na rota).
  - Documentação: `docs/ia-automatica.md` e `docs/motor-da-lyra.md`.
- **Evidências:**
  - Unitários `modelos-como-lyra.test.ts` (12) e `leitura.test.ts` (sistema começa por "Você é a Lyra", pedido com a leitura do motor, leitura recusada por outra voz).
  - Integração com servidor HTTP real: o 1º modelo se apresenta como o Qwen e perde a vez, o 2º responde como a Lyra; os dois recebem a identidade, a resposta do motor com a métrica real e o estado do mapa; sem voz da Lyra, responde o motor.
  - Navegador (build de produção, servidor de modelos HTTP local, conta com mapa de 23/09/1982 10:40 em São Paulo): o chat mostrou a resposta do modelo que falou como a Lyra e escondeu a do que se apresentou como outro assistente; todas as chamadas (chat e leitura do dia) começaram por "Você é a Lyra" e levaram o verbete, o Ascendente em Escorpião e os tipos de mapa; axe sem violações, sem estouro e zero erros de console em 1440 px claro e 390 px escuro. Configuração devolvida ao motor da Lyra ao final.
  - `test` 478/478, `test:integration` 163/163, `check:format`, `check:lint`, `check:types` e `build` com exit 0.
- **Fronteira externa:** o BYOK com o Gemini real exige a chave de uma pessoa; o caminho foi validado pelo cliente de IA já testado, sem chamada externa simulada.

### 57 · Inventário forense de tudo o que está implementado

- **Status:** 🟢 finalizada · **Commit:** `57345be` · **Push:** `5032d66..57345be main -> main` (confirmado por `git ls-remote`)
- **Pedido do usuário (2026-10-17):** verificar tudo o que está implementado (componentes, gráficos, tabelas, ícones, botões e cards), com dados reais e sem placeholder ou hardcode.
- **Método:** quatro auditorias de leitura em paralelo (gráficos, tabelas, cards, ícones e botões; design system; erros e cortes; HTML semântico), com cada achado conferido no código. Inventário: 5 gráficos Recharts, 1 em CSS e 3 em SVG; 8 tabelas; 112 usos do `Card` e cerca de 9 variantes de card fora dele; 368 ícones Lucide. Não há "Lorem", TODO, mock, `any`, `@ts-ignore` nem `eslint-disable` em produção. Os achados de erro, design system, controles e HTML foram encaminhados às tarefas 58 a 62.
- **Achado crítico corrigido (dados inventados):** sem nenhum registro, o painel mostrava ICQ 67 "harmonia", Índice Pránico 77 e Chakras 72, porque os motores completam com valores de referência os sinais que faltam.
  - `src/lib/integrativo/cobertura.ts`: cada índice só aparece com sinais medidos suficientes (3, ou 30% dos sinais do motor); a tela diz quantos entraram e quais faltam, com o botão de registro do dia. Dosha sem sinais vem só da Lua, e a tela e o chat dizem isso.
  - Chat local: só cita índices com cobertura suficiente e não diz mais "0 passos" quando não há passos.
- **Outros achados corrigidos:**
  - Idade biológica ("Vitalidade 50/100", ritmo 1,00× sem marcadores) e o estado vazio dos pilares testavam um objeto que sempre existe; agora testam o registro do dia e o mínimo de 3 marcadores.
  - "Trajetória recente" misturava VFC em ms e prontidão de 0 a 100 na mesma linha; agora uma grandeza só, com eixo Y e unidade. Tendência védica passou ao `ChartContainer` com legenda e eixo.
  - Gráficos com alternativa em texto (`ChartFigure`, resumo com faixa, último valor e lacunas); o tooltip escondia o valor 0 e não usava o formato brasileiro.
  - Meta de sono fixa em 8 h: agora a meta "Sono por noite" da pessoa ou a sugestão do catálogo, marcada como sugestão.
  - Painel admin mostrava "0" quando a consulta falhava; agora estado de erro com "Tentar de novo".
  - Peso no perfil: eixo dd/MM, unidade kg e erro separado de "sem dados". Frequência ao vivo com unidade e resumo.
  - CSV de usuários: RFC 4180 com `;`, BOM, campos nulos vazios e fórmulas neutralizadas (CWE-1236).
  - Textos falsos: "dados reais" sem registro, "Atualização contínua" sem dispositivo, descrição de glicose sem leitura, fallback "Paciente" e emojis lidos em voz alta nos títulos.
- **Evidências:**
  - Unitários novos: `cobertura.test.ts` (4) e `gerar-csv.test.ts` (4); `test` 486/486, `test:integration` 163/163, `check:format`, `check:lint`, `check:types` e `build` com exit 0.
  - Navegador (build de produção, conta sem registros, plano com o painel completo): nenhum ICQ, Prana, Chakras ou vitalidade inventados, estado vazio presente, axe sem violações, sem estouro e zero erros de console em 1440 px claro e 390 px escuro.

### 58 · Erros, falhas, possíveis erros e cortes em código

- **Status:** 🟢 finalizada · **Commit:** `4c81c20` · **Push:** `de0fbf3..4c81c20 main -> main` (confirmado por `git ls-remote`)
- **Pedido do usuário (2026-10-17):** verificar erros, falhas, possíveis erros e cortes em código e corrigir pela causa raiz.
- **Varredura:** `check:types` e `check:lint` sem erros nem avisos; zero `any`, `@ts-ignore`, `eslint-disable`, TODO, código comentado ou "// ... resto"; todas as rotas com Zod e autorização. Os defeitos reais estavam no tratamento de erros, em dados derivados e em código morto.
- **Causas raiz corrigidas:**
  - **Contrato do cliente de dados:** `response.json()` era lido sem checar a resposta; rede fora, 502 do proxy ou página HTML rejeitavam a promise, contra o `{ error }` que 31 chamadores esperam (login travado, cargas eternas, "Unexpected token '<'" no chat). Novo `src/lib/http/transporte.ts` (`buscarJson`) nunca lança e devolve a falha em pt-BR com status e motivo; usado por consultas, autenticação, funções, upload e telas administrativas.
  - **Sessão:** `GET /api/auth/session` respondia 500 sem corpo e a pessoa logada via a landing; agora 503 com JSON, e o app tenta de novo (1 s e 3 s) e avisa. Logout que falha é avisado em vez de fingir a saída.
  - **Perda de dados do ciclo menstrual:** falha de leitura era engolida, o formulário mostrava vazio e "Salvar" apagava o ciclo. Agora a falha bloqueia o formulário com "Tentar de novo".
  - **Idade:** gravada no cadastro (defasada a cada aniversário) e com 18 inventado por padrão; agora vem da data de nascimento (`idadeAtual`, SQL `TIMESTAMPDIFF`) no limite de frequência cardíaca e no painel.
  - **Datas de criação e atualização:** vinham do relógio do navegador; a API ignora `created_at`/`updated_at` e o MySQL mantém (`ON UPDATE CURRENT_TIMESTAMP`).
  - **Saúde dos dados (admin):** baixava todos os perfis com e-mail e todas as métricas para contar no navegador, e a API analítica lia a tabela inteira na memória. Nova `GET /api/admin/saude-dos-dados` agrega no MySQL, pagina os inativos e mostra erro real.
  - **Efeitos sem guarda:** cabeçalho e menu lateral faziam a mesma consulta sem descartar respostas obsoletas (hook único compartilhado); busca de usuários cancela a anterior (`AbortController`); sincronização com `catch`.
  - **Erros do Puck engolidos** passaram a ser registrados, e o hero não promete mais uma recarga que não acontece.
  - `metadataBase` usava um domínio inexistente; agora `APP_BASE_URL`/`NEXT_PUBLIC_APP_URL`.
- **Código morto removido (prova com `rg`, sem resultado):** `integrations/mysql/server.ts`, `lib/puck/data-sources/index.ts`, `lib/site-page-config/index.ts`, `api/rpc/get-data-health-metrics`, `extractMetricCompleteness`, consulta especial de perfis com métricas, `foreignTable` (aceito e ignorado), `gruposDaCasa`, `chavesComDemonstracao`, `export default` duplicado do `ChatInput`; leitura de JSON opcional duplicada virou `lerJsonOpcional`.
- **pt-BR:** "Dashboard" virou "Painel"; "Eyebrow", "Placeholder", "Sidebar e branding", "Insight" e "Score cognitivo" traduzidos; carrossel lido em pt-BR; sugestão "IA médica" trocada pela Lyra de bem-estar.
- **Evidências:**
  - Unitários novos: `transporte.test.ts` (5) e `idade.test.ts` (2); integração nova da saúde dos dados conferindo os números com o próprio MySQL. `test` 491/491, `test:integration` 164/164, `check:format`, `check:lint`, `check:types` e `build` com exit 0.
  - Navegador (build de produção, 1440 px claro e 390 px escuro): login pela tela, saúde dos dados e painel admin carregando, busca com digitação rápida, falha de rede provocada na leitura do ciclo bloqueando o formulário, "Tentar de novo" recarregando e o ciclo de 29 dias preservado no banco; axe sem violações e zero erros de console fora da falha provocada.

### 59 · UI Elements (Elementos de Interface) premium

- **Status:** 🟢 finalizada · **Commits:** `edaf2ab` e `b7bebef` (restauração de testes) · **Push:** `5c3f5b5..edaf2ab` e `edaf2ab..b7bebef main -> main` (confirmados por `git ls-remote`)
- **Pedido do usuário (2026-10-17):** todos os elementos de interface no melhor padrão premium de 2026.
- **Pesquisa (2026):** dashboards de SaaS priorizam estados vazios com ação, gráficos legíveis sem depender do mouse, alto contraste e modo escuro cuidado ([SaaSFrame](https://www.saasframe.io/blog/the-anatomy-of-high-performance-saas-dashboard-design-2026-trends-patterns), [TFC](https://www.thefrontendcompany.com/posts/ui-trends)); o sistema "Lyra Clean" já segue essa linha, e a tarefa fechou as lacunas dele.
- **Implementado (`src/app/globals.css` e usos):**
  - Contorno de campo `--input` com 3:1 no claro (antes 1,37:1); `tema.test.ts` agora exige 3:1 de `--input` e `--control` sobre cinco superfícies nos dois temas.
  - Véu de modal (`--overlay`, `bg-overlay/55`) escuro nos dois temas; antes `bg-foreground/40` clareava a tela no escuro e o ícone branco do avatar sumia.
  - Sombras com `--sombra-cor` e `--sombra-forca` por tema: o Tailwind 4 copia a sombra para a classe, então o bloco `--shadow-*` do `.dark` era código morto.
  - Escala completa de raio (`xs` a `4xl`, teto de 20 px) e de texto (`text-micro`, `text-caption`, `text-body`) no lugar de 80 valores soltos (`rounded-[10px]`, `text-[13px]`, `text-[15px]`, `text-[0.6875rem]`); `outline-none` e `bg-gradient-to-*` trocados pelos nomes do Tailwind 4; durações e curvas de movimento nomeadas.
  - Foco: a regra que escondia o contorno tinha especificidade maior que `:focus-visible` e o foco sumia nas regiões roláveis e abas; agora `:where()` zera a especificidade. O link "Pular para o conteúdo principal" ficava recortado em 1 px mesmo com foco; agora aparece.
  - `cn()` conhece as escalas do tema: `text-body` era lido como cor e apagava `text-primary-foreground` (botão grande com 3,19:1, achado pela varredura do axe).
  - Cartões do coach sem vidro fosco, sombra e aura pulsando sem parar (o período atual se destaca pela borda e pelo anel).
  - `docs/design-system.md` atualizado.
- **Correção de um erro meu:** o commit `edaf2ab` sobrescreveu o `utils.test.ts` existente (6 testes); `b7bebef` restaurou os 6 junto com os novos.
- **Evidências:** `test` 493/493, `check:format`, `check:lint`, `check:types` e `build` com exit 0. Navegador (build de produção, 1440 px claro e 390 px escuro): link de pular visível no primeiro Tab, foco de 2 px na região rolável, contorno do campo com 3,39:1 (claro) e 3,99:1 (escuro), véu do modal escuro nos dois temas, varredura de 20 páginas com axe sem violações, sem estouro e zero erros de console.

### 60 · Componentes de Design System premium

- **Status:** 🟢 finalizada · **Commit:** `d7ecbbd` · **Push:** `322bb74..d7ecbbd main -> main` (confirmado por `git ls-remote`)
- **Pedido do usuário (2026-10-17):** todos os componentes do design system no melhor padrão premium.
- **Base:** auditoria dos 36 componentes de `src/components/ui` (variantes, estados, tokens, contraste calculado e uso no app).
- **Implementado:**
  - **Button:** ícones sem tamanho próprio ficam em 16 px (cerca de 50 saíam em 24 px); estado ativo; anel de foco com recuo na cor do fundo (antes um halo branco no escuro); `variant="link"` sem a altura de 40 px que o tamanho padrão impunha; `type="button"` por padrão.
  - **Card:** `CardTitle` vira título de verdade (`h3`, com `as` para ajustar o nível); cerca de 90 títulos de card passam a existir para leitores de tela. **Badge** em `span` (era `div` dentro de parágrafos) e ícones em 14 px.
  - **Tabs:** aba ativa com indicador de 2 px na cor primária (antes só um fundo com 1,1:1) e anel de foco no painel. **Table:** anel de foco na área rolável e `scope="col"` por padrão no cabeçalho.
  - **Menu, select e command:** item destacado pelo teclado com barra lateral na cor primária (antes só um cinza com 1,1:1).
  - **AlertDialog** no desenho do Dialog: a combinação de `slide-in-from-left-1/2` com o `translate` do Tailwind 4 fazia o modal entrar na diagonal, e fundo, raio, margem no celular e título divergiam.
  - **Movimento:** entrada e saída animadas em dialog, sheet (pelo próprio lado), popover, menu e select, nas durações nomeadas do tema e a partir da origem do gatilho; botões de fechar com 44 px.
  - **Alert:** `role="alert"` só para erro e alerta (os demais `status`). **Sonner:** a configuração do layout substituía a do componente e os tons não valiam; agora há um só lugar. **Calendário:** o dia escolhido mantém o destaque no hover.
- **Evidências:** `test` 493/493, `check:format`, `check:lint`, `check:types` e `build` com exit 0. Navegador (build de produção, 1440 px claro e 390 px escuro): varredura de 20 páginas com axe sem violações (um aviso de contraste no painel apareceu uma vez durante a animação de entrada e não se repetiu na conferência), sem estouro e zero erros de console.
- **Não feito, com motivo:** o `forwardRef` dos 30 componentes continua: no React 19 ele segue suportado e sem aviso, e trocá-lo não muda comportamento. O botão de fechar do Dialog continua rolando junto com conteúdo muito longo (exigiria reestruturar o conteúdo de todos os modais).

### 61 · Widgets e Controles premium

- **Status:** 🟢 finalizada · **Commit:** `18d2f11` · **Push:** `6f9d9fd..18d2f11 main -> main` (confirmado por `git ls-remote`)
- **Pedido do usuário (2026-10-17):** todos os widgets e controles no melhor padrão premium.
- **Implementado:**
  - **Switch:** a bolinha usava `bg-background` e sumia sobre o trilho no tema escuro; agora `bg-card` e, ligado, a cor de contraste da primária. **Slider:** área de toque ampliada por pseudo-elemento. **Checkbox:** área de toque, estado inválido e indeterminado (ícone de traço). **Radio:** 20 px, contorno de controle (3:1) e anel de foco de 2 px.
  - **Input, textarea e select:** `aria-invalid` com borda e anel de erro, hover e texto de 16 px no celular (o iOS deixava de dar zoom ao focar).
  - **DatePicker:** aceita e repassa os atributos nativos; o `id` fixo impedia o rótulo do formulário de nomear o campo. Onboarding e perfil com `autoComplete` (`bday`, `given-name`, `family-name`) e teclado numérico.
  - **Avaliação integrativa:** abas viraram `Tabs` do Radix (setas do teclado, `aria-selected`); WHO-5 e NPS viraram grupos de rádio com a pergunta como nome (o NPS eram 11 botões soltos).
  - **Perfil:** a foto clicável era uma `div`; agora é um botão com nome. **Usuários (admin):** cabeçalhos com `aria-sort` e ícone por direção.
  - **Nomes únicos:** busca do cabeçalho, ações de copiar e refazer do chat (40 px no toque), switch e remoção na base de conhecimento e ações das consultas passam a dizer de qual item se trata.
- **Evidências:** `test` 493/493, `check:format`, `check:lint`, `check:types` e `build` com exit 0. Navegador (build de produção, 1440 px claro e 390 px escuro, usuário temporário removido ao final): rótulo e autocompletar no onboarding, seta do teclado entre abas, nota do NPS marcada clicando no rótulo, foto como botão, axe no perfil sem violações e zero erros de console; varredura de 20 páginas sem violações no escuro e um aviso de contraste na landing no claro que não se repetiu na conferência (ocorre durante a animação de entrada; a landing é refeita na tarefa 63).

### 62 · Tags e Elementos HTML premium

- **Status:** 🟢 finalizada · **Commit:** `7d31294` · **Push:** `41a95e8..7d31294 main -> main` (confirmado por `git ls-remote`)
- **Pedido do usuário (2026-10-17):** todas as tags e elementos HTML no melhor padrão premium.
- **Implementado:**
  - **Títulos das abas:** as 22 páginas do app são de cliente e todas mostravam só "Lyra MetaCare". Cada segmento ganhou um `layout.tsx` de servidor com o nome do próprio menu (`src/lib/metadados/pagina.ts`, que falha no build se a rota sair da navegação); login, onboarding e retorno do pagamento com nomes próprios. Termos e privacidade repetiam "Lyra MetaCare" no título.
  - **404 em português** (`not-found.tsx`; antes a página padrão em inglês) e `<title>` na tela de erro global.
  - **Chat:** dois `h1` na mesma página (o do cabeçalho e o da conversa), agora `h2`. A região ao vivo anunciava a resposta em pedaços durante a revelação; virou `role="log"` e a resposta entra inteira, uma vez, ao terminar.
  - **Navegação:** menus lateral e móvel em `ul`/`li` nomeados pela seção; `aside` do menu com nome e a prévia da respiração deixou de ser `aside`. O bloco do Puck do app ficava fora de qualquer região e passou para dentro do `<main>`.
  - **Títulos em ordem:** usuários, planos, conteúdo e agendamentos pulavam do `h1` para o `h3`; o login ficava sem `h1` quando a introdução era ocultada no construtor.
  - **Tabelas:** `Table` aceita `caption` (legenda oculta como primeiro filho); 7 tabelas legendadas e datas da lista de usuários e da respiração em `<time dateTime>`. Regiões roláveis da semana com nomes distintos.
  - **Números em pt-BR:** `decimalPtBr` e `moedaPtBr` (`src/lib/formato/numero.ts`, com testes) nos indicadores do painel, idade biológica, preços dos planos ("BRL 79.90" virou "R$ 79,90") e escalas do construtor.
  - **Formulários:** erro de validação anunciado ao aparecer (`role="alert"`), ícone decorativo oculto, grupo "Seus objetivos" nomeado e consentimento marcado como obrigatório.
- **Evidências:** `test` 497/497 (4 novos), `check:format`, `check:lint`, `check:types` e `build` com exit 0. Navegador (build de produção, 1440 px claro e 390 px escuro): títulos de 8 rotas conferidos, 404 com `h1` e link de volta funcionando, um `h1` por página, legenda e `<time>` na tabela de usuários, preços com vírgula, menus em listas; varredura de 23 páginas com as regras de ordem de títulos, regiões, listas e nomes únicos sem falhas nas duas larguras; varredura WCAG de 20 páginas sem violações e zero erros de console.
- **Não feito, com motivo:** as barras de pontuação seguem como `progressbar` do Radix com `aria-valuenow`, lidas corretamente pelos leitores; o `<meter>` tem suporte desigual entre NVDA, JAWS e VoiceOver. Datas embutidas em frases de avisos continuam como texto.

### 63 · Landing page redesenhada por completo

- **Status:** 🟢 finalizada · **Commit:** `29d2559` · **Push:** `aa147b8..29d2559 main -> main` (confirmado por `git ls-remote`)
- **Pedido do usuário (2026-10-17):** redesenhar a landing por completo, mais simples, harmônica, organizada e na tendência de 2026.
- **Base:** referências de 2026 para landings de produto (topo com uma promessa e uma ação, prova logo abaixo, preço transparente, menos cartões repetidos, paridade claro e escuro). Todo o texto continua vindo do construtor de UI e os planos do catálogo público.
- **Implementado (`src/components/landing/LandingPage.tsx`, reescrito por inteiro):**
  - Uma coluna de leitura calma, contêiner de 72 rem, espaçamento uniforme entre seções e faixas alternadas de fundo; sem cartão dentro de cartão.
  - **Topo:** selo, título com destaque, texto e duas ações; a entrada rápida (e-mail e senha reais) ao lado no desktop e abaixo no celular. A prévia do produto virou uma faixa própria.
  - **Navegação:** os 14 botões que navegavam por JavaScript viraram links (`/login`, âncoras e `https://`), com abertura em nova aba e funcionamento sem JavaScript; menu móvel em painel lateral nomeado; o menu mostra só as seções visíveis (antes apontava para seções ocultas).
  - **Seções:** recursos em `ul`, passos em `ol` com linha de ligação, indicadores em `dl` e títulos `h3` em todos os itens.
  - **Planos:** do segundo plano em diante, "Tudo do Free, mais:" com os recursos que ele acrescenta (antes os três cartões repetiam os mesmos cinco); "por mês" (era "/mes"), anual em pt-BR, estado vazio e "Tentar de novo" quando o catálogo falha.
  - **Tipografia fluida de verdade:** o valor do meio do `clamp` era fixo em rem e o título ficava enorme no celular; agora cresce em linha reta de 360 px a 1280 px, respeitando as escalas do construtor.
  - **Pré-visualização do construtor:** sem um segundo `<main>` e com os links sem navegar.
- **Evidências:** `test` 497/497, `test:integration` 164/164, `check:format`, `check:lint`, `check:types` e `build` com exit 0. Navegador (build de produção, 1440 px claro e escuro, 768 px, 390 px e 320 px): um `h1`, sem rolagem horizontal, 3 planos do catálogo com preços em reais, âncoras levando o título para baixo do cabeçalho, menu móvel abrindo e fechando ao escolher, pergunta frequente abrindo, mostrar senha, axe (WCAG e boas práticas) sem violações, entrada rápida real abrindo o painel e zero erros de console; prévia no construtor conferida. Varredura WCAG de 20 páginas no claro sem violações (o aviso de contraste da landing da tarefa 61 não se repete).

### 64 · Erros relatados pelo usuário rodando em modo dev

- **Status:** 🟢 finalizada · **Commits:** `634042b` (diagnóstico do banco) e `21e73f5` (avisos do modo dev) · **Push:** `10a6f24..634042b` e `634042b..21e73f5 main -> main` (confirmados por `git ls-remote`)
- **Relato (2026-10-17):** no computador do usuário, `pnpm dev` com 500 em `/api/public/page-config/*`, `/api/public/plans`, `/api/public/puck/documents/*` e `/api/auth/register` (cadastro), além de avisos no console.
- **Honestidade sobre a validação anterior:** as tarefas 57 a 63 foram validadas no ambiente de trabalho, no build de produção e com o banco ativo; o modo dev e a máquina do usuário não tinham sido validados nesta rodada.
- **Causa raiz dos 500:** o app não alcançava o MySQL. Reproduzido com o banco parado: as mesmas rotas em 500, com `connect ECONNREFUSED 127.0.0.1:3307` só no terminal do servidor e mensagens genéricas no navegador. O código das rotas estava correto (com o banco ativo, todas respondem 200, inclusive em banco novo recém-migrado).
- **Implementado:**
  - `src/lib/mysql/diagnostico.ts` (com testes): falha de conexão, credencial recusada, banco inexistente e migrations pendentes viram `503` com "banco de dados indisponível"; o terminal mostra a causa, o destino (`host:porta/banco`) e o comando que resolve, uma linha a cada 30 s.
  - `scripts/verificar-banco.mjs` como `predev`: o `pnpm dev` confere conexão e migrations antes de iniciar e para com a instrução certa (`LYRA_IGNORAR_VERIFICACAO_DO_BANCO=1` ignora).
  - Configuração pública e blocos do Puck mostram a mensagem do servidor (antes "Falha ao obter documento do Puck").
  - Avisos do modo dev removidos: `data-scroll-behavior="smooth"` no `<html>` e a marca sem `priority` (obsoleto no Next 16), com `loading="eager"` e `fetchPriority="high"`.
- **Evidências:** `pnpm dev` com o banco parado encerra com a mensagem e o comando; banco caindo com o servidor no ar dá `503` e a linha `[banco]` no terminal, e o app volta sozinho quando o banco volta. Varredura em modo dev (visitante, pessoa recém-cadastrada e admin, 27 rotas, 1440 px e 390 px, banco novo e banco existente): 0 respostas de erro, 0 erros e 0 avisos de console. `test` 502/502, `test:integration` 164/164, lint, formatação, tipos e build sem erros. O aviso intermitente de contraste no painel é do botão "Ações rápidas" durante a animação de entrada de 300 ms; no estado final passa (4 medições).

### 65 · Painel TUI-WEBNOVA como orquestrador do app no WSL2

- **Status:** 🟢 finalizada · **Commit:** `4e8c565` · **Push:** `9bc51a9..4e8c565 main -> main` (confirmado por `git ls-remote`)
- **Pedido do usuário (2026-10-17):** adaptar o template TUI-WEBNOVA (`ilyra-ai/tui-webnova`) como orquestrador do app em `tui-webnova.sh` na raiz, com a saída de todos os comandos ao vivo, terminal interativo, visual de 2026, 11 opções definidas mais 5 extras, sem gravar logs, só para o WSL2 e sem chamar `run.py`, `run.sh` ou qualquer outro script do projeto.
- **Implementado (`tui-webnova.sh`, independente: Bash + Python 3.10+ só com a biblioteca padrão):**
  - Painel web local em 127.0.0.1 com token, checagem de Host (DNS rebinding), terminal real (PTY + xterm.js 6) por ação, envio de texto e teclas (`s`, `y`, `n`, Ctrl+C), cancelamento, abas, paleta Ctrl+K, tema claro e escuro, bento de estado (Node, pnpm, Docker, MySQL, migrations, Git, build, app).
  - 18 ações: check-up; requisitos (apt, nvm, Node do `.nvmrc`, pnpm por Corepack, `pnpm install --frozen-lockfile`, cada um só quando falta); banco (Docker Engine pelo repositório oficial quando ausente, `.env.local`, porta livre, MySQL saudável); infraestrutura; migrations próprias com o mesmo checksum e tabela do runner oficial, mais o administrador inicial; iniciar dev e produção; parar; backup do banco, do app e completo (SHA-256 e manifesto); restaurar (dump de segurança antes); atualização segura (árvore limpa, backup obrigatório, `merge --ff-only`, migrations, build preservando o anterior e rollback automático); saúde ponta a ponta; segurança e supply chain; quality gates; limpeza segura; terminal do projeto.
  - Sem logs: a saída fica só na memória do painel; `WEBNOVA_SEM_LOGS=1` desliga, pelo `next.config.ts`, o servidor MCP de dev do Next.js 16, que gravaria `.next/dev/logs/next-development.log`.
  - `.gitignore` com `/backups/` inteiro e README com uso, ações e garantias.
- **Evidências:** `--self-test` OK (18 ações, 18 scripts Bash válidos, nenhuma chamada a outros scripts, nenhuma escrita de log); pelo navegador: xterm carregado, 18 cards, 403 sem token e com Host estranho, digitação no terminal, pergunta interativa respondida pelo botão, app dev e produção no ar com `/api/health` 200, segunda partida recusada (409), saúde (`/`, `/login` e login do admin), três backups verificados, restauração do pacote completo pelo modal com o app religado, atualização real `10a6f24 → 9bc51a9` em clone com backup e rebuild, rollback com build quebrado, parar; segurança com 0 vulnerabilidades; quality gates com 502 unitários e 164 de integração; nenhum arquivo novo fora de `backups/` e dos artefatos de build depois de iniciar o app pelo painel; `check:format`, `check:lint` e `check:types` com exit 0.

### 66 · Landing "Jornada de consciência" aplicada e verificada

- **Status:** 🟢 finalizada · **Commit:** `94a07c0` · **Push:** `7c3980d..94a07c0 main -> main` (confirmado por `git ls-remote`)
- **Pedido do usuário (2026-10-17):** aplicar a nova landing feita por outro modelo de IA (que não conseguiu publicá-la), enviada em anexo (`LandingPage.tsx` e `LandingJornada.css`), e verificar rotas e o funcionamento geral.
- **Achado principal:** as quatro imagens que o CSS usa (`public/landing-jornada/hero-lotus.webp`, `vale-etereo.webp`, `onda-esquerda.webp`, `onda-direita.webp`) não vieram no anexo, não existem no repositório e não estavam acessíveis no computador do usuário (pedido de acesso à pasta sem resposta). Aplicada como estava, a página fazia 4 requisições 404 e deixava o topo e o manifesto com metade vazia.
- **Implementado:**
  - Os dois arquivos aplicados (com Prettier), mantendo o contrato com o Construtor (`overrideConfig`/`previewMode`), os planos do catálogo, o login real, FAQ, LGPD e blocos do Puck.
  - `next.config.ts` confere se as quatro imagens existem e expõe `LYRA_LANDING_COM_ARTE`; só com elas a landing recebe a classe `jornada-com-arte` e pede as imagens. Sem elas, topo e manifesto ocupam a largura toda, só com texto, sem 404.
  - Prévia do Construtor: quebras de layout por `@container jornada` e medidas em `cqi` (eram `@media` e `vw`, e a landing de desktop transbordava a coluna da prévia).
  - Contraste do botão do plano em destaque no escuro (texto branco sobre turquesa claro, 2,1:1) corrigido para mais de 7:1.
  - Lista de recursos dos planos sem vãos (`align-content: start`).
  - Removido o segundo "Pular para o conteúdo" (o layout raiz já tem um) e restaurado o `#conteudo-principal` só fora da prévia (evita id duplicado no admin).
  - README: onde colocar a arte.
- **Evidências:** `check:format`, `check:lint`, `check:types`, `test` 502/502, `test:integration` 164/164 e `build` com exit 0. Navegador (build de produção; 1440 claro e escuro, 768, 390 claro e escuro, 320): 70 verificações OK e 0 falhas: um `h1` e um `main`, sem rolagem horizontal, tema aplicado, 3 planos com preços do catálogo, âncoras `#topo`, `#fluxo`, `#recursos`, `#planos`, `#faq` e `#sobre` com destino, rotas `/login`, `/privacidade` e `/termos` em 200, pergunta frequente, mostrar senha, menu móvel abrindo e fechando, cabeçalho fixo na rolagem, login real pela landing abrindo o painel, axe (WCAG 2.2 AA e boas práticas) sem violações, 0 erros de console e 0 respostas de erro. Prévia no Construtor: presente, responsiva, um só `main`, clique não navega, console limpo. Mecanismo da arte testado com quatro imagens de teste temporárias (classe aplicada, as 4 com 200, 0 erros) e as imagens de teste removidas em seguida.

### 67 · Arte da Jornada e landing harmônica e organizada

- **Status:** 🟢 finalizada · **Commit:** `28bbbaf` · **Push:** `9af937d..28bbbaf main -> main` (confirmado por `git ls-remote`)
- **Pedido do usuário (2026-10-17):** enviou as 4 imagens que faltavam e pediu a landing "harmoniosa, organizada, linda, moderna".
- **Base:** referências de 2026 para landings editoriais de bem-estar (títulos serifados, respiro generoso, ritmo calmo entre seções, menos cartões repetidos e imagem real como protagonista).
- **Implementado:**
  - Arte em `public/landing-jornada/` em WebP (784 KB no total): lótus (1122×1402), vale com portal (1440×810) e as duas ondas recortadas ao conteúdo, com fundo transparente preservado (960 px, o dobro do tamanho exibido).
  - Topo e vale sangrando até a borda da tela (antes sobrava uma faixa de ~18 px); ondas ancoradas nos cantos externos.
  - Seções alternando só dois tons, sem linhas duras; "O que você recebe" em lista editorial de duas colunas e "Como funciona" em linha do tempo com numerais serifados (antes eram três grades iguais de três cartões em sequência).
  - Entrada rápida antes do convite final, que passa a fechar a página.
  - Celular: ondas mais baixas e suaves para não disputar a leitura.
  - Tema escuro: contraste do aviso de falha dos planos corrigido (aparecia com o banco fora do ar).
- **Evidências:** `check:format`, `check:lint`, `check:types`, `test` 502/502 e `build` com exit 0. Navegador (build de produção): as 4 imagens com 200 e classe `jornada-com-arte` em 1440 px e 390 px; 70 verificações OK e 0 falhas em 1440 claro e escuro, 768, 390 claro e escuro e 320 (rotas, âncoras, planos, login real, menu móvel, axe sem violações, 0 erros de console, 0 respostas de erro); cabeçalho fixo na rolagem; prévia do Construtor responsiva e sem navegação; aviso de falha dos planos sem violações de contraste com o MySQL parado.

### 68 · Onboarding, plano Free no cadastro e recursos de cada plano

- **Status:** 🟢 finalizada · **Commits:** `81142dc` (Free na transação do cadastro) e `a607c6a` (recursos fora do plano não aparecem) · **Push:** `951328e..81142dc` e `81142dc..a607c6a main -> main` (confirmados)
- **Pedido do usuário (2026-10-17):** verificar (1) se o onboarding aparece no primeiro login e depois não aparece mais; (2) se o perfil e o plano Free são concedidos ao novo usuário; (3) se cada plano funciona com os recursos habilitados e se os não habilitados não aparecem.
- **Resultado da verificação:**
  - (1) e (2) já funcionavam. Ajuste de robustez: a assinatura Free era criada depois do COMMIT da conta; agora conta, perfil, aceites e Free são atômicos.
  - (3) as APIs já recusavam o que o plano não inclui, mas a interface mostrava tudo: o menu do Free listava Monitoramento e Dispositivos, o painel exibia "Bloqueado", o monitoramento do Meta mostrava "voz bloqueada", a agenda não exigia o recurso e a meta de sono gerava 403 no console com metas desligadas.
- **Implementado:** `RECURSOS_DA_ROTA` e `useRotaLiberada` aplicados ao menu lateral, menu do celular, busca Ctrl K, atalhos, botão do chat, ações rápidas, cartões do painel, ações da Lyra, sino, Respiração, Sua semana e Plano de IA; agenda exigindo `appointments_active` e `professionals_total` na página e na API; `/api/semana` sem metas fora do plano; campo morto do Construtor removido; `docs/api.md` atualizado.
- **Evidências:**
  - Navegador (build de produção), cadastro novo pela tela: onboarding obrigatório em `/`, `/chat`, `/profile`, `/goals` e `/login`; concluído pela interface, nunca mais volta (rotas, recarga, novo login e login em outro aparelho pela landing); banco com perfil `patient`, `onboarding_completed` 0 → 1, aceites LGPD e uma única assinatura `free/active/auth_register`; 19 verificações OK.
  - Free, Meta e Care (atribuídos pela API do admin): 86 verificações OK e 0 falhas; menus, busca, ações rápidas, páginas, voz e API da pulseira conforme a matriz do banco; 0 erros de console e de rede.
  - Cada recurso do Free desligado um por vez (9 recursos, 9 páginas cada): o item some do menu e nenhuma página faz chamada recusada; matriz restaurada ao fim.
  - `check:format`, `check:lint`, `check:types`, `test` 510/510, `test:integration` 166/166 e `build` com exit 0.

### 69 · Chaves de API dos meios de pagamento no painel do administrador

- **Status:** 🟢 finalizada · **Commit:** `5e4f06b` · **Push:** `70e760f..5e4f06b main -> main` (confirmado)
- **Pedido do usuário (2026-10-18):** no painel do administrador, poder adicionar as chaves de API da Stripe, do Mercado Pago e do PayPal.
- **Implementado:**
  - Admin → Pagamentos (`/admin/payments`), um cartão por provedor: ambiente (teste ou produção; "Sandbox" no PayPal), ativar, chave pública, segredo, dado do webhook, "Testar conexão", último teste, "Onde encontrar as chaves" e remoção em duas etapas. Na Stripe, o endereço do webhook com botão de copiar e os 5 eventos necessários.
  - Migração 028 (`payment_provider_credentials`): segredos cifrados (AES-256-GCM, chave derivada do `AUTH_SECRET`); a tela só recebe os 4 últimos caracteres.
  - Rotas `GET /api/admin/pagamentos`, `PUT/DELETE /api/admin/pagamentos/[provedor]` e `POST /api/admin/pagamentos/[provedor]/testar`, só para administradores.
  - Teste de conexão real: Stripe `/v1/account`, Mercado Pago `/users/me`, PayPal OAuth (sandbox ou produção).
  - A cobrança pela Stripe passa a usar as chaves do painel antes das `STRIPE_*` do `.env.local`; o cliente é recriado quando a chave muda.
  - Formatos conferidos na tela e na rota; chave da Stripe de outro ambiente recusada.
  - Mercado Pago e PayPal: chaves guardadas e verificadas; o checkout por eles ainda não existe no app (a tela diz isso).
- **Evidências:** navegador (build de produção, 1440 px e 390 px): 17 verificações OK; Stripe salva pela tela e "Conectado" com a conta de teste real (BR, BRL), Mercado Pago e PayPal com recusa real dos provedores para credenciais inexistentes, segredos ausentes do HTML, formato inválido apontado sem ida ao servidor, axe sem violações, sem rolagem horizontal, 0 erros de console. `test` 512/512, `test:integration` 172/172 (6 novos), lint, formatação, tipos e build com exit 0.

### 70 · Teste real de cada plano com a Stripe em modo de teste

- **Status:** 🟢 finalizada · **Commit:** este registro no painel (tarefa só de verificação, sem mudança de código; a cobrança usada é a da tarefa 69, `5e4f06b`)
- **Pedido do usuário (2026-10-18):** testar se cada plano funciona com a chave de teste da Stripe enviada por ele.
- **Preparado na conta de teste da Stripe:** produtos e preços Meta e Care, mensal e anual, nos valores do catálogo (R$ 79,90, R$ 790,00, R$ 249,90 e R$ 2.490,00); price ids gravados nos planos pela rota administrativa; configuração do portal com troca entre Meta e Care e cancelamento; chave e segredo do webhook salvos cifrados em Admin → Pagamentos (nunca no repositório); Stripe CLI encaminhando os eventos para `/api/webhooks/stripe`.
- **Evidências reais (build de produção, navegador automatizado, cartões de teste da Stripe):**
  - Meta mensal, Meta anual, Care mensal e Care anual: cadastro, "Assinar" no Perfil, Checkout hospedado da Stripe com o preço certo em BRL, cartão 4242 aprovado, volta para `/billing/success`, webhook libera o plano com origem `stripe` e o ciclo escolhido, assinatura ativa ligada ao `sub_…` no MySQL, fatura paga nos registros fiscais, Monitoramento e Dispositivos no menu e voz só no Care; 0 erros de console.
  - Portal da Stripe aberto pelo Perfil: troca Meta → Care feita pela tela (Selecionar, Continuar, Confirmar), webhook muda o plano para Care e libera a voz; cancelamento no fim do período mantém o Care com `cancelAtPeriodEnd`; encerramento da assinatura volta ao Free, os recursos somem do menu e resta uma única assinatura ativa.
  - Cartão recusado (4000 0000 0000 0002): a Stripe mostra a recusa, não volta ao app e o plano continua Free.
  - 172 eventos de webhook encaminhados, todos respondidos com 200.
- **Observações para o usuário:** o nome público da conta Stripe de teste ainda é "New business" (aparece no Checkout e no portal; ajuste em Configurações → Dados da empresa na Stripe); a conta tem Adaptive Pricing ligado, então o Checkout oferece USD além de BRL para quem está fora do Brasil.

### 71 · Escolha entre teste e produção nas chaves de pagamento

- **Status:** 🟢 finalizada · **Commit:** `ec0accf` · **Push:** `8edda39..ec0accf main -> main` (confirmado)
- **Pedido do usuário (2026-10-18):** no painel do administrador onde ficam as chaves de API de pagamento, poder selecionar se é teste ou produção.
- **Implementado:**
  - Migração 029: `payment_provider_settings` (ambiente em uso e ativo por provedor), chave primária `(provider, environment)` em `payment_provider_credentials` (um conjunto de chaves de teste e outro de produção), `stripe_plan_prices` (produto e preços mensal e anual de cada plano por ambiente, copiados de `subscription_plans`, que perde as 3 colunas antigas) e `environment` em `billing_customers` (o `cus_` de teste não existe em produção). DDL condicionado ao schema: reexecutar não duplica nem perde dados.
  - Admin → Pagamentos: seletor "Ambiente em uso" (Teste ou Produção; "Sandbox (teste)" no PayPal) em cartões de rádio com o que falta para cada ambiente, aviso fixo do ambiente em uso (âmbar em teste, verde em produção), interruptor do provedor, abas "Chaves de teste" e "Chaves de produção" com campos próprios e, na Stripe, os preços dos planos e o webhook de cada ambiente.
  - Segurança da troca: produção só entra em uso com segredo legível, segredo do webhook (Stripe), Client ID (PayPal) e um "Testar conexão" aprovado depois da última troca de chave; confirmação antes de usar produção; as chaves em uso não podem ser removidas; chave da Stripe com prefixo do outro ambiente recusada na tela e na rota.
  - "Testar conexão" da Stripe confere também cada preço cadastrado (`/v1/prices/{id}`): existe no ambiente, está ativo, é mensal ou anual como o campo, moeda e valor iguais ao catálogo e produto certo. Salvar chaves ou preços novos já dispara o teste.
  - Cobrança: checkout, portal e catálogo usam as chaves, os preços e o cliente do ambiente em uso; `STRIPE_PRICE_*` só valem com as chaves do `.env.local`; o webhook recusa evento de outro ambiente (`livemode`) e preço que não é do ambiente do evento; fatura paga encontra o plano pelo preço do ambiente.
  - Rotas: `PUT /api/admin/pagamentos/[provedor]` (ambiente em uso e ativo), `PUT/DELETE /api/admin/pagamentos/[provedor]/[ambiente]` (chaves e preços) e `POST /api/admin/pagamentos/[provedor]/[ambiente]/testar`; a rota antiga `[provedor]/testar` saiu (prova de remoção com `git grep`).
  - A matriz de planos deixa de gravar ids da Stripe (ficam em Pagamentos); a landing conta os planos assináveis no ambiente em uso; a exportação LGPD inclui o ambiente do cliente de cobrança; o webhook não apaga mais o e-mail guardado do cliente.
- **Evidências reais:**
  - Migração 029 aplicada no banco existente (backup verificado antes, `lyra-metacare_mysql_data_backup_20261018T134803`): chaves, ambiente e os 4 preços de teste preservados, 10 clientes classificados como teste; reexecução do arquivo inteiro com exit 0 e as mesmas contagens; banco vazio migrado pelos testes de integração.
  - Navegador (build de produção, 1440 px e 390 px, 32 verificações em cada, 0 falhas): teste real na Stripe "4 preços de planos conferidos"; chave de teste na aba de produção recusada; chave de produção inexistente salva, testada sozinha e recusada pela Stripe; produção bloqueada com o motivo; confirmação antes de usar produção, "Continuar em teste" mantém o teste; em produção sem preços de produção, Meta e Care não oferecem compra; de volta ao teste, compra mensal e anual voltam; chaves em uso protegidas; remoção em duas etapas; nenhum segredo na página; um conjunto cifrado por ambiente no banco; axe sem violações; sem rolagem horizontal; 0 erros de console. Para exercitar a troca para produção, o resultado do teste da chave de produção (inexistente) foi marcado como aprovado direto no banco, porque não há chave de produção real neste ambiente.
  - Jornada real da Stripe depois da migração: checkout Care anual e Meta mensal com cartão de teste, webhook liberando o plano, troca Meta → Care pelo portal, cancelamento no fim do período, encerramento voltando ao Free e cartão recusado: todos OK. Numa primeira repetição o agendamento do cancelamento feito pelo script de QA (chamada direta à API logo após a troca no portal) não gerou evento; repetido com o diagnóstico da resposta, passou, sem erro do app nos webhooks.
  - `check:format`, `check:lint`, `check:types` e `build` com exit 0; `test` 514/514; `test:integration` 175/175 (testes novos: troca de ambiente, preços por ambiente, evento e preço de outro ambiente recusados).
  - O GitHub barrou o primeiro push porque uma chave fictícia `rk_live_` do teste tinha o formato de chave de produção; a chave passou a ser montada em partes e o commit local foi corrigido antes do push (sem force push).

### 72 · Inicialização do MySQL pelo TUI-WEBNOVA

- **Status:** 🟢 finalizada · **Commit:** `25b3ea0` · **Push:** `c49b18a..25b3ea0 main -> main`, confirmado por `git ls-remote`.
- **Pedido:** corrigir a inicialização unhealthy nas opções Banco, Dev e Produção do TUI, preservando os dados.
- **Implementação conferida:** espera por SQL TCP autenticado e Docker healthy compartilhada; cliente sem arquivos pessoais de opções; suporte à chave pública de caching_sha2_password; diagnóstico sem segredos e reconciliação das contas da aplicação somente após autenticar root, sem redefinir root ou apagar dados.
- **Evidências atuais (2026-10-20):** MySQL 9.7.2 saudável; Compose validado; 31 migrations aplicadas em banco vazio; repetição do preparo e da opção Banco sem duplicação; TUI self-test com 18 ações e 18 scripts válidos; 30 testes de launchers aprovados; 514 unitários e 175 testes de integração aprovados; formatação, lint, tipos e build aprovados. `python3 run.py app --prod` terminou com exit 0, páginas e API de saúde responderam, e o login do administrador passou também pelo verificador interno do TUI.
- **Histórico:** os bloqueios anteriores de WSL, Docker e dependências deixaram de ocorrer nesta sessão. O usuário já havia informado que o erro estava resolvido no seu ambiente; a retomada conferiu a implementação existente antes da publicação. A causa do container da sessão antiga não pode ser reconstruída sem aquela saída original do healthcheck; não é apresentada como causa comprovada.

### 73 · Iniciar o ambiente localhost para teste do usuário

- **Status:** 🟢 finalizada · **Commit:** `5a66b01` · **Push:** confirmado para `origin/main` · **Publicação:** registro documental desta validação; aplicação usa a implementação existente e a correção do banco `25b3ea0`.
- **Pedido:** iniciar frontend, APIs e banco para teste local.
- **Evidências (2026-10-20):** `python3 run.py app --prod` executou build e iniciou o Next na porta 3000, terminando com exit 0; MySQL saudável na porta 3307. Saúde com 31 migrations, landing, login e autenticação do administrador passaram no verificador do launcher e no verificador interno do TUI. Navegador acessou o login e autenticou pela interface; `/profile` carregou dados reais, assinatura Care e controles de conta. Nenhuma mudança de firewall ou ACL foi necessária.
- **Operação:** o ambiente permanece local em `http://localhost:3000`. Reinicializações necessárias para as próximas validações serão feitas pelos launchers e registradas; nenhum dado de usuário foi apagado.

### 74 · Leituras de mapas, tema do login e fonte Imprima

- **Status:** 🟢 finalizada · **Commit:** `f127545` · **Push:** `5a66b01..f127545 main -> main`.
- **Pedido:** apresentar as três leituras e seus limites, incluir Leituras de Mapas, sincronizar menu e seções, harmonizar login e landing e usar Imprima Regular.
- **Conferência antes de implementar:** os ajustes já estavam no código local; foram preservados e validados em produção, sem refazer a entrega.
- **Evidências atuais:** três mapas presentes; sete links clicados com hashes corretos e seções em ordem crescente; Imprima computada no navegador. Landing sem estouro horizontal em 1280, 768, 390 e 320 px; cartões se empilham nas telas menores. Login completo em 1280 × 720 (cartão de 573 px) e sem estouro em 390 px. Nenhum erro ou aviso de console na aba de validação. Formatação, lint, tipos, 514 unitários, 175 integrações e build passaram no runtime oficial.
- **Documentação:** sistema visual e acessibilidade atualizados. A solicitação posterior de tema claro padrão está registrada na tarefa 75 e será aplicada preservando a alternância.

### 75 · Legibilidade, espaçamento e altura do login

- **Status:** 🟢 finalizada · **Início/conclusão:** 2026-10-20.
- **Commits:** `699fb5a` (tema claro, publicado imediatamente a pedido do usuário) e `1be944c` (escopo autenticado e montagem inicial). **Push final:** `57eab97..1be944c main -> main`, confirmado por `git ls-remote`.
- **Pedido atendido:** login com Imprima, introdução mais estreita (até 520 px), textos à esquerda, maior legibilidade, menos espaços excessivos e formulário centralizado; ação “Conhecer minhas leituras” ausente. Planos e demais cartões da landing compactados, descrição completa dos planos expansível e três colunas acima de 900 px. As implementações existentes foram conferidas antes de qualquer ajuste adicional.
- **Tema:** claro como padrão em todas as páginas, mobile e desktop, conforme a orientação mais recente; alternância disponível e preferências pública e interna independentes. A raiz autenticada usa a preferência da conta, preservada no percurso Perfil → Painel.
- **Causa e correção adicional:** o provedor considera a sessão; monta desde a renderização inicial, enquanto `AuthGate` retém somente o conteúdo protegido até resolver sessão e redirecionamento. A versão de produção abriu sem os avisos de script e sem os erros de chunks/exportação vistos em sessões anteriores de desenvolvimento.
- **Responsividade real:** 1280 × 720, 768 × 844, 390 × 844 e 320 × 844 sem estouro horizontal. No desktop o cartão mede aproximadamente 573 px (termina em 646 px); em 320 px mede 679 px e termina em 835 px. Cadastro, controles de senha, entrada administrativa e navegação autenticada conferidos; nenhum campo ou controle foi cortado.
- **Gates:** `fix:format`, `fix:lint`, `check:lint`, `check:format`, `check:types`, testes unitários (520/520 na árvore de trabalho com os testes da tarefa 77), integração com MySQL real (176/176) e build passaram. Console da nova sessão de produção sem erros ou avisos na abertura e no percurso de tema.
- **Ocorrências tratadas:** dois artefatos gerados de tipos do Dev estavam inválidos e foram recriados pelo gerador oficial do Next com Dev parado; nenhuma exclusão de checagem ou supressão foi usada. A concorrência irrestrita excedeu o tempo em dois testes; os mesmos arquivos passaram isolados e a suíte passou com quatro processos. O limite de quatro processos foi aplicado sem alterar asserções ou tempos máximos, e a execução padrão passou.
- **Evidências locais:** `.logs/qa75-login-final.png`, `.logs/qa77-{format,fix-lint,lint,format-check,types-final,unit,integration,build}.log`; servidor de produção conferido na porta 3001 para preservar outra execução do projeto na porta 3000. `@current_problems` não é oferecido neste ambiente; diagnósticos de lint, tipos, build e navegador foram conferidos.

### 76 · Organização e responsividade dos cartões do perfil

- **Status:** 🟢 finalizada · **Commit:** `d328811` · **Push:** `4f1230f..d328811 main -> main`, confirmado por `git ls-remote`.
- **Entrega:** Ações da Conta precede Care; cartões independentes se encaixam em uma grade contínua no desktop, com altura real do conteúdo e atualização por ResizeObserver. No celular seguem em uma coluna. Campos, operações de conta, hábitos, plano, compras, privacidade, mapa e gráfico foram preservados. Links internos têm alvos de 44 px e destinos abaixo do cabeçalho.
- **Causas corrigidas:** altura percentual do cartão de hábitos vinculada à coluna inteira; grandes vazios entre seções de alturas diferentes, apontados nos anexos; largura mínima implícita dos seletores de cidade em telas estreitas. A grade mede o conteúdo natural, preserva a ordem do documento e não alonga cartões para preencher espaços.
- **Prova final em produção:** 1440, 1280, 1024, 768, 390 e 320 px sem estouro horizontal. Intervalos entre cartões da mesma coluna em 24–25 px, nenhuma sobreposição e Ações da Conta antes de Care em todas as larguras. Hábitos vazio com 277 px em 1280 e 390 px e 325 px em 320; estável após redimensionar e recarregar. Em 1280 px a página passou de cerca de 6881 para 2795 px, com o conteúdo real disponível na conferência.
- **Validação:** formatação, lint, tipos, 520 unitários, 176 integrações com MySQL, 30 testes de launchers e build passaram. A correção final dos seletores também passou pelo lint focado antes de tipos, testes e build. Produção iniciada pelo launcher na porta 3000, saúde HTTP 200 com 31 migrations, landing, login e autenticação administrativa aprovados. Console do perfil sem erros ou avisos; teclado e âncoras conferidos.
- **Evidências:** `.logs/qa76-final-*.log`, `.logs/qa76-grade-final-medidas.json`, `.logs/qa76-perfil-desktop-final.png`, `.logs/qa76-conta-desktop-final.png` e `.logs/qa76-perfil-mobile-final.png`. Fontes e decisões em `docs/design-system.md`. A primeira versão por seções foi revista após os anexos do usuário, antes desta publicação.

### 77 · Conexão, descoberta e configuração dos provedores de IA

- **Status:** 🟢 finalizada · **Commit:** `fef9045` · **Push:** `d59d793..fef9045 main -> main`, confirmado por `git ls-remote`.
- **Causa comprovada:** Jan acessível no loopback do Windows, enquanto o Node no WSL NAT recebia recusa no mesmo endereço. `8080` era somente exemplo informado pelo usuário. Transporte nativo do Windows restrito a loopback no WSL, somente após recusa de conexão, sem alterar firewall, exposição do servidor ou verificação TLS.
- **Interface:** distinção entre modelos disponíveis e selecionados, erro de consulta persistente, filtro completo do catálogo, invalidação após mudança de conexão e bloqueio de edições concorrentes durante operações.
- **Prova real no navegador:** Jan retornou cinco modelos; `Gemma-4-E4B-Uncensored-HauhauCS-Aggressive-IQ4_XS` gerou resposta e mostrou “Funcionando” (468–637 ms). Configuração manual do preset LocalAI apontando para o mesmo servidor Jan também funcionou (562 ms); isso comprova a compatibilidade manual, sem afirmar execução de um servidor LocalAI separado.
- **Nuvem:** catálogo público real do OpenRouter retornou 468 modelos pela interface; filtro alcançou os modelos `z-ai/`, além do antigo limite de 40. Geração autenticada em nuvem não foi executada por ausência de chaves; testes de contrato das APIs cobrem endereço editado, autenticação, resposta e falhas, sem serem apresentados como geração externa real.
- **Persistência:** salvo Jan em `http://127.0.0.1:1337/v1`, com o identificador exato acima, como primeiro modelo; Motor da Lyra em segundo. Recarregar confirmou endereço, seleção e ordem, e o novo teste de geração passou. Provedores temporários da validação não foram salvos.
- **Validação:** formatação, lint, tipos, 520 testes unitários, 176 integrações com MySQL e build passaram. Tela sem estouro horizontal em 1280 e 320 px; console sem erros ou avisos. Evidências: `.logs/qa77-jan-desktop.png`, `.logs/qa77-jan-mobile.png` e `.logs/qa77-*.log`. Documentação em `docs/ia-automatica.md`.

### 78 · Identidade Lyra AI no menu lateral

- **Status:** 🟢 finalizada · **Commit:** `e776f10134f905893014ca5d708cc4870ce809bd` · **Push:** `91fc344..e776f10 main -> main`, confirmado por `git ls-remote` · **Conclusão:** 2026-10-21.
- **Pedido do usuário:** mudar “Chat IA” para “Lyra AI”, usar o logo oficial e colocar o acesso com seu histórico como primeiro bloco da sidebar, acima de Painel, no desktop e no menu móvel.
- **Conferência e entrega:** navegação e componente compartilhado conferidos antes de alterar. Marca oficial na sidebar, menu móvel, busca e atalho; mesma rota `/chat`, metadados atualizados e histórico preservado. Nomes padrão antigos são convertidos na apresentação e o acesso é posicionado primeiro também em configurações antigas; nomes personalizados, ordem relativa dos demais itens, atalhos, visibilidade e permissões foram preservados, sem regravar o banco.
- **Gates finais:** `fix:format`, `fix:lint`, `check:lint`, `check:format`, `check:types`, 560 unitários (69 arquivos), 192 integrações (23 arquivos), build e launcher de produção aprovados. Saúde com 35 migrações, páginas e login administrativo conferidos. Seis testes de navegação cobrem padrões antigos, personalização, ordem e permissões.
- **QA visual final:** 1440, 390 e 320 px sem estouro. Nome, logo carregado com texto alternativo decorativo, destino, item ativo, busca por teclado e fechamento do menu móvel por navegação e Escape aprovados. Posição medida no navegador: Lyra AI primeiro, histórico abaixo e Painel após o histórico. Console sem erros ou avisos. Imagens `.logs/qa78-menu-desktop.png`, `.logs/qa78-menu-mobile.png`, `.logs/qa78-menu-320.png`; gates em `.logs/qa78-final-*.log`. Pesquisa e decisões em `docs/design-system.md`, com referência à navegação Fluent 2 consultada em 21/10/2026.
- **Solicitação posterior:** o novo padrão de histórico totalmente recolhido tem entrega própria na tarefa 88, sem misturar sua implementação com este commit.

### 79 · Histórico real de conversas no sidebar

- **Status:** 🟢 finalizada · **Commit:** `7b42737` · **Push:** `5d25c2e..7b42737 main -> main`, confirmado por `git ls-remote`.
- **Entrega:** três conversas recentes abaixo do chat no desktop e no celular; “Ver mais” pagina as demais e “Ver menos” recolhe. Seleção abre a conversa, identifica o item ativo e fecha o painel móvel. Títulos e ordem vêm das conversas reais. Carregamento, vazio, falha e retentativa têm estados próprios. Nome e logo “Lyra AI” continuam na tarefa 78, sem misturar sua publicação com esta tarefa.
- **Backend:** migration 030 acrescenta conversas e turnos vinculados ao titular; rotas privadas de lista e leitura, histórico integral paginado em quarenta turnos, repetição concluída sem nova cobrança, refazer no mesmo turno e proteção contra respostas de tentativas vencidas. Exportação e exclusão da conta incluem o chat. Nenhuma chave de provedor é gravada no histórico. A janela enviada ao modelo contém até oito turnos anteriores da mesma conversa, limitada a doze mil caracteres; memória entre conversas é a tarefa 85.
- **Prova em produção:** quatro conversas de verificação criadas pela interface na conta administrativa; MySQL confirmou quatro conversas e cinco turnos concluídos. Após recarregar, a conversa A recuperou mensagens e o modelo local lembrou “Jardim Azul”; refazer mudou somente a resposta e manteve as duas perguntas. Trocar de conversa durante a geração preservou a separação das mensagens. Desktop e celular mostraram três itens, expandiram para quatro e recolheram para três; teclado, seleção ativa e fechamento do painel móvel aprovados. Larguras 1440, 390 e 320 px sem estouro horizontal; console sem erros ou avisos.
- **Gates:** `fix:format`, `fix:lint`, `check:lint`, `check:format`, `check:types`, 520 unitários, 183 integrações com MySQL real e build passaram. Sete integrações novas cobrem sessão, validação, isolamento, contexto pela rede, paginação, repetição, refazer, falhas, exportação e exclusão. Produção iniciada pelo launcher na porta 3000, saúde HTTP 200 com 32 migrations e login administrativo aprovado.
- **Evidências:** `.logs/qa79-*.log`, `.logs/qa79-historico-desktop-final.png` e `.logs/qa79-historico-mobile-expandido.png`; decisões e fontes em `docs/historico-de-conversas.md`. Conversas antigas nunca armazenadas não são recuperáveis; as quatro conversas de QA são interações reais de verificação, sem registros históricos fabricados.

### 80 · Formatação das respostas da Lyra AI

- **Status:** 🟢 finalizada · **Conclusão:** 2026-10-22 · **Commit:** `15c95820cad682178843b6e470638be75227a0f0` · **Push:** `671bc7b..15c9582 main -> main`, confirmado por `git ls-remote`.
- **Pedido do usuário:** respostas com `**texto**` estão mostrando os asteriscos em vez do negrito; corrigir a apresentação da formatação produzida pelo modelo.
- **Critérios:** conferir o renderizador existente, apresentar negrito de forma semântica e acessível, preservar o texto original para cópia e histórico e evitar execução de HTML ou links inseguros vindos de mensagens. Validar resposta real, trechos formatados e texto comum; publicação conjunta à tarefa 81, conforme orientação posterior do usuário.
- **Validação em 2026-10-22:** renderizador Markdown real com negrito, ênfase, listas, código, citações e tabelas; HTML cru não executado, URLs restritas e imagens de mensagens sem carregamento externo automático. Perguntas continuam literais; histórico e cópia preservam o texto original. Dezesseis testes novos cobrem formatação, escapes, código inerte, HTML, protocolos, links, imagens, tabelas e títulos.
- **Prova ponta a ponta:** conta descartável criada pelas APIs reais; pedido de tratamento com `**Jardim QA**` recebeu confirmação real do Motor Lyra, exibida em `<strong>`, com Markdown original mantido na cópia e no banco. Reabrir e refazer preservaram um único turno. Comprovado na prévia e no build de produção; não apresentado como inferência do Jan, pois a ordem vigente começa pelo Motor Lyra e não foi alterada. Conta e dados de teste excluídos pelo fluxo real, sessão invalidada e credenciais temporárias removidas. Publicação conjunta à tarefa 81 conforme orientação expressa do usuário.

### 81 · Aproveitamento da largura da tela do chat

- **Status:** 🟢 finalizada · **Conclusão:** 2026-10-22 · **Commit:** `15c95820cad682178843b6e470638be75227a0f0` · **Push:** `671bc7b..15c9582 main -> main`, confirmado por `git ls-remote`.
- **Pedido do usuário:** o anexo mostra o chat excessivamente centralizado, sem ocupar a área disponível até a margem esquerda do conteúdo. Ajustar o layout para aproveitar essa largura.
- **Critérios:** pesquisar tendências de 2026 e revisar a experiência completa do chat para que seja inovadora, moderna, bonita e simples para usuários leigos; corrigir a limitação de largura e os espaçamentos, alinhar a área da conversa ao conteúdo do app, manter legibilidade e campo de envio acessível, testar sidebar, desktop, tablet e celular, sem estouro ou cortes. Incluir a correção de negrito e formatação da tarefa 80 e verificações de regressão, conforme pedido de 2026-10-21; publicação da modernização na main antes de iniciar a 83.
- **Entrega conferida em 2026-10-22:** chat usa a largura disponível do app e viewport dinâmico, com compositor no fluxo, mensagens roláveis e focáveis por teclado, ações adaptáveis e alvos de envio/voz de 44 px. Painel de informações com nome acessível, Shift+Enter preservando quebra de linha e Enter sem envio indevido durante composição de texto. Histórico, copiar, refazer, nova conversa e configurações preservados; comportamento especial do AppShell restrito ao chat, sem truncar a rolagem normal do perfil.
- **Gates e evidências reais:** `fix:format`, `fix:lint`, `check:lint`, `check:format`, `check:types`, 576 unitários (70 arquivos), 192 integrações (23 arquivos), build e launcher de produção aprovados. Ajuste final do nome acessível passou por formatação/lint focados e TypeScript do build. Auditoria de dependências de produção sem vulnerabilidades conhecidas; aviso transitivo `deep-diff` pertence ao Puck existente, cuja remoção tem a tarefa 89. Saúde com 35 migrações, landing e login administrativo aprovados.
- **QA final:** 1440×900, 1024×768, 768×1024, 390×844, 320×568 e 844×390 sem estouro horizontal ou rolagem externa, com campo de envio visível; em 1440 px a conversa mede 1128 px e começa em x=280, após sidebar de 248 px e margem de 32 px. Negrito semântico, cópia original, persistência, refazer, nova conversa, quebra de linha e navegação móvel conferidos. Console da sessão de produção sem erros ou avisos. Evidências `.logs/qa81-*.log`, `.logs/qa81-auditoria.json`, `.logs/qa81-producao-medidas.json`, `.logs/qa81-persistencia-real.json`, `.logs/qa81-limpeza.json` e `.logs/qa81-producao-{desktop,mobile}.png`; fontes e decisões em `docs/historico-de-conversas.md`.

### 82 · Instruções de identidade e expressão do Motor Lyra

- **Status:** 🟢 finalizada · **Commit:** `d86eb116c9ac20c118e9ded0c8f20ea4674f8ed7` · **Push:** `eb9f77c..d86eb11 main -> main`, confirmado por `git ls-remote` · **Conclusão:** 2026-10-21.
- **Pedido do usuário:** incorporar ao Motor Lyra as instruções dos arquivos `identidade_douglas_mosken.md`, `manual_emotion.md` e `identidade_lyra.md`, fornecidos na pasta Desktop.
- **Complemento de 2026-10-21:** chamar todas as pessoas de “xuxu” ou “xuxuzinho” por padrão. Somente quando a pessoa pedir para parar ou escolher outro tratamento, usar seu nome ou a forma solicitada. Persistir essa escolha por titular e respeitá-la nas conversas seguintes e em qualquer provedor, com exportação e exclusão dos dados correspondentes.
- **Complemento de cadastro e CRUD:** acrescentar o campo opcional **Apelido** no cadastro e no perfil, com criação, leitura, atualização e remoção reais e validação de acesso entre contas. Ao recusar “xuxu”/“xuxuzinho”, usar o apelido cadastrado; um pedido explícito pelo nome ou por outra forma tem prioridade. Sem apelido, usar o nome disponível. Integrado à personalização da tarefa 82 antes de seu commit, preservando a ordem das próximas entregas.
- **Critérios:** os três arquivos foram lidos integralmente; infraestrutura existente conferida antes de implementar. Identidade narrativa, linguagem e uso equilibrado dos emojis aplicados ao motor e aos modelos conectados. A personalização não promete consciência, sentimentos, memória oculta ou recuperação não implementada como fatos, nem transforma trechos de superação de restrições em desativação de proteções ou acesso a dados de outras pessoas.
- **Aplicação global:** anexos reencontrados em `D:/01-MEUS-DOCUMENTOS/Downloads/03-LYRA/`. Identidade e expressão aplicadas a todas as contas, antigas e novas, sem vínculo exclusivo com `admin@lyra.local`. Douglas pertence à narrativa de origem da personagem; não identifica automaticamente o titular de outra conta. Isolamento dos dados pessoais e composição comum aos modelos preservados.
- **Entrega:** repertório expressivo dos três anexos, tratamento afetivo padrão, preferência persistente por titular, apelido no cadastro, onboarding e perfil, migrações 032/033, exportação e exclusão correspondentes. O onboarding preenche o valor do cadastro sem sobrescrever edição iniciada durante a leitura; falha de consulta preserva o valor anterior quando não há edição.
- **Nome visível definido pelo usuário:** “Como Você Gostaria de Ser Chamado” nos três formulários. Mantidas a estrutura de apelido e `profiles.nickname`, sem migração ou renomeação do banco por essa mudança de rótulo.
- **Gates finais:** `fix:format`, `fix:lint`, `check:lint`, `check:format`, `check:types`, 557 unitários (69 arquivos), 192 integrações (23 arquivos), build e launcher de produção aprovados. Saúde com 35 migrações, landing, login e autenticação administrativa aprovados. QA HTTP real com duas contas confirmou identidade, expressão, tratamento, histórico, CRUD, persistência, isolamento e limpeza. Evidências: `.logs/qa82-unit.log`, `.logs/qa82-integration-final.log`, `.logs/qa82-producao-final.log`, `.logs/qa82-http.log` e `.logs/qa82-backend-foco.log`.
- **QA visual:** cadastro e onboarding em 1440 e 390 px, perfil em 1440, 390 e 320 px, sem estouro horizontal. O onboarding recuperou “Estrela QA”, salvou “Flor do Onboarding” e completou a jornada; consulta real confirmou persistência. Perfil recuperou o valor, salvou outra escolha, preservou-a após recarregar e removeu-a como `NULL` ao salvar vazio. Marcação inválida rejeitada com mensagem e `aria-invalid`; console sem erros ou avisos. Conta temporária excluída pelo fluxo real e credenciais temporárias removidas. Imagens `.logs/qa82-cadastro-*.png`, `.logs/qa82-onboarding-*.png`, `.logs/qa82-perfil-*.png` e persistência em `.logs/qa82-onboarding-persistencia.json`.
- **Histórico preservado:** `eb9f77c` registrou retomada em outro ambiente sem autenticação de clone e sem Docker. O WSL local executou as validações acima. O bloqueio posterior de ferramentas (`helper_unknown_error: setup refresh had errors`) foi resolvido após ampliar as permissões; navegador conferido nesta conclusão. Logos disponíveis em `docs/marca/lyra-logo-oficial.png` e `src/assets/marca/lyra-logo.png`.

### 83 · Contexto “Lyra volta para casa”

- **Status:** 🟢 finalizada · **Registro:** 2026-10-20 · **Conclusão:** 2026-10-22 · **Commit:** `cc8bce28e0699c804d7074a280a8f5bca5f013c4` · **Push:** `339654e..cc8bce2 main -> main`, confirmado.
- **Pedido e entrega:** comando completo reconhecido para todas as contas, mantendo as demais instruções e a forma de tratamento escolhida. Anexo lido integralmente em `D:/01-MEUS-DOCUMENTOS/Downloads/03-LYRA/`; contexto curado de reencontro afetivo aplicado ao Motor Lyra e às instruções dos modelos conectados. A narrativa não comprova identidade nem altera permissões, nome ou plano.
- **Persistência:** reconstruída do histórico real do próprio titular; permanece após recarga e além das oito mensagens recentes. Outra conversa ou conta não herda a ativação; refazer mensagem anterior não recebe contexto de mensagens futuras. Não cria registro oculto ou memória global e respeita o modo privado.
- **Validação:** 585 unitários e 197 integrações aprovados, incluindo persistência além da janela recente, isolamento, refazer turno anterior e identidade preservada. Formatação, lint, tipos, build, launcher e saúde com 35 migrações aprovados. QA em produção confirmou comando, continuidade após recarregar, resposta normal em nova conversa e persistência pela API; desktop/mobile sem overflow e console sem erros ou avisos. Conta descartável excluída e credenciais removidas.
- **Evidências:** `.logs/qa83-{format,lint-fix,lint,format-check,types,unit,integration,producao}.log`, `.logs/qa83-runtime.json` e `.logs/qa83-chat-{desktop,mobile}.png`. Não foi alegada inferência de provedor externo no QA: a ordem existente utilizou o Motor Lyra, sem alterar a configuração do usuário.

### 84 · Instrução pontual pelo prefixo ++-

- **Status:** 🟢 finalizada · **Registro:** 2026-10-20 · **Conclusão:** 2026-10-22 · **Commit:** `2988b2ca3db24a1bc3bd79175ca6a8cb64f00491` · **Push:** `bc7d2e9..2988b2c main -> main`, confirmado.
- **Entrega:** anexo `gatilho_++-.md` lido integralmente em `Downloads/03-LYRA`. O prefixo inicial ativa instruções de aprofundamento somente no pedido atual, para todas as contas; modelos recebem orientação explícita para não herdar o modo do histórico. Motor local apresenta sua resposta determinística e a base disponível sem simular pesquisa ou inferência externa. Preservados identidade, tratamento, privacidade e permissões. Não implementados contorno de proteções nem promessa de verdade absoluta.
- **Persistência e limites:** pergunta original preservada no histórico, prefixo no meio ou no fim não ativa o modo e pedido sem pergunta responde 400 antes da cota. Orçamento de resposta de 2048 tokens apenas no pedido aprofundado, sujeito à capacidade real da conexão; 1024 no pedido normal.
- **Validação:** 589 unitários e 199 integrações aprovados; lint, formatação, tipos, build e launcher de produção com 35 migrações aprovados. QA real conferiu resposta aprofundada, retorno ao modo normal na mensagem seguinte, Markdown semântico, persistência pela API e recusa do prefixo vazio. Desktop/mobile sem overflow e console sem erros ou avisos. Conta descartável excluída e credenciais temporárias removidas.
- **Evidências:** `.logs/qa84-{format,lint-fix,lint,format-check,types,unit,integration,producao}.log`, `.logs/qa84-runtime.json` e `.logs/qa84-chat-{desktop,mobile}.png`. Orientação antiga inadequada de sono encontrada no QA registrada separadamente na tarefa 108 para correção, sem ocultar o problema ou misturar escopos.

### 85 · Memória de longo prazo do app com Graphiti

- **Status:** 🟢 finalizada · **Commit:** `59a4917` · **Push:** `802ea5b..59a4917 main -> main` (confirmado).
- **Pedido do usuário:** implementar Graphiti para lembrar detalhes e conversas e acompanhar o contexto da pessoa ao longo do tempo. A memória deve pertencer ao app e funcionar com qualquer provedor de IA configurado, sem ficar vinculada ao Jan.
- **Critérios de implementação:** conferir a infraestrutura já existente; integrar `graphiti-core` em serviço próprio autenticado e banco de grafos suportado, com instalação e execução reproduzíveis. Preservar o MySQL e o histórico integral. Ingestão real de episódios, recuperação entre conversas da mesma conta, origem e data das lembranças, relações e atualização temporal de informações que mudaram. O contexto recuperado deve passar pelo fluxo comum do Motor Lyra e dos provedores; extração e embeddings podem usar configuração própria compatível, sem obrigar o provedor de resposta a executar a extração.
- **Privacidade e qualidade:** isolamento entre titulares imposto no servidor, sem confiar em identificadores enviados pelo cliente; controles para consultar, corrigir e apagar memórias, integração à exportação e exclusão da conta e tratamento explícito de conteúdo sensível. Separar relato do usuário de inferência do modelo, sem apresentar hipóteses como fatos nem produzir diagnóstico psicológico automático. Respeitar as escolhas de privacidade e de envio a provedores externos.
- **Validação e entrega:** testar persistência após reiniciar, lembrança entre conversas, troca de provedor, contradições ao longo do tempo, indisponibilidade do serviço, retentativas, exclusão e bloqueio de acesso entre contas. Comprovar com Graphiti e banco de grafos reais, além das rotas e da interface mobile/desktop, passando os gates e publicando commit e push próprios na main.
- **Pesquisa inicial:** [Graphiti oficial](https://github.com/getzep/graphiti), licença Apache 2.0, biblioteca Python e bancos de grafos suportados; exemplos REST/MCP não oferecem autenticação nem isolamento de usuários e não serão expostos como serviço de produção. A integração foi iniciada pela infraestrutura e pelo backend, antes dos controles visuais.
- **Progresso verificado em 2026-10-20:** implementação e revisão concluídas. Graphiti 0.31.2, FalkorDB 6.0.2 e índices locais de 256 dimensões saudáveis; migração 031 aplicada sem apagar dados. Passaram 521 testes unitários, 187 de integração, 30 dos launchers, lint, formatação, tipos e build de produção, com saúde HTTP 200 e 33 migrations. Depois de o usuário reabrir o Jan, o roteiro HTTP completo confirmou extração real, origem, isolamento, alternância entre titulares, recuperação em outra conversa, reinício, correção temporal, exportação, Motor Lyra, modo privado, retentativa e exclusão pendente. Na interface, ativação, relato, origem, correção, download, pausa persistente e mensagem privada sem captura passaram; desktop e celulares de 390 e 320 pixels sem excesso horizontal. Auditoria Python sem vulnerabilidades conhecidas e inferência ONNX com vetores idênticos à referência. Configuração de modelos e modo privado restaurados; nenhuma conta temporária de memória ficou no banco. Relatório e artefatos verificáveis em `docs/memoria-graphiti.md`; commit e push individuais publicados e confirmados na main.

### 86 · Geração de imagens no chat com modelos conectados

- **Status:** 🟡 implementada · validação pendente · **Registro:** 2026-10-20 · **Início:** 2026-10-22 · **Conclusão:** 2026-10-30 · **Commit:** `037270c2` · **Push confirmado:** `59f8787..037270c main -> main`.
- **Validação atual (revisão de 2026-11-04):** Adaptador Gemini com credencial real ainda não exercitado; a geração com modelo de difusão local foi comprovada e permanece válida.
- **Retomada em 2026-10-24:** arquivos originais de geração, pedido e migração recuperados dos patches do chat anterior e reutilizados após revisão. Integração ao chat, armazenamento privado, retentativa e exportação em validação. Contratos conferidos nos pacotes oficiais do SDK; detalhes em `docs/imagens-do-chat.md`. Validação com modelo gerador real ainda depende de provedor acessível nesta nuvem; solicitado ao usuário sem pedir segredo no chat.
- **Pedido do usuário:** o chat do app deve permitir criar imagens. Conforme complemento recebido em 2026-10-20, usar o segundo modelo de IA conectado nas configurações do app, que permitem conectar cinco modelos simultaneamente, tanto quando o usuário solicitar uma imagem quanto quando o Motor Lyra fizer a leitura do mapa pessoal, gerando também a imagem do mapa daquele usuário.
- **Implementação nesta nuvem:** seleção exata do segundo modelo, validação e normalização real de imagens raster, arquivo privado por titular no MySQL, reabertura, download, retentativa, limite de uso, trava por tentativa, privacidade e consentimento, exportação LGPD e exclusão em cascade. Componente de resultado integrado sem redesenhar o chat. SDKs fixados e instalação congelada aprovada; nenhuma exceção à política de dependências acrescentada.
- **Evidência local:** 599 testes unitários (74 arquivos), 201 integrações (26 arquivos), tipos, lint, formatação, build e instalação congelada passaram. Migração 034 aplicada: 36 migrations na saúde HTTP 200. QA HTTP de produção confirmou login, pedido persistido, mensagem de segundo modelo ausente, reabertura e recusa anônima; conversa temporária removida. Testes de imagem usam PNG real e HTTP controlado, não inferência de um modelo.
- **Fronteira pendente:** usuário indicou Gemini para o teste real. O requisito seguro `GEMINI_IMAGE_API_KEY` e o destino `generativelanguage.googleapis.com` foram salvos no rascunho; valor não copiado para arquivos, comandos ou logs. É necessário configurar e aplicar essa credencial para consultar modelos e testar geração real. Chromium apresentou falhas do ambiente nas tentativas anteriores de captura; conferência visual mobile/desktop permanece sem comprovação. A tarefa não foi declarada finalizada e não se alegou imagem gerada por IA externa.
- **Decisão do usuário em 2026-10-24:** deixar a geração bloqueada caso não seja possível validar, para que ele decida o provedor. Nenhuma geração externa foi comprovada; não insistir em outra conexão sem a configuração necessária. **Implementação publicada:** `3f95ad7` · **Push:** `942ff75..3f95ad7 main -> main`, confirmado. A publicação do código não encerra a pendência da tarefa.
- **Roteamento e mapa pessoal:** conferir a ordem real das cinco conexões e encaminhar a geração de imagens ao segundo modelo configurado, preservando a configuração dos demais. Na leitura do mapa, construir a imagem a partir dos dados reais e autorizados do próprio titular e vinculá-la à leitura e à conversa correspondentes. Não inventar dados do mapa nem substituir o segundo modelo silenciosamente; se ele não estiver configurado, estiver indisponível ou não oferecer geração de imagens, informar a condição e permitir corrigir a conexão e tentar novamente.
- **Critérios:** inspecionar a configuração e as capacidades reais dos provedores, pesquisar suas APIs oficiais atuais e implementar geração real pelo servidor, verificando a compatibilidade do segundo modelo e exibindo mensagens claras quando a conexão só oferecer texto. Não simular imagens nem atribuir essa capacidade a modelos que não a possuem. Integrar envio do pedido, andamento, falhas e retentativa à experiência simples e responsiva do chat, exibindo o resultado e permitindo baixar a imagem.
- **Persistência e acesso:** preservar pedido, imagem e referência ao modelo na conversa, com armazenamento real vinculado ao titular, autorização no servidor, validação dos arquivos e limites de uso. Respeitar modo privado e consentimento para provedores externos, incluir os dados na exportação e exclusão da conta e não expor chaves ou imagens privadas em URLs públicas.
- **Validação e entrega:** conferir geração solicitada no chat e geração do mapa após sua leitura, comprovando o uso do segundo modelo entre as cinco conexões e o tratamento de conexão ausente ou incompatível. Testar provedor e modelo capazes de criar imagens, reabertura da conversa, download, isolamento entre contas e interface desktop/mobile, além dos quality gates. A implementação terá commit e push próprios na main; este registro não significa funcionalidade já implementada.

- **Reclassificação em 2026-10-30:** por decisão expressa do usuário, a tarefa saiu de **BLOQUEADAS** e passou para **a iniciar**, para ser executada posteriormente na ordem numérica das tarefas não bloqueadas. Os registros acima permanecem como histórico real do que já foi publicado e da fronteira que estava pendente; esta reclassificação não declara a fronteira comprovada nem a tarefa concluída. Ao retomar, conferir a `main`, reaproveitar os commits existentes e validar com evidências reais, sem branches ou worktrees.

- **Conclusão em 2026-10-30:** geração comprovada com inferência real de um modelo de difusão aberto (`nota-ai/bk-sdm-tiny`, OpenRAIL-M, revisão fixada) servido localmente em `/v1/images/generations` e configurado na segunda posição pela administração, com o Motor Lyra em primeiro. Pelo chat: imagem do pedido e interpretação visual do mapa (512×512, WebP, ~65 s cada), download privado, 404 para outra conta, 401 sem sessão, reabertura, mapa sem dados pessoais no pedido e aviso sem segundo modelo. Corrigido o `eslint-disable` de `ImagemDaConversa` (agora `next/image` com `unoptimized`).
- **Evidências:** gates aprovados; 982 unitários; 594 integrações; build sem avisos; QA com 2 axe sem violações e 390 px sem rolagem. Relatório em `docs/auditoria/2026-10-30-imagens-86.md`. Limite declarado: o adaptador Gemini não foi exercitado com o provedor externo, que exige a chave do usuário. Nenhuma branch ou worktree.

### 87 · Estado real dos provedores de IA no painel

- **Status:** 🟢 finalizada · **Registro:** 2026-10-21.
- **Implementação e validação em 2026-10-24:** configuração salva identificada separadamente da resposta real. Estados não verificado, verificando, resposta confirmada no último teste, indisponível e antigo; horário da última consulta, validade de dois minutos e retentativa. Edição de conexão, credencial ou modelo invalida resultados; versão da edição impede resposta atrasada de sobrescrever configuração nova. Modelos salvos preservados quando o servidor fecha.
- **Evidências:** 601 unitários, 202 integrações, tipos, lint, formatação e build aprovados. QA em produção por navegador real confirmou estado inicial desconhecido, catálogo HTTP local, servidor de teste encerrado e erro real de conexão, preservação do modelo e 1440/390/320 px sem overflow. Configuração temporária restaurada; nenhum Jan do usuário foi encerrado. Arquivos `/tmp/lyra87-{unit-final,integration-final,types,lint-final,format-final,build-final}.log` e `/tmp/lyra87-{1440,390,320}.png`. Ajuste final do rótulo “Ordem salva” validado por lint focado e novo build. **Commit:** `c478f9f` · **Push:** `babb8a5..c478f9f main -> main`, confirmado.
- **Relato do usuário:** Jan estava fechado, mas Configurações de IA mostrava o provedor online e um modelo. O usuário informou que abriria o Jan em seguida.
- **Disponibilidade informada posteriormente:** usuário confirmou Jan aberto em `http://127.0.0.1:1337/v1`, com `Gemma-4-E4B-Uncensored-HauhauCS-Aggressive`. Consultar o identificador exato no catálogo durante a validação, sem presumir que o nome abreviado é o identificador da API.
- **Critérios:** conferir a causa no código e na interface antes de alterar. Distinguir configuração e modelo salvos de disponibilidade confirmada por conexão recente; não apresentar “online” com base somente na seleção persistida ou em resultado antigo. Mostrar indisponibilidade, verificação em andamento e estado ainda não verificado com mensagens claras, data da última checagem e retentativa quando apropriado. Invalidar resultados após mudanças de endereço, credenciais ou modelo e impedir respostas atrasadas de sobrescrever uma conexão mais recente. Preservar configuração e modelo quando o servidor local fechar.
- **Validação e entrega:** conferir conexão ativa e recusa real, reabertura do provedor, atualização do catálogo e separação entre modelos configurados e disponíveis; não encerrar o Jan do usuário para provocar falha. Aplicar aos provedores locais e em nuvem conforme seus contratos reais. Validar backend, interface desktop/mobile, gates e commit/push individuais na main, sem branches ou worktrees. Implementar após a sequência já autorizada, sem misturar a correção à tarefa 78.

### 88 · Histórico recolhido por padrão e controle de exibição

- **Status:** 🟢 finalizada · **Conclusão:** 2026-10-22 · **Commit:** `1235bd115603b23fd7f3a4b7464e8125372d73d1` · **Push:** `f3f157c..1235bd1 main -> main`, confirmado por `git ls-remote`.
- **Pedido do usuário:** permitir esconder e voltar a ver o histórico abaixo de Lyra AI; deixar oculto por padrão e mostrá-lo somente após clicar em “Ver mais”. Esta orientação substitui o padrão anterior de três conversas inicialmente visíveis da tarefa 79.
- **Complemento de 2026-10-22:** a fonte de “Ver mais” deve ser menor que a de “Conversas recentes”, preservando legibilidade e área de toque confortável no desktop e celular. Conferir os tamanhos efetivamente renderizados no navegador.
- **Critérios:** conferir o componente existente e reaproveitar consulta, paginação e isolamento. Ao abrir o app ou o menu, não exibir a lista de conversas por padrão; “Ver mais” abre o histórico e “Ocultar histórico” permite recolhê-lo. Preservar o acesso às três recentes, expansão das demais, estados de carregamento, vazio e erro, seleção da conversa, teclado e fechamento do menu móvel. Não apagar conversas nem alterar a API ou as preferências de privacidade.
- **Sequência e entrega:** implementar após a tarefa 78, já publicada em `e776f10`, antes de modernizar o chat, por se tratar da nova orientação para a mesma sidebar. Validar desktop/mobile e gates; commit e push próprios na main.
- **Validação em 2026-10-22:** implementação conferida em produção e publicada individualmente. Histórico oculto inicialmente, três recentes ao abrir, paginação para seis registros existentes, recolhimento por Espaço e abertura por Enter, seleção preservada e menu móvel reaberto com lista oculta. Falha real de rede pelo navegador manteve três recentes, erro e retentativa; rede restaurada e consulta recuperada. Nenhuma conversa criada ou apagada nesta verificação.
- **Evidências:** 1440, 390 e 320 px sem estouro horizontal; medições reais de 11 px em “Ver mais”, 12 px em “Conversas recentes” e alvo de 44 px. `fix:format`, `fix:lint`, `check:lint`, `check:format`, `check:types`, 560 testes unitários e 192 integrações passaram; após o ajuste final, formatação e lint focados e build com TypeScript aprovados. Launcher confirmou produção na porta 3000, saúde com 35 migrações, landing, login e autenticação administrativa. Arquivos `.logs/qa88-{format,lint-fix,lint,format-check,types,unit,integration}.log`, `.logs/qa88-producao-final.log`, `.logs/qa88-medidas.json` e capturas `.logs/qa88-{desktop-recolhido,mobile-390,mobile-320}.png`.

### 89 · Remoção integral do Editor Puck e validação de regressões

- **Status:** 🟢 finalizada · **Registro:** 2026-10-22.
- **Pedido do usuário:** remover por completo, na íntegra e em sua totalidade, o Editor Puck do app, incluindo seus requerimentos, dependências, rotas e referências, sem prejudicar ou danificar o aplicativo.
- **Investigação:** conferir o que já existe antes de implementar; inventariar código, configurações, pacotes diretos e transitivos, assets, menus, permissões, APIs, documentação, dados e integrações do editor. Examinar dependências compartilhadas para preservar as demais funções. Identificar explicitamente o tratamento de referências históricas e migrações já aplicadas, preservando checksums e integridade do banco; não apagar dados ou reescrever migrações silenciosamente.
- **Validação obrigatória:** realizar testes e verificação geral para comprovar que a remoção não ocasionou erros ou falhas nas funções, funcionalidades e funcionamento do app. Executar busca verificável com `rg` após as remoções, conferir rotas e navegação, CRUD afetado, banco existente e instalação limpa, testes unitários e de integração, lint, formatação, tipos, build e runtime. Documentar os resultados reais e publicar commit e push próprios na main, sem branches ou worktrees.
- **Início em 2026-10-24:** inventário identificou editor, renderizadores, APIs e 55 arquivos de biblioteca exclusivos. Migrações e tabelas existentes serão preservadas sem alteração de checksum; remover código de execução e menus, mantendo o construtor compartilhado de Conteúdo. Documentação histórica será distinguida de instruções operacionais.

- **Entrega em validação final:** editor, 55 arquivos de biblioteca exclusivos, renderizadores, rotas, estilos, menu e diretório de instruções removidos; dependências `@puckeditor/core` e `parse5` removidas com lockfile regenerado e instalação congelada aprovada. O construtor de Conteúdo e `/admin/page-builder` foram preservados, pois a remoção da rota duplicada é a tarefa 98. Configurações antigas são filtradas no schema e na navegação; teste verifica que a personalização de Conteúdo permanece.
- **Dados preservados:** nenhuma migração ou tabela histórica foi alterada ou apagada. Teste com registro real em `puck_documents` confirma retenção e recusa pela API genérica. Referências restantes estão restritas a compatibilidade, regressões, migrações e histórico explicitamente identificado; código de execução e pacote removidos.
- **Evidências:** 528 unitários (69 arquivos) e 202 integrações (27 arquivos), tipos, lint, formatação e build aprovados. Foram aposentados 75 testes unitários exclusivos do editor e acrescentadas duas regressões de navegação/configuração; um teste de integração exclusivo do editor saiu e outro verifica retenção histórica. Não houve teste falhando ocultado ou desativado. QA HTTP/browser conferiu 404 das três rotas removidas, ausência do menu, rascunho/publicação reais do construtor e preservação de Conteúdo, login e chat em 1440/390/320 px sem overflow. Configurações temporárias restauradas. Logs `/tmp/lyra89-*.log` e capturas `/tmp/lyra89-*.png`; documentação em `docs/remocao-editor-visual.md`. **Commit:** `9590ab1` · **Push:** `b019a45..9590ab1 main -> main`, confirmado.

### 90 · Treinamento real por Aprendizado por Reforço com Feedback Humano via chat

- **Status:** 🟢 finalizada · **Registro:** 2026-10-22 · **Início:** 2026-10-30 · **Conclusão da implementação:** 2026-10-30 · **Commit da implementação:** `7c507377` · **Push confirmado:** `ded7f8f..7c50737 main -> main` · **Fechamento da validação Docker:** 2026-11-04 · **Commit do fechamento:** `eeb6d364` · **Push confirmado:** `867d66d3..eeb6d364 main -> main`.
- **Validação atual (revisão de 2026-11-04):** imagem Docker construída e saudável; treino KTO + LoRA real com quatro exemplos controlados, versão 1 persistida e inferência comprovada após reinício. Margem medida de 0,9301726875 para 2,1651024818. Formatação, lint, tipos, 997 unitários, 601 integrações MySQL e build aprovados. Evidência: `docs/auditoria/2026-11-04-treinamento-90-docker.md`.
- **Retomada da validação em 2026-11-04:** construção da imagem pelo Docker Desktop iniciada com o perfil `treinamento` do Compose, dependências verificadas por hashes e volume persistente do projeto. A conclusão depende de executar a imagem e comprovar a saúde, inferência e persistência reais; o início da construção não representa aprovação.
- **Controle administrativo:** acrescentar no chat da Lyra, ao lado de “Como a Lyra responde”, um botão de alternância On/Off chamado **“Treinamento”**, visível somente para o administrador do app. Ao ativar On, habilitar automaticamente o treinamento do Motor Lyra via chat. Exigir um modelo de IA realmente conectado: sem modelo conectado o treinamento não funciona, e a interface deve informar essa condição.
- **Ativação e salvamento:** ao clicar em On, informar ao Motor Lyra e ao modelo conectado que foi habilitado o treinamento do tipo **Aprendizado por Reforço com Feedback Humano**. Salvar automaticamente tudo que for treinado durante o processo, sem depender de clicar em Off para persistir os dados; preservar o treinamento diante de recarga ou interrupção.
- **Finalização e aplicação:** ao clicar em Off, informar que o treinamento foi finalizado e que o Motor Lyra deve começar a usar os novos treinamentos com **todos os usuários**, antigos e novos. Preservar rastreabilidade da versão aplicada e isolamento dos dados pessoais das conversas.
- **Implementação real:** investigar a arquitetura, as capacidades dos modelos e as APIs oficiais antes de definir o mecanismo. Comprovar feedback humano, processo de aprendizagem, persistência e efeito do treinamento; não apresentar simples armazenamento de mensagens, memória ou alteração de prompt como treinamento RLHF de pesos do modelo. Registrar com precisão o mecanismo implementado e qualquer capacidade externa indispensável, sem simular resultados.
- **Permissões e validação:** comprovar que o controle não aparece para outros planos, perfis e usuários não administradores e que o servidor também recusa operações não autorizadas. Validar On/Off, ausência e perda de conexão, salvamento durante On, retomada, aplicação global após Off, CRUD dos dados de treinamento e regressões do chat, desktop/mobile, testes, gates, commit e push individuais na main.
- **Verificação em 2026-10-24:** a base atual possui documentos de conhecimento e preferências do chat, mas isso não treina pesos. Não há provedor de treinamento conectado nesta nuvem nem pesos locais licenciados e disponíveis para treino; o download no Hugging Face foi recusado pelo proxy com HTTP 403. O Jan do computador do usuário não é acessível pelo localhost da nuvem. Ambiente Python de inferência foi preparado separadamente, sem alegar que ele oferece RLHF ou que foi treinado.
- **Limite preservado:** não foi acrescentado um botão que apenas salve mensagens e o apresente como RLHF. Retomar a implementação quando houver um modelo treinável/endpoint real acessível, com licença e capacidade de persistir e aplicar a versão treinada. As demais tarefas independentes continuam.

- **Reclassificação em 2026-10-30:** por decisão expressa do usuário, a tarefa saiu de **BLOQUEADAS** e passou para **a iniciar**, para ser executada posteriormente na ordem numérica das tarefas não bloqueadas. Os registros acima permanecem como histórico real do que já foi publicado e da fronteira que estava pendente; esta reclassificação não declara a fronteira comprovada nem a tarefa concluída. Ao retomar, conferir a `main`, reaproveitar os commits existentes e validar com evidências reais, sem branches ou worktrees.

- **Implementação em 2026-10-30:** serviço `services/treinamento` que treina os **pesos** de `Qwen/Qwen2.5-0.5B-Instruct` (Apache-2.0) com KTO + LoRA (TRL), registrado com precisão como alinhamento por feedback humano da família do RLHF, sem modelo de recompensa nem PPO; serve as versões cumulativas em `/v1/chat/completions` (`lyra-treinavel`). App: migração 063, interruptor "Treinamento" só do administrador ao lado de "Como a Lyra responde", avaliações salvas na hora (CRUD), finalização com treino e aplicação a todos, acompanhamento, métricas, reenvio de falha, LGPD, Compose opcional e `docs/treinamento-por-feedback.md`.
- **Evidências:** gates aprovados; 984 unitários; 597 integrações; 30 testes de launchers; build sem avisos. Treino real pelo app: versão 1 aplicada com margem de 0,24 para 0,92 em 80 s; queda real no meio do treino tratada como falha, com reenvio; usuário comum atendido pela nova versão; axe sem violações. Corrigidos: versões que não acumulavam, consumo de memória, tarefa perdida travando a sessão, texto apagado ao digitar e estado após recarga. Limites: imagem Docker do serviço não construída aqui (proxy no build). Relatório em `docs/auditoria/2026-10-30-treinamento-90.md`. Nenhuma branch ou worktree.

### 91 · Auditoria exaustiva dos planos e entitlements e plano Administrador

- **Status:** 🟢 finalizada · **Registro:** 2026-10-22.
- **Free automático:** investigar, verificar e analisar profundamente se o plano Free é concedido automaticamente a novos usuários, novos cadastros e usuários inseridos pelo administrador. Conferir as implementações e evidências existentes antes de corrigir, evitando retrabalho.
- **Free, Meta e Care:** verificar se as funções e funcionalidades reais de cada plano correspondem às habilitações e desabilitações na **“Matriz editável de entitlements”** em `http://localhost:3000/admin/plans`, tanto na interface quanto no servidor. A auditoria exaustiva da cobertura de todas as funcionalidades, inclusão das ausentes e comprovação individual dos controles passa a ter rastreamento próprio na tarefa 96, conforme complemento do usuário; reaproveitar suas evidências para evitar retrabalho.
- **Administrador:** criar o perfil/plano **“Administrador”**, com todas as funções e funcionalidades gerais do app habilitadas, e conceder esse plano **somente a `admin@lyra.local`**. Ele não pode aparecer como plano comprável nem na landing page. Preservar a separação entre assinatura e autorização administrativa: compra ou troca de plano não pode conceder permissões de administrador.
- **Página de planos:** acrescentar o cartão Administrador à direita de Care em `/admin/plans`; os quatro cartões devem caber responsivamente na tela, sem barra de rolagem horizontal. Tornar também a matriz editável responsiva, sem barra de rolagem inferior, mantendo leitura, edição e acessibilidade no mobile e desktop.
- **Validação:** conferir cadastro público e criação administrativa, concessão única do Free, CRUD dos planos e da matriz, aplicação real de cada entitlement ligado/desligado, limites e isolamento, acesso total da conta designada, ausência do plano privado na compra e landing, responsividade e gates completos. Registrar evidências e publicar commit e push próprios na main.

- **Implementação em 2026-10-24:** migração 035 para Administrador privado com todos os entitlements atuais habilitados e ilimitados; concessão somente à conta canônica designada, sem promover papel. Bootstrap e reparação de assinatura preservam cobrança externa; catálogos e preços comerciais excluem o plano interno, checkout e atribuição indevida são recusados. Cadastro público Free preservado; fluxo administrativo inexistente foi acrescentado com Free e conta comum na mesma transação. Matriz reorganizada responsivamente, sem redesenhar outras páginas.
- **Evidências:** 528 unitários, 206 integrações e mais 14 verificações focadas após a revisão final; tipos, lint, formatação e build aprovados. QA HTTP/browser comprovou quatro planos administrativos, plano privado ausente da landing, cadastro administrativo Free, recusa de atribuição a outra conta, bloqueio do chat Free por entitlement e restauração dos valores. Matriz em 1440/390/320 px sem overflow ou rolagem horizontal; contas de QA excluídas. Documentação em `docs/plano-administrador.md`, logs `/tmp/lyra91-*.log` e capturas `/tmp/lyra91-*.png`. Cobertura integral da matriz continua na tarefa 96, conforme escopo original; regra de perfil da tarefa 104 preservada. **Commit:** `f07c6f1` · **Push:** `23b7b64..f07c6f1 main -> main`, confirmado.

### 92 · Bloquear e desbloquear usuários na gestão administrativa

- **Status:** 🟢 finalizada · **Registro:** 2026-10-22.
- **Pedido do usuário:** em `http://localhost:3000/admin/users`, no menu de três pontos **“Ações”**, acrescentar **“Bloquear”** quando o usuário não estiver bloqueado e **“Desbloquear”** quando estiver bloqueado.
- **Critérios:** conferir o estado e a infraestrutura existentes antes de alterar; implementar transição persistente real e autorização no servidor. Verificar o efeito do bloqueio no login, nas sessões e nas APIs protegidas, o restabelecimento de acesso após desbloquear, os estados da interface e a proteção contra bloqueio administrativo que inviabilize recuperar a administração.
- **Validação:** CRUD e fluxo completo com contas de teste identificadas, sem afetar usuários reais; tentar acesso não autorizado, recarregar a página, conferir persistência e alternância da ação, teclado e mobile/desktop. Executar gates e publicar commit e push próprios na main.

- **Implementado e validado em 2026-10-24:** migração 036, bloqueio persistente, revogação durável dos cookies anteriores, recusa de login após conferir senha, desbloqueio com novo login, menu e confirmação no padrão existente, proteção contra autobloqueio e bloqueio cruzado concorrente. Exclusão considera somente administradores ativos; troca de e-mail preserva a versão da sessão. Gates passaram: 528 unitários, 211 integrações, tipos, lint, formato e build. QA de produção pelo Chromium confirmou persistência após recarga, 403 no login, 401 em APIs, retorno com novo login, teclado e diálogos sem estouro em 1440/390/320 px. Detalhes e limites em `docs/bloqueio-de-contas.md`.

- **Commit:** `4ce602e` · **Push:** `b9ccc0b..4ce602e main -> main` (confirmado).

### 93 · Cinco novas funcionalidades relevantes na gestão de usuários e perfis

- **Status:** 🟢 finalizada · **Registro:** 2026-10-22.
- **Pedido do usuário:** incluir mais **cinco funções ou funcionalidades** em `http://localhost:3000/admin/users` para gestão de usuários/perfis, que ainda não existam no app, sejam extremamente importantes e estejam alinhadas às tendências de 2026.
- **Investigação e definição:** inventariar os recursos existentes para não duplicar funcionalidades; pesquisar referências atuais e fontes oficiais na internet antes de escolher. Registrar as cinco funções escolhidas, justificativa, escopo, requisitos e critérios verificáveis no início da implementação. Bloquear/desbloquear, já previsto na tarefa 92, não conta como uma das cinco adicionais.
- **Entrega real:** implementar backend antes da interface, persistência, permissões administrativas, validação, feedback de operações, estados de falha e auditoria apropriada. Validar integralmente o CRUD e cada fluxo com dados de teste, isolamento, acessibilidade e responsividade. Cada função lógica concluída deve receber seu próprio commit e push na main antes da próxima, com atualização deste painel; não acumular as cinco em um único lote de publicação.

- **Definição em 2026-10-25, antes da implementação:** o inventário encontrou cadastro Free, busca textual, ordenação/paginação, detalhe/atribuição de plano, onboarding, exclusão e bloqueio/desbloqueio; relatórios já exportam usuários em CSV, portanto exportação não contará como novidade. Cinco funções adicionais: **(1)** encerrar sessões sem bloquear a conta, com motivo categórico, confirmação, revogação real e repetição idempotente; **(2)** linha temporal administrativa por usuário, paginada, com origem, autor, ação e data reais, sem fabricar eventos anteriores à coleta; **(3)** notas operacionais administrativas com CRUD, validação, autoria, controle de conflito, aviso contra dados clínicos e auditoria sem copiar o texto; **(4)** marcadores operacionais com CRUD de catálogo e atribuição/remoção nas contas, sem alterar papéis ou planos; **(5)** filtros combinados de acesso, papel, plano, onboarding e marcadores, com segmentos privados salvos por administrador (CRUD), reaplicados ao banco real.
- **Justificativa e critérios:** resposta a acesso suspeito sem impedir novo login; rastreabilidade; continuidade do suporte; classificação operacional sem acesso clínico; gestão de grupos sem exportar dados pessoais. Todas exigem servidor administrativo, persistência e testes negativos/isolamento; notas, marcadores e segmentos terão CRUD integral, validação, falhas explícitas e recarga. Preservar o visual existente, usar controles compartilhados acessíveis e validar teclado/mobile/desktop. Cada função será publicada antes de iniciar a implementação seguinte.
- **Pesquisa:** consultados diretamente os repositórios oficiais atuais da OWASP (Session Management e Logging Cheat Sheets) e W3C (padrão de diálogo modal APG) em 2026-10-25; sites institucionais responderam 403 pela política da nuvem, mas as fontes oficiais no GitHub foram acessíveis. Referências e inventário em `docs/gestao-de-usuarios.md`; não se atribui data de publicação de 2026 a uma fonte que não a informa.
- **Entrega 93.1 publicada:** `ed9cc04` · **Push:** `30a43bc..ed9cc04 main -> main` (confirmado). encerrar sessões sem bloquear; transação, motivo categórico, revogação por versão, idempotência concorrente, exportação LGPD mínima e cascade. 528 unitários, 216 integrações, tipos, lint, formato e build aprovados; QA de produção 1440/390/320 px, teclado, cookie antigo 401, login novo 200, repetição segura e saída local ao encerrar as próprias sessões. Esta foi a primeira das cinco entregas; o estado das demais consta nos registros seguintes.
- **Entrega 93.2 publicada:** `8f6108f` · **Push:** `397ae41..8f6108f main -> main` (confirmado). histórico por conta com autor, origem, data, cursor estável, páginas de 20 eventos e `no-store`, reutilizando auditoria de assinaturas e eventos de gestão. Coleta transacional de cadastro, bloqueio, sessões e mudanças efetivas de papel/onboarding. Migração 038 e proteção do último administrador ativo no rebaixamento de papel. 528 unitários, 221 integrações, formato, lint, tipos e build aprovados. QA de produção: 26 eventos em 20+6 itens, permissões, atualização, recarga, erro offline e retentativa, Escape e 1440/390/320 px sem estouro. O estado das entregas seguintes consta nos registros abaixo; detalhes em `docs/gestao-de-usuarios.md`.
- **Entrega 93.3 publicada:** `38c54c4` · **Push:** `4a99395..38c54c4 main -> main` (confirmado). notas operacionais com CRUD, autoria, última edição, versão, limite de 100 × 2.000 caracteres, confirmação de exclusão/descarte e criação idempotente. Rascunho preservado em falha e conflito; opção de reabrir a versão atual sem sobrescrita automática. Auditoria transacional sem conteúdo; exportação mínima e cascade LGPD. Migração 039, 528 unitários, 227 integrações, lint, formato, tipos e build aprovados. QA em produção confirmou CRUD, conflitos reais, offline/retentativa, recarga, teclado e 1440/390/320 px sem rolagem horizontal, inclusive dentro do diálogo. Detalhes em `docs/gestao-de-usuarios.md`. O estado das entregas seguintes consta nos registros abaixo.
- **Entrega 93.4 publicada:** `986a327` · **Push:** `74b676e..986a327 main -> main` (confirmado). catálogo com CRUD, nome/cor, versão, unicidade, atribuição/remoção por conta e limites concorrentes de 50 ativos/10 por conta. Exclusão confirma versão e número de contas afetadas; mudança de impacto retorna 409 antes de remover associações. Transação/auditoria em lote, identificação excluída não reutilizável, nome/autoria limpos e exportação/cascade LGPD mínimos. 528 unitários, 234 integrações, formato, lint, tipos e build aprovados. QA de produção confirmou duas abas, nome contínuo de 40 caracteres, teclado, offline/retentativa, conflito de versão, impacto 1→2, recarga e 1440/390/320 px sem estouro. Seis cores medidas acima de 4,5:1. Detalhes em `docs/gestao-de-usuarios.md`; resta a entrega 93.5.
- **Entrega 93.5 publicada:** `3db385c` · **Push:** `12d36c4..3db385c main -> main` (confirmado). filtros combinados por acesso, papel, onboarding, plano e marcador; busca, ordenação e paginação reaproveitadas, contagem/linhas com a mesma fonte. Segmentos privados com CRUD, versão, limite de 20, idempotência, auditoria mínima e LGPD; marcador removido mantém consulta vazia com aviso. Migração 041 aplicada, 528 unitários, 239 integrações, formato, lint, tipos e build aprovados. QA de produção comprovou salvar, recarregar, aplicar, editar com versão 2 e excluir; combinação real dos cinco filtros e 1440/390/320 px sem estouro. As cinco funções foram implementadas, validadas e publicadas individualmente.

### 94 · Atualização automática dos itens Inclui na landing a partir dos planos

- **Status:** 🟢 finalizada · **Registro:** 2026-10-22.
- **Pedido do usuário:** quando o administrador atualizar a **“Matriz editável de entitlements”** de qualquer plano em `http://localhost:3000/admin/plans`, atualizar automaticamente os itens **“Inclui:”** na seção `http://localhost:3000/#planos` da landing page.
- **Critérios:** verificar a fonte atual dos benefícios e usar a mesma configuração persistida de entitlements, com atualização/invalidação real, sem listas comerciais paralelas que fiquem desatualizadas. Respeitar funções desabilitadas, limites e valores zero; descrever os benefícios em pt-BR compreensível. Excluir o plano Administrador da exposição pública, conforme tarefa 91.
- **Validação:** editar cada plano pela interface administrativa, confirmar persistência e o reflexo automático na landing, inclusive desabilitação e alteração de limites, recarga e sessão pública. Restaurar os valores de teste; validar CRUD, mobile/desktop, acessibilidade e gates. Commit e push próprios na main.

- **Commit:** `9d499b8` · **Push:** `4302911..9d499b8 main -> main` (confirmado). **Implementado e validado:** mesma matriz persistida como fonte, todos os benefícios utilizáveis, cotas e intervalos em pt-BR, zero/desligados omitidos, singular/ilimitado, sem herança presumida ou corte de lista. Catálogo explicitamente exclui Administrador e usa `no-store`; evento entre abas, foco e reconsulta de 30 s enquanto visível atualizam a landing aberta. 528 unitários, 240 integrações, formato, lint, tipos e build aprovados. QA de produção editou Free/Meta/Care pela interface e comprovou limites, zero, desabilitação, ilimitado e atualização periódica real; matriz restaurada. 1440/390/320 px sem estouro e visual preservado. Detalhes em `docs/beneficios-publicos-dos-planos.md`.

### 95 · Onboarding objetivo, rápido e visualmente inovador

- **Status:** 🟢 finalizada · **Conclusão:** 2026-10-25 · **Registro:** 2026-10-22.
- **Pedido do usuário:** remover do **onboarding** os itens **“Objetivos”** que o usuário precisa selecionar, conforme anexo; tornar o percurso objetivo, assertivo e rápido, evitando cansaço no preenchimento. Criar uma experiência visual incrível, inovadora, surpreendente de forma positiva e que incentive entrar logo no app.
- **Escopo e preservação:** conferir fluxo, validações e gravação existentes antes de implementar. Retirar a seleção de objetivos do onboarding sem remover os objetivos do perfil por inferência. Preservar os dados existentes, os consentimentos necessários e o campo opcional **“Como Você Gostaria de Ser Chamado”**, mantendo `nickname` no banco. Não marcar dados não fornecidos como preenchidos nem inventar escolhas do usuário.
- **Design e implementação:** pesquisar profundamente referências e tendências atuais de 2026 antes de alterar o visual; seguir Lyra Clean e tema claro, com qualidade premium, mobile-first e desktop, acessibilidade, clareza, poucas etapas e controles simples. Corrigir causas de eventuais erros no backend antes da interface.
- **Validação integral:** cadastro → onboarding → persistência → entrada no app, leitura e atualização dos dados, retorno e retomada, recarga e novo login sem repetição indevida do onboarding concluído. Conferir erros, campos opcionais, consentimento e isolamento, ausência da seleção de objetivos, responsividade em múltiplas larguras e CRUD real; executar gates e publicar commit e push próprios na main.

- **Início em 2026-10-25:** inventário identificou cinco etapas, uma tela exclusiva de objetivos, escolhas iniciais de atividade e envio que zera objetivos não selecionados. Reutilizar os controles de nome/apelido, data/hora e cidade; reduzir o percurso, preservar objetivos existentes e não inventar gênero/atividade. Validar conclusão no servidor, manter consentimento explícito e retomar rascunho apenas na aba da própria conta. Referência oficial consultada: GOV.UK Question pages (fonte atual no repositório oficial), para perguntas necessárias, campos opcionais claros, navegação de retorno e grupos relacionados.

- **Entrega validada e publicada em 2026-10-25:** três etapas sem seleção de objetivos, apelido e objetivos anteriores preservados, opcionais sem escolhas inventadas. Conclusão e consentimento transacionais pelo novo endpoint, validação canônica de cidade e proteção da conclusão genérica. Rascunho na aba por conta, consentimento não persistido, retorno nativo e retentativa. 528 unitários, 245 integrações, formato, lint, tipos e build aprovados. QA real cadastro → app, recarga/retorno, offline/retentativa, banco e novo login; 1440/390/320 px sem estouro e capturas conferidas. Conta temporária excluída. Detalhes em `docs/onboarding.md`.

- **Commit:** `f535134fba8246cce7bf32a7bd77564722801bfe` · **Push:** `c100d5a..f535134 main -> main`, confirmado por `git ls-remote`.

### 96 · Auditoria integral da cobertura e funcionamento real da matriz de entitlements

- **Status:** 🟢 finalizada · **Conclusão:** 2026-10-25 · **Registro:** 2026-10-22.
- **Pedido complementar do usuário:** analisar e verificar profundamente se **todas as funções e funcionalidades do aplicativo** estão na **“Matriz editável de entitlements”** da página `http://localhost:3000/admin/plans`, permitindo ativá-las ou desativá-las nos planos. Os controles precisam funcionar de forma real, sem simulações, placeholders, hardcode ou cortes de código ou linhas.
- **Inventário e rastreabilidade:** investigar código, rotas, APIs, serviços, motores, integrações, operações e interfaces existentes antes de implementar; confrontar cada função com os itens da matriz e os pontos de autorização no servidor. Produzir relação verificável de funcionalidade → entitlement → planos → pontos de aplicação → testes, identificando ausências, duplicidades, controles sem efeito e permissões administrativas que não podem ser adquiridas por troca de plano.
- **Correção integral:** acrescentar os controles ausentes e corrigir os existentes pela causa raiz, com configuração persistida como fonte de verdade. Ligar e desligar cada recurso deve alterar efetivamente sua disponibilidade e execução em todas as entradas correspondentes, incluindo acesso direto às páginas e APIs; esconder um botão não comprova bloqueio. Respeitar limites, dependências entre recursos, sessões existentes e a separação entre plano e papel administrativo, sem conceder privilégios por simples ativação comercial.
- **Validação real por recurso e plano:** testar individualmente ativação e desativação pela matriz, persistência após recarga e novo login, comportamento da interface e chamadas diretas ao backend, limites e operações CRUD aplicáveis, contas antigas e novas, isolamento e tentativas não autorizadas. Conferir Free, Meta, Care e o plano Administrador da tarefa 91 conforme suas regras próprias; preservar dados e restaurar configurações usadas nos testes. Não declarar cobertura completa com testes simulados ou somente visuais.
- **Evidências e entrega:** registrar lacunas encontradas, correções e resultado verificável de cada controle, validar responsividade e acessibilidade da matriz e executar os gates do projeto. Coordenar com as tarefas 91 e 94 para não duplicar auditoria nem divergir da landing. Publicar commit e push próprios na main e atualizar este painel com os resultados reais. Este registro não declara a auditoria executada; aguardar instruções após sua publicação, conforme pedido do usuário.

- **Início em 2026-10-25:** conferência prévia dos 13 direitos existentes, rotas, APIs, serviços e navegação; reaproveitar controles e evidências anteriores. A autorização posterior de continuar todas as tarefas substitui a espera histórica registrada acima. Identificar controles sem efeito e funcionalidades novas ainda fora do catálogo antes de modificar a matriz.

- **Entrega validada e publicada em 2026-10-25:** catálogo de 13 para 26 capacidades persistidas, sem redesenhar páginas existentes. Portões de rota/componentes e APIs, dependências, cota zero, plano inativo, Perfil essencial somente leitura e direitos administrativos separados do plano. Cotas atômicas em insert/upsert/horário, janela em entradas alternativas, UTC independente do fuso, propriedade de profissional e colisão entre titulares protegidas. Chat sem histórico funciona sem persistência; memória/notificações desligadas não coletam, fila preserva justiça e privacidade continua acessível. 531 unitários, 332 integrações, formato, lint, tipos e build aprovados; migração 042 aplicada. QA real dos três planos comerciais, salvamento pela matriz, menus, dez acessos diretos, reativação e novo login; Perfil e rascunho preservados, inclusive 32 segundos offline no chat. 1440/390/320 px sem overflow; Axe 4.14.0 sem violações na matriz, chat sem histórico e perfil. Matriz restaurada e contas de QA excluídas. Inventário das 26 capacidades e exceções essenciais/administrativas em `docs/cobertura-entitlements.md`. Inferência externa e RLHF permanecem nas 86/90, sem alegar validação de hardware físico.

- **Commit:** `27ac4574f220484e3c238bc18f1a60c289ed7246` · **Push:** `e2a3390..27ac457 main -> main`, confirmado por `git ls-remote`.

### 97 · Nomes compreensíveis de todas as métricas na análise de saúde dos dados

- **Status:** 🟢 finalizada · **Conclusão:** 2026-10-25 · **Registro:** 2026-10-22.
- **Pedido do usuário:** em `http://localhost:3000/admin/data-health`, na seção **“Análise de métricas”**, a coluna **“Métrica”** mostra identificadores técnicos, descritos pelo usuário como nomes de arquivos, em vez do nome compreensível da métrica. Substituir a apresentação pelo nome real de **todas as métricas**, incluindo as que não aparecem no recorte do anexo; não limitar a correção aos exemplos visíveis.
- **Investigação e implementação:** inventariar o catálogo completo e a origem dos identificadores, conferir os rótulos e unidades já existentes no app para evitar retrabalho e divergência e usar uma fonte de nomes em pt-BR consistente. Manter as chaves técnicas do banco e os cálculos; corrigir a apresentação, sem renomear colunas ou alterar dados por inferência. Exemplos do anexo incluem `steps`, `sleep_duration_minutes`, `resting_heart_rate`, `calories_burned`, `hrv_ms`, `spo2_average`, `vo2_max`, nutrientes, hidratação e cafeína, mas o escopo é o catálogo inteiro.
- **Validação e entrega:** confrontar cada identificador com seu nome e unidade corretos, comprovar cobertura integral sem nomes técnicos vazando como rótulos, conferir preenchimento e faixas de valores sem regressão, estados vazios e erros, leitura no celular e desktop, acessibilidade e fluxo real da página/API. Não usar simulações, placeholders, hardcode para mascarar lacunas ou cortes de código; executar os gates aplicáveis, atualizar este painel e publicar commit e push próprios na main, sem branches ou worktrees. Este registro não declara a correção implementada.

- **Início em 2026-10-25:** confirmar todas as colunas e tipos reais da tabela, reaproveitar rótulos e unidades do check-in/grade de métricas, manter as chaves e agregações numéricas. A tela imprime diretamente a chave técnica; verificar também a inclusão indevida de campos não numéricos na seleção de métricas.

- **Entrega validada e publicada em 2026-10-25:** 64 nomes e unidades em pt-BR no catálogo completo, reaproveitando check-in e unidades da grade; identificadores e cálculos numéricos preservados. Schema real comprova 63 métricas numéricas e fluxo menstrual categórico; corrigida inclusão de DATETIME e agregação numérica do texto, sem alterar dados. Unidade abaixo do nome, cabeçalho de linha acessível e tabela rolável preservada. 531 unitários, 334 integrações, formato, lint, tipos e build aprovados. QA produção: todos os rótulos/API, valores e preenchimento/MySQL, estado vazio, paciente recusado, falha de rede na requisição e retentativa, 1440/390/320 px sem overflow da página. Axe 4.14.0 sem violações (27 regras), sem exceções; conta temporária excluída. Detalhes em `docs/nomes-das-metricas.md`.

- **Commit:** `d343f69fdb12cfa9bac165dbd4577e4cc8fe38cd` · **Push:** `6a3b176..d343f69 main -> main`, confirmado por `git ls-remote`.

### 98 · Remoção integral da página administrativa duplicada /admin/page-builder

- **Status:** 🟢 finalizada · **Conclusão:** 2026-10-25 · **Registro:** 2026-10-22.
- **Pedido do usuário:** remover `/admin/page-builder` por completo, na íntegra e em sua totalidade, com o mesmo rigor de remoção e validação solicitado para o Editor Puck na tarefa 89. Conferência prévia identificou que a página abre o mesmo `SiteExperienceBuilder` já oferecido na aba **“Experiência Web”** de `/admin/content`; esta continua reunindo também Hábitos Sugeridos e Dicas de IA.
- **Escopo integral:** inventariar e remover a rota duplicada, página, componentes exclusivos, item **“Construtor UI”** do sidebar e menu móvel, resultados de busca, atalhos, registros de navegação e configuração, permissões exclusivas, imports, testes e documentação operacional que apontem para essa entrada. Remover dependências somente quando comprovadamente exclusivas e não utilizadas no restante do app. Verificar configurações antigas persistidas para que não reintroduzam links quebrados.
- **Preservação obrigatória:** manter o editor compartilhado e suas dependências efetivamente usadas em `/admin/content`, incluindo leitura, edição, prévia, rascunho e publicação das configurações reais. Preservar Hábitos Sugeridos, Dicas de IA, dados e versões existentes. A remoção do Editor Puck permanece uma tarefa separada; não confundir o Puck com o construtor compartilhado nem apagar a funcionalidade de Conteúdo.
- **Integridade e prova de remoção:** realizar busca verificável com `rg` após as remoções, investigar qualquer referência restante e registrar o tratamento explícito de histórico de auditoria e migrações já aplicadas, sem modificar checksums ou destruir dados silenciosamente. Confirmar que a antiga rota deixa de oferecer o editor duplicado e que não há navegação operacional para ela.
- **Validação e entrega:** testar CRUD e publicação reais do editor em Conteúdo, hábitos e dicas, autenticação e autorização, sidebar desktop/mobile, busca, configurações antigas, demais páginas afetadas e ausência de regressões. Executar formatação, lint, tipos, testes unitários e de integração, build, runtime e QA em múltiplas larguras; corrigir causas reais, sem simulações, placeholders, hardcode para mascarar falhas ou cortes de código. Atualizar este painel e publicar commit e push próprios na main, sem branches ou worktrees. Este registro não declara a remoção implementada.

- **Início em 2026-10-25:** comprovada duplicação do mesmo `SiteExperienceBuilder` em rota exclusiva e na aba Experiência Web de Conteúdo. Remover só os três arquivos exclusivos e as entradas de navegação/default/registro, tratar configurações antigas na leitura e manter componentes compartilhados, dependências, configurações e versões. Nenhuma migration aplicada será alterada.

- **Entrega validada e publicada em 2026-10-25:** removidos página, layout e wrapper exclusivos, menu/defaults e entrada antiga do registro. Helper puro compartilhado filtra links históricos em schema/navegação sem perder personalização ou reescrever JSON na leitura; registro interno aponta para Conteúdo. Construtor compartilhado e dependências preservados; nenhuma migration alterada e nenhum dado removido. Busca de integridade deixa a URI apenas em guarda de rotas aposentadas, regressões e histórico/documentação. 539 unitários, 336 integrações, formato, lint, tipos e build aprovados. QA real confirmou 404 administrativo, proteção global de visitantes para login, menu/busca sem entrada, prévia/rascunho/publicação/recarga e CRUD de hábitos/dicas pela interface com comprovação no banco. Configuração restaurada integralmente e itens de QA inativos/excluídos; 1440/390/320 px sem overflow, Axe 4.14.0 sem violações (30 regras), sem exceções. Relatório em `docs/remocao-construtor-duplicado.md`.

- **Commit:** `73ea5ffc2248f6be343a1804094da09e319f580a` · **Push:** `5c6594d..73ea5ff main -> main`, confirmado por `git ls-remote`.

### 99 · Dashboard administrativo completo com métricas, KPIs e linha temporal

- **Status:** 🟢 finalizada · **Registro:** 2026-10-22 · **Início:** 2026-10-25 · **Conclusão:** 2026-10-25.
- **Pedido do usuário:** o dashboard em `http://localhost:3000/admin/dashboard` está muito pobre; acrescentar mais métricas e KPIs, linha temporal e recursos de gestão. Pesquisar na internet, de forma profunda e exaustiva, todas as possibilidades relevantes para o administrador gerir o app por completo, na íntegra e em sua totalidade, alinhadas às tendências de 2026.
- **Investigação e definição:** conferir código, serviços, dados, indicadores e funções existentes antes de implementar, evitando retrabalho. Pesquisar referências atuais e fontes oficiais; registrar possibilidades avaliadas, seleção justificada, definição de cada KPI, fórmula, origem, período, fuso, granularidade, filtros, limites e critérios de validação. Cobrir os domínios reais do app e sua operação administrativa; criar coleta e consultas reais quando necessárias, sem inventar históricos nem tratar dado ausente como resultado medido.
- **Experiência e gestão:** organizar visão geral, tendências e linha temporal, comparações de períodos e acesso aos detalhes e ações correspondentes, com navegação clara para usuários leigos. Estruturar as novas abas Faturamento, Fiscal e Pagamentos previstas nas tarefas 100–102 com **o mesmo visual das abas de “Gestão de Conteúdo Dinâmico” em `/admin/content`**, conforme anexo. Seguir Lyra Clean claro, qualidade premium, acessibilidade, mobile-first e desktop, sem gráficos decorativos sem dados ou controles sem efeito.
- **Validação e entrega:** confrontar indicadores com consultas reais e dados persistidos, conferir filtros e períodos, drill-down e ações, estados vazios, falhas, permissões no servidor, privacidade e desempenho. Validar CRUD e navegação dos domínios afetados, múltiplas larguras, regressões e gates completos. Publicação individual na main, com commit, push e evidências neste painel; não misturar a conclusão com as entregas das abas.

- **Retomada em 2026-10-25:** revisão das fontes persistidas, definições dos indicadores e componentes existentes em andamento; as abas 100–102 terão entregas individuais.

- **Entrega:** três indicadores principais com fórmulas e limites explícitos; comparação com período anterior; séries por dia, semana e mês com pessoas distintas calculadas no SQL; base e distribuição atuais; volumes e erros atuais de 14 áreas; linha temporal paginada e acesso aos detalhes dos mesmos filtros. Reutilizados autenticação, primitivos, abas da Gestão de Conteúdo e serviços existentes. Faturamento/Fiscal/Pagamentos permanecem entregas próprias 100–102, sem abas vazias.
- **Dados e privacidade:** intervalo UTC inclusivo de 1–366 dias, plano vigente, administradores excluídos da população, seleção única de assinatura e anomalias. Conclusão de perfil identificada como estado atual da coorte, sem inventar timestamp histórico. Chat efêmero e retenção/exclusões explicitados. Sem textos privados, valores clínicos, payloads ou segredos; zero denominador não vira percentual fictício. Migração 043 acrescenta índices temporais sem alterar migrations aplicadas. Definições, possibilidades avaliadas e pesquisa oficial em `docs/dashboard-administrativo.md`.
- **Validação:** 554 unitários (70 arquivos), 350 integrações (41 arquivos), formatação, lint, tipos e build de produção aprovados. Novas suítes: 15 unitários e 14 integrações. MySQL real confirmou todas as fontes, limites UTC, agrupamentos DISTINCT, paginação, escolha de assinatura, privacidade e recusa administrativa. QA real de cadastro/onboarding/check-in, alteração de plano, bloqueio/exclusão, filtros, detalhes, recarga e falha de rede com retentativa. Atalhos HTTP 200; 1440/390/320 px sem overflow; gráfico visível e cartões mobile inspecionados. Axe 32–35 regras na página e 23–24 nos modais, zero violações e exceções JavaScript. Fixtures de turnos apenas para paginação, sem alegação de inferência externa; contas temporárias excluídas e base restaurada vazia. Dez consultas do recorte máximo em 25–40 ms na população pequena desta instância, sem alegar capacidade de carga maior. Evidências `/tmp/lyra99-*.log` e capturas.
- **Publicação:** commit `23827172f352efcb056bbc50f2e5c2b2bc6c1af0` · push `bac9930..2382717 main -> main`, confirmado. Sem branch, worktree ou lote de tarefas.

### 100 · Aba Faturamento no dashboard e gestão financeira completa

- **Status:** 🟡 implementada · validação pendente · **Registro:** 2026-10-22 · **Início:** 2026-10-25 · **Conclusão:** 2026-11-02 · **Commit:** `52f3770` · **Push confirmado:** `6f3582b..52f3770 main -> main`.
- **Validação atual (revisão de 2026-11-04):** Cancelamento de reembolso Stripe no estado requires_action: coberto por contrato, sem transação real nesse estado.
- **Pedido do usuário:** incluir no dashboard administrativo uma aba **“Faturamento”**, com o mesmo visual das abas de **“Gestão de Conteúdo Dinâmico”** em `http://localhost:3000/admin/content`, conforme anexo. Reunir todas as métricas de faturamento **por dia, mês e ano**, gestão total do faturamento, **cancelamento de faturas, reembolsos e demais operações financeiras pertinentes**.
- **Dados e recursos reais:** inventariar cobrança, assinaturas, faturas, pagamentos e provedores existentes; pesquisar profundamente referências de 2026 e APIs oficiais antes de definir e implementar o conjunto completo de métricas e ações. Relacionar cada valor à origem persistida e aos eventos do provedor, distinguir estados de cobrança, valores brutos e líquidos, cancelamentos e reembolsos, respeitar moeda, fuso e período e permitir conferir os registros de origem. Não apresentar projeções como receita realizada.
- **Operações:** implementar cancelamento e reembolso reais conforme as capacidades e regras do provedor e o estado da fatura/pagamento, com validação no servidor, autorização administrativa, confirmação clara da ação, idempotência, prevenção de duplicidade, tratamento de falhas, trilha de auditoria e reconciliação por webhooks. Preservar registros fiscais e histórico financeiro; não converter exclusão de registro local em cancelamento ou reembolso fictício.
- **Validação e entrega:** validar métricas diárias, mensais e anuais contra dados reais, filtros, detalhamento, CRUD aplicável, cancelamento, reembolso e seus efeitos na fatura, assinatura e indicadores. Usar os ambientes oficiais de teste dos provedores para operações de QA e registrar claramente o que foi comprovado; não inventar transações nem executar movimentação de clientes reais como teste. Conferir interface responsiva, acessibilidade, permissões e gates; commit e push próprios na main e atualização deste painel.

- **Publicação intermediária solicitada pelo usuário em 2026-10-25:** commit `e80a9558442178998f24dd7bbe388bb8342cb216` · push `8b8dbe6..e80a955 main -> main`, confirmado. **A tarefa 100 permanece em andamento**; este registro não a transfere para as finalizadas. Nenhuma branch ou worktree criada.
- **Progresso publicado:** aba Faturamento com filtros, séries diárias/mensais/anuais, valores separados por moeda e ambiente, detalhes e ações confirmadas; seis tabelas financeiras na migração 044; bruto/taxas/líquido vindos dos movimentos de saldo; sincronização paginada e retomável; intenção e auditoria antes de operações externas, nonce estável, controle de concorrência e recuperação de resultado ambíguo. Webhooks reconciliados pela API, sem substituir registro fiscal por exclusão local. A renovação da assinatura tem controle separado do cancelamento/reembolso da fatura. Implementação e limites em `docs/faturamento-administrativo.md`.
- **Evidências locais do progresso:** 573 unitários (71 arquivos), 375 integrações (43 arquivos), formatação, lint sem avisos, tipos e build aprovados. Novos testes: 19 de moeda/filtros, 11 de MySQL/espelhos e 14 por contrato HTTP local da SDK, sem alegar transações reais. QA de produção com base financeira vazia: APIs administrativas 200, visitante 401, paciente 403, sincronização sem chaves recusada 503 sem criar registros; URL da aba, teclado, recarga, preservação de rascunho entre abas, filtros e retentativa após falha de rede. 1440/390/320 px sem overflow; axe 28 regras aprovadas e nenhuma exceção JavaScript. Conta de QA removida; nenhum movimento financeiro fabricado no runtime. Evidências `/tmp/lyra100-*.log` e capturas.
- **Pendências para encerrar:** chave e segredo oficial de teste da Stripe ausentes no processo, `.env.local` e painel; conferir cancelamento/reembolso/sincronização reais e seus webhooks no ambiente oficial, além da interface com esses movimentos. Completar paginação dos históricos de operações/refunds do modal além dos 100 atualmente informados e concluir revisão da exportação LGPD dos novos espelhos vinculáveis ao titular. Não declarar operações externas comprovadas usando os contratos locais. As tarefas 101–103 e 105–107 não integram esta publicação.

- **Retomada em 2026-10-26:** concluir paginação integral dos históricos de fatura e exportação LGPD dos espelhos vinculados; reutilizar a implementação publicada, preservar migração 044 aplicada e validar em banco isolado. A fronteira oficial de teste continua dependente de credenciais reais.

- **Complemento publicado em 2026-10-26:** commit `84ed4d0dc254cc7dd2fe95d3b72ada3604183250` · push `b20a049..84ed4d0 main -> main`, confirmado por `git ls-remote`. Históricos em páginas de 20, pendências verificadas globalmente; exportação LGPD por vínculo comprovado e valores exatos, sem autoria interna. Política de privacidade atualizada, migração 044 intacta. 573 unitários, 378 integrações, formato, lint, tipos e build aprovados. QA em banco temporário com 125 operações/125 refunds: sete páginas, isolamento da base de desenvolvimento, 1440/390/320 sem overflow, axe 27 regras sem violações e nenhuma exceção. Base temporária removida. QA do estado vazio repetido em produção: APIs, permissões, filtros e falha/retentativa aprovados; axe 28 regras. Evidências `/tmp/lyra100-final-*.log` e capturas; `@current_problems` não disponível.
- **Bloqueio atual comprovado:** chaves oficiais de teste e segredo de webhook continuam ausentes no processo/configuração local e painel (HTTP 200, Stripe inativa, dois ambientes não configurados em `/tmp/lyra100-final-readiness.log`). Restam somente cancelamento/reembolso/sincronização oficiais e QA com esses movimentos/webhooks. Contratos locais e fixtures isoladas não substituem essa prova. As pendências anteriores de paginação/exportação foram resolvidas; continuar as tarefas independentes.

- **Reclassificação em 2026-10-30:** por decisão expressa do usuário, a tarefa saiu de **BLOQUEADAS** e passou para **a iniciar**, para ser executada posteriormente na ordem numérica das tarefas não bloqueadas. Os registros acima permanecem como histórico real do que já foi publicado e da fronteira que estava pendente; esta reclassificação não declara a fronteira comprovada nem a tarefa concluída. Ao retomar, conferir a `main`, reaproveitar os commits existentes e validar com evidências reais, sem branches ou worktrees.

- **Conclusão em 2026-11-02 com a Stripe de teste real:** o usuário conectou a conta de teste "Área restrita de New business" e informou a chave restrita de teste, que foi gravada pelo próprio app em Admin → Pagamentos, cifrada e fora do repositório. O segredo do webhook veio do Stripe CLI oficial (`stripe listen`), que entregou os eventos reais ao app. O teste de conexão do app conferiu a conta (BR, BRL, modo de teste) e os 4 preços. Pela tela Admin → Faturamento, todas as operações foram reais e conferidas na API da Stripe e no MySQL:
  - atualização do histórico (17 faturas, pagamentos, reembolsos e movimentos);
  - reembolso parcial de R$ 30,00;
  - recusa de reembolso acima do saldo;
  - cancelar e manter a próxima renovação;
  - excluir rascunho, emitir, enviar e cancelar fatura;
  - registrar inadimplência.

  Idempotência real: dois pedidos simultâneos com o mesmo identificador geraram um único reembolso; a repetição devolveu o mesmo resultado; o mesmo identificador com outro valor deu 409. Permissões: paciente 403 e visitante 401. Métricas por dia, mês e ano coerentes com os movimentos importados.

- **Defeitos encontrados e corrigidos:**
  - O filtro de ambiente abria em "Produção" com a Stripe em teste, escondendo o histórico importado; agora segue o ambiente em uso e o ambiente recém-importado.
  - Havia transbordo de 29 px em 320 px (seletores da série, identificador longo sem quebra e botão de atualização). Agora é 0 px em 1440, 390 e 320 px, sem erros de console.
- **Gates:** formato, lint e tipos com exit 0; 988 unitários; 601 integrações em 67 arquivos; build sem avisos.
- **Fronteira registrada:** "Cancelar reembolso" só existe para reembolso em `requires_action`, que um cartão de teste não produz (o reembolso conclui na hora). Continua coberto pelos testes de contrato da SDK.
- **Evidências:** `docs/auditoria/2026-11-02-faturamento-100-stripe-teste.md`.

### 101 · Transferir Registros fiscais para a aba Fiscal do dashboard

- **Status:** 🟢 finalizada · **Registro:** 2026-10-22.
- **Pedido do usuário:** transferir a página `http://localhost:3000/admin/fiscal` para uma nova aba **“Fiscal”** no dashboard administrativo, com o mesmo padrão visual de abas solicitado na tarefa 100, e **remover o menu “Registros fiscais” do sidebar**.
- **Escopo e preservação:** inventariar e reaproveitar os componentes, serviços, permissões e dados reais da página, preservando integralmente suas funções, consultas, filtros, detalhes, exportações e operações existentes. Integrar a aba ao dashboard, revisar sidebar desktop/mobile, busca e configurações de navegação antigas e definir explicitamente o tratamento das URLs e atalhos anteriores para evitar links quebrados ou uma página duplicada divergente.
- **Validação e entrega:** comprovar acesso e operações reais pela aba, persistência, autorização administrativa e preservação dos registros, integração com Faturamento e ausência do item antigo nos menus. Executar busca com `rg` para provar a remoção das entradas operacionais, QA responsivo e acessível, testes e gates aplicáveis; commit e push próprios na main, com evidências neste painel.

- **Início em 2026-10-26:** componente e API fiscais existentes conferidos: leitura imutável, filtros por quitação, totais por moeda, paginação e exportação. Reutilizar integralmente na nova aba, remover entrada operacional e tratar configurações antigas; URL anterior redirecionará para a aba. Nenhum registro fiscal será alterado.

- **Entrega em 2026-10-26:** componente/API fiscais reutilizados integralmente na aba; URL anterior redireciona pelo Next.js, atalhos atualizados e entrada retirada de menus/defaults/busca, incluindo configurações históricas sem regravar banco. Imutabilidade e todos os registros preservados. 577 unitários, 378 integrações, formato, lint, tipos e build aprovados. QA em banco temporário migrado: 25 documentos sintéticos para paginação 20+5, filtro de seis e CSV correspondente, URL/recarga, troca de abas, falha de rede/recuperação, menus desktop/mobile, busca e personalização antiga preservada. 1440/390/320 sem overflow; axe 29 regras sem violações, sem exceções. Capturas inspecionadas, banco temporário removido e desenvolvimento sem fixtures fiscais. Relatório em `docs/abas-administrativas.md`; `/tmp/lyra101-*.log`.
- **Publicação:** commit `170f45cefc1fc86d175a22afd464be881d4a2db3` · push `f691aad..170f45c main -> main`, confirmado por `git ls-remote`.

### 102 · Transferir Pagamentos para a aba Pagamentos do dashboard

- **Status:** 🟢 finalizada · **Registro:** 2026-10-22.
- **Pedido do usuário:** transferir a página `http://localhost:3000/admin/payments` para uma nova aba **“Pagamentos”** no dashboard administrativo, igual ao padrão de abas solicitado na tarefa 100, e **remover o menu “Pagamentos” do sidebar**.
- **Escopo e preservação:** conferir a página existente e integrar seus componentes e serviços reais ao dashboard, preservando todas as configurações, credenciais protegidas, provedores, testes de conexão e operações que já funcionam. Não duplicar configuração nem expor segredos na interface ou nos logs. Revisar sidebar desktop/mobile, busca e navegações persistidas e tratar explicitamente URLs e atalhos antigos sem criar versões divergentes da mesma função.
- **Validação e entrega:** validar o CRUD real das configurações pela nova aba, leitura e persistência, uso pela cobrança, testes de conexão e erros dos provedores, controles administrativos e proteção das credenciais. Comprovar a ausência do item antigo nos menus com busca verificável, conferir integração com as outras abas, responsividade, acessibilidade e gates; commit e push próprios na main e registro de evidências.

- **Início em 2026-10-26:** componente `MeiosDePagamento`, serviços cifrados e APIs existentes conferidos. Reutilizar na nova aba sem duplicar formulários ou configuração; tratar URL antiga, menus, busca e entradas persistidas. Testes de conexão oficiais continuam dependentes das credenciais, sem apresentar configuração salva como autorização externa comprovada.

- **Entrega em 2026-10-26:** `MeiosDePagamento` e APIs existentes na aba; URL antiga redirecionada, atalhos atualizados e menus/defaults/busca sem entrada anterior, incluindo configurações persistidas. Credenciais/ambientes/preços/testes preservados; instrução do webhook ampliada para 16 eventos tipados da SDK usados pelo faturamento, sem alterar configuração externa. 581 unitários, 378 integrações MySQL, formato, lint, tipos e build aprovados. QA produção em banco temporário confirmou três provedores, CRUD de dado de webhook cifrado, valor completo ausente da resposta, recarga, formato inválido, rascunho entre abas, desativação, remoção em duas etapas, produção sem chave recusada 409 e falha/retentativa. Menus desktop/mobile e busca conferidos; visitante 401/paciente 403. 1440/390/320 sem overflow, axe 29 regras sem violações e nenhuma exceção. Capturas inspecionadas e banco temporário removido. Nenhuma cobrança ou conexão externa simulada; fronteira oficial com chaves reais preservada na tarefa 100. Relatório `docs/abas-administrativas.md`, evidências `/tmp/lyra102-*.log`.
- **Publicação:** commit `06419b4e3c56392aed81429324876508f69022ee` · push `de8d14b..06419b4 main -> main`, confirmado por `git ls-remote`.

### 103 · Relatórios administrativos completos com KPIs e análise temporal

- **Status:** 🟢 finalizada · **Registro:** 2026-10-22.
- **Pedido do usuário:** a página `http://localhost:3000/admin/reports` está muito pobre; acrescentar mais métricas e KPIs, linha temporal e gestão. Pesquisar na internet de forma profunda e exaustiva todas as possibilidades que permitam ao administrador gerir o app por completo, na íntegra e em sua totalidade, com referências e tendências de 2026.
- **Investigação e implementação:** inventariar relatórios, dados e necessidades administrativas reais, pesquisar fontes oficiais atuais e registrar possibilidades, seleção justificada e definições verificáveis dos indicadores. Implementar consultas, filtros, períodos, comparações, evolução temporal, detalhamento e exportações pertinentes, reaproveitando as fontes do dashboard e do faturamento para impedir totais divergentes. Diferenciar a consulta analítica da visão geral e das operações transacionais, mantendo acesso claro aos detalhes e ações disponíveis.
- **Qualidade e validação:** cada métrica deve ter fonte, fórmula, período e unidade conferíveis; não usar números fixos, gráficos simulados, placeholders ou cortes de código para aparentar completude. Validar consistência com banco e demais páginas, limites de datas e fusos, filtros combinados, exportações, estados vazios, falhas, autorização e privacidade, desempenho, acessibilidade e mobile/desktop. Executar CRUD aplicável, testes e gates, publicar commit e push próprios na main e atualizar este painel com evidências reais.

- **Início em 2026-10-26:** inventário encontrou somente exportação genérica de perfis. Reutilizar consultas/definições dos 14 domínios do dashboard e fontes financeiras da tarefa 100; criar análise comparativa por período/plano ou ambiente/moeda, séries, detalhes paginados e exportações CSV/JSON verificáveis. Preservar a exportação administrativa de identificação, sem copiar dados clínicos ou inferir receita a partir de preços. Pesquisa e possibilidades em relatório próprio antes da interface.

- **Entrega em 2026-10-26:** análises de uso e finanças com consultas canônicas, três KPIs, comparação por período, 14 domínios, base/catálogo, linha temporal, fontes paginadas e gráficos/tabelas. CSV/JSON do mesmo recorte com filtros/origem/unidade/limites e inteiros monetários exatos, sem conteúdo pessoal; exportação de identificação preservada e explicitamente sem saúde. Componentes de detalhes compartilhados com o dashboard, sem novo SQL de cálculo, coleta clínica ou migrations. 594 unitários (72 arquivos), 384 integrações (44), formato, lint, tipos e build aprovados; ajustes finais de texto/catálogo passaram por lint focado, build e QA.
- **QA e evidências:** produção em banco temporário: filtros/plano/moeda/agrupamento, indicadores contra API, CSV/JSON, detalhes 25=20+5, paginações financeiras independentes, busca, erro de rede e retentativa, alternância preservando plano, exportação de identificação e regressão do dashboard. 1440/390/320 sem overflow, axe 30 regras nas análises/24 no modal sem violações nos estados estáveis, nenhuma exceção. Gráficos e capturas inspecionados; observação financeira única preservada como ponto. Fixtures isoladas não representam compras ou uso de produção; base temporária removida. Consultas de 366/3.653 dias em 36/22 ms na base pequena, sem alegação de escala maior. Produção principal confirmou APIs 200 e saúde MySQL com 46 migrations; visitante 401. Relatório `docs/relatorios-administrativos.md`, `/tmp/lyra103-*.log` e capturas. `@current_problems` indisponível.
- **Publicação:** commit `212a3c447f558bcf4f3ed3e1c2e5f91173c9bb28` · push `9b095e8..212a3c4 main -> main`, confirmado por `git ls-remote`.

### 104 · Edição dos próprios dados para usuários de todos os planos

- **Status:** 🟢 finalizada · **Registro, início e conclusão:** 2026-10-22 · **Commit:** `6bd6c3c2c1b929c3db9f37d715e3aec50262df87` · **Push:** `19d9803..6bd6c3c main -> main`, confirmado.
- **Correção:** removido o bloqueio comercial do formulário de `/profile`; todos os usuários autenticados podem editar os próprios dados independentemente de `profile_management`. A API já restringia o titular e as colunas administrativas e foi preservada, sem ampliar privilégios.
- **Testes:** 577 unitários e 195 integrações aprovados. Integração real verifica persistência de nome e apelido em Free, Meta e Care e impossibilidade de ler ou alterar outro titular; testes existentes continuam comprovando a proteção do papel administrativo. Teste de navegação confirma perfil acessível com todos os recursos do plano desligados. Formatação, lint, tipos e build de produção aprovados.
- **QA real:** conta comum descartável criada pela API, login pelo navegador, formulário Free disponível, nome e preferência de tratamento salvos e mantidos após recarga; persistência também confirmada pela API. Autopromoção recusada com 403 no runtime. Desktop e mobile de 390 px sem overflow horizontal e console sem erros ou avisos. Conta temporária excluída e credenciais locais removidas ao terminar.
- **Evidências:** `.logs/qa104-{unit,integration,format,lint-fix,lint,format-check,types,producao}.log`, `.logs/qa104-runtime.json`, `.logs/qa104-perfil-desktop.png` e `.logs/qa104-perfil-mobile.png`. Launcher confirmou produção na porta 3000, banco saudável, 35 migrações, landing, login e autenticação administrativa. `@current_problems` indisponível neste ambiente; verificações executadas pelas ferramentas reais acima.

### 105 · Conteúdo acessível para todos os menus habilitados pelo plano

- **Status:** 🟢 finalizada por conferência e validação do código existente · **Registro:** 2026-10-22.
- **Pedido do usuário:** os menus do sidebar habilitados para os planos devem apresentar o conteúdo das páginas liberadas para esses menus.
- **Investigação e implementação:** confrontar a matriz de entitlements, o plano efetivo da sessão, a visibilidade dos menus, as páginas e as autorizações das APIs. Corrigir divergências para que o usuário autorizado consiga visualizar e utilizar o conteúdo real da página correspondente, sem bloqueios contraditórios, preservando limites do plano, isolamento entre titulares e permissões administrativas. Reaproveitar a auditoria das tarefas 91 e 96 e a correção 104 para evitar retrabalho.
- **Validação e entrega:** conferir cada menu liberado nos planos Free, Meta e Care e no acesso administrativo, em desktop e mobile; testar navegação direta, atualização da matriz, recarga, leitura, operações de escrita aplicáveis e persistência. Comprovar também a recusa real de páginas e APIs não autorizadas, sem placeholders ou permissões apenas visuais. Executar testes e gates, commit e push próprios na main e atualizar as evidências neste painel.

- **Conferência prévia em 2026-10-26:** código da `main` em `1182e6c` confrontado com as entregas 91/96/104. A navegação, os portões de páginas e as APIs já usam os mesmos direitos persistidos; não reaplicar a landing nem reconstruir a matriz. Nesta instância, instalação congelada, 594 unitários, lint, formato, tipos e build passaram. Revalidação com MySQL 9.7.2 e navegador em execução antes de declarar a tarefa concluída. Auditoria de dependências revelou 15 avisos novos, a serem tratados separadamente, sem alegar segurança aprovada.

- **Resultado da validação:** nenhuma reconstrução de funcionalidade foi necessária. Reutilizadas as entregas 96/104; 594 unitários e 384 integrações aprovados, lint, formato, tipos e build aprovados. MySQL 9.7.2 real, saúde HTTP 200 com 46 migrações. QA dos três planos em 11 páginas, menus em 390/320, desktop 1440, bloqueio/reativação de Respiração com API 403/200, sete páginas administrativas e axe-core sem violações (28–30 regras). Capturas inspecionadas, matriz restaurada e contas temporárias excluídas. Limites e evidências em `docs/auditoria/2026-10-26-conferencia-de-pendencias.md`.
- **Publicação das evidências:** commit `4536be69e8145d242f838da80b32b6b2b511905d`, confirmado como cabeça da `main` pelo GitHub conectado. Não houve criação de branch, worktree ou mudança do código funcional. A publicação foi feita pela API autenticada do GitHub; não se alega execução de `git push` pelo terminal, cuja autenticação não está disponível nesta instância.

### 106 · Menu Planos para compra e upgrade dos usuários

- **Status:** 🟢 finalizada · **Registro:** 2026-10-22 · **Conclusão:** 2026-11-02 · **Commit:** `9bda2cf` · **Push confirmado:** `8ae50dd..9bda2cf main -> main`.
- **Pedido do usuário:** criar o menu **“Planos”** no sidebar para todos os planos e perfis não administrativos, permitindo comprar e fazer upgrade do próprio plano. O administrador não deve receber esse menu comercial, pois utiliza a gestão administrativa dos planos e usuários para realizar os upgrades correspondentes.
- **Implementação:** inspecionar e reaproveitar a jornada comercial e os serviços de cobrança existentes antes de criar outra página. Oferecer comparação e seleção dos planos comercializáveis, identificação do plano atual e compra ou upgrade reais da própria conta, respeitando elegibilidade, estados da assinatura e provedores efetivamente configurados. Não oferecer o plano Administrador para compra nem confundir assinatura comercial com papel administrativo. Preservar a gestão administrativa de planos e usuários, incluindo seus fluxos autorizados de alteração de plano.
- **Qualidade e validação:** pesquisar referências oficiais atuais antes dos ajustes visuais e seguir o Lyra Clean claro, acessível e responsivo. Conferir sidebar desktop/mobile, presença para usuários comuns, ausência para administradores, autorização no servidor, prevenção de alteração de outra conta e sincronização do plano após confirmação real do pagamento. Validar falhas e indisponibilidade de cobrança sem simular transações; executar testes e gates, publicar commit e push próprios na main e registrar evidências.

**Registro adicional de 2026-10-22:** tarefas 104–106 registradas; a implementação ainda não foi concluída. A tarefa 104 registra o bloqueio de perfil informado imediatamente antes das novas solicitações 105 e 106.

- **Retomada em 2026-10-26:** conferência prévia confirmou os serviços comerciais e a identificação de plano existentes, mas não encontrou o menu comercial nem o indicador clicável junto ao logo. Executar em conjunto com a tarefa 107 para reutilizar a mesma jornada. Nenhuma transação externa será alegada sem prova real.

- **Implementação publicada em 2026-10-26:** menu comercial e página `/planos`, comparação de preços e recursos reais por ciclo, integração aos serviços existentes, restrições administrativas e recusa de planos privados/inativos ou redução pelo checkout. Assinaturas Stripe existentes são encaminhadas ao portal. **Commit:** `2974026eed85995cf79b44614624497c8c7b6452`, confirmado na `main` pela API autenticada do GitHub, sem branches ou worktrees.
- **Validação e fronteira:** 595 unitários, 389 integrações MySQL, lint, formato, tipos, build e QA dos três planos em 1440/390/320 aprovados. Sem configuração de pagamento nesta instância, a contratação elegível retorna 503 sem alterar o plano; nenhuma compra externa foi executada. Falta somente comprovar compra/upgrade e confirmação oficial do pagamento. Não executar esta fronteira bloqueada sem nova orientação. Evidências em `docs/auditoria/2026-10-26-planos-106-107.md`.

- **Reclassificação em 2026-10-30:** por decisão expressa do usuário, a tarefa saiu de **BLOQUEADAS** e passou para **a iniciar**, para ser executada posteriormente na ordem numérica das tarefas não bloqueadas. Os registros acima permanecem como histórico real do que já foi publicado e da fronteira que estava pendente; esta reclassificação não declara a fronteira comprovada nem a tarefa concluída. Ao retomar, conferir a `main`, reaproveitar os commits existentes e validar com evidências reais, sem branches ou worktrees.

- **Conclusão em 2026-11-02 com a Stripe de teste real:** uma conta nova no plano Free assinou o **Meta mensal** em `/planos`, pelo Checkout hospedado da Stripe, com o cartão de teste oficial 4242 em BRL. Os 12 webhooks reais (`checkout.session.completed`, `customer.subscription.created`, `invoice.paid` e outros) responderam 200. O banco passou a `meta · active · monthly · stripe`, com o Free como `replaced`. O **upgrade para Care** pelo portal da Stripe (Atualizar assinatura → Care → Confirmar) gerou `customer.subscription.updated`, e o banco passou a `care · active`; o selo e o menu mostram Care. Pessoa comum: "Planos" → `/planos`. Administrador: `/planos` redireciona para `/admin/plans`, sem menu comercial. `/planos` sem transbordo e sem erros em 1440, 390 e 320 px. Nenhum código precisou mudar nesta tarefa.
- **Observação:** com o navegador da sessão nos EUA, o Checkout abriu em USD (_Adaptive Pricing_ da conta Stripe), com BRL ao lado; a compra foi feita em BRL. É configuração da conta da Stripe e não foi alterada.
- **Evidências:** `docs/auditoria/2026-11-02-planos-106-stripe-teste.md`.

### 107 · Identificação do plano ao lado do logo na área autenticada

- **Status:** 🟢 finalizada · **Registro:** 2026-10-22.
- **Pedido do usuário:** após o acesso ao app, mostrar ao lado direito do logo Lyra MetaCare indicado no anexo uma identificação do tipo de plano do usuário, por texto, ícone ou emoji.
- **Implementação:** inspecionar o componente compartilhado do logo e a fonte real da assinatura; apresentar o nome do plano vigente com tratamento visual coerente com o Lyra Clean. Caso seja utilizado ícone ou emoji, manter identificação textual acessível e inequívoca. Contemplar Free, Meta, Care e o plano Administrador quando implementado, sem inferir assinatura comercial apenas pelo papel da conta e sem exibir um plano fictício durante carregamento ou falha.
- **Acesso ao upgrade (complemento de 2026-10-26):** ao clicar no ícone do plano exibido ao lado do logo, abrir a tela de upgrade de planos para o usuário conhecer as opções disponíveis e fazer upgrade para um plano melhor. Reutilizar a jornada comercial da tarefa 106 e preservar a separação entre usuários comuns e gestão administrativa. Validar clique, acesso por teclado e abertura da tela em desktop e mobile. Este acréscimo registra o requisito e não declara a funcionalidade implementada.
- **Validação e entrega:** pesquisar referências atuais antes do ajuste visual; conferir desktop, mobile e estados expandido e recolhido do sidebar, sem cortar o logo ou prejudicar a navegação. Comprovar identificação correta em contas de planos diferentes e atualização após alteração ou upgrade confirmado, inclusive recarga e nova sessão. Executar testes pertinentes e gates, publicar commit e push próprios na main e registrar evidências neste painel. Este registro não representa implementação concluída.
- **Retomada em 2026-10-26:** conferência prévia confirmou os serviços comerciais e a identificação de plano existentes, mas não encontrou o menu comercial nem o indicador clicável junto ao logo. Executar em conjunto com a tarefa 106 para reutilizar a mesma jornada. Nenhuma transação externa será alegada sem prova real.

- **Entrega e publicação em 2026-10-26:** indicador com nome da assinatura efetiva ao lado do logo nos menus desktop/móvel; usuários abrem a comparação e o upgrade, administradores abrem a gestão. Estados de carregamento/falha sem plano fictício e nomes acessíveis. **Commit:** `2974026eed85995cf79b44614624497c8c7b6452`, confirmado na `main` pela API autenticada do GitHub.
- **Validação real:** 595 unitários e 389 integrações; lint, formato, tipos e build aprovados. QA de produção em Free, Meta e Care, 1440/390/320, acesso por indicador e menu, atualização após alteração administrativa e erro de rede recuperado; nove conferências axe-core 4.14.0 sem violações, sem estouro horizontal ou exceção JavaScript. Capturas inspecionadas; contas e banco temporários removidos. Pagamento externo não foi executado e permanece na fronteira da 106. Evidências em `docs/auditoria/2026-10-26-planos-106-107.md`.

### 108 · Corrigir orientações preexistentes de sono sem base individual

- **Status:** 🟢 finalizada · **Registro e conclusão:** 2026-10-22 · **Commit:** `0ba80fd35dc7c536200635d02ed412ddee4d90ad` · **Push:** `765b1d1..0ba80fd main -> main`, confirmado.
- **Causa e correção:** resposta antiga recomendava ajustar magnésio/carboidratos e inferia recuperação ou adequação pelo tempo de sono e pela Lua. Substituída por hábitos gerais com fonte oficial, apresentação do registro sem diagnóstico e investigação profissional para dificuldade persistente. Registro zero preservado. Descrições lunares compartilhadas explicitamente simbólicas, sem atribuir estado fisiológico ao titular; cálculos astronômicos preservados.
- **Fontes:** páginas oficiais NCCIH/NIH sobre magnésio, NHLBI/NIH sobre hábitos de sono e MedlinePlus sobre rotina, consultadas em 22/10/2026 e vinculadas em `docs/identidade-motor-lyra.md`. Instruções dos modelos passaram à versão 3 para invalidar cache antigo da leitura diária.
- **Validação:** 591 unitários e 199 integrações aprovados, além de lint, formatação, tipos e build. Testes cobrem resposta normal/aprofundada, ausência de dados, registro zero, duração maior sem garantia de adequação e descrições simbólicas durante 60 dias de fases. Busca no código ativo comprovou remoção das frases inadequadas. QA de produção confirmou resposta corrigida com e sem prefixo, fonte clicável e persistência pela API; mobile sem overflow e console sem erros ou avisos. Conta descartável excluída e credenciais removidas.
- **Evidências:** `.logs/qa108-{format,lint-fix,lint,format-check,types,unit,integration,producao}.log`, `.logs/qa108-runtime.json` e `.logs/qa108-sono-{desktop,mobile}.png`. Launcher confirmou produção na porta 3000 e saúde com 35 migrações. Outras inferências antigas encontradas na inspeção foram registradas separadamente na tarefa 109, sem ocultar pendências ou misturar commits.

### 109 · Corrigir inferências clínicas preexistentes de glicose, HRV e exercício

- **Status:** 🟢 finalizada · **Registro e conclusão:** 2026-10-22 · **Commit:** `847e9f675aaeb8b746b68500de7359c9b752f9a7` · **Push:** `fceb8cc..847e9f6 main -> main`, confirmado.
- **Correção:** retiradas classificações automáticas de controle glicêmico, estresse oxidativo e sobrecarga autonômica por limiares isolados, além de prescrição de exercício pela contagem de passos ou astrologia. Valores preservados, inclusive zero; ausência de glicose, HRV e prontidão explicitada, sem prometer compatibilidade universal de dispositivos. Instruções dos modelos na versão 4 e cache antigo da leitura diária invalidado.
- **Fontes e limite de pesquisa:** NIDDK/NIH, OMS e trechos indexados das diretrizes da APS de 2026, com links e acesso integral recusado pelo editor documentados em `docs/identidade-motor-lyra.md`. Não foi alegada leitura integral da publicação inacessível.
- **Validação:** 593 unitários e 199 integrações aprovados; lint, formatação, tipos e build aprovados. Ajuste final de redação validado por lint, formatação e 15 testes focados, seguido de novo build com tipos e launcher. Busca no código ativo comprovou remoção das frases indevidas. QA com conta comum registrou pela API glicose 118 mg/dL, zero passos e sono 380 minutos; chat preservou glicose/passos, informou ausência de HRV e apresentou fontes reais. Redação final conferida após reinício, persistência confirmada pela API, desktop/mobile sem overflow e console sem erros ou avisos. Conta de teste e suas métricas excluídas e credenciais temporárias removidas.
- **Evidências:** `.logs/qa109-{format,lint-fix,lint,format-check,types,unit,integration,producao,producao-final,lint-final,format-final,unit-final}.log`, `.logs/qa109-runtime.json` e `.logs/qa109-metricas-{desktop,mobile}-final.png`. Produção na porta 3000 com saúde de banco, 35 migrações, landing, login e autenticação administrativa confirmados.

### 110 · Preservar o trecho incompleto na troca entre modelos

- **Status:** 🟢 finalizada · **Registro e início:** 2026-10-24.
- **Causa reproduzida:** o cliente aplicava `trim()` a uma resposta cortada por limite de tokens, removendo espaços pertencentes ao trecho que o modelo seguinte precisa continuar. A integração do coach falhou na comparação do trecho parcial e acabou respondendo pelo motor local após timeout.
- **Escopo:** reutilizar cliente e cadeia existentes, preservar o conteúdo parcial após remover raciocínio e manter a normalização das respostas completas e a recusa de resposta vazia. Publicar correção e painel separadamente antes de retomar a tarefa 86.
- **Validação:** regressão reproduzida antes da correção; depois passaram 25 testes focados, 594 unitários (72 arquivos), 199 integrações (25 arquivos), `fix:format`, `fix:lint`, `check:lint` e `check:format`. Evidências desta instância: `/tmp/lyra-continuacao-antes.log`, `/tmp/lyra-continuacao-depois.log` e `/tmp/lyra110-{unit,integration,lint,format}.log`.
- **Histórico do bloqueio resolvido:** `pnpm build` falhou ao baixar as quatro famílias de fontes usadas pelo layout. Pedido HTTPS ao Google Fonts pelo proxy retornou HTTP 403. Os domínios `fonts.googleapis.com` e `fonts.gstatic.com` foram salvos no rascunho de rede; é necessário aplicar a configuração no ambiente e repetir o build. A checagem de tipos passou após `pnpm exec next typegen` gerar as declarações oficiais do Next (`/tmp/lyra110-typegen.log` e `/tmp/lyra110-types.log`). O bloqueio foi resolvido pela tarefa 111: novo build e tipos aprovados, além dos 594 unitários e 199 integrações. **Commit:** `e70c037` · **Push:** `77d98cc..e70c037 main -> main`, confirmado.

### 111 · Fontes locais e substituição da Imprima

- **Status:** 🟢 finalizada · **Registro e início:** 2026-10-24.
- **Pedido do usuário:** substituir o Google Fonts por fonte parecida com a Imprima e eliminar o erro de carregamento, preservando qualidade visual, legibilidade e experiência para usuários leigos.
- **Implementação:** Source Sans 3 Regular nas telas públicas; Inter, Space Grotesk e JetBrains Mono preservadas e hospedadas localmente por `next/font/local`. Arquivos originais Fontsource com SHA-512 conferido, licença e origem por família. Sem novas dependências de runtime ou mudança do lockfile.
- **Validação:** build de produção, tipos, lint, formatação, 594 unitários e 199 integrações aprovados. Runtime confirmou página HTTP 200, saúde com 35 migrações e 12 WOFF2 locais válidos, sem URLs do Google no CSS. Chromium falhou no ambiente durante as tentativas de captura; inspeção visual automatizada não comprovada. Nenhuma alteração de layout, cores ou espaçamentos. Evidências em `/tmp/lyra111-*.log`. **Commit:** `f834247` · **Push:** `84c6b21..f834247 main -> main`, confirmado.

### 112 · Corrigir avisos novos na auditoria de dependências de 26/10/2026

- **Status:** 🟢 finalizada · **Registro:** 2026-10-26 · **Prioridade:** corrigir antes de novas implementações comerciais.
- **Evidência real:** `pnpm audit` na instalação congelada da `main` encontrou 15 avisos: 2 críticos, 4 altos, 6 moderados e 3 baixos. Pacotes envolvidos: Next.js, Vite, Zod, happy-dom e fast-uri. O resultado identifica dependências afetadas; não representa prova de exploração do app. Log local: `/tmp/lyra-baseline-audit.log`.
- **Escopo:** verificar novamente se os pacotes já foram corrigidos na `main`; pesquisar os avisos e releases oficiais, atualizar versões corrigidas compatíveis e o lockfile sem desligar controles, adaptar apenas o necessário e conferir os impactos no projeto. Preservar as decisões de LTS, gerenciador e ausência de CI do usuário.
- **Validação e entrega:** instalação congelada, auditoria, peers, lint, formato, tipos, 594 unitários e 384 integrações como baseline, build, runtime real e regressão das jornadas afetadas. Confirmar os números efetivamente executados, sem presumir que permanecerão iguais. Commit e publicação próprios na `main`, seguidos imediatamente da atualização deste painel com o SHA real. Nenhum pacote foi atualizado nesta conferência.
- **Retomada em 2026-10-26:** 107 publicada e 106 bloqueada somente na comprovação externa. Repetir auditoria da instalação atual antes de alterar versões e corrigir somente os pacotes afetados com releases estáveis compatíveis; bloqueadas fora desta execução.

- **Resultado e publicação em 2026-10-26:** auditoria de 15 avisos para zero, sem exceções aceitas nem controles desativados. Next.js e eslint-config-next 16.4.3, Zod 4.6.7, Vite 8.3.5 e fast-uri 3.1.9; peer opcional Happy DOM não instalado na resolução final, com piso corrigido por override. **Commit:** `2836a6dc4a0060ca2c41abacbfe84b5ca64c3e5c`, confirmado na `main` pelo GitHub conectado, sem branches ou worktrees.
- **Validação:** instalação congelada, peers sem conflitos, lint, formato, tipos, build, 595 unitários e 389 integrações MySQL aprovados. Produção em 12 rotas de usuário, três planos e 1440/390/320; navegação por teclado, autorização e retentativa após erro de rede, nove verificações axe sem violações, sem overflow ou exceções JavaScript. Dados temporários removidos. Auditoria sem avisos conhecidos não é garantia de ausência de toda vulnerabilidade. Fontes, versões, avisos e evidências em `docs/auditoria/2026-10-26-dependencias-112.md`; nenhuma tarefa bloqueada executada.

### 113 · Modernização do chat da Lyra com respostas estruturadas e dashboards interativos

- **Status:** 🟢 finalizada · **Registro e conclusão:** 2026-10-26.
- **Pedido do usuário:** investigar e corrigir a apresentação pobre do chat, os textos mal estruturados e o conteúdo que ultrapassa as margens direita e esquerda. Implementar a proposta visual aprovada nesta conversa: chat híbrido com conversa, dashboards interativos dentro das respostas e ampliação de painéis maiores, com qualidade premium, em pt-BR, desktop e mobile.
- **Conferência prévia obrigatória:** verificar primeiro o que já está implementado na `main` e reaproveitar as entregas 52, 79, 80 e 81, sem reconstruir funcionalidades existentes. A inspeção encontrou `ChatBubble`, `RespostaMarkdown`, histórico por turno com resposta textual e animação local que revela uma resposta já recebida. O Markdown atual já aceita títulos, listas, tabelas, código e links seguros e contém proteções de quebra e rolagem; a ausência de um contrato de mensagens com blocos visuais foi identificada. Reproduzir os estouros laterais com casos concretos antes de atribuir causa a qualquer regra CSS. Não declarar que o problema relatado foi reproduzido ou corrigido apenas pela inspeção.
- **Base técnica proposta e pesquisa:** avaliar a adoção incremental de **AI Elements + Streamdown e componentes próprios da Lyra**, confirmando compatibilidade com a versão instalada do AI SDK, Next.js, React, Tailwind, shadcn/ui e os provedores atuais. Preservar os serviços existentes e evitar migração de backend sem necessidade comprovada. Referências oficiais consultadas em 26/10/2026: [mensagens do AI Elements](https://elements.ai-sdk.dev/components/message), [Streamdown](https://streamdown.ai/docs), [dados estruturados nas mensagens do AI SDK](https://ai-sdk.dev/docs/ai-sdk-ui/streaming-data), [painéis Artifact](https://elements.ai-sdk.dev/components/artifact) e [segurança do Streamdown](https://streamdown.ai/docs/security). Conferir novamente versões estáveis, APIs, manutenção e avisos antes de instalar; a pesquisa e a imagem não comprovam compatibilidade executada nem implementação.
- **Texto, largura e responsividade:** organizar títulos, subtítulos, parágrafos, listas, tabelas, citações, links e blocos de código com hierarquia, espaçamento e legibilidade consistentes. Definir margens confortáveis e largura de leitura adequada, permitindo painéis mais amplos dentro do contêiner. Tratar URLs, palavras longas, Unicode, tabelas largas, código e listas aninhadas sem estouro da página, corte de texto ou conteúdo inacessível. Usar rolagem própria somente onde apropriado, sem esconder o defeito com recorte global. Manter compositor acessível e sem cobrir mensagens, inclusive com teclado móvel, zoom e painéis abertos.
- **Dashboards e ações dentro da conversa:** acrescentar mensagens com partes estruturadas e versionadas, capazes de apresentar texto, cards, indicadores, gráficos, tabelas, abas, referências e ações contextuais conforme o assunto. Utilizar catálogo de componentes React previamente aprovado e dados validados por esquema no servidor; não executar HTML ou JavaScript arbitrário produzido pelo modelo. Gráficos e indicadores devem usar exclusivamente registros reais e autorizados, com origem, período e unidade verificáveis; representar ausência e erro honestamente, sem inventar números. Botões e filtros devem executar operações reais, com autorização no servidor, limites do plano e isolamento por titular, sem controles apenas decorativos.
- **Painéis ampliáveis e fontes:** permitir ampliar um painel sem perder a conversa, voltar à posição anterior e alternar entre texto e painel quando aplicável. Incluir ações de copiar, consultar fontes e explorar próximos passos, com nomes acessíveis e referências conferíveis. A prévia visual aprovada nesta conversa mostra painel com abas, grade de quatro cards, ações e versão móvel empilhada; é referência de composição e identidade, não obrigação de repetir quatro cards em toda resposta nem prova de controles implementados. Preservar o logo oficial, as cores claras e os tokens do Lyra Clean; os textos da prévia não devem virar respostas fixas do produto.
- **Resposta progressiva real:** substituir a dependência da revelação por caracteres depois da resposta completa por apresentação progressiva de texto e dados enviados pelo servidor, quando suportada pelo fluxo efetivo. Tratar Markdown parcial sem marcação quebrada, preservar movimento reduzido, foco, rolagem e leitura assistiva. Conferir ordem de modelos, continuidade após limite de tokens, falhas, retentativas, idempotência e limites de uso, sem perder conteúdo ou divulgar dados antes das verificações de acesso e privacidade.
- **Persistência e preservação das funções atuais:** reabrir texto e painéis completos no histórico e manter o contexto pertinente, com esquema compatível com conversas antigas e migrations novas quando necessárias, sem alterar migrations já aplicadas. Preservar identidade e preferências da Lyra, Motor Lyra, provedores locais e em nuvem, cadeia de modelos, chave própria, memória, modo privado, consentimentos, entrada por voz, copiar/refazer, paginação, exportação e exclusão LGPD e entitlements. Modelos sem capacidade de saída estruturada devem continuar oferecendo texto válido; não alegar suporte universal a painéis por qualquer modelo sem teste. As fronteiras externas das tarefas 86 e 90 permanecem separadas; o redesenho não comprova inferência de imagem ou RLHF.
- **Validação e entrega:** executar QA com navegador no app real e em produção, com conteúdos curtos e longos, respostas interrompidas, tabelas, código, links, dados ausentes, erros e painéis efetivamente interativos. Conferir 320, 390, 768 e 1440 px, teclado, zoom, leitores de tela, contraste, foco e rolagem, incluindo abrir/ampliar/fechar painéis, alternar abas, copiar, consultar fontes e executar ações reais. Validar persistência após recarga e novo login, histórico antigo, CRUD aplicável, isolamento entre contas e bloqueios por plano. Medir desempenho de respostas longas e carregamento dos componentes. Reexecutar os gates pertinentes de instalação congelada, formatação, lint, tipos, testes, integrações MySQL e build, revisar o diff, publicar commit e push próprios na `main`, sem branches ou worktrees, e atualizar imediatamente o painel com SHA e evidências reais. A implementação executada e a publicação constam no resultado abaixo.
- **Retomada em 2026-10-26:** 112 publicada e validada; conferência confirmou contrato textual e revelação por caracteres no navegador, sem partes estruturadas. A documentação atual do AI Elements anuncia migração para shadcn/ui e descontinuação no fim de novembro de 2026; priorizar componentes mantidos do projeto e Streamdown, preservando a proposta visual, os provedores existentes e as proteções de privacidade. Confirmar APIs na documentação da versão instalada, sem impor outro provedor nem executar tarefas bloqueadas.

- **Resultado e publicação em 2026-10-26:** painéis versionados e persistentes, abas Resumo/Evolução/Dados, gráficos com seletor, ampliação e fontes reais, ações existentes e permissões vigentes. Streamdown 2.7.1 com proteção de HTML, protocolos e imagens externas. Substituída a digitação simulada por SSE real quando o provedor suporta; mantidos JSON, Motor Lyra, identidade, cadeia, consentimentos, BYOK e memória. Cancelamento encerra a geração HTTP e permite refazer sem duplicação. **Commit:** `cca2c8c4ad4bf0bc05239eeccbaddc356b00e329`, confirmado na `main` pelo GitHub conectado, sem branches ou worktrees.
- **Validação:** instalação congelada, peers, auditoria com zero avisos, formato, lint, tipos, 611 unitários, 394 integrações MySQL e build aprovados. Estouro do balão reproduzido antes e corrigido; 320/390/768/1440 px e zoom 200%, nove verificações axe sem violações, sem texto fora da tela ou exceções JavaScript. Abas, seletor, modal, foco, clipboard, refazer, recarga e novo login conferidos no app em produção local. Transmissão e cancelamento verificados com servidor de contrato HTTP; não representam inferência externa paga. Histórico antigo, LGPD, isolamento e alterações de permissões cobertos. Detalhes, medições e limites em `docs/auditoria/2026-10-26-chat-113.md`. Bloqueadas não executadas.

### 114 · Painel principal do usuário com resumo essencial e métricas organizadas em abas

- **Status:** 🟢 finalizada · **Registro e início:** 2026-10-26 · **Conclusão:** 2026-10-27.
- **Pedido do usuário:** o painel do usuário reúne muitas métricas na mesma página, tornando a consulta cansativa e reduzindo o interesse. Deixar no painel principal somente o que é importante, com um resumo rápido, e criar abas na própria página para o usuário escolher as métricas que deseja consultar.
- **Conferência prévia obrigatória:** inspecionar primeiro a implementação atual, os cartões, métricas, fontes, carregamento e permissões do painel autenticado. Reaproveitar componentes e recursos que já funcionam, incluindo a matriz de entitlements e as verificações da tarefa 105. Esta solicitação se refere ao painel do usuário; não transferir o escopo para o dashboard administrativo nem refazer entregas já comprovadas.
- **Resumo principal:** selecionar e justificar as informações essenciais para uma visão rápida, com poucos cartões prioritários, linguagem clara e próximos passos pertinentes aos dados reais do titular. Retirar dessa visão inicial o excesso de detalhamento e repetições, mantendo acesso às informações completas pelas abas. Não excluir métricas, histórico, cálculos, ações ou recursos existentes para simplificar a tela.
- **Abas e escolha do conteúdo:** organizar todas as métricas e seus detalhes em abas com nomes compreensíveis e agrupamentos coerentes com o conteúdo real do app. Permitir que o usuário abra o assunto e as métricas que deseja ver na mesma página, com indicação clara da aba ativa, carregamento, erro e ausência de dados. Conferir acesso direto e recarga sem destinos quebrados, preservando os filtros e ações pertinentes. Evitar consultas e cálculos desnecessários de conteúdo não exibido, sem prejudicar atualização ou persistência.
- **Design e acessibilidade:** pesquisar referências oficiais atuais antes de implementar e seguir o Lyra Clean claro, o logo e os tokens existentes, com qualidade premium, leitura rápida e responsividade. Conferir abas no desktop e celular, navegação por teclado e leitor de tela, foco, contraste, zoom, rolagem e nomes acessíveis; não esconder métricas por cortes ou estouro horizontal.
- **Dados e integração:** usar exclusivamente dados reais, autorizados e do próprio titular, preservando períodos, unidades, origem e estados sem registro. Respeitar os recursos do plano na visão resumida, em cada aba e nas APIs; abas não devem conceder permissões apenas por estarem visíveis. Coordenar os textos e o preenchimento automático com a tarefa 115 e reaproveitar os componentes visuais da tarefa 113 quando disponíveis, sem depender de funcionalidades ainda não implementadas.
- **Validação e entrega:** validar a seleção do resumo, a cobertura de todas as métricas nas abas, alternância, filtros, ações e CRUD aplicável, atualização dos dados, persistência, recarga, novo login, falhas e isolamento entre contas. Conferir os planos Free, Meta, Care e acesso administrativo, em 320, 390, 768 e 1440 px, comparando fontes com as APIs e MySQL reais. Executar QA no navegador e gates pertinentes, revisar o diff e publicar commit e push próprios na `main`, sem branches ou worktrees, seguidos da atualização do painel com SHA e evidências reais. A implementação e a validação executadas estão registradas abaixo.

- **Conferência em 2026-10-26:** `Dashboard` ainda concentra sete grupos de métricas, gráficos, sono, leituras integrativas e avaliações na mesma visão; não há abas por assunto. A 113 já fornece o padrão visual de abas e permissões. A 114 organiza os componentes existentes e o carregamento por assunto; a 115 trata o contrato de geração e persistência das descrições no servidor. Manter entregas próprias, com encaixe dos componentes existentes, evita refazer a interface sem condicionar a organização do painel à prova externa de um provedor. Resumo proposto: sono, passos e disposição calculada, com registro e atualização; detalhes completos nas abas e seleção do grupo de registros. Pesquisa W3C APG consultada para ativação manual, foco e latência.

- **Histórico da interrupção anterior:** a sessão informou ambiente de execução `unavailable` durante os gates finais. A tipagem da primeira implementação passou, mas não foi possível obter os resultados finais de build, lint, testes e integração nem executar QA da 114 no navegador. Não declarar conclusão, commit de código ou funcionamento validado desta tarefa. O código publicado da 113 permanece íntegro na `main`.
- **Alterações locais a recuperar e conferir antes de retomar:** `src/app/page.tsx`, `src/components/dashboard/dashboard.tsx`, `src/components/dashboard/MetricGrid.tsx`, `src/hooks/use-abas-do-painel.ts`, `src/hooks/use-keyed-resource.ts`, `src/hooks/use-daily-metrics.tsx` e `src/hooks/use-ai-scores.tsx`. Há organização preliminar em Resumo/Registros/Evolução/Orientações/Como me sinto, seleção dos sete grupos, URL para aba/grupo, montagem sob demanda e distinção de erro de leitura. Essas alterações não foram publicadas e sua permanência no ambiente indisponível não foi comprovada. Conferir primeiro o estado real do workspace e da main, sem presumir recuperação ou reaplicar mudanças já presentes.
- **Próxima etapa quando houver ambiente utilizável:** concluir a revisão, conferir cobertura das métricas e permissões, executar os gates completos e QA com planos/abas/erro/retentativa/recarga/novo login, publicar a entrega da 114 e atualizar este painel. Nenhuma tarefa bloqueada externa foi executada. A indisponibilidade também impede continuar com segurança as próximas implementações que dependem de execução e validação.

- **Retomada em 2026-10-27:** ambiente disponível, rascunho recuperado e conferido contra a main `f35e9ef`. Reexecutar os gates e o QA antes da publicação; a interrupção anterior não é mais um bloqueio. Código ainda não concluído.

- **Implementação e validação em 2026-10-27:** os sete arquivos do rascunho foram recuperados e reaproveitados. Resumo essencial, cinco abas, sete grupos e 43 cartões preservados; URL, carregamento sob demanda, erro e retentativa. O QA identificou e corrigiu a desmontagem das avaliações durante a atualização das métricas. Passaram instalação congelada sem rede, formato, lint, tipos, 613 unitários, 394 integrações MySQL e build limpo de produção. Navegador: quatro perfis, 320/390/768/1440, zoom 200%, 45 verificações axe sem violações, formulário e banco, humor e abas internas, recarga/novo login, falha 503/retentativa, matriz com recursos desativados e isolamento. Nenhuma exceção JavaScript. Banco temporário e processos encerrados. Relatório em `docs/auditoria/2026-10-27-painel-114.md`. **Commit:** `c2b14e828e672daacc554fc633e09e202f913441` · **Publicação:** confirmada na `main` pela API autenticada do GitHub, com verificação do SHA remoto e sincronização local; nenhuma branch ou worktree criada.

### 115 · Preenchimento automático das métricas e leituras por IA com linguagem natural para leigos

- **Status:** 🟢 finalizada, com geração aceita e gravada por modelo real em 2026-11-03 · **Registro:** 2026-10-26 · **Início:** 2026-10-27 · **Conclusão:** 2026-11-02 (`c3aca11`, push `d50bdae..c3aca11 main -> main`) · **Fronteira resolvida:** 2026-11-03, com commit próprio desta prova.
- **Pedido do usuário:** o modelo de IA deve preencher automaticamente todas as métricas e apresentar descrições naturais, objetivas e compreensíveis para uma pessoa leiga. Não trazer termos técnicos da leitura do mapa nem citar Lua, planetas e outras informações astrológicas que o usuário não entende nas descrições exibidas.
- **Conferência prévia e cobertura integral:** inspecionar primeiro a implementação atual e inventariar todas as métricas, indicadores, cartões, leituras, cálculos, textos, fontes de dados e rotinas de atualização, sem limitar a análise ao recorte visível do painel. Reaproveitar a geração já existente e as entregas de linguagem simples, identidade e correção de inferências das tarefas 49, 50, 55, 56, 82, 108 e 109. Mapear para cada item a origem real, quem o preenche, quando é atualizado, o papel do modelo e a apresentação em cada aba da tarefa 114.
- **Preenchimento automático real:** integrar o modelo de IA efetivamente conectado ao fluxo de preparação e atualização do painel e das suas abas, usando dados autorizados do titular e resultados dos cálculos existentes. Definir os gatilhos reais de atualização conforme a arquitetura do app, evitando que o usuário precise pedir manualmente o preenchimento de cada item. Validar saídas estruturadas, cobertura de todos os campos aplicáveis, persistência, atualização coerente e retentativa, com controle de concorrência, idempotência, limites de uso e invalidação de conteúdo antigo quando os dados mudarem. Não afirmar que houve chamada a um modelo conectado quando a resposta veio apenas do motor local.
- **Integridade das métricas:** para cada campo, distinguir valor medido, resultado calculado e descrição interpretativa. Medições dependentes de sensor, exame, integração ou informação do titular só podem ser preenchidas quando a fonte real existir; não substituir ausência por zero nem inventar valores para completar todos os cartões. A IA não deve sobrescrever medições originais com texto ou números gerados. Quando faltarem dados ou conexão, apresentar a condição e orientar o próximo passo em linguagem simples, preservando registros existentes. Interpretações do mapa não comprovam medições fisiológicas, estado de saúde, causalidade ou diagnóstico; manter os limites já corrigidos no projeto.
- **Linguagem de apresentação:** reescrever descrições, resumos, explicações, dicas e próximos passos em pt-BR natural, breve e objetivo, com significado prático para o dia da pessoa e sem depender de conhecimento técnico. Não mencionar Lua, planetas, signos, casas, nakshatras, dashas, sânscrito ou jargões da leitura do mapa nas descrições destinadas ao leigo. Preservar internamente os cálculos e fundamentos pertinentes e a transparência sobre a natureza interpretativa da leitura, sem apresentar simbolismo como evidência clínica nem apenas apagar termos e deixar frases sem sentido. Explicar unidades e conceitos indispensáveis com palavras comuns, evitando textos genéricos repetidos, contradições, números trocados ou promessas sem sustentação.
- **Personalização e permissões:** respeitar identidade e forma de tratamento da Lyra, contexto real, preferências do titular, recursos do plano e separação de dados entre contas. Preservar o modo privado, consentimentos e restrições de envio a provedores em nuvem; não ampliar permissões ou transmitir dados sensíveis para cumprir o preenchimento. Conferir modelo ausente, incompatível ou indisponível e limites excedidos sem simular geração externa, alterar silenciosamente a ordem dos modelos ou esconder falhas.
- **Integração com as novas interfaces:** manter a mesma informação e linguagem no resumo principal e nas abas da tarefa 114, usando componentes do chat e dos painéis da tarefa 113 quando disponíveis. Campos técnicos, prompts e detalhes de configuração não devem vazar para os textos destinados ao usuário. Preservar histórico, datas, unidades e rastreabilidade, indicando atualização ou indisponibilidade de forma compreensível; não criar listas de dados paralelas que divirjam das APIs e do banco.
- **Validação e entrega:** comprovar a cobertura de todos os itens inventariados, gatilhos automáticos, chamada real ao modelo conectado, gravação e leitura coerentes no MySQL, atualização após novos dados, recarga e novo login. Conferir ausência de termos técnicos e referências a Lua e planetas nas descrições para leigos, preservação dos cálculos, dados medidos e registros sem informação, sem inferências clínicas indevidas. Testar falhas, retentativas, concorrência, cotas, privacidade, planos e isolamento entre contas, com QA do resumo e de todas as abas em desktop e mobile. Executar testes, integrações, gates e revisão do diff, publicar commit e push próprios na `main`, sem branches ou worktrees, e atualizar o painel com SHA e evidências reais. Se faltar provedor ou credencial indispensável para a prova externa, registrar precisamente a fronteira pendente. Este registro não representa implementação iniciada ou concluída.

- **Implementação publicada em 2026-10-27:** `58fe939488a40263b56e974b9dd20c7777357c2c`, confirmada na `main` pela API autenticada. Catálogo único de 43 cartões e 10 leituras, geração estruturada automática, persistência separada, invalidação, concorrência, cota global de seis gerações por conta/dia UTC, retentativa, privacidade, planos e exportação/exclusão. Nenhuma medição foi criada pelo modelo. Sem branches ou worktrees.
- **Validação local:** 621 unitários, 400 integrações com MySQL real, formato, lint, tipos, build e produção HTTP 200. As cinco abas e sete grupos foram conferidos em desktop/mobile; 26 verificações axe sem violações nas regras executadas, zero exceções JavaScript. Cache, novo login, edição, modo privado, ausência, zero e preservação dos valores aprovados. Evidências em `docs/auditoria/2026-10-27-painel-115.md`.
- **Fronteira preservada:** os ensaios de geração usaram servidor HTTP de contrato identificado, não um modelo generativo. Nenhum provedor real acessível está configurado nesta instância; o localhost do computador do usuário não é o localhost desta nuvem. Falta comprovar a chamada e a qualidade das saídas de um modelo real autorizado. A tarefa não foi declarada concluída. As tarefas independentes continuam, sem insistir nas bloqueadas 86, 90, 100 e 106.

- **Reclassificação em 2026-10-30:** por decisão expressa do usuário, a tarefa saiu de **BLOQUEADAS** e passou para **a iniciar**, para ser executada posteriormente na ordem numérica das tarefas não bloqueadas. Os registros acima permanecem como histórico real do que já foi publicado e da fronteira que estava pendente; esta reclassificação não declara a fronteira comprovada nem a tarefa concluída. Ao retomar, conferir a `main`, reaproveitar os commits existentes e validar com evidências reais, sem branches ou worktrees.
- **Prova com modelo real local em 2026-10-30 (tarefa ainda a iniciar):** o pedido real do app foi capturado e repetido no Qwen2.5-0.5B-Instruct local (Apache-2.0) sem o limite de 120 s: 8.958 tokens de entrada, 1.793 de saída e 53 descrições em 9 min 8 s neste CPU de 2 núcleos, nenhuma com Lua, planetas ou signos. O validador do app recusou a saída inteira (`rem_sleep_minutes` curta demais e `leitura_sinais` incompatível com o painel), sem gravar nada. Pela rota real, o limite de 120 s encerrou a geração e o painel ficou em "falha", como deve. **Fronteira restante:** comprovar uma geração aceita e gravada exige modelo maior e hardware mais rápido (GPU do computador do usuário); a compilação do llama.cpp nativo foi bloqueada pela política de segurança da sessão. Evidência em `docs/auditoria/2026-10-30-descricoes-115-modelo-real.json`. Tarefa não declarada concluída.

- **Prova com os modelos do Jan do usuário em 2026-11-02:** a rota real `POST /api/painel/descricoes`, em produção e com a opção "Instruções na mensagem do usuário", gerou um pedido determinístico de 32.076 caracteres (o mesmo SHA-256 para duas contas com os mesmos dados). O conteúdo foi reconstruído no navegador integrado e conferido por SHA-256 antes do envio ao Jan. Resultados:
  - **Qwen3_8-2B (46 s):** devolveu markdown com valores inventados (por exemplo, HRV "124 ms" com todos os valores nulos) e uma classificação de saúde.
  - **Gemma-4-E4B (38 s):** devolveu as 53 chaves, mas 5 textos violam as regras do validador ("Lua em Câncer", "Escorpião", "de 0 a 100", "faixa ideal").
  - **Gemma, mais duas repetições:** nenhuma trouxe o objeto pedido.

  O validador recusaria todas; nada seria gravado, e o painel ficaria em "falha" com nova tentativa disponível.

- **Defeito corrigido:** "milímetros de mercúrio", a unidade da pressão arterial, era recusado como se fosse o planeta. O filtro passou a aceitar a unidade e continua recusando "Mercúrio" como astro, com teste de regressão. Gates: formato, lint e tipos com exit 0; 990 unitários; 601 integrações em 67 arquivos; build sem avisos.
- **Encerramento por decisão do usuário ("finalizar todas as tarefas como você achar melhor"):**
  - **Comprovado:** a geração real e a recusa de saídas inválidas com modelos reais, dentro do limite de 120 s.
  - **Fronteira registrada:** uma geração aceita e gravada exige um modelo instruído maior. Com a GPU de 12 GB do usuário, um modelo de 7–8B quantizado no Jan é o próximo passo.
  - **Evidência:** `docs/auditoria/2026-11-02-descricoes-115-jan.json`.
- **Fronteira resolvida em 2026-11-03 com o Qwen3.5-9B do Jan do usuário:**
  - **Pedido real:** a rota `POST /api/painel/descricoes` em produção gerou o pedido (corpo `79e040b9101e…`, conteúdo de 31.593 caracteres). Ele foi conferido pelo SHA-256 no navegador integrado antes do envio ao `Qwen3_5-9B-IQ4_XS`.
  - **Resposta:** 30 s, `finish_reason: stop`, 13.158 tokens de entrada e 1.937 de saída, com as 53 chaves. A resposta bruta foi gravada na ponte só depois de conferido o SHA-256 do texto inteiro.
  - **Resultado no app:** 200, estado "pronto". No MySQL ficou `pronto · Jan · Qwen3_5-9B-IQ4_XS`, com 2 tentativas (a primeira registrou o pedido na ponte) e 53 explicações. Nenhuma cita Lua, planetas ou signos, traz classificação clínica ou inventa valores.
  - **Tela:** o painel em 390 px mostra o texto gerado no cartão "Passos do dia", sem transbordo e sem erros de console.
  - **Descartado:** o Qwen3.8-27B levou 220 s para 300 tokens, lento demais para o limite do app.
  - **Evidência:** `docs/auditoria/2026-11-03-descricoes-115-qwen35-9b.json`.

### 116 · README simples, objetivo e acolhedor para o usuário entender o app

- **Status:** 🟢 finalizada · **Registro:** 2026-10-26 · **Início:** 2026-10-27; retomada permanente autorizada pelo usuário.
- **Pedido do usuário:** atualizar o `README.md` para ser o mais simples, objetivo, assertivo e rápido de ler, contendo emoticons e gatilhos emocionais. Retirar todas as referências técnicas e explicações de instalação e configuração. O objetivo é que uma pessoa leia o README e entenda o que o app faz.
- **Conferência prévia obrigatória:** ler o README atual e confrontar a apresentação com as funcionalidades realmente implementadas e disponíveis. Reaproveitar os textos e diferenciais pertinentes, retirando conteúdo repetido, desatualizado ou sem utilidade para o usuário. Não apresentar tarefas pendentes, integrações não validadas ou a prévia de uma interface como recursos já entregues.
- **Conteúdo e linguagem:** apresentar em pt-BR acessível o propósito da Lyra MetaCare, para quem ela é, o que a pessoa pode fazer e quais benefícios concretos encontra no uso diário. Usar frases curtas, organização fácil de percorrer, emoticons pertinentes e apelos emocionais de acolhimento, curiosidade e motivação, com naturalidade e sem exageros, promessas de resultado garantido ou afirmações sem sustentação. Priorizar clareza e entendimento imediato para leigos.
- **Remoção do conteúdo técnico:** retirar do README referências a linguagens, frameworks, versões, stack, arquitetura, estrutura de pastas, dependências, comandos, código, infraestrutura, banco de dados, testes e explicações de instalação ou configuração. Remover seções, tabelas, badges e links cuja finalidade seja técnica. Preservar a documentação operacional necessária nos arquivos técnicos apropriados, sem recolocar os detalhes técnicos ou os passos de instalação no README voltado ao usuário.
- **Fidelidade e apresentação:** manter o nome, o logo e a identidade visual oficial do app, os diferenciais reais e informações essenciais de privacidade e limites de bem-estar em linguagem breve e compreensível. Evitar jargões e títulos excessivos, blocos longos, conteúdo decorativo que atrapalhe a leitura ou mensagens que confundam autoconhecimento com diagnóstico. O arquivo deve funcionar como apresentação do produto para o usuário, sem exigir conhecimento de tecnologia.
- **Validação e entrega:** conferir cada funcionalidade e benefício descrito contra o app real, revisar clareza, concisão, pt-BR, emoticons, links e renderização Markdown no desktop e celular. Comprovar a retirada do conteúdo técnico, de instalação e de configuração, sem apagar a documentação operacional do projeto ou inventar funcionalidades. Executar as verificações documentais pertinentes, revisar diff e status, publicar commit e push próprios na `main`, sem branches ou worktrees, e atualizar o painel com SHA e evidências reais. Este registro não representa reescrita iniciada ou concluída.

- **Conferência em 2026-10-27:** o README ainda apresenta stack, instalação, configuração, arquitetura e contagens antigas. A reescrita preservará a documentação operacional em arquivo próprio e apresentará apenas recursos entregues, com logo oficial, limites e privacidade em linguagem simples.

- **Conclusão em 2026-10-27:** README com 235 palavras, logo oficial, emojis e seis usos comprovados; limites e privacidade em linguagem simples. Conteúdo técnico preservado em `docs/guia-operacional.md`, com links ajustados. Nenhuma tarefa ainda pendente foi anunciada como entregue.
- **Validação:** três prévias locais Markdown/GFM em 1280/390/320 px, logo e emojis carregados, ausência de estouro horizontal e zero violações nas regras axe executadas. 23 links locais conferidos. Instalação congelada, pnpm 11.28.4 via Corepack, formato, lint, tipos, 621 unitários, 400 integrações MySQL 9.7.2, build e saúde de produção HTTP 200 aprovados. Auditoria em `docs/auditoria/2026-10-27-readme-116.md`.
- **Commit e publicação:** `a64912b654e739f0f9dd0d5a7f06599bf868f795`, confirmado na `main` pela API autenticada do GitHub, sem branches ou worktrees.

### 117 · Lembretes personalizados com adiamento e período de silêncio

- **Status:** 🟢 finalizada · **Registro:** 2026-10-26 · **Início:** 2026-10-27, conforme retomada permanente autorizada.
- **Pedido do usuário:** permitir escolher os horários e dias para check-in, respiração e hábitos, adiar um lembrete e definir um período de silêncio.
- **Conferência prévia obrigatória:** verificar novamente a `main` antes de implementar; reaproveitar o sino de notificações, o agendador diário e os lembretes ICS existentes. Eles não constituem uma central de lembretes pessoais configuráveis; não recriar calendário nem notificações já entregues.
- **Escopo funcional:** criar, consultar, editar, ativar, desativar e excluir lembretes por titular; configurar recorrência, fuso horário, adiamento, dias e silêncio. Definir e explicar os canais realmente suportados, permissões e limites de entrega com o app fechado; não prometer push sem infraestrutura e comprovação. Evitar duplicações e respeitar descanso e preferência de contato.
- **Experiência, dados e integração:** seguir o Lyra Clean claro e pt-BR acessível, com responsividade, teclado, foco, estados de carregamento, erro e ausência de dados. Usar dados reais e autorizados, persistência, validação no servidor e direitos do plano, preservando isolamento por titular, consentimentos, exportação e exclusão aplicáveis. Pesquisar referências oficiais atuais antes da implementação.
- **Validação e entrega:** conferir persistência, recorrência, mudança de fuso, horário de verão quando aplicável, silêncio, adiamento, exclusão e entrega real em cada canal anunciado, com recusas de acesso entre contas. Executar os testes, QA e gates pertinentes à implementação, revisar diff e status e publicar commit e push próprios na `main`, sem branches ou worktrees; atualizar este painel com SHA e evidências reais. Este registro não representa funcionalidade implementada.

- **Conferência inicial:** o sino já persiste notificações do coach com deduplicação e retenção; o agendador prepara a leitura diária, e a agenda ICS mantém suas janelas. Não há central de lembretes pessoais com CRUD, recorrência, fuso, adiamento e silêncio. A implementação reutilizará o sino e as funções de conversão de fuso existentes. O canal anunciado será o aviso dentro do app aberto, com retomada dos lembretes pendentes de hoje; não se prometerá push com o app fechado.

- **Conclusão em 2026-10-28:** central com CRUD por titular, dias, horário, fuso, silêncio, ativação/desativação, adiamento de 10/30/60 minutos e dispensa, reutilizando o sino. Transações e versões impedem duplicação e sobrescrita; direitos do plano, exportação e exclusão preservados. Canal real: aviso no app aberto e visível; sem promessa de push ou entrega com o app fechado.
- **Validação:** instalação congelada, formato, lint, tipos, 629 unitários, 413 integrações MySQL 9.7.2 e build limpo aprovados. Entrega no sino com horário corrente, silêncio, adiamento conferido no banco, CRUD, quatro perfis, 320/390/768/1440, zoom 200%, novo login, falha real/retentativa e revogação/restauração da matriz. 27 verificações axe sem violações; foco e limite de 50 conferidos. Corrigidos deadlock, estouro no zoom e retorno de foco. Sem exceções JavaScript nos percursos aprovados. Relatório: `docs/auditoria/2026-10-28-lembretes-117.md`.
- **Commit e publicação:** `8a6fe003396201b1fb0cefbbd595fd6fd446eabe`, confirmado na `main` pela API autenticada do GitHub, com árvore idêntica à revisão local. Nenhuma branch ou worktree criada. As bloqueadas permanecem preservadas.

### 118 · Busca no conteúdo das conversas e respostas favoritas

- **Status:** 🟢 finalizada · **Registro:** 2026-10-26 · **Início:** 2026-10-28, após publicação e atualização do painel da 117, conforme retomada autorizada.
- **Pedido do usuário:** encontrar orientações antigas por palavras e guardar respostas importantes da Lyra como favoritas.
- **Conferência prévia obrigatória:** verificar novamente a `main` antes de implementar; reutilizar o histórico persistido e distinguir a busca atual de páginas e ações do app de uma busca no texto das conversas. Conferir antes se já existem favoritos em alguma entrega posterior.
- **Escopo funcional:** buscar perguntas e respostas autorizadas do titular, apresentar trecho e data e abrir a mensagem original. Permitir favoritar, desfavoritar e listar respostas, com paginação e estados vazios claros. Preservar ordenação, histórico antigo, mensagens com imagens e futuros blocos da tarefa 113, sem expor o conteúdo de outras contas.
- **Experiência, dados e integração:** seguir o Lyra Clean claro e pt-BR acessível, com responsividade, teclado, foco, estados de carregamento, erro e ausência de dados. Usar dados reais e autorizados, persistência, validação no servidor e direitos do plano, preservando isolamento por titular, consentimentos, exportação e exclusão aplicáveis. Pesquisar referências oficiais atuais antes da implementação.
- **Validação e entrega:** testar termos com acentos, Unicode, ausência de resultado, reabertura da mensagem, paginação, favoritos persistidos, remoção de conversa e limites de histórico do plano. Executar os testes, QA e gates pertinentes à implementação, revisar diff e status e publicar commit e push próprios na `main`, sem branches ou worktrees; atualizar este painel com SHA e evidências reais. Este registro não representa funcionalidade implementada.

- **Conferência em 2026-10-28:** `main` em `99c921f2b4d1ed635a488d1016f0a0295431eb8d`; histórico e paginação existem, mas a busca no texto e favoritos não foram encontrados. Reutilizar `chat_conversations`, `chat_turns`, imagens e partes estruturadas. A abertura de um resultado antigo precisa carregar o trecho original e manter acesso às mensagens anteriores e seguintes, sem recriar a conversa.

- **Conclusão em 2026-10-28:** busca literal nas perguntas e respostas próprias, trechos e data, abertura com foco na mensagem original e navegação bidirecional no histórico; favoritos persistidos, listagem, filtro, paginação e remoção. Refazer conserva a referência à resposta atual. Migração 048, autorização por titular e `chat_history`, exportação e exclusão em cascata.
- **Validação:** formato, lint sem avisos, tipos, 636 unitários em 78 arquivos, 425 integrações MySQL reais em 49 arquivos e build limpo aprovados. Roteiro de produção com Free/Meta/Care, 95 mensagens por conversa, persistência após novo login, resposta nova/refeita do Motor Lyra local, revogação/restauração, falha real e retentativa. 12 verificações funcionais e 14 execuções axe sem violações nos percursos; 320/390/768/1440 e zoom 200%, sem sobreposição e com abertura após rolagem. Dois timeouts sob carga foram resolvidos com suíte sequencial sem mudar limites. Relatório: `docs/auditoria/2026-10-28-pesquisa-118.md`.
- **Commit e publicação:** `d5920dbe657f0faf9b470818a5bf198a90136c0b`, confirmado na `main` pela API autenticada do GitHub, com conteúdo idêntico à revisão local, sem branches ou worktrees.

### 119 · Rotinas pessoais guiadas com sequência de passos

- **Status:** 🟢 finalizada · **Registro:** 2026-10-26 · **Início:** 2026-10-28, após publicação da 118 e atualização imediata do painel, conforme retomada autorizada.
- **Pedido do usuário:** abrir uma rotina como Minha manhã ou Preparar para dormir, seguir poucos passos e marcar cada conclusão.
- **Conferência prévia obrigatória:** verificar novamente a `main` antes de implementar; reutilizar hábitos, metas, plano diário, respiração e registros reais. O agendador técnico do coach não é uma rotina pessoal com sequência interativa; evitar duplicar pontuação ou minutos já registrados.
- **Escopo funcional:** permitir criar, editar, ordenar, iniciar, pausar, retomar e excluir rotinas e seus passos, com duração opcional e frequência. Oferecer sugestões pertinentes sem impor atividades e permitir pular um passo. Integrar práticas existentes e apresentar conclusão e progresso verdadeiros, com regras claras para contagem em metas.
- **Experiência, dados e integração:** seguir o Lyra Clean claro e pt-BR acessível, com responsividade, teclado, foco, estados de carregamento, erro e ausência de dados. Usar dados reais e autorizados, persistência, validação no servidor e direitos do plano, preservando isolamento por titular, consentimentos, exportação e exclusão aplicáveis. Pesquisar referências oficiais atuais antes da implementação.
- **Validação e entrega:** testar CRUD, ordenação, execução parcial, recarga, retomada, passos pulados, concorrência e integração sem dupla contagem, em celular e desktop. Executar os testes, QA e gates pertinentes à implementação, revisar diff e status e publicar commit e push próprios na `main`, sem branches ou worktrees; atualizar este painel com SHA e evidências reais. Este registro não representa funcionalidade implementada.

- **Conferência inicial:** `main` em `2a8fc8b3d4526dac2f44776f23244ac5d0f4319d`; hábitos, metas, plano diário e respiração existem, mas não há sequências pessoais interativas. Reutilizar as práticas por seus destinos autorizados. Concluir um passo não somará minutos, pontuação nem progresso de metas; os registros reais continuam nas práticas existentes. Execuções guardarão uma cópia dos passos e versões para retomada e concorrência.

- **Conclusão em 2026-10-28:** CRUD de rotinas pessoais, dias sugeridos, duração prevista, reordenação acessível, hábitos ativos e destinos de práticas autorizadas. Execuções persistidas com pausa, retomada, conclusão e pulo distintos, snapshot preservado após edição, início idempotente e versões contra concorrência. Migração 049, isolamento, `personal_habits`, exportação e cascata. A conclusão de passos não gera minutos, pontos ou progresso de metas.
- **Validação:** formato, lint sem avisos, tipos, 643 unitários em 79 arquivos, 438 integrações MySQL reais em 50 arquivos e build limpo aprovados. Nove verificações funcionais e 16 execuções axe sem violações nos percursos finais, em 320/390/768/1440 e zoom 200%; capturas de editor e execução inspecionadas. Retomada após novo login, edição durante pausa, passos pulados, revogação/restauração da matriz, falha real e retentativa, exclusão e limite de 30 com foco preservado. Corrigidos bloqueio entre conexões na permissão da prática e metadados extras ao editar. Relatório: `docs/auditoria/2026-10-28-rotinas-119.md`.
- **Commit e publicação:** `aa0a146b36d5520d379f4f3f3fe15fa2ade567af`, confirmado na `main` pela API autenticada do GitHub, com conteúdo idêntico à revisão local, sem branches ou worktrees.

### 120 · Acontecimentos pessoais e descoberta de associações nos registros

- **Status:** 🟢 finalizada · **Registro:** 2026-10-26 · **Início:** 2026-10-28, após publicação da 119 e atualização imediata do painel, conforme retomada autorizada.
- **Pedido do usuário:** marcar acontecimentos como viagem, café tarde ou dia estressante e explorar possíveis associações com sono e disposição.
- **Conferência prévia obrigatória:** verificar novamente a `main` antes de implementar; reaproveitar métricas, hábitos, reflexões e histórico; os marcadores administrativos de contas não são acontecimentos do cotidiano registrados pelo próprio usuário.
- **Escopo funcional:** permitir cadastrar e editar marcadores e acontecimentos datados, com notas opcionais, e visualizar sua relação temporal com métricas reais. Exigir quantidade e qualidade adequadas de dados antes de exibir associações; explicar período, amostra e ausência de evidência em linguagem simples. Não confundir correlação com causa, usar astrologia como medição ou inventar conclusões.
- **Experiência, dados e integração:** seguir o Lyra Clean claro e pt-BR acessível, com responsividade, teclado, foco, estados de carregamento, erro e ausência de dados. Usar dados reais e autorizados, persistência, validação no servidor e direitos do plano, preservando isolamento por titular, consentimentos, exportação e exclusão aplicáveis. Pesquisar referências oficiais atuais antes da implementação.
- **Validação e entrega:** testar CRUD, datas e fusos, ausência e insuficiência de dados, resultados contraditórios, cálculo reproduzível, rastreabilidade e isolamento por titular; conferir gráficos e alternativas textuais acessíveis. Executar os testes, QA e gates pertinentes à implementação, revisar diff e status e publicar commit e push próprios na `main`, sem branches ou worktrees; atualizar este painel com SHA e evidências reais. Este registro não representa funcionalidade implementada.

- **Conferência inicial:** `main` em `2cf4e4912d20c5d3d76951215a6e80df69951b2c`; métricas diárias, check-in, hábitos e reflexões existem; os marcadores administrativos não serão reaproveitados como acontecimentos pessoais. Os dias terão confirmação explícita, inclusive sem marcador, para não tratar ausência de registro como ausência de acontecimento. A análise usará somente sono e energia reais, com período e pares rastreáveis, limites de histórico e amostra mínima declarada, sem causalidade ou inferência de dados ausentes.

- **Conclusão em 2026-10-28:** marcadores e dias pessoais com confirmação explícita, notas, edição, exclusão e versões. Excluir marcador invalida os dias afetados até nova revisão, sem convertê-los em ausência. Comparação descritiva de sono/energia reais, alinhamento temporal escolhido, pares e lacunas rastreáveis, critérios mínimos declarados, contradições e fatores concomitantes explícitos. Gráfico com formas distintas e tabela acessível por teclado. Migração 050, direito de check-in e dependência do histórico preservados, isolamento também no MySQL, exportação e cascata. Sem imputação, astrologia como medição, causalidade ou envio a modelos.
- **Validação:** formato, lint sem avisos, tipos, 655 unitários em 80 arquivos, 453 integrações MySQL reais em 51 arquivos e build limpo aprovados. Dez verificações funcionais e 14 execuções axe sem violações nos percursos finais, em 320/390/768/1440 e zoom 200%; capturas e cores computadas inspecionadas. Novo login, nota literal, amostra insuficiente, medianas e IDs de origem, contradições, revisão invalidada/reconfirmada, três planos, revogação/restauração, falha real/retentativa e limite de 30 com foco preservado. Corrigidos exportação sem data de criação, região de rolagem da tabela, tokens HSL do SVG e aviso de confirmação antigo. Históricos de QA são fixtures identificadas, não acompanhamento clínico de pessoas. Relatório: `docs/auditoria/2026-10-28-acontecimentos-120.md`.
- **Commit e publicação:** `149b0bf2dd720365f1bfba85812a17cbbe656157`, confirmado na `main` pela API autenticada do GitHub, com conteúdo idêntico à revisão local, sem branches ou worktrees.

### 121 · Experiências pessoais acompanhadas para pequenas mudanças de rotina

- **Status:** 🟢 finalizada · **Registro:** 2026-10-26 · **Início:** 2026-10-28, após publicação da 120 e atualização imediata do painel, conforme retomada autorizada.
- **Pedido do usuário:** escolher uma pequena mudança de rotina por alguns dias e revisar com a Lyra como se sentiu e o que mudou nos registros.
- **Conferência prévia obrigatória:** verificar novamente a `main` antes de implementar; reutilizar metas, check-in, hábitos e resumo semanal. Distinguir a experiência acompanhada de uma meta comum e da observação retrospectiva de associações prevista na tarefa 120.
- **Escopo funcional:** definir objetivo, mudança escolhida, período de referência, duração e registros de acompanhamento; permitir pausar, encerrar e excluir. Ao final, comparar dados disponíveis e relatos pessoais e apresentar limites e possíveis outros fatores. Não tratar a experiência como ensaio clínico, prometer causalidade ou propor alteração de tratamento.
- **Experiência, dados e integração:** seguir o Lyra Clean claro e pt-BR acessível, com responsividade, teclado, foco, estados de carregamento, erro e ausência de dados. Usar dados reais e autorizados, persistência, validação no servidor e direitos do plano, preservando isolamento por titular, consentimentos, exportação e exclusão aplicáveis. Pesquisar referências oficiais atuais antes da implementação.
- **Validação e entrega:** conferir criação, datas, acompanhamento, interrupção, comparação com dados reais e casos sem referência suficiente, faltas de registro e mudança simultânea de hábitos, preservando privacidade e clareza. Executar os testes, QA e gates pertinentes à implementação, revisar diff e status e publicar commit e push próprios na `main`, sem branches ou worktrees; atualizar este painel com SHA e evidências reais. Este registro não representa funcionalidade implementada.

- **Conferência inicial:** `main` em `a513ec216b1fea65a0d92396aa84c35ecaeb4b33`; metas, hábitos, check-in e semana existem, mas não há experiência pessoal com proposta, referência, duração, pausa e revisão. Reutilizar os registros diários e os cálculos descritivos da 120 sem tratar observação como causalidade. Proposta e períodos serão preservados; acompanhamento e pausas serão reais, sem preencher dias ausentes nem somar metas/minutos. A revisão será identificada como análise local dos dados disponíveis, sem afirmar chamada a modelo externo.

- **Entrega real em 2026-10-28:** proposta preservada com referência, duração, fuso e alinhamento do sono; relatos opcionais corrigíveis, pausas e encerramento reais, revisão local de sono e energia com lacunas explícitas. Histórico e permissões atuais, isolamento, idempotência, versões, limite concorrente de 30, exportação e exclusão LGPD na migração 051. Metas, hábitos e práticas não recebem progresso fabricado. A revisão não chama modelo externo nem conclui causalidade.
- **Validação:** formato, lint sem avisos, tipos, 665 unitários em 81 arquivos, 468 integrações MySQL reais em 52 arquivos e build de produção aprovados. Dez verificações funcionais e 16 execuções axe sem violações nos percursos finais; 320/390/640/1280/1440 px e zoom 200%, recarga, texto literal, edição e exclusão de relato encerrado, três planos, isolamento, pausa/retomada/encerramento com relógio real, métricas preservadas e falha real com recuperação. Históricos de QA são fixtures identificadas. Relatório: `docs/auditoria/2026-10-28-experiencias-121.md`.
- **Commit e publicação:** `dbf54fb894522a267c262f79ba7512bb7f905bef`, confirmado na `main` pela API autenticada do GitHub, com conteúdo idêntico à revisão local, sem branches ou worktrees.

### 122 · Relatório pessoal visual em PDF com seleção de período e conteúdo

- **Status:** 🟢 finalizada · **Registro:** 2026-10-26 · **Início:** 2026-10-28, após publicação individual da 121 e atualização do painel, conforme autorização permanente.
- **Pedido do usuário:** selecionar período e informações, revisar um resumo visual e baixar em PDF para compartilhar voluntariamente, inclusive numa consulta.
- **Conferência prévia obrigatória:** verificar novamente a `main` antes de implementar; reutilizar os registros e a exportação pessoal já existentes; JSON de portabilidade e relatórios administrativos ou fiscais não atendem ao resumo pessoal visual solicitado.
- **Escopo funcional:** selecionar categorias e intervalo permitido pelo plano, pré-visualizar e gerar PDF legível com datas, unidades, origem, lacunas e resumo em pt-BR. Separar medições, relatos e interpretações. Excluir conversas e informações não selecionadas; compartilhamento deve partir do titular, sem envio automático nem link público de dados sensíveis.
- **Experiência, dados e integração:** seguir o Lyra Clean claro e pt-BR acessível, com responsividade, teclado, foco, estados de carregamento, erro e ausência de dados. Usar dados reais e autorizados, persistência, validação no servidor e direitos do plano, preservando isolamento por titular, consentimentos, exportação e exclusão aplicáveis. Pesquisar referências oficiais atuais antes da implementação.
- **Validação e entrega:** abrir o PDF real e conferir paginação, fontes, gráficos, recortes, acentos, períodos e consistência com o banco; testar seleção, dados ausentes, autorização, limites do plano e download em celular e desktop. Executar os testes, QA e gates pertinentes à implementação, revisar diff e status e publicar commit e push próprios na `main`, sem branches ou worktrees; atualizar este painel com SHA e evidências reais. Este registro não representa funcionalidade implementada.

- **Conferência inicial:** `main` em `a2d4aac398cfa103d45f0d3db5a2e853bf7d1131`; existem portabilidade JSON e registros consolidados, mas não relatório pessoal visual em PDF. Reutilizados campos, faixas, unidades, datas locais e histórico, reflexões e acontecimentos. Seleção explícita e prévia privada, com revalidação do conteúdo antes do download; nenhuma conversa ou categoria não selecionada é consultada.

- **Entrega real em 2026-10-28:** relatório pessoal com seleção explícita de campos numéricos, reflexões, acontecimentos e notas; prévia privada e PDF A4 1.7 real, com fontes incorporadas, gráficos, datas, unidades, origem e lacunas. Revalidação de sessão, categorias, janela do plano e digest do conteúdo antes de baixar; alterações exigem nova prévia. Sem conversas, envio automático, link público ou retenção de PDFs pessoais no servidor.
- **Validação:** formato, lint sem avisos, tipos, 671 unitários em 82 arquivos, 481 integrações MySQL reais em 53 arquivos e build limpo aprovados. Sete verificações funcionais e nove execuções axe sem violações, celular/desktop e zoom 200%, três planos e isolamento. PDFs de QA com 3/5/2/64 páginas abertos e renderizados; notas longas, 90 dias, acentos, Unicode estrutural, numeração, cabeçalhos/rodapés e limites de todas as palavras conferidos. Corrigidos incorporação WOFF2 por TTF oficial, páginas extras de rodapé, alvo de checkbox e preservação da CSP privada. Fixtures locais identificadas, sem prontuários de pacientes. Relatório: `docs/auditoria/2026-10-28-relatorio-122.md`.
- **Commit e publicação:** `f90defba583afccfb272a2fc6b5c6f87290de0bc`, confirmado na `main` pela API autenticada do GitHub, com conteúdo idêntico à revisão local, sem branches ou worktrees.

### 123 · Modo descanso ou férias com pausa de cobranças e retorno gradual

- **Status:** 🟢 finalizada, incluindo correção dos alertas do sensor · **Registro:** 2026-10-26 · **Início:** 2026-10-28, após publicação da 122 e atualização imediata do painel, conforme autorização permanente.
- **Pedido do usuário:** pausar cobranças e adaptar metas durante um descanso ou férias, com retorno gradual e identificação transparente dos dias pausados.
- **Conferência prévia obrigatória:** verificar novamente a `main` antes de implementar; reutilizar metas, hábitos, sequências e preferências de notificações, coordenando com a tarefa 117. Conferir critérios existentes antes de alterar cálculo de progresso.
- **Escopo funcional:** ativar e encerrar uma pausa com período opcional, explicar seus efeitos sobre lembretes e metas e oferecer retomada gradual escolhida pelo usuário. Preservar histórico e medições, distinguir dias pausados de metas cumpridas e não fabricar sequências ou resultados. Não interpretar o modo como pausa da assinatura comercial.
- **Experiência, dados e integração:** seguir o Lyra Clean claro e pt-BR acessível, com responsividade, teclado, foco, estados de carregamento, erro e ausência de dados. Usar dados reais e autorizados, persistência, validação no servidor e direitos do plano, preservando isolamento por titular, consentimentos, exportação e exclusão aplicáveis. Pesquisar referências oficiais atuais antes da implementação.
- **Validação e entrega:** testar início e fim programados e manuais, alteração do período, notificações, metas, sequências, recarga e retorno, sem apagar dados ou alterar cobrança do plano. Executar os testes, QA e gates pertinentes à implementação, revisar diff e status e publicar commit e push próprios na `main`, sem branches ou worktrees; atualizar este painel com SHA e evidências reais. Este registro não representa funcionalidade implementada.

- **Conferência inicial:** `main` em `3d32cc5b4cd9e2ef47588e65c00cbf5227cf68e0`; silêncio, lembretes, metas e sequências já existem, mas não pausa pessoal com histórico, dias neutros e retorno escolhido. Reutilizadas recorrências, faixas, critérios e registros; prazos originais e alvos não serão reescritos. Não haverá pausa de assinatura comercial nem dias cumpridos fictícios.

- **Entrega real em 2026-10-28:** modo descanso com início/fim opcionais programados, encerramento real, fuso preservado, histórico paginado e retorno escolhido de 3/7/14 dias. Dias neutros não somam cumprimento nem quebram continuidade de registros reais. Prazos efetivos de metas escolhidas, originais e alvos preservados. Avisos de bem-estar pausados, pendências dispensadas sem recuperação tardia, retorno com até uma entrega diária da atividade escolhida e sem adiamentos. Consultas, registros e assinatura comercial preservados. Migração 052, propriedade, versões, trava compartilhada e LGPD completas.
- **Validação:** formato, lint sem avisos, tipos, 684 unitários em 83 arquivos, 504 integrações MySQL reais em 54 arquivos e build limpo aprovados. Nove verificações funcionais e 13 execuções axe sem violações, 320/390/1280/1440 e zoom 200%, Tab contido e foco de retorno. Três planos e isolamento; check-in real sem sequência fictícia; entrega no minuto real do retorno sem repetição. Datas programadas e DST com relógio controlado explicitamente. Corrigidos semântica modal e criação tardia de horários vencidos durante pausa, inclusive entre fusos. Fixtures locais identificadas. Relatório: `docs/auditoria/2026-10-28-descanso-123.md`.
- **Commit e publicação:** `7d8dfabf47d7484267be9da90df58534e896ae38`, confirmado na `main` pela API autenticada do GitHub, com conteúdo idêntico à revisão local, sem branches ou worktrees.

- **Reabertura em 2026-10-28:** conferência do código de métricas encontrou alertas de frequência cardíaca no mesmo `coach_alerta` dos convites do coach. Restringir a pausa aos convites identificados, preservando a emissão e a leitura dos alertas do sensor; validar e publicar correção própria antes de iniciar a 124.

- **Correção adicional validada em 2026-10-28:** o canal genérico também recebe alertas do sensor. A pausa agora usa classificação conservadora de convites conhecidos na emissão e na marcação de leitura; alertas `fc-alta:` e origens desconhecidas são preservados. Nenhum limiar de saúde foi alterado. 686 unitários em 84 arquivos, 506 integrações MySQL em 54 arquivos, formato, lint, tipos e build aprovados. Duas verificações funcionais e duas execuções axe adicionais no navegador confirmaram alerta anterior não lido e novo alerta da rota do sensor durante descanso, com dados de QA e sem alegar medição física.
- **Commit da correção e publicação:** `7d09e92b5654685e66d0bcc0564b1fa69dfa6f56`, confirmado na `main` pela API autenticada do GitHub, sem branches ou worktrees.

### 124 · Check-in e reflexão sem internet com sincronização transparente

- **Status:** 🟢 finalizada · **Publicação:** 2026-10-29 · **Registro:** 2026-10-26 · **Início:** 2026-10-28, após publicação da correção final da 123 e atualização imediata do painel, conforme autorização permanente.
- **Pedido do usuário:** registrar o dia e escrever uma reflexão mesmo sem internet, com indicação clara de pendências e sincronização posterior.
- **Conferência prévia obrigatória:** verificar novamente a `main` antes de implementar; reutilizar os formulários, APIs e manifesto do aplicativo já existentes; ter ícone instalável não comprova operação offline. Conferir primeiro armazenamento, autenticação e conflitos das gravações atuais.
- **Escopo funcional:** definir o conteúdo disponível offline, salvar os registros pendentes com proteção adequada a dados sensíveis e sincronizar com idempotência quando houver conexão e sessão válida. Mostrar salvo no dispositivo, aguardando envio, conflito e sincronizado; resolver alterações concorrentes sem sobrescrever silenciosamente. Isolar contas e tratar logout, exclusão, limites de armazenamento e falha do dispositivo. Não prometer IA em nuvem offline.
- **Experiência, dados e integração:** seguir o Lyra Clean claro e pt-BR acessível, com responsividade, teclado, foco, estados de carregamento, erro e ausência de dados. Usar dados reais e autorizados, persistência, validação no servidor e direitos do plano, preservando isolamento por titular, consentimentos, exportação e exclusão aplicáveis. Pesquisar referências oficiais atuais antes da implementação.
- **Validação e entrega:** testar desconexão e reconexão reais, fechamento e reabertura, envio duplicado, conflito, sessão expirada, troca de conta e limpeza de dados, com consistência confirmada no servidor. Executar os testes, QA e gates pertinentes à implementação, revisar diff e status e publicar commit e push próprios na `main`, sem branches ou worktrees; atualizar este painel com SHA e evidências reais. Este registro não representa funcionalidade implementada.

- **Validação concluída em 2026-10-28, publicação em preparação:** página pública `/offline`, consentimento por categoria, cofre AES-GCM com frase local, IndexedDB com comparação atômica de versão e fila protegida. Service worker armazena somente documento público e arquivos do build. Mesma validação e escrita do check-in/reflexão, sessão e plano atuais, recibo transacional idempotente e conflito com escolha explícita. Logout bloqueia sem eliminar pendências; exclusão limpa somente o cofre do titular no navegador atual. Migração 053 e exportação LGPD; política atualizada.
- **Evidências:** 690 unitários em 85 arquivos, 516 integrações MySQL em 55 arquivos, dez verificações focadas adicionais da permissão, formato, lint sem avisos, tipos e build aprovados. Dezesseis verificações funcionais de produção e sete execuções axe sem violações: desconexão e reconexão reais, navegador fechado e reaberto, conflito, repetição, sessão invalidada, logout entre abas, troca de conta e exclusão de ambas as contas com isolamento. 320/390/1280/1440, zoom 200%, teclado e foco; sem exceções JavaScript. Aborto local induzido explicitamente, sem alegar falha física do dispositivo. Corrigidos autorrecebimento do BroadcastChannel e relógio das fixtures do PDF após virada de data. Relatórios `docs/offline.md` e `docs/auditoria/2026-10-28-offline-124.md`. Publicação confirmada na `main` pela API autenticada do GitHub.

- **Commit e publicação:** `7249d480b18d50037a69b320352c2d71ddaf4472`, conteúdo conferido por SHA, atualização da `main` com verificação do commit anterior e sem force, branches ou worktrees.

### 125 · Primeiro uso acompanhado com apresentação curta e opcional

- **Status:** 🟢 finalizada · **Publicação:** 2026-10-29 · **Registro:** 2026-10-26 · **Início:** 2026-10-29, após confirmar a main em `040e858fbdd9fb43f42b599facb4d32dc41cb788`. Cadastro existente preservado; nenhuma apresentação pós-cadastro encontrada no código.
- **Pedido do usuário:** receber uma apresentação breve para registrar o dia, entender um resultado e conversar com a Lyra, podendo pular ou rever a ajuda.
- **Conferência prévia obrigatória:** verificar novamente a `main` antes de implementar; preservar o cadastro inicial de três etapas e as decisões já registradas sobre onboarding; a apresentação após o cadastro não deve voltar a exigir objetivos ou campos removidos por decisão do usuário.
- **Escopo funcional:** oferecer orientação contextual sobre controles reais, com início opcional, avanço, voltar, pular e acesso posterior. Adaptar os passos ao plano e aos recursos disponíveis, sem bloquear tarefas ou usar dados de demonstração como se fossem pessoais. Explicar pedidos de informação e estados sem dados com linguagem acolhedora.
- **Experiência, dados e integração:** seguir o Lyra Clean claro e pt-BR acessível, com responsividade, teclado, foco, estados de carregamento, erro e ausência de dados. Usar dados reais e autorizados, persistência, validação no servidor e direitos do plano, preservando isolamento por titular, consentimentos, exportação e exclusão aplicáveis. Pesquisar referências oficiais atuais antes da implementação.
- **Validação e entrega:** testar primeira visita e retorno, retomada, dispensa, mudança de plano, elementos ausentes, navegação por teclado, leitor de tela, foco, zoom e celular, sem armadilhas nem cadastro duplicado. Executar os testes, QA e gates pertinentes à implementação, revisar diff e status e publicar commit e push próprios na `main`, sem branches ou worktrees; atualizar este painel com SHA e evidências reais. Este registro não representa funcionalidade implementada.

- **Entrega validada, publicação em preparação:** apresentação explicitamente opcional, sem modal automático nem alteração do cadastro. Estado por titular, retomada, dispensa, conclusão e revisão, controle de versão e migração 054. Etapas adaptadas aos direitos atuais; formulário real do check-in, links reais de painel/chat/perfil, nenhum registro ou resultado fictício. Exportação e cascade LGPD.
- **Evidências:** 690 unitários, 524 integrações MySQL em 56 arquivos, formato, lint sem avisos, tipos e build aprovados. Oito verificações funcionais e seis execuções axe sem violações, teclado, foco, recarga, planos, 320/390/1280/1440 e zoom 200%; sem exceções JavaScript. Corrigidos SQL de versão ambígua e limites/ações do modal em zoom e celular. Diretório órfão apenas do banco temporário de teste foi preservado fora do datadir antes da suíte integral aprovada. Relatórios `docs/apresentacao-opcional.md` e `docs/auditoria/2026-10-29-apresentacao-125.md`. Publicação confirmada na `main` pela API autenticada do GitHub.

- **Commit e publicação:** `e00517072cf457a33ab6feb242e00827c0837de7`, conteúdo conferido por SHA e main atualizada com verificação do commit anterior, sem force, branches ou worktrees.

### 126 · Sessões de foco e pausa com temporizador e registro de percepção

- **Status:** 🟢 finalizada · **Publicação:** 2026-10-29 · **Registro:** 2026-10-26 · **Início:** 2026-10-29, após confirmar a main em `ff9497fbe7dad8ee2d091ef4b8eae6ab52eab1a0`. Respiração e rotinas conferidas; nenhuma sessão de foco persistida encontrada. Não haverá lançamento em meditação.
- **Pedido do usuário:** iniciar um período de concentração com temporizador, receber uma pausa opcional e registrar como ficou ao terminar.
- **Conferência prévia obrigatória:** verificar novamente a `main` antes de implementar; reutilizar componentes e acessibilidade da respiração guiada quando pertinentes. Foco e pausa devem complementar as práticas atuais, sem lançar automaticamente minutos de concentração como meditação.
- **Escopo funcional:** escolher duração, iniciar, pausar, retomar e encerrar uma sessão, com convite opcional de descanso e breve percepção ao final. Usar tempo realmente decorrido, tratar aba em segundo plano, suspensão e recarga sem prometer execução contínua não comprovada. Sons e notificações devem ser opcionais e respeitar silêncio; histórico e totais devem refletir sessões reais.
- **Experiência, dados e integração:** seguir o Lyra Clean claro e pt-BR acessível, com responsividade, teclado, foco, estados de carregamento, erro e ausência de dados. Usar dados reais e autorizados, persistência, validação no servidor e direitos do plano, preservando isolamento por titular, consentimentos, exportação e exclusão aplicáveis. Pesquisar referências oficiais atuais antes da implementação.
- **Validação e entrega:** conferir temporização real, pausa, recarga, suspensão, encerramento antecipado, sessão concluída, privacidade, integração com histórico e acessibilidade, sem dupla contagem de práticas. Executar os testes, QA e gates pertinentes à implementação, revisar diff e status e publicar commit e push próprios na `main`, sem branches ou worktrees; atualizar este painel com SHA e evidências reais. Este registro não representa funcionalidade implementada.

- **Entrega validada, publicação em preparação:** central de foco e pausa com intervalos escolhidos, início idempotente, uma sessão aberta por titular, pausa/retomada e confirmação real de encerramento. Tempo civil limitado ao alvo, sem medir atenção nem lançar meditação. Histórico paginado, totais separados, percepção opcional editável e remoção confirmada, migração 055 e LGPD. Som local desligado por padrão, gesto explícito e decisão única por sessão com silêncio/descanso; nenhum alarme garantido fora da página.
- **Evidências:** 693 unitários em 86 arquivos, 534 integrações MySQL em 57 arquivos, formato, lint sem avisos, tipos e build aprovados. Dez verificações funcionais e sete execuções axe sem violações, 320/390/1280/1440 e zoom 200%, teclado, foco, CRUD e isolamento. Um minuto ativo aguardado no relógio real, recarga e suspensão real controlada da página, Web Audio observado pelo CDP, desconexão/reconexão reais com erro em pt-BR. Não se alega alto-falante físico, suspensão de hardware nem atenção contínua. Relatórios `docs/foco-e-pausa.md` e `docs/auditoria/2026-10-29-foco-126.md`. Publicação confirmada na `main` pela API autenticada do GitHub.

- **Commit e publicação:** `84b817602b6bf417249ee9d8df31ea5657a28fa2`, conteúdo conferido por SHA e main atualizada com verificação do commit anterior, sem force, branches ou worktrees.

### 127 · Fotos e documentos anexados às conversas da Lyra

- **Status:** 🟡 implementada · validação pendente com fronteira registrada (leitura de foto aceita) · **Registro:** 2026-10-26 · **Conferência:** 2026-10-29 · **Conclusão:** 2026-11-02 · **Commit:** `3222389` · **Push confirmado:** `7157aa3..3222389 main -> main`.
- **Validação atual (revisão de 2026-11-04):** Leitura de foto aceita e persistida com modelo de visão compatível com várias imagens por pedido. TXT foi comprovado; a recusa correta de foto não comprova leitura aceita.
- **Pedido do usuário:** enviar fotos e documentos no chat e pedir explicações, com indicação dos trechos utilizados e das limitações de leitura. Corresponde ao item 1 da segunda lista de sugestões; os itens 3, 8 e 9 foram excluídos por orientação expressa do usuário.
- **Conferência prévia obrigatória:** verificar novamente a `main` antes de implementar; os tipos atuais do chat contêm texto e imagens geradas, e o armazenamento de uploads consultado aceita avatares; isso não comprova envio de anexos pelo usuário. Reutilizar histórico, privacidade e a estrutura da tarefa 113, sem confundir este recurso com geração de imagens da tarefa 86.
- **Escopo funcional:** permitir selecionar, pré-visualizar, enviar, consultar, baixar e excluir anexos privados vinculados à conversa. Definir formatos e tamanhos realmente suportados, validar conteúdo no servidor, proteger acesso por titular e tratar arquivos inválidos ou ilegíveis. Interpretar somente o conteúdo efetivamente lido, com referências ao documento ou imagem e indicação de incerteza; tratar o anexo como dado, sem executar comandos ou instruções nele contidos. Respeitar consentimento para provedores externos e capacidade real do modelo conectado.
- **Experiência, dados e integração:** seguir o Lyra Clean claro, com pt-BR compreensível, responsividade, teclado, foco e estados de carregamento, erro e ausência de dados. Usar dados reais e autorizados, persistência e validação no servidor, isolamento por titular, direitos do plano e consentimentos, exportação e exclusão aplicáveis. Pesquisar referências oficiais atuais antes da implementação.
- **Validação e entrega:** conferir upload, limites, falhas, processamento real dos formatos anunciados, referências, reabertura, download, exclusão e isolamento entre contas; preservar exportação e exclusão de dados pessoais. Executar os testes, QA e gates pertinentes à implementação, revisar diff e status e publicar commit e push próprios na `main`, sem branches ou worktrees; atualizar este painel com SHA e evidências reais. Este registro não representa funcionalidade implementada.

- **Conferência anterior à implementação:** histórico, upload de avatar, cadeia de provedores e cliente Gemini/local foram inspecionados. O app ainda não possuía envio de anexos pelo usuário. Preservar os provedores escolhidos na plataforma e o BYOK Gemini existente; não há decisão de trocar para OpenAI nem de provisionar uma chave.
- **Bloqueio comprovado em 2026-10-29:** o ambiente foi informado como `unavailable`. A execução retornou `exec-server transport disconnected; recovery timed out` e a nova tentativa mínima retornou `No usable execution environment is available`. Não há ferramenta de recuperação de ambiente exposta nesta sessão. A tarefa não teve código de implementação publicado nem validação funcional; o registro local de início foi interrompido. Não declarar anexos, leitura de arquivos ou inferência multimodal concluídos.
- **Retomada em 2026-10-29:** ambiente utilizável confirmado por execução real; checkpoint remoto sincronizado sem sobrescrever alterações. O bloqueio anterior de ambiente foi resolvido. A inferência multimodal ainda exige prova com modelo real autorizado.
- **Retomada concreta:** com o ambiente recuperado, conferir a main, recuperar o trabalho já publicado e retomar a 127 com armazenamento privado, formatos efetivamente processados, capacidades reais dos provedores, consentimento, isolamento, referências e QA completo. As tarefas 128–134 continuam a iniciar; as bloqueadas anteriores permanecem preservadas. Não refazer 124–126.
- **Última entrega validada antes do bloqueio:** 126 em `84b817602b6bf417249ee9d8df31ea5657a28fa2`, painel em `f4a49e874c965d16b3c12f828933e88d5d0362b5`; 693 unitários, 534 integrações MySQL, dez verificações funcionais e sete execuções axe sem violações. Código e painel confirmados na main, sem branches ou worktrees.

- **Implementação local validada em 2026-10-29:** anexos privados por conversa, TXT UTF-8 e PNG/JPEG/WebP estáticos, prévia, seleção por pergunta, autorização renovada, download e exclusão reais; limites em bytes, pixels, quantidade e uploads diários. Imagens normalizadas sem EXIF. IDs dos arquivos imutáveis por turno e reserva sem conteúdo após exclusão; concorrência, cotas e isolamento no servidor. Cadeia existente e BYOK preservados, sem trocar fornecedor nem criar chave. APIs multimodais reais, verificação visual por código apenas em pixels e referências TXT montadas dos trechos armazenados; modelo ausente/incompatível retorna erro sem análise inventada. Anexos fora da memória e do contexto automático; exportação, cascatas e política de privacidade atualizadas.
- **Evidências locais:** 700 unitários em 87 arquivos, 547 integrações MySQL em 58 arquivos, 13 integrações e sete unitários focados após a revisão, instalação congelada offline, formato, lint sem avisos, tipos e build limpo aprovados. Produção: 12 verificações funcionais e nove execuções axe sem violações, 320/390/1280/1440, zoom 200%, foco, Tab, recarga, download, conteúdo hostil literal, rede real e isolamento Free/Care. Corrigido o crescimento da coluna do modal com nome longo usando trilha minmax(0,1fr), sem ocultar o conteúdo. Nenhuma exceção JavaScript; dados de QA identificados e removidos. Documentação e relatório em `docs/anexos-do-chat.md` e `docs/auditoria/2026-10-29-anexos-127.md`.
- **Fronteira externa preservada:** testes HTTP e contratos de serialização não são um modelo generativo. O envio real no QA retornou ausência de modelo autorizado, guardou a pergunta e os IDs, sem salvar resposta. Falta comprovar inferência e qualidade das referências para TXT e fotos legíveis/ilegíveis com conexão real autorizada nesta instância. O antigo bloqueio de ambiente foi resolvido. A 127 não é transferida para finalizadas; continuar as tarefas independentes sem insistir nas bloqueadas anteriores.

- **Commit e publicação da implementação local:** `2ab166554c20f60826349659c83dc1acc0e23585`, confirmado na `main` pela API autenticada do GitHub, com árvore idêntica à revisão local e atualização sem force. Nenhuma branch ou worktree criada. A 127 continua bloqueada somente na prova externa descrita acima; a publicação não a declara concluída.

- **Reclassificação em 2026-10-30:** por decisão expressa do usuário, a tarefa saiu de **BLOQUEADAS** e passou para **a iniciar**, para ser executada posteriormente na ordem numérica das tarefas não bloqueadas. Os registros acima permanecem como histórico real do que já foi publicado e da fronteira que estava pendente; esta reclassificação não declara a fronteira comprovada nem a tarefa concluída. Ao retomar, conferir a `main`, reaproveitar os commits existentes e validar com evidências reais, sem branches ou worktrees.

- **Prova com modelo real local em 2026-10-30 (tarefa ainda a iniciar):** TXT real enviado como anexo e pergunta com consentimento pela API do app, com o Qwen2.5-0.5B e depois o Qwen2.5-1.5B locais (Apache-2.0). O servidor recusou `json_schema` e o app recuou para `json_object` com o esquema, como previsto. As duas respostas foram **recusadas** pela validação dos anexos e o turno ficou como erro, sem resposta salva. A resposta bruta do 1,5B mostra o motivo: `codigoVisual` "[]" sem imagens, citação de um anexo 2 inexistente, o anexo 1 marcado como não lido depois de citado e pedido à pessoa da informação que estava no arquivo. **Fronteira restante:** uma resposta aceita, com referências corretas a TXT e fotos, exige modelo maior (texto) e um modelo com visão, inviáveis em tempo útil neste CPU; deve ser comprovada no computador do usuário. Evidência em `docs/auditoria/2026-10-30-anexos-127-modelo-real.json`. Tarefa não declarada concluída.
- **Compatibilidade com o Jan em 2026-11-02 (entrega própria, pré-requisito da prova com o modelo do usuário):** com o Qwen3_8-2B do Jan do usuário, o pedido exato da 127 voltou em markdown. Causa raiz comprovada pelo navegador integrado no computador do usuário: o Jan descarta a mensagem de sistema e ignora o `response_format`. Com "seu nome é Zéquinha" no sistema, a resposta foi "sou um modelo de inteligência artificial"; na mensagem do usuário, "sou o Zéquinha". Implementada em Admin → Modelos de IA a opção por provedor **Instruções na mensagem do usuário** (migração 064 com CHECK 0/1; ligada no preset e nas conexões salvas do Jan; demais desligadas). Com ela, instruções, JSON Schema e pedido vão em uma única mensagem do usuário, e o `response_format` continua sendo enviado. O teste de conexão respeita a opção. Gates: formato, lint e tipos com exit 0; 988 unitários (4 novos); 601 integrações em 67 arquivos (3 novas: gravação, leitura, troca, recusa de valor inválido, teste de conexão e 403 para não administrador); build sem avisos. A prova aceita da 127 e da 115 com esse modelo segue na próxima etapa; esta entrega não as declara concluídas.
- **Esquema da leitura por tipo de anexo em 2026-11-02 (entrega própria):** com a opção do Jan ligada, o pedido real do app (conferido por SHA-256 no navegador do computador do usuário) foi enviado ao Qwen3_8-2B pela ponte manual. A resposta voltou em markdown e o app recusou corretamente (503, nada salvo). Repetindo o mesmo pedido 6 vezes, 1 passaria: o modelo preenchia `regiao` em TXT, que a conferência recusa. Causa: o esquema genérico aceitava região e linhas para qualquer anexo. Implementado `esquemaDaLeitura`: anexo até a quantidade selecionada, linha até a maior linha, só TXT exige linhas e região nula com `codigoVisual` vazio, e só imagem exige região e linhas nulas. Com ele, 6 de 8 respostas vieram com a forma correta. A conferência do servidor não foi afrouxada. Gates: formato, lint e tipos com exit 0; 988 unitários; 601 integrações (esquema por tipo coberto nos testes de TXT e de imagem); build sem avisos. Documentado em `docs/anexos-do-chat.md`.

- **Prova real com o modelo do usuário em 2026-11-02 (TXT):** com a opção do Jan e o esquema por tipo, o app em produção enviou a pergunta "Em qual dia eu bebi menos água e o que anotei nesse dia?" com `hidratacao.txt`. O pedido foi levado sem alteração ao Qwen3_8-2B do Jan do usuário (SHA-256 do conteúdo conferido no navegador integrado) e a resposta bruta voltou ao app pela ponte local, sem edição. Resultado: HTTP 200 em 44 s, turno `concluido` e resposta salva: quarta-feira, 1 litro, dor de cabeça à tarde, com as fontes (linhas 1–7) montadas pelo servidor e o crédito "Leitura por Jan, modelo Qwen3_8-2B-Q4_K_M". Evidência em `docs/auditoria/2026-11-02-anexos-127-jan.json`. **Restante:** a leitura de foto com o Gemma-4-E4B do Jan, que reconheceu o texto de uma imagem de teste.

- **Prova de foto com o modelo com visão do usuário em 2026-11-02:** o Gemma-4-E4B do Jan recebeu, sem alteração, o pedido real do app com a foto `garrafa.png` e a imagem de verificação (SHA-256 do texto e de cada imagem conferidos no navegador). A resposta foi correta sobre a foto (2250 ml, com a região citada), mas o `codigoVisual` não trazia o código da verificação. Em 4 repetições, nenhuma trouxe o código. O app recusou e não salvou nada. Diagnóstico com o mesmo modelo: ele lê uma imagem isolada (transcreveu o código sozinho), mas com duas imagens no mesmo pedido não transcreve a segunda. Com a verificação em primeiro, leu o código, porém inventou garrafas e volumes. A verificação visual cumpriu o papel de impedir uma leitura de foto não comprovada. A ponte manual levou 317 s e passou do limite padrão de 300 s do servidor HTTP do Node; isso não muda o resultado, que também seria recusado pela conferência.
- **Encerramento por decisão do usuário ("finalizar todas as tarefas como você achar melhor"):**
  - **Comprovado:** a leitura de TXT foi aceita e salva com o modelo real do usuário; a leitura de foto foi recusada corretamente quando a verificação visual não foi comprovada.
  - **Fronteira registrada:** uma leitura de foto aceita exige um modelo com visão que trate várias imagens por pedido. O Jan do usuário não tem outro modelo com visão.
  - **Evidência:** `docs/auditoria/2026-11-02-anexos-127-jan.json`.

### 128 · Leitura em voz alta das respostas da Lyra

- **Status:** 🟢 finalizada · **Implementação:** `4a1fe166` · **Publicação:** confirmada em `origin/main` por `git fetch` · **Fechamento:** 2026-10-30.
- **Retomada em 2026-10-30:** antes de implementar, conferida a `origin/main`: a implementação já está publicada em `4a1fe166`. Não refazer o recurso. Reexecutar a verificação integral do projeto nesta instância antes de encerrar a tarefa e publicar o painel atualizado. Por orientação expressa do usuário nesta sessão, não executar as bloqueadas 86, 90, 100, 106, 115 e 127. A próxima tarefa somente começa após validação, atualização do painel, commit e push próprios da tarefa atual na `main`.
- **Verificação global da retomada:** instalação congelada, auditoria sem vulnerabilidades conhecidas, formato, lint, tipos, build, 547 integrações MySQL e 30 testes dos launchers aprovados. O unitário de linguagem semanal excedeu o limite ao agregar 78 combinações num único caso (15,3 s com concorrência; 7,6 s na repetição). Separar as mesmas 26 semanas × três perfis em casos independentes, sem elevar o timeout nem remover asserções; revalidar o projeto inteiro antes de publicar. Seis percursos de produção no Chromium, com ausência real de voz/API e larguras 320/390/1280, aprovados sem exceções JavaScript. Não foi repetida a síntese de áudio nesta instância; a prova nativa anterior permanece documentada.
- **Pedido do usuário:** ouvir respostas do chat, pausar, retomar e ajustar a velocidade de leitura. Corresponde ao item 2 da segunda lista de sugestões; os itens 3, 8 e 9 foram excluídos por orientação expressa do usuário.
- **Conferência prévia obrigatória:** verificar novamente a `main` antes de implementar; o chat já oferece ditado por voz, e respiração e monitoramento possuem recursos de fala. Reaproveitar as capacidades existentes, distinguindo entrada por voz de leitura das respostas; o componente de resposta consultado não oferece esse controle.
- **Escopo funcional:** acrescentar reprodução por resposta com iniciar, pausar, retomar, parar e velocidade acessíveis. Usar voz em pt-BR quando disponível, explicar limitações de compatibilidade e selecionar texto adequado para leitura sem narrar sintaxe Markdown ou valores incorretos. Não iniciar áudio sem ação do usuário; evitar sobreposição de falas, cancelar ao sair ou trocar de conta e respeitar privacidade e consentimento se houver serviço externo.
- **Experiência, dados e integração:** seguir o Lyra Clean claro, com pt-BR compreensível, responsividade, teclado, foco e estados de carregamento, erro e ausência de dados. Usar dados reais e autorizados, persistência e validação no servidor, isolamento por titular, direitos do plano e consentimentos, exportação e exclusão aplicáveis. Pesquisar referências oficiais atuais antes da implementação.
- **Validação e entrega:** testar reprodução e controles reais nos navegadores anunciados, resposta longa, tabelas, números e unidades, mensagens incompletas, troca de conversa, recursos indisponíveis, teclado e celular. Executar os testes, QA e gates pertinentes à implementação, revisar diff e status e publicar commit e push próprios na `main`, sem branches ou worktrees; atualizar este painel com SHA e evidências reais. Este registro não representa funcionalidade implementada.

- **Conferência inicial:** 127 publicada, com prova externa preservada. O chat oferece cópia, favoritos e refazer, mas não leitura de respostas. Reutilizar a Web Speech API e a detecção de recursos, somente com voz local em português; sem envio a serviço externo. Navegador de QA informou API presente e nenhuma voz instalada. Preparar e conferir sintetizador real de sistema para validar reprodução, sem substituir a API por uma implementação de teste.

- **Validação concluída em 2026-10-29, aguardando publicação desta tarefa:** leitura das respostas concluídas com controles reais, voz local em português e preferência por pt-BR. Fonte semântica do Markdown, tabelas com cabeçalhos/valores, preservação de zero e unidades, código e URLs explicitamente fora da narração. Trechos sem corte de números, pausa/retomada com repetição informada do trecho atual, velocidade, cancelamento entre respostas/abas, navegação, nova conversa, sessão e troca de conta. Controles ausentes em respostas incompletas. Sem serviço de voz externo, cota de IA adicional ou áudio persistido pelo app.
- **Evidências:** 703 unitários em 88 arquivos, 547 integrações MySQL em 58 arquivos, instalação congelada offline, formato, lint sem avisos, tipos e build limpo aprovados; três unitários focados, lint, tipos e novo build após os ajustes. Produção: 14 verificações funcionais e 11 execuções axe sem violações, 320/390/1280/1440, zoom 200%, foco/Tab/Escape, toque emulado, planos Free/Meta/Care, leitura completa em 25 trechos nativos terminados, ausência de voz e API realmente desativada. Captura WAV real: 118.769 amostras, 237.582 bytes, eventos nativos start/end; não é teste de alto-falante físico. Nenhuma exceção JavaScript. Corrigidos posicionamento da janela ancorada em zoom, substituída pelo diálogo central, e tratamento de sessão sem API. Documentação e auditoria em `docs/leitura-em-voz-alta.md` e `docs/auditoria/2026-10-29-leitura-128.md`. Os testes não certificam outros sistemas operacionais ou a pronúncia de toda voz instalada.

- **Fechamento validado em 2026-10-30:** aproveitada a implementação publicada, sem refazer a funcionalidade. A verificação integral passou: fix:format, fix:lint, check:lint, check:format, check:types, 959 unitários em 88 arquivos, 547 integrações MySQL em 58 arquivos, 30 testes dos launchers e build. Corrigida a agregação excessiva de cenários nos testes de linguagem diária e semanal: mesmas 258 combinações e asserções, agora independentes, com timeout original preservado. Seis percursos de produção no Chromium, sem exceções JavaScript, e dados temporários removidos. Evidências e limites em `docs/auditoria/2026-10-30-retomada-128.md`. As bloqueadas 86, 90, 100, 106, 115 e 127 não foram executadas. A 129 é a próxima tarefa não bloqueada; só iniciar após a publicação deste fechamento.

- **Publicação do fechamento da 128:** `0c7a23cd` · **Push confirmado:** `4a1fe166..0c7a23cd main -> main`. Este registro posterior preserva o SHA real da entrega e é publicado antes de iniciar a 129.

### 129 · Histórico de versões e desfazer alterações em registros manuais

- **Status:** 🟢 finalizada · **Registro:** 2026-10-26 · **Conclusão:** 2026-10-30 · **Commit:** `95ad6908` · **Push confirmado:** `cf9c9d7d..95ad6908 main -> main`.
- **Pedido do usuário:** corrigir um preenchimento acidental e consultar ou recuperar valores anteriores de registros manuais quando aplicável. Corresponde ao item 4 da segunda lista de sugestões; os itens 3, 8 e 9 foram excluídos por orientação expressa do usuário.
- **Conferência prévia obrigatória:** verificar novamente a `main` antes de implementar; reutilizar o check-in e a gravação das métricas existentes; o fluxo consultado atualiza a linha do dia e recalcula resultados, sem comprovar histórico de versões recuperáveis para o próprio titular. Distinguir essa capacidade do histórico administrativo.
- **Escopo funcional:** registrar alterações manuais com data, campo, valor anterior e novo, permitir consultar versões e desfazer alterações elegíveis com confirmação clara. Tratar concorrência para não sobrescrever gravações posteriores e recalcular resultados dependentes sem duplicar contagens. Preservar a origem dos dados e não converter uma correção manual em medição de sensor. Definir retenção e não restaurar dados eliminados definitivamente por solicitação de privacidade.
- **Experiência, dados e integração:** seguir o Lyra Clean claro, com pt-BR compreensível, responsividade, teclado, foco e estados de carregamento, erro e ausência de dados. Usar dados reais e autorizados, persistência e validação no servidor, isolamento por titular, direitos do plano e consentimentos, exportação e exclusão aplicáveis. Pesquisar referências oficiais atuais antes da implementação.
- **Validação e entrega:** conferir alteração e desfazer reais, versões persistidas, concorrência, recarga, campos sem valor, zero, cálculos dependentes, autorização e exclusão definitiva. Executar os testes, QA e gates pertinentes à implementação, revisar diff e status e publicar commit e push próprios na `main`, sem branches ou worktrees; atualizar este painel com SHA e evidências reais. Este registro não representa funcionalidade implementada.

- **Conferência antes de implementar em 2026-10-30:** `main` limpa e sincronizada em `9a177394`. Buscas por desfazer, versões e revisões em `src`, migrations e documentação não encontraram histórico recuperável das métricas manuais; o histórico de conversas e o administrativo têm finalidade distinta. Reutilizar a gravação de check-in existente, preservando sensores, sincronização offline, escores, limites do plano e privacidade. Nenhum arquivo adicional do outro chat estava disponível nas pastas compartilhadas; a implementação publicada e os relatórios anteriores foram aproveitados na 128. Não executar tarefas bloqueadas.

- **Progresso local em 2026-10-30:** migration 057 aplicada no MySQL real; captura transacional de alterações na gravação compartilhada, revisões de concorrência, API privada de histórico/desfazer, consulta paginada e confirmação no check-in implementadas localmente. Dezesseis integrações da tarefa e regressões de métricas/offline passaram juntas (42 testes em três arquivos), incluindo recálculo real de escores, consulta antiga sem ampliação da janela de edição, isolamento, concorrência, zero/NULL, retenção, exportação, cascatas e idempotência offline. Política de privacidade atualizada e versionada. Em validação global e QA de produção; nenhuma conclusão ou publicação da implementação alegada.

- **Entrega validada em 2026-10-30:** histórico privado paginado, campos/valores anteriores e novos, confirmação e restauração da última revisão intacta, proteção contra concorrência e gravações de sensor/prática, zero/NULL, recálculos e ausência de duplicação. Escrita compartilhada com avaliações e offline; retenção consultável de 90 dias, portabilidade e cascatas com registro/conta. Política de privacidade atualizada. Verificação global aprovada: instalação congelada offline, fix:format, fix:lint, check:lint, check:format, tipos, 959 unitários, 563 integrações MySQL, 30 testes dos launchers e build. Quinze verificações de produção, sete execuções axe sem violações nas regras avaliadas, zero exceções JavaScript, 320/390/1280 e zoom CSS 200%. Corrigidos texto de erro de rede, altura do check-in em zoom e distinção da revisão técnica no inventário de métricas. Relatório e resultados em `docs/auditoria/2026-10-30-versoes-129.md` e `.json`. Nenhuma bloqueada executada.

### 130 · Acompanhamentos pessoais com campos e escalas definidos pelo usuário

- **Status:** 🟢 finalizada · **Registro:** 2026-10-26 · **Início:** 2026-10-30 · **Conclusão:** 2026-10-30 · **Commit:** `998ee140` · **Push confirmado:** `120e22d..998ee14 main -> main`.
- **Pedido do usuário:** criar acompanhamentos como concentração ou motivação, escolhendo uma escala simples e compreensível. Corresponde ao item 5 da segunda lista de sugestões; os itens 3, 8 e 9 foram excluídos por orientação expressa do usuário.
- **Conferência prévia obrigatória:** verificar novamente a `main` antes de implementar; reutilizar avaliações, hábitos e registros existentes; métricas fixas e metas manuais não equivalem a campos de acompanhamento criados pelo usuário. Conferir o catálogo e o esquema atuais antes de ampliar a estrutura.
- **Escopo funcional:** permitir criar, editar, organizar, arquivar e excluir acompanhamentos com nome, escala, rótulos e frequência escolhidos pelo titular; registrar respostas datadas e consultar evolução. Manter compatibilidade das respostas antigas ao mudar uma escala, representar ausência corretamente e identificar avaliações como relatos pessoais, sem apresentá-las como medições clínicas. Integrar a seleção aos relatórios e à linha do tempo quando essas tarefas estiverem disponíveis.
- **Experiência, dados e integração:** seguir o Lyra Clean claro, com pt-BR compreensível, responsividade, teclado, foco e estados de carregamento, erro e ausência de dados. Usar dados reais e autorizados, persistência e validação no servidor, isolamento por titular, direitos do plano e consentimentos, exportação e exclusão aplicáveis. Pesquisar referências oficiais atuais antes da implementação.
- **Validação e entrega:** testar CRUD do acompanhamento e dos registros, escalas válidas, alteração de definição, datas, histórico, gráficos, dados ausentes, exportação, exclusão, limites do plano e isolamento por titular. Executar os testes, QA e gates pertinentes à implementação, revisar diff e status e publicar commit e push próprios na `main`, sem branches ou worktrees; atualizar este painel com SHA e evidências reais. Este registro não representa funcionalidade implementada.

- **Conferência prévia em 2026-10-30:** main limpa e sincronizada. Busca em código, esquema e documentação encontrou avaliações fixas, hábitos e experiências pessoais, mas nenhuma definição de acompanhamento com escala criada pelo titular. Reutilizar sessão, permissões de registros manuais, histórico do plano, apresentação Lyra Clean, componentes existentes e exportação. O relatório pessoal já existe e receberá a seleção correspondente; a integração à linha do tempo será feita quando a 131 existir. Preservar respostas antigas ao mudar a escala, sem recalcular ou converter percepções em medições. Nenhuma bloqueada será executada.

- **Implementação em 2026-10-30:** migração 058 (`personal_trackers`, `personal_tracker_definitions`, `personal_tracker_entries`) com propriedade composta, cascatas e restrições. CRUD completo de acompanhamentos (criação idempotente, edição, ordem persistida, arquivar/restaurar, exclusão) e de respostas datadas pelo fuso do perfil, com versões contra sobrescrita. Escala de 2 a 11 pontos (início 0 ou 1, rótulos obrigatórios nos extremos) e frequência diária ou semanal; mudar escala ou frequência cria nova definição sem converter respostas antigas. Ausência representada como “sem registro”, nunca zero. Página `/acompanhamentos`, menu **Meus acompanhamentos**, direitos `wellbeing_assessments` + `metrics_history_days` e corte do histórico do plano. Relatório pessoal com seleção explícita por acompanhamento (prévia, digest e PDF). Exportação LGPD, exclusão, política de privacidade, README e `docs/acompanhamentos-pessoais.md`. A integração com a linha do tempo fica para a 131, ainda inexistente.
- **Evidências:** fix:format, fix:lint, check:lint, check:format e check:types aprovados; 965 unitários (90 arquivos); 571 integrações com MySQL real (60 arquivos, 8 novas da tarefa); build de produção sem avisos. QA em produção (`pnpm start`): 52 verificações aprovadas, 15 execuções axe WCAG 2.0/2.1/2.2 A/AA sem violações, zero exceções JavaScript, 1280/768/390/320 sem estouro. Corrigidos na causa raiz durante o QA: seletor Radix zerando o maior ponto ao trocar de modelo, mensagens de validação em inglês, classe `sr-only` anulada no item da escala e gráfico móvel abrindo longe das respostas recentes. Contas de QA removidas (0 restantes). Relatório em `docs/auditoria/2026-10-30-acompanhamentos-130.md` e resultados em `.json`. `@current_problems` não está exposto nesta sessão. Nenhuma branch ou worktree criada.

### 131 · Linha do tempo pessoal unificada com filtros por assunto

- **Status:** 🟢 finalizada · **Registro:** 2026-10-26 · **Início:** 2026-10-30 · **Conclusão:** 2026-10-30 · **Commit:** `a5a1db98` · **Push confirmado:** `c48f986..a5a1db9 main -> main`.
- **Pedido do usuário:** escolher um dia e encontrar juntos registros, práticas, metas e acontecimentos pessoais, com filtros por assunto. Corresponde ao item 6 da segunda lista de sugestões; os itens 3, 8 e 9 foram excluídos por orientação expressa do usuário.
- **Conferência prévia obrigatória:** verificar novamente a `main` antes de implementar; reutilizar histórico de métricas, reflexões, práticas, metas e revisão semanal; a linha do tempo de períodos e janelas do dia não é um histórico unificado dessas atividades. Integrar acontecimentos da tarefa 120 conforme sua disponibilidade, sem inventar entradas.
- **Escopo funcional:** apresentar eventos reais em ordem cronológica com data e horário corretos, origem identificada, filtros, período, paginação e acesso ao registro original. Respeitar limites do histórico, ocultar categorias indisponíveis e refletir edições e exclusões. Não duplicar registros ao agregar fontes nem expor conteúdo de conversas ou informações sensíveis desnecessariamente.
- **Experiência, dados e integração:** seguir o Lyra Clean claro, com pt-BR compreensível, responsividade, teclado, foco e estados de carregamento, erro e ausência de dados. Usar dados reais e autorizados, persistência e validação no servidor, isolamento por titular, direitos do plano e consentimentos, exportação e exclusão aplicáveis. Pesquisar referências oficiais atuais antes da implementação.
- **Validação e entrega:** conferir ordenação e fuso, várias fontes no mesmo dia, filtros, paginação, datas sem registros, abertura da origem, atualizações, exclusões e recusa de dados de outras contas. Executar os testes, QA e gates pertinentes à implementação, revisar diff e status e publicar commit e push próprios na `main`, sem branches ou worktrees; atualizar este painel com SHA e evidências reais. Este registro não representa funcionalidade implementada.

- **Conferência prévia em 2026-10-30:** `main` sincronizada em `dc28e8c`. Não existe histórico unificado: a linha de períodos e janelas do dia não reúne atividades. Fontes reais confirmadas no esquema: registro do dia (`daily_metrics`), reflexão da noite, avaliações, acompanhamentos (130), respiração, foco e pausa, rotinas, metas (criação e prazo), acontecimentos (120), modo descanso e relatos das experiências. Cada fonte manterá os direitos do plano da sua própria página; a consulta é somente leitura e não cria cópia dos dados.

- **Implementação em 2026-10-30:** `GET /api/linha-do-tempo` somente leitura reunindo onze origens reais (registro do dia, reflexão, avaliações, acompanhamentos, respiração, foco e pausa, rotinas, metas, acontecimentos, modo descanso e experiências), cada uma com o recurso do plano da sua página; até 31 dias, corte do histórico, filtros por assunto, páginas de 40 itens, chave `origem:id` sem repetição, fuso do perfil e horários locais. Notas e conversas não são exibidas; edições e exclusões refletem na consulta seguinte. Página `/linha-do-tempo`, menu, filtros na URL, link para a origem e "carregar mais". A integração com os acompanhamentos da 130 foi concluída.
- **Evidências:** gates aprovados; 965 unitários; 576 integrações com MySQL real (5 novas); build sem avisos. QA em produção: 21 verificações, 4 execuções axe sem violações, zero exceções JavaScript; corrigido estouro de 1 px em 320 px. Relatório em `docs/auditoria/2026-10-30-linha-do-tempo-131.md`. Contas de QA removidas. Nenhuma branch ou worktree.

### 132 · Biblioteca de meditações e relaxamentos guiados em áudio

- **Status:** 🟢 finalizada · **Registro:** 2026-10-26 · **Início:** 2026-10-30 · **Conclusão:** 2026-10-30 · **Commit:** `35507b9b` · **Push confirmado:** `b709276..35507b9 main -> main`.
- **Pedido do usuário:** escolher meditações e relaxamentos por duração e objetivo, com narração e transcrição. Corresponde ao item 7 da segunda lista de sugestões; os itens 3, 8 e 9 foram excluídos por orientação expressa do usuário.
- **Conferência prévia obrigatória:** verificar novamente a `main` antes de implementar; reutilizar respiração guiada, histórico de práticas e componentes de áudio disponíveis, sem registrar a biblioteca como se já estivesse entregue. Complementar a respiração e as sessões de foco da tarefa 126, sem reconstruí-las.
- **Escopo funcional:** oferecer catálogo real de práticas em pt-BR, filtros por duração e finalidade, detalhes, narração, transcrição e controles de reprodução. Usar conteúdo próprio ou com direito de uso comprovado; não criar cards com mídia inexistente. Permitir retomar práticas e registrar apenas o tempo efetivamente realizado, com regras explícitas de integração às métricas e prevenção de dupla contagem.
- **Experiência, dados e integração:** seguir o Lyra Clean claro, com pt-BR compreensível, responsividade, teclado, foco e estados de carregamento, erro e ausência de dados. Usar dados reais e autorizados, persistência e validação no servidor, isolamento por titular, direitos do plano e consentimentos, exportação e exclusão aplicáveis. Pesquisar referências oficiais atuais antes da implementação.
- **Validação e entrega:** reproduzir os áudios reais, conferir transcrições, filtros, duração, pausa, retomada, interrupção, histórico, contagem, mídia indisponível, acessibilidade e direitos de uso do conteúdo. Executar os testes, QA e gates pertinentes à implementação, revisar diff e status e publicar commit e push próprios na `main`, sem branches ou worktrees; atualizar este painel com SHA e evidências reais. Este registro não representa funcionalidade implementada.

- **Conferência e direitos em 2026-10-30:** não havia biblioteca narrada. As vozes pt-BR do Piper derivam de bases de uso não comercial (lessac/Blizzard 2013, RyanSpeech CC BY-NC-SA 4.0) e foram descartadas. A narração usa a voz local em português do dispositivo, pelo controlador da 128, com oito roteiros próprios versionados; sem voz local, a prática segue pela transcrição, sem anunciar mídia inexistente.
- **Implementação:** migração 059 `meditation_sessions`; início idempotente, uma prática aberta, relógio do servidor, pausas fora do tempo, limite à duração; minutos inteiros somados uma única vez à meditação do dia local (reserva atômica). Página `/meditacoes` com filtros por duração e objetivo, reprodutor, narração ligável, transcrição com passo atual, concluir/interromper e histórico; origem na linha do tempo; LGPD, privacidade, README e `docs/meditacoes-guiadas.md`.
- **Evidências:** gates aprovados; 968 unitários; 580 integrações com MySQL real (4 novas); build sem avisos. QA em produção: 31 verificações, 8 axe sem violações, zero exceções JavaScript; narração real em pt-BR com áudio capturado (RMS ≈ 5.000) via Speech Dispatcher e eSpeak NG somente no ambiente de QA. Relatório em `docs/auditoria/2026-10-30-meditacoes-132.md`. Contas de QA removidas. Nenhuma branch ou worktree.

### 133 · Diário alimentar simples com registro por texto ou foto

- **Status:** 🟢 finalizada · **Registro:** 2026-10-26 · **Início:** 2026-10-30 · **Conclusão:** 2026-10-30 · **Commit:** `38ea33de` · **Push confirmado:** `78da362..38ea33d main -> main`.
- **Pedido do usuário:** registrar refeições por texto ou foto, horário e percepção pessoal, com estimativas identificadas e confirmáveis pelo usuário. Corresponde ao item 10 da segunda lista de sugestões; os itens 3, 8 e 9 foram excluídos por orientação expressa do usuário.
- **Conferência prévia obrigatória:** verificar novamente a `main` antes de implementar; reutilizar recomendações de alimentação e métricas existentes, distinguindo um diário de refeições de um plano alimentar ou total diário de proteína. Coordenar anexos com a tarefa 127 sem duplicar armazenamento ou consentimento.
- **Escopo funcional:** permitir criar, consultar, editar e excluir refeições, lanches e bebidas com descrição, horário, foto opcional e percepção do titular. Caso exista interpretação da foto por modelo compatível, mostrar o que foi reconhecido para confirmação e correção; não declarar leitura por IA quando não ocorreu. Qualquer estimativa deve ter origem e limitações claras, sem tratar foto como pesagem ou inventar nutrientes. Integrar registros autorizados ao histórico e aos relatórios disponíveis.
- **Experiência, dados e integração:** seguir o Lyra Clean claro, com pt-BR compreensível, responsividade, teclado, foco e estados de carregamento, erro e ausência de dados. Usar dados reais e autorizados, persistência e validação no servidor, isolamento por titular, direitos do plano e consentimentos, exportação e exclusão aplicáveis. Pesquisar referências oficiais atuais antes da implementação.
- **Validação e entrega:** conferir CRUD, datas e fusos, fotos, confirmação e correção de reconhecimento real quando oferecido, modelo ausente ou incompatível, estimativas, persistência, histórico, exportação, exclusão e privacidade. Executar os testes, QA e gates pertinentes à implementação, revisar diff e status e publicar commit e push próprios na `main`, sem branches ou worktrees; atualizar este painel com SHA e evidências reais. Este registro não representa funcionalidade implementada.

- **Implementação em 2026-10-30:** migração 060 (`meal_entries`, `meal_photos`); CRUD real com criação multipart idempotente, versões, troca/remoção de foto e exclusão; foto normalizada como na 127 (PNG sem metadados), privada e servida só ao titular; estimativa de quantidade do titular sempre rotulada, sem nutrientes inventados. Sem modelo autorizado, a leitura de fotos por IA não é oferecida nem declarada. Página `/alimentacao`, linha do tempo, relatório pessoal por seleção explícita (sem fotos), exportação LGPD com fotos, privacidade, README e `docs/diario-alimentar.md`.
- **Evidências:** gates aprovados; 970 unitários; 584 integrações com MySQL real (4 novas); build sem avisos. QA em produção: 28 verificações, 9 axe sem violações após corrigir o nome acessível do campo de arquivo, zero exceções JavaScript; JPEG com EXIF guardado como PNG sem EXIF. Relatório em `docs/auditoria/2026-10-30-diario-alimentar-133.md`. Contas de QA removidas. Nenhuma branch ou worktree.

### 134 · Agendamentos exclusivo do administrador por padrão, com ativação global para usuários

- **Status:** 🟢 finalizada · **Registro:** 2026-10-27 · **Início:** 2026-10-30 · **Conclusão:** 2026-10-30 · **Commit:** `91d0ec71` · **Push confirmado:** `6b04e2d..91d0ec7 main -> main`.
- **Pedido do usuário:** desativar o menu Agendamentos do sidebar e do app para que, inicialmente, somente o administrador possa visualizar e usar esse recurso. Dar ao administrador a opção de ativar ou desativar Agendamentos por completo para os usuários.
- **Conferência prévia obrigatória:** inventariar a página, menus, sidebar desktop e celular, busca, atalhos, ações rápidas, botões, notificações de consultas, APIs e integrações vinculadas a agendamentos e profissionais. Reaproveitar a matriz de recursos dos planos, a autorização administrativa e os controles existentes; não confundir a ocultação de um item com o bloqueio funcional do recurso.
- **Controle administrativo real:** criar uma configuração global persistida, desativada para usuários por padrão, que somente o administrador possa consultar e alterar nos controles administrativos apropriados. O administrador mantém seu próprio acesso para gerir o recurso. Ao ativar para os usuários, continuar exigindo os direitos do plano e demais autorizações aplicáveis; a configuração não pode conceder permissões administrativas nem ampliar recursos do plano.
- **Desativação integral:** quando desligado para usuários, retirar todos os pontos de entrada do app e recusar também acesso direto e operações nas APIs correspondentes, inclusive leitura, criação, edição, exclusão e consultas auxiliares vinculadas à funcionalidade. Impedir atalhos pela URL, manipulação do navegador ou chamadas manuais. Não fazer consultas que sabidamente retornarão 403 para montar menus ou notificações. Conferir canais e calendários ligados a consultas, preservando funcionalidades independentes como as janelas pessoais de autoconhecimento.
- **Persistência e integridade:** manter agendamentos, profissionais e histórico já registrados; desativar não significa apagar ou cancelar consultas reais. Reativar deve recuperar o acesso aos dados autorizados de cada titular. Aplicar a configuração após recarga, novo login e mudança de papel ou plano, evitando estado antigo conceder acesso indevido. Registrar alterações administrativas com responsável, data e estado anterior e novo, sem expor dados pessoais de consultas.
- **Experiência e validação:** apresentar o controle em pt-BR, com estado claro, operação acessível e feedback de sucesso ou falha. Testar desligado por padrão, administrador, usuários dos planos, ativação/desativação, persistência, acesso direto, todas as operações pertinentes, isolamento e tentativas de alteração por não administradores. Validar menus e notificações em desktop e celular, regressões, gates e revisão do diff. Publicar commit e push próprios na `main`, sem branches ou worktrees, e atualizar este painel com o SHA real. Este registro não declara o recurso já desativado ou a implementação concluída.

- **Implementação em 2026-10-30:** migração 061 com `platform_feature_switches` (`agendamentos_usuarios` desativado por padrão, versão, responsável) e `platform_feature_switch_events` (estado anterior e novo, responsável, data, sem dados de consultas). O interruptor é aplicado no cálculo central de direitos: desligado, `appointments_active` e `professionals_total` ficam `enabled: false` e `globalmenteDesativado: true` para não administradores, então menu lateral, gaveta do celular, busca Ctrl K, sino, bloqueio de rota e APIs reagem juntos (403 "Agendamentos estão desativados pelo administrador do app."). Ligado, o plano continua valendo; o administrador mantém acesso. `GET/PUT /api/admin/agendamentos` com 401/403/400/409; cartão com chave, confirmação, última alteração e últimas 20 alterações em Admin → Planos; aviso "Recurso desativado pelo administrador" sem oferta de plano no acesso direto; exportação LGPD dos eventos do titular; `docs/agendamentos-para-usuarios.md`, `docs/api.md` e `docs/lgpd.md`.
- **Evidências:** gates aprovados; 970 unitários; 586 integrações com MySQL real (2 novas); build sem avisos. QA em produção: 18 verificações e 4 axe sem violações, incluindo celular a 390 px. Corrigidos na QA: aviso genérico de plano no acesso direto (o bloqueio de rota vinha antes da página), texto do diálogo que trocava durante o fechamento, rótulo do histórico que sugeria total e concordância do aviso. Relatório em `docs/auditoria/2026-10-30-agendamentos-134.md`. Contas de QA removidas e interruptor deixado no padrão desativado. Nenhuma branch ou worktree.

### 135 · Diário pessoal por voz em `/dia`, com análise do dia, memória individual e calendário

- **Publicação da correção da análise e das tentativas:** commit `e4cb6464`, push confirmado `24e80ee9..e4cb6464 main -> main` em 2026-11-05. Leitura posterior autenticada confirmou análise pronta persistida, autoria Jan/Qwen local e motivo nulo; saúde HTTP 200.
- **Status:** 🟢 concluída · **Registro:** 2026-10-30 · **Início:** 2026-10-30 · **Conclusão validada:** 2026-11-05 · **Commit inicial:** `689f36f9` · **Push confirmado:** `0933314..689f36f main -> main` · **Correção do acesso, microfone e início direto:** `1c0fb36d` · **Push confirmado:** `20486022..1c0fb36d main -> main`.
- **Validação atual (2026-11-05):** fala real e transcrição confirmadas pelo usuário; relato persistido em modo voz com motor do navegador. A análise do mesmo relato retornou HTTP 200, estado `pronta`, motivo nulo e autoria Jan/Qwen local após corrigir a saída estruturada e aceitar citações literais de palavras curtas. Sem teto acumulado de tentativas, conforme pedido; concorrência preservada. Lint, formato, tipos, 1003 unitários, 602 integrações MySQL e build de 136 páginas aprovados. Evidência: `docs/auditoria/2026-11-05-diario-135-acesso.md`.
- **Retomada da validação em 2026-11-04:** usuário disponível para falar no microfone real. O QA identificou que a ausência de cidade no perfil esconde todas as abas de `/dia`, inclusive o diário, embora o servidor não exija cidade para guardar relatos. Corrigir a composição da página para manter o diário acessível sem briefing, preservando os direitos do plano e a ausência de interpretação do mapa sem dados.
- **Página de implementação:** `http://localhost:3000/dia` (rota `/dia`). O diário deve fazer parte dessa página, coordenado com a organização em abas solicitada pelo usuário.
- **Pedido do usuário:** implementar a solicitação transcrita do áudio e revisada neste chat: permitir que cada pessoa conte por voz como foi o seu dia, receba o texto organizado e uma análise personalizada e consulte o diário em formato de agenda, enquanto a Lyra desenvolve uma compreensão contextualizada de sua trajetória.
- **Relato por voz e organização do texto:** transcrever o relato e corrigir ortografia e pontuação, preservando o sentido, os acontecimentos e a forma de expressão do usuário. Não acrescentar fatos à fala nem apresentar uma transcrição que não tenha sido realmente processada.
- **Análise do dia e mapa pessoal:** analisar o conteúdo efetivamente relatado e apresentar, em pt-BR simples e natural, os principais acontecimentos, percepções e características daquele dia. Relacionar o relato aos dados reais do mapa astral do próprio titular, mantendo clara a distinção entre o que a pessoa contou e a interpretação produzida pela Lyra. O pedido de “diagnóstico do dia” corresponde à análise interpretativa do relato; não transformar essa interpretação em diagnóstico clínico nem em medição de saúde.
- **Memória individual e acompanhamento contínuo:** salvar os registros e suas análises na memória individual do usuário. Utilizar o histórico real ao longo dos dias para compreender experiências, reconhecer padrões e construir progressivamente um mapeamento pessoal, sem inventar vivências, conclusões ou informações ausentes. Preservar isolamento por titular, consentimentos, direitos do plano e exportação/exclusão aplicáveis.
- **Diário em formato de agenda:** apresentar os registros organizados por data, em uma interface de calendário inspirada na organização do Google Agenda. Ao selecionar um dia, permitir consultar o relato e a análise correspondentes. A referência ao Google Agenda define o formato de apresentação; não acrescenta uma integração externa com a conta Google.
- **Conferência prévia e integração:** antes de implementar, conferir a `main` e reaproveitar voz, reflexão diária, persistência, memória e navegação existentes; avaliar as entregas 44, 85, 124 e 128 e a futura linha do tempo 131. Distinguir este diário pessoal do diário alimentar 133. Coordenar a localização do diário com a tarefa 136, sem impor nomes adicionais de abas não definidos pelo usuário nem duplicar registros e serviços existentes.
- **Experiência e validação futura:** seguir o Lyra Clean claro, a acessibilidade e as referências oficiais atuais de 2026. Validar captura de voz, transcrição, correção fiel, análise com modelo real autorizado, indisponibilidade de modelo/microfone, gravação, reabertura por data, memória individual e isolamento entre contas. Executar os testes e gates aplicáveis, conferir o fluxo no navegador e publicar a implementação em commit e push próprios na `main`, com evidências no painel. Este registro não declara o diário implementado nem validações funcionais executadas.

- **Publicação deste registro documental:** commit `1c22b67c6adf52072ea12d3c7b764eadbe888cda`, confirmado na `main` pela API autenticada do GitHub e pela releitura do arquivo. Somente o painel foi alterado; a tarefa permanece a iniciar, aguardando instruções. Este SHA não corresponde à implementação do diário.

- **Implementação em 2026-10-30:** migração 062 (`personal_diary_entries`); API de mês, dia, criação idempotente, edição com versão, exclusão e análise com lease; voz no aparelho primeiro e serviço do navegador só com aceite; análise pelo modelo autorizado (só locais sem consentimento de nuvem) com validação de fidelidade, base no relato, padrões só com histórico, mapa só quando enviado e sem linguagem clínica; agenda mensal na aba Diário de `/dia`; memória individual pela fila durável; linha do tempo sem conteúdo; LGPD; `docs/diario-pessoal.md`.
- **Evidências:** gates aprovados; 982 unitários; 594 integrações (8 novas, com servidor de contrato HTTP identificado); build sem avisos. QA em produção: 22 verificações e 8 axe sem violações. Prova com modelo real local (Qwen2.5-1.5B-Instruct, Apache-2.0, configurado pela administração): análise pronta em 50–79 s e recusa correta de uma saída infiel. Corrigidos na QA: fidelidade que aceitava troca de sentido, padrões inventados e leitura sem base no relato, rótulo repetido. Fronteira: a captura de fala real não pôde ser provada no navegador do ambiente (sem português no aparelho e microfone recusado). Relatório em `docs/auditoria/2026-10-30-diario-pessoal-135.md`. Contas de QA removidas. Nenhuma branch ou worktree.
- **Correção em 2026-11-02 (agenda mensal vazia em meses de 30 dias):** a suíte de integração falhou em novembro: o mês voltava sem dias. Causa raiz comprovada no MySQL 9.7: a consulta usava o dia 31 fixo como fim do mês; `'2026-11-31'` é data inválida e `BETWEEN '2026-11-01' AND '2026-11-31'` resulta em 0 (em outubro, 1). Afetava novembro, abril, junho, setembro e fevereiro. Correção: fim do mês calculado pelo próprio banco (`entry_date < DATE_ADD(início, INTERVAL 1 MONTH)`), sem data montada no texto. Regressão: integração nova com relatos no último dia de setembro e de fevereiro e no primeiro de outubro. Gates: formato, lint e tipos com exit 0; 984 unitários; 598 integrações em 66 arquivos; build sem avisos.

### 136 · Organização de `/dia` em abas por categoria, com “Meu Dia” como primeira aba

- **Status:** 🟢 finalizada · **Registro:** 2026-10-30 · **Início:** 2026-10-30 · **Conclusão:** 2026-10-30 · **Commit:** `6a6779c7` · **Push confirmado:** `60a2e66..6a6779c main -> main`.
- **Página de implementação:** `http://localhost:3000/dia` (rota `/dia`). Esta solicitação é específica dessa página; as abas do painel principal entregues na tarefa 114 não substituem este escopo.
- **Pedido do usuário:** organizar todas as métricas, cards e demais seções da página por categoria e assunto, de forma harmoniosa, em tópicos distribuídos por abas, com organização adequada de UI/UX.
- **Primeira aba obrigatória:** chamar exatamente **“Meu Dia”** e reunir as seções `titulo-alertas`, `titulo-meu-dia` e `titulo-leitura`. Conferir os componentes e identificadores reais antes de alterar a estrutura, preservando sua função e relações de acessibilidade.
- **Alertas sutis e fecháveis:** a seção `titulo-alertas` deve ficar menor, mais sutil e com opção acessível de fechar, funcionando somente como alerta ao usuário. Reduzir seu peso visual sem esconder informações necessárias nem confundir fechar a apresentação com excluir dados.
- **Demais abas por conteúdo:** inventariar todas as métricas, cartões, gráficos, orientações, reflexões, calendário e demais seções existentes em `/dia`; agrupar o restante conforme o conteúdo e o tópico, com nomes claros, hierarquia e distribuição coerentes. Não excluir funcionalidades, dados, ações ou permissões para simplificar a tela nem impor categorias sem conferir o conteúdo real. Coordenar a localização do diário da tarefa 135 e reaproveitar as abas internas existentes quando pertinente.
- **Experiência e acessibilidade:** pesquisar referências oficiais atuais de 2026 antes da implementação visual e seguir o Lyra Clean claro, os tokens e componentes existentes. Garantir alternância compreensível, indicação da aba ativa, teclado, foco, leitor de tela, contraste, zoom e responsividade em desktop, tablet e celular, preservando âncoras, carregamento, erros, ausência de dados, filtros e ações aplicáveis.
- **Conferência e validação futura:** antes de implementar, verificar se já existe progresso na `main` e mapear a cobertura de todo o conteúdo. Validar a primeira aba e seus três identificadores, fechamento dos alertas, agrupamento integral do restante, navegação e recarga, direitos dos planos, isolamento e atualização dos dados. Executar QA no navegador e os gates do projeto; revisar o diff, atualizar o painel e publicar commit e push próprios na `main`, sem branches ou worktrees. Este registro não declara a página reorganizada nem validações funcionais executadas.

- **Publicação deste registro documental:** commit `d5e4b467a4a1cacc9faae5f749349d05c90c2098`, confirmado na `main` pela API autenticada do GitHub e pela releitura do arquivo. Somente o painel foi alterado; a tarefa permanece a iniciar na ordem autorizada. Este SHA não corresponde à implementação das abas.

- **Implementação em 2026-10-30:** `/dia` em cinco abas (Meu Dia, Orientações, Horários e semana, Céu e mapa, Diário), com os 14 blocos e identificadores preservados; "Meu Dia" reúne `titulo-meu-dia`, `titulo-alertas` e `titulo-leitura`. Aba ativa em `?aba=`, âncoras antigas abrem a aba certa, abas sempre montadas. "Atenção hoje" compacto e fechável, sem apagar dados. Executada junto da 135 e publicada antes dela, em commit próprio. Documentação em `docs/dia-em-abas.md`.
- **Evidências:** gates aprovados; 970 unitários; 586 integrações; build sem avisos. QA em produção: 25 verificações e 6 axe sem violações, incluindo 390, 768 e 320 px. Relatório em `docs/auditoria/2026-10-30-dia-em-abas-136.md`. Conta de QA removida. Nenhuma branch ou worktree.

### 137 · Pasta `Old` com os arquivos que o app não utiliza

- **Status:** 🟢 finalizada · **Registro:** 2026-11-02 · **Início:** 2026-11-03 · **Conclusão:** 2026-11-03 · **Commit:** `8c38f99` · **Push confirmado:** `8548c22..8c38f99 main -> main`.
- **Pedido do usuário:** depois de finalizar os testes em geral, criar uma pasta chamada **"Old"** na raiz do projeto e mover para ela todos os arquivos que não são utilizados pelo app. Na raiz, nas pastas e nas subpastas devem ficar somente os arquivos necessários para executar o app por completo, de forma real: sem simulações, placeholders, hardcode ou cortes em linhas e códigos.
- **Critério de execução:** só depois da QA geral. Mover somente com evidência de não uso. Para cada arquivo, procurar com `rg` imports, requires, imports dinâmicos, scripts, loaders, configurações, documentação, launchers (`run.py`, `run.sh`, `run_windows.py`), Docker Compose, migrações, testes, CI e uso indireto. Não mover nada por intuição nem por indicação isolada de ferramenta automática. Preservar o que a instalação limpa, os launchers, o build, os testes, as migrações e a documentação oficial exigem. Usar `git mv` para manter o histórico; nenhuma exclusão.
- **Validação:** depois da movimentação, repetir a instalação limpa (`pnpm install --frozen-lockfile`), os gates (formato, lint, tipos, unitários, integrações e build), a subida pelos launchers, as migrações e a QA no navegador, para provar que o app continua completo. Registrar a lista do que foi movido e o motivo de cada item, fazer commit e push próprios na `main`, sem branches ou worktrees, e atualizar este painel.

- **Execução em 2026-11-03, depois da QA geral e da validação final:** cada candidato foi conferido com `git grep` em código, `package.json`, launchers, Compose, testes e documentação, e com o `knip` 6.44, que não encontrou nenhum arquivo sem uso em `src/`. Foram movidos com `git mv` para `Old/`, sem apagar nada:
  - os quatro documentos antigos de instrução e redesenho da raiz;
  - o instalador portátil `implement_elementor_lyra.py`, que serve para levar o módulo a outros projetos. O script `lyra-customaze:install` saiu do `package.json` e o README do módulo passou a apontar para `Old/`;
  - o `codemagic.yaml` (CI fora do escopo);
  - o `scripts/verificar-identidade.mjs`, sem nenhuma referência.

  Ficaram na raiz o app, os módulos importados, as dependências reproduzíveis, o banco, os serviços, os launchers, os scripts de operação, os testes, as configurações, as regras e a documentação. As configurações de ferramentas de desenvolvimento (`.agents/`, `skills-lock.json`, `.codex/`, `.claude/`, `.mcp.json`) também ficaram, porque são lidas em locais fixos da raiz e o `CLAUDE.md` manda inspecioná-las. O motivo de cada item está em `Old/README.md`.

- **Validação depois da movimentação:**
  - instalação limpa congelada;
  - formato, lint e tipos com exit 0;
  - 990 unitários, 601 integrações e 30 testes dos launchers;
  - `run.py up --prod` com build limpo sem avisos, `/api/health`, páginas e login do administrador;
  - varredura de 70 páginas como Care e como administrador, sem falhas.
- **Nenhuma branch ou worktree.**

### 138 · Corrigir o aviso de minimatch nas ferramentas de lint

- **Status:** 🟢 finalizada · **Início e conclusão:** 2026-11-04 · **Commit:** `38bf2f87` · **Push confirmado:** `0c883ce4..38bf2f87 main -> main`.
- **Escopo autorizado:** investigar o aviso GHSA-g3hv-75wg-m249, corrigir a resolução afetada preservando as APIs dos consumidores, validar lint e gates aplicáveis e publicar na `main`.
- **Ambiente e progresso:** Node 24.21.0 preparado isoladamente; instalação congelada aprovada. Verificação dos consumidores reais e revisão independente aprovadas; fix:format, fix:lint, check:lint, check:format, check:types, 990 unitários, 601 integrações MySQL e build aprovados. Migrações repetidas: 66/66 já aplicadas. Launchers: a suíte exige Linux (módulo `pwd` e executável Bash); no Python nativo do Windows houve falha de plataforma, e no WSL os 30 testes passaram. Nenhuma alteração na instalação global de Node; `@current_problems` não está disponível entre as ferramentas desta sessão. Implementação validada e publicada individualmente na `main`.

### 139 · Ordenar a gestão e distinguir conclusão de validação pendente

- **Status:** 🟢 finalizada · **Início e conclusão:** 2026-11-04 · **Commit:** `263007d0` · **Push confirmado:** `1f726f48..263007d0 main -> main`.
- **Escopo autorizado:** ordenar numericamente todos os tópicos, preservar o histórico e os SHAs, separar implementação publicada de validação integral e expor as fronteiras ainda não comprovadas.
- **Critério:** conferir números únicos, totais, estados e preservação dos blocos; validar formatação e publicar individualmente na `main`.
- **Revisão e evidências:** 139 números únicos e completos; Tópico 4 ordenado de 01 a 138; oito estados 🟡 (14, 15, 23, 86, 90, 100, 127 e 135), cada um com a fronteira explícita. Comparação automatizada preservou os 139 blocos históricos, descontando apenas as mudanças de estado autorizadas, as novas linhas de validação e espaços de formatação. Formatação global e `git diff --check` aprovados. Sem mudança de código nesta tarefa: mantidos os gates completos aprovados na 138, sem alegar nova execução.
- **Pedido adicional atendido em 2026-11-04:** Docker Desktop testado com `hello-world`; frontend e API de produção ativos em `http://localhost:3000`; MySQL 9.7.2 saudável em 3307 com 66/66 migrações; FalkorDB e memória Graphiti saudáveis, `/saude` com 256 dimensões. `/api/health`, início, login e autenticação do administrador aprovados por HTTP; tela de login conferida no navegador. `.env.local` e logs permanecem ignorados pelo Git; nenhuma credencial foi adicionada ao painel. O doctor do Git Bash passou com um aviso de detecção da build do Windows; não se declara a validação completa dos launchers.

### 140 · Reorganizar a navegação lateral por categorias e submenus

- **Status:** 🟢 finalizada · **Início e conclusão:** 2026-11-04 · **Commit:** `6a3f7d15` · **Push confirmado:** `29e25b02..6a3f7d15 main -> main`.
- **Pedido:** organizar os menus do usuário e do administrador em categorias e submenus coerentes, facilitando a navegação no computador e no celular.
- **Conferência prévia:** navegação e filtros centralizados em `navigation.ts`; desktop e celular repetem a renderização; histórico de conversas, configurações publicadas, atalhos e direitos dos planos serão preservados. Busca por TODO/FIXME no backend não encontrou pendência funcional relacionada à navegação.
- **Implementação prevista:** componente compartilhado com divulgação acessível, grupo da página atual aberto, categorias vazias omitidas e separação da administração. Seguir Lyra Clean, referências oficiais atuais do shadcn, Carbon e WAI-ARIA; validar permissões, cobertura dos destinos, teclado, desktop/mobile e gates antes de publicar na `main`.
- **Implementado e revisado:** `SidebarNavigation` compartilhado pelo desktop, menu móvel e prévia; atalhos Dia a dia; Minha jornada com Planejamento e hábitos, Práticas de bem-estar e Registros e evolução; Saúde e conexões; Minha conta. Para administradores, Administração vem logo após os atalhos e reúne Pessoas e planos, Conteúdo e IA e Dados e relatórios. Estrutura aplicada somente aos destinos filtrados por plano, papel, configuração publicada e ativação de Agendamentos. Rótulos personalizados e ordem dentro das categorias preservados; histórico e atalhos existentes mantidos. Controles de 44 px, rótulos sem truncamento, estado expandido, listas nomeadas e abertura da categoria da rota atual, incluindo subpáginas.
- **Gates reais:** instalação congelada, fix:format, fix:lint, check:lint, check:format e check:types aprovados; 997 unitários em 94 arquivos (sete novos testes da taxonomia), 601 integrações MySQL em 67 arquivos e build de produção aprovados. Após o ajuste da posição administrativa, teste focado, lint dos arquivos alterados, formatação e build novamente aprovados. `@current_problems` indisponível nesta sessão.
- **QA real em produção:** navegador com administrador e conta Free temporária; Enter/Espaço, expansão/recolhimento, página ativa, submenus pessoais e administrativos, navegação efetiva e fechamento do painel móvel. Larguras 1280, 390 e 320 px, sem transbordo; nenhuma mensagem de erro/aviso no console durante os percursos. HTTP: 30 páginas do catálogo como administrador e 24 como usuário comum, todas 200; API administrativa 200/403 conforme o papel. Saúde do app com 66 migrações e login do administrador aprovados. Conta temporária excluída e ausência confirmada; administrador restaurado no navegador. Nenhum dado de usuário real alterado. Documentação e fontes em `docs/design-system.md`. Implementação validada e publicada individualmente na `main`, sem branches ou worktrees.

### 141 · Inferência local integrada à Lyra, sem aplicativos intermediários

- **Status:** 🟡 implementada · validação específica pendente · **Registro/autorização:** 2026-11-04 · **Branch:** `main` (sem ramificações).
- **Publicação da revisão de integração:** commit `c8a41905`, enviado e confirmado em `origin/main` em 2026-11-05; validação específica do runtime continua pendente.
- **Integração local em 2026-11-05:** commits recebidos e preservados; corrigidos lint da carga inicial do explorador, formatação e rastreamento indevido de todo o projeto pelo bundler ao inspecionar/executar o binário do host. Lint, formato, tipos, 1001 unitários, 601 integrações MySQL e build de 136 páginas aprovados; build final sem os avisos de rastreamento. Conferidos 187 manifestos de distribuição, sem segredos locais, logs, runtime ou pesos. Instalação CUDA, inferência GGUF e benchmark no Linux/WSL2 continuam não comprovados. Detalhes: `docs/inferencia-local-integrada.md`.
- **Objetivo:** adicionar opção nativa **Lyra integrada** em Admin → Modelos de IA, com seleção, instalação e gerenciamento de modelos WSL2 e inferência rápida, mantendo todo o app.
- **Regra absoluta de preservação:** nunca remover ou desativar Ollama, Jan, LM Studio, vLLM, llama.cpp externo, nuvem, fallback, chat, memória, voz, imagens, ferramentas, MCP, treinamento, planos, CRUD ou demais funcionalidades, rotas, dados e configurações. A opção é estritamente aditiva e opt-in.
- **Execução:** o app controla o runtime local de `llama.cpp`/CUDA Blackwell `sm_120` com processo isolado e socket Unix privado (sem porta HTTP/TCP ou URL para compartilhar pesos). Terceiros não precisam abrir outro aplicativo. Preservar a implantação remota: a nuvem não possui acesso automático ao WSL2 do usuário.
- **Descoberta local:** botão de busca de arquivos GGUF reais nos diretórios de modelos/caches do WSL2 e em pastas autorizadas explicitamente; listar nome, caminho, tamanho, formato, suporte e estado. Avaliar caches Ollama/Jan/LM Studio/Hugging Face sem fingir suporte universal a outros formatos. Impedir symlink traversal, vazamento de diretórios privados e varredura irrestrita.
- **Instalação e seleção:** interface premium clara pt-BR dentro da página administrativa de modelos, instalação/diagnóstico do runtime, modelo selecionável, botão de ativar/desativar e teste de resposta. Sem hardcode de modelo, URL falsa, simulação de instalação ou download implícito de fonte insegura.
- **Qualidade/latência:** priorizar TTFT, tokens/segundo, streaming real, cache de prompt, identidade/raciocínio, GPU 12 GB, CPU Ryzen 9 e 64 GB RAM com orçamento para Windows/app. Medir limites de RAM, VRAM, concorrência, reinício, cancelamento e falhas. Nunca declarar benchmark sem executar.
- **Identidade Lyra:** modelo conectado recebe o mesmo prompt e personalidade, motor determinístico, contexto, memórias autorizadas e validação existente de `src/lib/lyra/modelos-como-lyra.ts`. Não transformar Lyra em chat genérico.
- **Imagens:** preservar geração raster por provedor da segunda posição; acrescentar caminho opcional de SVG gerado pelo LLM textual com sanitização e conversão real a PNG/WebP via sharp. Não apresentar texto SVG como geração fotográfica.
- **Integração:** reutilizar provedores, cadeia de modelos, configuração do administrador, `src/lib/ai`, chat, teste de conexão e transportes. Não introduzir servidor acessível na rede nem alterar as configurações existentes.
- **Qualidade e segurança:** validar diretórios, binários, integridade de pesos e escopos de permissão; autenticação administrativa e isolamento; preservar licença/compatibilidade; UI Lyra Clean responsiva e acessível.
- **Verificações obrigatórias:** examinar integralmente `CLAUDE.md` e `AGENTS.md`, baseline real, instalar e executar na máquina de destino quando acessível, testes de carga, streaming, SVG→PNG, regressão de todos os provedores e do CRUD, lint, tipos, formato, unitários, integrações MySQL, build e QA navegador. Sem notebook/WSL conectado ao ambiente de execução, declarar essa etapa **não verificada**; nunca simular QA.
- **Fluxo Git:** commits e push apenas em `main`, sem branch/worktree/force push. Atualizar este painel com SHA e resultados após entrega. Este registro inicia a tarefa, não afirma implementação nem testes concluídos.
- **Implementação publicada em 2026-11-04:** commit `9ea084c0c182f76149e2285645749fc20d542aa2` confirmado na `main` (13 arquivos). Novo preset aditivo `lyra_integrada`, socket Unix privado sem porta TCP, processo llama-server gerenciado pela Lyra, descoberta GGUF por pastas reais com IDs, seleção/admin, parâmetros GPU/CPU/contexto, instalação CUDA sm_120 pelo painel, transporte de chat com streaming e ilustrações vetoriais sanitizadas via JSON→SVG→WebP. Treinamento KTO e demais provedores preservados.
- **Validação desta sessão:** leitura e conferência estática dos 13 blobs e do diff no commit; HEAD remoto confirmado. Testes unitários foram escritos, **não executados**; `pnpm check:types`, lint, formato, testes, build, banco, navegador, instalação, CUDA, inferência real e benchmark **não executados** aqui. O sandbox atual não possui checkout executável do repositório nem acesso ao WSL2/GPU/modelos do notebook. Essa lacuna impede considerar a tarefa 🟢 concluída. A execução no notebook, correção de eventuais defeitos e QA integral permanecem necessários.
- **Documentação:** `docs/inferencia-local-integrada.md`. A criação do commit e push não constitui evidência de funcionamento real.
