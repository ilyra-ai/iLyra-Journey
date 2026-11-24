#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════════════
#  TUI-WEBNOVA · Orquestrador do iLyra (WSL2 Ubuntu)
#
#  Adaptado do template WebNova (https://github.com/ilyra-ai/tui-webnova):
#  launcher Bash + servidor Python (somente biblioteca padrão) + painel web.
#
#  Diferenças em relação ao template:
#    • cada ação roda num pseudoterminal (PTY) real: cores, barras de
#      progresso e perguntas interativas (sudo, confirmações) aparecem no
#      terminal do painel, e o que você digita lá vai para o comando;
#    • a aplicação (Next.js) roda como serviço do próprio orquestrador, com a
#      saída ao vivo no painel;
#    • nenhum arquivo de log é criado: a saída fica só na memória da sessão
#      (os únicos arquivos gravados são os backups que você pedir, o
#      .env.local e o build de produção).
#
#  Uso:
#    ./tui-webnova.sh                  painel no navegador (abre sozinho)
#    ./tui-webnova.sh --no-browser     painel sem abrir o navegador
#    ./tui-webnova.sh --run-action ID  executa uma ação direto neste terminal
#    ./tui-webnova.sh --list-actions-json | --menu-preview | --self-test | --help
#
#  Variáveis: WEBNOVA_PORT (padrão 8808), WEBNOVA_HOST (padrão 127.0.0.1),
#             LYRA_APP_PORT (porta da aplicação, padrão 3000).
# ════════════════════════════════════════════════════════════════════════════

set -Eeuo pipefail
IFS=$'\n\t'

APP_NOME="${WEBNOVA_APP_NOME:-iLyra}"
APP_VERSAO="${WEBNOVA_APP_VERSAO:-2.0.0}"
WEBNOVA_HOST="${WEBNOVA_HOST:-127.0.0.1}"
WEBNOVA_PORT="${WEBNOVA_PORT:-8808}"
WEBNOVA_SCRIPT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
export APP_NOME APP_VERSAO WEBNOVA_HOST WEBNOVA_PORT WEBNOVA_SCRIPT_PATH

# Exclusivo do WSL2 (Ubuntu no Windows). WEBNOVA_PERMITIR_LINUX=1 libera um
# Linux comum só para validação automatizada (CI ou containers de teste).
if [[ "$(uname -s)" != "Linux" ]]; then
  printf 'Erro: o TUI-WEBNOVA roda somente no WSL2 Ubuntu. Abra o terminal do Ubuntu (WSL2) e execute de lá.\n' >&2
  exit 1
fi
if ! grep -qi 'microsoft' /proc/version 2>/dev/null && [[ "${WEBNOVA_PERMITIR_LINUX:-0}" != "1" ]]; then
  printf 'Erro: este Linux não é o WSL2. O TUI-WEBNOVA é exclusivo do WSL2 Ubuntu.\n' >&2
  exit 1
fi
if grep -qi 'microsoft' /proc/version 2>/dev/null && ! grep -qiE 'wsl2|microsoft-standard' /proc/version 2>/dev/null; then
  printf 'Erro: WSL1 detectado (sem suporte ao Docker). No PowerShell: wsl --set-version <distro> 2\n' >&2
  exit 1
fi

if command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="python3"
else
  printf 'Erro: Python 3 não encontrado. Instale com: sudo apt update && sudo apt install -y python3\n' >&2
  exit 1
fi

if ! "$PYTHON_BIN" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)'; then
  printf 'Erro: o TUI-WEBNOVA precisa do Python 3.10 ou superior (Ubuntu 22.04+ já traz).\n' >&2
  exit 1
fi

exec "$PYTHON_BIN" - "$@" <<'PY_WEBNOVA'
from __future__ import annotations

import base64
import datetime as _dt
import fcntl
import http.server
import json
import os
import platform
import pty
import re
import secrets
import shutil
import signal
import socket
import struct
import subprocess
import sys
import termios
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from pathlib import Path
from typing import Callable, Dict, List, Optional

APP_NOME = os.environ.get("APP_NOME", "iLyra")
APP_VERSAO = os.environ.get("APP_VERSAO", "2.0.0")
HOST = os.environ.get("WEBNOVA_HOST", "127.0.0.1")
PORT_DEFAULT = int(os.environ.get("WEBNOVA_PORT", "8808"))
SCRIPT_PATH = Path(os.environ.get("WEBNOVA_SCRIPT_PATH", sys.argv[0])).resolve()
RAIZ = SCRIPT_PATH.parent
INICIO = time.time()
TOKEN = secrets.token_urlsafe(24)

ENV_LOCAL = RAIZ / ".env.local"
NVMRC = RAIZ / ".nvmrc"
PACKAGE_JSON = RAIZ / "package.json"
LOCKFILE = RAIZ / "pnpm-lock.yaml"
LOCK_INSTALADO = RAIZ / "node_modules" / ".pnpm" / "lock.yaml"
MIGRATIONS_DIR = RAIZ / "mysql" / "migrations"
BACKUPS = RAIZ / "backups"
CONTAINER_DB = "lyra-metacare-mysql"
PORTA_APP_PADRAO = int(os.environ.get("LYRA_APP_PORT", "3000"))
TEMPO_MAX_APP = 240
VERSAO_NVM = "v0.40.5"

# ════════════════════════════════════════════════════════════════════════════
# Ambiente dos processos: Node da versão do .nvmrc (nvm) à frente do PATH
# ════════════════════════════════════════════════════════════════════════════


def node_alvo() -> str:
    return NVMRC.read_text(encoding="utf-8").strip() if NVMRC.exists() else ""


def pasta_node_nvm() -> Optional[Path]:
    """Pasta `bin` do Node do nvm na versão do .nvmrc (ou a maior da mesma major)."""
    nvm = Path(os.environ.get("NVM_DIR", str(Path.home() / ".nvm")))
    versoes = nvm / "versions" / "node"
    alvo = node_alvo()
    if alvo and (versoes / f"v{alvo}" / "bin" / "node").exists():
        return versoes / f"v{alvo}" / "bin"
    if not versoes.is_dir() or not alvo:
        return None
    major = alvo.split(".")[0]
    candidatas = sorted(
        (p for p in versoes.iterdir() if p.name.startswith(f"v{major}.") and (p / "bin" / "node").exists()),
        key=lambda p: tuple(int(n) for n in re.findall(r"\d+", p.name)[:3]),
    )
    return candidatas[-1] / "bin" if candidatas else None


def ambiente(extra: Optional[Dict[str, str]] = None) -> Dict[str, str]:
    env = dict(os.environ)
    pasta = pasta_node_nvm()
    if pasta:
        env["PATH"] = f"{pasta}{os.pathsep}{env.get('PATH', '')}"
    env.update(
        {
            "RAIZ": str(RAIZ),
            "TERM": "xterm-256color",
            "COLORTERM": "truecolor",
            "FORCE_COLOR": "1",
            "COREPACK_ENABLE_DOWNLOAD_PROMPT": "0",
            "LANG": env.get("LANG") or "C.UTF-8",
            "VERSAO_NVM": VERSAO_NVM,
            # Lido pelo next.config.ts: desliga o servidor MCP de dev do
            # Next.js, que gravaria .next/dev/logs/next-development.log.
            "WEBNOVA_SEM_LOGS": "1",
        }
    )
    if extra:
        env.update(extra)
    return env


def ler_env_local() -> Dict[str, str]:
    valores: Dict[str, str] = {}
    if not ENV_LOCAL.exists():
        return valores
    for linha in ENV_LOCAL.read_text(encoding="utf-8").splitlines():
        texto = linha.strip()
        if not texto or texto.startswith("#") or "=" not in texto:
            continue
        chave, valor = texto.split("=", 1)
        valor = valor.strip()
        if len(valor) >= 2 and valor[0] == valor[-1] and valor[0] in "\"'":
            valor = valor[1:-1]
        valores[chave.strip()] = valor
    # Como no Next.js, uma variável definida no ambiente prevalece sobre o
    # arquivo (ex.: MYSQL_DATABASE=outro ./tui-webnova.sh --interno migrar).
    for chave in list(valores):
        if os.environ.get(chave):
            valores[chave] = os.environ[chave]
    return valores


def agora_iso() -> str:
    return _dt.datetime.now().astimezone().isoformat(timespec="seconds")


def bytes_humanos(valor: float) -> str:
    unidades = ["B", "KB", "MB", "GB", "TB"]
    indice = 0
    while valor >= 1024 and indice < len(unidades) - 1:
        valor /= 1024
        indice += 1
    return f"{int(valor)} {unidades[indice]}" if indice == 0 else f"{valor:.1f} {unidades[indice]}"


def consultar(cmd: List[str], timeout: float = 20) -> tuple[int, str]:
    try:
        resultado = subprocess.run(
            cmd, cwd=RAIZ, env=ambiente(), capture_output=True, text=True, timeout=timeout
        )
        return resultado.returncode, (resultado.stdout + resultado.stderr).strip()
    except FileNotFoundError:
        return 127, ""
    except subprocess.TimeoutExpired:
        return 124, ""


def http_status(url: str, timeout: float = 5) -> int:
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resposta:
            return resposta.status
    except urllib.error.HTTPError as erro:
        return erro.code
    except (urllib.error.URLError, TimeoutError, ConnectionError, OSError):
        return 0


def porta_em_uso(porta: int) -> bool:
    for familia, endereco in ((socket.AF_INET, "127.0.0.1"), (socket.AF_INET6, "::1")):
        try:
            with socket.socket(familia, socket.SOCK_STREAM) as s:
                s.settimeout(0.4)
                if s.connect_ex((endereco, porta)) == 0:
                    return True
        except OSError:
            continue
    return False


def porta_livre(inicio: int) -> int:
    for porta in range(inicio, inicio + 50):
        if not porta_em_uso(porta):
            return porta
    raise RuntimeError(f"Nenhuma porta livre entre {inicio} e {inicio + 49}.")


def url_local(valor: str, porta: int) -> str:
    combinacao = re.match(r"^(https?://(?:localhost|127\.0\.0\.1))(?::\d+)?(/.*)?$", valor or "")
    if not combinacao:
        return valor
    return f"{combinacao.group(1)}:{porta}{combinacao.group(2) or ''}"


# ════════════════════════════════════════════════════════════════════════════
# Biblioteca Bash comum às ações (executada dentro de um PTY real)
# ════════════════════════════════════════════════════════════════════════════

LIB = r'''
set -o pipefail
cd "$RAIZ" || exit 1
export DEBIAN_FRONTEND=noninteractive COREPACK_ENABLE_DOWNLOAD_PROMPT=0
R=$'\e[0m'; B=$'\e[1m'; D=$'\e[2m'
VD=$'\e[38;5;79m'; AM=$'\e[38;5;221m'; VM=$'\e[38;5;203m'; AZ=$'\e[38;5;117m'; TL=$'\e[38;5;44m'; CO=$'\e[38;5;209m'
titulo(){ printf '\n%s%s◆ %s%s\n%s%s%s\n' "$B" "$TL" "$1" "$R" "$D" '──────────────────────────────────────────────────────────' "$R"; }
passo(){ printf '%s▸ %s%s\n' "$AZ" "$*" "$R"; }
ok(){ printf '  %s✔%s %s\n' "$VD" "$R" "$*"; }
ja(){ printf '  %s↷%s %s %s(já existe; nada a fazer)%s\n' "$VD" "$R" "$*" "$D" "$R"; }
aviso(){ printf '  %s⚠%s %s\n' "$AM" "$R" "$*"; }
falha(){ printf '  %s✖%s %s\n' "$VM" "$R" "$*"; }
info(){ printf '  %s•%s %s\n' "$D" "$R" "$*"; }
cmd(){ printf '  %s$ %s%s\n' "$D" "$*" "$R"; "$@"; }
morrer(){ falha "$*"; printf '\n%s%s✖ Interrompido:%s %s\n' "$B" "$VM" "$R" "$*"; exit 1; }
concluido(){ printf '\n%s%s✔ %s%s\n' "$B" "$VD" "$*" "$R"; }

SUDO=""; if [ "$(id -u)" -ne 0 ]; then SUDO="sudo"; fi
pedir_sudo(){
  [ -z "$SUDO" ] && return 0
  sudo -n true 2>/dev/null && return 0
  info "${CO}O próximo passo precisa de permissão de administrador (sudo).${R}"
  info "${CO}Clique no terminal, digite a sua senha do Ubuntu e tecle Enter.${R}"
  sudo -v || morrer "Permissão de administrador não concedida."
}

NODE_ALVO="$(tr -d '[:space:]' < .nvmrc 2>/dev/null)"
PNPM_FIXO="$(grep -o '"packageManager": *"pnpm@[0-9.]*' package.json | sed 's/.*pnpm@//')"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
carregar_node(){
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    # shellcheck disable=SC1091
    . "$NVM_DIR/nvm.sh" --no-use
    nvm use --silent "$NODE_ALVO" >/dev/null 2>&1 || true
  fi
  hash -r
}
node_compativel(){
  command -v node >/dev/null 2>&1 || return 1
  node -e '
    const atual = process.versions.node.split(".").map(Number);
    const faixa = (require("./package.json").engines || {}).node || "";
    const m = faixa.match(/(\d+)\.(\d+)\.(\d+)/);
    if (!m) process.exit(0);
    const minimo = m.slice(1).map(Number);
    const ok = atual[0] === minimo[0] && (atual[1] > minimo[1] || (atual[1] === minimo[1] && atual[2] >= minimo[2]));
    process.exit(ok ? 0 : 1);' 2>/dev/null
}
pnpm_ok(){ command -v corepack >/dev/null 2>&1 && [ "$(corepack pnpm --version 2>/dev/null | tail -1)" = "$PNPM_FIXO" ]; }
pn(){ corepack pnpm "$@"; }
deps_sincronizadas(){ [ -f node_modules/.pnpm/lock.yaml ] && cmp -s node_modules/.pnpm/lock.yaml pnpm-lock.yaml; }

PACOTES_BASE=(ca-certificates curl git gnupg build-essential pkg-config python3 tar gzip)
pacote_instalado(){ dpkg-query -W -f='${Status}' "$1" 2>/dev/null | grep -q 'install ok installed'; }

DK_SG=0
docker_desktop(){
  local alvo
  alvo="$(readlink -f "$(command -v docker 2>/dev/null)" 2>/dev/null)"
  [[ "$alvo" == /mnt/wsl/* || "$alvo" == /mnt/c/* ]]
}
docker_acessivel(){
  command -v docker >/dev/null 2>&1 || return 1
  if docker info >/dev/null 2>&1; then DK_SG=0; return 0; fi
  # Usuário recém-incluído no grupo docker: a sessão atual ainda não tem o
  # grupo; `sg docker` usa o grupo sem exigir novo login.
  if getent group docker 2>/dev/null | cut -d: -f4 | tr ',' '\n' | grep -qx "$(id -un)" \
     && sg docker -c 'docker info' >/dev/null 2>&1; then DK_SG=1; return 0; fi
  return 1
}
dk(){ if [ "$DK_SG" = 1 ]; then sg docker -c "$(printf '%q ' docker "$@")"; else docker "$@"; fi; }
compose(){ dk compose --env-file "$RAIZ/.env.local" "$@"; }
iniciar_daemon_docker(){
  if [ "$(ps -p 1 -o comm= 2>/dev/null)" = "systemd" ]; then
    cmd $SUDO systemctl enable --now docker
  else
    cmd $SUDO service docker start
  fi
  local i
  for i in $(seq 1 30); do docker_acessivel && return 0; sleep 1; done
  return 1
}
versao_maior_igual(){ [ "$(printf '%s\n%s\n' "$2" "$1" | sort -V | head -1)" = "$2" ]; }

ler_env(){ sed -n "s/^$1=//p" .env.local 2>/dev/null | tail -1 | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'$/\1/"; }
SEGREDOS=(MYSQL_PASSWORD MYSQL_ROOT_PASSWORD AUTH_SECRET ADMIN_BOOTSTRAP_PASSWORD)
env_completo(){
  [ -f .env.local ] || return 1
  local chave
  for chave in $(sed -n 's/^\([A-Z0-9_]*\)=.*/\1/p' .env.example); do
    grep -q "^$chave=" .env.local || return 1
  done
  for chave in "${SEGREDOS[@]}"; do [ -n "$(ler_env "$chave")" ] || return 1; done
}
definir_env(){
  python3 - "$1" "$2" <<'PY'
import os, sys
from pathlib import Path
caminho = Path(".env.local"); chave, valor = sys.argv[1], sys.argv[2]
linhas = caminho.read_text(encoding="utf-8").splitlines(); achou = False
for i, linha in enumerate(linhas):
    if linha.split("=", 1)[0].strip() == chave:
        linhas[i] = f"{chave}={valor}"; achou = True
if not achou:
    linhas.append(f"{chave}={valor}")
tmp = caminho.with_name(".env.local.tmp"); tmp.write_text("\n".join(linhas) + "\n", encoding="utf-8")
os.chmod(tmp, 0o600); tmp.replace(caminho)
PY
}
porta_ocupada(){ (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null; }

CONTAINER=lyra-metacare-mysql
estado_mysql(){ dk inspect --format '{{.State.Status}}{{if .State.Health}}/{{.State.Health.Status}}{{end}}' "$CONTAINER" 2>/dev/null; }
mysql_saudavel(){ [ "$(estado_mysql)" = "running/healthy" ]; }
subir_mysql(){
  # O --wait do Compose pode encerrar imediatamente ao reencontrar um
  # container unhealthy. A espera e o reparo autenticado são feitos abaixo.
  cmd compose up -d mysql || morrer "Não foi possível iniciar o container do MySQL (veja o erro do Compose acima)."
  cmd webnova --interno preparar-banco || morrer "O MySQL não ficou pronto; veja o diagnóstico acima. Os dados foram preservados."
}
garantir_mysql(){
  docker_acessivel || morrer "Docker indisponível. Rode a opção “Instalar banco de dados” (ou abra o Docker Desktop)."
  env_completo || morrer ".env.local incompleto. Rode a opção “Instalar banco de dados”."
  if [ -z "$(estado_mysql)" ]; then morrer "O container do MySQL ainda não existe. Rode a opção “Instalar banco de dados”."; fi
  passo "Subindo o MySQL existente (dados preservados no volume)"
  subir_mysql
}
# O orquestrador chama só a si mesmo: env, migrations e verificações são
# implementados dentro dele (nenhum outro arquivo do projeto é executado).
webnova(){ "$WEBNOVA_SCRIPT_PATH" "$@"; }
migrations_pendentes(){ ! webnova --interno banco-status >/dev/null 2>&1; }
build_atual(){
  [ -f .next/BUILD_ID ] || return 1
  [ "$(cat .next/lyra-commit 2>/dev/null)" = "$(git rev-parse HEAD 2>/dev/null)" ] || return 1
  [ -z "$(git status --porcelain -- src public modules mysql next.config.ts package.json pnpm-lock.yaml tsconfig.json postcss.config.mjs 2>/dev/null)" ]
}
fazer_build(){
  cmd pn exec next build || return 1
  git rev-parse HEAD > .next/lyra-commit 2>/dev/null || true
}
fazer_dump(){
  local destino="$1" db root
  db="$(ler_env MYSQL_DATABASE)"; root="$(ler_env MYSQL_ROOT_PASSWORD)"
  passo "Exportando o banco $db (mysqldump, transação consistente)"
  MYSQL_PWD="$root" dk exec -e MYSQL_PWD "$CONTAINER" mysqldump -uroot \
    --single-transaction --quick --routines --triggers --events --hex-blob \
    --set-gtid-purged=OFF --databases "$db" | gzip -9 > "$destino" || { rm -f "$destino"; return 1; }
  chmod 600 "$destino"
  gzip -t "$destino" || { falha "Arquivo comprimido corrompido."; return 1; }
  zcat "$destino" | tail -n 1 | grep -q 'Dump completed' || { falha "Dump incompleto (sem a marca final do mysqldump)."; return 1; }
  ok "Dump verificado: $(zcat "$destino" | grep -c '^CREATE TABLE') tabelas, $(du -h "$destino" | cut -f1)."
}
fazer_tar_app(){
  local destino="$1"
  passo "Empacotando o app (código, .git, .env.local; sem node_modules, .next e backups)"
  tar -czf "$destino" -C "$RAIZ" \
    --exclude=./node_modules --exclude=./.next --exclude=./backups \
    --exclude=./.lyra-run --exclude=./.lyra-run-windows --exclude=./.logs . || { rm -f "$destino"; return 1; }
  chmod 600 "$destino"
  gzip -t "$destino" || { falha "Arquivo comprimido corrompido."; return 1; }
  ok "Pacote verificado: $(tar -tzf "$destino" | wc -l) itens, $(du -h "$destino" | cut -f1)."
}
'''

