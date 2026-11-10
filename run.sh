#!/usr/bin/env bash
# =============================================================================
#  Lyra MetaCare · launcher Linux / WSL2 Ubuntu (bash 4+)
# -----------------------------------------------------------------------------
#  Ambiente suportado:
#    - WSL2 Ubuntu é o ambiente oficial, com Node e Corepack Linux.
#    - Linux com bash 4+ é aceito como ambiente equivalente.
#    - No Windows, execute py run_windows.py.
#      Git Bash, Cygwin e Node Windows não executam a aplicação diretamente.
#
#  Uso:
#    ./run.sh                         menu interativo (com terminal) ou ajuda
#    ./run.sh up [--prod]             ambiente → dependências → MySQL →
#                                     migrations → aplicação → verificação
#    ./run.sh app [--prod]            somente a aplicação (banco saudável)
#    ./run.sh db                      MySQL (Docker Compose) + migrations
#    ./run.sh migrate                 somente as migrations
#    ./run.sh doctor                  diagnóstico completo, somente leitura
#    ./run.sh fix                     correções seguras e idempotentes
#    ./run.sh repair [--sim]          recria .next, node_modules e o container
#                                     do MySQL preservando os dados
#    ./run.sh purge --confirmar-purge APAGA o banco local (com backup antes)
#    ./run.sh status                  estado consolidado
#    ./run.sh logs [app|db] [--seguir]
#    ./run.sh stop [app|db]           para aplicação e banco (padrão: ambos)
#    ./run.sh help
#
#  Configuração única no .env.local (scripts/env-init.mjs), banco pelo
#  compose.yaml com `docker compose --env-file .env.local`, estado em
#  .lyra-run/linux/app.json e .lyra-run/linux/app.pid, logs em .logs/linux/.
#  Nenhuma operação destrutiva automática
#  e nenhum processo de terceiros é encerrado.
# =============================================================================

set -uo pipefail

if (( BASH_VERSINFO[0] < 4 )); then
  printf '[ERRO] O run.sh requer bash 4 ou superior (atual: %s). No Windows, use py run_windows.py.\n' \
    "${BASH_VERSION}" >&2
  exit 2
fi

# -----------------------------------------------------------------------------
# Caminhos e constantes
# -----------------------------------------------------------------------------
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly RAIZ
readonly ESTADO=".lyra-run/linux"
readonly LOGS=".logs/linux"
readonly ENV_LOCAL=".env.local"
readonly ENV_EXEMPLO=".env.example"
readonly APP_PID="$ESTADO/app.pid"
readonly APP_META="$ESTADO/app.json"
readonly SERVICO_DB="mysql"
readonly CONTAINER_DB="lyra-metacare-mysql"
readonly PORTA_APP_PADRAO=3000
readonly PORTA_DB_PADRAO=3307
readonly FAIXA_BUSCA_PORTA=50
readonly TEMPO_MAX_APP=240
readonly TEMPO_PARADA_APP=20
readonly LOGS_MANTIDOS=40
readonly COMPOSE_MINIMO="2.20.0"
readonly DOCKER_MINIMO="25.0.0"

# Recusa antes de criar estado/logs: nunca mistura artefatos de Windows e Linux.
case "$(uname -s 2>/dev/null)" in
  Linux*) ;;
  *) printf '[ERRO] Execute no Linux/WSL2 Ubuntu. No Windows, use py run_windows.py.\n' >&2; exit 2 ;;
esac

# Runtime reproduzível já preparado pelo operador; nenhum download implícito.
VERSAO_NODE="$(tr -d '\r\n' <"$RAIZ/.nvmrc")"
RUNTIME_NODE="${LYRA_NODE_BIN:-${HOME}/.local/share/lyra-tools/node-v${VERSAO_NODE}-linux-x64/bin}"
if [[ -x "$RUNTIME_NODE/node" && -x "$RUNTIME_NODE/corepack" ]]; then
  export PATH="$RUNTIME_NODE:$PATH"
fi
readonly VERSAO_NODE RUNTIME_NODE

# Os caminhos permanecem relativos à raiz; o estado Linux não sobrescreve o legado.
cd "$RAIZ" || exit 1
mkdir -p "$ESTADO" "$LOGS"

# O Corepack não deve pedir confirmação para baixar o pnpm do packageManager.
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
export NEXT_TELEMETRY_DISABLED="${NEXT_TELEMETRY_DISABLED:-1}"

# -----------------------------------------------------------------------------
# Plataforma
# -----------------------------------------------------------------------------
PLATAFORMA="desconhecida"
case "$(uname -s 2>/dev/null || echo desconhecido)" in
  MINGW*|MSYS*) PLATAFORMA="windows" ;;
  CYGWIN*)      PLATAFORMA="cygwin" ;;
  Linux*)       PLATAFORMA="linux" ;;
  Darwin*)      PLATAFORMA="macos" ;;
esac
readonly PLATAFORMA

# -----------------------------------------------------------------------------
# Saída no terminal e registro em log
# -----------------------------------------------------------------------------
if [[ -t 1 && -z "${NO_COLOR:-}" ]]; then
  C_OK=$'\033[32m'; C_ERRO=$'\033[1;31m'; C_AVISO=$'\033[33m'; C_INFO=$'\033[36m'
  C_TITULO=$'\033[1;38;5;43m'; C_FRACO=$'\033[2m'; C_NEGRITO=$'\033[1m'; C_FIM=$'\033[0m'
else
  C_OK=""; C_ERRO=""; C_AVISO=""; C_INFO=""; C_TITULO=""; C_FRACO=""; C_NEGRITO=""; C_FIM=""
fi

REGISTRO=""
ULTIMA_SAIDA=""

abrir_registro() {
  local comando="$1"
  REGISTRO="$LOGS/run-sh-$(date '+%Y%m%d-%H%M%S')-${comando}.log"
  printf '# run.sh %s · %s\n' "$comando" "$(date '+%Y-%m-%dT%H:%M:%S')" >>"$REGISTRO"
  # Mantém apenas os registros mais recentes do run.sh.
  local antigos
  antigos="$(find "$LOGS" -maxdepth 1 -name 'run-sh-*.log' -type f | sort | head -n -"$LOGS_MANTIDOS")"
  if [[ -n "$antigos" ]]; then
    while IFS= read -r arquivo; do rm -f -- "$arquivo"; done <<<"$antigos"
  fi
}

registrar() { [[ -n "$REGISTRO" ]] && printf '%s\n' "$1" >>"$REGISTRO"; return 0; }
titulo() { registrar ""; registrar "== $1 =="; printf '\n%s━━ %s ━━%s\n' "$C_TITULO" "$1" "$C_FIM"; }
etapa()  { registrar "▶ $1"; printf '%s▶%s %s%s%s\n' "$C_INFO" "$C_FIM" "$C_NEGRITO" "$1" "$C_FIM"; }
ok()     { registrar "  [OK] $1"; printf '  %s✔%s %s\n' "$C_OK" "$C_FIM" "$1"; }
info()   { registrar "  [INFO] $1"; printf '  %s•%s %s\n' "$C_INFO" "$C_FIM" "$1"; }
aviso()  { registrar "  [AVISO] $1"; printf '  %s⚠%s %s\n' "$C_AVISO" "$C_FIM" "$1"; }
erro()   { registrar "  [ERRO] $1"; printf '  %s✖%s %s\n' "$C_ERRO" "$C_FIM" "$1"; }
detalhe() { printf '    %s%s%s\n' "$C_FRACO" "$1" "$C_FIM"; }

have() { command -v "$1" >/dev/null 2>&1; }

