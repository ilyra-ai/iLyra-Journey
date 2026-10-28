# Lyra MetaCare · Guia operacional

Referência de instalação, configuração, arquitetura e manutenção para quem opera
o projeto. Execute os comandos na raiz do repositório. Este conteúdo foi preservado
do README na tarefa 116. A apresentação para quem usa o app está no
[README](../README.md). As evidências atuais de cada entrega ficam no
[painel de gestão](../claude-gestao.md) e nas auditorias indicadas nele.

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
| **Infra local**     | Docker Compose (MySQL) · pnpm (via Corepack) · `run.py` (WSL2) · `run.sh` (Git Bash)                                                    |

---

## ⚡ Começando

### Pré-requisitos

- **Node.js 24 LTS** (versão exata em `.nvmrc` e `.node-version`, hoje 24.21.0; o `pnpm install` recusa versões fora de `^24.18.1`). Com nvm: `nvm install && nvm use`; fnm e nodenv leem o `.node-version` automaticamente.
- **Docker** (Engine/Desktop) com Docker Compose
- **pnpm 11** via Corepack, incluído no Node.js 24: `corepack enable && corepack install` ativa a versão exata do campo `packageManager`, sem instalação global.
- **Python 3.10+** para o launcher `run.py` (WSL2 Ubuntu / Linux) ou **Bash** (Git Bash no Windows) para o `run.sh`

### Caminho recomendado — um único comando

Os launchers fazem o preflight do ambiente, preparam o `.env.local`, instalam as dependências conforme o lockfile, sobem o **MySQL via Docker Compose**, aplicam as **migrations + administrador inicial**, iniciam a **aplicação** e verificam a saúde ponta a ponta (`/api/health`, páginas e login). Comandos, garantias de segurança e matriz de paridade: [`docs/launchers.md`](./launchers.md).

**WSL2 Ubuntu / Linux** — `run.py`:

```bash
python3 run.py              # menu interativo
python3 run.py up           # tudo, em desenvolvimento (use --prod para build + start)
python3 run.py doctor       # diagnóstico (somente leitura)
python3 run.py fix          # correções seguras e idempotentes
python3 run.py status       # estado consolidado
python3 run.py stop         # para aplicação e banco (dados preservados)
```

**Windows 11 (Git Bash)** — `run.sh` (mesmos comandos e garantias do `run.py`; abra o Git Bash na pasta do projeto, pois CMD e PowerShell não executam `.sh`):

```bash
./run.sh            # menu interativo
./run.sh up         # tudo, em desenvolvimento (use --prod para build + start)
./run.sh doctor     # diagnóstico (somente leitura)
./run.sh fix        # correções seguras e idempotentes
./run.sh status     # estado consolidado
./run.sh stop       # para aplicação e banco (dados preservados)
```

No PowerShell ou CMD, `py run_windows.py <comando>` localiza o Git Bash e executa o mesmo `run.sh`.

Ao final, a aplicação responde em **http://localhost:3000** e o MySQL em **127.0.0.1:3307**. Se uma dessas portas estiver ocupada por outro programa, os launchers não o encerram: usam a próxima porta livre e informam qual. O `doctor` também avisa variáveis do `.env.local` que o app não usa mais (ex.: `GEMINI_API_KEY`), sem apagá-las.

### Painel TUI-WEBNOVA (WSL2 Ubuntu)

O `tui-webnova.sh` é um orquestrador **independente** com painel web local: não chama `run.py`, `run.sh` nem outros scripts do projeto, e depende só de Bash e Python 3.10+ (biblioteca padrão). Ele mostra a saída de cada comando **ao vivo** em um terminal real (PTY + xterm.js), onde você digita, responde perguntas (`s`/`y`/`n`, Ctrl+C) e abre um shell na raiz do projeto.

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

| Comando                                              | Descrição                                                            |
| ---------------------------------------------------- | -------------------------------------------------------------------- |
| `pnpm dev`                                           | Servidor de desenvolvimento (Next.js)                                |
| `pnpm build` / `pnpm start`                          | Build de produção / execução                                         |
| `pnpm test`                                          | Testes unitários (Vitest), sem infraestrutura externa                |
| `pnpm test:integration`                              | Testes contra o MySQL real em um banco isolado `<banco>_test`        |
| `pnpm test:coverage`                                 | Unitários + integração com relatório de cobertura (`coverage/`)      |
| `pnpm test:launchers`                                | Testes do `run.py` e do `run_windows.py` (unittest do Python)        |
| `pnpm check:types`                                   | Verificação de tipos (`tsc --noEmit`)                                |
| `pnpm check:lint` / `pnpm fix:lint`                  | Lint (ESLint) — checar / corrigir                                    |
| `pnpm check:format` / `pnpm fix:format`              | Formatação (Prettier) — checar / corrigir                            |
| `pnpm env:init`                                      | Cria ou completa o `.env.local` a partir do `.env.example`           |
| `pnpm db:start` / `pnpm db:migrate` / `pnpm db:stop` | Banco: subir+migrar / migrar / parar                                 |
| `pnpm db:logs`                                       | Acompanha o log do MySQL                                             |
| `pnpm geo:cidades`                                   | Regenera a base local de cidades (GeoNames)                          |
| `pnpm db:upgrade`                                    | Upgrade controlado do volume MySQL (8.0 → 8.4 → 9.7 LTS) com backup  |
| `pnpm db:backup`                                     | Backup a frio verificado do volume do MySQL (`BACKUP_VOLUME=<nome>`) |
| `pnpm db:restore <volume_de_backup>`                 | Restaura o volume a partir de um backup                              |

- Launchers `run.py`, `run.sh` e `run_windows.py` (comandos, garantias, paridade e validações): [`docs/launchers.md`](./launchers.md).
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
run.py                 # Launcher oficial do WSL2 Ubuntu / Linux
run.sh                 # Launcher do Windows 11 com Git Bash (mesmos comandos do run.py)
run_windows.py         # Atalho para PowerShell/CMD que executa o run.sh
tui-webnova.sh         # Painel TUI-WEBNOVA (WSL2): orquestrador independente com terminal ao vivo
```

**Princípio-chave:** os motores em `lib/` são puros e determinísticos. Isso os torna **testáveis** e permite que idade biológica, detecção precoce, ciclo e ações proativas rodem **no dispositivo do usuário**, sustentando o Modo Privacidade.

---

## 🧪 Testes & Qualidade

- **636 testes unitários** (motores de domínio, mapa védico, coach e leitura, linguagem simples das leituras, leitura da semana, cliente de IA, cifra, autenticação, segurança, configuração, contraste WCAG dos temas, iCalendar, respiração guiada, reflexão, retrospectiva da semana e detecção da saída da página) e **425 testes de integração** contra um MySQL real isolado (API de dados, rotas administrativas, coach, modelos de IA, metas, métricas, reflexão, respiração, agenda no calendário, semana, lembretes pessoais, busca nas conversas, favoritos, LGPD, planos, billing e webhook da Stripe), além de **30 testes dos launchers** (`pnpm test:launchers`). As integrações de IA usam contratos HTTP controlados compatíveis com a OpenAI (`tests/support`); elas não comprovam inferência de um modelo externo.
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
