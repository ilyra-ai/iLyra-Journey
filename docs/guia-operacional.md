# Lyra MetaCare · Guia operacional

Referência de instalação, configuração, arquitetura e manutenção para quem opera
o projeto. Execute os comandos na raiz do repositório. Este conteúdo foi preservado
do README na tarefa 116. A apresentação para quem usa o app está no
[README](../README.md). As evidências atuais de cada entrega ficam no
[painel de gestão](../claude-gestao.md) e nas auditorias indicadas nele.

**Transição operacional da tarefa 174 · 10-11-2026:** a arquitetura definida passa a usar `run.sh` no WSL2/Ubuntu e `run_windows.py` nativo no Windows 11. A migração está em execução; os comandos abaixo descrevem o contrato de destino, sem antecipar aprovação de startup, parada, reinício ou paridade. Consulte o gestor para os resultados efetivamente executados. As provas históricas dos launchers anteriores permanecem em [Launchers](./launchers.md), identificadas como anteriores à 174.

## 🧰 Stack tecnológica

| Camada              | Tecnologias                                                                                                                             |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Framework**       | Next.js 16 (App Router, Turbopack) · React 19.3 · TypeScript 6                                                                          |
| **UI**              | Tailwind CSS 4 (CSS-first) · shadcn/ui (Radix) · lucide-react · Recharts 3 · sonner                                                     |
| **Backend**         | Rotas API do Next.js · MySQL 9.7 LTS (mysql2, `caching_sha2_password`) · autenticação com `jose`/`bcryptjs`                             |
| **Pagamentos**      | Stripe (checkout, portal, webhooks)                                                                                                     |
| **Conteúdo**        | Site Experience Builder                                                                                                                 |
| **Astronomia**      | astronomy-engine (efemérides VSOP87/ELP) · base local de cidades GeoNames                                                               |
| **IA**              | Motores determinísticos próprios · modelo da plataforma local (Ollama, LM Studio, Jan, llama.cpp) ou em nuvem · Gemini via BYOK no chat |
| **Observabilidade** | Sentry                                                                                                                                  |
| **Qualidade**       | Vitest · ESLint · Prettier · TypeScript estrito                                                                                         |
| **Infra local**     | Docker Compose (MySQL) · pnpm (via Corepack) · destino 174: `run.sh` (WSL2/Ubuntu) e `run_windows.py` (Windows nativo)                  |

---

## ⚡ Começando

### Pré-requisitos

- **Node.js 24 LTS** (versão exata em `.nvmrc` e `.node-version`, hoje 24.21.0; o `pnpm install` recusa versões fora de `^24.18.1`). Com nvm: `nvm install && nvm use`; fnm e nodenv leem o `.node-version` automaticamente.
- **Docker** (Engine/Desktop) com Docker Compose
- **pnpm 11** via Corepack, incluído no Node.js 24: `corepack enable && corepack install` ativa a versão exata do campo `packageManager`, sem instalação global.
- **Bash 4+ no WSL2/Ubuntu** para `run.sh`; **Python nativo do Windows** para `run_windows.py`, conforme a versão exigida por esse arquivo. O Windows não deve delegar a Git Bash/WSL para executar a orquestração.
- **Runtimes separados:** instale Node.js/Corepack/pnpm Linux no WSL2 e Node.js/Corepack/pnpm Windows no Windows. Não reutilize `node.exe` no WSL2 nem artefatos nativos de `node_modules`/build de um ambiente no outro. O diagnóstico deve conferir plataforma, caminho e versão dos executáveis antes da subida.

### Caminho recomendado — um único comando

O contrato dos dois launchers exige preflight do ambiente, preservação do `.env.local`, instalação conforme o lockfile, **MySQL via Docker Compose**, **migrations + administrador inicial**, memória necessária ao app e **aplicação**, com saúde ponta a ponta (`/api/health`, páginas e login). Comandos, garantias e provas exigidas: [`docs/launchers.md`](./launchers.md). A conclusão depende da validação real em cada sistema, registrada no gestor.

**WSL2/Ubuntu** — `run.sh`:

```bash
./run.sh                   # menu interativo; ajuda sem TTY
./run.sh up                # tudo, em desenvolvimento; --prod inclui build + start
./run.sh doctor            # diagnóstico
./run.sh fix               # correções seguras e idempotentes
./run.sh status            # estado consolidado
./run.sh logs app          # logs da aplicação
./run.sh stop app          # para somente a aplicação da própria instância
```