# ════════════════════════════════════════════════════════════════════════════
# Scripts das ações (Bash, dentro de PTY)
# ════════════════════════════════════════════════════════════════════════════

S_VERIFICAR = r'''
titulo "Check-up do ambiente (somente leitura: nada é instalado)"
prontos=0; pendentes=0
item(){ if [ "$1" = ok ]; then ok "$2"; prontos=$((prontos+1)); else falha "$2"; pendentes=$((pendentes+1)); [ -n "${3:-}" ] && info "Resolve: $3"; fi; }
if grep -qi microsoft /proc/version 2>/dev/null; then ok "Plataforma: WSL2"; else aviso "Plataforma: Linux fora do WSL2 (liberado só para validação)"; fi
. /etc/os-release 2>/dev/null; info "Sistema: ${PRETTY_NAME:-desconhecido}"
titulo "Requisitos"
for p in "${PACOTES_BASE[@]}"; do pacote_instalado "$p" && item ok "Pacote $p" || item erro "Pacote $p ausente" "Instalar requisitos"; done
carregar_node
[ -s "$NVM_DIR/nvm.sh" ] && item ok "nvm em $NVM_DIR" || info "nvm não instalado (necessário só se o Node compatível faltar)"
node_compativel && item ok "Node.js $(node --version) (exigido: $(sed -n 's/.*"node": *"\([^"]*\)".*/\1/p' package.json))" || item erro "Node.js $NODE_ALVO ausente ou incompatível" "Instalar requisitos"
pnpm_ok && item ok "pnpm $PNPM_FIXO via Corepack" || item erro "pnpm $PNPM_FIXO indisponível" "Instalar requisitos"
deps_sincronizadas && item ok "Dependências do projeto conforme o pnpm-lock.yaml" || item erro "Dependências ausentes ou desatualizadas" "Instalar requisitos"
titulo "Banco de dados"
if docker_acessivel; then item ok "Docker $(dk version --format '{{.Server.Version}}' 2>/dev/null) · Compose $(dk compose version --short 2>/dev/null)"; else
  if command -v docker >/dev/null 2>&1 && docker_desktop; then item erro "Docker Desktop instalado, mas parado" "abra o Docker Desktop no Windows (WSL integration ativa)"; else item erro "Docker indisponível" "Instalar banco de dados"; fi; fi
env_completo && item ok ".env.local completo" || item erro ".env.local ausente ou incompleto" "Instalar banco de dados"
if docker_acessivel && env_completo; then
  e="$(estado_mysql)"; [ "$e" = "running/healthy" ] && item ok "MySQL saudável (porta $(ler_env MYSQL_HOST_PORT))" || item erro "MySQL: ${e:-container inexistente}" "Instalar banco de dados"
  if mysql_saudavel && node_compativel; then
    if migrations_pendentes; then item erro "Há migrations pendentes" "Migrations"; else item ok "Migrations em dia ($(ls mysql/migrations/*.sql | wc -l))"; fi
  fi
fi
titulo "Infraestrutura do app"
[ -d backups ] && item ok "Pasta de backups" || info "Pasta de backups ainda não criada (criada pela opção Infraestrutura)"
build_atual && item ok "Build de produção atual (commit $(git rev-parse --short HEAD))" || info "Build de produção ausente ou desatualizado (necessário só para o modo produção)"
porta_ocupada "${LYRA_APP_PORT:-3000}" && info "Porta ${LYRA_APP_PORT:-3000} em uso (o app em execução ou outro programa)" || ok "Porta ${LYRA_APP_PORT:-3000} livre para o app"
git rev-parse --is-inside-work-tree >/dev/null 2>&1 && info "Git: $(git branch --show-current) @ $(git rev-parse --short HEAD)"
printf '\n%s%s%d prontos · %d pendentes%s\n' "$B" "$TL" "$prontos" "$pendentes" "$R"
[ "$pendentes" -eq 0 ] && concluido "Ambiente completo." || info "Siga as opções indicadas em “Resolve”, na ordem: requisitos → banco → infraestrutura → migrations."
'''

S_REQUISITOS = r'''
titulo "1/4 Pacotes do sistema (inclui dependências de compilação)"
faltando=()
for p in "${PACOTES_BASE[@]}"; do if pacote_instalado "$p"; then ja "$p"; else faltando+=("$p"); fi; done
if [ "${#faltando[@]}" -gt 0 ]; then
  info "Faltando: ${faltando[*]}"
  pedir_sudo
  cmd $SUDO apt-get update || morrer "apt-get update falhou."
  cmd $SUDO apt-get install -y --no-install-recommends "${faltando[@]}" || morrer "Instalação dos pacotes falhou."
  for p in "${faltando[@]}"; do pacote_instalado "$p" && ok "$p instalado" || morrer "$p não ficou instalado."; done
fi

titulo "2/4 Node.js $NODE_ALVO (versão do .nvmrc)"
carregar_node
if node_compativel; then
  ja "Node.js $(node --version) em $(command -v node)"
else
  if [ -s "$NVM_DIR/nvm.sh" ]; then ja "nvm em $NVM_DIR"; else
    passo "Instalando o nvm $VERSAO_NVM (gerenciador de versões do Node, sem sudo)"
    cmd bash -c "curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/$VERSAO_NVM/install.sh | bash" || morrer "Instalação do nvm falhou."
  fi
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh" --no-use
  cmd nvm install "$NODE_ALVO" || morrer "nvm install $NODE_ALVO falhou."
  cmd nvm alias default "$NODE_ALVO" >/dev/null
  nvm use --silent "$NODE_ALVO" >/dev/null; hash -r
  node_compativel || morrer "O Node instalado não atende ao package.json."
  ok "Node.js $(node --version) instalado."
fi

titulo "3/4 pnpm $PNPM_FIXO (Corepack, versão fixada no package.json)"
if pnpm_ok; then ja "pnpm $PNPM_FIXO"; else
  command -v corepack >/dev/null 2>&1 || morrer "Corepack ausente (acompanha o Node.js 24)."
  cmd corepack pnpm --version || morrer "O Corepack não conseguiu baixar o pnpm $PNPM_FIXO."
  pnpm_ok || morrer "pnpm diferente do fixado ($PNPM_FIXO)."
  ok "pnpm $PNPM_FIXO pronto."
fi

titulo "4/4 Dependências do projeto (node_modules conforme o lockfile)"
if deps_sincronizadas; then ja "node_modules corresponde ao pnpm-lock.yaml"; else
  cmd pn install --frozen-lockfile || morrer "pnpm install falhou."
  deps_sincronizadas || morrer "node_modules não corresponde ao pnpm-lock.yaml após a instalação."
  ok "Dependências instaladas."
fi
concluido "Requisitos prontos. Próximo passo: “Instalar banco de dados”."
'''

S_BANCO = r'''
titulo "1/3 Docker (motor dos containers)"
if docker_acessivel; then
  ja "Docker $(dk version --format '{{.Server.Version}}') · Compose $(dk compose version --short)"
elif command -v docker >/dev/null 2>&1 && docker_desktop; then
  morrer "O Docker Desktop está instalado no Windows, mas parado. Abra o Docker Desktop (Settings › Resources › WSL integration ativo para esta distro) e rode esta opção de novo."
elif command -v docker >/dev/null 2>&1; then
  aviso "Docker Engine instalado, mas o serviço está parado."
  pedir_sudo
  iniciar_daemon_docker || morrer "O serviço do Docker não respondeu. Se acabou de entrar no grupo docker, rode no PowerShell: wsl --shutdown e abra o Ubuntu de novo."
  ok "Serviço do Docker iniciado."
else
  passo "Instalando o Docker Engine pelo repositório oficial (download.docker.com)"
  pedir_sudo
  cmd $SUDO install -m 0755 -d /etc/apt/keyrings || morrer "Falha ao criar /etc/apt/keyrings."
  cmd $SUDO curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc || morrer "Falha ao baixar a chave do repositório do Docker."
  cmd $SUDO chmod a+r /etc/apt/keyrings/docker.asc
  codinome="$(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")"
  linha="deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $codinome stable"
  printf '%s\n' "$linha" | $SUDO tee /etc/apt/sources.list.d/docker.list >/dev/null || morrer "Falha ao registrar o repositório do Docker."
  cmd $SUDO apt-get update || morrer "apt-get update falhou."
  cmd $SUDO apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin || morrer "Instalação do Docker falhou."
  if ! id -nG "$(id -un)" | tr ' ' '\n' | grep -qx docker && [ "$(id -u)" -ne 0 ]; then
    cmd $SUDO usermod -aG docker "$(id -un)" || morrer "Falha ao incluir o usuário no grupo docker."
    info "Usuário incluído no grupo docker (sem precisar de sudo nos comandos docker)."
  fi
  iniciar_daemon_docker || morrer "O Docker foi instalado, mas o serviço não respondeu. Rode no PowerShell: wsl --shutdown, abra o Ubuntu e repita."
  ok "Docker $(dk version --format '{{.Server.Version}}') instalado e ativo."
fi
versao_compose="$(dk compose version --short 2>/dev/null)"
versao_maior_igual "${versao_compose:-0}" "2.20.0" || morrer "Docker Compose ${versao_compose:-ausente}: é preciso o 2.20 ou superior."

titulo "2/3 Configuração (.env.local: fonte única, segredos gerados)"
if env_completo; then ja ".env.local completo"; else
  cmd webnova --interno env || morrer "Falha ao preparar o .env.local."
  env_completo || morrer ".env.local continua incompleto."
  ok ".env.local pronto (permissão 600, segredos novos, nada impresso)."
fi

titulo "3/3 MySQL (Docker Compose, volume persistente)"
if ! mysql_saudavel; then
  porta="$(ler_env MYSQL_HOST_PORT)"; porta="${porta:-3307}"
  if [ -z "$(estado_mysql)" ] || [ "$(estado_mysql | cut -d/ -f1)" != "running" ]; then
    if porta_ocupada "$porta"; then
      nova=$porta; while porta_ocupada "$nova"; do nova=$((nova+1)); done
      aviso "Porta $porta ocupada por outro programa (não será tocado); usando $nova."
      definir_env MYSQL_HOST_PORT "$nova"; definir_env MYSQL_PORT "$nova"
    fi
  fi
  [ "$(ler_env MYSQL_PORT)" = "$(ler_env MYSQL_HOST_PORT)" ] || definir_env MYSQL_PORT "$(ler_env MYSQL_HOST_PORT)"
fi
subir_mysql
ok "MySQL saudável na porta $(ler_env MYSQL_HOST_PORT)."
concluido "Banco pronto. Próximos passos: “Infraestrutura do app” e “Migrations”."
'''

S_INFRA = r'''
titulo "1/4 Configuração"
env_completo || morrer ".env.local ausente ou incompleto. Rode “Instalar banco de dados” antes."
modo="$(stat -c '%a' .env.local)"
if [ "$modo" = "600" ]; then ja ".env.local com permissão 600"; else cmd chmod 600 .env.local; ok "Permissão do .env.local ajustada para 600."; fi

titulo "2/4 Pasta de backups"
if [ -d backups ] && [ "$(stat -c '%a' backups)" = "700" ]; then ja "backups/ (permissão 700)"; else
  cmd mkdir -p backups/banco backups/app backups/completo && cmd chmod 700 backups
  ok "backups/ pronta (fora do Git, só o seu usuário lê)."
fi

titulo "3/4 Porta da aplicação"
p="${LYRA_APP_PORT:-3000}"
if porta_ocupada "$p"; then info "Porta $p em uso: ao iniciar, o orquestrador escolhe a próxima livre."; else ok "Porta $p livre."; fi

titulo "4/4 Build de produção (next build)"
carregar_node
deps_sincronizadas || morrer "Dependências desatualizadas. Rode “Instalar requisitos” antes."
if build_atual; then ja "Build de produção do commit $(git rev-parse --short HEAD)"; else
  fazer_build || morrer "O build de produção falhou (detalhes acima)."
  ok "Build de produção pronto."
fi
concluido "Infraestrutura pronta."
'''

S_MIGRATIONS = r'''
titulo "Migrations do MySQL e administrador inicial"
carregar_node
node_compativel || morrer "Node.js indisponível. Rode “Instalar requisitos”."
garantir_mysql
if ! migrations_pendentes; then
  ja "Nenhuma migration pendente ($(ls mysql/migrations/*.sql | wc -l) aplicadas)"
else
  webnova --interno banco-status || true
  cmd webnova --interno migrar || morrer "As migrations falharam (detalhes acima). Nada foi apagado."
  migrations_pendentes && morrer "Ainda há migrations pendentes."
  ok "Migrations aplicadas."
fi
concluido "Banco no esquema atual."
'''

S_PREPARAR_APP = r'''
titulo "Preparando a aplicação (${MODO_APP})"
carregar_node
node_compativel || morrer "Node.js indisponível. Rode “Instalar requisitos”."
pnpm_ok || morrer "pnpm indisponível. Rode “Instalar requisitos”."
deps_sincronizadas || morrer "Dependências desatualizadas. Rode “Instalar requisitos”."
ok "Node $(node --version) · pnpm $PNPM_FIXO · dependências em dia"
garantir_mysql
ok "MySQL saudável na porta $(ler_env MYSQL_HOST_PORT)"
if migrations_pendentes; then
  passo "Aplicando migrations pendentes antes de iniciar"
  cmd webnova --interno migrar || morrer "As migrations falharam."
fi
ok "Migrations em dia"
if [ "$MODO_APP" = "prod" ]; then
  if build_atual; then ja "Build de produção do commit $(git rev-parse --short HEAD)"; else
    passo "Gerando o build de produção"
    fazer_build || morrer "O build de produção falhou."
  fi
fi
concluido "Tudo pronto. A aplicação vai abrir na aba “🚀 Aplicação” do terminal."
'''

S_EXECUTAR_APP = r'''
carregar_node
printf '%s%s◆ iLyra · %s · http://localhost:%s%s\n\n' "$B" "$TL" "$MODO_APP" "$PORT" "$R"
exec corepack pnpm exec next "$SUBCOMANDO" -p "$PORT"
'''

S_PARAR_BANCO = r'''
titulo "Parando o MySQL (dados preservados no volume)"
if ! docker_acessivel; then info "Docker indisponível: nada a parar."; exit 0; fi
e="$(estado_mysql)"
if [ -z "$e" ]; then info "Container do MySQL não existe."; exit 0; fi
if [ "${e%%/*}" != "running" ]; then ja "MySQL já parado"; exit 0; fi
if env_completo; then cmd compose stop mysql; else cmd dk stop "$CONTAINER"; fi || morrer "Falha ao parar o MySQL."
ok "MySQL parado."
'''

S_BACKUP_BANCO = r'''
titulo "Backup full do banco de dados"
garantir_mysql
mkdir -p backups/banco && chmod 700 backups
arquivo="backups/banco/lyra-banco-$(date +%Y%m%d-%H%M%S).sql.gz"
fazer_dump "$arquivo" || morrer "O backup do banco falhou."
sha256sum "$arquivo" > "$arquivo.sha256"
concluido "Backup salvo em $arquivo (+ .sha256)."
'''

S_BACKUP_APP = r'''
titulo "Backup full do app"
mkdir -p backups/app && chmod 700 backups
arquivo="backups/app/lyra-app-$(date +%Y%m%d-%H%M%S).tar.gz"
fazer_tar_app "$arquivo" || morrer "O backup do app falhou."
sha256sum "$arquivo" > "$arquivo.sha256"
info "Commit $(git rev-parse --short HEAD 2>/dev/null) · inclui o .env.local (arquivo com permissão 600)."
concluido "Backup salvo em $arquivo (+ .sha256)."
'''

S_BACKUP_COMPLETO = r'''
titulo "Backup full do app e do banco de dados"
garantir_mysql
carregar_node
mkdir -p backups/completo && chmod 700 backups
carimbo="$(date +%Y%m%d-%H%M%S)"
pasta="backups/completo/.lyra-completo-$carimbo"
mkdir -p "$pasta"; chmod 700 "$pasta"
trap 'rm -rf "$pasta"' EXIT
fazer_dump "$pasta/banco.sql.gz" || morrer "O backup do banco falhou."
fazer_tar_app "$pasta/app.tar.gz" || morrer "O backup do app falhou."
{
  echo "Backup completo iLyra"
  echo "Data: $(date -Iseconds)"
  echo "Commit: $(git rev-parse HEAD 2>/dev/null) ($(git branch --show-current 2>/dev/null))"
  echo "Node: $(node --version 2>/dev/null) · pnpm: $PNPM_FIXO"
  echo "MySQL: $(dk exec "$CONTAINER" mysqld --version 2>/dev/null)"
  echo "Banco: $(ler_env MYSQL_DATABASE)"
  echo
  (cd "$pasta" && sha256sum banco.sql.gz app.tar.gz)
} > "$pasta/MANIFESTO.txt"
arquivo="backups/completo/lyra-completo-$carimbo.tar"
cmd tar -cf "$arquivo" -C "$pasta" MANIFESTO.txt banco.sql.gz app.tar.gz || morrer "Falha ao montar o pacote."
chmod 600 "$arquivo"
[ "$(tar -tf "$arquivo" | wc -l)" -eq 3 ] || morrer "Pacote incompleto."
sha256sum "$arquivo" > "$arquivo.sha256"
ok "Pacote verificado: MANIFESTO.txt, banco.sql.gz e app.tar.gz ($(du -h "$arquivo" | cut -f1))."
concluido "Backup completo salvo em $arquivo (+ .sha256)."
'''

