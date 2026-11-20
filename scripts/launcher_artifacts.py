"""Alternância serial e recuperável de artefatos nativos no checkout único.

Não copia fontes, não instala pacotes, não inicia serviços e não apaga builds.
O chamador deve provar a origem da instalação inicial e parar a sua instância
antes de alternar. Um estado de aplicação desconhecido impede a operação.
"""

from __future__ import annotations

import argparse
import contextlib
import ctypes
import errno
import hashlib
import json
import os
import re
import stat
import subprocess
import sys
import threading
import uuid
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path

PLATAFORMAS = ("linux", "windows")
ARTEFATOS = (
    "node_modules",
    ".next",
    "next-env.d.ts",
    "tsconfig.tsbuildinfo",
    "public/offline-assets.json",
)


class ErroArtefatos(RuntimeError):
    """Recusa que preserva o checkout e exige diagnóstico explícito."""


@dataclass(frozen=True)
class ComprovacaoOrigem:
    plataforma: str
    node_executavel: str
    lockfile_sha256: str
    evidencias: dict[str, str]


def sha256(arquivo: Path) -> str:
    resumo = hashlib.sha256()
    with arquivo.open("rb") as entrada:
        for bloco in iter(lambda: entrada.read(1024 * 1024), b""):
            resumo.update(bloco)
    return resumo.hexdigest()


def plataforma_atual() -> str:
    if sys.platform.startswith("linux"):
        return "linux"
    if sys.platform == "win32":
        return "windows"
    raise ErroArtefatos("Somente Linux e Windows são suportados.")


def inicio_processo_atual() -> str:
    if plataforma_atual() == "linux":
        campos = Path(f"/proc/{os.getpid()}/stat").read_text().rsplit(")", 1)[1].split()
        return campos[19]
    from ctypes import wintypes

    kernel = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel.GetCurrentProcess.restype = wintypes.HANDLE
    kernel.GetProcessTimes.argtypes = [wintypes.HANDLE] + [
        ctypes.POINTER(wintypes.FILETIME)
    ] * 4
    tempos = [wintypes.FILETIME() for _ in range(4)]
    if not kernel.GetProcessTimes(
        kernel.GetCurrentProcess(), *(ctypes.byref(tempo) for tempo in tempos)
    ):
        raise ErroArtefatos("Não foi possível provar o início do processo Windows.")
    return str((tempos[0].dwHighDateTime << 32) | tempos[0].dwLowDateTime)


CONSULTA_PROC_LINUX = r'''
raiz=$1
case "$raiz" in
    [A-Za-z]:*) raiz=$(wslpath -u "$raiz") || exit 2 ;;
esac
raiz=$(readlink -f "$raiz") || exit 2
[ -n "$raiz" ] || exit 2
saida='['
separador=''
for pasta in /proc/[0-9]*; do
    [ -d "$pasta" ] || continue
    nome=$(cat "$pasta/comm" 2>/dev/null) || {
        [ -d "$pasta" ] && exit 2
        continue
    }
    case "$nome" in *node*|*next-server*|*bun*|MainThread) ;; *) continue ;; esac
    estado=$(cat "$pasta/stat" 2>/dev/null) || continue
    case "$estado" in *') Z '*) continue ;; esac
    executavel=$(readlink "$pasta/exe") || {
        [ -d "$pasta" ] && exit 2
        continue
    }
    case "${executavel##*/}" in *node*|*bun*) ;; *) continue ;; esac
    cwd=$(readlink "$pasta/cwd") || {
        [ -d "$pasta" ] && exit 2
        continue
    }
    comando=$(tr '\000' ' ' < "$pasta/cmdline") || {
        [ -d "$pasta" ] && exit 2
        continue
    }
    case "$cwd/ $comando" in
        "$raiz/ "*|"$raiz/"*|*"$raiz/"*)
            saida="$saida$separador${pasta##*/}"
            separador=',' ;;
    esac
done
printf '%s]\n' "$saida"
'''