**Windows 11, PowerShell/CMD** — `run_windows.py` nativo:

```powershell
py run_windows.py             # menu interativo; ajuda sem TTY
py run_windows.py up          # tudo, em desenvolvimento; --prod inclui build + start
py run_windows.py doctor      # diagnóstico
py run_windows.py fix         # correções seguras e idempotentes
py run_windows.py status      # estado consolidado
py run_windows.py logs app    # logs da aplicação
py run_windows.py stop app    # para somente a aplicação da própria instância
```

O estado passa a ser separado em `.lyra-run/linux/` e `.lyra-run/windows/`. PID, identidade do processo, porta e logs pertencem à plataforma e à instância que os criou. A existência de `.lyra-run/app.json` ou `.lyra-run-windows/` legados não autoriza apagar o estado nem encerrar um processo sem conferir sua identidade. `run.py` é retirado somente após a migração comprovada; não é o ponto de entrada da arquitetura nova.

As portas preferidas são **http://localhost:3000** para o app e **127.0.0.1:3307** para MySQL; o endereço real deve ser lido na saída do launcher. **Nunca matar processos nem parar containers para liberar portas.** Identificar ocupação, escolher e reservar outra porta e tratar disputa concorrente, atualizando URLs, conexão e healthchecks coerentemente. A parada só alcança processos comprovadamente pertencentes à instância. Preservar serviços existentes, volumes, segredos e variáveis locais; o diagnóstico deve explicar incompatibilidades sem apagar configuração.

### Trocar entre Windows e WSL2 no mesmo checkout

A troca é **serial**, mantendo uma única cópia das fontes. `scripts/launcher_artifacts.py` preserva os cinco artefatos de cada plataforma em `.lyra-run/artifacts/linux/` ou `.lyra-run/artifacts/windows/`: `node_modules`, `.next`, `next-env.d.ts`, `tsconfig.tsbuildinfo` e `public/offline-assets.json`. Não execute simultaneamente os dois runtimes nessa pasta nem copie a instalação de dependências de um sistema para o outro.

O lease global `.lyra-run/artifacts/lock.json` protege a sequência ativação → instalação → build → início → registro da aplicação. Na integração Python, `transacao()` deve permanecer aberta durante toda essa sequência; `exigir_plataforma_ativa(destino)` permite conferir o runtime para reutilização ou parada sem mover arquivos. Comandos manuais de pnpm/Next fora da transação não ficam automaticamente protegidos.

Para conferir sem alterar: no Windows, execute `py scripts/launcher_artifacts.py status` ou `py scripts/launcher_artifacts.py planejar --destino windows`; no WSL2, use `python3` e `--destino linux`. Antes da troca, pare somente a instância cuja propriedade esteja comprovada. Estado atual/legado ou processos do checkout sem estado impedem movimentos; o inventário cobre Windows e distros WSL já em execução, sem iniciá-las. Uma consulta indisponível exige diagnóstico, não exclusão de arquivos.

Artefatos iniciais sem origem confirmada exigem adoção explícita no próprio sistema de origem, com comprovação do Node e hashes do lockfile e da instalação pnpm. Não remova `active.json`, `identity.json`, `journal.json` ou `lock.json` para contornar uma recusa. O gerenciador nunca remove automaticamente lock alheio. Falhas de rename preservam o journal e bloqueiam outra ativação; a API explícita `recuperar()` reverte apenas movimentos verificáveis, sob lease e sem aplicação ativa. Ambiguidades preservam os arquivos para análise. A CLI não oferece ativação nem recuperação automática.

