# Launchers da iLyra

## Arquitetura definida pela tarefa 174 · 10-11-2026

A tarefa 174 substituiu a arquitetura anterior por **dois orquestradores independentes**, comprovados nas provas reais abaixo. As evidências também ficam no [gestor de tarefas](../claude-gestao.md).

| Entrada             | Ambiente                   | Responsabilidade                                                      |
| ------------------- | -------------------------- | --------------------------------------------------------------------- |
| `./run.sh`          | WSL2/Ubuntu                | Orquestração Bash completa com ferramentas Linux.                     |
| `py run_windows.py` | Windows 11, PowerShell/CMD | Orquestração Python nativa do Windows, sem delegar a Git Bash ou WSL. |

O `run.py` foi retirado depois das provas reais dos dois substitutos (ver "Provas reais da tarefa 174"). Dados, estado de processos e configurações foram preservados.

### Runtime e estado separados

- **WSL2/Ubuntu:** Node.js Linux na versão fixada em `.nvmrc`/`.node-version`, Corepack e pnpm Linux. Recusar `node.exe`, executáveis Windows herdados pelo PATH e versões incompatíveis com `package.json`.
- **Windows 11:** Node.js Windows e Corepack/pnpm Windows. Recusar execução por ferramentas Linux ou delegação ao WSL. A resolução do executável e sua plataforma devem aparecer no diagnóstico sem expor segredos.
- Fontes, lockfile e configuração apropriada podem ser compartilhados; `node_modules`, saídas nativas e artefatos de build de um sistema não devem ser reutilizados cegamente pelo outro. A implementação deve detectar incompatibilidade antes de executar o app.
- Estado da aplicação separado em **`.lyra-run/linux/`** e **`.lyra-run/windows/`**, incluindo metadados e PID da própria instância. Um PID Linux nunca identifica um processo Windows, nem o inverso. Estado legado em `.lyra-run/app.json`, `.lyra-run/app.pid` ou `.lyra-run-windows/` exige identificação e migração segura; sua presença não autoriza encerrar processos.
- Manter logs sanitizados com plataforma e instância identificáveis. Segredos de `.env.local`, credenciais e dados pessoais não entram nos registros.

### Alternância serial dos artefatos · implementação da tarefa 174

O checkout mantém uma única cópia das fontes. O gerenciador `scripts/launcher_artifacts.py` alterna **serialmente** os artefatos entre a raiz e os caches `.lyra-run/artifacts/linux/` e `.lyra-run/artifacts/windows/`. Não cria links, não copia fontes e não apaga um build para trocar de sistema. Os cinco artefatos controlados são:

| Artefato                     | Motivo do isolamento                                  |
| ---------------------------- | ----------------------------------------------------- |
| `node_modules`               | Instalação pnpm e dependências nativas da plataforma. |
| `.next`                      | Build, caches e declarações geradas pelo Next.js.     |
| `next-env.d.ts`              | Referências geradas para o build ativo.               |
| `tsconfig.tsbuildinfo`       | Estado incremental do TypeScript.                     |
| `public/offline-assets.json` | Inventário de recursos do build ativo.                |

**Não executar os dois runtimes simultaneamente nesse checkout.** O lock global `.lyra-run/artifacts/lock.json` é criado com exclusão atômica e identifica token, PID, plataforma e instante de criação do processo. A API `transacao()` mantém esse lease durante a ativação, instalação, build, início e registro do estado da aplicação. A reentrada do mesmo gerenciador só é aceita no mesmo processo e thread. Outra instância recusa a operação; não espera indefinidamente nem remove automaticamente lock alheio, mesmo aparentemente antigo. Uma exceção libera somente o lock comprovadamente próprio e preserva os artefatos e o journal.

Antes de mover qualquer artefato, `ativar()` recusa estado de aplicação atual ou legado em qualquer plataforma. O inventário também verifica processos sem estado: `/proc` no Linux e nas distros WSL já em execução, mais CIM no Windows. As consultas não iniciam distros e não encerram processos. No Windows, CIM não fornece o diretório de trabalho: comandos com a raiz explícita bloqueiam; candidatos Next/pnpm/Corepack relativos sem origem atribuível também bloqueiam. Processos Node externos sem assinatura da aplicação não são tratados como prova de uso deste checkout. Falha de inventário recusa a alternância.

#### Adoção inicial e recuperação