CONSULTA_CIM_WINDOWS = r'''
$ErrorActionPreference = 'Stop'
$alvo = $env:LYRA_ARTIFACT_ROOT.ToLowerInvariant().Replace('/', '\').TrimEnd('\')
$ocupados = @()
foreach ($p in @(Get-CimInstance Win32_Process -Filter "Name='node.exe' OR Name='bun.exe'")) {
    $linha = [string]$p.CommandLine
    if ([string]::IsNullOrWhiteSpace($linha)) { throw 'Origem de processo não verificável' }
    $normal = $linha.ToLowerInvariant().Replace('/', '\')
    if ($normal.Contains($alvo + '\')) { $ocupados += [int]$p.ProcessId; continue }
    $semExecutavel = [regex]::Replace($linha, '^\s*("[^"]*"|\S+)\s*', '')
    if ($semExecutavel -match '(?i)next-server|next[\\/]dist|node_modules[\\/]next|\bpnpm\b|\bcorepack\b') {
        if ($semExecutavel -notmatch '(?i)([A-Z]:[\\/]|\\\\)[^"\r\n]*\.(js|cjs|mjs)(["\s]|$)') {
            throw 'Origem de processo da aplicação não verificável'
        }
    }
}
ConvertTo-Json -InputObject @($ocupados) -Compress
'''


def _consultar_processos(argumentos: list[str], ambiente: dict | None = None) -> list[int]:
    try:
        resultado = subprocess.run(
            argumentos, env=ambiente, capture_output=True, timeout=30, shell=False, check=False,
        )
        if resultado.returncode != 0:
            raise ErroArtefatos("Não foi possível provar ausência de processos; alternância recusada.")
        dados = json.loads(resultado.stdout.decode("utf-8-sig"))
        if not isinstance(dados, list) or any(type(pid) is not int for pid in dados):
            raise ErroArtefatos("Inventário de processos inválido; alternância recusada.")
        return dados
    except (OSError, ValueError, subprocess.TimeoutExpired) as erro:
        raise ErroArtefatos("Consulta de processos indisponível; alternância recusada.") from erro


def processos_checkout(raiz: Path) -> list[int]:
    """Consulta host e WSL ativos sem iniciar distros nem imprimir comandos."""
    ambiente = os.environ.copy()
    if plataforma_atual() == "linux":
        ocupados = _consultar_processos(["/bin/sh", "-c", CONSULTA_PROC_LINUX, "lyra-inventario", str(raiz)])
        wsl = "microsoft" in Path("/proc/sys/kernel/osrelease").read_text().lower()
        if not wsl:
            return ocupados
        try:
            convertido = subprocess.run(
                ["wslpath", "-w", str(raiz)], capture_output=True, text=True,
                timeout=15, check=True, shell=False,
            ).stdout.strip()
        except (OSError, subprocess.SubprocessError) as erro:
            raise ErroArtefatos("Raiz Windows não verificável; alternância recusada.") from erro
        ambiente["LYRA_ARTIFACT_ROOT"] = convertido
        powershell = "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe"
        # WSLENV só transporta a raiz pública; não transporta credenciais.
        ambiente["WSLENV"] = ambiente.get("WSLENV", "") + ":LYRA_ARTIFACT_ROOT"
        ocupados += _consultar_processos(
            [powershell, "-NoProfile", "-NonInteractive", "-Command", CONSULTA_CIM_WINDOWS], ambiente
        )
        return ocupados
    ambiente["LYRA_ARTIFACT_ROOT"] = str(raiz)
    powershell = str(Path(os.environ.get("SystemRoot", "C:/Windows")) / "System32/WindowsPowerShell/v1.0/powershell.exe")
    ocupados = _consultar_processos(
        [powershell, "-NoProfile", "-NonInteractive", "-Command", CONSULTA_CIM_WINDOWS], ambiente
    )
    wsl = Path(os.environ.get("SystemRoot", "C:/Windows")) / "System32/wsl.exe"
    if not wsl.is_file():
        return ocupados
    try:
        lista = subprocess.run(
            [str(wsl), "--list", "--running", "--quiet"], capture_output=True,
            timeout=30, check=True, shell=False,
        )
        texto = lista.stdout.decode("utf-16-le") if b"\x00" in lista.stdout else lista.stdout.decode("utf-8-sig")
    except (OSError, UnicodeError, subprocess.SubprocessError) as erro:
        raise ErroArtefatos("Não foi possível inspecionar WSL ativo; alternância recusada.") from erro
    for distro in texto.splitlines():
        distro = distro.strip().lstrip("\ufeff")
        if not distro:
            continue
        ocupados += _consultar_processos([
            str(wsl), "-d", distro, "--exec", "/bin/sh", "-c", CONSULTA_PROC_LINUX,
            "lyra-inventario", str(raiz),
        ])
    return ocupados