O contrato completo e as limitações do inventário estão em [Alternância serial dos artefatos](./launchers.md#alternância-serial-dos-artefatos--implementação-da-tarefa-174). Esta implementação e seus testes isolados não significam conclusão integral da tarefa 174; consulte o gestor para a validação real de cada sistema e de cada comando.

### Painel TUI-WEBNOVA (WSL2 Ubuntu)

O `tui-webnova.sh` é um orquestrador **independente** com painel web local: não chama os launchers nem outros scripts do projeto, e depende só de Bash e Python 3.10+ (biblioteca padrão). Ele mostra a saída de cada comando **ao vivo** em um terminal real (PTY + xterm.js), onde você digita, responde perguntas (`s`/`y`/`n`, Ctrl+C) e abre um shell na raiz do projeto. Sua existência não comprova a migração da tarefa 174.

```bash
./tui-webnova.sh                       # abre o painel (o endereço com token aparece no terminal)
./tui-webnova.sh --no-browser          # só imprime o endereço
./tui-webnova.sh --list-actions-json   # lista as ações
./tui-webnova.sh --run-action <id>     # executa uma ação direto no terminal
./tui-webnova.sh --self-test           # autoverificação do próprio script
```

| Grupo          | Ações                                                                                                                                                                                                       |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Instalação     | Check-up do ambiente · Instalar requisitos (apt, nvm/Node, pnpm, dependências; nunca reinstala o que existe) · Instalar banco de dados (Docker, `.env.local`, MySQL) · Infraestrutura do app (tudo + build) |
| Banco de dados | Migrations (só as pendentes, com checksum, mais o administrador inicial)                                                                                                                                    |
| Aplicação      | Iniciar app (dev ou produção) · Parar app                                                                                                                                                                   |
| Backups        | Backup full do banco · Backup full do app · Backup full do app e banco (com SHA-256)                                                                                                                        |
| Manutenção     | Atualizar versão do app (backup obrigatório, `merge --ff-only`, build e rollback automático) · Restaurar backup do banco · Limpeza segura                                                                   |
| Qualidade      | Verificação ponta a ponta · Segurança e supply chain (permissões, portas, `pnpm audit`) · Quality gates (Prettier, ESLint, tipos, testes)                                                                   |
| Ferramentas    | Terminal do projeto (shell interativo na raiz)                                                                                                                                                              |

Garantias:

- **Nenhum log em disco**: a saída existe só na memória do painel; ao iniciar o app, define `WEBNOVA_SEM_LOGS=1`, que desliga o arquivo de log do servidor MCP de desenvolvimento do Next.js.
- **Exclusivo do WSL2**: recusa WSL1 e Linux comum. Para testar em outro Linux, use `WEBNOVA_PERMITIR_LINUX=1`.
- **Acesso protegido**: o painel escuta só em 127.0.0.1, exige token em toda chamada e recusa Host estranho (proteção contra DNS rebinding).
- **Ações destrutivas confirmadas**: atualizar, restaurar e limpar pedem a palavra de confirmação. Em `--run-action` sem terminal interativo, informe-a em `WEBNOVA_CONFIRMACAO` (ex.: `WEBNOVA_CONFIRMACAO=ATUALIZAR`).
- Os backups ficam em `backups/` (fora do Git, permissão 700).

### Modelo de IA local (opcional)

Sem configuração, o "Seu dia" é escrito pelo motor védico da Lyra. Para usar um modelo local:

1. Instale e inicie um servidor compatível com a OpenAI, por exemplo o [Ollama](https://ollama.com) (`ollama pull qwen2.5:7b-instruct`), o LM Studio (Developer → Start Server), o Jan (Local API Server) ou o `llama-server` do llama.cpp.
2. Entre como administrador em **Admin → Modelos de IA**, escolha o provedor (a URL padrão já vem preenchida), clique em **Buscar modelos**, escolha o modelo, **Testar conexão** e **Salvar provedor**.
3. Com a Lyra em contêiner, troque `localhost` por `host.docker.internal` na URL.

A saída deve passar nas validações de estrutura, identidade e conteúdo do app; uma conexão HTTP bem-sucedida não comprova a qualidade da geração. Detalhes em [`docs/ia-automatica.md`](./ia-automatica.md).

### Caminho manual

```bash
pnpm install                 # instala as dependências
pnpm env:init                # cria o .env.local (segredos gerados) a partir do .env.example
pnpm db:start                # sobe o MySQL (docker compose --env-file .env.local) e aplica as migrações
pnpm dev                     # inicia o servidor de desenvolvimento
```

O `pnpm dev` confere o banco antes de iniciar (`scripts/verificar-banco.mjs`): sem o MySQL no ar, com credencial recusada ou com migrations pendentes, ele para e mostra o comando que resolve. Com o servidor já rodando, uma queda do banco faz as APIs responderem `503` ("banco de dados indisponível") e o terminal mostra a causa; o app volta sozinho quando o banco volta.

> [!IMPORTANT]
> **Banco criado com MySQL 8.0?** O MySQL 8.0 está em fim de vida desde 2026-04-30 e o projeto usa o **MySQL 9.7 LTS**. O MySQL não aceita o salto direto 8.0 → 9.7 (recusa o datadir com `MY-014060`, sem alterar os dados). Antes de subir o banco com o `compose.yaml` atual, rode uma vez:
>
> ```bash
> pnpm db:upgrade   # backup a frio do volume → usuários para caching_sha2_password → 8.0 → 8.4 LTS → 9.7 LTS
> ```
>
> O comando é idempotente, faz backup verificado antes de qualquer alteração e informa como desfazer (`node scripts/mysql-upgrade.mjs --restaurar <volume_de_backup>`).

<details>
<summary><strong>Banco de dados: migrations, fuso e backup</strong></summary>

- **Migrations** (`mysql/migrations/*.sql`, aplicadas por `pnpm db:migrate` em ordem de nome): cada arquivo é registrado em `_lyra_schema_migrations` com o SHA-256 do conteúdo (fins de linha normalizados). Uma migration já aplicada nunca é editada — o runner recusa conteúdo divergente; correções entram em um arquivo novo. Como o MySQL faz commit implícito em DDL, migrations com `ALTER` verificam o estado no `information_schema` antes de alterar, para que uma reexecução após falha parcial seja segura. Uma falha informa o arquivo e o erro do MySQL.
- **Fuso:** o servidor roda em UTC (`--default-time-zone=+00:00` no `compose.yaml`) e a aplicação envia datas em UTC (`timezone: 'Z'` no mysql2), então `NOW()`, `UTC_TIMESTAMP()` e as datas gravadas pelo Node.js são coerentes em qualquer fuso da máquina. Em um MySQL fora do Compose, configure o mesmo `default-time-zone`.
- **Administradores de bootstrap:** criados por `pnpm db:migrate` a partir do `.env.local`; reexecuções não alteram a linha, e a senha só é regravada quando o valor do `.env.local` muda. Deixar `ADMIN_BOOTSTRAP_EMAIL` e `ADMIN_BOOTSTRAP_PASSWORD` vazios desativa o bootstrap.
- **Testes de integração** (`pnpm test:integration`): com o MySQL do projeto em execução, criam `<MYSQL_DATABASE>_test` (via `MYSQL_ROOT_PASSWORD`), aplicam as migrations reais, testam API de dados, planos e webhook da Stripe contra esse banco e o removem ao final; o banco de desenvolvimento não é tocado.
- **Backup e restauração:** `pnpm db:backup` para o MySQL, copia o volume para `lyra-metacare_mysql_data_backup_<data>`, confere a cópia e religa o banco se ele estava ativo; `pnpm db:restore <volume>` restaura (recriando o volume pelo Compose se necessário). Os volumes de backup aparecem em `docker volume ls --filter name=_backup_`. O `purge` dos launchers e o `pnpm db:upgrade` fazem esse backup antes de qualquer alteração.

</details>

<details>
<summary><strong>Variáveis de ambiente (.env.local)</strong></summary>

O `.env.local` é a **fonte única de configuração**, lida pelo Next.js, pelos scripts do banco, pelo Docker Compose (`--env-file .env.local`) e pelos launchers. Ele é criado ou completado por `pnpm env:init` (os launchers chamam o mesmo comando) a partir do [`.env.example`](../.env.example), que documenta cada variável:

- os segredos (`MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `AUTH_SECRET` e `ADMIN_BOOTSTRAP_PASSWORD`) são gerados com aleatoriedade criptográfica — não existem senhas padrão;
- valores existentes nunca são sobrescritos, e o arquivo é gravado com permissão `0600`;
- variáveis que o `.env.example` não documenta mais são avisadas, nunca apagadas;
- `AUTH_SECRET` precisa ter pelo menos 32 bytes (HS256): a aplicação recusa um valor mais curto. Ele também deriva a chave que cifra a chave de API do modelo de IA: trocá-lo exige informar essa chave de novo no admin.
- o modelo de IA da plataforma não usa variável de ambiente: é escolhido em **Admin → Modelos de IA** e guardado no banco.

**Administrador de desenvolvimento local:** o e-mail é `ADMIN_BOOTSTRAP_EMAIL` (padrão `admin@lyra.local`) e a senha é o valor gerado em `ADMIN_BOOTSTRAP_PASSWORD` no seu `.env.local`.

> [!NOTE]
> Bancos criados antes desta versão foram inicializados com as senhas fixas do `compose.yaml` antigo. O MySQL só aplica `MYSQL_PASSWORD` e `MYSQL_ROOT_PASSWORD` na criação do volume: mantenha no `.env.local` os valores com que o seu banco foi criado (o `pnpm env:init` não altera valores existentes).

</details>

---

## 📜 Scripts disponíveis

| Comando                                              | Descrição                                                                      |
| ---------------------------------------------------- | ------------------------------------------------------------------------------ |
| `pnpm dev`                                           | Servidor de desenvolvimento (Next.js)                                          |
| `pnpm build` / `pnpm start`                          | Build de produção / execução                                                   |
| `pnpm test`                                          | Testes unitários (Vitest), sem infraestrutura externa                          |
| `pnpm test:integration`                              | Testes contra o MySQL real em um banco isolado `<banco>_test`                  |
| `pnpm test:coverage`                                 | Unitários + integração com relatório de cobertura (`coverage/`)                |
| `pnpm test:launchers`                                | Suíte de contratos dos launchers; não substitui provas reais em WSL2 e Windows |
| `pnpm check:types`                                   | Verificação de tipos (`tsc --noEmit`)                                          |
| `pnpm check:lint` / `pnpm fix:lint`                  | Lint (ESLint) — checar / corrigir                                              |
| `pnpm check:format` / `pnpm fix:format`              | Formatação (Prettier) — checar / corrigir                                      |
| `pnpm env:init`                                      | Cria ou completa o `.env.local` a partir do `.env.example`                     |
| `pnpm db:start` / `pnpm db:migrate` / `pnpm db:stop` | Banco: subir+migrar / migrar / parar                                           |
| `pnpm db:logs`                                       | Acompanha o log do MySQL                                                       |
| `pnpm geo:cidades`                                   | Regenera a base local de cidades (GeoNames)                                    |
| `pnpm db:upgrade`                                    | Upgrade controlado do volume MySQL (8.0 → 8.4 → 9.7 LTS) com backup            |
| `pnpm db:backup`                                     | Backup a frio verificado do volume do MySQL (`BACKUP_VOLUME=<nome>`)           |
| `pnpm db:restore <volume_de_backup>`                 | Restaura o volume a partir de um backup                                        |

- Launchers `run.sh` (WSL2/Ubuntu) e `run_windows.py` (Windows nativo), contrato da tarefa 174 e histórico da arquitetura anterior: [`docs/launchers.md`](./launchers.md).
- Mapa das rotas da API (autenticação, entrada, saída, erros e tabelas): [`docs/api.md`](./api.md).
- Mapa védico e dia védico (método, base de cidades e validação contra o Swiss Ephemeris): [`docs/astrologia.md`](./astrologia.md).
- Coach diário "Seu dia" (regras, rotina automática, notificações e privacidade): [`docs/coach.md`](./coach.md).
- O que a IA faz sozinha (prontidão gravada, metas automáticas, sequências, plano que se refaz, dica do dia, monitoramento e a leitura védica do "Seu dia" por qualquer modelo de IA, inclusive local): [`docs/ia-automatica.md`](./ia-automatica.md).
- Memória pessoal Graphiti (infraestrutura, provedores, controles, fila, privacidade e verificação real): [`docs/memoria-graphiti.md`](./memoria-graphiti.md).
- Modelo de segurança (sessão, CSRF, limites de tentativa, cabeçalhos, XSS, dados de saúde, Stripe e Sentry): [`docs/seguranca.md`](./seguranca.md).
- LGPD (consentimentos, exportação, exclusão e dados fiscais): [`docs/lgpd.md`](./lgpd.md).
- Performance (medições por rota, gargalos corrigidos e como medir): [`docs/performance.md`](./performance.md).
- Acessibilidade (auditoria axe, correções e limitações conhecidas): [`docs/acessibilidade.md`](./acessibilidade.md).
- Sistema visual "Lyra Clean" (tokens, forma, tipografia e estrutura das telas): [`docs/design-system.md`](./design-system.md).

---

## 🏗️ Arquitetura

Aplicação Next.js full-stack: **backend (rotas API) e frontend convivem no mesmo servidor**, com MySQL como persistência e motores de domínio isomórficos (executáveis no servidor **e** no cliente).

```
src/
├─ app/                # Rotas (App Router): dashboard, plano, metas, chat, admin, APIs…
├─ components/         # UI por domínio (dashboard, chat, profile, admin, layout, ui/…)
├─ hooks/              # Hooks de dados e estado (use-daily-metrics, use-profile, use-privacy-mode…)
├─ context/            # Contextos (auth, orquestrador de saúde)
├─ integrations/mysql/ # Cliente de dados (builder estilo query)
└─ lib/
   ├─ ai/              # chat, plano, score, agente, dica do dia e provedores de IA (local ou nuvem)
   ├─ coach/           # "Seu dia": períodos, prontidão, leitura védica, rotina e IA
   ├─ astrology/       # efemérides siderais, mapa natal, Vimshottari, Panchang, horas planetárias
   ├─ metricas · metas · kpi   # registro do dia, escores, metas e sequências automáticas
   ├─ longevity/       # biological-age-engine (idade biológica)
   ├─ health/          # early-warning-engine (detecção precoce)
   ├─ cycle/           # menstrual-engine (saúde da mulher)
   ├─ ayurveda · chakra · prana · vedanta · quantum   # motores integrativos
   ├─ lgpd · security · notificacoes · geo   # titular, cifra/CSRF, sino e cidades
   ├─ mysql/           # pool, data-api, table-config, types
   ├─ plans/           # billing/entitlements
   └─ site-page-config   # builder visual e conteúdo dinâmico

mysql/migrations/      # Migrações versionadas e idempotentes (checksum)
scripts/               # migrações, env-init, upgrade/backup do MySQL e verificação da app
tests/                 # integração (MySQL real), launchers e servidor de IA compatível com a OpenAI
run.sh                 # Orquestrador WSL2/Ubuntu definido pela tarefa 174
run_windows.py         # Orquestrador Windows 11 nativo definido pela tarefa 174
tui-webnova.sh         # Painel TUI-WEBNOVA (WSL2): orquestrador independente com terminal ao vivo
```

**Princípio-chave:** os motores em `lib/` são puros e determinísticos. Isso os torna **testáveis** e permite que idade biológica, detecção precoce, ciclo e ações proativas rodem **no dispositivo do usuário**, sustentando o Modo Privacidade.

---

## 🧪 Testes & Qualidade

As contagens do parágrafo seguinte são o registro histórico preservado da tarefa 116. Não representam reexecução nem aprovação da tarefa 174. Para esta migração, exigir em ambos os sistemas startup com banco existente, migrations, saúde HTTP/MySQL, logs, estado, parada, reinício, idempotência, processo ocupante preservado, isolamento de Node e interação TTY/sem TTY. Os resultados atuais ficam no gestor e no relatório específico da entrega.

- **655 testes unitários** (motores de domínio, mapa védico, coach e leitura, linguagem simples das leituras, leitura da semana, cliente de IA, cifra, autenticação, segurança, configuração, contraste WCAG dos temas, iCalendar, respiração guiada, reflexão, retrospectiva da semana e detecção da saída da página) e **453 testes de integração** contra um MySQL real isolado (API de dados, rotas administrativas, coach, modelos de IA, metas, métricas, reflexão, respiração, agenda no calendário, semana, lembretes pessoais, busca nas conversas, favoritos, rotinas pessoais, acontecimentos e comparações descritivas, LGPD, planos, billing e webhook da Stripe), além de **30 testes dos launchers** (`pnpm test:launchers`). As integrações de IA usam contratos HTTP controlados compatíveis com a OpenAI (`tests/support`); elas não comprovam inferência de um modelo externo.
- Portões de qualidade obrigatórios antes de cada entrega:

```bash
pnpm fix:format && pnpm fix:lint
pnpm exec next typegen  # gera as declarações do Next.js em uma cópia limpa
pnpm check:lint && pnpm check:format && pnpm check:types
pnpm test && pnpm test:integration   # integração exige o MySQL do projeto em execução
pnpm build
```

Política de engenharia: correção sempre pela **causa raiz**, sem placeholders, sem hardcode e sem cortes de código.

---

## 🔐 Segurança & Privacidade

- **Modo Privacidade:** índices de inteligência calculados no navegador; com o modo ativo, o chat é atendido **apenas pelo motor local**, sem enviar dados a modelos externos.
- **BYOK (Bring Your Own Key):** a chave do modelo externo (Gemini) permanece no dispositivo do usuário; o app nunca a persiste.
- **Modelo de IA da plataforma:** a leitura védica envia só dados astrológicos (sem nome, e-mail, nascimento bruto ou cidade); a chave de API fica cifrada com AES-256-GCM no banco e nunca volta ao navegador; o chat restringe provedores externos conforme a autorização de nuvem e o modo privado do titular.
- **Explicações do painel:** textos separados das medições, com origem explícita, cache, limites e privacidade. A prova com modelo real da tarefa 115 permanece pendente; consulte [a auditoria](./auditoria/2026-10-27-painel-115.md).
- **LGPD:** consentimentos com versão e data, exportação e exclusão da conta pelo próprio titular.
- **Autenticação:** sessão via cookie `httpOnly` assinado; papel e e-mail relidos do banco a cada requisição; rotas administrativas protegidas por papel (`role = 'admin'`); limite de tentativas de login e cadastro; proteção CSRF por origem nas rotas `/api`.
- **Dados sensíveis:** segredos ficam em `.env.local` (fora do versionamento); logs sem dados pessoais nem de saúde; cabeçalhos de segurança (CSP, HSTS, `frame-ancestors`); rich text sanitizado com allowlist.
- **Observabilidade:** Sentry opcional (carregado só com DSN configurado), sem enviar dados de saúde.
- Detalhes: [`docs/seguranca.md`](./seguranca.md).

---

## 🤝 Contribuição

1. Leia o [`AGENTS.md`](../AGENTS.md) e o [`CLAUDE.md`](../CLAUDE.md): o trabalho é feito diretamente na `main`, em tarefas atômicas (um commit e um push por tarefa, sem force-push), com o andamento registrado no [`claude-gestao.md`](../claude-gestao.md).
2. Garanta os portões de qualidade verdes (`check:types`, `check:lint`, `check:format`, `test`, `test:integration`, `build`).
3. Escreva no mesmo padrão do código existente, em **pt-BR**, sem placeholders.
4. Descreva na mensagem de commit a mudança e as evidências de validação.

---

## 📄 Licença

Distribuído sob a licença **MIT**. Consulte o arquivo [LICENSE](../LICENSE) para os termos completos.

---

## Lembretes pessoais

A central e o sino compartilham avisos persistidos, com dias, horário, fuso,
silêncio e adiamento. A entrega depende do app aberto e visível; não existe
push ou e-mail. Contratos, recorrência, concorrência, retenção e testes estão
em [Lembretes pessoais](./lembretes-pessoais.md).

## Experiências pessoais acompanhadas

Em **Minhas experiências**, defina objetivo, pequena mudança, duração e
referência anterior. Confira o alinhamento do sono antes de iniciar: a
proposta permanece preservada. Registre apenas o que observou em cada dia;
um dia sem relato fica desconhecido. Pausar não aumenta o prazo e exclui
os dias tocados pela pausa das medianas. Encerre quando desejar revisar;
o encerramento não pode ser revertido. A comparação é descritiva e não
comprova efeito da mudança. Saiba mais em
[Experiências pessoais](./experiencias-pessoais.md).

## Meu relatório pessoal em PDF

Abra **Meu relatório pessoal**, escolha até 90 dias dentro do histórico do
plano e marque individualmente os registros e relatos desejados. Notas
não entram por padrão. Clique em **Preparar prévia**, confira período,
unidades, lacunas e notas e use **Baixar PDF revisado**. Se os registros
mudarem, prepare outra prévia. O aplicativo não envia o arquivo: você
decide onde guardar e com quem compartilhar. O relatório descreve seus
registros e não é diagnóstico. Veja [os detalhes](./relatorio-pessoal.md).

## Descanso e retorno gradual

Abra **Modo descanso**, escolha início e fim opcional e marque quais metas
deseja adaptar. Seus alvos e prazos originais não são reescritos. Ao
confirmar, convites de bem-estar ficam pausados e pendências são dispensadas,
sem recuperação em lote. Você pode continuar registrando seu dia por vontade
própria. Dias tocados pela pausa ficam neutros, sem contar como cumpridos.

Ao encerrar, escolha previamente ritmo habitual ou retorno gradual por
3/7/14 dias, sem avisos ou com até um lembrete diário de uma atividade
autorizada e já cadastrada. Você pode concluir o retorno antes. Consulte
o histórico e os prazos efetivos em **Modo descanso** e **Metas**. A pausa
não muda cobrança da assinatura ou consultas. Veja
[os efeitos completos](./modo-descanso.md).