1. Pare somente a aplicação cuja propriedade esteja comprovada, pelo launcher que a iniciou. Não apague metadados de PID para forçar a troca; processos vivos sem estado continuam impedindo a operação.
2. Consulte `status` ou `planejar`, que são somente leitura. No Windows: `py scripts/launcher_artifacts.py status` e `py scripts/launcher_artifacts.py planejar --destino windows`. No WSL2, use `python3` e `--destino linux`.
3. Se a raiz contém artefatos sem manifesto de origem, a adoção automática é recusada. A integração deve fornecer `ComprovacaoOrigem` no próprio sistema de origem: executável Node absoluto com plataforma verificada, SHA-256 do `pnpm-lock.yaml` e evidências da instalação pnpm (`.modules.yaml` e `.pnpm/lock.yaml`). Um nome de pasta ou um PID, isoladamente, não comprova a origem.
4. Os movimentos usam rename sem sobrescrita. Uma identidade UUID vincula os metadados ao checkout, permitindo sua representação Windows e WSL sem confundir caches de outro projeto. Caminhos com traversal, links ou junções na raiz/controle são recusados; conteúdo existente no destino nunca é sobrescrito.
5. Se houver interrupção, `journal.json` registra a operação e impede nova ativação. A API explícita `recuperar()`, sob o mesmo lease e com a aplicação parada, reverte os movimentos verificáveis. Ambiguidades preservam os caminhos e o journal para diagnóstico. A CLI pública oferece apenas `status` e `planejar`; não há comando de remoção automática do journal ou do lock.

Para reuso idempotente ou parada, `exigir_plataforma_ativa(destino)` valida manifesto e ausência de journal sob lease, sem mover artefatos e sem exigir que o app já esteja parado. Chamadores devem manter a transação aberta até concluir a operação protegida. Comandos manuais de pnpm/Next fora dessa transação não recebem automaticamente a proteção do gerenciador.

Os testes de filesystem, lease, falhas e processo descartável estão em `tests/launchers/test_launcher_artifacts.py`. Essas provas não encerram a tarefa 174: startup, parada, reinício, idempotência e paridade reais dos dois orquestradores continuam sujeitos às evidências registradas no gestor.

### Contrato funcional exigido

Os comandos de destino são `help`, `doctor`, `up [--prod]`, `app [--prod]`, `db`, `migrate`, `fix`, `repair [--sim]`, `purge --confirmar-purge`, `status`, `logs [app|db] [--seguir]` e `stop [app|db]`. Sem argumentos, oferecer menu em TTY e ajuda legível sem TTY. Preservar aliases compatíveis do Windows quando existirem, sem transformar o launcher nativo em wrapper.

`up` deve preparar o ambiente de forma reproduzível, preservar `.env.local`, instalar conforme o lockfile, preparar MySQL e migrations, iniciar a memória Graphiti/FalkorDB necessária ao app e aguardar saúde real antes da verificação HTTP. `--prod` inclui build e execução de produção. `app` exige banco saudável; `db` e `migrate` mantêm suas responsabilidades específicas. `stop app` encerra somente a aplicação pertencente à instância; operações de banco preservam volumes e dados. Reparação e exclusão exigem confirmação explícita e backup verificável quando aplicável.

### Portas e propriedade dos processos

**Nunca derrubar um processo ou container para liberar uma porta.** Identificar o ocupante e escolher outra porta disponível, tratando também a disputa entre a sondagem e o início do serviço. Atualizar coerentemente porta efetiva, URLs, healthcheck e conexão com MySQL/memória. Se já houver serviço saudável do projeto, verificar identidade e compatibilidade antes de reutilizá-lo; não parar container existente apenas por conflito de porta.

Parada e reinício só podem atuar na árvore comprovadamente pertencente à instância registrada. Conferir plataforma, identidade do processo e metadados; um PID antigo, reutilizado ou de outro ambiente não basta. Confirmar encerramento real e preservar qualquer ocupante alheio.

### Provas necessárias para fechar a migração

Executar separadamente em WSL2/Ubuntu e Windows 11: ajuda e diagnóstico, startup com banco existente, migrations, saúde HTTP/MySQL, logs, estado, parada, reinício e segunda subida idempotente. Acrescentar provas de Node da plataforma correta, porta ocupada por processo de teste preservado, escolha de outra porta, falhas diagnosticadas e comportamento TTY/sem TTY. Sintaxe, mocks e `doctor` isolados não comprovam paridade operacional. Registrar comandos, exit codes e limitações reais; não converter os resultados históricos abaixo em validação da tarefa 174.

## Uso

| Ambiente                    | Comando                       | Node.js                                                                       |
| --------------------------- | ----------------------------- | ----------------------------------------------------------------------------- |
| WSL2/Ubuntu (ou Linux)      | `./run.sh <comando>`          | Node 24 Linux (nvm, `.nvmrc`); recusa `node.exe` herdado do Windows           |
| Windows 11 (PowerShell/CMD) | `py run_windows.py <comando>` | Node 24 Windows; `LYRA_NODE_BIN` aponta outro Node 24 sem trocar o do sistema |

