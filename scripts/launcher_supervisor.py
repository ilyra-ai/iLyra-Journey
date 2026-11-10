"""Supervisão Linux em primeiro plano com lease global dos artefatos.

O processo mantém o lease até o Bash terminar, inclusive durante instalação,
build, início e registro do app. Não inicia serviços por conta própria e não
adota automaticamente artefatos sem origem comprovada.
"""

from __future__ import annotations

import argparse
import json
import os
import signal
import subprocess
import sys
from pathlib import Path

from launcher_artifacts import ErroArtefatos, GerenciadorArtefatos

MUTACOES = frozenset(("up", "app", "db", "migrate", "fix", "repair", "purge", "stop"))


def identidade_linux(pid: int) -> tuple[int, str]:
    if pid <= 0:
        raise ErroArtefatos("PID inválido para a prova do lease.")
    try:
        campos = Path(f"/proc/{pid}/stat").read_text().rsplit(")", 1)[1].split()
        return int(campos[1]), campos[19]
    except (OSError, IndexError, ValueError) as erro:
        raise ErroArtefatos("Identidade do processo não pôde ser comprovada.") from erro


def validar_filho(raiz: Path, pai: int) -> None:
    """Comprova a cadeia Python proprietário → Bash → esta consulta Python."""
    gerenciador = GerenciadorArtefatos(raiz)
    try:
        lease = json.loads(gerenciador.lock.read_text())
        pid = int(os.environ.get("LYRA_LEASE_PID", "0"))
        token = os.environ.get("LYRA_LEASE_TOKEN", "")
        inicio = os.environ.get("LYRA_LEASE_INICIO", "")
        bash = os.getppid()
        pai_bash, _ = identidade_linux(bash)
        _, inicio_pai = identidade_linux(pai)
        comando = Path(f"/proc/{bash}/cmdline").read_bytes().split(b"\0")
        esperado = os.fsencode(str(gerenciador.raiz / "run.sh"))
        if (
            pai != pid or pai_bash != pai or esperado not in comando
            or not token or lease.get("token") != token
            or lease.get("pid") != pai or lease.get("plataforma") != "linux"
            or lease.get("inicio_processo") != inicio or inicio_pai != inicio
        ):
            raise ErroArtefatos("Bash não é filho legítimo do proprietário do lease.")
    except (OSError, ValueError, TypeError, AttributeError) as erro:
        raise ErroArtefatos("Prova de lease ausente ou inválida; operação recusada.") from erro


def aguardar_bash(argumentos: list[str], ambiente: dict[str, str], raiz: Path) -> int:
    """Encaminha interrupções e aguarda o filho antes de devolver o lease."""
    filho: subprocess.Popen | None = None
    anteriores = {}
    pendentes: list[int] = []

    def encaminhar(numero: int, _quadro: object) -> None:
        if filho is None:
            pendentes.append(numero)
        elif filho.poll() is None:
            try:
                os.killpg(filho.pid, numero)
            except ProcessLookupError:
                pass

    try:
        for numero in (signal.SIGINT, signal.SIGTERM):
            anteriores[numero] = signal.signal(numero, encaminhar)
        filho = subprocess.Popen(argumentos, cwd=raiz, env=ambiente, start_new_session=True)
        for numero in pendentes:
            encaminhar(numero, None)
        codigo = filho.wait()
        return codigo if codigo >= 0 else 128 - codigo
    finally:
        # Uma exceção inesperada não libera o lease com o Bash ainda trabalhando.
        if filho is not None and filho.poll() is None:
            encaminhar(signal.SIGTERM, None)
            try:
                filho.wait(timeout=15)
            except subprocess.TimeoutExpired:
                encaminhar(signal.SIGKILL, None)
                filho.wait()
        for numero, anterior in anteriores.items():
            signal.signal(numero, anterior)


def supervisionar(raiz: Path, argumentos: list[str]) -> int:
    if not sys.platform.startswith("linux"):
        raise ErroArtefatos("Este supervisor exige Linux/WSL2 Ubuntu.")
    if not argumentos or argumentos[0] not in MUTACOES:
        raise ErroArtefatos("Comando fora do contrato de supervisão.")
    gerenciador = GerenciadorArtefatos(raiz)
    script = gerenciador.raiz / "run.sh"
    if not script.is_file() or script.is_symlink():
        raise ErroArtefatos("run.sh precisa ser um arquivo real da raiz.")
    with gerenciador.transacao():
        estado = gerenciador.status()
        ativo = estado["ativo"]
        if ativo is not None and ativo.get("plataforma") == "linux":
            gerenciador.exigir_plataforma_ativa("linux")
        elif argumentos[0] == "stop":
            # Parar não deve trocar arquivos de outra plataforma nem adotar legado.
            raise ErroArtefatos("Parada exige manifesto Linux ativo comprovado.")
        else:
            gerenciador.ativar("linux")
        lease = json.loads(gerenciador.lock.read_text())
        ambiente = os.environ.copy()
        ambiente.update({
            "LYRA_LEASE_PID": str(lease["pid"]),
            "LYRA_LEASE_INICIO": lease["inicio_processo"],
            "LYRA_LEASE_TOKEN": lease["token"],
        })
        return aguardar_bash(
            ["/bin/bash", str(script), "--interno-lease", *argumentos],
            ambiente,
            gerenciador.raiz,
        )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("acao", choices=("executar", "validar-filho"))
    parser.add_argument("--raiz", required=True, type=Path)
    parser.add_argument("--pai", type=int)
    parser.add_argument("argumentos", nargs=argparse.REMAINDER)
    args = parser.parse_args()
    try:
        if args.acao == "validar-filho":
            if args.pai is None:
                raise ErroArtefatos("Prova do filho exige o PID pai.")
            validar_filho(args.raiz, args.pai)
            return 0
        argumentos = args.argumentos
        if argumentos[:1] == ["--"]:
            argumentos = argumentos[1:]
        return supervisionar(args.raiz, argumentos)
    except (ErroArtefatos, OSError, ValueError) as erro:
        print(f"[ERRO] {erro}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("[AVISO] Supervisão interrompida.", file=sys.stderr)
        return 130


if __name__ == "__main__":
    sys.exit(main())