def _link_ou_juncao(caminho: Path) -> bool:
    if caminho.is_symlink():
        return True
    if not caminho.exists():
        return False
    atributos = getattr(caminho.lstat(), "st_file_attributes", 0)
    return bool(atributos & getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400))


def _renomear_sem_sobrescrever(origem: Path, destino: Path) -> None:
    if destino.exists() or destino.is_symlink():
        raise ErroArtefatos(f"Destino já existe; nada foi sobrescrito: {destino.name}")
    if sys.platform == "win32":
        os.rename(origem, destino)
        return
    libc = ctypes.CDLL(None, use_errno=True)
    renomear = getattr(libc, "renameat2", None)
    if renomear is None:
        raise ErroArtefatos("O sistema não oferece rename atômico sem sobrescrita.")
    renomear.argtypes = [ctypes.c_int, ctypes.c_char_p, ctypes.c_int, ctypes.c_char_p, ctypes.c_uint]
    renomear.restype = ctypes.c_int
    if renomear(-100, os.fsencode(origem), -100, os.fsencode(destino), 1) != 0:
        codigo = ctypes.get_errno()
        if codigo not in SEM_SUPORTE_A_NAO_SOBRESCREVER:
            raise OSError(codigo, os.strerror(codigo), str(destino))
        _renomear_sem_renameat2(origem, destino)


# Erros de quem não aceita RENAME_NOREPLACE: o disco do Windows montado no
# WSL2 (/mnt/<letra>, DrvFS) responde EINVAL, conferido em 20/11/2026.
SEM_SUPORTE_A_NAO_SOBRESCREVER = {errno.EINVAL, errno.ENOSYS, errno.EOPNOTSUPP}


def _renomear_sem_renameat2(origem: Path, destino: Path) -> None:
    """Mesma garantia sem RENAME_NOREPLACE.

    Arquivo: o hard link falha sozinho se o destino existir (nada é
    sobrescrito) e só então a origem sai. Pasta (link não serve para pastas):
    o destino é conferido ausente e a pasta renomeada; no Linux, renomear
    sobre uma pasta com conteúdo falha, e o chamador já detém o lease
    exclusivo do gerenciador durante a alternância.
    """
    if origem.is_dir() and not origem.is_symlink():
        if destino.exists() or destino.is_symlink():
            raise ErroArtefatos(f"Destino já existe; nada foi sobrescrito: {destino.name}")
        os.rename(origem, destino)
        return
    try:
        os.link(origem, destino, follow_symlinks=False)
    except FileExistsError as erro:
        raise ErroArtefatos(f"Destino já existe; nada foi sobrescrito: {destino.name}") from erro
    os.unlink(origem)


