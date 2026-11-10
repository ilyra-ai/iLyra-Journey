#!/usr/bin/env python3
"""Lyra MetaCare · launcher nativo Windows 11, Python 3.9+.

py run_windows.py COMANDO
  up [--prod]       ambiente, dependências, MySQL, migrations, memória e app
  app [--prod]      app, com MySQL existente saudável
  db                MySQL e migrations, preservando banco saudável existente
  migrate           migrations e bootstrap do administrador
  doctor | status   diagnóstico real, somente leitura
  logs [app|db|todos] [--seguir]
  stop [app|db|todos]   somente recursos com identidade comprovada
  fix               ambiente, dependências, banco e migrations
  repair [--sim]    reinstala artefatos Windows próprios; preserva banco
  purge --confirmar-purge   backup verificado e exclusão do banco local
  help              ajuda; sem comando abre menu em terminal interativo

Node Windows da versão de .nvmrc, Corepack e Docker Desktop são necessários.
LYRA_NODE_BIN permite escolher explicitamente outro node.exe Windows.
Não delega Bash/WSL. Estado isolado em .lyra-run/windows. Nenhum dono de
porta ocupada é encerrado. Artefatos de outro sistema são preservados.
"""

from __future__ import annotations

import argparse
import base64
import contextlib
import hashlib
import json
import os
import platform
import re
import shutil
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from collections.abc import Iterator, Sequence
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from scripts.launcher_artifacts import (
    ComprovacaoOrigem, ErroArtefatos, GerenciadorArtefatos, sha256,
)

RAIZ = Path(__file__).resolve().parent
ESTADO = RAIZ / ".lyra-run/windows"
LOGS = ESTADO / "logs"
APP_META = ESTADO / "app.json"
ARTEFATOS = ESTADO / "artifacts.json"
ENV_LOCAL = RAIZ / ".env.local"
COMANDOS_LEGADOS = {
    "dev": ("up",), "prod": ("up", "--prod"),
    "start-dev": ("app",), "start-prod": ("app", "--prod"),
    "db-start": ("db",), "db-stop": ("stop", "db"),
    "stop-app": ("stop", "app"), "stop-all": ("stop",),
    "setup-env": ("fix",), "install-deps": ("fix",), "health": ("doctor",),
}
MUTACOES = {"up", "app", "db", "migrate", "fix", "repair", "purge", "stop"}


class Falha(RuntimeError):
    """Falha operacional; nenhum resultado é inferido como sucesso."""


def mensagem(rotulo: str, texto: str) -> None:
    print(f"[{rotulo}] {texto}", file=sys.stderr if rotulo == "ERRO" else sys.stdout)


def traduzir_argumentos(argumentos: Sequence[str]) -> tuple[list[str] | None, str]:
    if not argumentos:
        return [], ""
    comando, *resto = argumentos
    if comando in ("-h", "--help"):
        return ["help"], ""
    if comando == "build":
        return None, "Use `up --prod` para compilar, iniciar e verificar o app."
    if comando in COMANDOS_LEGADOS:
        novos = [*COMANDOS_LEGADOS[comando], *resto]
        return novos, f"`{comando}` é legado; usando `{' '.join(novos)}`."
    return list(argumentos), ""


def ler_json(caminho: Path) -> dict[str, Any]:
    if not caminho.exists():
        return {}
    try:
        dados = json.loads(caminho.read_text(encoding="utf-8"))
        if not isinstance(dados, dict):
            raise ValueError("objeto JSON esperado")
        return dados
    except (ValueError, OSError) as erro:
        raise Falha(f"Estado inválido em {caminho}; preservado: {erro}") from erro