S_ATUALIZAR = r'''
titulo "Atualização segura da aplicação"
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || morrer "Esta pasta não é um repositório Git."
ramo="$(git branch --show-current)"
[ -n "$ramo" ] || morrer "HEAD destacado: volte para a branch main (git switch main)."
[ -z "$(git status --porcelain --untracked-files=no)" ] || { git status --short --untracked-files=no; morrer "Há alterações locais em arquivos versionados (acima). Salve-as (commit ou stash) antes de atualizar; nada foi alterado."; }
passo "Consultando o repositório remoto"
cmd git fetch --prune origin || morrer "Não foi possível consultar o origin (rede ou credencial)."
git rev-parse --verify --quiet "origin/$ramo" >/dev/null || morrer "origin/$ramo não existe."
atras="$(git rev-list --count "HEAD..origin/$ramo")"
frente="$(git rev-list --count "origin/$ramo..HEAD")"
if [ "$atras" -eq 0 ]; then concluido "Já está na versão mais recente ($(git rev-parse --short HEAD))."; exit 0; fi
[ "$frente" -eq 0 ] || morrer "Há $frente commit(s) locais que não estão no origin: a atualização exigiria mesclar históricos. Nada foi alterado."
info "$atras commit(s) novos em origin/$ramo:"
git --no-pager log --oneline --no-decorate "HEAD..origin/$ramo" | head -40 | sed 's/^/    /'
novas="$(git diff --name-only HEAD "origin/$ramo" -- mysql/migrations | wc -l)"
info "Migrations novas: $novas · lockfile alterado: $(git diff --quiet HEAD "origin/$ramo" -- pnpm-lock.yaml && echo não || echo sim)"
anterior="$(git rev-parse HEAD)"
carregar_node
node_compativel || morrer "Node.js indisponível. Rode “Instalar requisitos”."

titulo "1/5 Backup do banco antes de qualquer mudança"
backup=""
# Sem Docker não há como saber se existe banco nem como salvá-lo: a
# atualização não segue às cegas.
if [ -f .env.local ] && ! docker_acessivel; then
  morrer "Docker indisponível: não dá para fazer o backup do banco. Abra o Docker Desktop (ou rode “Instalar banco de dados”) e repita; nada foi alterado."
fi
if docker_acessivel && [ -n "$(estado_mysql)" ]; then
  garantir_mysql
  mkdir -p backups/banco && chmod 700 backups
  backup="backups/banco/antes-da-atualizacao-$(date +%Y%m%d-%H%M%S).sql.gz"
  fazer_dump "$backup" || morrer "O backup falhou; a atualização foi cancelada sem alterar nada."
  sha256sum "$backup" > "$backup.sha256"
else
  aviso "Banco ainda não instalado neste ambiente: atualização só do código."
fi

reverter(){
  falha "$1"
  passo "Revertendo o código para $(git rev-parse --short "$anterior")"
  git reset --keep "$anterior" || falha "git reset --keep falhou; verifique com git status."
  deps_sincronizadas || pn install --frozen-lockfile || true
  [ -n "$backup" ] && info "Backup do banco feito antes da atualização: $backup (use “Restaurar backup do banco” se precisar voltar o esquema)."
  morrer "Atualização revertida; o app continua na versão anterior."
}

titulo "2/5 Código (fast-forward, sem reescrever histórico)"
cmd git merge --ff-only "origin/$ramo" || morrer "O merge fast-forward falhou; nada foi alterado."
ok "Código em $(git rev-parse --short HEAD)."

titulo "3/5 Dependências"
if deps_sincronizadas; then ja "node_modules em dia"; else cmd pn install --frozen-lockfile || reverter "pnpm install falhou."; fi

titulo "4/5 Migrations (somente para frente, idempotentes)"
if [ -n "$backup" ]; then
  if migrations_pendentes; then cmd webnova --interno migrar || reverter "As migrations falharam."; ok "Migrations aplicadas."; else ja "Nenhuma migration pendente"; fi
else info "Sem banco instalado: migrations ficam para a opção “Migrations”."; fi

titulo "5/5 Build de produção"
if [ "${MODO_ANTERIOR:-}" = "prod" ] || [ -f .next/BUILD_ID ]; then
  rm -rf .next.anterior
  [ -d .next ] && mv .next .next.anterior
  if fazer_build; then
    rm -rf .next.anterior; ok "Build novo pronto."
  else
    rm -rf .next; [ -d .next.anterior ] && mv .next.anterior .next
    reverter "O build falhou (o build anterior foi restaurado)."
  fi
else info "Sem build de produção neste ambiente (modo dev)."; fi
concluido "Atualizado de $(git rev-parse --short "$anterior") para $(git rev-parse --short HEAD)."
'''

S_RESTAURAR = r'''
titulo "Restaurar backup do banco"
origem="$ARQUIVO_BACKUP"
[ -f "$origem" ] || morrer "Arquivo não encontrado: $origem"
case "$(realpath "$origem")" in "$(realpath backups)"/*) ;; *) morrer "Só são aceitos arquivos da pasta backups/." ;; esac
if [ -f "$origem.sha256" ]; then (sha256sum -c "$origem.sha256" >/dev/null) && ok "Integridade (sha256) conferida" || morrer "O sha256 não confere: arquivo alterado ou corrompido."; fi
temporario=""
if [[ "$origem" == *.tar ]]; then
  temporario="$(mktemp -d)"; trap 'rm -rf "$temporario"' EXIT
  cmd tar -xf "$origem" -C "$temporario" banco.sql.gz || morrer "O pacote não contém banco.sql.gz."
  dump="$temporario/banco.sql.gz"
else
  dump="$origem"
fi
gzip -t "$dump" || morrer "Arquivo comprimido corrompido."
zcat "$dump" | tail -n 1 | grep -q 'Dump completed' || morrer "Dump incompleto."
ok "Dump válido: $(zcat "$dump" | grep -c '^CREATE TABLE') tabelas"
garantir_mysql
carregar_node
mkdir -p backups/banco && chmod 700 backups
seguranca="backups/banco/antes-de-restaurar-$(date +%Y%m%d-%H%M%S).sql.gz"
titulo "1/3 Backup de segurança do estado atual"
fazer_dump "$seguranca" || morrer "O backup de segurança falhou; nada foi alterado."
sha256sum "$seguranca" > "$seguranca.sha256"
db="$(ler_env MYSQL_DATABASE)"; root="$(ler_env MYSQL_ROOT_PASSWORD)"
titulo "2/3 Restaurando $db"
MYSQL_PWD="$root" dk exec -e MYSQL_PWD "$CONTAINER" mysql -uroot -e "DROP DATABASE IF EXISTS \`$db\`" || morrer "Falha ao limpar o banco. Backup de segurança: $seguranca"
zcat "$dump" | MYSQL_PWD="$root" dk exec -i -e MYSQL_PWD "$CONTAINER" mysql -uroot || morrer "A restauração falhou. Restaure o backup de segurança: $seguranca"
tabelas="$(MYSQL_PWD="$root" dk exec -e MYSQL_PWD "$CONTAINER" mysql -uroot -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$db'")"
ok "$tabelas tabelas restauradas."
titulo "3/3 Esquema atual"
if migrations_pendentes; then cmd webnova --interno migrar || morrer "Migrations falharam após a restauração."; ok "Migrations novas aplicadas sobre o backup."; else ja "Esquema já atual"; fi
concluido "Banco restaurado de $origem. Backup de segurança do estado anterior: $seguranca"
'''

S_SAUDE = r'''
titulo "Verificação ponta a ponta (health, páginas e login do administrador)"
carregar_node
[ -n "${PORTA_APP:-}" ] || morrer "A aplicação não está em execução. Use “Iniciar app”."
cmd webnova --interno saude "$PORTA_APP" || morrer "A verificação encontrou falhas (acima)."
concluido "Aplicação saudável em http://localhost:$PORTA_APP."
'''

S_SEGURANCA = r'''
titulo "Segurança e cadeia de suprimentos"
carregar_node
deps_sincronizadas || morrer "Dependências desatualizadas. Rode “Instalar requisitos”."
erros=0
passo "Segredos e permissões"
if [ -f .env.local ]; then
  [ "$(stat -c '%a' .env.local)" = "600" ] && ok ".env.local com permissão 600" || { falha ".env.local legível por outros usuários (use “Infraestrutura do app”)"; erros=$((erros+1)); }
fi
git ls-files --error-unmatch .env.local >/dev/null 2>&1 && { falha ".env.local está versionado no Git!"; erros=$((erros+1)); } || ok ".env.local fora do Git"
if docker_acessivel && [ -n "$(estado_mysql)" ]; then
  publicacao="$(dk port "$CONTAINER" 3306 2>/dev/null | head -1)"
  [[ "$publicacao" == 127.0.0.1:* ]] && ok "MySQL publicado só na interface local ($publicacao)" || { falha "MySQL exposto: $publicacao"; erros=$((erros+1)); }
fi
passo "Vulnerabilidades conhecidas (pnpm audit, dependências de produção)"
if cmd pn audit --prod; then ok "Nenhuma vulnerabilidade conhecida nas dependências de produção."; else aviso "O audit apontou vulnerabilidades (acima)."; erros=$((erros+1)); fi
passo "Versões desatualizadas (informativo)"
pn outdated || true
[ "$erros" -eq 0 ] && concluido "Nenhum problema de segurança encontrado." || morrer "$erros ponto(s) de atenção (acima)."
'''

S_QUALIDADE = r'''
titulo "Quality gates (formatação, lint, tipos e testes)"
carregar_node
deps_sincronizadas || morrer "Dependências desatualizadas. Rode “Instalar requisitos”."
falhas=()
gate(){ local nome="$1"; shift; passo "$nome"; if cmd pn exec "$@"; then ok "$nome"; else falha "$nome"; falhas+=("$nome"); fi; }
gate "Formatação (prettier)" prettier --check .
gate "Lint (eslint)" eslint .
gate "Tipos (tsc)" tsc --noEmit
gate "Testes unitários (vitest)" vitest run --project unit
if docker_acessivel && mysql_saudavel; then
  gate "Testes de integração (vitest, MySQL)" vitest run --project integration
else info "Testes de integração pulados: MySQL parado."; fi
[ "${#falhas[@]}" -eq 0 ] && concluido "Todos os gates passaram." || morrer "Falharam: ${falhas[*]}"
'''

S_LIMPEZA = r'''
titulo "Limpeza segura (somente artefatos que se recriam sozinhos)"
carregar_node
antes="$(df -B1 --output=avail . | tail -1)"
if [ -d .next/cache ]; then cmd rm -rf .next/cache; ok "Cache do Next.js removido (o build continua válido)."; else ja "Sem cache do Next.js"; fi
if pnpm_ok; then cmd pn store prune || aviso "pnpm store prune falhou."; fi
if docker_acessivel; then
  cmd dk image prune -f || aviso "docker image prune falhou."
  cmd dk builder prune -f || aviso "docker builder prune falhou."
  info "Volumes (dados do MySQL) e imagens em uso não são tocados."
fi
depois="$(df -B1 --output=avail . | tail -1)"
liberado=$(( (depois - antes) / 1048576 ))
[ "$liberado" -lt 0 ] && liberado=0
concluido "Limpeza concluída: ~${liberado} MB liberados."
'''

S_SHELL = r'''
carregar_node
printf '%s%s◆ Terminal interativo do projeto%s %s(Node %s · digite exit para fechar)%s\n' "$B" "$TL" "$R" "$D" "$(node --version 2>/dev/null || echo ausente)" "$R"
exec bash -i
'''

# ════════════════════════════════════════════════════════════════════════════
# Catálogo de ações (interface web, CLI e streaming usam esta lista)
# ════════════════════════════════════════════════════════════════════════════

ACTIONS: List[Dict[str, object]] = [
    {"id": "verificar", "icone": "🔎", "grupo": "Instalação", "risco": "Seguro", "titulo": "Check-up do ambiente", "descricao": "Verifica tudo o que já está instalado e configurado, sem instalar nada.", "script": S_VERIFICAR},
    {"id": "requisitos", "icone": "🧰", "grupo": "Instalação", "risco": "Instala", "titulo": "Instalar requisitos", "descricao": "Pacotes do sistema e de compilação, Node do .nvmrc, pnpm fixado e dependências. Pula o que já existe.", "script": S_REQUISITOS},
    {"id": "banco", "icone": "🐬", "grupo": "Instalação", "risco": "Instala", "titulo": "Instalar banco de dados", "descricao": "Docker (se faltar), .env.local com segredos novos e MySQL saudável. Pula o que já existe.", "script": S_BANCO},
    {"id": "infra", "icone": "🏗️", "grupo": "Instalação", "risco": "Instala", "titulo": "Infraestrutura do app", "descricao": "Permissões, pasta de backups, porta e build de produção. Pula o que já existe.", "script": S_INFRA},
    {"id": "migrations", "icone": "🧬", "grupo": "Banco de dados", "risco": "Altera o banco", "titulo": "Migrations", "descricao": "Aplica somente as migrations pendentes e assegura o administrador inicial.", "script": S_MIGRATIONS},
    {"id": "iniciar_dev", "icone": "🧪", "grupo": "Aplicação", "risco": "Seguro", "titulo": "Iniciar app · Dev", "descricao": "Banco, migrations e Next.js em desenvolvimento, com a saída ao vivo.", "modo": "dev"},
    {"id": "iniciar_prod", "icone": "🚀", "grupo": "Aplicação", "risco": "Seguro", "titulo": "Iniciar app · Produção", "descricao": "Banco, migrations, build (se preciso) e Next.js em produção.", "modo": "prod"},
    {"id": "parar", "icone": "⏹️", "grupo": "Aplicação", "risco": "Para serviços", "titulo": "Parar app", "descricao": "Encerra a aplicação (dev ou produção) e o MySQL, preservando os dados."},
    {"id": "backup_banco", "icone": "💾", "grupo": "Backups", "risco": "Cria arquivo", "titulo": "Backup full do banco", "descricao": "mysqldump consistente, comprimido, verificado e com sha256.", "script": S_BACKUP_BANCO},
    {"id": "backup_app", "icone": "📦", "grupo": "Backups", "risco": "Cria arquivo", "titulo": "Backup full do app", "descricao": "Código, histórico Git e .env.local (sem artefatos recriáveis), verificado.", "script": S_BACKUP_APP},
    {"id": "backup_completo", "icone": "🗄️", "grupo": "Backups", "risco": "Cria arquivo", "titulo": "Backup full do app e banco", "descricao": "Pacote único com banco, app e manifesto com os sha256.", "script": S_BACKUP_COMPLETO},
    {"id": "atualizar", "icone": "⬆️", "grupo": "Manutenção", "risco": "Altera o app", "titulo": "Atualizar versão do app", "descricao": "Backup do banco, fast-forward do Git, dependências, migrations e build, com reversão automática.", "script": S_ATUALIZAR, "confirmar": "ATUALIZAR"},
    {"id": "restaurar", "icone": "♻️", "grupo": "Manutenção", "risco": "Destrutivo", "titulo": "Restaurar backup do banco", "descricao": "Volta o banco a um backup, com backup de segurança do estado atual antes.", "script": S_RESTAURAR, "confirmar": "RESTAURAR", "requer": "backup"},
    {"id": "saude", "icone": "🩺", "grupo": "Qualidade", "risco": "Seguro", "titulo": "Verificação ponta a ponta", "descricao": "Health, páginas e login real do administrador no app em execução.", "script": S_SAUDE},
    {"id": "seguranca", "icone": "🛡️", "grupo": "Qualidade", "risco": "Seguro", "titulo": "Segurança e supply chain", "descricao": "Audit de vulnerabilidades, segredos fora do Git, banco só local e pacotes desatualizados.", "script": S_SEGURANCA},
    {"id": "qualidade", "icone": "✅", "grupo": "Qualidade", "risco": "Seguro", "titulo": "Quality gates", "descricao": "Formatação, lint, tipos, testes unitários e de integração.", "script": S_QUALIDADE},
    {"id": "limpeza", "icone": "🧹", "grupo": "Manutenção", "risco": "Remove caches", "titulo": "Limpeza segura", "descricao": "Cache do Next, store do pnpm e camadas Docker sem uso. Nunca toca nos dados.", "script": S_LIMPEZA, "confirmar": "LIMPAR"},
    {"id": "shell", "icone": "⌨️", "grupo": "Ferramentas", "risco": "Interativo", "titulo": "Terminal do projeto", "descricao": "Bash interativo na pasta do app, com o Node do .nvmrc carregado.", "script": S_SHELL},
]
ACTION_MAP = {str(a["id"]): a for a in ACTIONS}
GRUPOS = ["Instalação", "Banco de dados", "Aplicação", "Backups", "Manutenção", "Qualidade", "Ferramentas"]

# ════════════════════════════════════════════════════════════════════════════
# Execuções (jobs): PTY real, buffer em memória, sem arquivo de log
# ════════════════════════════════════════════════════════════════════════════


class Buffer:
    LIMITE = 4 * 1024 * 1024

    def __init__(self) -> None:
        self.dados = bytearray()
        self.base = 0
        self.cond = threading.Condition()

    @property
    def total(self) -> int:
        return self.base + len(self.dados)

    def anexar(self, pedaco: bytes) -> None:
        with self.cond:
            self.dados += pedaco
            excesso = len(self.dados) - self.LIMITE
            if excesso > 0:
                del self.dados[:excesso]
                self.base += excesso
            self.cond.notify_all()

    def ler(self, desde: int) -> tuple[int, bytes]:
        inicio = max(desde, self.base)
        return inicio, bytes(self.dados[inicio - self.base:])


class Job:
    def __init__(self, titulo: str, tipo: str, acao: str, icone: str) -> None:
        self.id = secrets.token_hex(6)
        self.titulo = titulo
        self.tipo = tipo  # tarefa | app | shell
        self.acao = acao
        self.icone = icone
        self.status = "rodando"
        self.codigo: Optional[int] = None
        self.inicio = time.time()
        self.fim: Optional[float] = None
        self.buffer = Buffer()
        self.pid: Optional[int] = None
        self.fd: Optional[int] = None
        self.ao_terminar: Optional[Callable[["Job"], None]] = None
        self.extra: Dict[str, object] = {}

    def escrever(self, texto: str) -> None:
        self.buffer.anexar(texto.replace("\r\n", "\n").replace("\n", "\r\n").encode("utf-8"))

    def finalizar(self, codigo: int, status: Optional[str] = None) -> None:
        if self.fim is not None:
            return
        self.codigo = codigo
        if status:
            self.status = status
        elif self.status != "cancelado":
            self.status = "ok" if codigo == 0 else "erro"
        self.fim = time.time()
        if self.fd is not None:
            try:
                os.close(self.fd)
            except OSError:
                pass
            self.fd = None
        with self.buffer.cond:
            self.buffer.cond.notify_all()
        if self.ao_terminar:
            try:
                self.ao_terminar(self)
            except Exception as exc:  # o callback nunca derruba o servidor
                self.escrever(f"\nFalha ao concluir: {exc}\n")

    def resumo(self) -> Dict[str, object]:
        return {
            "id": self.id, "titulo": self.titulo, "tipo": self.tipo, "acao": self.acao, "icone": self.icone,
            "status": self.status, "codigo": self.codigo, "inicio": self.inicio, "fim": self.fim,
            "segundos": round((self.fim or time.time()) - self.inicio, 1), "bytes": self.buffer.total,
            "extra": self.extra,
        }

    # ── PTY ──
    def iniciar_pty(self, argv: List[str], env: Dict[str, str], cols: int = 120, rows: int = 32) -> None:
        pid, fd = pty.fork()
        if pid == 0:  # processo filho: sessão própria com terminal de controle
            try:
                os.chdir(str(RAIZ))
                os.execvpe(argv[0], argv, env)
            except Exception as exc:
                os.write(2, f"Falha ao iniciar {argv[0]}: {exc}\n".encode())
            os._exit(127)
        self.pid, self.fd = pid, fd
        self.redimensionar(cols, rows)
        threading.Thread(target=self._ler_pty, daemon=True).start()

    def _ler_pty(self) -> None:
        assert self.fd is not None
        fd = self.fd
        while True:
            try:
                dados = os.read(fd, 65536)
            except OSError:
                break
            if not dados:
                break
            self.buffer.anexar(dados)
        try:
            _, estado = os.waitpid(self.pid or 0, 0)
            codigo = os.waitstatus_to_exitcode(estado)
        except ChildProcessError:
            codigo = 0
        if codigo < 0:
            codigo = 128 - codigo
        self.finalizar(codigo)

    def entrada(self, texto: str) -> None:
        if self.fd is None:
            raise RuntimeError("Esta execução já terminou.")
        os.write(self.fd, texto.encode("utf-8"))

    def redimensionar(self, cols: int, rows: int) -> None:
        if self.fd is None:
            return
        cols = max(20, min(int(cols), 500))
        rows = max(5, min(int(rows), 200))
        fcntl.ioctl(self.fd, termios.TIOCSWINSZ, struct.pack("HHHH", rows, cols, 0, 0))

    def sinal(self, sig: int) -> None:
        if self.pid:
            try:
                os.killpg(self.pid, sig)
            except ProcessLookupError:
                pass

    def cancelar(self) -> None:
        if self.fim is not None:
            return
        self.status = "cancelado"
        self.escrever("\n⏹ Cancelamento pedido (Ctrl+C)…\n")
        self.sinal(signal.SIGINT)

        def escalar() -> None:
            for sig, espera in ((signal.SIGTERM, 6), (signal.SIGKILL, 6)):
                time.sleep(espera)
                if self.fim is not None:
                    return
                self.sinal(sig)
        threading.Thread(target=escalar, daemon=True).start()

    def parar_e_esperar(self, limite: float = 25) -> bool:
        """SIGTERM no grupo, espera e SIGKILL se preciso (usado no app)."""
        if self.fim is not None:
            return True
        self.status = "cancelado"
        self.sinal(signal.SIGTERM)
        fim = time.time() + limite
        while time.time() < fim and self.fim is None:
            time.sleep(0.3)
        if self.fim is None:
            self.sinal(signal.SIGKILL)
            fim = time.time() + 5
            while time.time() < fim and self.fim is None:
                time.sleep(0.2)
        return self.fim is not None


