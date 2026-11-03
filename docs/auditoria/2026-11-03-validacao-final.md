# Validação final da instrução mestra (2026-11-03)

Executada sobre a `main` em `429da83`, no ambiente de trabalho Linux
(Ubuntu 24.04.5 LTS, equivalente ao WSL2), com Node.js 24.21.0, pnpm 11.28.4
via Corepack, Python 3.13.18, Docker Engine 29.9.2, Docker Compose 5.6.1 e
MySQL 9.7.2.

## Instalação limpa e gates

| Etapa                                                          | Resultado                                                                                                                               |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `rm -rf node_modules .next` + `pnpm install --frozen-lockfile` | exit 0, sem avisos                                                                                                                      |
| `pnpm check:lint` · `check:format` · `check:types`             | exit 0                                                                                                                                  |
| `pnpm test`                                                    | 990 testes em 93 arquivos                                                                                                               |
| `pnpm test:integration` (MySQL real, banco isolado)            | 601 testes em 67 arquivos                                                                                                               |
| `pnpm test:launchers`                                          | 30 testes                                                                                                                               |
| `pnpm build`                                                   | exit 0, sem avisos                                                                                                                      |
| `docker compose --env-file .env.local config -q`               | exit 0                                                                                                                                  |
| `pnpm db:migrate` (repetido)                                   | "Já aplicada" em todas, 66/66                                                                                                           |
| `pnpm audit`                                                   | 2 avisos novos corrigidos no Sentry (commit `429da83`); 1 aviso restante só nas ferramentas de lint, investigado e registrado no painel |

## Launchers

| Comando                                                            | Resultado                                                                                                                                                 |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `python3 run.py doctor`                                            | ambiente saudável: plataforma, Ubuntu, Python/Rich no venv, Node, pnpm, Docker, Compose, `.env.local` 600, dependências, portas, MySQL e 66/66 migrations |
| `python3 run.py up --prod`                                         | MySQL, migrations, memória Graphiti, build, app, `/api/health`, `/`, `/login` e login do administrador aprovados                                          |
| `python3 run.py up --prod` (segunda vez)                           | "Já em execução… nada a fazer", sem duplicar processos, migrations ou administrador                                                                       |
| `python3 run.py status` · `logs app`                               | estado consolidado e logs reais                                                                                                                           |
| `python3 run.py stop` → `up --prod`                                | porta liberada, MySQL parado; nova subida com o banco existente preservou os dados (assinatura Care da tarefa 106 continuou ativa)                        |
| `bash run.sh doctor` · `status` · `stop` · `up --prod` · `logs db` | todos com exit 0 no bash 5.2 do Linux (modo equivalente)                                                                                                  |
| `python3 run_windows.py --help` · `doctor`                         | fora do Windows, delega ao `run.sh`, como documentado; com o Node 22 do sistema no PATH, o diagnóstico apontou corretamente a exigência do Node 24.21.0   |

### Falhas controladas

- **Docker desligado:** o `doctor` aponta "daemon inacessível" com a correção,
  e o `up` para antes de qualquer ação (exit 1).
- **Porta 3000 ocupada por outro programa:** o `up` identificou o PID, o
  comando e o usuário, não tocou no processo e subiu a aplicação em 3001.
- **Node fora da versão:** o diagnóstico orienta instalar o Node 24.21.0 do
  `.nvmrc`.

## Ajustes do ambiente desta sessão (fora do repositório)

Estes ajustes valem só para esta sessão de trabalho e não mudam o projeto.
O computador do usuário não precisa deles.

- **Limite do Docker Hub:** a primeira subida falhou com 429 Too Many Requests
  ao baixar `python:3.14.4-slim`, e o launcher diagnosticou a causa. O daemon
  da sessão passou a usar o espelho oficial `mirror.gcr.io`.
- **Certificado do proxy:** o tráfego HTTPS dos contêineres desta sessão passa
  por um proxy com certificado próprio, e o `pip` do build da memória recusou
  a conexão (`CERTIFICATE_VERIFY_FAILED`). A imagem base oficial recebeu
  localmente esse certificado. O build do projeto rodou então sem alteração,
  com TLS verificado.

## Git

- `main` igual a `origin/main` e sem alterações pendentes.
- `.env.local`, `.logs`, `.lyra-run`, `node_modules` e `.next` estão ignorados.
- Nenhum segredo real versionado: a varredura encontrou apenas valores
  fictícios de teste.
- A chave de teste da Stripe informada pelo usuário foi gravada apenas cifrada
  no banco local, pelo próprio app. Os arquivos temporários da sessão foram
  apagados.

## Fronteira

O modo principal do `run.sh` é o Git Bash do Windows 11, e ele não pôde ser
executado aqui: este ambiente não tem Windows nem acesso a um shell do Windows
do usuário. O mesmo script foi validado no bash do Linux, e os testes do
launcher cobrem a detecção de MINGW, MSYS e Cygwin. Para confirmar no Windows,
basta rodar `./run.sh doctor` e `./run.sh up` no Git Bash.