Sem argumentos, os dois abrem o menu quando há terminal e mostram a ajuda quando não há. O Git Bash e o Cygwin não executam o `run.sh`: no Windows, o launcher é o `run_windows.py`.

| Comando                     | O que faz                                                                                                                                                                    |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `up [--prod]`               | Pré-requisitos → `.env.local` → dependências da plataforma → MySQL → migrations → memória Graphiti → aplicação → verificação (`/api/health`, `/`, `/login`, login do admin). |
| `app [--prod]`              | Memória e aplicação; exige o MySQL saudável.                                                                                                                                 |
| `db`                        | MySQL e migrations.                                                                                                                                                          |
| `migrate`                   | Só as migrations.                                                                                                                                                            |
| `backup [--full]`           | ZIP verificado do banco (ou do app e do banco) na raiz do projeto.                                                                                                           |
| `restore ARQUIVO`           | Restaura o backup selecionado depois de preservar o estado atual (`--confirmar-restauracao` no `run.sh`; `RESTAURAR` no terminal no Windows).                                |
| `doctor`                    | Diagnóstico somente leitura; exit 1 com erro.                                                                                                                                |
| `fix`                       | Correções seguras e idempotentes (`.env.local`, dependências, MySQL e migrations); não inicia a aplicação.                                                                   |
| `repair [--sim]`            | Recria `.next`, `node_modules` e o container do MySQL preservando o volume; pede confirmação.                                                                                |
| `purge --confirmar-purge`   | Apaga o banco local deste projeto depois de um backup verificado.                                                                                                            |
| `status`                    | Aplicação (PID, modo, porta, saúde), MySQL e migrations.                                                                                                                     |
| `logs [app\|db] [--seguir]` | Últimas linhas dos logs; `--seguir` acompanha.                                                                                                                               |
| `stop [app\|db]`            | `app`: só a aplicação. `db`: memória, FalkorDB e MySQL, com os volumes preservados. Sem alvo: os dois.                                                                       |
| `help`                      | Ajuda.                                                                                                                                                                       |

Códigos de saída: `0` sucesso, `1` falha com causa provável e caminho do log, `2` uso incorreto, `130` interrupção (Ctrl+C).

### Memória Graphiti

`up` e `app` sobem e aguardam a saúde do serviço privado `memoria` e do `falkordb` antes do Next.js. O retorno ao aplicativo (`LYRA_MEMORIA_APP_URL`) acompanha a porta efetiva: se a porta da aplicação muda, só o container `memoria` é recriado, sem tocar no FalkorDB nem no volume `memoria_data`. Uma memória parada por `stop` volta a subir; uma memória em execução e sem saúde fica preservada para diagnóstico. Configuração e privacidade em [`memoria-graphiti.md`](./memoria-graphiti.md).

### Backup e restauração

```bash
./run.sh backup [--full]                                  # WSL2: ZIP verificado na raiz
./run.sh restore lyra-backup-<...>.zip --confirmar-restauracao
py run_windows.py backup [--full]                         # Windows 11
py run_windows.py restore lyra-backup-<...>.zip           # pede RESTAURAR no terminal
```

- `backup` grava `lyra-backup-banco-<data>.zip` (ou `-full-`, com fontes e configuração) na raiz do projeto, fora do Git (`.gitignore`), com manifesto, inventário SHA-256 do volume e validação antes de finalizar. O link `mysql.sock` que o MySQL recria a cada partida fica fora; qualquer outro link é recusado.
- `restore` exige a aplicação parada, confere o inventário, faz antes um backup completo do estado atual, prepara o banco num volume próprio (`lyra_restore_<token>`), confere esse volume contra o backup e só então troca o volume do MySQL. Se a preparação falha, o volume próprio é removido e nada muda.
- Cópia a frio do volume, fora dos launchers: `node scripts/mysql-upgrade.mjs --backup` e `--restaurar <volume_de_backup>`.

### Garantias