JOBS: "Dict[str, Job]" = {}
JOBS_LOCK = threading.Lock()


def registrar_job(job: Job) -> Job:
    with JOBS_LOCK:
        JOBS[job.id] = job
        terminados = [j for j in JOBS.values() if j.fim is not None]
        while len(JOBS) > 30 and terminados:
            antigo = terminados.pop(0)
            JOBS.pop(antigo.id, None)
    return job


def job_ativo(tipo: str) -> Optional[Job]:
    with JOBS_LOCK:
        for job in JOBS.values():
            if job.tipo == tipo and job.fim is None:
                return job
    return None


def argv_bash(script: str) -> List[str]:
    return ["bash", "--noprofile", "--norc", "-c", LIB + "\n" + script, "tui-webnova"]


class Recusado(Exception):
    pass


def iniciar_job_bash(acao: Dict[str, object], extra_env: Optional[Dict[str, str]] = None,
                     cols: int = 120, rows: int = 32, tipo: str = "tarefa") -> Job:
    job = registrar_job(Job(str(acao["titulo"]), tipo, str(acao["id"]), str(acao["icone"])))
    job.iniciar_pty(argv_bash(str(acao["script"])), ambiente(extra_env), cols, rows)
    return job


def iniciar_app(modo: str, cols: int, rows: int) -> Job:
    """Prepara (PTY de tarefa) e, se tudo der certo, sobe o Next.js como serviço."""
    if job_ativo("app"):
        raise Recusado("A aplicação já está em execução. Use “Parar app” antes de iniciar de novo.")
    acao = ACTION_MAP["iniciar_prod" if modo == "prod" else "iniciar_dev"]
    preparo = registrar_job(Job(str(acao["titulo"]), "tarefa", str(acao["id"]), str(acao["icone"])))

    def subir(job: Job) -> None:
        if job.codigo != 0:
            return
        porta = porta_livre(PORTA_APP_PADRAO)
        env_local = ler_env_local()
        extra = {"MODO_APP": modo, "SUBCOMANDO": "start" if modo == "prod" else "dev", "PORT": str(porta)}
        for chave in ("APP_BASE_URL", "NEXT_PUBLIC_APP_URL"):
            if env_local.get(chave):
                extra[chave] = url_local(env_local[chave], porta)
        app = registrar_job(Job(f"Aplicação · {'Produção' if modo == 'prod' else 'Dev'}", "app", "app", "🌐"))
        app.extra = {"modo": modo, "porta": porta, "url": f"http://localhost:{porta}", "saudavel": False}
        app.iniciar_pty(argv_bash(S_EXECUTAR_APP), ambiente(extra), cols, rows)
        job.escrever(f"\n🌐 Aplicação iniciando em http://localhost:{porta} (aba “Aplicação”).\n")

        def vigiar() -> None:
            limite = time.time() + TEMPO_MAX_APP
            while time.time() < limite and app.fim is None:
                if http_status(f"http://127.0.0.1:{porta}/api/health", timeout=10) == 200:
                    app.extra["saudavel"] = True
                    app.escrever(f"\r\n\x1b[1;38;5;79m✔ TUI-WEBNOVA: /api/health respondeu 200 · app no ar em http://localhost:{porta}\x1b[0m\r\n")
                    return
                time.sleep(2)
            if app.fim is None:
                app.escrever(f"\r\n\x1b[38;5;221m⚠ TUI-WEBNOVA: /api/health não respondeu 200 em {TEMPO_MAX_APP}s (veja a saída acima).\x1b[0m\r\n")
        threading.Thread(target=vigiar, daemon=True).start()

    preparo.ao_terminar = subir
    preparo.iniciar_pty(argv_bash(S_PREPARAR_APP), ambiente({"MODO_APP": modo}), cols, rows)
    return preparo


def executar_script_no_job(job: Job, script: str, extra_env: Optional[Dict[str, str]] = None) -> int:
    """Roda um script Bash sem PTY (não interativo) e envia a saída ao job."""
    proc = subprocess.Popen(
        argv_bash(script), cwd=RAIZ, env=ambiente(extra_env), stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL,
    )
    assert proc.stdout is not None
    for linha in iter(proc.stdout.readline, b""):
        job.buffer.anexar(linha.replace(b"\n", b"\r\n"))
    return proc.wait()


def iniciar_parar() -> Job:
    acao = ACTION_MAP["parar"]
    job = registrar_job(Job(str(acao["titulo"]), "tarefa", "parar", str(acao["icone"])))

    def trabalho() -> None:
        try:
            job.escrever("\n\x1b[1;38;5;44m◆ Parando a aplicação\x1b[0m\n")
            app = job_ativo("app")
            if app:
                job.escrever(f"  • SIGTERM para a aplicação ({app.extra.get('modo')}, PID {app.pid})\n")
                if app.parar_e_esperar():
                    job.escrever("  ✔ Aplicação encerrada; porta liberada.\n")
                else:
                    job.escrever("  ✖ A aplicação não encerrou.\n")
            else:
                job.escrever("  ↷ Nenhuma aplicação em execução.\n")
            codigo = executar_script_no_job(job, S_PARAR_BANCO)
            job.finalizar(codigo)
        except Exception as exc:
            job.escrever(f"\n✖ Falha: {exc}\n")
            job.finalizar(1)

    threading.Thread(target=trabalho, daemon=True).start()
    return job


def iniciar_com_app_parado(acao: Dict[str, object], extra_env: Dict[str, str], cols: int, rows: int,
                           religar: bool) -> Job:
    """Para o app (se rodando), executa a ação e religa o app no mesmo modo."""
    app = job_ativo("app")
    modo = str(app.extra.get("modo")) if app else ""
    if app:
        app.parar_e_esperar()
    job = iniciar_job_bash(acao, {**extra_env, "MODO_ANTERIOR": modo}, cols, rows)
    if modo:
        job.escrever(f"\r\n• A aplicação ({modo}) foi parada para esta operação.\r\n")
        if religar:
            def religar_app(j: Job) -> None:
                if j.codigo == 0:
                    iniciar_app(modo, cols, rows)
            job.ao_terminar = religar_app
    return job


def iniciar_acao(acao_id: str, params: Dict[str, object]) -> Job:
    acao = ACTION_MAP.get(acao_id)
    if not acao:
        raise Recusado(f"Ação inexistente: {acao_id}")
    cols = int(params.get("cols") or 120)
    rows = int(params.get("rows") or 32)
    palavra = acao.get("confirmar")
    if palavra and str(params.get("confirmacao", "")).strip().upper() != palavra:
        raise Recusado(f"Confirmação necessária: digite {palavra}.")
    if acao_id == "shell":
        abertos = [j for j in JOBS.values() if j.tipo == "shell" and j.fim is None]
        if len(abertos) >= 3:
            raise Recusado("Já há 3 terminais abertos. Feche um (exit) antes.")
        return iniciar_job_bash(acao, None, cols, rows, tipo="shell")
    if job_ativo("tarefa"):
        raise Recusado("Já há uma tarefa em andamento. Aguarde ou cancele antes de iniciar outra.")
    if acao_id in ("iniciar_dev", "iniciar_prod"):
        return iniciar_app(str(acao["modo"]), cols, rows)
    if acao_id == "parar":
        return iniciar_parar()
    if acao_id == "saude":
        app = job_ativo("app")
        porta = str(app.extra.get("porta")) if app else ""
        return iniciar_job_bash(acao, {"PORTA_APP": porta}, cols, rows)
    if acao_id == "restaurar":
        arquivo = str(params.get("arquivo") or "")
        caminho = (RAIZ / arquivo).resolve()
        if BACKUPS.resolve() not in caminho.parents or not caminho.is_file():
            raise Recusado("Escolha um arquivo de backup válido da pasta backups/.")
        return iniciar_com_app_parado(acao, {"ARQUIVO_BACKUP": str(caminho)}, cols, rows, religar=True)
    if acao_id == "atualizar":
        return iniciar_com_app_parado(acao, {}, cols, rows, religar=True)
    return iniciar_job_bash(acao, None, cols, rows)


# ════════════════════════════════════════════════════════════════════════════
# Estado para o painel (consultas rápidas, em cache curto)
# ════════════════════════════════════════════════════════════════════════════

_CACHE: Dict[str, tuple[float, object]] = {}
_CACHE_LOCK = threading.Lock()


def em_cache(chave: str, validade: float, funcao: Callable[[], object]) -> object:
    with _CACHE_LOCK:
        item = _CACHE.get(chave)
        if item and time.time() - item[0] < validade:
            return item[1]
    valor = funcao()
    with _CACHE_LOCK:
        _CACHE[chave] = (time.time(), valor)
    return valor


def docker_prefixo() -> Optional[List[str]]:
    if not shutil.which("docker"):
        return None
    if consultar(["docker", "info", "--format", "{{.ServerVersion}}"], 15)[0] == 0:
        return ["docker"]
    if shutil.which("sg") and consultar(["sg", "docker", "-c", "docker info"], 15)[0] == 0:
        return ["sg", "docker", "-c"]
    return None


def docker_executar(prefixo: List[str], args: List[str], timeout: float = 20) -> tuple[int, str]:
    if prefixo[0] == "sg":
        return consultar(prefixo + [" ".join(shlex_quote(a) for a in ["docker", *args])], timeout)
    return consultar(prefixo + args, timeout)


def shlex_quote(texto: str) -> str:
    import shlex
    return shlex.quote(texto)


def status_node() -> Dict[str, object]:
    codigo, versao = consultar(["node", "--version"], 10)
    alvo = node_alvo()
    pnpm_fixo = ""
    try:
        gerenciador = json.loads(PACKAGE_JSON.read_text(encoding="utf-8")).get("packageManager", "")
        combinacao = re.match(r"pnpm@(\d+\.\d+\.\d+)", gerenciador)
        pnpm_fixo = combinacao.group(1) if combinacao else ""
    except (OSError, json.JSONDecodeError):
        pass
    codigo_p, pnpm_versao = consultar(["corepack", "pnpm", "--version"], 60)
    pnpm_versao = pnpm_versao.splitlines()[-1] if pnpm_versao else ""
    return {
        "node": versao if codigo == 0 else "", "node_alvo": alvo,
        "node_ok": codigo == 0 and versao.lstrip("v").split(".")[0] == alvo.split(".")[0],
        "pnpm": pnpm_versao if codigo_p == 0 else "", "pnpm_fixo": pnpm_fixo,
        "pnpm_ok": codigo_p == 0 and pnpm_versao == pnpm_fixo,
    }


def status_banco() -> Dict[str, object]:
    resultado: Dict[str, object] = {"docker": "", "estado": "", "porta": "", "migrations": None,
                                    "migrations_total": len(list(MIGRATIONS_DIR.glob("*.sql"))), "mysql": ""}
    prefixo = docker_prefixo()
    if not prefixo:
        resultado["docker"] = "indisponível"
        return resultado
    _, versao = docker_executar(prefixo, ["version", "--format", "{{.Server.Version}}"])
    resultado["docker"] = versao.splitlines()[-1] if versao else "ativo"
    codigo, estado = docker_executar(
        prefixo, ["inspect", "--format", "{{.State.Status}}{{if .State.Health}}/{{.State.Health.Status}}{{end}}", CONTAINER_DB])
    resultado["estado"] = estado if codigo == 0 else ""
    env = ler_env_local()
    resultado["porta"] = env.get("MYSQL_HOST_PORT", "")
    if resultado["estado"] == "running/healthy" and env.get("MYSQL_USER"):
        if prefixo[0] == "sg":
            codigo, saida = consultar(["sg", "docker", "-c", " ".join(shlex_quote(a) for a in [
                "docker", "exec", "-e", f"MYSQL_PWD={env.get('MYSQL_PASSWORD', '')}", CONTAINER_DB, "mysql",
                f"-u{env['MYSQL_USER']}", f"-D{env.get('MYSQL_DATABASE', '')}", "-N", "-e",
                "SELECT VERSION(); SELECT COUNT(*) FROM _lyra_schema_migrations"])], 20)
        else:
            try:
                proc = subprocess.run(
                    ["docker", "exec", "-e", "MYSQL_PWD", CONTAINER_DB, "mysql", f"-u{env['MYSQL_USER']}",
                     f"-D{env.get('MYSQL_DATABASE', '')}", "-N", "-e",
                     "SELECT VERSION(); SELECT COUNT(*) FROM _lyra_schema_migrations"],
                    env={**ambiente(), "MYSQL_PWD": env.get("MYSQL_PASSWORD", "")}, capture_output=True, text=True, timeout=20)
                codigo, saida = proc.returncode, proc.stdout
            except subprocess.TimeoutExpired:
                codigo, saida = 124, ""
        linhas = [linha for linha in saida.splitlines() if linha and not linha.startswith("mysql:")]
        if codigo == 0 and linhas:
            resultado["mysql"] = linhas[0]
            if len(linhas) > 1 and linhas[1].isdigit():
                resultado["migrations"] = int(linhas[1])
    return resultado


def status_git() -> Dict[str, object]:
    def git(*args: str) -> str:
        # --no-optional-locks: a consulta periódica não regrava o índice do
        # Git (antes ela alterava .git durante o backup do app).
        codigo, saida = consultar(["git", "--no-optional-locks", *args], 10)
        return saida if codigo == 0 else ""
    ramo = git("branch", "--show-current")
    atras = git("rev-list", "--count", f"HEAD..origin/{ramo}") if ramo else ""
    return {
        "ramo": ramo, "commit": git("rev-parse", "--short", "HEAD"),
        "mensagem": git("log", "-1", "--format=%s"),
        "alterados": len([l for l in git("status", "--porcelain", "--untracked-files=no").splitlines() if l]),
        "atras": int(atras) if atras.isdigit() else None,
    }


def listar_backups() -> List[Dict[str, object]]:
    itens: List[Dict[str, object]] = []
    if not BACKUPS.is_dir():
        return itens
    for pasta in ("banco", "completo", "app"):
        alvo = BACKUPS / pasta
        if not alvo.is_dir():
            continue
        for arquivo in alvo.iterdir():
            if arquivo.is_file() and arquivo.suffix in (".gz", ".tar") and not arquivo.name.startswith("."):
                info = arquivo.stat()
                itens.append({
                    "caminho": str(arquivo.relative_to(RAIZ)), "nome": arquivo.name, "tipo": pasta,
                    "tamanho": bytes_humanos(info.st_size), "quando": info.st_mtime,
                    "restauravel": pasta in ("banco", "completo"),
                })
    return sorted(itens, key=lambda i: float(i["quando"]), reverse=True)


def status_app() -> Dict[str, object]:
    app = job_ativo("app")
    if app:
        porta = int(app.extra.get("porta") or 0)
        saude = http_status(f"http://127.0.0.1:{porta}/api/health", 3) if porta else 0
        return {"estado": "no ar" if saude == 200 else "iniciando", "modo": app.extra.get("modo"), "porta": porta,
                "url": app.extra.get("url"), "origem": "TUI-WEBNOVA", "saude": saude, "job": app.id}
    return {"estado": "parado", "modo": None, "porta": None, "url": "", "origem": "", "saude": 0, "job": None}


def status_payload() -> Dict[str, object]:
    uso = shutil.disk_usage(RAIZ)
    env_ok = ENV_LOCAL.exists()
    deps_ok = LOCK_INSTALADO.exists() and LOCKFILE.exists() and LOCK_INSTALADO.read_bytes() == LOCKFILE.read_bytes()
    build = (RAIZ / ".next" / "BUILD_ID").exists()
    wsl = "microsoft" in Path("/proc/version").read_text(encoding="utf-8", errors="replace").lower()
    return {
        "app_nome": APP_NOME, "versao": APP_VERSAO, "agora": agora_iso(), "raiz": str(RAIZ),
        "uptime": round(time.time() - INICIO), "plataforma": "WSL2" if wsl else "Linux",
        "sistema": platform.freedesktop_os_release().get("PRETTY_NAME", platform.platform()) if hasattr(platform, "freedesktop_os_release") else platform.platform(),
        "disco_livre": bytes_humanos(uso.free), "disco_pct": round(uso.used / uso.total * 100, 1) if uso.total else 0,
        "env_ok": env_ok, "deps_ok": deps_ok, "build": build,
        "node": em_cache("node", 60, status_node), "banco": em_cache("banco", 4, status_banco),
        "git": em_cache("git", 15, status_git), "app": status_app(), "backups": len(listar_backups()),
        "tarefa": (job_ativo("tarefa").resumo() if job_ativo("tarefa") else None),
    }


# ════════════════════════════════════════════════════════════════════════════
# Interface web (HTML/CSS/JS embutidos)
# ════════════════════════════════════════════════════════════════════════════

