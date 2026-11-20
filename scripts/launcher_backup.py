"""Backup portátil verificável do MySQL e das fontes no checkout único."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import stat
import subprocess
import sys
import tarfile
import tempfile
import uuid
import zipfile
from datetime import UTC, datetime
from pathlib import Path, PurePosixPath

# Importado como `scripts.launcher_backup` (run_windows.py) ou executado como
# script (run.sh, `python3 scripts/launcher_backup.py`): o módulo irmão vem
# pelo pacote no primeiro caso e pelo diretório do script no segundo, sem
# carregar duas cópias de launcher_artifacts.
if __package__:
    from .launcher_artifacts import (
        GerenciadorArtefatos,
        _link_ou_juncao,
        _renomear_sem_sobrescrever,
        plataforma_atual,
    )
else:
    from launcher_artifacts import (  # type: ignore[no-redef]
        GerenciadorArtefatos,
        _link_ou_juncao,
        _renomear_sem_sobrescrever,
        plataforma_atual,
    )

# Recriados pelo MySQL a cada partida; não são dados do banco.
ARTEFATOS_DE_EXECUCAO_DO_MYSQL = ("mysql.sock",)
LIMITE_BYTES = 64 * 1024**3
LIMITE_ENTRADAS = 200_000
EXCLUIDOS = {
    ".git", "node_modules", ".next", ".lyra-run", ".lyra-run-windows",
    ".logs", "logs", "backups", ".venv", "__pycache__", ".pytest_cache",
}


class ErroBackup(RuntimeError):
    """Falha sem exposição de credenciais ou remoção de dados preservados."""


def caminho_seguro(nome: str) -> PurePosixPath:
    if not nome or "\\" in nome or ":" in nome or "\x00" in nome:
        raise ErroBackup("Caminho inválido no arquivo de backup.")
    partes = nome.split("/")
    if any(parte in ("", ".", "..") for parte in partes):
        raise ErroBackup("Caminho não canônico no arquivo de backup.")
    caminho = PurePosixPath(nome)
    if caminho.is_absolute() or any(parte.rstrip(". ") != parte for parte in partes):
        raise ErroBackup("Caminho absoluto ou ambíguo no arquivo de backup.")
    reservados = {"con", "prn", "aux", "nul", *(f"com{i}" for i in range(1, 10)), *(f"lpt{i}" for i in range(1, 10))}
    if any(parte.split(".")[0].lower() in reservados for parte in partes):
        raise ErroBackup("Nome reservado no arquivo de backup.")
    return caminho


def excluido(relativo: PurePosixPath) -> bool:
    return any(parte.lower() in EXCLUIDOS for parte in relativo.parts) or any(
        parte.lower().startswith(("lyra-backup-", ".lyra-backup-")) for parte in relativo.parts
    ) or relativo.name.endswith(".tsbuildinfo") or str(relativo) in {
        "next-env.d.ts", "public/offline-assets.json",
    }


def inventario_tar(arquivo: Path) -> dict:
    inventario = {}
    vistos = set()
    total = 0
    try:
        with tarfile.open(arquivo, "r:*") as pacote:
            for entrada in pacote:
                nome = entrada.name.removeprefix("./").rstrip("/")
                if nome in ("", ".") and entrada.isdir():
                    continue
                caminho_seguro(nome)
                chave = nome.casefold()
                if chave in vistos:
                    raise ErroBackup("Entrada tar duplicada ou ambígua.")
                vistos.add(chave)
                if entrada.isdir():
                    continue
                if not entrada.isfile() or entrada.issym() or entrada.islnk():
                    raise ErroBackup("Tar contém link, dispositivo ou tipo não permitido.")
                total += entrada.size
                if total > LIMITE_BYTES or len(vistos) > LIMITE_ENTRADAS:
                    raise ErroBackup("Tar excede os limites de validação.")
                resumo = hashlib.sha256()
                fluxo = pacote.extractfile(entrada)
                if fluxo is None:
                    raise ErroBackup("Entrada tar não legível.")
                with fluxo:
                    while bloco := fluxo.read(1024 * 1024):
                        resumo.update(bloco)
                inventario[nome] = {
                    "tamanho": entrada.size, "sha256": resumo.hexdigest(),
                    "modo": entrada.mode & 0o777, "uid": entrada.uid, "gid": entrada.gid,
                }
    except (tarfile.TarError, OSError) as erro:
        raise ErroBackup("Tar do banco inválido ou ilegível.") from erro
    if not inventario:
        raise ErroBackup("O arquivo do banco está vazio.")
    return inventario


def validar_zip(arquivo: Path) -> dict:
    try:
        with zipfile.ZipFile(arquivo) as pacote:
            entradas = pacote.infolist()
            if len(entradas) > LIMITE_ENTRADAS:
                raise ErroBackup("ZIP excede o limite de entradas.")
            nomes = set()
            total = 0
            for entrada in entradas:
                caminho_seguro(entrada.filename)
                if entrada.filename.casefold() in nomes or entrada.is_dir():
                    raise ErroBackup("ZIP contém entrada duplicada, ambígua ou diretório explícito.")
                nomes.add(entrada.filename.casefold())
                modo = entrada.external_attr >> 16
                if stat.S_ISLNK(modo) or (stat.S_IFMT(modo) not in (0, stat.S_IFREG)):
                    raise ErroBackup("ZIP contém link ou tipo não permitido.")
                total += entrada.file_size
                if total > LIMITE_BYTES:
                    raise ErroBackup("ZIP excede o tamanho descompactado permitido.")
            if "manifesto.json" not in pacote.namelist() or pacote.getinfo("manifesto.json").file_size > 16 * 1024**2:
                raise ErroBackup("Manifesto ausente ou excessivo.")
            manifesto = json.loads(pacote.read("manifesto.json"))
            if not isinstance(manifesto, dict) or manifesto.get("versao") != 1 or manifesto.get("tipo") not in ("banco", "full"):
                raise ErroBackup("Manifesto de backup incompatível.")
            if not re.fullmatch(r"[0-9a-f]{32}", str(manifesto.get("raiz_id", ""))):
                raise ErroBackup("Identidade da raiz inválida no manifesto.")
            arquivos = manifesto.get("arquivos")
            if not isinstance(arquivos, dict) or set(arquivos) != set(pacote.namelist()) - {"manifesto.json"}:
                raise ErroBackup("Entradas ZIP divergem do manifesto.")
            if "banco/volume.tar" not in arquivos:
                raise ErroBackup("Backup sem arquivo do banco.")
            for nome, esperado in arquivos.items():
                if nome != "banco/volume.tar" and (
                    manifesto["tipo"] != "full" or not nome.startswith("app/") or excluido(caminho_seguro(nome[4:]))
                ):
                    raise ErroBackup("Arquivo fora do escopo permitido do backup.")
                if not isinstance(esperado, dict) or type(esperado.get("tamanho")) is not int or esperado["tamanho"] != pacote.getinfo(nome).file_size:
                    raise ErroBackup("Tamanho do arquivo diverge do manifesto.")
                resumo = hashlib.sha256()
                with pacote.open(nome) as fluxo:
                    for bloco in iter(lambda: fluxo.read(1024 * 1024), b""):
                        resumo.update(bloco)
                if resumo.hexdigest() != esperado.get("sha256"):
                    raise ErroBackup("SHA-256 do arquivo diverge do manifesto.")
            banco = manifesto.get("banco")
            if not isinstance(banco, dict) or not isinstance(banco.get("inventario"), dict):
                raise ErroBackup("Manifesto sem inventário verificável do banco.")
            return manifesto
    except (OSError, zipfile.BadZipFile, ValueError, KeyError) as erro:
        raise ErroBackup("ZIP inválido, corrompido ou ilegível.") from erro


class MotorBackup:
    def __init__(self, raiz: str | Path, node: str | Path, gerenciador=None):
        self.gerenciador = gerenciador or GerenciadorArtefatos(raiz)
        self.raiz = self.gerenciador.raiz
        if self.raiz != Path(raiz).resolve():
            raise ErroBackup("Gerenciador pertence a outra raiz.")
        self.node = Path(node)
        if not self.node.is_absolute() or not self.node.is_file():
            raise ErroBackup("Informe o executável Node absoluto da plataforma.")
        esperado = "win32" if plataforma_atual() == "windows" else "linux"
        if self._executar([str(self.node), "-p", "process.platform"]).decode().strip() != esperado:
            raise ErroBackup("Node pertence a outra plataforma.")
        self.script_mysql = self.gerenciador._caminho("scripts/mysql-upgrade.mjs")
        if not self.script_mysql.is_file():
            raise ErroBackup("Script real de backup MySQL ausente.")

    def _executar(self, argumentos: list[str], entrada=None, saida=None) -> bytes:
        try:
            resultado = subprocess.run(
                argumentos, cwd=self.raiz, stdin=entrada, stdout=saida or subprocess.PIPE,
                stderr=subprocess.PIPE, timeout=3600, shell=False, check=False,
            )
        except (OSError, subprocess.SubprocessError) as erro:
            raise ErroBackup("Operação de backup indisponível; dados preservados.") from erro
        if resultado.returncode:
            # O diagnóstico precisa da causa real: as últimas linhas do stderr
            # (Docker e mysql-upgrade não imprimem senhas), sem os argumentos
            # completos, que podem conter caminhos e volumes do usuário.
            causa = " | ".join(
                linha.strip()
                for linha in (resultado.stderr or b"").decode("utf-8", errors="replace").splitlines()[-5:]
                if linha.strip()
            )
            etapa = Path(argumentos[1]).name if argumentos[0] != "docker" and len(argumentos) > 1 else "docker " + argumentos[1]
            raise ErroBackup(
                f"Operação de backup falhou em {etapa} (código {resultado.returncode})"
                + (f": {causa}" if causa else "; sem mensagem de erro do comando.")
            )
        return resultado.stdout or b""

    def _docker(self, argumentos: list[str], **opcoes) -> bytes:
        return self._executar(["docker", *argumentos], **opcoes)

    def _configuracao(self) -> dict:
        config = json.loads(self._docker([
            "compose", "--env-file", str(self.raiz / ".env.local"), "config", "--format", "json",
        ]))
        mysql = config.get("services", {}).get("mysql", {})
        montagem = next((v for v in mysql.get("volumes", []) if v.get("target") == "/var/lib/mysql" and v.get("type") == "volume"), None)
        volume = config.get("volumes", {}).get(montagem["source"], {}).get("name") if montagem else None
        imagem = mysql.get("image")
        if not isinstance(volume, str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]+", volume):
            raise ErroBackup("Volume MySQL não resolvido com segurança.")
        if not isinstance(imagem, str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_./:@-]+", imagem):
            raise ErroBackup("Imagem MySQL não resolvida com segurança.")
        return {"volume": volume, "imagem": imagem}

    def _volumes(self) -> set[str]:
        return set(self._docker(["volume", "ls", "--format", "{{.Name}}"]).decode().splitlines())

    def _snapshot(self, config: dict) -> str:
        anteriores = self._volumes()
        esperado = config["volume"] + "_backup_" + datetime.now(UTC).strftime("%Y%m%dT%H%M%S")
        if esperado in anteriores:
            raise ErroBackup("Já existe snapshot desse segundo; repita em outro instante.")
        retorno = self._executar([str(self.node), str(self.script_mysql), "--backup"]).decode("utf-8", errors="replace")
        encontrados = re.findall(r"^\[mysql-upgrade\] BACKUP_VOLUME=([A-Za-z0-9_.-]+)$", retorno, re.MULTILINE)
        if len(encontrados) != 1 or encontrados[0] in anteriores or not encontrados[0].startswith(config["volume"] + "_backup_"):
            raise ErroBackup("Snapshot novo não comprovado; operação interrompida.")
        volume = encontrados[0]
        if volume not in self._volumes():
            raise ErroBackup("Snapshot declarado não existe no Docker.")
        return volume

    def _exportar(self, volume: str, imagem: str, arquivo: Path) -> None:
        # O entrypoint do MySQL cria a cada partida o link `mysql.sock` no
        # diretório de dados, apontando para o socket em /var/run/mysqld: é
        # artefato de execução, não dado, e a validação recusa links. Fica de
        # fora só ele; qualquer outro link continua recusado na validação.
        exclusoes = [f"--exclude=./{nome}" for nome in ARTEFATOS_DE_EXECUCAO_DO_MYSQL]
        with arquivo.open("xb") as saida:
            self._docker([
                "run", "--rm", "--network", "none", "--read-only", "--security-opt", "no-new-privileges:true",
                "--entrypoint", "tar", "--mount", f"type=volume,src={volume},dst=/dados,readonly",
                imagem, "--numeric-owner", *exclusoes, "-C", "/dados", "-cpf", "-", ".",
            ], saida=saida)

    def _fontes(self):
        for pasta, diretorios, arquivos in os.walk(self.raiz, followlinks=False):
            base = Path(pasta)
            diretorios[:] = [nome for nome in diretorios if not excluido(PurePosixPath((base / nome).relative_to(self.raiz).as_posix()))]
            for nome in [*diretorios, *arquivos]:
                arquivo = base / nome
                relativo = PurePosixPath(arquivo.relative_to(self.raiz).as_posix())
                if excluido(relativo):
                    continue
                if _link_ou_juncao(arquivo):
                    raise ErroBackup("Fonte contém link/junção; backup full exige origem real.")
                if arquivo.is_file():
                    caminho_seguro(str(relativo))
                    yield arquivo, "app/" + str(relativo)

    def _verificar_storage(self) -> None:
        env = self.raiz / ".env.local"
        texto = env.read_text(encoding="utf-8") if env.exists() else ""
        configurado = re.search(r"^\s*LYRA_STORAGE_DIR\s*=\s*(.+)$", texto, re.MULTILINE)
        valor = os.environ.get("LYRA_STORAGE_DIR") or (configurado.group(1).strip().strip("\"'") if configurado else "")
        if valor:
            destino = Path(valor)
            destino = destino if destino.is_absolute() else self.raiz / destino
            if not destino.resolve().is_relative_to(self.raiz) or excluido(PurePosixPath(destino.resolve().relative_to(self.raiz).as_posix())):
                raise ErroBackup("Armazenamento externo/excluído exige plano específico; full recusado para não omitir anexos.")

    def _empacotar(self, tipo: str, tar: Path, config: dict, snapshot: str, inventario: dict) -> Path:
        carimbo = datetime.now(UTC).strftime("%Y%m%dT%H%M%S%fZ")
        destino = self.raiz / f"lyra-backup-{tipo}-{carimbo}.zip"
        parcial = self.raiz / f".lyra-backup-{uuid.uuid4().hex}.partial"
        manifesto = {
            "versao": 1, "tipo": tipo, "criado_em": datetime.now(UTC).isoformat(),
            "raiz_id": self.gerenciador._identidade_raiz(criar=True),
            "banco": {**config, "volume_snapshot": snapshot, "inventario": inventario}, "arquivos": {},
        }
        with parcial.open("xb") as handle:
            os.chmod(parcial, 0o600)
            with zipfile.ZipFile(handle, "w", compression=zipfile.ZIP_DEFLATED, allowZip64=True) as pacote:
                fontes = [(tar, "banco/volume.tar")]
                if tipo == "full":
                    fontes.extend(self._fontes())
                for arquivo, nome in fontes:
                    antes = arquivo.stat()
                    resumo = hashlib.sha256()
                    tamanho = 0
                    info = zipfile.ZipInfo(nome)
                    info.compress_type = zipfile.ZIP_DEFLATED
                    info.external_attr = (stat.S_IFREG | (antes.st_mode & 0o777)) << 16
                    with arquivo.open("rb") as entrada, pacote.open(info, "w", force_zip64=True) as saida:
                        for bloco in iter(lambda: entrada.read(1024 * 1024), b""):
                            resumo.update(bloco)
                            tamanho += len(bloco)
                            saida.write(bloco)
                    depois = arquivo.stat()
                    if (antes.st_size, antes.st_mtime_ns) != (depois.st_size, depois.st_mtime_ns):
                        raise ErroBackup("Fonte mudou durante o backup; arquivo parcial preservado.")
                    manifesto["arquivos"][nome] = {"tamanho": tamanho, "sha256": resumo.hexdigest()}
                pacote.writestr("manifesto.json", json.dumps(manifesto, ensure_ascii=False))
        validar_zip(parcial)
        _renomear_sem_sobrescrever(parcial, destino)
        return destino

    def backup(self, tipo: str) -> Path:
        if tipo not in ("banco", "full"):
            raise ErroBackup("Tipo de backup deve ser banco ou full.")
        with self.gerenciador.transacao():
            if tipo == "full":
                self._verificar_storage()
            config = self._configuracao()
            snapshot = self._snapshot(config)
            with tempfile.TemporaryDirectory(prefix=".lyra-backup-", dir=self.raiz) as pasta:
                tar = Path(pasta) / "volume.tar"
                self._exportar(snapshot, config["imagem"], tar)
                inventario = inventario_tar(tar)
                return self._empacotar(tipo, tar, config, snapshot, inventario)

    def _stage(self, tar: Path, config: dict, raiz_id: str) -> str:
        token = uuid.uuid4().hex
        volume = "lyra_restore_" + token
        if volume in self._volumes():
            raise ErroBackup("Volume de restauração já existe; nada foi importado.")
        self._docker(["volume", "create", "--label", f"lyra.backup.owner={token}", "--label", f"lyra.backup.raiz={raiz_id}", volume])
        try:
            return self._preencher_stage(volume, token, tar, config, raiz_id)
        except Exception:
            # O stage incompleto é só deste motor (rótulo com o token desta
            # operação) e não tem dado que não esteja no backup: sai junto
            # com a falha. Sem posse comprovada, nada é removido.
            try:
                self._provar_stage(volume, token, raiz_id)
                self._docker(["volume", "rm", volume])
            except ErroBackup:
                pass
            raise

    def _preencher_stage(self, volume: str, token: str, tar: Path, config: dict, raiz_id: str) -> str:
        self._provar_stage(volume, token, raiz_id)
        with tar.open("rb") as entrada:
            # `-i` liga a entrada padrão ao contêiner: sem ele o tar recebia
            # um fluxo vazio ("does not look like a tar archive").
            self._docker([
                "run", "-i", "--rm", "--network", "none", "--read-only", "--security-opt", "no-new-privileges:true",
                "--entrypoint", "tar", "--mount", f"type=volume,src={volume},dst=/dados",
                config["imagem"], "--numeric-owner", "-C", "/dados", "-xpf", "-",
            ], entrada=entrada)
        self._provar_stage(volume, token, raiz_id)
        verificado = tar.parent / "stage-verificado.tar"
        self._exportar(volume, config["imagem"], verificado)
        if inventario_tar(tar) != inventario_tar(verificado):
            raise ErroBackup("Volume stage diverge do tar; destino original preservado.")
        return volume

    def _provar_stage(self, volume: str, token: str, raiz_id: str) -> None:
        registros = json.loads(self._docker(["volume", "inspect", volume]))
        if len(registros) != 1 or registros[0].get("Labels", {}).get("lyra.backup.owner") != token or registros[0].get("Labels", {}).get("lyra.backup.raiz") != raiz_id:
            raise ErroBackup("Propriedade do volume stage não comprovada.")
        if self._docker(["ps", "--filter", f"volume={volume}", "--format", "{{.ID}}"]).strip():
            raise ErroBackup("Volume stage está em uso; restauração recusada.")

    def _restaurar_fontes(self, arquivo: Path, manifesto: dict) -> None:
        with zipfile.ZipFile(arquivo) as pacote:
            # Pré-carrega todos os bytes antes de substituir o próprio script.
            dados = {nome[4:]: pacote.read(nome) for nome in manifesto["arquivos"] if nome.startswith("app/")}
            for relativo in dados:
                destino = self.gerenciador._caminho(relativo)
                if destino.exists() and not destino.is_file():
                    raise ErroBackup("Arquivo de restauração colide com diretório existente.")
            for relativo, conteudo in dados.items():
                destino = self.gerenciador._caminho(relativo)
                destino.parent.mkdir(parents=True, exist_ok=True)
                temporario = destino.with_name(".lyra-backup-" + uuid.uuid4().hex + ".partial")
                with temporario.open("xb") as saida:
                    saida.write(conteudo)
                    saida.flush()
                    os.fsync(saida.fileno())
                modo = (pacote.getinfo("app/" + relativo).external_attr >> 16) & 0o777
                os.chmod(temporario, modo or 0o600)
                os.replace(temporario, destino)

    def restaurar(self, arquivo: str | Path, confirmar: bool = False) -> dict:
        if not confirmar:
            raise ErroBackup("Restauração exige confirmação explícita.")
        origem = Path(arquivo)
        if _link_ou_juncao(origem) or not origem.is_file():
            raise ErroBackup("Backup precisa ser arquivo real existente.")
        manifesto = validar_zip(origem)
        with self.gerenciador.transacao():
            self.gerenciador._exigir_parado()
            if self.gerenciador._identidade_raiz() != manifesto["raiz_id"]:
                raise ErroBackup("Backup pertence a outro checkout; restauração recusada.")
            config = self._configuracao()
            if any(manifesto["banco"].get(chave) != config[chave] for chave in ("imagem", "volume")):
                raise ErroBackup("Imagem/volume atual diverge do backup; exige migração explícita.")
            with tempfile.TemporaryDirectory(prefix=".lyra-backup-", dir=self.raiz) as pasta:
                tar = Path(pasta) / "volume.tar"
                with zipfile.ZipFile(origem) as pacote, pacote.open("banco/volume.tar") as entrada, tar.open("xb") as saida:
                    for bloco in iter(lambda: entrada.read(1024 * 1024), b""):
                        saida.write(bloco)
                if inventario_tar(tar) != manifesto["banco"]["inventario"]:
                    raise ErroBackup("Inventário tar diverge do manifesto; nada restaurado.")
                # Validação completa precede qualquer alteração de fontes ou banco.
                anterior = self.backup("full")
                preservado = validar_zip(anterior)
                stage = self._stage(tar, config, manifesto["raiz_id"])
                self._executar([str(self.node), str(self.script_mysql), "--restaurar", stage])
                try:
                    if manifesto["tipo"] == "full":
                        self._restaurar_fontes(origem, manifesto)
                except Exception as erro:
                    self._restaurar_fontes(anterior, preservado)
                    self._executar([
                        str(self.node), str(self.script_mysql), "--restaurar", preservado["banco"]["volume_snapshot"],
                    ])
                    raise ErroBackup("Restauração das fontes falhou; estado anterior restaurado a partir do backup preservado.") from erro
                return {"restaurado": True, "backup_anterior": str(anterior), "volume_stage": stage}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raiz", required=True)
    parser.add_argument("--node", required=True)
    parser.add_argument("--tipo", choices=("banco", "full"), default="full")
    parser.add_argument("--arquivo")
    parser.add_argument("acao", choices=("backup", "restaurar"))
    parser.add_argument("--confirmar", action="store_true")
    argumentos = parser.parse_args()
    try:
        motor = MotorBackup(argumentos.raiz, argumentos.node)
        if argumentos.acao == "backup":
            print(json.dumps({"backup": str(motor.backup(argumentos.tipo))}, ensure_ascii=False))
        else:
            if not argumentos.arquivo:
                parser.error("restaurar exige --arquivo")
            print(json.dumps(motor.restaurar(argumentos.arquivo, argumentos.confirmar), ensure_ascii=False))
        return 0
    except (ErroBackup, OSError, ValueError, RuntimeError) as erro:
        print(f"[ERRO] {erro}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