- **Nenhuma operação destrutiva automática.** Nada de `apt`, `sudo`, remoção de MySQL/MariaDB nativos ou de diretórios fora do projeto. Remoções se limitam a artefatos recriáveis do projeto e, no `purge` confirmado, ao volume do banco depois de um backup verificado.
- **Portas.** O ocupante de uma porta é identificado e nunca é encerrado: a aplicação sobe na próxima porta livre, com `PORT`, `APP_BASE_URL`, `NEXT_PUBLIC_APP_URL` e o retorno da memória ajustados; o MySQL é realocado com `MYSQL_HOST_PORT` e `MYSQL_PORT` atualizados juntos.
- **Processos.** Parada só da árvore comprovadamente pertencente à instância registrada em `.lyra-run/<plataforma>/app.json`: `/proc` no Linux e CIM no Windows, com a porta confirmada livre depois. Se o próprio processo termina ao iniciar, o registro dele sai junto.
- **Artefatos por plataforma.** A troca serial de `node_modules`, `.next` e demais artefatos exige provar que nenhum processo usa o checkout. Um `node.exe` cuja origem não pode ser lida (por exemplo, os processos do Antigravity IDE, filhos do `agy.exe`) bloqueia a troca: feche o IDE e repita.
- **Logs honestos.** Cada execução grava comandos, saída integral e exit code em `.logs/linux/` ou `.lyra-run/windows/logs/`; segredos não entram nos registros.

## Provas reais da tarefa 174 · 21/11/2026

Executadas no mesmo checkout (`D:\02-PROJETOS\Lyra-MetaCare`, visto no WSL2 como `/mnt/d/...`), com o Docker Desktop, MySQL 9.7.2 e 81 migrations.

| Prova                                    | `./run.sh` (Ubuntu no WSL2, Node 24.21.0 Linux)                                                               | `py run_windows.py` (Windows 11, Node 24.21.0 Windows)                                                                         |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `doctor`                                 | Exit 1 com artefatos do Windows (causa e correção); exit 0 após `fix`                                         | Exit 0                                                                                                                         |
| `fix` com troca de artefatos             | Exit 0; artefatos Windows preservados no cache                                                                | Troca de volta pelo próprio `up`                                                                                               |
| `up` com banco existente                 | Exit 0; saúde, `/`, `/login` e login do admin                                                                 | Exit 0 em 26 s; mesma verificação                                                                                              |
| Porta 3000 ocupada por processo de teste | App na 3001; ocupante vivo, HTTP 200                                                                          | App na 3001; ocupante vivo, HTTP 200; só `memoria` recriada                                                                    |
| `status` e `logs app`                    | PID, modo, porta, MySQL e migrations; últimas requisições                                                     | Idem                                                                                                                           |
| Segundo `up` (idempotência)              | Exit 0 em 2 s, sem novo processo                                                                              | Exit 0 em 7 s, sem novo processo                                                                                               |
| `stop app`                               | Árvore de 7 processos encerrada; porta liberada                                                               | Encerrado após conferência CIM; porta liberada                                                                                 |
| Reinício e `stop`                        | `up` e `stop` com memória, FalkorDB e MySQL parados                                                           | Idem; `up` depois do `stop` sobe a memória parada                                                                              |
| Sem TTY                                  | Ajuda, exit 0                                                                                                 | Ajuda, exit 0                                                                                                                  |
| Com TTY                                  | Menu em pseudo-terminal: opção inválida recusada, `status`, saída pelo 0, EOF; `stty` idêntico antes e depois | Menu coberto por teste automatizado (agrupa e despacha só a escolha); o Windows não oferece pseudo-terminal automatizável aqui |
| Backup e restauração                     | 20/11/2026: 103 tabelas idênticas ao backup                                                                   | 20/11/2026: idem                                                                                                               |

Testes automatizados: `tests/launchers` (105 testes no Windows, 19 exclusivos de Linux pulados ali).

## Matriz de paridade

| Função                                        | `run.sh` (WSL2) | `run_windows.py` (Windows) |
| --------------------------------------------- | --------------- | -------------------------- |
| Menu com TTY e ajuda sem TTY                  | ✔               | ✔                          |
| `up` e `app` (`--prod`)                       | ✔               | ✔                          |
| `db` e `migrate`                              | ✔               | ✔                          |
| `backup` e `restore`                          | ✔               | ✔                          |
| `doctor`, `fix`, `repair`, `purge`            | ✔               | ✔                          |
| `status` e `logs [--seguir]`                  | ✔               | ✔                          |
| `stop app`, `stop db` (com a memória), `stop` | ✔               | ✔                          |
| Porta ocupada preservada e porta efetiva      | ✔               | ✔                          |
| Memória reconfigurada para a porta efetiva    | ✔               | ✔                          |
| Verificação ponta a ponta                     | ✔               | ✔                          |
| Aliases antigos (`dev`, `prod`, `health`…)    | —               | ✔                          |

## Histórico

Até a tarefa 174 havia três pontos de entrada: `run.py` (WSL2), `run.sh` (Windows com Git Bash) e `run_windows.py` (wrapper do `run.sh`). A tarefa 174 trocou essa arquitetura pela descrita acima e retirou o `run.py` depois das provas reais dos dois substitutos. O desenho anterior e suas evidências continuam no histórico do Git e no [gestor de tarefas](../claude-gestao.md).