HTML = r'''<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="dark light" />
<title>TUI-WEBNOVA · iLyra</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%8C%8C%3C/text%3E%3C/svg%3E" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@xterm/xterm@6.0.0/css/xterm.css" />
<style>
:root{
  --bg:#071312; --bg2:#0b1d1c; --painel:rgba(14,33,32,.72); --painel2:rgba(20,44,43,.62); --linha:rgba(142,233,222,.14);
  --texto:#e8f6f4; --fraco:#93b3af; --teal:#2dd4bf; --teal2:#14b8a6; --coral:#fb8a5f; --ouro:#f7c46c; --ok:#5eead4; --aviso:#fbbf24; --erro:#fb7185;
  --sombra:0 30px 80px -30px rgba(0,0,0,.55); --raio:22px; --raio2:16px; --term:#06100f;
  --fonte:"Inter",system-ui,sans-serif; --titulo:"Space Grotesk","Inter",sans-serif; --mono:"JetBrains Mono",ui-monospace,monospace;
}
body.claro{ --bg:#eef5f4; --bg2:#e2eeec; --painel:rgba(255,255,255,.8); --painel2:rgba(255,255,255,.66); --linha:rgba(15,60,58,.13); --texto:#0e2523; --fraco:#4f6b68; --teal:#0f8f86; --teal2:#0d766f; --coral:#c2562e; --ouro:#a86d0c; --ok:#0f766e; --aviso:#b45309; --erro:#be123c; --sombra:0 24px 60px -30px rgba(15,60,58,.35); }
*{box-sizing:border-box} html,body{height:100%}
body{margin:0;font-family:var(--fonte);color:var(--texto);background:
  radial-gradient(1200px 700px at 8% -10%,rgba(45,212,191,.16),transparent 60%),
  radial-gradient(900px 600px at 105% 0%,rgba(251,138,95,.13),transparent 60%),
  linear-gradient(160deg,var(--bg),var(--bg2));overflow:hidden}
body::before{content:"";position:fixed;inset:0;pointer-events:none;opacity:.5;background-image:radial-gradient(rgba(255,255,255,.06) 1px,transparent 1px);background-size:22px 22px;mask-image:radial-gradient(circle at 40% 20%,#000,transparent 75%)}
button,input,select{font:inherit;color:inherit}
:focus-visible{outline:2px solid var(--teal);outline-offset:2px}
.app{height:100vh;display:grid;grid-template-columns:272px minmax(0,1fr) minmax(360px,44%);gap:14px;padding:14px}
.vidro{background:var(--painel);border:1px solid var(--linha);border-radius:var(--raio);box-shadow:var(--sombra);backdrop-filter:blur(20px) saturate(140%);-webkit-backdrop-filter:blur(20px) saturate(140%)}
/* Sidebar */
.lateral{display:flex;flex-direction:column;min-height:0;padding:14px}
.marca{display:flex;align-items:center;gap:12px;padding:8px 8px 14px}
.logo{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;font-size:22px;background:conic-gradient(from 200deg,var(--teal),var(--coral),var(--ouro),var(--teal));box-shadow:0 10px 30px -10px rgba(45,212,191,.6)}
.marca h1{font:600 17px/1.1 var(--titulo);margin:0;letter-spacing:-.01em}.marca p{margin:3px 0 0;font-size:12px;color:var(--fraco)}
.busca{display:flex;align-items:center;gap:8px;border:1px solid var(--linha);background:rgba(255,255,255,.04);border-radius:14px;padding:9px 11px;margin:0 2px 8px;cursor:text}
.busca input{flex:1;min-width:0;background:transparent;border:0;outline:0}.kbd{font:11px var(--mono);color:var(--fraco);border:1px solid var(--linha);border-bottom-width:2px;border-radius:6px;padding:1px 6px}
nav.menu{overflow:auto;flex:1;padding:2px}
.grupo{margin:12px 8px 6px;font:600 11px var(--fonte);letter-spacing:.12em;text-transform:uppercase;color:var(--fraco)}
.item{width:100%;display:grid;grid-template-columns:26px 1fr auto;align-items:center;gap:8px;text-align:left;background:transparent;border:1px solid transparent;border-radius:12px;padding:8px 9px;cursor:pointer;transition:background .15s,border-color .15s,transform .15s}
.item:hover{background:rgba(45,212,191,.09);border-color:rgba(45,212,191,.22);transform:translateX(2px)}
.item .t{font-size:13.5px}.item .r{font-size:10.5px;color:var(--fraco)}
.rodape{border-top:1px solid var(--linha);padding:10px 6px 2px;display:flex;gap:6px;flex-wrap:wrap}
/* Centro */
.centro{min-height:0;overflow:auto;padding:18px;display:flex;flex-direction:column;gap:16px}
.topo{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}
.sobre{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--teal);font-weight:600}
h2{font:700 clamp(24px,2.6vw,34px)/1.05 var(--titulo);letter-spacing:-.03em;margin:6px 0 4px}
.sub{color:var(--fraco);font-size:13.5px;margin:0}
.botoes{display:flex;gap:8px;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--linha);background:rgba(255,255,255,.05);border-radius:12px;padding:8px 12px;cursor:pointer;font-size:13px;transition:transform .15s,background .15s,border-color .15s}
.btn:hover{transform:translateY(-1px);background:rgba(45,212,191,.12);border-color:rgba(45,212,191,.3)}
.btn.prim{background:linear-gradient(135deg,var(--teal2),#0e7490);border-color:transparent;color:#fff;font-weight:600;box-shadow:0 10px 24px -12px rgba(20,184,166,.8)}
.btn.perigo:hover{background:rgba(251,113,133,.14);border-color:rgba(251,113,133,.4)}
.btn[disabled]{opacity:.5;pointer-events:none}
/* Bento de estado */
.bento{display:grid;grid-template-columns:repeat(auto-fit,minmax(168px,1fr));gap:10px}
.cel{position:relative;overflow:hidden;background:var(--painel2);border:1px solid var(--linha);border-radius:var(--raio2);padding:13px 14px;min-height:96px}
.cel::after{content:"";position:absolute;right:-50px;top:-60px;width:140px;height:140px;border-radius:50%;background:radial-gradient(circle,var(--brilho,rgba(45,212,191,.16)),transparent 70%)}
.cel .rot{display:flex;align-items:center;gap:7px;font-size:12px;color:var(--fraco)}.cel .val{font:600 18px/1.2 var(--titulo);margin-top:8px;letter-spacing:-.01em;word-break:break-word}.cel .det{font-size:12px;color:var(--fraco);margin-top:4px}
.ponto{width:8px;height:8px;border-radius:50%;background:var(--fraco);box-shadow:0 0 0 3px rgba(255,255,255,.05)}
.ponto.ok{background:var(--ok);box-shadow:0 0 12px var(--ok)}.ponto.aviso{background:var(--aviso)}.ponto.erro{background:var(--erro)}.ponto.vivo{animation:pulso 1.6s infinite}
@keyframes pulso{50%{opacity:.35}}
.cel.app{grid-column:span 2;--brilho:rgba(251,138,95,.2)}
.cel a{color:var(--teal);font-weight:600;text-decoration:none}.cel a:hover{text-decoration:underline}
/* Ações */
.titSec{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin:4px 2px -4px}
.titSec h3{font:600 16px var(--titulo);margin:0}.titSec span{font-size:12px;color:var(--fraco)}
.acoes{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}
.card{position:relative;text-align:left;background:var(--painel2);border:1px solid var(--linha);border-radius:var(--raio2);padding:14px;cursor:pointer;display:flex;flex-direction:column;gap:8px;transition:transform .18s,border-color .18s,box-shadow .18s}
.card:hover{transform:translateY(-3px);border-color:rgba(45,212,191,.38);box-shadow:0 18px 40px -24px rgba(45,212,191,.6)}
.card .ic{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;font-size:21px;background:rgba(255,255,255,.07)}
.card h4{margin:0;font:600 15px var(--titulo)}.card p{margin:0;font-size:12.5px;line-height:1.45;color:var(--fraco)}
.selo{align-self:flex-start;font-size:11px;border:1px solid var(--linha);border-radius:999px;padding:3px 8px;color:var(--fraco)}
.selo.Destrutivo{color:var(--erro);border-color:rgba(251,113,133,.35)}.selo.Instala,.selo.Altera{color:var(--ouro)}
/* Terminal */
.term{display:flex;flex-direction:column;min-height:0;overflow:hidden}
.abas{display:flex;align-items:center;gap:6px;padding:10px 10px 0;overflow-x:auto;scrollbar-width:thin}
.aba{display:inline-flex;align-items:center;gap:7px;white-space:nowrap;border:1px solid var(--linha);border-bottom:0;border-radius:12px 12px 0 0;padding:7px 10px;font-size:12.5px;background:transparent;cursor:pointer;color:var(--fraco)}
.aba.ativa{background:var(--term);color:var(--texto);border-color:rgba(45,212,191,.3)}
.aba .x{opacity:.6}.aba .x:hover{opacity:1}
.tela{flex:1;min-height:0;background:var(--term);margin:0 10px;border:1px solid rgba(45,212,191,.22);border-radius:0 12px 12px 12px;position:relative;overflow:hidden}
.tela .xt{position:absolute;inset:8px 4px 6px 10px}
.vazio{position:absolute;inset:0;display:grid;place-items:center;text-align:center;color:var(--fraco);padding:20px;font-size:13px}
.vazio b{display:block;font:600 18px var(--titulo);color:var(--texto);margin-bottom:6px}
pre.alt{position:absolute;inset:0;margin:0;padding:12px;overflow:auto;font:12.5px/1.45 var(--mono);color:#d7fbf6;white-space:pre-wrap}
.barra{display:flex;gap:6px;align-items:center;padding:10px;flex-wrap:wrap}
.barra input{flex:1;min-width:140px;border:1px solid var(--linha);background:rgba(255,255,255,.04);border-radius:12px;padding:8px 10px;font-family:var(--mono);font-size:12.5px}
.estado{font-size:12px;color:var(--fraco);padding:0 12px 10px;display:flex;justify-content:space-between;gap:8px}
/* Modal, paleta e toast */
.modal{position:fixed;inset:0;display:none;place-items:center;background:rgba(2,10,10,.62);backdrop-filter:blur(6px);z-index:40;padding:16px}
.modal.on{display:grid}
.caixa{width:min(560px,100%);padding:22px}.caixa h3{margin:0 0 6px;font:600 21px var(--titulo)}.caixa p{color:var(--fraco);font-size:13.5px;line-height:1.55}
.caixa input,.caixa select{width:100%;border:1px solid var(--linha);background:rgba(255,255,255,.05);border-radius:12px;padding:10px 12px;margin:6px 0 14px}
.paleta{width:min(620px,100%);padding:10px}.paleta input{width:100%;border:0;border-bottom:1px solid var(--linha);background:transparent;padding:12px;font-size:16px;outline:0}
.paleta ul{list-style:none;margin:6px 0 0;padding:0;max-height:52vh;overflow:auto}.paleta li{display:flex;gap:10px;align-items:center;padding:10px 12px;border-radius:12px;cursor:pointer}.paleta li.sel,.paleta li:hover{background:rgba(45,212,191,.12)}
.toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%) translateY(20px);opacity:0;transition:.25s;z-index:60;padding:11px 16px;font-size:13.5px;pointer-events:none}
.toast.on{opacity:1;transform:translateX(-50%) translateY(0)}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
@media (max-width:1180px){.app{grid-template-columns:76px minmax(0,1fr);grid-template-rows:minmax(0,1fr) 46vh}.term{grid-column:1/-1}.marca div,.busca,.item .t,.item .r,.grupo,.rodape{display:none}.item{grid-template-columns:1fr;place-items:center}}
@media (max-width:720px){body{overflow:auto}.app{height:auto;grid-template-columns:1fr;grid-template-rows:auto;padding:10px}.lateral{max-height:none}.marca div,.busca,.item .t,.grupo{display:revert}.item{grid-template-columns:26px 1fr auto;place-items:center start}nav.menu{display:none}.term{height:70vh}.cel.app{grid-column:auto}}
</style>
</head>
<body>
<div class="app">
  <aside class="lateral vidro" aria-label="Ações do orquestrador">
    <div class="marca"><div class="logo" aria-hidden="true">🌌</div><div><h1>TUI-WEBNOVA</h1><p>Orquestrador · iLyra</p></div></div>
    <label class="busca" for="filtro">🔎 <input id="filtro" placeholder="Buscar ação" autocomplete="off" /><span class="kbd">Ctrl K</span></label>
    <nav class="menu" id="menu" aria-label="Lista de ações"></nav>
    <div class="rodape"><button class="btn" id="btTema" type="button">🌓 Tema</button><button class="btn" id="btShell" type="button">⌨️ Terminal</button></div>
  </aside>

  <main class="centro vidro" id="centro">
    <div class="topo">
      <div><div class="sobre">🧭 Painel de operação</div><h2 id="saudacao">iLyra</h2><p class="sub" id="linhaSistema">Carregando o ambiente…</p></div>
      <div class="botoes">
        <button class="btn" type="button" data-acao="verificar">🔎 Check-up</button>
        <button class="btn prim" type="button" data-acao="iniciar_dev">🧪 Iniciar Dev</button>
        <button class="btn" type="button" data-acao="iniciar_prod">🚀 Produção</button>
        <button class="btn perigo" type="button" data-acao="parar">⏹️ Parar</button>
      </div>
    </div>
    <section class="bento" id="bento" aria-live="polite"></section>
    <div id="secoes"></div>
  </main>

  <section class="term vidro" aria-label="Terminal">
    <div class="abas" id="abas" role="tablist" aria-label="Execuções"></div>
    <div class="tela" id="tela"><div class="vazio" id="vazio"><div><b>🖥️ Terminal ao vivo</b>Escolha uma ação: a saída aparece aqui em tempo real e você pode digitar quando um comando pedir algo (senha do sudo, confirmações).<br><br><span class="kbd">clique no terminal para digitar</span></div></div></div>
    <form class="barra" id="formEnvio" autocomplete="off">
      <input id="envio" placeholder="Enviar texto ao terminal ativo e Enter" aria-label="Texto para o terminal" />
      <button class="btn" type="submit">↵ Enviar</button>
      <button class="btn" type="button" data-tecla="y">s/y</button>
      <button class="btn" type="button" data-tecla="n">n</button>
      <button class="btn" type="button" data-tecla="ctrlc" title="Interromper (Ctrl+C)">⌃C</button>
      <button class="btn perigo" type="button" id="btCancelar">⏹ Cancelar</button>
      <button class="btn" type="button" id="btLimpar" title="Limpar a tela">🧹</button>
      <button class="btn" type="button" id="btCopiar" title="Copiar a saída">📋</button>
    </form>
    <div class="estado"><span id="estadoJob">Nenhuma execução.</span><span id="relogio"></span></div>
  </section>
</div>

<div class="modal" id="modal" role="dialog" aria-modal="true" aria-labelledby="mTitulo">
  <div class="caixa vidro">
    <h3 id="mTitulo">Confirmar</h3><p id="mTexto"></p>
    <div id="mBackup" hidden><label for="mArquivo">Backup</label><select id="mArquivo"></select></div>
    <div id="mPalavraBox"><label for="mPalavra">Digite <b id="mPalavraRot"></b> para confirmar</label><input id="mPalavra" autocomplete="off" /></div>
    <div class="botoes"><button class="btn prim" type="button" id="mOk">Confirmar</button><button class="btn" type="button" id="mNao">Cancelar</button></div>
  </div>
</div>
<div class="modal" id="paleta" role="dialog" aria-modal="true" aria-label="Paleta de comandos">
  <div class="paleta vidro"><input id="pBusca" placeholder="Digite para buscar uma ação…" aria-label="Buscar ação" /><ul id="pLista"></ul></div>
</div>
<div class="toast vidro" id="toast" role="status"></div>

<script src="https://cdn.jsdelivr.net/npm/@xterm/xterm@6.0.0/lib/xterm.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@xterm/addon-fit@0.11.0/lib/addon-fit.js"></script>
<script>
"use strict";
const TOKEN = new URLSearchParams(location.search).get("token") || "";
const $ = (s) => document.querySelector(s);
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let ACOES = [], GRUPOS = [], ESTADO = null;
const TERMS = new Map(); // id -> {term, fit, el, fonte, offset, fim, info}
let ATIVO = null;

function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("on"), 3200); }
async function api(caminho, corpo) {
  const opcoes = { headers: { "X-WebNova-Token": TOKEN } };
  if (corpo !== undefined) { opcoes.method = "POST"; opcoes.headers["Content-Type"] = "application/json"; opcoes.body = JSON.stringify(corpo); }
  const r = await fetch(caminho, opcoes);
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(dados.erro || ("HTTP " + r.status));
  return dados;
}
try { if (localStorage.getItem("webnova-tema") === "claro") document.body.classList.add("claro"); } catch (e) {}
$("#btTema").onclick = () => { document.body.classList.toggle("claro"); try { localStorage.setItem("webnova-tema", document.body.classList.contains("claro") ? "claro" : "escuro"); } catch (e) {} TERMS.forEach((t) => t.term && (t.term.options.theme = temaTerminal())); };

/* ── Ações ── */
function renderAcoes(filtro = "") {
  const q = filtro.trim().toLowerCase();
  const lista = ACOES.filter((a) => !q || (a.titulo + a.descricao + a.grupo + a.id).toLowerCase().includes(q));
  const menu = $("#menu"), secoes = $("#secoes");
  menu.innerHTML = ""; secoes.innerHTML = "";
  GRUPOS.forEach((g) => {
    const doGrupo = lista.filter((a) => a.grupo === g);
    if (!doGrupo.length) return;
    menu.insertAdjacentHTML("beforeend", `<div class="grupo">${esc(g)}</div>`);
    doGrupo.forEach((a) => menu.insertAdjacentHTML("beforeend", `<button class="item" type="button" data-acao="${a.id}" title="${esc(a.descricao)}"><span aria-hidden="true">${a.icone}</span><span class="t">${esc(a.titulo)}</span><span class="r">${esc(a.risco)}</span></button>`));
    secoes.insertAdjacentHTML("beforeend", `<div class="titSec"><h3>${esc(g)}</h3><span>${doGrupo.length} ${doGrupo.length === 1 ? "ação" : "ações"}</span></div>
      <div class="acoes">${doGrupo.map((a) => `<button class="card" type="button" data-acao="${a.id}"><span class="ic" aria-hidden="true">${a.icone}</span><h4>${esc(a.titulo)}</h4><p>${esc(a.descricao)}</p><span class="selo ${esc(a.risco.split(" ")[0])}">${esc(a.risco)}</span></button>`).join("")}</div>`);
  });
}
document.addEventListener("click", (e) => { const b = e.target.closest("[data-acao]"); if (b) executar(b.dataset.acao); });
$("#filtro").addEventListener("input", (e) => renderAcoes(e.target.value));
$("#btShell").onclick = () => executar("shell");

async function executar(id) {
  const acao = ACOES.find((a) => a.id === id);
  if (!acao) return;
  let params = {};
  if (acao.confirmar || acao.requer) {
    params = await confirmar(acao);
    if (!params) return;
  }
  const tam = medidas();
  try {
    const job = await api("/api/acoes/" + id, { ...params, ...tam });
    toast(`${acao.icone} ${acao.titulo} iniciado`);
    await sincronizarJobs(job.id);
  } catch (err) { toast("⚠️ " + err.message); }
}

function confirmar(acao) {
  return new Promise(async (resolve) => {
    $("#mTitulo").textContent = `${acao.icone} ${acao.titulo}`;
    $("#mTexto").textContent = acao.descricao + (acao.risco === "Destrutivo" ? " Esta operação substitui os dados atuais do banco." : "");
    const temBackup = acao.requer === "backup";
    $("#mBackup").hidden = !temBackup;
    if (temBackup) {
      const lista = (await api("/api/backups").catch(() => [])).filter((b) => b.restauravel);
      $("#mArquivo").innerHTML = lista.length ? lista.map((b) => `<option value="${esc(b.caminho)}">${esc(b.nome)} · ${esc(b.tamanho)}</option>`).join("") : `<option value="">Nenhum backup do banco encontrado</option>`;
    }
    $("#mPalavraBox").hidden = !acao.confirmar;
    $("#mPalavraRot").textContent = acao.confirmar || "";
    $("#mPalavra").value = "";
    $("#modal").classList.add("on");
    setTimeout(() => (acao.confirmar ? $("#mPalavra") : $("#mOk")).focus(), 30);
    const fechar = (valor) => { $("#modal").classList.remove("on"); $("#mOk").onclick = $("#mNao").onclick = null; resolve(valor); };
    $("#mNao").onclick = () => fechar(null);
    $("#mOk").onclick = () => {
      if (acao.confirmar && $("#mPalavra").value.trim().toUpperCase() !== acao.confirmar) { toast(`Digite ${acao.confirmar} para confirmar.`); return; }
      if (temBackup && !$("#mArquivo").value) { toast("Nenhum backup selecionado."); return; }
      fechar({ confirmacao: $("#mPalavra").value, arquivo: temBackup ? $("#mArquivo").value : undefined });
    };
  });
}
$("#modal").addEventListener("keydown", (e) => { if (e.key === "Enter") $("#mOk").click(); if (e.key === "Escape") $("#mNao").click(); });

/* ── Paleta de comandos (Ctrl+K) ── */
let pSel = 0;
function abrirPaleta() { $("#paleta").classList.add("on"); $("#pBusca").value = ""; pSel = 0; listarPaleta(); $("#pBusca").focus(); }
function listarPaleta() {
  const q = $("#pBusca").value.toLowerCase();
  const itens = ACOES.filter((a) => (a.titulo + a.descricao + a.grupo).toLowerCase().includes(q));
  pSel = Math.min(pSel, Math.max(itens.length - 1, 0));
  $("#pLista").innerHTML = itens.map((a, i) => `<li class="${i === pSel ? "sel" : ""}" data-id="${a.id}"><span>${a.icone}</span><span><b>${esc(a.titulo)}</b><br><small style="color:var(--fraco)">${esc(a.grupo)} · ${esc(a.risco)}</small></span></li>`).join("");
  return itens;
}
$("#pBusca").addEventListener("input", listarPaleta);
$("#pBusca").addEventListener("keydown", (e) => {
  const itens = listarPaleta();
  if (e.key === "ArrowDown") { pSel = Math.min(pSel + 1, itens.length - 1); listarPaleta(); e.preventDefault(); }
  if (e.key === "ArrowUp") { pSel = Math.max(pSel - 1, 0); listarPaleta(); e.preventDefault(); }
  if (e.key === "Enter" && itens[pSel]) { $("#paleta").classList.remove("on"); executar(itens[pSel].id); }
  if (e.key === "Escape") $("#paleta").classList.remove("on");
});
$("#pLista").addEventListener("click", (e) => { const li = e.target.closest("li"); if (li) { $("#paleta").classList.remove("on"); executar(li.dataset.id); } });
$("#paleta").addEventListener("click", (e) => { if (e.target.id === "paleta") $("#paleta").classList.remove("on"); });
document.addEventListener("keydown", (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); abrirPaleta(); } });

/* ── Estado (bento) ── */
function cel(icone, rotulo, valor, detalhe, nivel, extraClasse = "") {
  return `<div class="cel ${extraClasse}"><div class="rot"><span class="ponto ${nivel}"></span>${icone} ${esc(rotulo)}</div><div class="val">${valor}</div><div class="det">${detalhe}</div></div>`;
}
function renderEstado(s) {
  ESTADO = s;
  $("#linhaSistema").textContent = `${s.plataforma} · ${s.sistema} · disco livre ${s.disco_livre}`;
  const n = s.node, b = s.banco, g = s.git, a = s.app;
  const mig = b.migrations == null ? "—" : `${b.migrations}/${b.migrations_total}`;
  const appVal = a.estado === "parado" ? "Parado" : `${a.estado === "no ar" ? "No ar" : a.estado} · ${a.modo === "prod" ? "Produção" : "Dev"}`;
  const appDet = a.url ? `<a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.url)} ↗</a> · ${esc(a.origem)}` : "Use Iniciar Dev ou Produção";
  $("#bento").innerHTML = [
    cel("🌐", "Aplicação", appVal, appDet, a.estado === "no ar" ? "ok vivo" : a.estado === "parado" ? "" : "aviso vivo", "app"),
    cel("🐬", "MySQL", b.estado ? esc(b.estado.replace("/", " · ")) : (b.docker === "indisponível" ? "Docker parado" : "Não instalado"), b.mysql ? `MySQL ${esc(b.mysql)} · porta ${esc(b.porta)}` : `Docker ${esc(b.docker || "—")}`, b.estado === "running/healthy" ? "ok" : b.estado ? "aviso" : "erro"),
    cel("🧬", "Migrations", mig, b.migrations == null ? "banco indisponível" : (b.migrations >= b.migrations_total ? "esquema em dia" : "há pendentes"), b.migrations == null ? "" : b.migrations >= b.migrations_total ? "ok" : "aviso"),
    cel("🟢", "Node.js", esc(n.node || "ausente"), `.nvmrc ${esc(n.node_alvo)}`, n.node_ok ? "ok" : "erro"),
    cel("📦", "pnpm", esc(n.pnpm || "ausente"), s.deps_ok ? "dependências em dia" : "dependências pendentes", n.pnpm_ok && s.deps_ok ? "ok" : "aviso"),
    cel("🌿", "Git", esc(g.ramo || "—") + " @ " + esc(g.commit || "—"), g.atras ? `${g.atras} atualização(ões) no origin` : (g.alterados ? `${g.alterados} arquivo(s) alterado(s)` : esc(g.mensagem || "")), g.atras ? "aviso" : "ok"),
    cel("🗄️", "Backups", String(s.backups), "na pasta backups/", s.backups ? "ok" : ""),
    cel("🔐", "Configuração", s.env_ok ? ".env.local ok" : "sem .env.local", s.build ? "build de produção presente" : "sem build de produção", s.env_ok ? "ok" : "erro"),
  ].join("");
  const h = new Date().getHours();
  $("#saudacao").textContent = `${h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite"} 👋`;
}
async function atualizarEstado() { try { renderEstado(await api("/api/status")); } catch (e) { $("#linhaSistema").textContent = "⚠️ " + e.message; } }

/* ── Terminais ── */
function temaTerminal() {
  const claro = document.body.classList.contains("claro");
  return claro ? { background: "#f8fbfb", foreground: "#0e2523", cursor: "#0f8f86", selectionBackground: "#0f8f8644" }
               : { background: "#06100f", foreground: "#dff7f3", cursor: "#2dd4bf", selectionBackground: "#2dd4bf44", brightBlack: "#5b7d79" };
}
function medidas() { const t = ATIVO && TERMS.get(ATIVO); return t && t.term ? { cols: t.term.cols, rows: t.term.rows } : { cols: 120, rows: 32 }; }
let filaEntrada = "", timerEntrada = null;
function enviarEntrada(id, dados) {
  filaEntrada += dados;
  clearTimeout(timerEntrada);
  timerEntrada = setTimeout(() => { const d = filaEntrada; filaEntrada = ""; api(`/api/jobs/${id}/entrada`, { dados: d }).catch((e) => toast("⚠️ " + e.message)); }, 12);
}
function criarTerminal(info) {
  const el = document.createElement("div"); el.className = "xt"; el.hidden = true; $("#tela").appendChild(el);
  const reg = { info, el, offset: 0, fim: false, term: null, fit: null, pre: null, fonte: null };
  if (window.Terminal) {
    reg.term = new window.Terminal({ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 13, lineHeight: 1.25, cursorBlink: true, scrollback: 20000, allowProposedApi: false, theme: temaTerminal(), convertEol: false });
    reg.fit = new window.FitAddon.FitAddon(); reg.term.loadAddon(reg.fit); reg.term.open(el);
    reg.term.onData((d) => { if (!reg.fim) enviarEntrada(info.id, d); });
  } else {
    reg.pre = document.createElement("pre"); reg.pre.className = "alt"; el.appendChild(reg.pre); el.tabIndex = 0;
    el.addEventListener("keydown", (e) => { if (reg.fim) return; if (e.key.length === 1) enviarEntrada(info.id, e.key); else if (e.key === "Enter") enviarEntrada(info.id, "\r"); else if (e.key === "Backspace") enviarEntrada(info.id, "\x7f"); });
  }
  TERMS.set(info.id, reg);
  conectar(reg);
  return reg;
}
const decodificador = new TextDecoder();
function escreverAlt(reg, bytes) {
  const texto = decodificador.decode(bytes, { stream: true }).replace(/\x1b\[[0-9;?]*[ -\/]*[@-~]/g, "").replace(/\x1b\][^\x07]*\x07/g, "").replace(/\r\n/g, "\n").replace(/\r/g, "");
  reg.pre.textContent += texto; reg.pre.scrollTop = reg.pre.scrollHeight;
}
function conectar(reg) {
  if (reg.fonte) reg.fonte.close();
  const fonte = new EventSource(`/api/jobs/${reg.info.id}/fluxo?desde=${reg.offset}&token=${encodeURIComponent(TOKEN)}`);
  reg.fonte = fonte;
  fonte.addEventListener("dados", (e) => {
    const m = JSON.parse(e.data);
    const bin = Uint8Array.from(atob(m.b), (c) => c.charCodeAt(0));
    if (m.o > reg.offset && reg.term) reg.term.write("\r\n\x1b[2m[… saída antiga descartada da memória]\x1b[0m\r\n");
    reg.offset = m.o + bin.length;
    if (reg.term) reg.term.write(bin); else escreverAlt(reg, bin);
  });
  fonte.addEventListener("fim", (e) => {
    const m = JSON.parse(e.data); reg.fim = true; fonte.close(); reg.info.status = m.status;
    const cor = m.status === "ok" ? "38;5;79" : m.status === "cancelado" ? "38;5;221" : "38;5;203";
    const msg = `\r\n\x1b[1;${cor}m■ Fim: ${m.status} (código ${m.codigo})\x1b[0m\r\n`;
    if (reg.term) reg.term.write(msg); else escreverAlt(reg, new TextEncoder().encode(msg));
    toast(`${reg.info.icone} ${reg.info.titulo}: ${m.status === "ok" ? "concluído ✔" : m.status}`);
    renderAbas(); atualizarEstado();
    setTimeout(sincronizarJobs, 800);
  });
  fonte.onerror = () => { if (!reg.fim) { fonte.close(); setTimeout(() => !reg.fim && conectar(reg), 1500); } };
}
function ativar(id) {
  ATIVO = id;
  TERMS.forEach((r, k) => (r.el.hidden = k !== id));
  $("#vazio").hidden = !!id;
  const reg = TERMS.get(id);
  if (reg && reg.fit) setTimeout(() => { try { reg.fit.fit(); api(`/api/jobs/${id}/tamanho`, { cols: reg.term.cols, rows: reg.term.rows }).catch(() => {}); reg.term.focus(); } catch (e) {} }, 30);
  renderAbas();
}
function renderAbas() {
  const abas = $("#abas"); abas.innerHTML = "";
  TERMS.forEach((r, id) => {
    const st = r.fim ? (r.info.status === "ok" ? "✔" : r.info.status === "cancelado" ? "⏹" : "✖") : "●";
    abas.insertAdjacentHTML("beforeend", `<button class="aba ${id === ATIVO ? "ativa" : ""}" role="tab" aria-selected="${id === ATIVO}" data-job="${id}" type="button"><span>${r.info.icone}</span>${esc(r.info.titulo)} <span>${st}</span>${r.fim ? `<span class="x" data-fechar="${id}" title="Fechar aba">✕</span>` : ""}</button>`);
  });
  const r = TERMS.get(ATIVO);
  $("#estadoJob").textContent = r ? `${r.info.titulo} · ${r.fim ? "finalizado" : "em execução — clique no terminal para digitar"}` : "Nenhuma execução.";
}
$("#abas").addEventListener("click", (e) => {
  const x = e.target.closest("[data-fechar]");
  if (x) { const id = x.dataset.fechar; const r = TERMS.get(id); if (r) { r.el.remove(); TERMS.delete(id); } if (ATIVO === id) ativar([...TERMS.keys()].pop() || null); else renderAbas(); e.stopPropagation(); return; }
  const b = e.target.closest("[data-job]"); if (b) ativar(b.dataset.job);
});
async function sincronizarJobs(focar) {
  const jobs = await api("/api/jobs").catch(() => []);
  jobs.forEach((j) => { if (!TERMS.has(j.id) && (j.status === "rodando" || j.id === focar)) criarTerminal(j); else if (TERMS.has(j.id)) TERMS.get(j.id).info = { ...TERMS.get(j.id).info, ...j, status: TERMS.get(j.id).fim ? TERMS.get(j.id).info.status : j.status }; });
  if (focar && TERMS.has(focar)) ativar(focar); else if (!ATIVO && TERMS.size) ativar([...TERMS.keys()].pop()); else renderAbas();
}
$("#formEnvio").addEventListener("submit", (e) => { e.preventDefault(); if (!ATIVO) return toast("Nenhum terminal ativo."); enviarEntrada(ATIVO, $("#envio").value + "\r"); $("#envio").value = ""; });
document.querySelectorAll("[data-tecla]").forEach((b) => b.addEventListener("click", () => {
  if (!ATIVO) return toast("Nenhum terminal ativo.");
  const t = b.dataset.tecla; enviarEntrada(ATIVO, t === "ctrlc" ? "\x03" : t + "\r");
}));
$("#btCancelar").onclick = async () => { if (!ATIVO) return; try { await api(`/api/jobs/${ATIVO}/cancelar`, {}); toast("⏹ Cancelamento enviado"); } catch (e) { toast("⚠️ " + e.message); } };
$("#btLimpar").onclick = () => { const r = TERMS.get(ATIVO); if (r && r.term) r.term.clear(); else if (r && r.pre) r.pre.textContent = ""; };
$("#btCopiar").onclick = async () => {
  const r = TERMS.get(ATIVO); if (!r) return;
  let texto = "";
  if (r.term) { r.term.selectAll(); texto = r.term.getSelection(); r.term.clearSelection(); } else texto = r.pre.textContent;
  try { await navigator.clipboard.writeText(texto); toast("📋 Saída copiada"); } catch (e) { toast("Não foi possível copiar."); }
};
new ResizeObserver(() => { const r = TERMS.get(ATIVO); if (r && r.fit) { try { r.fit.fit(); if (!r.fim) api(`/api/jobs/${ATIVO}/tamanho`, { cols: r.term.cols, rows: r.term.rows }).catch(() => {}); } catch (e) {} } }).observe($("#tela"));
setInterval(() => { $("#relogio").textContent = new Date().toLocaleTimeString("pt-BR"); }, 1000);

(async function iniciar() {
  if (!window.Terminal) toast("⚠️ xterm.js não carregou (sem internet?): usando o terminal simplificado.");
  try {
    const dados = await api("/api/acoes"); ACOES = dados.acoes; GRUPOS = dados.grupos;
    renderAcoes(); await atualizarEstado(); await sincronizarJobs();
    setInterval(atualizarEstado, 4000); setInterval(() => sincronizarJobs(), 5000);
  } catch (e) { $("#linhaSistema").textContent = "⚠️ " + e.message + " · use a URL completa com ?token= impressa no terminal."; }
})();
</script>
</body>
</html>'''