# Preenche à direita contando caracteres (o printf '%-Ns' conta bytes e
# desalinha textos acentuados em UTF-8).
coluna() {  # coluna <texto> <largura>
  # O texto do launcher é UTF-8; a contagem independe do locale do terminal.
  local LC_ALL=C.UTF-8
  local texto="$1" faltam=$(( $2 - ${#1} ))
  (( faltam < 1 )) && faltam=1
  printf '%s%*s' "$texto" "$faltam" ""
}

# Causa provável a partir da saída de um comando que falhou.
diagnosticar() {
  local arquivo="$1"
  [[ -s "$arquivo" ]] || return 0
  local -a padroes=(
    'permission denied.*docker\.sock|permission denied while trying to connect to the docker'
    'Cannot connect to the Docker daemon|Is the docker daemon running|failed to connect to the docker API|if the daemon is running|error during connect|dockerDesktopLinuxEngine'
    'ERR_PNPM_UNSUPPORTED_ENGINE'
    'ERR_PNPM_OUTDATED_LOCKFILE|frozen-lockfile'
    'MY-014060|Cannot upgrade from [0-9]+ to [0-9]+'
    'required variable [A-Za-z_]+ is missing'
    'Access denied for user'
    'ECONNREFUSED|connect ETIMEDOUT|Can.t connect to MySQL'
    'EADDRINUSE|address already in use|port is already allocated'
    'ENOSPC|no space left on device'
    'getaddrinfo|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|TLS handshake timeout'
    '429 Too Many Requests|toomanyrequests'
    'error TS[0-9]+|Failed to type check|Type error:|Failed to compile|Build error occurred|Module not found'
  )
  local -a causas=(
    "seu usuário não tem acesso ao Docker. No Docker Desktop, confira se ele está aberto e com o motor em execução; no Linux: \`sudo usermod -aG docker \$USER\` e reabra o terminal."
    "o Docker não está em execução. Abra o Docker Desktop e aguarde o motor iniciar (no Linux: \`sudo service docker start\`)."
    "versão do Node.js fora do intervalo do package.json. Instale a versão do .nvmrc."
    "o pnpm-lock.yaml não corresponde ao package.json; atualize o repositório (\`git pull\`)."
    "o volume do MySQL foi criado por uma versão antiga; rode \`pnpm db:upgrade\`."
    "o .env.local está incompleto; rode \`pnpm env:init\`."
    "as senhas do .env.local não correspondem às do volume do MySQL (o MySQL só aplica as senhas na criação do volume)."
    "o MySQL não está acessível na porta configurada; rode \`./run.sh db\`."
    "a porta já está em uso por outro processo; veja \`./run.sh doctor\`."
    "sem espaço em disco."
    "falha de rede ou DNS ao baixar dependências ou imagens."
    "limite de downloads do Docker Hub atingido; aguarde alguns minutos ou faça \`docker login\`."
    "erro de compilação ou de tipos no código da aplicação; rode \`pnpm check:types\` e veja o arquivo e a linha no log."
  )
  local i
  for i in "${!padroes[@]}"; do
    if grep -Eiq -- "${padroes[$i]}" "$arquivo"; then
      printf '%s' "${causas[$i]}"
      return 0
    fi
  done
}

# Executa mostrando o comando e a saída integral (stdout e stderr). A saída
# completa fica no registro da execução e em $ULTIMA_SAIDA.
executar() {
  local descricao="$1"; shift
  # Mostra o comando real por trás das funções auxiliares.
  local exibicao="$*"
  case "$1" in
    compose)  exibicao="docker compose --env-file $ENV_LOCAL ${*:2}" ;;
    pnpm_cmd) exibicao="corepack pnpm ${*:2}" ;;
  esac
  registrar "  \$ $exibicao"
  printf '  %s$ %s%s\n' "$C_FRACO" "$exibicao" "$C_FIM"
  [[ -n "$ULTIMA_SAIDA" ]] && rm -f -- "$ULTIMA_SAIDA"
  ULTIMA_SAIDA="$(mktemp)"
  # stdin fechado: nenhum comando do launcher lê do terminal.
  "$@" </dev/null 2>&1 | tee "$ULTIMA_SAIDA" | while IFS= read -r linha; do
    registrar "    $linha"
    detalhe "$linha"
  done
  local codigo="${PIPESTATUS[0]}"
  registrar "  (exit $codigo)"
  if (( codigo != 0 )); then
    local causa
    causa="$(diagnosticar "$ULTIMA_SAIDA")"
    erro "$descricao falhou (exit $codigo).${causa:+ Causa provável: $causa}"
  fi
  return "$codigo"
}

# Consulta rápida, sem eco (registrada no log).
consultar() {
  registrar "  \$ $*"
  local resultado codigo
  resultado="$("$@" </dev/null 2>&1)"
  codigo=$?
  registrar "    exit $codigo: ${resultado:0:2000}"
  printf '%s' "$resultado"
  return "$codigo"
}

compose() {
  if [[ -n "${RETORNO_MEMORIA_APP:-}" ]]; then
    LYRA_MEMORIA_APP_URL="$RETORNO_MEMORIA_APP" docker compose --env-file "$ENV_LOCAL" "$@"
  else
    docker compose --env-file "$ENV_LOCAL" "$@"
  fi
}
pnpm_cmd() { corepack pnpm "$@"; }

# -----------------------------------------------------------------------------
# Configuração (.env.local)
# -----------------------------------------------------------------------------
declare -A ENV_MAP=()

ler_env() {
  ENV_MAP=()
  [[ -f "$ENV_LOCAL" ]] || return 0
  local linha chave valor
  while IFS= read -r linha || [[ -n "$linha" ]]; do
    linha="${linha%$'\r'}"
    [[ -z "${linha// /}" || "${linha#"${linha%%[![:space:]]*}"}" == \#* || "$linha" != *=* ]] && continue
    chave="${linha%%=*}"; chave="${chave//[[:space:]]/}"
    valor="${linha#*=}"
    if [[ "$valor" =~ ^\"(.*)\"$ || "$valor" =~ ^\'(.*)\'$ ]]; then valor="${BASH_REMATCH[1]}"; fi
    ENV_MAP["$chave"]="$valor"
  done <"$ENV_LOCAL"
}

env_valor() { printf '%s' "${ENV_MAP[$1]:-${2:-}}"; }

# Atualiza chaves no .env.local preservando o restante (permissão 0600).
definir_env() {
  local temporario="$ENV_LOCAL.tmp" linha chave encontrado
  declare -A pendentes=()
  while (( $# >= 2 )); do pendentes["$1"]="$2"; shift 2; done
  : >"$temporario"
  while IFS= read -r linha || [[ -n "$linha" ]]; do
    linha="${linha%$'\r'}"
    chave="${linha%%=*}"; chave="${chave//[[:space:]]/}"
    if [[ "$linha" == *=* && "$linha" != \#* && -n "${pendentes[$chave]+x}" ]]; then
      printf '%s=%s\n' "$chave" "${pendentes[$chave]}" >>"$temporario"
      unset 'pendentes[$chave]'
    else
      printf '%s\n' "$linha" >>"$temporario"
    fi
  done <"$ENV_LOCAL"
  for encontrado in "${!pendentes[@]}"; do
    printf '%s=%s\n' "$encontrado" "${pendentes[$encontrado]}" >>"$temporario"
  done
  chmod 600 "$temporario" 2>/dev/null || true
  mv -f -- "$temporario" "$ENV_LOCAL"
  ler_env
}

# -----------------------------------------------------------------------------
# Verificações
# -----------------------------------------------------------------------------
# Resultado de cada verificação: VERIF_NOMES/VERIF_ESTADOS/VERIF_DETALHES/
# VERIF_CORRECOES (estado: ok | aviso | erro).
declare -a VERIF_NOMES=() VERIF_ESTADOS=() VERIF_DETALHES=() VERIF_CORRECOES=()
verif() { VERIF_NOMES+=("$1"); VERIF_ESTADOS+=("$2"); VERIF_DETALHES+=("$3"); VERIF_CORRECOES+=("${4:-}"); }
limpar_verif() { VERIF_NOMES=(); VERIF_ESTADOS=(); VERIF_DETALHES=(); VERIF_CORRECOES=(); }

versao_ge() {  # versao_ge <atual> <mínima>
  [[ "$(printf '%s\n%s\n' "$2" "$1" | sort -V | head -n 1)" == "$2" ]]
}

verificar_plataforma() {
  if grep -qi microsoft /proc/version 2>/dev/null; then
    local identidade
    identidade="$(. /etc/os-release; printf '%s' "${ID:-}")"
    if [[ "$identidade" != ubuntu ]]; then
      verif "Plataforma" erro "WSL fora do Ubuntu" "Execute na distribuição Ubuntu do WSL2."
    elif ! grep -qi 'microsoft-standard-WSL2' /proc/sys/kernel/osrelease; then
      verif "Plataforma" erro "WSL2 não identificado" "Atualize a distribuição Ubuntu para WSL2."
    else
      verif "Plataforma" ok "WSL2 Ubuntu · bash $BASH_VERSION"
    fi
  else
    verif "Plataforma" ok "Linux · bash $BASH_VERSION (equivalente)"
  fi
}

verificar_node() {
  if ! have node; then
    verif "Node.js" erro "não encontrado no PATH" \
      "Instale o Node.js $(cat .nvmrc 2>/dev/null) (versão do .nvmrc) e reabra o terminal."
    return
  fi
  if [[ "$(node -p 'process.platform' 2>/dev/null)" != linux ]]; then
    verif "Node.js" erro "binário não Linux no PATH" "Use Node Linux no WSL2; Node Windows não é aceito."
    return
  fi
  # Comparação de versões feita pelo próprio Node (semver do engines).
  local resultado
  resultado="$(node -e '
    const pkg = require("./package.json");
    const alvo = require("fs").readFileSync(".nvmrc", "utf8").trim();
    const atual = process.versions.node;
    const min = (pkg.engines?.node ?? "").replace(/^\^/, "").split(".").map(Number);
    const at = atual.split(".").map(Number);
    let ok = at[0] === min[0];
    for (let i = 0; ok && i < 3; i++) { if (at[i] > min[i]) break; if (at[i] < min[i]) ok = false; }
    console.log([ok ? (atual === alvo ? "ok" : "aviso") : "erro", atual, alvo, pkg.engines?.node].join(" "));
  ' 2>/dev/null)"
  local estado atual alvo faixa
  read -r estado atual alvo faixa <<<"$resultado"
  case "$estado" in
    ok)    verif "Node.js" ok "$atual" ;;
    aviso) verif "Node.js" aviso "$atual (compatível; o .nvmrc fixa $alvo)" "Para reproduzir exatamente: instale o Node.js $alvo." ;;
    *)     verif "Node.js" erro "${atual:-?} fora de ${faixa:-?} (package.json)" "Instale o Node.js ${alvo:-24 LTS} do .nvmrc." ;;
  esac

  if ! have corepack; then
    verif "Corepack/pnpm" erro "Corepack ausente" "Instale o Node.js 24 LTS (inclui o Corepack)."
    return
  fi
  local caminho_corepack
  caminho_corepack="$(readlink -f "$(command -v corepack)")"
  if [[ "$caminho_corepack" == /mnt/* || "$caminho_corepack" == *.exe || "$caminho_corepack" == *.cmd ]]; then
    verif "Corepack/pnpm" erro "Corepack Windows encontrado no PATH" "Use o Corepack da mesma instalação Linux do Node."
    return
  fi
  local fixado versao
  fixado="$(node -p 'require("./package.json").packageManager.match(/pnpm@([0-9.]+)/)?.[1] ?? ""')"
  versao="$(consultar corepack pnpm --version | tail -n 1 | tr -d '\r')"
  if [[ "$versao" == "$fixado" ]]; then
    verif "Corepack/pnpm" ok "pnpm $fixado via Corepack"
  else
    verif "Corepack/pnpm" erro "pnpm '${versao:-falhou}' diferente do fixado ($fixado)" \
      "Remova instalações globais do pnpm que sobrepõem o Corepack e verifique a rede."
  fi
}

verificar_docker() {
  if ! have docker; then
    verif "Docker" erro "CLI do Docker não encontrada" "Instale o Docker Desktop (Windows) ou o Docker Engine (Linux)."
    return
  fi
  local motor saida_info
  saida_info="$(mktemp)"
  if ! consultar docker info --format '{{.ServerVersion}}' >"$saida_info"; then
    local causa_docker
    causa_docker="$(diagnosticar "$saida_info")"
    verif "Docker" erro "motor inacessível" \
      "${causa_docker:-$(tail -n 1 "$saida_info") — verifique se o Docker Desktop (ou o Docker Engine) está em execução.}"
    rm -f -- "$saida_info"
    return
  fi
  motor="$(tail -n 1 "$saida_info" | tr -d '\r')"
  rm -f -- "$saida_info"
  if versao_ge "$motor" "$DOCKER_MINIMO"; then
    verif "Docker" ok "Engine $motor"
  else
    verif "Docker" aviso "Engine $motor (o healthcheck usa recursos do Engine 25+)" "Atualize o Docker."
  fi
  local versao_compose
  if versao_compose="$(consultar docker compose version --short | tr -d '\r')"; then
    if versao_ge "${versao_compose#v}" "$COMPOSE_MINIMO"; then
      verif "Docker Compose" ok "$versao_compose"
    else
      verif "Docker Compose" erro "$versao_compose (mínimo 2.20)" "Atualize o Docker Compose."
    fi
  else
    verif "Docker Compose" erro "plugin \`docker compose\` (v2) ausente" "Instale o Docker Compose v2."
  fi
}

verificar_env() {
  if [[ ! -f "$ENV_LOCAL" ]]; then
    verif ".env.local" aviso "ausente" "\`./run.sh fix\` (ou \`pnpm env:init\`) cria com segredos gerados."
    return
  fi
  local analise faltando obsoletas
  # Primeira linha: chaves faltando; segunda: chaves que o app não usa mais.
  if ! analise="$(LYRA_ENV_LOCAL="$ENV_LOCAL" LYRA_ENV_EXEMPLO="$ENV_EXEMPLO" node --input-type=module -e '
    import { readFileSync } from "node:fs";
    import { chavesObsoletas, parseEnvContents, SEGREDOS_GERADOS } from "./scripts/lib/env-file.mjs";
    const atual = parseEnvContents(readFileSync(process.env.LYRA_ENV_LOCAL, "utf8"));
    const exemplo = parseEnvContents(readFileSync(process.env.LYRA_ENV_EXEMPLO, "utf8"));
    const faltas = [
      ...Object.keys(exemplo).filter((chave) => !(chave in atual)),
      ...Object.keys(SEGREDOS_GERADOS).filter((chave) => !atual[chave]),
    ];
    console.log([...new Set(faltas)].join(", "));
    console.log(chavesObsoletas(atual, exemplo).join(", "));
  ' 2>>"${REGISTRO:-/dev/null}")"; then
    verif ".env.local" erro "não foi possível analisar o arquivo" "Veja o log: ${REGISTRO:-(sem registro)}."
    return
  fi
  faltando="$(printf '%s\n' "$analise" | sed -n '1p')"
  obsoletas="$(printf '%s\n' "$analise" | sed -n '2p')"
  if [[ -n "$faltando" ]]; then
    verif ".env.local" aviso "incompleto: $faltando" "\`./run.sh fix\` (ou \`pnpm env:init\`) completa sem alterar valores."
  elif [[ -n "$obsoletas" ]]; then
    verif ".env.local" aviso "completo, mas com variáveis que o app não usa mais: $obsoletas" "Apague essas linhas do .env.local; se guardarem uma chave de API, revogue-a no provedor."
  else
    verif ".env.local" ok "completo"
  fi
}

dependencias_sincronizadas() {
  [[ -f node_modules/.pnpm/lock.yaml && -f pnpm-lock.yaml ]] && cmp -s node_modules/.pnpm/lock.yaml pnpm-lock.yaml
}

verificar_dependencias() {
  if [[ ! -d node_modules ]]; then
    verif "Dependências" aviso "node_modules ausente" "\`./run.sh fix\`."
  elif ! verificar_artefatos_linux; then
    verif "Dependências" erro "artefatos Windows incompatíveis" "Prepare node_modules no Linux, preservando antes os artefatos necessários do outro ambiente."
  elif ! dependencias_sincronizadas; then
    verif "Dependências" aviso "node_modules diferente do pnpm-lock.yaml" "\`./run.sh fix\` (pnpm install --frozen-lockfile)."
  else
    verif "Dependências" ok "instaladas conforme o pnpm-lock.yaml"
  fi
}

# -----------------------------------------------------------------------------
# Portas: identificação do dono, sem nunca encerrar processos de terceiros
# -----------------------------------------------------------------------------
porta_em_uso() {
  local porta="$1"
  (exec 3<>"/dev/tcp/127.0.0.1/$porta") 2>/dev/null
}

container_na_porta() {
  have docker || return 0
  docker ps --format '{{.Names}}	{{.Ports}}' 2>/dev/null | awk -F'\t' -v p="$1" '
    $2 ~ ("(^|[ ,])([0-9.]+|\\[::\\]|::):" p "->") { print $1; exit }'
}

# Descreve o processo que escuta na porta (vazio se a porta estiver livre).
dono_da_porta() {
  local porta="$1" container pid nome usuario
  container="$(container_na_porta "$porta")"
  if [[ -n "$container" ]]; then
    printf 'container Docker %s' "$container"
    return
  fi
  case "$PLATAFORMA" in
    windows|cygwin)
      # Socket em escuta = endereço remoto 0.0.0.0:0 ou [::]:0, independente do
      # idioma do Windows ("LISTENING", "ESCUTANDO"...).
      pid="$(netstat -ano -p TCP 2>/dev/null | tr -d '\r' | awk -v p=":$porta" '
        $1 == "TCP" && substr($2, length($2) - length(p) + 1) == p && ($3 == "0.0.0.0:0" || $3 == "[::]:0") { print $5; exit }')"
      if [[ -n "$pid" && "$pid" != "0" ]]; then
        local linha
        linha="$(tasklist //V //FO CSV //NH //FI "PID eq $pid" 2>/dev/null | tr -d '\r' | head -n 1)"
        nome="$(printf '%s' "$linha" | awk -F'","' '{gsub(/^"/, "", $1); print $1}')"
        usuario="$(printf '%s' "$linha" | awk -F'","' '{print $7}')"
        printf 'processo Windows · PID %s · %s · usuário %s' "$pid" "${nome:-?}" "${usuario:-?}"
        return
      fi
      ;;
    *)
      local linha encontrado=0
      if have ss; then
        linha="$(ss -Hltnp "sport = :$porta" 2>/dev/null | head -n 1)"
        if [[ -n "$linha" ]]; then
          encontrado=1
          pid="$(printf '%s' "$linha" | grep -oE 'pid=[0-9]+' | head -n 1 | cut -d= -f2)"
          nome="$(printf '%s' "$linha" | grep -oE '\(\("[^"]+"' | head -n 1 | cut -d'"' -f2)"
        fi
      elif have lsof; then
        linha="$(lsof -nP -iTCP:"$porta" -sTCP:LISTEN 2>/dev/null | awk 'NR == 2 { print $2, $1, $3 }')"
        if [[ -n "$linha" ]]; then
          encontrado=1
          read -r pid nome usuario <<<"$linha"
        fi
      fi
      if (( encontrado == 1 )); then
        if [[ -z "$pid" ]]; then
          printf 'processo de outro usuário (sem permissão para ver o PID)'
          return
        fi
        local linha_comando
        [[ -z "${usuario:-}" ]] && usuario="$(ps -o user= -p "$pid" 2>/dev/null | tr -d ' ')"
        linha_comando="$(tr '\0' ' ' <"/proc/$pid/cmdline" 2>/dev/null | cut -c1-100 | sed 's/[[:space:]]*$//')"
        printf 'processo local · PID %s · %s · usuário %s' "$pid" "${linha_comando:-${nome:-?}}" "${usuario:-?}"
        return
      fi
      ;;
  esac
  if porta_em_uso "$porta"; then
    printf 'processo não identificável deste ambiente'
  fi
}

porta_livre_a_partir() {
  local inicio="$1" evitar="${2:-}" porta
  for (( porta = inicio; porta < inicio + FAIXA_BUSCA_PORTA; porta++ )); do
    [[ "$porta" == "$evitar" ]] && continue
    if ! porta_em_uso "$porta"; then
      printf '%s' "$porta"
      return 0
    fi
  done
  return 1
}

# -----------------------------------------------------------------------------
# Banco de dados
# -----------------------------------------------------------------------------
DB_ESTADO=""; DB_SAUDE=""; DB_PORTA=""; DB_VERSAO=""; DB_MIGRATIONS=""; DB_INDISPONIVEL=""

estado_banco() {  # estado_banco [--sem-sql]
  DB_ESTADO=""; DB_SAUDE=""; DB_PORTA=""; DB_VERSAO=""; DB_MIGRATIONS=""; DB_INDISPONIVEL=""
  if ! have docker; then DB_INDISPONIVEL="CLI do Docker não encontrada"; return; fi
  if [[ ! -f "$ENV_LOCAL" ]]; then DB_INDISPONIVEL=".env.local ausente"; return; fi
  local saida_ps
  saida_ps="$(mktemp)"
  if ! consultar docker inspect --format '{{.State.Status}}|{{if .State.Health}}{{.State.Health.Status}}{{end}}|{{range $p, $b := .NetworkSettings.Ports}}{{range $b}}{{.HostPort}} {{end}}{{end}}' "$CONTAINER_DB" >"$saida_ps"; then
    if grep -qi "No such object\|no such container" "$saida_ps"; then
      DB_ESTADO=""
    else
      DB_INDISPONIVEL="$(diagnosticar "$saida_ps")"
      [[ -z "$DB_INDISPONIVEL" ]] && DB_INDISPONIVEL="$(tail -n 1 "$saida_ps")"
    fi
    rm -f -- "$saida_ps"
    return
  fi
  IFS='|' read -r DB_ESTADO DB_SAUDE DB_PORTA <"$saida_ps"
  rm -f -- "$saida_ps"
  # O Docker mantém o último estado de saúde de um container parado.
  [[ "$DB_ESTADO" != "running" ]] && DB_SAUDE=""
  DB_PORTA="${DB_PORTA%% *}"
  # Porta publicada fica vazia quando o container está parado.
  [[ -z "$DB_PORTA" ]] && DB_PORTA="$(docker inspect --format '{{range $p, $b := .HostConfig.PortBindings}}{{range $b}}{{.HostPort}}{{end}}{{end}}' "$CONTAINER_DB" 2>/dev/null)"
  if [[ "${1:-}" != "--sem-sql" && "$DB_SAUDE" == "healthy" ]]; then
    ler_env
    local resultado
    resultado="$(MYSQL_PWD="$(env_valor MYSQL_PASSWORD)" consultar docker compose --env-file "$ENV_LOCAL" exec -T -e MYSQL_PWD "$SERVICO_DB" \
      mysql "-u$(env_valor MYSQL_USER)" "-D$(env_valor MYSQL_DATABASE)" --batch --skip-column-names \
      -e 'SELECT VERSION(); SELECT COUNT(*) FROM _lyra_schema_migrations' | tr -d '\r')"
    DB_VERSAO="$(printf '%s\n' "$resultado" | grep -v '^mysql:' | sed -n 1p)"
    DB_MIGRATIONS="$(printf '%s\n' "$resultado" | grep -v '^mysql:' | sed -n 2p)"
  fi
}

total_migrations() { find mysql/migrations -maxdepth 1 -name '*.sql' | wc -l | tr -d ' '; }

# -----------------------------------------------------------------------------
# Aplicação: estado e processos
# -----------------------------------------------------------------------------
APP_PID_ATUAL=""; APP_PORTA=""; APP_MODO=""; APP_INICIO=""; APP_LOG=""; APP_ORIGEM=""; APP_WINPID=""
APP_ESTADO_ALHEIO=""

inicio_processo() {
  [[ "$1" =~ ^[1-9][0-9]*$ && -r "/proc/$1/stat" ]] || return 1
  awk '{ sub(/.*\) /, ""); print $20 }' "/proc/$1/stat"
}

processo_identificado_vivo() {
  local pid="$1" inicio="$2"
  [[ -n "$inicio" && "$(inicio_processo "$pid" 2>/dev/null)" == "$inicio" ]] && pid_vivo "$pid"
}

sinalizar_processo_identificado() {
  local pid="$1" inicio="$2" sinal="$3"
  [[ "$sinal" == TERM || "$sinal" == KILL ]] || return 1
  processo_identificado_vivo "$pid" "$inicio" || return 1
  kill "-$sinal" "$pid" 2>/dev/null
}

validar_identidade_app() {
  local pid="$1" inicio="$2" raiz="$3" plataforma="$4"
  [[ "$plataforma" == linux && "$raiz" == "$RAIZ" && -n "$inicio" ]] || return 1
  [[ "$(inicio_processo "$pid")" == "$inicio" ]] || return 1
  [[ "$(readlink -f "/proc/$pid/cwd" 2>/dev/null)" == "$RAIZ" ]] || return 1
  [[ -r "/proc/$pid/cmdline" ]] || return 1
  tr '\0' ' ' <"/proc/$pid/cmdline" | grep -Eq 'next|pnpm|corepack|node'
}

ler_meta() {  # ler_meta <campo>
  [[ -f "$APP_META" ]] || return 0
  node -e '
    try { const m = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
          const v = m[process.argv[2]]; if (v !== undefined && v !== null) process.stdout.write(String(v)); } catch {}
  ' "$APP_META" "$1"
}

pid_vivo() {
  local pid="$1"
  [[ -n "$pid" ]] || return 1
  kill -0 "$pid" 2>/dev/null || return 1
  if [[ -r "/proc/$pid/stat" && "$PLATAFORMA" != "windows" ]]; then
    # Processo zumbi não está em execução.
    [[ "$(awk '{ sub(/.*\) /, ""); print $1 }' "/proc/$pid/stat" 2>/dev/null)" != "Z" ]]
  fi
}

winpid_vivo() {
  [[ -n "$1" ]] && tasklist //NH //FI "PID eq $1" 2>/dev/null | tr -d '\r' | grep -qw "$1"
}

estado_app() {
  APP_PID_ATUAL=""; APP_PORTA=""; APP_MODO=""; APP_INICIO=""; APP_LOG=""; APP_ORIGEM=""; APP_WINPID=""
  APP_ESTADO_ALHEIO=""
  local pid
  pid="$(ler_meta pid)"
  [[ -z "$pid" && -f "$APP_PID" ]] && pid="$(tr -dc '0-9' <"$APP_PID")"
  [[ -z "$pid" ]] && return
  pid_vivo "$pid" || return
  if ! validar_identidade_app "$pid" "$(ler_meta inicio_processo)" "$(ler_meta raiz)" "$(ler_meta plataforma)"; then
    APP_ESTADO_ALHEIO="Estado sem prova integral de identidade do PID $pid; processo e metadados preservados."
    return
  fi
  APP_PID_ATUAL="$pid"
  APP_PORTA="$(ler_meta porta)"
  APP_MODO="$(ler_meta modo)"; APP_MODO="${APP_MODO:-dev}"
  APP_INICIO="$(ler_meta iniciado_em)"
  APP_LOG="$(ler_meta log)"
  APP_ORIGEM="iniciada pelo $(ler_meta origem)"
  [[ "$APP_ORIGEM" == "iniciada pelo " ]] && APP_ORIGEM="iniciada por outro launcher"
}

# PID e todos os descendentes vivos (Linux/macOS), capturados antes de sinalizar:
# o `next dev` cria a própria sessão (setsid), fora do grupo do PID registrado.
arvore_de_processos() {
  ps -A -o pid=,ppid= 2>/dev/null | awk -v raiz="$1" '
    { pai[$1] = $2 }
    END {
      incluir[raiz] = 1; mudou = 1
      while (mudou) { mudou = 0; for (p in pai) if (!(p in incluir) && (pai[p] in incluir)) { incluir[p] = 1; mudou = 1 } }
      for (p in incluir) print p
    }'
}

consultar_http() {  # consultar_http <url> → imprime o status HTTP (000 sem resposta)
  curl -s -o /dev/null -m 10 -w '%{http_code}' "$1" 2>/dev/null || true
}

# -----------------------------------------------------------------------------
# Etapas
# -----------------------------------------------------------------------------
mostrar_verificacoes() {
  local i
  for i in "${!VERIF_NOMES[@]}"; do
    case "${VERIF_ESTADOS[$i]}" in
      ok)    ok "${VERIF_NOMES[$i]}: ${VERIF_DETALHES[$i]}" ;;
      aviso) aviso "${VERIF_NOMES[$i]}: ${VERIF_DETALHES[$i]}" ;;
      *)     erro "${VERIF_NOMES[$i]}: ${VERIF_DETALHES[$i]}"
             [[ -n "${VERIF_CORRECOES[$i]}" ]] && info "Correção: ${VERIF_CORRECOES[$i]}" ;;
    esac
  done
}

contar_erros() {
  local total=0 estado
  for estado in "${VERIF_ESTADOS[@]}"; do [[ "$estado" == erro ]] && total=$((total + 1)); done
  printf '%s' "$total"
}

etapa_preflight() {
  etapa "Verificando pré-requisitos bloqueantes"
  limpar_verif
  verificar_plataforma
  verificar_node
  verificar_docker
  mostrar_verificacoes
  local erros
  erros="$(contar_erros)"
  if (( erros > 0 )); then
    erro "$erros pré-requisito(s) exigem ação manual (acima)."
    return 1
  fi
}

etapa_env() {
  etapa "Preparando o .env.local (fonte única de configuração)"
  have node || { erro "Node.js é necessário para gerar o .env.local."; return 1; }
  executar "Preparação do .env.local" node scripts/env-init.mjs || return 1
  chmod 600 "$ENV_LOCAL" 2>/dev/null || true
  ler_env
  ok ".env.local pronto."
}

etapa_dependencias() {  # etapa_dependencias [--forcar]
  etapa "Dependências do projeto (pnpm, conforme o lockfile)"
  verificar_artefatos_linux || return 1
  if [[ "${1:-}" != "--forcar" ]] && dependencias_sincronizadas; then
    ok "node_modules já corresponde ao pnpm-lock.yaml; nada a instalar."
    return 0
  fi
  executar "Instalação das dependências" pnpm_cmd install --frozen-lockfile || return 1
  if ! dependencias_sincronizadas; then
    erro "A instalação terminou, mas node_modules não corresponde ao pnpm-lock.yaml."
    return 1
  fi
  ok "Dependências instaladas conforme o pnpm-lock.yaml."
}

verificar_artefatos_linux() {
  local manifesto="node_modules/.modules.yaml"
  if [[ -f "$manifesto" ]] && grep -Eq 'storeDir["[:space:]]*:?[[:space:]]*["\x27]?[A-Za-z]:[\\/]' "$manifesto"; then
    erro "node_modules aponta para um store Windows. A execução Linux foi bloqueada sem apagar artefatos."
    return 1
  fi
  # Shims .cmd podem permanecer em uma instalação Linux legítima. O caminho
  # do store, e não a mera presença de um shim, determina a incompatibilidade.
  return 0
}

etapa_porta_banco() {
  ler_env
  local desejada dono nova
  desejada="$(env_valor MYSQL_HOST_PORT "$PORTA_DB_PADRAO")"
  estado_banco --sem-sql
  if [[ -n "$DB_INDISPONIVEL" ]]; then
    erro "Não foi possível identificar o MySQL no daemon atual; banco e configuração preservados: $DB_INDISPONIVEL"
    return 1
  fi
  if [[ "$DB_ESTADO" == "running" && "$DB_PORTA" == "$desejada" ]]; then
    return 0
  fi
  dono="$(dono_da_porta "$desejada")"
  if [[ -z "$DB_ESTADO" ]] && porta_em_uso "$desejada"; then
    local contexto motor
    contexto="$(docker context show 2>/dev/null)"
    motor="$(docker info --format '{{.ID}} {{.Name}}' 2>/dev/null)"
    erro "A porta $desejada está ocupada, mas $CONTAINER_DB não existe no daemon atual (${contexto:-desconhecido}; ${motor:-identidade indisponível}). Possível divergência entre Docker do WSL e Docker Desktop."
    erro "Selecione o daemon que já contém o banco. Nenhum banco duplicado será criado e nenhuma porta ou .env.local será alterado."
    return 1
  fi
  if [[ -z "$dono" || "$dono" == "container Docker $CONTAINER_DB" ]]; then
    if [[ "$(env_valor MYSQL_PORT)" != "$desejada" ]]; then
      definir_env MYSQL_PORT "$desejada"
      info "MYSQL_PORT ajustado para $desejada (igual ao MYSQL_HOST_PORT publicado pelo Compose)."
    fi
    return 0
  fi
  nova="$(porta_livre_a_partir "$((desejada + 1))")" || { erro "Nenhuma porta livre para o MySQL a partir de $desejada."; return 1; }
  aviso "Porta $desejada do MySQL ocupada por $dono; esse processo não será tocado."
  definir_env MYSQL_HOST_PORT "$nova" MYSQL_PORT "$nova"
  ok "MySQL realocado para a porta $nova (MYSQL_HOST_PORT e MYSQL_PORT atualizados no .env.local)."
}

etapa_banco() {
  etapa "Banco de dados MySQL (Docker Compose)"
  etapa_porta_banco || return 1
  if ! executar "Subida do MySQL" compose up -d --wait "$SERVICO_DB"; then
    local logs_db causa
    logs_db="$(mktemp)"
    compose logs --tail 40 "$SERVICO_DB" >"$logs_db" 2>&1 </dev/null
    if [[ -s "$logs_db" ]]; then
      info "Últimas linhas do log do MySQL:"
      tail -n 15 "$logs_db" | while IFS= read -r linha; do detalhe "$linha"; done
    fi
    causa="$(diagnosticar "$logs_db")"
    rm -f -- "$logs_db"
    [[ -n "$causa" ]] && erro "Causa provável (log do MySQL): $causa"
    return 1
  fi
  estado_banco
  if [[ "$DB_SAUDE" != "healthy" ]]; then
    erro "MySQL em estado inesperado: ${DB_ESTADO:-?}/${DB_SAUDE:-?}."
    return 1
  fi
  ok "MySQL ${DB_VERSAO} saudável em 127.0.0.1:${DB_PORTA}."
}

etapa_migrations() {
  etapa "Migrations e administrador inicial"
  have node || { erro "Node.js é necessário para aplicar as migrations."; return 1; }
  executar "Migrations do MySQL" node scripts/mysql-migrate.mjs || return 1
  estado_banco
  local esperado
  esperado="$(total_migrations)"
  if [[ -n "$DB_MIGRATIONS" ]] && (( DB_MIGRATIONS < esperado )); then
    erro "Apenas $DB_MIGRATIONS de $esperado migrations registradas no banco."
    return 1
  fi
  ok "$esperado migrations aplicadas e administrador assegurado."
}

etapa_build() {
  etapa "Build de produção (next build)"
  executar "Build de produção" pnpm_cmd build || return 1
  ok "Build concluído."
}

etapa_memoria() {
  etapa "Memória Graphiti (serviço privado e banco de grafos)"
  executar "Subida da memória Graphiti" compose up -d --build --wait memoria || return 1
  local porta_memoria
  porta_memoria="$(env_valor LYRA_MEMORIA_PORTA)"
  if [[ "$(consultar_http "http://127.0.0.1:${porta_memoria:-8019}/saude")" != "200" ]]; then
    erro "A memória Graphiti não respondeu à verificação de saúde."
    return 1
  fi
  ok "Graphiti, banco de grafos e índices locais saudáveis."
}

url_local() {  # ajusta URLs locais para a porta efetiva (URLs externas são mantidas)
  local valor="$1" porta="$2"
  if [[ "$valor" =~ ^(https?://(localhost|127\.0\.0\.1))(:[0-9]+)?(/.*)?$ ]]; then
    printf '%s:%s%s' "${BASH_REMATCH[1]}" "$porta" "${BASH_REMATCH[4]}"
  else
    printf '%s' "$valor"
  fi
}

planejar_app() {
  estado_app
  if [[ -n "$APP_ESTADO_ALHEIO" ]]; then erro "$APP_ESTADO_ALHEIO"; return 1; fi
  ler_env
  local desejada="${LYRA_APP_PORT:-$PORTA_APP_PADRAO}" dono origem
  APP_PORTA_PLANEJADA="$APP_PORTA"
  if [[ -n "$APP_PID_ATUAL" ]]; then
    if [[ -z "$APP_PORTA" || "$(consultar_http "http://127.0.0.1:$APP_PORTA/api/health")" != 200 ]]; then
      erro "A aplicação registrada não está saudável; memória e processos preservados."
      return 1
    fi
  else
    APP_PORTA_PLANEJADA="$desejada"
    if porta_em_uso "$desejada"; then
      dono="$(dono_da_porta "$desejada")"
      APP_PORTA_PLANEJADA="$(porta_livre_a_partir "$((desejada + 1))" "${DB_PORTA:-}")" || return 1
      aviso "Porta $desejada ocupada por ${dono:-processo não identificado}; preservada. Aplicação planejada em $APP_PORTA_PLANEJADA."
    fi
  fi
  origem="$(env_valor LYRA_MEMORIA_APP_URL 'http://host.docker.internal:3000')"
  RETORNO_MEMORIA_APP="$origem"
  if [[ "$origem" =~ ^(https?://(host\.docker\.internal|localhost|127\.0\.0\.1))(:[0-9]+)?(/.*)?$ ]]; then
    RETORNO_MEMORIA_APP="${BASH_REMATCH[1]}:$APP_PORTA_PLANEJADA${BASH_REMATCH[4]}"
  fi
}

etapa_app() {  # etapa_app <dev|prod>
  local modo="$1"
  etapa "Aplicação Next.js ($([[ "$modo" == prod ]] && echo produção || echo desenvolvimento))"
  estado_app
  if [[ -n "$APP_ESTADO_ALHEIO" ]]; then erro "$APP_ESTADO_ALHEIO"; return 1; fi
  if [[ -n "$APP_PID_ATUAL" ]]; then
    if [[ -n "$APP_PORTA" && "$(consultar_http "http://127.0.0.1:$APP_PORTA/api/health")" == "200" ]]; then
      if [[ "$APP_MODO" != "$modo" ]]; then
        aviso "A aplicação já está em execução em modo $APP_MODO (PID $APP_PID_ATUAL); pare-a (\`./run.sh stop app\`) para iniciar em modo $modo."
      else
        ok "Já em execução (PID $APP_PID_ATUAL, $APP_ORIGEM) em http://localhost:$APP_PORTA; nada a fazer."
      fi
      return 0
    fi
    erro "Existe um processo da aplicação (PID $APP_PID_ATUAL) que não responde ao /api/health. Rode \`./run.sh stop app\`."
    return 1
  fi

  ler_env
  [[ -n "${APP_PORTA_PLANEJADA:-}" ]] || planejar_app || return 1
  local porta="$APP_PORTA_PLANEJADA"
  if porta_em_uso "$porta"; then
    erro "A porta planejada $porta foi ocupada após configurar a memória. Processo preservado; repita o comando para replanejar o retorno da memória."
    return 1
  fi

  local log_app="$LOGS/app-$modo.log" subcomando=dev
  [[ "$modo" == prod ]] && subcomando=start
  local base_url public_url
  base_url="$(env_valor APP_BASE_URL)"; public_url="$(env_valor NEXT_PUBLIC_APP_URL)"
  local -a ambiente=("PORT=$porta")
  ambiente+=("LYRA_MEMORIA_APP_URL=$RETORNO_MEMORIA_APP")
  [[ -n "$base_url" ]] && ambiente+=("APP_BASE_URL=$(url_local "$base_url" "$porta")")
  [[ -n "$public_url" ]] && ambiente+=("NEXT_PUBLIC_APP_URL=$(url_local "$public_url" "$porta")")

  printf '  %s$ corepack pnpm exec next %s -p %s%s\n' "$C_FRACO" "$subcomando" "$porta" "$C_FIM"
  registrar "  \$ corepack pnpm exec next $subcomando -p $porta"
  : >"$log_app"
  local pid
  if [[ "$PLATAFORMA" != "windows" ]] && have setsid; then
    # Sessão própria: o Ctrl+C no terminal não derruba a aplicação.
    env "${ambiente[@]}" setsid nohup corepack pnpm exec next "$subcomando" -p "$porta" >>"$log_app" 2>&1 </dev/null &
  else
    env "${ambiente[@]}" nohup corepack pnpm exec next "$subcomando" -p "$porta" >>"$log_app" 2>&1 </dev/null &
  fi
  pid=$!
  disown "$pid" 2>/dev/null || true
  local winpid=""
  [[ "$PLATAFORMA" == "windows" && -r "/proc/$pid/winpid" ]] && winpid="$(cat "/proc/$pid/winpid")"
  printf '%s\n' "$pid" >"$APP_PID"
  APP_META_PID="$pid" APP_META_WINPID="$winpid" APP_META_PORTA="$porta" APP_META_MODO="$modo" APP_META_LOG="$log_app" APP_META_INICIO="$(inicio_processo "$pid")" \
    node -e '
      const e = process.env;
      // Hora local com offset explícito, preservando o formato do estado.
      const d = new Date();
      const offset = -d.getTimezoneOffset();
      const dois = (n) => String(Math.trunc(Math.abs(n))).padStart(2, "0");
      const iniciado = new Date(d.getTime() + offset * 60000).toISOString().slice(0, 19)
        + (offset >= 0 ? "+" : "-") + dois(offset / 60) + ":" + dois(offset % 60);
      require("fs").writeFileSync(process.argv[1], JSON.stringify({
        pid: Number(e.APP_META_PID), winpid: e.APP_META_WINPID ? Number(e.APP_META_WINPID) : null,
        porta: Number(e.APP_META_PORTA), modo: e.APP_META_MODO,
        plataforma: process.platform, raiz: process.cwd(), inicio_processo: e.APP_META_INICIO,
        iniciado_em: iniciado, log: e.APP_META_LOG,
        comando: ["corepack", "pnpm", "exec", "next", e.APP_META_MODO === "prod" ? "start" : "dev", "-p", e.APP_META_PORTA],
        origem: "run.sh" }, null, 2) + "\n");
    ' "$APP_META"
  info "Processo iniciado (PID $pid${winpid:+, PID Windows $winpid}); log em $log_app."

  local limite=$((SECONDS + TEMPO_MAX_APP)) status="000"
  while (( SECONDS < limite )); do
    if ! pid_vivo "$pid" && ! winpid_vivo "$winpid"; then
      tail -n 20 "$log_app" | while IFS= read -r linha; do detalhe "$linha"; done
      local causa
      causa="$(diagnosticar "$log_app")"
      rm -f -- "$APP_PID" "$APP_META"
      erro "A aplicação encerrou durante a inicialização.${causa:+ Causa provável: $causa} Log: $log_app"
      return 1
    fi
    status="$(consultar_http "http://127.0.0.1:$porta/api/health")"
    [[ "$status" == "200" ]] && break
    sleep 2
  done
  if [[ "$status" != "200" ]]; then
    erro "A aplicação não respondeu ao /api/health em ${TEMPO_MAX_APP}s (último status: $status). Log: $log_app"
    return 1
  fi
  APP_PORTA="$porta"; APP_LOG="$log_app"
  ok "Aplicação no ar em http://localhost:$porta (PID $pid)."
}

etapa_verificacao() {  # etapa_verificacao <porta>
  etapa "Verificação de saúde ponta a ponta"
  local saida_verif codigo
  saida_verif="$(node scripts/verificar-app.mjs "$1" </dev/null 2>&1)"
  codigo=$?
  registrar "$saida_verif"
  while IFS= read -r linha; do
    case "$linha" in
      "[OK] "*)   ok "${linha#\[OK\] }" ;;
      "[ERRO] "*) erro "${linha#\[ERRO\] }" ;;
      *)          [[ -n "$linha" ]] && detalhe "$linha" ;;
    esac
  done <<<"$saida_verif"
  return "$codigo"
}

parar_app() {
  etapa "Parando a aplicação"
  estado_app
  if [[ -n "$APP_ESTADO_ALHEIO" ]]; then erro "$APP_ESTADO_ALHEIO"; return 1; fi
  if [[ -z "$APP_PID_ATUAL" ]]; then
    rm -f -- "$APP_PID" "$APP_META"
    ok "Nenhuma aplicação em execução."
    return 0
  fi
  local pid="$APP_PID_ATUAL" porta="$APP_PORTA"
  if [[ "$PLATAFORMA" == "windows" && -n "$APP_WINPID" ]]; then
    # taskkill /T encerra apenas a árvore iniciada pelo launcher.
    info "Encerrando a árvore de processos do PID Windows $APP_WINPID."
    executar "Encerramento da aplicação" taskkill //PID "$APP_WINPID" //T //F || true
    local limite=$((SECONDS + TEMPO_PARADA_APP))
    while (( SECONDS < limite )) && winpid_vivo "$APP_WINPID"; do sleep 1; done
    if winpid_vivo "$APP_WINPID"; then
      erro "O PID Windows $APP_WINPID continua ativo."
      return 1
    fi
  else
    local -a arvore=()
    mapfile -t arvore < <(arvore_de_processos "$pid")
    local -A inicios=()
    local membro
    for membro in "${arvore[@]}"; do inicios["$membro"]="$(inicio_processo "$membro" 2>/dev/null)"; done
    info "SIGTERM para ${#arvore[@]} processo(s) da aplicação (PID $pid)."
    for membro in "${arvore[@]}"; do sinalizar_processo_identificado "$membro" "${inicios[$membro]}" TERM || true; done
    local limite=$((SECONDS + TEMPO_PARADA_APP)) vivos
    while (( SECONDS < limite )); do
      vivos=0
      for membro in "${arvore[@]}"; do processo_identificado_vivo "$membro" "${inicios[$membro]}" && vivos=$((vivos + 1)); done
      (( vivos == 0 )) && break
      sleep 0.5
    done
    if (( vivos > 0 )); then
      aviso "$vivos processo(s) não encerraram em ${TEMPO_PARADA_APP}s; enviando SIGKILL."
      for membro in "${arvore[@]}"; do sinalizar_processo_identificado "$membro" "${inicios[$membro]}" KILL || true; done
      sleep 1
      vivos=0
      for membro in "${arvore[@]}"; do processo_identificado_vivo "$membro" "${inicios[$membro]}" && vivos=$((vivos + 1)); done
      if (( vivos > 0 )); then
        erro "$vivos processo(s) da aplicação continuam ativos após SIGKILL."
        return 1
      fi
    fi
  fi
  rm -f -- "$APP_PID" "$APP_META"
  if [[ -n "$porta" ]] && porta_em_uso "$porta"; then
    erro "A porta $porta continua ocupada ($(dono_da_porta "$porta"))."
    return 1
  fi
  ok "Aplicação encerrada (PID $pid); porta ${porta:--} liberada."
}

parar_banco() {
  etapa "Parando o MySQL (dados preservados no volume)"
  if [[ -f "$ENV_LOCAL" ]]; then
    executar "Parada da memória (dados preservados)" compose stop memoria falkordb || return 1
  fi
  if [[ ! -f "$ENV_LOCAL" ]]; then
    # Sem .env.local o Compose não interpola o serviço; o container do projeto
    # ainda é parado diretamente pelo nome (o volume é mantido).
    if [[ "$(consultar docker inspect --format '{{.State.Status}}' "$CONTAINER_DB" | tr -d '\r')" == "running" ]]; then
      executar "Parada do MySQL" docker stop "$CONTAINER_DB" || return 1
      ok "MySQL parado (sem .env.local; parado pelo nome do container)."
    else
      ok "Sem .env.local e sem container do MySQL deste projeto em execução."
    fi
    return 0
  fi
  estado_banco --sem-sql
  if [[ "$DB_ESTADO" != "running" ]]; then
    ok "MySQL já está parado."
    return 0
  fi
  executar "Parada do MySQL" compose stop "$SERVICO_DB" || return 1
  ok "MySQL parado."
}

confirmar() {  # confirmar <pergunta> <palavra> <opção>
  if [[ ! -t 0 ]]; then
    aviso "$1 Sem terminal interativo: repita com $3 para confirmar."
    return 1
  fi
  local resposta
  read -r -p "  $1 Digite '$2' para continuar: " resposta || return 1
  if [[ "$resposta" != "$2" ]]; then
    aviso "Operação cancelada; nada foi alterado."
    return 1
  fi
}

remover_artefato() {
  local alvo="$1"
  case "$alvo" in .next|node_modules) ;; *) erro "Recusado: $alvo não é um artefato recriável conhecido."; return 1 ;; esac
  if [[ -e "$alvo" ]]; then
    rm -rf -- "$alvo"
    ok "Removido $alvo (artefato recriável)."
  fi
}

# -----------------------------------------------------------------------------
# Comandos
# -----------------------------------------------------------------------------
cmd_up() {
  local modo=dev
  [[ "${1:-}" == "--prod" ]] && modo=prod
  titulo "Lyra MetaCare · up ($([[ "$modo" == prod ]] && echo produção || echo desenvolvimento))"
  etapa_preflight || return 1
  etapa_env || return 1
  etapa_dependencias || return 1
  etapa_banco || return 1
  etapa_migrations || return 1
  planejar_app || return 1
  etapa_memoria || return 1
  estado_app
  if [[ "$modo" == prod && -z "$APP_PID_ATUAL" ]]; then etapa_build || return 1; fi
  etapa_app "$modo" || return 1
  etapa_verificacao "${APP_PORTA:-$PORTA_APP_PADRAO}" || return 1
  titulo "Ambiente pronto"
  ok "Aplicação: http://localhost:${APP_PORTA}"
  ok "MySQL: 127.0.0.1:$(env_valor MYSQL_HOST_PORT) (banco $(env_valor MYSQL_DATABASE))"
  ok "Admin: $(env_valor ADMIN_BOOTSTRAP_EMAIL) (senha em ADMIN_BOOTSTRAP_PASSWORD no .env.local)"
  info "Log da aplicação: ${APP_LOG}"
  info "Parar: ./run.sh stop · Estado: ./run.sh status"
}

cmd_app() {
  local modo=dev
  [[ "${1:-}" == "--prod" ]] && modo=prod
  titulo "Lyra MetaCare · app"
  etapa_preflight || return 1
  etapa_env || return 1
  estado_banco --sem-sql
  if [[ "$DB_SAUDE" != "healthy" ]]; then
    erro "O MySQL não está saudável; rode \`./run.sh db\` (ou \`up\`)."
    return 1
  fi
  etapa_dependencias || return 1
  planejar_app || return 1
  etapa_memoria || return 1
  estado_app
  if [[ "$modo" == prod && -z "$APP_PID_ATUAL" ]]; then etapa_build || return 1; fi
  etapa_app "$modo" || return 1
  etapa_verificacao "${APP_PORTA:-$PORTA_APP_PADRAO}"
}

cmd_db() {
  titulo "Lyra MetaCare · db"
  limpar_verif; verificar_docker
  if (( $(contar_erros) > 0 )); then mostrar_verificacoes; return 1; fi
  etapa_env || return 1
  etapa_dependencias || return 1
  etapa_banco || return 1
  etapa_migrations
}

cmd_migrate() {
  titulo "Lyra MetaCare · migrate"
  etapa_env || return 1
  estado_banco --sem-sql
  if [[ "$DB_SAUDE" != "healthy" ]]; then
    erro "O MySQL não está saudável; rode \`./run.sh db\`."
    return 1
  fi
  etapa_dependencias || return 1
  etapa_migrations
}

cmd_doctor() {
  titulo "Lyra MetaCare · doctor (somente leitura)"
  limpar_verif
  verificar_plataforma
  verif "Bash" ok "$BASH_VERSION"
  verificar_node
  verificar_docker
  verificar_env
  verificar_dependencias
  ler_env

  estado_app
  local porta_app="${APP_PORTA:-${LYRA_APP_PORT:-$PORTA_APP_PADRAO}}" dono
  if [[ -n "$APP_PID_ATUAL" ]]; then
    verif "Porta $porta_app (app)" ok "em uso pela aplicação (PID $APP_PID_ATUAL)"
  else
    dono="$(dono_da_porta "$porta_app")"
    if [[ -n "$dono" ]]; then
      verif "Porta $porta_app (app)" aviso "$dono" "O \`up\` usará a próxima porta livre, sem encerrar esse processo."
    else
      verif "Porta $porta_app (app)" ok "livre"
    fi
  fi

  estado_banco
  local porta_db
  porta_db="$(env_valor MYSQL_HOST_PORT "$PORTA_DB_PADRAO")"
  if [[ "$DB_ESTADO" == "running" && "$DB_PORTA" == "$porta_db" ]]; then
    verif "Porta $porta_db (MySQL)" ok "em uso pelo MySQL do projeto"
  else
    dono="$(dono_da_porta "$porta_db")"
    if [[ -n "$dono" ]]; then
      verif "Porta $porta_db (MySQL)" aviso "$dono" "Confirme o daemon que contém o banco; sem identidade do container, \`db\`/\`up\` preservará a porta e recusará criar outro banco."
    else
      verif "Porta $porta_db (MySQL)" ok "livre"
    fi
  fi

  local esperado
  esperado="$(total_migrations)"
  if [[ "$DB_SAUDE" == "healthy" ]]; then
    verif "MySQL" ok "$DB_VERSAO saudável em 127.0.0.1:$DB_PORTA"
    if [[ "$DB_MIGRATIONS" == "$esperado" ]]; then
      verif "Migrations" ok "$esperado/$esperado aplicadas"
    else
      verif "Migrations" aviso "${DB_MIGRATIONS:-?}/$esperado aplicadas" "\`./run.sh migrate\`."
    fi
  elif [[ -n "$DB_INDISPONIVEL" ]]; then
    verif "MySQL" aviso "não consultável: $DB_INDISPONIVEL" "Resolva o item do Docker acima e rode \`./run.sh db\`."
  else
    verif "MySQL" aviso "${DB_ESTADO:-container ausente}${DB_SAUDE:+ $DB_SAUDE}" "\`./run.sh db\`."
  fi

  if [[ -n "$APP_PID_ATUAL" && -n "$APP_PORTA" ]]; then
    local status
    status="$(consultar_http "http://127.0.0.1:$APP_PORTA/api/health")"
    verif "Aplicação" "$([[ "$status" == 200 ]] && echo ok || echo aviso)" \
      "PID $APP_PID_ATUAL ($APP_MODO) em http://localhost:$APP_PORTA · /api/health $status"
  else
    verif "Aplicação" ok "parada"
  fi

  printf '\n%s%s%s%s%s\n' "$C_NEGRITO" "$(coluna "Verificação" 23)" "$(coluna "Estado" 10)" "Detalhe" "$C_FIM"
  printf '%s\n' "--------------------------------------------------------------------------------"
  local i simbolo erros=0 avisos=0
  for i in "${!VERIF_NOMES[@]}"; do
    case "${VERIF_ESTADOS[$i]}" in
      ok)    simbolo="${C_OK}✔ ok${C_FIM}    " ;;
      aviso) simbolo="${C_AVISO}⚠ aviso${C_FIM} "; avisos=$((avisos + 1)) ;;
      *)     simbolo="${C_ERRO}✖ erro${C_FIM}  "; erros=$((erros + 1)) ;;
    esac
    printf '%s%s %s\n' "$(coluna "${VERIF_NOMES[$i]}" 23)" "$simbolo" "${VERIF_DETALHES[$i]}"
    registrar "${VERIF_NOMES[$i]} | ${VERIF_ESTADOS[$i]} | ${VERIF_DETALHES[$i]}"
  done
  printf '\n'
  for i in "${!VERIF_NOMES[@]}"; do
    [[ "${VERIF_ESTADOS[$i]}" != ok && -n "${VERIF_CORRECOES[$i]}" ]] && info "${VERIF_NOMES[$i]}: ${VERIF_CORRECOES[$i]}"
  done
  if (( erros > 0 )); then
    erro "$erros erro(s) e $avisos aviso(s)."
    return 1
  elif (( avisos > 0 )); then
    aviso "Sem erros; $avisos aviso(s) (\`./run.sh fix\` resolve os automatizáveis)."
  else
    ok "Ambiente saudável."
  fi
}

cmd_fix() {
  titulo "Lyra MetaCare · fix (correções seguras)"
  etapa_preflight || return 1
  etapa_env || return 1
  etapa_dependencias || return 1
  etapa_banco || return 1
  etapa_migrations || return 1
  ok "Correções seguras aplicadas. A aplicação não foi iniciada (\`./run.sh up\`)."
}

cmd_repair() {
  titulo "Lyra MetaCare · repair (preserva os dados)"
  info "Será feito: parar a aplicação, remover .next e node_modules (recriáveis), reinstalar as dependências, recriar o container do MySQL (o volume com os dados é mantido) e reaplicar as migrations."
  if [[ "${1:-}" != "--sim" ]]; then
    confirmar "Confirma o reparo?" sim "--sim" || return 1
  fi
  etapa_preflight || return 1
  etapa_env || return 1
  parar_app || return 1
  remover_artefato .next || return 1
  remover_artefato node_modules || return 1
  etapa_dependencias --forcar || return 1
  etapa "Recriando o container do MySQL (volume preservado)"
  etapa_porta_banco || return 1
  executar "Recriação do MySQL" compose up -d --wait --force-recreate "$SERVICO_DB" || return 1
  etapa_migrations || return 1
  ok "Reparo concluído."
}

cmd_purge() {
  titulo "Lyra MetaCare · purge (APAGA o banco local)"
  if [[ "${1:-}" != "--confirmar-purge" ]]; then
    erro "O purge apaga TODOS os dados do MySQL local deste projeto. Repita com --confirmar-purge."
    return 2
  fi
  info "Será feito: parar a aplicação, backup verificado do volume do MySQL, remoção do container, da rede e do volume do projeto e do cache .next. Nada fora do projeto é alterado."
  if [[ -t 0 ]]; then
    confirmar "Os dados do banco serão apagados após o backup." APAGAR "--confirmar-purge" || return 1
  fi
  etapa_preflight || return 1
  etapa_env || return 1
  parar_app || return 1
  etapa "Backup a frio do volume do MySQL"
  executar "Backup do volume" node scripts/mysql-upgrade.mjs --backup || return 1
  local volume=""
  volume="$(grep -oE 'BACKUP_VOLUME=[^[:space:]]+' "$ULTIMA_SAIDA" | head -n 1 | cut -d= -f2)"
  if [[ -n "$volume" ]]; then
    ok "Backup verificado: $volume"
  elif ! grep -q "inexistente" "$ULTIMA_SAIDA"; then
    erro "O backup não informou o volume gerado; purge interrompido."
    return 1
  fi
  etapa "Removendo container, rede e volume do projeto"
  executar "Remoção do banco" compose down --volumes --remove-orphans || return 1
  remover_artefato .next || return 1
  ok "Purge concluído."
  [[ -n "$volume" ]] && info "Para restaurar: node scripts/mysql-upgrade.mjs --restaurar $volume"
  return 0
}

cmd_status() {
  titulo "Lyra MetaCare · status"
  estado_app
  estado_banco
  linha_status() { printf '%s%s%s\n' "$(coluna "$1" 13)" "$(coluna "$2" 19)" "$3"; }
  printf '%s' "$C_NEGRITO"; linha_status "Componente" "Situação" "Detalhe"; printf '%s' "$C_FIM"
  if [[ -n "$APP_PID_ATUAL" && -n "$APP_PORTA" ]]; then
    local status
    status="$(consultar_http "http://127.0.0.1:$APP_PORTA/api/health")"
    linha_status "Aplicação" "$([[ "$status" == 200 ]] && echo 'em execução' || echo 'sem resposta')" \
      "PID $APP_PID_ATUAL · $APP_MODO · http://localhost:$APP_PORTA · desde ${APP_INICIO:-?} · $APP_ORIGEM"
  else
    linha_status "Aplicação" "parada" "-"
  fi
  if [[ -n "$DB_ESTADO" ]]; then
    local detalhe_db="porta ${DB_PORTA:--}"
    [[ -n "$DB_VERSAO" ]] && detalhe_db+=" · MySQL $DB_VERSAO"
    [[ -n "$DB_MIGRATIONS" ]] && detalhe_db+=" · $DB_MIGRATIONS/$(total_migrations) migrations"
    linha_status "MySQL" "$DB_ESTADO $DB_SAUDE" "$detalhe_db"
  elif [[ -n "$DB_INDISPONIVEL" ]]; then
    linha_status "MySQL" "não consultável" "$DB_INDISPONIVEL"
  else
    linha_status "MySQL" "ausente" "container não criado"
  fi
}

cmd_logs() {
  local alvo="todos" seguir=0 argumento
  for argumento in "$@"; do
    case "$argumento" in
      app|db|todos) alvo="$argumento" ;;
      --seguir) seguir=1 ;;
      *) erro "Argumento desconhecido para logs: $argumento"; return 2 ;;
    esac
  done
  if [[ "$alvo" == app || "$alvo" == todos ]]; then
    estado_app
    local arquivo="$APP_LOG"
    if [[ -z "$arquivo" || ! -f "$arquivo" ]]; then
      arquivo="$(find "$LOGS" -maxdepth 1 -type f -name 'app-*.log' -printf '%T@ %p\n' 2>/dev/null \
        | sort -nr | head -n 1 | cut -d' ' -f2-)"
    fi
    titulo "Log da aplicação (${arquivo:-inexistente})"
    if [[ -n "$arquivo" && -f "$arquivo" ]]; then
      if (( seguir == 1 )) && [[ "$alvo" == app ]]; then
        tail -n 120 -f "$arquivo"
      else
        tail -n 120 "$arquivo"
      fi
    fi
  fi
  if [[ "$alvo" == db || "$alvo" == todos ]]; then
    titulo "Log do MySQL"
    if [[ ! -f "$ENV_LOCAL" ]]; then
      aviso "Sem .env.local: nenhum banco configurado."
      return 0
    fi
    if (( seguir == 1 )) && [[ "$alvo" == db ]]; then
      compose logs --tail 80 --follow "$SERVICO_DB" </dev/null
    else
      compose logs --tail 80 "$SERVICO_DB" </dev/null
    fi
  fi
  return 0
}

cmd_stop() {
  local alvo="${1:-todos}"
  case "$alvo" in app|db|todos) ;; *) erro "Use: ./run.sh stop [app|db]"; return 2 ;; esac
  titulo "Lyra MetaCare · stop"
  local codigo=0
  if [[ "$alvo" == app || "$alvo" == todos ]]; then parar_app || codigo=1; fi
  if [[ "$alvo" == db || "$alvo" == todos ]]; then parar_banco || codigo=1; fi
  return "$codigo"
}

cmd_help() {
  sed -n '3,/^# ====/p' "${BASH_SOURCE[0]}" | sed -e '$d' -e 's/^# \{0,1\}//'
}

# -----------------------------------------------------------------------------
# Menu interativo
# -----------------------------------------------------------------------------
readonly -a MENU_ROTULOS=(
  "Sair"
  "Subir tudo (desenvolvimento)"
  "Subir tudo (produção: build + start)"
  "Somente banco + migrations"
  "Somente aplicação (desenvolvimento)"
  "Aplicar migrations"
  "Diagnóstico (doctor)"
  "Correções seguras (fix)"
  "Estado (status)"
  "Logs (aplicação e banco)"
  "Parar tudo"
  "Reparo preservando dados (repair)"
)
readonly -a MENU_COMANDOS=("" "up" "up --prod" "db" "app" "migrate" "doctor" "fix" "status" "logs" "stop" "repair")

menu() {
  local escolha i
  while true; do
    estado_app
    estado_banco --sem-sql
    printf '\n%s╭─ Lyra MetaCare · run.sh (%s) ──────────────────╮%s\n' "$C_TITULO" "$([[ "$PLATAFORMA" == windows ]] && echo "Git Bash" || echo "$PLATAFORMA")" "$C_FIM"
    for (( i = 1; i < ${#MENU_ROTULOS[@]}; i++ )); do
      printf '%s│%s %s%2d%s  %s\n' "$C_TITULO" "$C_FIM" "$C_INFO" "$i" "$C_FIM" "${MENU_ROTULOS[$i]}"
    done
    printf '%s│%s %s%2d%s  %s\n' "$C_TITULO" "$C_FIM" "$C_INFO" 0 "$C_FIM" "${MENU_ROTULOS[0]}"
    printf '%s╰─%s Aplicação: %s · MySQL: %s\n' "$C_TITULO" "$C_FIM" \
      "$([[ -n "$APP_PID_ATUAL" ]] && echo "em execução na porta ${APP_PORTA:-?}" || echo parada)" \
      "${DB_SAUDE:-${DB_ESTADO:-ausente}}"
    if ! read -r -p "Opção: " escolha; then
      printf '\n'
      info "Menu encerrado."
      return 0
    fi
    if [[ ! "$escolha" =~ ^[0-9]+$ ]] || (( escolha >= ${#MENU_ROTULOS[@]} )); then
      aviso "Opção inválida: $escolha"
      continue
    fi
    (( escolha == 0 )) && return 0
    local -a argumentos
    read -r -a argumentos <<<"${MENU_COMANDOS[$escolha]}"
    executar_comando "${argumentos[@]}"
    read -r -p "Enter para voltar ao menu " _ || { printf '\n'; return 0; }
  done
}

# -----------------------------------------------------------------------------
# Entrada
# -----------------------------------------------------------------------------
executar_comando() {
  local comando="${1:-}"
  [[ $# -gt 0 ]] && shift
  case "$comando" in
    up|app|db|migrate|doctor|fix|repair|purge|status|logs|stop) ;;
    help|-h|--help) cmd_help; return 0 ;;
    *) erro "Comando desconhecido: $comando"; info "Use ./run.sh help."; return 2 ;;
  esac
  # Opções aceitas por comando (as demais validam os próprios argumentos).
  local opcao_valida=""
  case "$comando" in
    up|app)  opcao_valida="--prod" ;;
    repair)  opcao_valida="--sim" ;;
    db|migrate|doctor|fix|status) opcao_valida="-" ;;
  esac
  if [[ -n "$opcao_valida" ]] && { (( $# > 1 )) || [[ $# -eq 1 && "$1" != "$opcao_valida" ]]; }; then
    erro "Argumento inválido para $comando: $*"
    info "Use ./run.sh help."
    return 2
  fi
  limpar_verif
  verificar_node
  if (( $(contar_erros) > 0 )); then mostrar_verificacoes; return 1; fi
  abrir_registro "$comando"
  local codigo inicio=$SECONDS
  case "$comando" in
    up)      cmd_up "$@" ;;
    app)     cmd_app "$@" ;;
    db)      cmd_db ;;
    migrate) cmd_migrate ;;
    doctor)  cmd_doctor ;;
    fix)     cmd_fix ;;
    repair)  cmd_repair "$@" ;;
    purge)   cmd_purge "$@" ;;
    status)  cmd_status ;;
    logs)    cmd_logs "$@" ;;
    stop)    cmd_stop "$@" ;;
  esac
  codigo=$?
  registrar "# fim: exit $codigo em $((SECONDS - inicio))s"
  if [[ "$comando" != logs ]]; then
    info "Registro desta execução: $RAIZ/$REGISTRO (exit $codigo)."
  fi
  return "$codigo"
}

encerrar() {
  [[ -n "$ULTIMA_SAIDA" ]] && rm -f -- "$ULTIMA_SAIDA"
  return 0
}
trap encerrar EXIT
trap 'printf "\n"; aviso "Interrompido pelo operador."; exit 130' INT

if [[ $# -eq 0 ]]; then
  if [[ -t 0 && -t 1 ]]; then
    menu
    exit $?
  fi
  cmd_help
  exit 0
fi
executar_comando "$@"
exit $?