class GerenciadorArtefatos:
    def __init__(self, raiz: str | Path):
        entrada = Path(raiz).absolute()
        for parte in (entrada, *entrada.parents):
            if _link_ou_juncao(parte):
                raise ErroArtefatos("A raiz não pode atravessar link ou junção.")
        if not entrada.is_dir():
            raise ErroArtefatos("A raiz precisa ser um diretório real existente.")
        self.raiz = entrada.resolve(strict=True)
        self.base = self._caminho(".lyra-run/artifacts")
        self.lock = self._caminho(".lyra-run/artifacts/lock.json")
        self.manifesto = self._caminho(".lyra-run/artifacts/active.json")
        self.journal = self._caminho(".lyra-run/artifacts/journal.json")
        self.identidade = self._caminho(".lyra-run/artifacts/identity.json")
        self._lease: dict | None = None
        self._thread_lease: int | None = None

    def _caminho(self, relativo: str) -> Path:
        partes = Path(relativo).parts
        if not partes or Path(relativo).is_absolute() or any(
            parte in ("..", ".") for parte in partes
        ):
            raise ErroArtefatos("Caminho de artefato inválido.")
        caminho = self.raiz.joinpath(*partes)
        atual = self.raiz
        for parte in partes:
            atual /= parte
            if _link_ou_juncao(atual):
                raise ErroArtefatos("Caminho de controle ou artefato contém link/junção.")
        if not caminho.resolve(strict=False).is_relative_to(self.raiz):
            raise ErroArtefatos("Caminho escaparia da raiz real.")
        return caminho

    def _relativo(self, caminho: Path) -> str:
        return caminho.relative_to(self.raiz).as_posix()

    @staticmethod
    def _plataforma(valor: str) -> str:
        if valor not in PLATAFORMAS:
            raise ErroArtefatos("Plataforma deve ser linux ou windows.")
        return valor

    def _ler_json(self, caminho: Path) -> dict:
        self._caminho(self._relativo(caminho))
        try:
            valor = json.loads(caminho.read_text(encoding="utf-8"))
        except (OSError, ValueError) as erro:
            raise ErroArtefatos(f"Metadado inválido: {caminho.name}") from erro
        if not isinstance(valor, dict):
            raise ErroArtefatos(f"Metadado não é objeto: {caminho.name}")
        return valor

    def _identidade_raiz(self, criar: bool = False) -> str | None:
        if not self.identidade.exists():
            if not criar:
                return None
            self._gravar_json(self.identidade, {"versao": 1, "id": uuid.uuid4().hex})
        identidade = self._ler_json(self.identidade)
        identificador = identidade.get("id")
        if identidade.get("versao") != 1 or not isinstance(identificador, str) or not re.fullmatch(r"[0-9a-f]{32}", identificador):
            raise ErroArtefatos("Identidade do checkout inválida; preservada.")
        return identificador

    def _gravar_json(self, caminho: Path, valor: dict) -> None:
        self._caminho(self._relativo(caminho))
        caminho.parent.mkdir(parents=True, exist_ok=True)
        temporario = self._caminho(self._relativo(caminho) + "." + uuid.uuid4().hex)
        try:
            with temporario.open("x", encoding="utf-8") as saida:
                json.dump(valor, saida, ensure_ascii=False, indent=2)
                saida.write("\n")
                saida.flush()
                os.fsync(saida.fileno())
            os.replace(temporario, caminho)
        finally:
            temporario.unlink(missing_ok=True)

    def _bloqueios_app(self) -> list[str]:
        candidatos = [
            ".lyra-run/app.json", ".lyra-run/app.pid",
            ".lyra-run-windows/app.json", ".lyra-run-windows/app.pid",
        ]
        estado = self._caminho(".lyra-run")
        if estado.is_dir():
            for pasta in estado.iterdir():
                if pasta.name == "artifacts":
                    continue
                if pasta.is_dir():
                    candidatos.extend(
                        f".lyra-run/{pasta.name}/{nome}" for nome in ("app.json", "app.pid")
                    )
        return [relativo for relativo in candidatos if self._caminho(relativo).exists()]

    def _exigir_parado(self) -> None:
        if self._bloqueios_app():
            raise ErroArtefatos(
                "Há estado de aplicação atual ou legado. Prove a parada e trate "
                "o estado no orquestrador proprietário antes de alternar artefatos."
            )
        if processos_checkout(self.raiz):
            raise ErroArtefatos("Há processo vivo usando o checkout, mesmo sem estado; alternância recusada.")

    @contextlib.contextmanager
    def _exclusao(self) -> Iterator[None]:
        if self._lease is not None:
            if (
                self._thread_lease != threading.get_ident()
                or self._lease["pid"] != os.getpid()
                or self._lease["inicio_processo"] != inicio_processo_atual()
                or not self.lock.exists()
                or self._ler_json(self.lock) != self._lease
            ):
                raise ErroArtefatos("Lease não pertence a este processo/thread ou foi alterado.")
            yield
            return
        self._caminho(".lyra-run/artifacts")
        self.base.mkdir(parents=True, exist_ok=True)
        identidade = {
            "token": uuid.uuid4().hex, "pid": os.getpid(),
            "plataforma": plataforma_atual(), "inicio_processo": inicio_processo_atual(),
        }
        try:
            descritor = os.open(self.lock, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        except FileExistsError as erro:
            raise ErroArtefatos("Lock existente preservado; outra operação ou recuperação exige atenção.") from erro
        try:
            with os.fdopen(descritor, "w", encoding="utf-8") as saida:
                json.dump(identidade, saida)
                saida.flush()
                os.fsync(saida.fileno())
            self._lease = identidade
            self._thread_lease = threading.get_ident()
            yield
        finally:
            try:
                if self.lock.exists() and self._ler_json(self.lock) == identidade:
                    self.lock.unlink()
            finally:
                self._lease = None
                self._thread_lease = None

    @contextlib.contextmanager
    def transacao(self) -> Iterator[GerenciadorArtefatos]:
        """Mantém exclusão global durante preparo, build e registro da aplicação.

        Use o mesmo gerenciador para chamar ativar/recuperar dentro do bloco.
        A reentrada é limitada ao mesmo processo e thread; outra instância,
        inclusive no mesmo processo, continua bloqueada. O chamador registra
        o estado da aplicação antes de sair. Exceções liberam somente seu lock,
        preservando artefatos, journal e qualquer estado de aplicação criado.
        """
        with self._exclusao():
            yield self

    def status(self) -> dict:
        ativo = self._ler_json(self.manifesto) if self.manifesto.exists() else None
        return {
            "raiz": str(self.raiz), "ativo": ativo,
            "lock_existente": self.lock.exists(), "recuperacao_pendente": self.journal.exists(),
            "estados_app": self._bloqueios_app(),
            "artefatos_raiz": [nome for nome in ARTEFATOS if self._caminho(nome).exists()],
            "caches": {
                plataforma: [nome for nome in ARTEFATOS if self._caminho(
                    f".lyra-run/artifacts/{plataforma}/{nome}"
                ).exists()] for plataforma in PLATAFORMAS
            },
        }

    def _origem(self) -> str | None:
        if not self.manifesto.exists():
            return None
        manifesto = self._ler_json(self.manifesto)
        identidade = self._identidade_raiz()
        if identidade is None or manifesto.get("raiz_id") != identidade or manifesto.get("versao") != 1:
            raise ErroArtefatos("Manifesto pertence a outra raiz ou versão.")
        return self._plataforma(manifesto.get("plataforma", ""))

    def planejar(self, destino: str) -> dict:
        self._plataforma(destino)
        estado = self.status()
        origem = self._origem()
        return {
            "origem": origem, "destino": destino,
            "exige_comprovacao": origem is None and bool(estado["artefatos_raiz"]),
            "bloqueado": bool(estado["estados_app"] or estado["lock_existente"] or estado["recuperacao_pendente"]),
            "estado": estado,
        }

    def exigir_plataforma_ativa(self, destino: str) -> None:
        """Valida o runtime sob lease para reuso/stop sem alternar artefatos."""
        self._plataforma(destino)
        with self._exclusao():
            if self.journal.exists():
                raise ErroArtefatos("Recuperação explícita pendente; runtime não confirmado.")
            if self._origem() != destino:
                raise ErroArtefatos("A plataforma ativa não corresponde ao runtime solicitado.")

    def _validar_comprovacao(self, prova: ComprovacaoOrigem) -> str:
        origem = self._plataforma(prova.plataforma)
        if origem != plataforma_atual():
            raise ErroArtefatos("A adoção inicial deve ser comprovada no próprio sistema de origem.")
        node = Path(prova.node_executavel)
        if not node.is_absolute() or not node.is_file():
            raise ErroArtefatos("A prova exige caminho absoluto de Node existente.")
        resposta = subprocess.run(
            [str(node), "-p", "process.platform"], capture_output=True,
            text=True, check=False, timeout=15, shell=False,
        )
        esperado = "win32" if origem == "windows" else "linux"
        if resposta.returncode != 0 or resposta.stdout.strip() != esperado:
            raise ErroArtefatos("O executável Node não corresponde à origem declarada.")
        lockfile = self._caminho("pnpm-lock.yaml")
        if not lockfile.is_file() or sha256(lockfile) != prova.lockfile_sha256:
            raise ErroArtefatos("Lockfile diverge da comprovação inicial.")
        necessarias = {"node_modules/.modules.yaml", "node_modules/.pnpm/lock.yaml"}
        if not necessarias.issubset(prova.evidencias):
            raise ErroArtefatos("Faltam evidências da instalação pnpm para adotar artefatos existentes.")
        for relativo, resumo in prova.evidencias.items():
            arquivo = self._caminho(relativo)
            if not arquivo.is_file() or sha256(arquivo) != resumo:
                raise ErroArtefatos("Evidência da origem ausente ou alterada.")
        modulos = self._caminho("node_modules/.modules.yaml").read_text(encoding="utf-8")
        try:
            instalacao = json.loads(modulos)
        except ValueError:
            linha = re.search(r"^storeDir:\s*(.+)$", modulos, re.MULTILINE)
            store = linha.group(1).strip("\"'") if linha else ""
        else:
            if not isinstance(instalacao, dict):
                raise ErroArtefatos("Metadado pnpm não é objeto; adoção recusada.")
            store = instalacao.get("storeDir", "")
        windows = isinstance(store, str) and bool(re.match(r"^[A-Za-z]:[\\/]", store))
        linux = isinstance(store, str) and store.startswith("/")
        if not ((origem == "windows" and windows) or (origem == "linux" and linux)):
            raise ErroArtefatos("O store pnpm não comprova a plataforma declarada.")
        return origem

    def ativar(self, destino: str, origem_comprovada: ComprovacaoOrigem | None = None) -> dict:
        self._plataforma(destino)
        with self._exclusao():
            self._exigir_parado()
            if self.journal.exists():
                raise ErroArtefatos("Recuperação explícita pendente antes de nova ativação.")
            origem = self._origem()
            anteriores = self._ler_json(self.manifesto) if self.manifesto.exists() else None
            existentes = [nome for nome in ARTEFATOS if self._caminho(nome).exists()]
            if origem is None and existentes:
                if origem_comprovada is None:
                    raise ErroArtefatos("Origem inicial desconhecida; adoção automática recusada.")
                origem = self._validar_comprovacao(origem_comprovada)
            if origem == destino and anteriores is not None:
                return {"alterado": False, "plataforma": destino}
            identidade = self._identidade_raiz(criar=True)
            movimentos = []
            if origem is not None and origem != destino:
                for nome in existentes:
                    alvo = f".lyra-run/artifacts/{origem}/{nome}"
                    if self._caminho(alvo).exists():
                        raise ErroArtefatos("Cache de origem já contém artefato; recusa sobrescrita.")
                    movimentos.append({"origem": nome, "destino": alvo})
            if origem != destino:
                for nome in ARTEFATOS:
                    fonte = f".lyra-run/artifacts/{destino}/{nome}"
                    if self._caminho(fonte).exists():
                        movimentos.append({"origem": fonte, "destino": nome})
            registro = {
                "versao": 1, "raiz": str(self.raiz), "raiz_id": identidade, "anterior": anteriores,
                "movimentos": movimentos, "concluidos": 0,
            }
            self._gravar_json(self.journal, registro)
            for indice, movimento in enumerate(movimentos):
                fonte = self._caminho(movimento["origem"])
                alvo = self._caminho(movimento["destino"])
                alvo.parent.mkdir(parents=True, exist_ok=True)
                _renomear_sem_sobrescrever(fonte, alvo)
                registro["concluidos"] = indice + 1
                self._gravar_json(self.journal, registro)
            self._gravar_json(self.manifesto, {
                "versao": 1, "raiz": str(self.raiz), "raiz_id": identidade, "plataforma": destino,
            })
            self.journal.unlink()
            return {"alterado": True, "plataforma": destino, "movimentos": len(movimentos)}

    def recuperar(self) -> dict:
        """Desfaz somente o journal conhecido; ambiguidades são preservadas."""
        with self._exclusao():
            self._exigir_parado()
            if not self.journal.exists():
                return {"recuperado": False}
            registro = self._ler_json(self.journal)
            identidade = self._identidade_raiz()
            if identidade is None or registro.get("raiz_id") != identidade or registro.get("versao") != 1:
                raise ErroArtefatos("Journal de outra raiz ou versão; preservado.")
            movimentos = registro.get("movimentos")
            if not isinstance(movimentos, list):
                raise ErroArtefatos("Journal inválido; preservado.")
            permitidos = set()
            for plataforma in PLATAFORMAS:
                for nome in ARTEFATOS:
                    cache = f".lyra-run/artifacts/{plataforma}/{nome}"
                    permitidos.update(((nome, cache), (cache, nome)))
            for movimento in movimentos:
                if not isinstance(movimento, dict) or (
                    movimento.get("origem"), movimento.get("destino")
                ) not in permitidos:
                    raise ErroArtefatos("Movimento fora do contrato; journal preservado.")
            concluidos = registro.get("concluidos")
            if not isinstance(concluidos, int) or not 0 <= concluidos <= len(movimentos):
                raise ErroArtefatos("Contagem do journal inválida; preservado.")
            # Uma queda pode ocorrer depois do rename e antes da confirmação.
            # Operações posteriores a essa fronteira nunca foram tentadas.
            tentados = movimentos[: min(concluidos + 1, len(movimentos))]
            for movimento in reversed(tentados):
                fonte = self._caminho(movimento["origem"])
                alvo = self._caminho(movimento["destino"])
                if fonte.exists() and not alvo.exists():
                    continue
                if not fonte.exists() and alvo.exists():
                    fonte.parent.mkdir(parents=True, exist_ok=True)
                    _renomear_sem_sobrescrever(alvo, fonte)
                    continue
                raise ErroArtefatos("Recuperação ambígua; ambos os caminhos foram preservados.")
            anterior = registro.get("anterior")
            if anterior is None:
                self.manifesto.unlink(missing_ok=True)
            elif isinstance(anterior, dict):
                self._gravar_json(self.manifesto, anterior)
            else:
                raise ErroArtefatos("Manifesto anterior inválido; journal preservado.")
            self.journal.unlink()
            return {"recuperado": True}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("acao", choices=("status", "planejar"))
    parser.add_argument("--raiz", default=str(Path(__file__).resolve().parents[1]))
    parser.add_argument("--destino", choices=PLATAFORMAS)
    argumentos = parser.parse_args()
    try:
        gerenciador = GerenciadorArtefatos(argumentos.raiz)
        if argumentos.acao == "planejar":
            if argumentos.destino is None:
                parser.error("planejar exige --destino")
            resultado = gerenciador.planejar(argumentos.destino)
        else:
            resultado = gerenciador.status()
        print(json.dumps(resultado, ensure_ascii=False, indent=2))
        return 0
    except ErroArtefatos as erro:
        print(f"[ERRO] {erro}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