# ════════════════════════════════════════════════════════════════════════════
# Servidor HTTP local (token de sessão, somente 127.0.0.1)
# ════════════════════════════════════════════════════════════════════════════

PORTA_EFETIVA = PORT_DEFAULT


class WebNovaHandler(http.server.BaseHTTPRequestHandler):
    server_version = "TUI-WEBNOVA/2.0"
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt: str, *args: object) -> None:
        # Sem registro de acesso: nada de log em arquivo nem ruído no terminal.
        return

    def _host_valido(self) -> bool:
        host = (self.headers.get("Host") or "").split(":")[0]
        return host in ("127.0.0.1", "localhost", "[::1]", HOST)

    def _token_valido(self, query: Dict[str, List[str]]) -> bool:
        token = self.headers.get("X-WebNova-Token") or query.get("token", [""])[0]
        return secrets.compare_digest(token, TOKEN)

    def enviar_json(self, payload: object, status: int = 200) -> None:
        dados = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(dados)))
        self.end_headers()
        self.wfile.write(dados)

    def ler_corpo(self) -> Dict[str, object]:
        tamanho = int(self.headers.get("Content-Length") or 0)
        if tamanho > 1_000_000:
            raise Recusado("Corpo grande demais.")
        bruto = self.rfile.read(tamanho) if tamanho else b"{}"
        try:
            dados = json.loads(bruto or b"{}")
        except json.JSONDecodeError as erro:
            raise Recusado("JSON inválido.") from erro
        return dados if isinstance(dados, dict) else {}

    def do_GET(self) -> None:
        url = urllib.parse.urlparse(self.path)
        query = urllib.parse.parse_qs(url.query)
        if not self._host_valido():
            self.enviar_json({"erro": "host não permitido"}, 403)
            return
        if url.path == "/favicon.ico":
            # O ícone vem embutido no HTML; responder sem corpo evita o 403
            # que o navegador registrava ao pedir o arquivo padrão.
            self.send_response(204)
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        if url.path == "/":
            dados = HTML.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Referrer-Policy", "no-referrer")
            self.send_header("Content-Length", str(len(dados)))
            self.end_headers()
            self.wfile.write(dados)
            return
        if not self._token_valido(query):
            self.enviar_json({"erro": "token inválido: use a URL completa impressa no terminal"}, 403)
            return
        if url.path == "/api/status":
            self.enviar_json(status_payload())
        elif url.path == "/api/acoes":
            self.enviar_json({"grupos": GRUPOS, "acoes": [{k: v for k, v in a.items() if k != "script"} for a in ACTIONS]})
        elif url.path == "/api/jobs":
            with JOBS_LOCK:
                self.enviar_json([j.resumo() for j in JOBS.values()])
        elif url.path == "/api/backups":
            self.enviar_json(listar_backups())
        elif re.fullmatch(r"/api/jobs/[0-9a-f]{12}/fluxo", url.path):
            self.fluxo(url.path.split("/")[3], int((query.get("desde") or ["0"])[0] or 0))
        else:
            self.enviar_json({"erro": "rota não encontrada"}, 404)

    def do_POST(self) -> None:
        url = urllib.parse.urlparse(self.path)
        query = urllib.parse.parse_qs(url.query)
        if not self._host_valido() or not self._token_valido(query):
            self.enviar_json({"erro": "não autorizado"}, 403)
            return
        try:
            corpo = self.ler_corpo()
            partes = url.path.strip("/").split("/")
            if len(partes) == 3 and partes[:2] == ["api", "acoes"]:
                job = iniciar_acao(partes[2], corpo)
                self.enviar_json(job.resumo(), 201)
                return
            if len(partes) == 4 and partes[:2] == ["api", "jobs"]:
                with JOBS_LOCK:
                    job = JOBS.get(partes[2])
                if not job:
                    self.enviar_json({"erro": "execução não encontrada"}, 404)
                    return
                if partes[3] == "entrada":
                    job.entrada(str(corpo.get("dados", "")))
                elif partes[3] == "tamanho":
                    job.redimensionar(int(corpo.get("cols") or 120), int(corpo.get("rows") or 32))
                elif partes[3] == "cancelar":
                    if job.tipo == "app":
                        threading.Thread(target=job.parar_e_esperar, daemon=True).start()
                    else:
                        job.cancelar()
                else:
                    self.enviar_json({"erro": "rota não encontrada"}, 404)
                    return
                self.enviar_json({"ok": True})
                return
            self.enviar_json({"erro": "rota não encontrada"}, 404)
        except Recusado as erro:
            self.enviar_json({"erro": str(erro)}, 409)
        except RuntimeError as erro:
            self.enviar_json({"erro": str(erro)}, 409)
        except (ValueError, OSError) as erro:
            self.enviar_json({"erro": f"Falha: {erro}"}, 400)

    def fluxo(self, job_id: str, desde: int) -> None:
        with JOBS_LOCK:
            job = JOBS.get(job_id)
        if not job:
            self.enviar_json({"erro": "execução não encontrada"}, 404)
            return
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream; charset=utf-8")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Accel-Buffering", "no")
        self.end_headers()
        self.close_connection = True
        posicao = desde
        try:
            while True:
                with job.buffer.cond:
                    if job.buffer.total <= posicao and job.fim is None:
                        job.buffer.cond.wait(timeout=15)
                    inicio, pedaco = job.buffer.ler(posicao)
                    terminou = job.fim is not None
                if pedaco:
                    for i in range(0, len(pedaco), 49152):
                        parte = pedaco[i:i + 49152]
                        mensagem = json.dumps({"o": inicio + i, "b": base64.b64encode(parte).decode()})
                        self.wfile.write(f"event: dados\ndata: {mensagem}\n\n".encode())
                    posicao = inicio + len(pedaco)
                    self.wfile.flush()
                elif terminou:
                    fim = json.dumps({"status": job.status, "codigo": job.codigo})
                    self.wfile.write(f"event: fim\ndata: {fim}\n\n".encode())
                    self.wfile.flush()
                    return
                else:
                    self.wfile.write(b": pulso\n\n")
                    self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError):
            return