def gravar_json(caminho: Path, dados: dict[str, Any]) -> None:
    caminho.parent.mkdir(parents=True, exist_ok=True)
    temporario = caminho.with_suffix(".tmp")
    temporario.write_text(json.dumps(dados, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporario.replace(caminho)


def ler_env() -> dict[str, str]:
    dados: dict[str, str] = {}
    if ENV_LOCAL.exists():
        for linha in ENV_LOCAL.read_text(encoding="utf-8-sig").splitlines():
            linha = linha.strip()
            if linha and not linha.startswith("#") and "=" in linha:
                chave, valor = linha.split("=", 1)
                valor = valor.strip()
                if len(valor) >= 2 and valor[0] == valor[-1] and valor[0] in "\"'":
                    valor = valor[1:-1]
                dados[chave.strip()] = valor
    return dados


def atualizar_env(alteracoes: dict[str, str]) -> None:
    linhas = ENV_LOCAL.read_text(encoding="utf-8-sig").splitlines()
    restantes = dict(alteracoes)
    for indice, linha in enumerate(linhas):
        if "=" in linha and not linha.lstrip().startswith("#"):
            chave = linha.split("=", 1)[0].strip()
            if chave in alteracoes:
                linhas[indice] = f"{chave}={alteracoes[chave]}"
                restantes.pop(chave, None)
    linhas.extend(f"{chave}={valor}" for chave, valor in restantes.items())
    temporario = ENV_LOCAL.with_suffix(".windows.tmp")
    temporario.write_text("\n".join(linhas) + "\n", encoding="utf-8")
    temporario.replace(ENV_LOCAL)


def ambiente(extra: dict[str, str] | None = None) -> dict[str, str]:
    return {**os.environ, **ler_env(), "COREPACK_ENABLE_DOWNLOAD_PROMPT": "0", **(extra or {})}


def sanitizar(texto: str, variaveis: dict[str, str]) -> str:
    """Oculta credenciais herdadas, configuradas e estruturas usuais de autenticação."""
    valores = {str(valor) for chave, valor in variaveis.items() if valor
        and re.search(r"PASSWORD|SECRET|TOKEN|KEY|SENHA|SEGREDO|CREDENTIAL", chave, re.I)}
    for valor in sorted(valores, key=len, reverse=True):
        texto = texto.replace(valor, "[segredo oculto]")
    texto = re.sub(r"(https?://)[^\s/@:]+:[^\s/@]+@", r"\1[segredo oculto]@", texto)
    texto = re.sub(r"(?i)(authorization\s*[:=]\s*(?:bearer|basic)\s+)\S+", r"\1[segredo oculto]", texto)
    return texto


def registrar_comando(comando: Sequence[str], evento: str, variaveis: dict[str, str],
                      *, codigo: int | None = None, stdout: str = "", stderr: str = "") -> None:
    # Não persiste argv: PowerShell pode carregar programas codificados e CIM/
    # inspect podem devolver argumentos ou ambientes de processos de terceiros.
    executavel = Path(comando[0]).name
    sensivel = executavel.lower() in ("powershell.exe", "pwsh.exe") or (
        executavel.lower() in ("docker", "docker.exe") and "inspect" in comando)
    etapa = executavel
    if executavel.lower() in ("node", "node.exe") and len(comando) > 1:
        alvo = Path(comando[1])
        if alvo.parent == RAIZ / "scripts" and alvo.suffix == ".mjs":
            etapa += " · " + alvo.name
    entrada = {"instante": datetime.now(timezone.utc).isoformat(), "etapa": etapa,
        "evento": evento, "codigo": codigo,
        "stdout": "[saída de identidade omitida]" if sensivel else sanitizar(stdout, variaveis),
        "stderr": "[saída de identidade omitida]" if sensivel and stderr else sanitizar(stderr, variaveis)}
    try:
        LOGS.mkdir(parents=True, exist_ok=True)
        with (LOGS / f"comandos-{datetime.now().strftime('%Y%m%d')}-{os.getpid()}.jsonl").open(
                "a", encoding="utf-8") as arquivo:
            arquivo.write(json.dumps(entrada, ensure_ascii=False) + "\n")
    except OSError as erro:
        raise Falha("Não foi possível persistir o log operacional Windows.") from erro


def executar(comando: Sequence[str], *, exigir: bool = True, tempo: int = 600,
             extra: dict[str, str] | None = None) -> subprocess.CompletedProcess[str]:
    variaveis = ambiente(extra)
    if Path(comando[0]).name.lower() == "node.exe":
        variaveis["PATH"] = str(Path(comando[0]).parent) + os.pathsep + variaveis.get("PATH", "")
    registrar_comando(comando, "início", variaveis)
    try:
        resultado = subprocess.run(list(comando), cwd=RAIZ, env=variaveis,
            stdin=subprocess.DEVNULL, capture_output=True, encoding="utf-8", errors="replace",
            timeout=tempo, check=False, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
    except (OSError, subprocess.TimeoutExpired) as erro:
        detalhe = f"Tempo limite de {tempo}s excedido." if isinstance(erro, subprocess.TimeoutExpired) else f"Falha de execução ({type(erro).__name__})."
        registrar_comando(comando, "falha", variaveis, stderr=detalhe)
        raise Falha(f"Falha em {Path(comando[0]).name}: {detalhe}") from erro
    registrar_comando(comando, "fim", variaveis, codigo=resultado.returncode,
        stdout=resultado.stdout, stderr=resultado.stderr)
    if exigir and resultado.returncode:
        texto = sanitizar(resultado.stdout + resultado.stderr, variaveis)
        raise Falha(f"{Path(comando[0]).name}: código {resultado.returncode}\n{texto[-5000:]}")
    return resultado


def windows_nativo() -> None:
    if sys.platform != "win32" or sys.getwindowsversion().build < 22000:
        raise Falha("Exige Python nativo Windows 11. No WSL2 use ./run.sh.")


def powershell(codigo: str, extra: dict[str, str] | None = None) -> str:
    executavel = Path(os.environ.get("SystemRoot", r"C:\Windows")) / "System32/WindowsPowerShell/v1.0/powershell.exe"
    if not executavel.is_file():
        raise Falha("Windows PowerShell nativo ausente para consultar identidade CIM.")
    prefixo = "$ErrorActionPreference='Stop'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new(); "
    codificado = base64.b64encode((prefixo + codigo).encode("utf-16le")).decode("ascii")
    return executar([str(executavel), "-NoProfile", "-NonInteractive", "-EncodedCommand", codificado],
        tempo=30, extra=extra).stdout.strip()


def processos() -> list[dict[str, Any]]:
    texto = powershell("@(Get-CimInstance Win32_Process | Where-Object {$null -ne $_.CreationDate} | ForEach-Object { "
        "[PSCustomObject]@{pid=[int]$_.ProcessId; parent=[int]$_.ParentProcessId; "
        "created=$_.CreationDate.ToUniversalTime().ToString('o'); "
        "command=$_.CommandLine; executable=$_.ExecutablePath} }) | ConvertTo-Json -Compress")
    dados = json.loads(texto or "[]")
    return dados if isinstance(dados, list) else [dados]


def identidade_valida(meta: dict[str, Any], processo: dict[str, Any] | None) -> bool:
    if not processo or not all(meta.get(c) for c in ("created", "command", "executable")):
        return False
    return (meta.get("host") == platform.node() and meta.get("platform") == "windows"
        and os.path.normcase(str(meta.get("root", ""))) == os.path.normcase(str(RAIZ))
        and all(meta.get(c) == processo.get(c) for c in ("pid", "created", "command", "executable"))
        and str(RAIZ).casefold() in str(processo.get("command", "")).casefold())


def estado_app() -> dict[str, Any]:
    meta = ler_json(APP_META)
    if not meta:
        return {}
    if (not isinstance(meta.get("pid"), int) or isinstance(meta.get("pid"), bool)
            or meta["pid"] <= 0 or not identidade_valida(meta, meta)):
        raise Falha("Metadado de aplicação não comprova host, raiz e plataforma Windows próprios; estado preservado.")
    atual = next((p for p in processos() if p["pid"] == meta.get("pid")), None)
    if atual is None:
        return {}
    if not identidade_valida(meta, atual):
        raise Falha("PID não corresponde à criação CIM, comando, raiz e host. Processo preservado.")
    return meta


def parar_app() -> None:
    meta = estado_app()
    if not meta:
        registro = ler_json(APP_META)
        if registro:
            if (not isinstance(registro.get("pid"), int) or isinstance(registro.get("pid"), bool)
                    or registro["pid"] <= 0 or not identidade_valida(registro, registro)):
                raise Falha("Registro sem propriedade Windows comprovada; estado preservado.")
            if any(p["pid"] == registro["pid"] for p in processos()):
                raise Falha("PID reapareceu durante a conferência de parada; processo e registro preservados.")
            if ler_json(APP_META) != registro:
                raise Falha("Registro mudou durante a conferência de parada; estado preservado.")
            APP_META.unlink()
            mensagem("OK", "Registro Windows próprio obsoleto liberado após comprovar PID ausente; nenhum processo encerrado.")
            return
        mensagem("OK", "Nenhum app Windows próprio em execução.")
        return
    todos = processos()
    raiz_atual = next((p for p in todos if p["pid"] == meta["pid"]), None)
    if not identidade_valida(meta, raiz_atual):
        raise Falha("Identidade do processo raiz mudou antes de consultar a árvore; processos preservados.")
    ids = {int(meta["pid"])}
    while True:
        conhecidos = {p["pid"]: p for p in todos if p["pid"] in ids}
        novos = {p["pid"] for p in todos if p["parent"] in conhecidos
            and p["created"] >= conhecidos[p["parent"]]["created"]} - ids
        if not novos:
            break
        ids.update(novos)
    # Filhos somente pertencem à árvore se foram criados depois do pai.
    alvos = [p for p in todos if p["pid"] in ids and p["created"] >= meta["created"]]
    # Valida toda a árvore antes do primeiro encerramento, evitando parar parte
    # dela para só depois descobrir um filho sem prova de identidade.
    if any(not p.get("command") or not p.get("executable") for p in alvos):
        raise Falha("Árvore com processo sem identidade verificável; processos preservados.")
    for alvo in sorted(alvos, key=lambda p: p["pid"] == meta["pid"]):
        powershell("$p=Get-CimInstance Win32_Process -Filter ('ProcessId='+$env:LYRA_PID); "
            "if($p){if($p.CreationDate.ToUniversalTime().ToString('o') -ne $env:LYRA_CREATED "
            "-or $p.CommandLine -cne $env:LYRA_COMMAND -or $p.ExecutablePath -cne $env:LYRA_EXECUTABLE)"
            "{throw 'Identidade alterada; processo preservado'}; "
            "$owned=[Diagnostics.Process]::GetProcessById($p.ProcessId); try {"
            "$null=$owned.Handle; "
            "$expected=[DateTime]::Parse($env:LYRA_CREATED).ToUniversalTime().Ticks; "
            "$actual=$owned.StartTime.ToUniversalTime().Ticks; "
            "if(($actual-($actual%10)) -ne ($expected-($expected%10)))"
            "{throw 'PID reciclado antes de adquirir o handle; preservado'}; "
            "$owned.Kill(); if(-not $owned.WaitForExit(20000)){throw 'Processo não encerrou em 20s'}"
            "} finally {$owned.Dispose()}}",
            {"LYRA_PID": str(alvo["pid"]), "LYRA_CREATED": alvo["created"],
             "LYRA_COMMAND": alvo["command"], "LYRA_EXECUTABLE": alvo["executable"]})
    restantes = processos()
    if any(any(p["pid"] == alvo["pid"] and p["created"] == alvo["created"]
               for p in restantes) for alvo in alvos):
        raise Falha("Processos próprios ainda presentes após encerramento; estado mantido para diagnóstico.")
    APP_META.unlink(missing_ok=True)
    mensagem("OK", "App Windows próprio encerrado após conferência CIM.")


def node() -> str:
    caminho = os.environ.get("LYRA_NODE_BIN") or shutil.which("node.exe")
    if not caminho or not Path(caminho).is_file() or Path(caminho).suffix.lower() != ".exe":
        raise Falha("Node.exe ausente. Informe LYRA_NODE_BIN com o Node Windows de .nvmrc.")
    resultado = executar([caminho, "-p", "JSON.stringify({platform:process.platform,version:process.versions.node,exe:process.execPath})"])
    dados = json.loads(resultado.stdout)
    esperada = (RAIZ / ".nvmrc").read_text(encoding="utf-8").strip().lstrip("v")
    if dados["platform"] != "win32" or dados["version"] != esperada or str(dados["exe"]).startswith("\\\\"):
        raise Falha(f"Node Windows {esperada} exigido; encontrado {dados['platform']} {dados['version']}.")
    return dados["exe"]


def pnpm(*argumentos: str) -> list[str]:
    executavel = node()
    bases = [Path(executavel).parent, Path(os.environ.get("APPDATA", "")) / "npm"]
    candidatos = [base / "node_modules/corepack/dist/corepack.js" for base in bases]
    corepack = next((c for c in candidatos if c.is_file()), None)
    if corepack is None:
        raise Falha("Corepack Windows ausente; instale/ative no Node Windows.")
    return [executavel, str(corepack), "pnpm", *argumentos]


def docker(*argumentos: str, exigir: bool = True) -> subprocess.CompletedProcess[str]:
    caminho = shutil.which("docker.exe")
    if not caminho:
        raise Falha("Docker Desktop não encontrado no PATH Windows.")
    return executar([caminho, *argumentos], exigir=exigir)


def compose(*argumentos: str) -> subprocess.CompletedProcess[str]:
    return docker("compose", "--env-file", str(ENV_LOCAL), "--file", str(RAIZ / "compose.yaml"), *argumentos)


def pertence_projeto(item: dict[str, Any]) -> bool:
    etiquetas = item.get("Config", {}).get("Labels", {}) or {}
    raiz = str(etiquetas.get("com.docker.compose.project.working_dir", ""))
    raiz_wsl = "/mnt/" + RAIZ.drive.rstrip(":").lower() + RAIZ.as_posix()[2:]
    return raiz.replace("\\", "/").rstrip("/").casefold() in {
        RAIZ.as_posix().rstrip("/").casefold(), raiz_wsl.rstrip("/").casefold()}


def containers(servico: str) -> list[dict[str, Any]]:
    resultado = docker("ps", "-a", "--filter", f"label=com.docker.compose.service={servico}", "--format", "{{.ID}}")
    ids = resultado.stdout.split()
    return [i for i in json.loads(docker("inspect", *ids).stdout) if pertence_projeto(i)] if ids else []


def saude_container(item: dict[str, Any]) -> bool:
    estado = item.get("State", {})
    return bool(estado.get("Running") and estado.get("Health", {}).get("Status") == "healthy")


def porta_container(item: dict[str, Any], interna: str) -> int | None:
    ligacoes = item.get("NetworkSettings", {}).get("Ports", {}).get(interna) or []
    return int(ligacoes[0]["HostPort"]) if ligacoes else None


def reservar_porta(inicial: int) -> socket.socket:
    if inicial < 1024 or inicial > 65485:
        raise Falha("Porta inicial deve estar entre 1024 e 65485.")
    for porta in range(inicial, inicial + 50):
        reserva = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        if hasattr(socket, "SO_EXCLUSIVEADDRUSE"):
            reserva.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        try:
            reserva.bind(("127.0.0.1", porta))
            reserva.listen(1)
            return reserva
        except OSError:
            reserva.close()
    raise Falha(f"Sem porta livre a partir de {inicial}; nenhum processo encerrado.")


def consultar_http(url: str) -> tuple[int, str]:
    try:
        with urllib.request.urlopen(url, timeout=5) as resposta:
            return resposta.status, resposta.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as erro:
        return erro.code, ""
    except (OSError, urllib.error.URLError):
        return 0, ""


def verificar_artefatos(gerenciador: GerenciadorArtefatos | None = None) -> None:
    gerenciador = gerenciador or GerenciadorArtefatos(RAIZ)
    if gerenciador.manifesto.exists():
        gerenciador.exigir_plataforma_ativa("windows")
        return
    for estrangeiro in (RAIZ / ".lyra-run/linux/app.json", RAIZ / ".lyra-run/app.json", RAIZ / ".lyra-run-windows/app.pid"):
        if estrangeiro.exists():
            raise Falha(f"Estado estrangeiro/legado em {estrangeiro}. Confira e encerre pelo launcher de origem antes de compartilhar artefatos. Nenhum PID foi usado.")
    pacote = RAIZ / "node_modules/.pnpm"
    if pacote.exists():
        nomes = [p.name for p in pacote.iterdir()]
        if any(n.startswith("@next+swc-linux-") for n in nomes) and not any(n.startswith("@next+swc-win32-") for n in nomes):
            raise Falha("node_modules contém somente SWC Linux. Preserve-o fora deste checkout antes da instalação Windows.")
    marca = ler_json(ARTEFATOS)
    if marca and (marca.get("platform") != "windows" or marca.get("root") != str(RAIZ)):
        raise Falha("Propriedade dos artefatos não corresponde a este checkout Windows.")
    if (RAIZ / ".next").exists() and not marca:
        raise Falha(".next sem origem Windows comprovada: preserve o build fora deste checkout antes de iniciar outro.")


def preflight() -> None:
    windows_nativo()
    node()
    pnpm()
    docker("info", "--format", "{{.ServerVersion}}")
    versao = docker("compose", "version", "--short").stdout.strip().lstrip("v")
    if tuple(int(n) for n in re.findall(r"\d+", versao)[:2]) < (2, 20):
        raise Falha("Docker Compose 2.20+ necessário para aguardar saúde real.")


def script_node(nome: str, *argumentos: str, tempo: int = 600) -> str:
    caminho = RAIZ / "scripts" / nome
    if not caminho.is_file():
        raise Falha(f"Script obrigatório ausente: {caminho}")
    return executar([node(), str(caminho), *argumentos], tempo=tempo).stdout


def preparar_ambiente() -> None:
    script_node("env-init.mjs")
    env = ler_env()
    faltam = [c for c in ("MYSQL_DATABASE", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_ROOT_PASSWORD", "AUTH_SECRET", "ADMIN_BOOTSTRAP_PASSWORD") if not env.get(c)]
    if faltam:
        raise Falha("Ambiente incompleto: " + ", ".join(faltam))


def dependencias(forcar: bool = False, gerenciador: GerenciadorArtefatos | None = None) -> None:
    verificar_artefatos(gerenciador)
    lock = RAIZ / "pnpm-lock.yaml"
    instalado = RAIZ / "node_modules/.pnpm/lock.yaml"
    iguais = instalado.is_file() and hashlib.sha256(lock.read_bytes()).digest() == hashlib.sha256(instalado.read_bytes()).digest()
    if forcar or not iguais:
        executar(pnpm("install", "--frozen-lockfile"), tempo=1200)
    versao = executar(pnpm("--version")).stdout.strip()
    esperada = ler_json(RAIZ / "package.json")["packageManager"].split("@", 1)[1].split("+", 1)[0]
    if versao != esperada:
        raise Falha(f"pnpm {esperada} exigido; recebido {versao}.")
    executar([node(), "-e", "require('node:module').createRequire(require.resolve('next/package.json'))('@next/swc-win32-' + process.arch + '-msvc')"])
    gravar_json(ARTEFATOS, {"platform": "windows", "root": str(RAIZ), "host": platform.node(), "node": node()})


def dependencias_banco() -> None:
    """mysql2/bcryptjs são JavaScript puro; não exigem SWC nem build Next."""
    comando = [node(), "--input-type=module", "-e", "await import('mysql2/promise'); await import('bcryptjs')"]
    resultado = executar(comando, exigir=False)
    if resultado.returncode == 0:
        return
    if (RAIZ / "node_modules").exists():
        raise Falha("Dependências JavaScript de migrations não resolvem no Windows. Artefatos existentes preservados; instale dependências Windows em ambiente separado antes de migrar.")
    executar(pnpm("install", "--frozen-lockfile"), tempo=1200)
    executar(comando)


def banco(*, criar: bool = True) -> dict[str, Any]:
    existentes = containers("mysql")
    if len(existentes) > 1:
        raise Falha("Mais de um MySQL deste checkout; operação recusada.")
    if existentes:
        atual = existentes[0]
        if saude_container(atual):
            porta = porta_container(atual, "3306/tcp")
            if not porta:
                raise Falha("MySQL saudável sem porta publicada no host.")
            env = ler_env()
            if env.get("MYSQL_HOST_PORT", "3307") != str(porta) or env.get("MYSQL_PORT", "3307") != str(porta):
                atualizar_env({"MYSQL_HOST": "127.0.0.1", "MYSQL_PORT": str(porta), "MYSQL_HOST_PORT": str(porta)})
            mensagem("OK", f"MySQL saudável reutilizado na porta {porta}; sem recriação.")
            return atual
        if not criar or atual.get("State", {}).get("Running"):
            raise Falha("MySQL existente não saudável; preservado para diagnóstico.")
        docker("start", atual["Id"])
    elif criar:
        with reservar_porta(int(ler_env().get("MYSQL_HOST_PORT", "3307"))) as reserva:
            porta = reserva.getsockname()[1]
            atualizar_env({"MYSQL_HOST": "127.0.0.1", "MYSQL_PORT": str(porta), "MYSQL_HOST_PORT": str(porta)})
        compose("up", "-d", "--wait", "mysql")
    else:
        raise Falha("MySQL ausente; execute `py run_windows.py db`.")
    limite = time.monotonic() + 300
    while time.monotonic() < limite:
        encontrados = containers("mysql")
        if encontrados and saude_container(encontrados[0]):
            return banco(criar=False)
        time.sleep(3)
    raise Falha("MySQL sem saúde após 300s; dados preservados, consulte logs db.")


def migrations() -> None:
    banco(criar=False)
    script_node("mysql-migrate.mjs")
    script_node("verificar-banco.mjs")
    mensagem("OK", "Migrations, credenciais e bootstrap verificados pelos scripts oficiais.")


def memoria(porta_app: int) -> None:
    servicos = containers("memoria")
    if len(servicos) > 1:
        raise Falha("Mais de uma memória deste checkout; operação recusada.")
    if servicos:
        atual = servicos[0]
        configuracao = dict(i.split("=", 1) for i in atual["Config"].get("Env", []) if "=" in i)
        if configuracao.get("LYRA_MEMORIA_APP_URL") != f"http://host.docker.internal:{porta_app}":
            raise Falha(f"Memória existente usa callback {configuracao.get('LYRA_MEMORIA_APP_URL', '(ausente)')}, mas o app usaria a porta {porta_app}. Serviço e histórico preservados. A troca serial exige provar que o app anterior parou e reconfigurar somente o serviço memoria, mantendo o mesmo FalkorDB.")
        porta = porta_container(atual, "8000/tcp")
        if saude_container(atual) and porta and consultar_http(f"http://127.0.0.1:{porta}/saude")[0] == 200:
            mensagem("OK", "Memória saudável reutilizada.")
            return
        raise Falha("Memória existente não saudável; preservada para diagnóstico.")
    with reservar_porta(int(ler_env().get("LYRA_MEMORIA_PORTA", "8019"))) as reserva:
        porta = reserva.getsockname()[1]
        atualizar_env({"LYRA_MEMORIA_PORTA": str(porta), "LYRA_MEMORIA_APP_URL": f"http://host.docker.internal:{porta_app}"})
    compose("up", "-d", "--build", "--wait", "memoria")
    if consultar_http(f"http://127.0.0.1:{porta}/saude")[0] != 200:
        raise Falha("Memória não respondeu à verificação HTTP real.")


def iniciar_app(prod: bool) -> None:
    atual = estado_app()
    modo = "prod" if prod else "dev"
    if atual:
        if atual.get("mode") != modo:
            raise Falha("App próprio usa outro modo; pare-o explicitamente antes de alternar.")
        print(script_node("verificar-app.mjs", str(atual["port"])))
        return
    reserva = reservar_porta(int(os.environ.get("LYRA_APP_PORT", "3000")))
    porta = reserva.getsockname()[1]
    try:
        memoria(porta)
        if prod:
            executar(pnpm("build"), tempo=1800)
        cli = RAIZ / "node_modules/next/dist/bin/next"
        if not cli.is_file():
            raise Falha("CLI Next.js ausente nas dependências Windows.")
        LOGS.mkdir(parents=True, exist_ok=True)
        log = LOGS / f"app-{modo}-{datetime.now().strftime('%Y%m%d-%H%M%S')}.log"
        extra = {"PORT": str(porta), "PATH": str(Path(node()).parent) + os.pathsep + os.environ.get("PATH", "")}
        for chave in ("APP_BASE_URL", "NEXT_PUBLIC_APP_URL"):
            if re.fullmatch(r"https?://(?:localhost|127\.0\.0\.1)(?::\d+)?/?", ler_env().get(chave, "")):
                extra[chave] = f"http://localhost:{porta}"
        comando = [node(), str(cli), "start" if prod else "dev", "--port", str(porta), "--hostname", "127.0.0.1"]
        reserva.close()
        with log.open("w", encoding="utf-8") as registro:
            processo = subprocess.Popen(comando, cwd=RAIZ, env=ambiente(extra), stdin=subprocess.DEVNULL,
                stdout=registro, stderr=subprocess.STDOUT,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS | subprocess.CREATE_NO_WINDOW)
        identidade = next((p for p in processos() if p["pid"] == processo.pid), None)
        if not identidade or not identidade.get("command") or not identidade.get("executable"):
            raise Falha(f"App iniciou PID {processo.pid}, mas CIM indisponível; não será encerrado sem prova. Log {log}")
        gravar_json(APP_META, {**identidade, "root": str(RAIZ), "platform": "windows", "host": platform.node(),
            "port": porta, "mode": modo, "log": str(log), "started": datetime.now(timezone.utc).isoformat()})
        limite = time.monotonic() + 240
        while time.monotonic() < limite:
            if processo.poll() is not None:
                raise Falha(f"App encerrou código {processo.returncode}; consulte {log}. Nenhum dono de porta foi encerrado.")
            if consultar_http(f"http://127.0.0.1:{porta}/api/health")[0] == 200:
                print(script_node("verificar-app.mjs", str(porta)))
                mensagem("OK", f"App verificado em http://localhost:{porta} · PID {processo.pid}.")
                return
            time.sleep(2)
        raise Falha(f"App sem saúde após 240s; estado preservado, log {log}.")
    finally:
        reserva.close()


def remover_artefato(nome: str, gerenciador: GerenciadorArtefatos | None = None) -> None:
    if nome not in (".next", "node_modules"):
        raise Falha("Remoção restrita aos artefatos recriáveis do projeto.")
    verificar_artefatos(gerenciador)
    if ler_json(ARTEFATOS).get("host") != platform.node():
        raise Falha("Sem prova de propriedade Windows deste host; artefatos preservados.")
    caminho = RAIZ / nome
    if caminho.exists():
        if caminho.is_symlink() or caminho.resolve().parent != RAIZ.resolve():
            raise Falha("Artefato aponta para fora da raiz; remoção recusada.")
        shutil.rmtree(caminho)


@contextlib.contextmanager
def exclusao_mutua() -> Iterator[None]:
    import msvcrt
    ESTADO.mkdir(parents=True, exist_ok=True)
    with (ESTADO / "operation.lock").open("a+b") as arquivo:
        arquivo.seek(0)
        if os.fstat(arquivo.fileno()).st_size == 0:
            arquivo.write(b"0")
            arquivo.flush()
        arquivo.seek(0)
        try:
            msvcrt.locking(arquivo.fileno(), msvcrt.LK_NBLCK, 1)
        except OSError as erro:
            raise Falha("Outra operação Windows está em execução; aguarde.") from erro
        try:
            yield
        finally:
            arquivo.seek(0)
            msvcrt.locking(arquivo.fileno(), msvcrt.LK_UNLCK, 1)


def diagnostico() -> int:
    falhas = 0
    for nome, verificar in (("Windows 11", windows_nativo), ("Node Windows", node),
            ("Corepack", lambda: pnpm()),
            ("Docker", lambda: docker("info", "--format", "{{.ServerVersion}}")),
            ("Artefatos", verificar_artefatos)):
        try:
            verificar()
            mensagem("OK", nome)
        except Falha as erro:
            falhas += 1
            mensagem("ERRO", f"{nome}: {erro}")
    if ENV_LOCAL.exists():
        for servico in ("mysql", "falkordb", "memoria"):
            try:
                itens = containers(servico)
                mensagem("OK" if itens and all(saude_container(i) for i in itens) else "AVISO",
                    f"{servico}: " + (", ".join(i['State']['Status'] + '/' + i['State'].get('Health', {}).get('Status', 'sem saúde') for i in itens) or "ausente"))
            except Falha as erro:
                falhas += 1
                mensagem("ERRO", f"{servico}: {erro}")
    else:
        falhas += 1
        mensagem("AVISO", ".env.local ausente; doctor não cria configuração.")
    if ENV_LOCAL.exists():
        try:
            # O verificador consulta SELECT/migrations; não instala, não migra e
            # não aceita a opção de ignorar a verificação herdada do ambiente.
            script = RAIZ / "scripts/verificar-banco.mjs"
            if not script.is_file():
                raise Falha("Verificador somente leitura do banco ausente.")
            resultado = executar([node(), str(script)], tempo=30,
                extra={"LYRA_IGNORAR_VERIFICACAO_DO_BANCO": "0"})
            mensagem("OK", sanitizar(resultado.stdout.strip(), ambiente()))
        except Falha as erro:
            falhas += 1
            mensagem("ERRO", f"Banco e migrations: {erro}")
    try:
        app = estado_app()
        mensagem("INFO", f"App Windows: http://localhost:{app['port']} · PID {app['pid']}" if app else "App Windows próprio parado.")
        if app:
            codigo, _ = consultar_http(f"http://127.0.0.1:{app['port']}/api/health")
            if codigo != 200:
                raise Falha(f"App Windows próprio sem saúde HTTP: código {codigo}.")
            mensagem("OK", "App Windows próprio respondeu HTTP 200 em /api/health.")
    except Falha as erro:
        falhas += 1
        mensagem("ERRO", str(erro))
    return 1 if falhas else 0


def logs(args: argparse.Namespace) -> None:
    if args.alvo == "todos" and not args.seguir:
        comandos = sorted(LOGS.glob("comandos-*.jsonl"), key=lambda p: p.stat().st_mtime) if LOGS.exists() else []
        if comandos:
            mensagem("INFO", "Últimas etapas operacionais Windows (saídas sanitizadas).")
            print(sanitizar("\n".join(comandos[-1].read_text(encoding="utf-8").splitlines()[-120:]), ambiente()))
    if args.alvo in ("app", "todos"):
        candidatos = sorted(LOGS.glob("app-*.log"), key=lambda p: p.stat().st_mtime) if LOGS.exists() else []
        if candidatos:
            with candidatos[-1].open(encoding="utf-8", errors="replace") as arquivo:
                print("".join(arquivo.readlines()[-120:]))
                while args.seguir and args.alvo == "app":
                    linha = arquivo.readline()
                    if linha:
                        print(linha, end="", flush=True)
                    else:
                        time.sleep(0.5)
        else:
            mensagem("INFO", "Nenhum log de app Windows disponível.")
    if args.alvo in ("db", "todos"):
        if args.seguir and args.alvo == "todos":
            raise Falha("Para seguir logs continuamente escolha `logs app --seguir` ou `logs db --seguir`.")
        for item in containers("mysql"):
            comando = [shutil.which("docker.exe") or "docker.exe", "logs", "--tail", "100"]
            if args.seguir and args.alvo == "db":
                comando.append("--follow")
            resultado = subprocess.run([*comando, item["Id"]], cwd=RAIZ, check=False)
            if resultado.returncode:
                raise Falha(f"Docker logs terminou com código {resultado.returncode}.")


def confirmar(texto: str, palavra: str = "SIM") -> None:
    if not sys.stdin.isatty() or input(f"{texto} Digite {palavra}: ").strip() != palavra:
        raise Falha("Operação cancelada; confirmação explícita necessária.")


def despachar(args: argparse.Namespace, gerenciador: GerenciadorArtefatos | None = None) -> int:
    comando = args.comando
    if comando in ("doctor", "status"):
        return diagnostico()
    if comando == "logs":
        logs(args)
        return 0
    if comando == "stop":
        if args.alvo in ("app", "todos"):
            parar_app()
        if args.alvo in ("db", "todos"):
            for item in containers("mysql"):
                docker("stop", "--time", "60", item["Id"])
        return 0
    preflight()
    if comando in ("up", "app") and estado_app():
        verificar_artefatos(gerenciador)
        iniciar_app(args.prod)
        return 0
    if comando == "purge":
        if not args.confirmar_purge:
            raise Falha("Purge exige --confirmar-purge e confirmação APAGAR em terminal.")
        confirmar("O banco MySQL deste projeto será apagado após backup verificado.", "APAGAR")
        preparar_ambiente()
        itens = containers("mysql")
        if len(itens) != 1:
            raise Falha("Purge exige exatamente um MySQL comprovado deste checkout.")
        montagem = next((m for m in itens[0].get("Mounts", []) if m.get("Destination") == "/var/lib/mysql" and m.get("Type") == "volume"), None)
        if montagem is None:
            raise Falha("Volume MySQL não identificado; purge recusado.")
        parar_app()
        resultado = script_node("mysql-upgrade.mjs", "--backup", tempo=1200)
        encontrado = re.search(r"BACKUP_VOLUME=(\S+)", resultado)
        if not encontrado:
            raise Falha("Backup não informou volume verificado; banco não removido.")
        docker("volume", "inspect", encontrado.group(1))
        docker("rm", "-f", itens[0]["Id"])
        docker("volume", "rm", montagem["Name"])
        mensagem("OK", f"Banco removido; backup preservado: {encontrado.group(1)}")
        return 0
    if gerenciador is not None:
        if comando == "repair":
            parar_app()
        prova = None
        plano = gerenciador.planejar("windows")
        if plano["exige_comprovacao"]:
            evidencias = ("node_modules/.modules.yaml", "node_modules/.pnpm/lock.yaml")
            if not all((RAIZ / nome).is_file() for nome in evidencias):
                raise Falha("Instalação inicial sem evidências pnpm; artefatos preservados para diagnóstico.")
            prova = ComprovacaoOrigem("windows", node(), sha256(RAIZ / "pnpm-lock.yaml"),
                {nome: sha256(RAIZ / nome) for nome in evidencias})
        gerenciador.ativar("windows", prova)
    preparar_ambiente()
    if comando == "repair":
        if not args.sim:
            confirmar("Reinstalar artefatos Windows próprios, preservando MySQL?")
        parar_app()
        remover_artefato(".next", gerenciador)
        remover_artefato("node_modules", gerenciador)
    if comando in ("up", "app", "repair"):
        dependencias(forcar=comando == "repair", gerenciador=gerenciador)
    else:
        dependencias_banco()
    banco(criar=comando not in ("app", "migrate"))
    migrations()
    if comando in ("up", "app"):
        iniciar_app(args.prod)
    mensagem("OK", f"Comando {comando} concluído com verificações reais.")
    return 0


def criar_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="run_windows.py", description="Launcher nativo Windows 11.")
    sub = parser.add_subparsers(dest="comando")
    for nome in ("up", "app"):
        item = sub.add_parser(nome)
        item.add_argument("--prod", action="store_true")
    for nome in ("db", "migrate", "doctor", "status", "fix", "help"):
        sub.add_parser(nome)
    repair = sub.add_parser("repair")
    repair.add_argument("--sim", action="store_true")
    purge = sub.add_parser("purge")
    purge.add_argument("--confirmar-purge", action="store_true")
    for nome in ("logs", "stop"):
        item = sub.add_parser(nome)
        item.add_argument("alvo", nargs="?", choices=("app", "db", "todos"), default="todos")
        if nome == "logs":
            item.add_argument("--seguir", action="store_true")
    return parser


def menu() -> int:
    opcoes = {"1": ("Subir desenvolvimento", ["up"]), "2": ("Subir produção", ["up", "--prod"]),
        "3": ("Banco e migrations", ["db"]), "4": ("Somente app", ["app"]),
        "5": ("Migrations", ["migrate"]), "6": ("Diagnóstico", ["doctor"]),
        "7": ("Correções seguras", ["fix"]), "8": ("Estado", ["status"]),
        "9": ("Logs", ["logs"]), "10": ("Parar recursos próprios", ["stop"]),
        "11": ("Reparar artefatos próprios", ["repair"]), "12": ("Purge com backup", ["purge", "--confirmar-purge"])}
    while True:
        print("\nLyra MetaCare · Windows 11 nativo")
        for chave, (rotulo, _) in opcoes.items():
            print(f"{chave:>2}. {rotulo}")
        escolha = input(" 0. Sair\nOpção: ").strip()
        if escolha == "0":
            return 0
        if escolha in opcoes:
            main(opcoes[escolha][1])
        else:
            mensagem("AVISO", "Escolha uma opção apresentada.")


def main(argumentos: Sequence[str]) -> int:
    traduzidos, observacao = traduzir_argumentos(argumentos)
    if traduzidos is None:
        mensagem("ERRO", observacao)
        return 2
    if observacao:
        mensagem("AVISO", observacao)
    try:
        args = criar_parser().parse_args(traduzidos)
        if args.comando == "help" or (args.comando is None and not sys.stdin.isatty()):
            print(__doc__)
            return 0
        windows_nativo()
        if args.comando is None:
            return menu()
        if args.comando in MUTACOES:
            gerenciador = GerenciadorArtefatos(RAIZ)
            with gerenciador.transacao(), exclusao_mutua():
                return despachar(args, gerenciador)
        return despachar(args)
    except (Falha, ErroArtefatos) as erro:
        mensagem("ERRO", str(erro))
        return 1
    except (KeyboardInterrupt, EOFError):
        mensagem("AVISO", "Operação interrompida pelo operador.")
        return 130
    except (OSError, ValueError, KeyError) as erro:
        mensagem("ERRO", f"Falha operacional: {erro}. Recursos existentes preservados.")
        return 1


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    sys.exit(main(sys.argv[1:]))