def encontrar_porta(host: str, porta_inicial: int) -> int:
    for porta in range(porta_inicial, porta_inicial + 60):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind((host, porta))
                return porta
            except OSError:
                continue
    raise RuntimeError("Nenhuma porta livre para o painel no intervalo configurado.")


def abrir_navegador(url: str) -> None:
    wsl = "microsoft" in Path("/proc/version").read_text(encoding="utf-8", errors="replace").lower()
    candidatos: List[List[str]] = []
    if wsl:
        if shutil.which("wslview"):
            candidatos.append(["wslview", url])
        if shutil.which("explorer.exe"):
            candidatos.append(["explorer.exe", url])
        if shutil.which("cmd.exe"):
            candidatos.append(["cmd.exe", "/c", "start", "", url])
    for comando in candidatos:
        try:
            subprocess.Popen(comando, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return
        except OSError:
            continue
    try:
        webbrowser.open(url)
    except Exception:
        pass


def iniciar_servidor(abrir: bool = True) -> int:
    global PORTA_EFETIVA
    PORTA_EFETIVA = encontrar_porta(HOST, PORT_DEFAULT)
    httpd = http.server.ThreadingHTTPServer((HOST, PORTA_EFETIVA), WebNovaHandler)
    httpd.daemon_threads = True
    url = f"http://{'localhost' if HOST == '127.0.0.1' else HOST}:{PORTA_EFETIVA}/?token={urllib.parse.quote(TOKEN)}"
    linha = "═" * 78
    print(f"\x1b[38;5;44m{linha}\x1b[0m")
    print(f"\x1b[1m🌌 TUI-WEBNOVA · {APP_NOME}\x1b[0m  (orquestrador v{APP_VERSAO})")
    print(f"   Painel: \x1b[1;38;5;79m{url}\x1b[0m")
    print("   Abra o endereço acima no navegador do Windows (o token protege a sessão).")
    print("   Nenhum log é gravado: a saída dos comandos fica só no painel.")
    print("   Ctrl+C aqui encerra o painel (e a aplicação iniciada por ele).")
    print(f"\x1b[38;5;44m{linha}\x1b[0m", flush=True)
    if abrir and os.environ.get("WEBNOVA_NO_BROWSER", "0") != "1":
        abrir_navegador(url)

    def parar(signum: int, frame: object) -> None:
        threading.Thread(target=httpd.shutdown, daemon=True).start()

    signal.signal(signal.SIGINT, parar)
    signal.signal(signal.SIGTERM, parar)
    try:
        httpd.serve_forever(poll_interval=0.5)
    finally:
        httpd.server_close()
        app = job_ativo("app")
        if app:
            print("\nEncerrando a aplicação iniciada pelo painel…", flush=True)
            app.parar_e_esperar()
        with JOBS_LOCK:
            pendentes = [j for j in JOBS.values() if j.fim is None]
        for job in pendentes:
            job.sinal(signal.SIGTERM)
        print("TUI-WEBNOVA encerrado. O MySQL continua no ar (use a opção Parar app para pará-lo).", flush=True)
    return 0


# ════════════════════════════════════════════════════════════════════════════
# Núcleo interno (independente: não executa nenhum outro arquivo do projeto)
#   --interno env           cria ou completa o .env.local
#   --interno banco-status  conexão e migrations pendentes
#   --interno migrar        aplica migrations e assegura o administrador inicial
#   --interno saude PORTA   health, páginas e login do administrador
# Compatível com o que o banco já registrou: mesma tabela
# (_lyra_schema_migrations), mesmo checksum (sha256 do conteúdo sem BOM e com
# LF) e mesmas regras do administrador inicial.
# ════════════════════════════════════════════════════════════════════════════

TABELA_MIGRATIONS = "_lyra_schema_migrations"
SEGREDOS_GERADOS = {"MYSQL_PASSWORD": 32, "MYSQL_ROOT_PASSWORD": 32, "AUTH_SECRET": 48, "ADMIN_BOOTSTRAP_PASSWORD": 24}
TAMANHO_MINIMO_AUTH_SECRET = 32
SENHA_MINIMA_ADMIN = 8


class FalhaInterna(Exception):
    pass


def _remover_aspas(valor: str) -> str:
    if len(valor) >= 2 and valor[0] == valor[-1] and valor[0] in "\"'":
        return valor[1:-1]
    return valor


def _parse_env(conteudo: str) -> Dict[str, str]:
    valores: Dict[str, str] = {}
    for bruta in conteudo.splitlines():
        linha = bruta.strip()
        if not linha or linha.startswith("#"):
            continue
        separador = linha.find("=")
        if separador <= 0:
            continue
        valores[linha[:separador].strip()] = _remover_aspas(linha[separador + 1:].strip())
    return valores


def interno_env() -> int:
    """Cria ou completa o .env.local a partir do .env.example sem alterar valores existentes."""
    exemplo_caminho = RAIZ / ".env.example"
    if not exemplo_caminho.exists():
        print("[env] ERRO: .env.example não encontrado.")
        return 1
    exemplo = _parse_env(exemplo_caminho.read_text(encoding="utf-8"))
    atual_texto = ENV_LOCAL.read_text(encoding="utf-8") if ENV_LOCAL.exists() else None
    linhas = [] if atual_texto is None else atual_texto.splitlines()
    atuais = _parse_env(atual_texto or "")
    gerar = lambda bytes_: base64.urlsafe_b64encode(secrets.token_bytes(bytes_)).decode().rstrip("=")
    preenchidas: List[str] = []
    for indice, bruta in enumerate(linhas):
        linha = bruta.strip()
        separador = linha.find("=")
        if linha.startswith("#") or separador <= 0:
            continue
        chave = linha[:separador].strip()
        if chave in SEGREDOS_GERADOS and _remover_aspas(linha[separador + 1:].strip()) == "":
            linhas[indice] = f"{chave}={gerar(SEGREDOS_GERADOS[chave])}"
            preenchidas.append(chave)
    novas = [f"{chave}={gerar(SEGREDOS_GERADOS[chave]) if chave in SEGREDOS_GERADOS else valor}"
             for chave, valor in exemplo.items() if chave not in atuais]
    adicionadas = [linha.split("=", 1)[0] for linha in novas]
    if novas:
        if atual_texto is None:
            linhas += ["# Configuração local da iLyra (gerada pelo TUI-WEBNOVA).",
                       "# Contém segredos: não versione nem compartilhe este arquivo.",
                       "# Documentação de cada variável: .env.example"]
        else:
            linhas += ["", f"# Adicionadas pelo TUI-WEBNOVA em {_dt.datetime.now(_dt.timezone.utc).isoformat(timespec='seconds')}"]
        linhas += novas
    erros: List[str] = []
    segredo = atuais.get("AUTH_SECRET", "")
    if segredo and len(segredo.encode("utf-8")) < TAMANHO_MINIMO_AUTH_SECRET:
        erros.append(f"AUTH_SECRET tem {len(segredo.encode())} bytes; o mínimo para HS256 é {TAMANHO_MINIMO_AUTH_SECRET}. "
                     "Apague o valor da linha AUTH_SECRET no .env.local e rode de novo (as sessões abertas serão encerradas).")
    if adicionadas or preenchidas:
        temporario = ENV_LOCAL.with_name(".env.local.tmp")
        temporario.write_text("\n".join(linhas) + "\n", encoding="utf-8")
        os.chmod(temporario, 0o600)
        temporario.replace(ENV_LOCAL)
    if ENV_LOCAL.exists():
        os.chmod(ENV_LOCAL, 0o600)
    if atual_texto is None:
        print(f"[env] .env.local criado com {len(adicionadas)} variáveis (permissão 600).")
    elif adicionadas:
        print(f"[env] Variáveis acrescentadas: {', '.join(adicionadas)}.")
    if preenchidas:
        print(f"[env] Segredos vazios gerados: {', '.join(preenchidas)}.")
    if atual_texto is not None and not adicionadas and not preenchidas:
        print("[env] .env.local já está completo; nada foi alterado.")
    if "ADMIN_BOOTSTRAP_PASSWORD" in adicionadas + preenchidas:
        print("[env] A senha do administrador inicial foi gerada: veja ADMIN_BOOTSTRAP_PASSWORD no .env.local.")
    obsoletas = [chave for chave in atuais if chave not in exemplo]
    if obsoletas:
        print(f"[env] AVISO: variáveis que o app não usa mais: {', '.join(obsoletas)} (não foram alteradas).")
    for erro in erros:
        print(f"[env] ERRO: {erro}")
    return 1 if erros else 0


def _argv_docker(args: List[str]) -> List[str]:
    prefixo = docker_prefixo()
    if not prefixo:
        raise FalhaInterna("Docker indisponível.")
    if prefixo[0] == "sg":
        return ["sg", "docker", "-c", " ".join(shlex_quote(a) for a in ["docker", *args])]
    return ["docker", *args]


def mysql_sql(sql: str, *, root: bool = False, com_banco: bool = True,
              tcp: bool = False, timeout: float = 600) -> str:
    """Executa SQL no MySQL do container (cliente oficial da imagem). Para no primeiro erro."""
    env = ler_env_local()
    usuario = "root" if root else env.get("MYSQL_USER", "")
    senha = env.get("MYSQL_ROOT_PASSWORD" if root else "MYSQL_PASSWORD", "")
    args = ["exec", "-i", "-e", "MYSQL_PWD", CONTAINER_DB, "mysql", "--no-defaults", "--no-login-paths",
            "--default-character-set=utf8mb4", "--connect-timeout=5",
            "--batch", "--skip-column-names", f"-u{usuario}"]
    if tcp:
        args += ["--protocol=TCP", "--host=127.0.0.1", "--port=3306", "--get-server-public-key"]
    else:
        args += ["--protocol=SOCKET", "--host=localhost"]
    if com_banco:
        args.append(f"-D{env.get('MYSQL_DATABASE', '')}")
    proc = subprocess.run(_argv_docker(args), input=sql, text=True, capture_output=True, timeout=timeout,
                          env={**ambiente(), "MYSQL_PWD": senha})
    erro = "\n".join(l for l in proc.stderr.splitlines() if "Using a password" not in l).strip()
    if proc.returncode != 0:
        raise FalhaInterna(erro or f"mysql terminou com código {proc.returncode}")
    return proc.stdout


def ocultar_segredos(texto: str) -> str:
    """Diagnóstico sem despejar Config.Env nem valores sensíveis do .env.local."""
    valores = ler_env_local()
    for chave, valor in sorted(valores.items(), key=lambda item: len(item[1]), reverse=True):
        if valor and re.search(r"PASSWORD|SECRET|TOKEN|API_KEY", chave):
            # Uma senha curta não pode apagar partes de códigos como ERROR
            # 1045 ou de versões. Ocultar apenas ocorrências isoladas nesse caso.
            if len(valor) < 4:
                texto = re.sub(r"(?<!\w)" + re.escape(valor) + r"(?!\w)", "[segredo oculto]", texto)
            else:
                texto = texto.replace(valor, "[segredo oculto]")
    return texto


def inspecionar_saude_mysql() -> Dict[str, object]:
    # Nunca consultar a inspeção inteira: Config.Env contém as senhas.
    proc = subprocess.run(
        _argv_docker(["inspect", "--format", "{{json .State}}", CONTAINER_DB]),
        env=ambiente(), capture_output=True, text=True, timeout=15,
    )
    if proc.returncode:
        raise FalhaInterna(ocultar_segredos(proc.stderr.strip()) or "Container do MySQL não encontrado.")
    return json.loads(proc.stdout)


def diagnosticar_mysql(estado: Dict[str, object], erro: str) -> None:
    print(f"[banco] Estado: {estado.get('Status', 'desconhecido')} · erro da consulta: {ocultar_segredos(erro)}")
    saude = estado.get("Health") or {}
    print(f"[banco] Healthcheck: {saude.get('Status', 'ausente')}")
    for tentativa in saude.get("Log", [])[-3:]:
        print(f"[banco] Healthcheck em {tentativa.get('End', '?')} · código {tentativa.get('ExitCode', '?')}: "
              f"{ocultar_segredos(str(tentativa.get('Output', '')).strip())}")
    if estado.get("Error"):
        print(f"[banco] Docker: {ocultar_segredos(str(estado['Error']))}")


def reconciliar_acesso_mysql() -> None:
    """Repara apenas o acesso da aplicação, usando root já autenticado, sem remover dados."""
    env = ler_env_local()
    banco, usuario = env.get("MYSQL_DATABASE", ""), env.get("MYSQL_USER", "")
    if not re.fullmatch(r"[A-Za-z0-9_]{1,64}", banco):
        raise FalhaInterna("MYSQL_DATABASE deve ter de 1 a 64 letras, números ou sublinhados para o reparo automático.")
    if not re.fullmatch(r"[A-Za-z0-9_]{1,32}", usuario) or usuario.lower() == "root":
        raise FalhaInterna("MYSQL_USER deve ser um usuário próprio da aplicação, com até 32 letras, números ou sublinhados.")
    if not env.get("MYSQL_PASSWORD") or not env.get("MYSQL_ROOT_PASSWORD"):
        raise FalhaInterna("MYSQL_PASSWORD e MYSQL_ROOT_PASSWORD precisam estar preenchidos no .env.local.")
    # Confere root antes de qualquer DDL; nunca usa skip-grant-tables nem redefine root.
    try:
        mysql_sql("SELECT 1", root=True, com_banco=False, timeout=15)
    except FalhaInterna as erro:
        raise FalhaInterna(
            "O acesso da aplicação falhou e o root do .env.local também não autenticou. "
            "As variáveis MYSQL_* só inicializam volumes vazios; recriar o container não troca a senha gravada. "
            "Restaure no .env.local a credencial root usada ao inicializar este volume e repita a ação. "
            "Nenhuma senha ou dado foi alterado. Detalhe: " + ocultar_segredos(str(erro))
        ) from erro
    # localhost/127.0.0.1 existentes podem preceder a conta '%'; só essas
    # contas locais da aplicação são reconciliadas. Outras contas ficam intactas.
    hosts = mysql_sql(
        f"SELECT Host FROM mysql.user WHERE User={sql_texto(usuario)} "
        "AND Host IN ('%', 'localhost', '127.0.0.1')", root=True, com_banco=False, timeout=15,
    ).splitlines()
    hosts = sorted(set(hosts) | {"%"})
    if any(host not in ("%", "localhost", "127.0.0.1") for host in hosts):
        raise FalhaInterna("Resposta inesperada ao consultar as contas locais; reparo interrompido.")
    # No GRANT, '_' é curinga mesmo entre crases. Escapá-lo evita conceder
    # acesso a outros schemas com nomes semelhantes ao banco da aplicação.
    banco_grant = banco.replace("_", "\\_")
    comandos = ["SET SESSION sql_mode='NO_ENGINE_SUBSTITUTION'",
                f"CREATE DATABASE IF NOT EXISTS `{banco}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"]
    senha = sql_texto(env["MYSQL_PASSWORD"])
    for host in hosts:
        conta = f"{sql_texto(usuario)}@{sql_texto(host)}"
        comandos += [f"CREATE USER IF NOT EXISTS {conta} IDENTIFIED WITH caching_sha2_password BY {senha}",
                     f"ALTER USER {conta} IDENTIFIED WITH caching_sha2_password BY {senha}",
                     f"GRANT ALL PRIVILEGES ON `{banco_grant}`.* TO {conta}"]
    mysql_sql(";\n".join(comandos) + ";", root=True, com_banco=False, timeout=30)
    # Não afirmar sucesso pelo DDL: validar a mesma conexão TCP usada pelo healthcheck.
    if mysql_sql("SELECT 1", tcp=True, timeout=15).strip() != "1":
        raise FalhaInterna("O reparo terminou, mas SELECT 1 não retornou o resultado esperado.")
    print("[banco] Acesso da aplicação reconciliado com o .env.local e validado por TCP; dados preservados.")


def interno_preparar_banco() -> int:
    """Aguarda SQL autenticado e healthcheck, inclusive após um estado unhealthy anterior."""
    limite = time.monotonic() + 310  # 120 s iniciais + 18 tentativas de 10 s + margem.
    estado: Dict[str, object] = {}
    erro_consulta = "A consulta ainda não foi executada."
    reparado = False
    print("[banco] Aguardando SELECT 1 via TCP e healthcheck do Docker (até 310 s).", flush=True)
    try:
        while time.monotonic() < limite:
            estado = inspecionar_saude_mysql()
            status = estado.get("Status")
            if status in ("exited", "dead", "removing"):
                raise FalhaInterna(f"O container parou antes de ficar pronto (estado {status}).")
            if status != "running":
                time.sleep(2)
                continue
            try:
                resultado = mysql_sql("SELECT 1", tcp=True, timeout=15).strip()
                if resultado != "1":
                    raise FalhaInterna("SELECT 1 não retornou 1.")
                erro_consulta = "SELECT 1 aprovado."
                saude = estado.get("Health") or {}
                if not saude:
                    raise FalhaInterna("Container sem healthcheck. Confira o serviço mysql no compose.yaml.")
                if saude.get("Status") == "healthy":
                    print("[banco] SELECT 1 autenticado via TCP e Docker healthy: banco pronto.")
                    return 0
            except FalhaInterna as erro:
                erro_consulta = str(erro)
                # Reparo somente para erros de acesso/schema comprovados. Nunca
                # tentar DDL por falha de rede, TLS, timeout ou sintaxe do healthcheck.
                if re.search(r"ERROR (1044|1045|1049|1130)\b", erro_consulta) and not reparado:
                    print("[banco] Falha de acesso/schema confirmada; verificando root para reparar o acesso da aplicação.", flush=True)
                    reparado = True
                    reconciliar_acesso_mysql()
                elif "sem healthcheck" in erro_consulta:
                    raise
            time.sleep(2)
        raise FalhaInterna("Tempo limite de 310 s atingido sem SQL autenticado e Docker healthy.")
    except (FalhaInterna, subprocess.TimeoutExpired, OSError, ValueError) as erro:
        print(f"[banco] ERRO: {ocultar_segredos(str(erro))}")
        diagnosticar_mysql(estado, erro_consulta)
        print("[banco] Para consultar os logs do servidor: docker compose --env-file .env.local logs --tail 50 mysql")
        return 1


def sql_texto(valor: str) -> str:
    """Literal SQL seguro (aspas e caracteres de controle escapados)."""
    trocas = {"\\": "\\\\", "'": "\\'", '"': '\\"', "\x00": "\\0", "\n": "\\n", "\r": "\\r", "\x1a": "\\Z"}
    return "'" + "".join(trocas.get(c, c) for c in valor) + "'"


def _normalizar_migration(conteudo: str) -> str:
    return conteudo.lstrip("﻿").replace("\r\n", "\n").replace("\r", "\n")


def _sha256(texto: str) -> str:
    import hashlib
    return hashlib.sha256(texto.encode("utf-8")).hexdigest()


def arquivos_migration() -> List[str]:
    return sorted((p.name for p in MIGRATIONS_DIR.glob("*.sql")), key=lambda n: [ord(c) for c in n])


def migrations_aplicadas() -> Dict[str, str]:
    existe = mysql_sql(f"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() "
                       f"AND table_name = '{TABELA_MIGRATIONS}'").strip()
    if existe != "1":
        return {}
    saida = mysql_sql(f"SELECT name, checksum FROM {TABELA_MIGRATIONS}")
    return dict(linha.split("\t", 1) for linha in saida.splitlines() if "\t" in linha)


def interno_banco_status() -> int:
    env = ler_env_local()
    destino = f"{CONTAINER_DB} · banco {env.get('MYSQL_DATABASE', '?')}"
    try:
        aplicadas = migrations_aplicadas()
    except FalhaInterna as erro:
        print(f"[ERRO] Sem acesso ao MySQL ({destino}): {erro}")
        return 1
    pendentes = [nome for nome in arquivos_migration() if nome not in aplicadas]
    if pendentes:
        print(f"[ERRO] {len(pendentes)} migration(s) pendente(s) em {destino} (primeira: {pendentes[0]}).")
        return 1
    print(f"[OK] MySQL acessível ({destino}) com {len(aplicadas)} migrations aplicadas.")
    return 0


def _bcrypt(operacao: str, senha: str, hash_atual: str = "") -> str:
    """bcrypt pelo bcryptjs do próprio app (o mesmo algoritmo do login)."""
    codigo = (
        "const b=require('bcryptjs');"
        "const op=process.env.WN_OP,s=process.env.WN_SENHA,h=process.env.WN_HASH;"
        "(op==='comparar'?b.compare(s,h).then(r=>r?'sim':'nao'):b.hash(s,10)).then(r=>process.stdout.write(r));"
    )
    proc = subprocess.run(["node", "-e", codigo], cwd=RAIZ, capture_output=True, text=True, timeout=60,
                          env={**ambiente(), "WN_OP": operacao, "WN_SENHA": senha, "WN_HASH": hash_atual})
    if proc.returncode != 0:
        raise FalhaInterna(f"bcrypt indisponível (dependências instaladas?): {proc.stderr.strip()[:200]}")
    return proc.stdout.strip()


def administradores_bootstrap() -> List[Dict[str, str]]:
    env = ler_env_local()
    email = env.get("ADMIN_BOOTSTRAP_EMAIL", "").strip().lower()
    senha = env.get("ADMIN_BOOTSTRAP_PASSWORD", "").strip()
    admins: List[Dict[str, str]] = []
    if email or senha:
        if not email or not senha:
            raise FalhaInterna("Administrador principal incompleto: ADMIN_BOOTSTRAP_EMAIL e ADMIN_BOOTSTRAP_PASSWORD são obrigatórios.")
        admins.append({"email": email, "senha": senha,
                       "nome": env.get("ADMIN_BOOTSTRAP_FIRST_NAME", "").strip() or "Admin",
                       "sobrenome": env.get("ADMIN_BOOTSTRAP_LAST_NAME", "").strip() or "Local"})
    extras = env.get("ADMIN_BOOTSTRAP_ADDITIONAL_ADMINS", "").strip()
    if extras:
        try:
            lista = json.loads(extras)
        except json.JSONDecodeError as erro:
            raise FalhaInterna("ADMIN_BOOTSTRAP_ADDITIONAL_ADMINS precisa ser um JSON válido.") from erro
        if not isinstance(lista, list):
            raise FalhaInterna("ADMIN_BOOTSTRAP_ADDITIONAL_ADMINS precisa ser um array JSON.")
        for indice, item in enumerate(lista):
            if not isinstance(item, dict):
                raise FalhaInterna(f"ADMIN_BOOTSTRAP_ADDITIONAL_ADMINS[{indice}] precisa ser um objeto.")
            admins.append({"email": str(item.get("email", "")).strip().lower(), "senha": str(item.get("password", "")).strip(),
                           "nome": str(item.get("firstName", "")).strip() or "Admin",
                           "sobrenome": str(item.get("lastName", "")).strip() or "Local"})
    vistos = set()
    for admin in admins:
        if not admin["email"] or not admin["senha"]:
            raise FalhaInterna("Todo administrador inicial precisa de e-mail e senha.")
        if len(admin["senha"]) < SENHA_MINIMA_ADMIN:
            raise FalhaInterna(f"A senha do administrador {admin['email']} precisa ter pelo menos {SENHA_MINIMA_ADMIN} caracteres.")
        if admin["email"] in vistos:
            raise FalhaInterna(f"E-mail duplicado entre os administradores iniciais: {admin['email']}.")
        vistos.add(admin["email"])
    return admins


def assegurar_admin(admin: Dict[str, str]) -> None:
    import uuid
    linha = mysql_sql(f"SELECT id, email, password_hash FROM users WHERE email = {sql_texto(admin['email'])} LIMIT 1").strip()
    partes = linha.split("\t") if linha else []
    usuario_id = partes[0] if partes else str(uuid.uuid4())
    comandos = ["START TRANSACTION;"]
    if partes:
        if partes[1] != admin["email"]:
            comandos.append(f"UPDATE users SET email = {sql_texto(admin['email'])} WHERE id = {sql_texto(usuario_id)};")
        hash_atual = partes[2] if len(partes) > 2 else ""
        if not hash_atual or _bcrypt("comparar", admin["senha"], hash_atual) != "sim":
            comandos.append(f"UPDATE users SET password_hash = {sql_texto(_bcrypt('hash', admin['senha']))} WHERE id = {sql_texto(usuario_id)};")
            print(f"Senha do administrador inicial atualizada: {admin['email']}")
    else:
        comandos.append(f"INSERT INTO users (id, email, password_hash) VALUES ({sql_texto(usuario_id)}, "
                        f"{sql_texto(admin['email'])}, {sql_texto(_bcrypt('hash', admin['senha']))});")
    uid = sql_texto(usuario_id)
    comandos += [
        f"INSERT INTO profiles (id, first_name, last_name, email, onboarding_completed, role) VALUES ({uid}, "
        f"{sql_texto(admin['nome'])}, {sql_texto(admin['sobrenome'])}, {sql_texto(admin['email'])}, TRUE, 'admin') AS novo "
        "ON DUPLICATE KEY UPDATE first_name = novo.first_name, last_name = novo.last_name, email = novo.email, "
        "onboarding_completed = TRUE, role = 'admin';",
        "SET @care := (SELECT id FROM subscription_plans WHERE plan_key = 'care' LIMIT 1);",
        f"SET @ativo := (SELECT plan_id FROM user_subscriptions WHERE user_id = {uid} AND status = 'active' "
        "AND (ended_at IS NULL OR ended_at > UTC_TIMESTAMP()) ORDER BY current_period_end DESC, created_at DESC LIMIT 1);",
        f"UPDATE user_subscriptions SET status = 'replaced', ended_at = UTC_TIMESTAMP(), cancel_at_period_end = FALSE "
        f"WHERE @care IS NOT NULL AND NOT (@ativo <=> @care) AND user_id = {uid} AND status = 'active' "
        "AND (ended_at IS NULL OR ended_at > UTC_TIMESTAMP());",
        "INSERT INTO user_subscriptions (id, user_id, plan_id, status, billing_interval, source, starts_at, "
        "current_period_start, current_period_end, cancel_at_period_end, metadata) "
        f"SELECT {sql_texto(str(uuid.uuid4()))}, {uid}, @care, 'active', 'monthly', 'bootstrap_admin', UTC_TIMESTAMP(), "
        "UTC_TIMESTAMP(), DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 MONTH), FALSE, JSON_OBJECT('reason', 'bootstrap_admin_care') "
        "FROM DUAL WHERE @care IS NOT NULL AND NOT (@ativo <=> @care);",
        "COMMIT;",
    ]
    mysql_sql("\n".join(comandos))
    print(f"Administrador inicial assegurado: {admin['email']}")


def interno_migrar() -> int:
    try:
        for tentativa in range(30):
            try:
                mysql_sql("SELECT 1")
                break
            except FalhaInterna:
                if tentativa == 29:
                    raise
                time.sleep(2)
        mysql_sql(f"CREATE TABLE IF NOT EXISTS {TABELA_MIGRATIONS} (id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, "
                  "name VARCHAR(255) NOT NULL UNIQUE, checksum CHAR(64) NOT NULL, "
                  "applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)")
        aplicadas = migrations_aplicadas()
        novas = 0
        for nome in arquivos_migration():
            bruto = (MIGRATIONS_DIR / nome).read_bytes().decode("utf-8")
            normal = _normalizar_migration(bruto)
            checksum = _sha256(normal)
            candidatos = {_sha256(bruto), checksum, _sha256(normal.replace("\n", "\r\n"))}
            if nome in aplicadas:
                if aplicadas[nome] not in candidatos:
                    raise FalhaInterna(f"Migration já aplicada com conteúdo diferente: {nome}")
                if aplicadas[nome] != checksum:
                    mysql_sql(f"UPDATE {TABELA_MIGRATIONS} SET checksum = {sql_texto(checksum)} WHERE name = {sql_texto(nome)}")
                    print(f"Checksum normalizado: {nome}")
                print(f"Já aplicada: {nome}")
                continue
            corpo = normal.rstrip()
            if not corpo.endswith(";"):
                corpo += ";"
            try:
                mysql_sql(f"START TRANSACTION;\n{corpo}\nINSERT INTO {TABELA_MIGRATIONS} (name, checksum) "
                          f"VALUES ({sql_texto(nome)}, {sql_texto(checksum)});\nCOMMIT;")
            except FalhaInterna as erro:
                raise FalhaInterna(f"Falha ao aplicar {nome}: {erro}") from erro
            novas += 1
            print(f"Aplicada: {nome}")
        admins = administradores_bootstrap()
        if not admins:
            print("Administrador inicial: desativado.")
        for admin in admins:
            assegurar_admin(admin)
        print(f"[OK] {novas} migration(s) nova(s); {len(arquivos_migration())} no total.")
        return 0
    except (FalhaInterna, OSError, subprocess.TimeoutExpired) as erro:
        print(f"[ERRO] {erro}")
        return 1


def interno_saude(porta_texto: str) -> int:
    if not porta_texto.isdigit():
        print("[ERRO] Informe a porta da aplicação.")
        return 2
    base = f"http://127.0.0.1:{porta_texto}"
    falhas: List[str] = []
    try:
        with urllib.request.urlopen(f"{base}/api/health", timeout=60) as resposta:
            dados = json.loads(resposta.read().decode("utf-8"))
        esperado = len(arquivos_migration())
        if dados.get("migrationsApplied") == esperado:
            print(f"[OK] /api/health: banco ok, {esperado} migrations aplicadas.")
        else:
            falhas.append(f"/api/health informa {dados.get('migrationsApplied')} migrations (esperado {esperado})")
    except urllib.error.HTTPError as erro:
        falhas.append(f"/api/health respondeu {erro.code}")
    except (urllib.error.URLError, OSError, json.JSONDecodeError) as erro:
        falhas.append(f"/api/health sem resposta válida ({erro})")
    for caminho in ("/", "/login"):
        codigo = http_status(f"{base}{caminho}", timeout=60)
        if codigo == 200:
            print(f"[OK] Página {caminho} renderizada (HTTP 200).")
        else:
            falhas.append(f"página {caminho} respondeu {codigo or 'sem resposta'}")
    env = ler_env_local()
    corpo = json.dumps({"email": env.get("ADMIN_BOOTSTRAP_EMAIL", ""), "password": env.get("ADMIN_BOOTSTRAP_PASSWORD", ""),
                        "remember": False}).encode()
    # Sem cabeçalho Origin (cliente fora do navegador): um Origin com
    # 127.0.0.1 diferente da URL configurada é recusado pela proteção CSRF.
    requisicao = urllib.request.Request(f"{base}/api/auth/login", data=corpo, method="POST",
                                        headers={"content-type": "application/json"})
    try:
        with urllib.request.urlopen(requisicao, timeout=60) as resposta:
            codigo = resposta.status
    except urllib.error.HTTPError as erro:
        codigo = erro.code
    except (urllib.error.URLError, OSError):
        codigo = 0
    if codigo == 200:
        print("[OK] Login do administrador inicial funcionando.")
    else:
        falhas.append(f"login do administrador respondeu {codigo or 'sem resposta'}")
    for falha in falhas:
        print(f"[ERRO] {falha}")
    return 1 if falhas else 0


def interno(argv: List[str]) -> int:
    comando = argv[0] if argv else ""
    if comando == "env":
        return interno_env()
    if comando == "banco-status":
        return interno_banco_status()
    if comando == "preparar-banco":
        return interno_preparar_banco()
    if comando == "migrar":
        return interno_migrar()
    if comando == "saude":
        return interno_saude(argv[1] if len(argv) > 1 else "")
    print(f"Comando interno desconhecido: {comando}", file=sys.stderr)
    return 2


# ════════════════════════════════════════════════════════════════════════════
# Linha de comando (paridade com o template)
# ════════════════════════════════════════════════════════════════════════════


def self_test() -> int:
    erros: List[str] = []
    ids = [str(a["id"]) for a in ACTIONS]
    if len(ids) != len(set(ids)):
        erros.append("IDs duplicados no catálogo")
    for acao in ACTIONS:
        if acao["grupo"] not in GRUPOS:
            erros.append(f"Grupo desconhecido em {acao['id']}")
        if "script" not in acao and acao["id"] not in ("iniciar_dev", "iniciar_prod", "parar"):
            erros.append(f"Ação sem implementação: {acao['id']}")
    scripts = {str(a["id"]): str(a["script"]) for a in ACTIONS if "script" in a}
    scripts.update({"preparar_app": S_PREPARAR_APP, "executar_app": S_EXECUTAR_APP, "parar_banco": S_PARAR_BANCO})
    for nome, script in scripts.items():
        proc = subprocess.run(["bash", "-n", "-c", LIB + "\n" + script], capture_output=True, text=True)
        if proc.returncode != 0:
            erros.append(f"Sintaxe Bash inválida em {nome}: {proc.stderr.strip()}")
    for trecho in ("EventSource", "@xterm/xterm@6.0.0", "addon-fit@0.11.0", 'lang="pt-BR"', "prefers-reduced-motion"):
        if trecho not in HTML:
            erros.append(f"Componente ausente no HTML: {trecho}")
    for obrigatorio in ("package.json", ".nvmrc", ".env.example", "compose.yaml", "pnpm-lock.yaml", "mysql/migrations"):
        if not (RAIZ / obrigatorio).exists():
            erros.append(f"Arquivo do projeto ausente: {obrigatorio}")
    fonte = SCRIPT_PATH.read_text(encoding="utf-8", errors="replace")
    for termo in ("ev" + "al ", "TO" + "DO", "PLACE" + "HOLDER", "FIX" + "ME"):
        if termo in fonte:
            erros.append(f"Termo proibido no código: {termo}")
    # Independência: nenhum outro arquivo do projeto é executado.
    for termo in ("scripts" + "/", "run" + ".sh", "run" + ".py", "run_" + "windows", "pn " + "build", "pn " + "-s"):
        if termo in fonte:
            erros.append(f"Dependência de outro arquivo do projeto: {termo}")
    for termo in ("logging." + "FileHandler", "LOGS" + " /", "app-" + "dev.log", "tee -a" + " "):
        if termo in fonte:
            erros.append(f"Gravação de log encontrada: {termo}")
    if erros:
        print("SELF-TEST FALHOU")
        for erro in erros:
            print(f"- {erro}")
        return 1
    print(f"SELF-TEST OK. {len(ACTIONS)} ações reais, {len(scripts)} scripts Bash válidos, interface completa.")
    return 0


def teclado() -> object:
    """Entrada real do terminal. A entrada padrão deste processo é o próprio
    código (heredoc do launcher), então perguntas e comandos filhos leem o
    teclado por /dev/tty; sem terminal, a entrada fica vazia."""
    try:
        return open("/dev/tty", "r", encoding="utf-8")
    except OSError:
        return subprocess.DEVNULL


def run_action_cli(acao_id: str) -> int:
    """Executa a ação neste terminal (interativa, sem painel e sem log)."""
    acao = ACTION_MAP.get(acao_id)
    if not acao:
        print(f"Ação inexistente: {acao_id}. Veja --menu-preview.", file=sys.stderr)
        return 2
    entrada = teclado()
    if acao.get("confirmar"):
        # Automação sem terminal: WEBNOVA_CONFIRMACAO=<PALAVRA> confirma.
        resposta = os.environ.get("WEBNOVA_CONFIRMACAO", "").strip().upper()
        if not resposta:
            print(f"{acao['icone']} {acao['titulo']}: digite {acao['confirmar']} para confirmar: ", end="", flush=True)
            resposta = entrada.readline().strip().upper() if hasattr(entrada, "readline") else ""
        if resposta != acao["confirmar"]:
            print("\nCancelado; nada foi alterado.")
            return 1

    def chamar(argv: List[str], env: Dict[str, str]) -> int:
        return subprocess.call(argv, cwd=RAIZ, env=env, stdin=entrada)

    if acao_id in ("iniciar_dev", "iniciar_prod"):
        modo = str(acao["modo"])
        if chamar(argv_bash(S_PREPARAR_APP), ambiente({"MODO_APP": modo})) != 0:
            return 1
        porta = porta_livre(PORTA_APP_PADRAO)
        env_local = ler_env_local()
        extra = {"MODO_APP": modo, "SUBCOMANDO": "start" if modo == "prod" else "dev", "PORT": str(porta)}
        for chave in ("APP_BASE_URL", "NEXT_PUBLIC_APP_URL"):
            if env_local.get(chave):
                extra[chave] = url_local(env_local[chave], porta)
        return chamar(argv_bash(S_EXECUTAR_APP), ambiente(extra))
    if acao_id == "parar":
        # Pela linha de comando a aplicação roda em primeiro plano (Ctrl+C a
        # encerra); aqui resta parar o MySQL.
        return chamar(argv_bash(S_PARAR_BANCO), ambiente())
    extra: Dict[str, str] = {}
    if acao_id == "restaurar":
        if len(sys.argv) < 4:
            print("Uso: --run-action restaurar backups/banco/ARQUIVO.sql.gz", file=sys.stderr)
            return 2
        extra["ARQUIVO_BACKUP"] = str((RAIZ / sys.argv[3]).resolve())
    if acao_id == "saude":
        porta_app = os.environ.get("PORTA_APP") or str(PORTA_APP_PADRAO)
        extra["PORTA_APP"] = porta_app if porta_em_uso(int(porta_app)) else ""
    return chamar(argv_bash(str(acao["script"])), ambiente(extra))


def main(argv: List[str]) -> int:
    if "--help" in argv or "-h" in argv:
        print(f"🌌 TUI-WEBNOVA · orquestrador do {APP_NOME} (WSL2 Ubuntu)\n")
        print("Uso:")
        print("  ./tui-webnova.sh                   painel no navegador (abre sozinho)")
        print("  ./tui-webnova.sh --no-browser      painel sem abrir o navegador")
        print("  ./tui-webnova.sh --run-action ID   executa uma ação neste terminal (veja --menu-preview)")
        print("  ./tui-webnova.sh --menu-preview    lista as ações")
        print("  ./tui-webnova.sh --list-actions-json")
        print("  ./tui-webnova.sh --self-test       valida o próprio orquestrador")
        print("\nVariáveis: WEBNOVA_PORT (8808), WEBNOVA_HOST (127.0.0.1), LYRA_APP_PORT (3000).")
        print("Nenhum log é gravado: a saída aparece só no painel ou neste terminal.")
        return 0
    if argv and argv[0] == "--interno":
        return interno(argv[1:])
    if "--self-test" in argv:
        return self_test()
    if "--list-actions-json" in argv:
        print(json.dumps([{k: v for k, v in a.items() if k != "script"} for a in ACTIONS], ensure_ascii=False, indent=2))
        return 0
    if "--menu-preview" in argv:
        print(f"🌌 TUI-WEBNOVA · {APP_NOME} v{APP_VERSAO}")
        for grupo in GRUPOS:
            print(f"\n{grupo}")
            for acao in (a for a in ACTIONS if a["grupo"] == grupo):
                print(f"  {acao['icone']} {acao['id']:<16} {acao['titulo']} · {acao['risco']}")
        return 0
    if "--run-action" in argv:
        indice = argv.index("--run-action")
        if indice + 1 >= len(argv):
            print("Informe a ação após --run-action", file=sys.stderr)
            return 2
        return run_action_cli(argv[indice + 1])
    return iniciar_servidor(abrir="--no-browser" not in argv)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
PY_WEBNOVA
