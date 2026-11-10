"""Provas locais do isolamento Linux, identidade de PID e portas do run.sh.

Não inicia Next.js, Docker ou banco. Os processos e sockets criados aqui são
descartáveis e pertencem exclusivamente ao teste. A extração usa o delimitador
de função Bash na coluna zero e falha se a função real não estiver presente.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]


@unittest.skipUnless(sys.platform.startswith("linux"), "provas Linux via /proc")
class TestIsolamentoRuntime(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.fonte = (RAIZ / "run.sh").read_text(encoding="utf-8")
        cls.bash = shutil.which("bash")
        cls.node = shutil.which("node")
        if not cls.bash or not cls.node:
            raise unittest.SkipTest("Bash e Node Linux precisam estar disponíveis")
        plataforma = subprocess.check_output(
            [cls.node, "-p", "process.platform"], text=True
        ).strip()
        if plataforma != "linux":
            raise unittest.SkipTest("o próprio teste exige Node Linux")

    def funcao(self, nome: str) -> str:
        padrao = rf"^{re.escape(nome)}\(\) \{{[^\n]*\n.*?^\}}"
        resultado = re.search(padrao, self.fonte, re.MULTILINE | re.DOTALL)
        self.assertIsNotNone(resultado, f"Função real ausente: {nome}")
        assert resultado is not None
        return resultado.group(0)

    def bash_real(
        self, funcoes: tuple[str, ...], corpo: str, *argumentos: str
    ) -> subprocess.CompletedProcess[str]:
        programa = "set -uo pipefail\n" + "\n".join(
            self.funcao(nome) for nome in funcoes
        )
        return subprocess.run(
            [self.bash, "-c", programa + "\n" + corpo, "teste", *argumentos],
            cwd=RAIZ,
            capture_output=True,
            text=True,
            timeout=20,
            check=False,
        )

    def test_node_windows_real_e_recusado_no_linux(self) -> None:
        executavel = Path("/mnt/c/Program Files/nodejs/node.exe")
        if not executavel.is_file():
            self.skipTest("Node Windows não está acessível pela interoperabilidade")
        resultado = self.bash_real(
            ("verificar_node",),
            'NODE_WINDOWS="$1"\n'
            'node() { "$NODE_WINDOWS" "$@"; }\n'
            'have() { command -v "$1" >/dev/null; }\n'
            'verif() { printf "%s|%s|%s\\n" "$1" "$2" "$3"; }\n'
            'verificar_node',
            str(executavel),
        )
        self.assertEqual(resultado.returncode, 0, resultado.stderr)
        self.assertIn("Node.js|erro|binário não Linux", resultado.stdout)
        self.assertNotIn("Corepack/pnpm|ok", resultado.stdout)

    def test_porta_ocupada_permanece_aberta(self) -> None:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as ocupante:
            ocupante.bind(("127.0.0.1", 0))
            ocupante.listen(8)
            porta = ocupante.getsockname()[1]
            resultado = self.bash_real(
                ("porta_em_uso", "porta_livre_a_partir"),
                'FAIXA_BUSCA_PORTA=50\nporta_livre_a_partir "$1"',
                str(porta),
            )
            self.assertEqual(resultado.returncode, 0, resultado.stderr)
            self.assertNotEqual(int(resultado.stdout), porta)
            self.assertEqual(ocupante.getsockname()[1], porta)
            with socket.create_connection(("127.0.0.1", porta), timeout=2):
                pass

    def test_identidade_confere_inicio_raiz_e_plataforma(self) -> None:
        assert self.node is not None
        with tempfile.TemporaryDirectory() as pasta:
            processo = subprocess.Popen(
                [self.node, "-e", "process.stdin.resume()"],
                cwd=pasta,
                stdin=subprocess.PIPE,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            try:
                resultado = self.bash_real(
                    ("inicio_processo", "validar_identidade_app"),
                    'RAIZ="$1"; PID_TESTE="$2"\n'
                    'INICIO="$(inicio_processo "$PID_TESTE")"\n'
                    'validar_identidade_app "$PID_TESTE" "$INICIO" "$RAIZ" linux || exit 10\n'
                    'if validar_identidade_app "$PID_TESTE" "${INICIO}9" "$RAIZ" linux; then exit 11; fi\n'
                    'if validar_identidade_app "$PID_TESTE" "$INICIO" "$RAIZ" win32; then exit 12; fi\n'
                    'if validar_identidade_app "$PID_TESTE" "$INICIO" "${RAIZ}/outra" linux; then exit 13; fi',
                    pasta,
                    str(processo.pid),
                )
                self.assertEqual(resultado.returncode, 0, resultado.stderr)
                self.assertIsNone(processo.poll())
            finally:
                processo.communicate(timeout=5)

    def test_estado_de_outro_pid_nao_e_assumido_nem_apagado(self) -> None:
        with tempfile.TemporaryDirectory() as pasta:
            meta = Path(pasta) / "app.json"
            conteudo = json.dumps(
                {
                    "pid": os.getpid(),
                    "inicio_processo": "inicio-incompativel",
                    "raiz": str(RAIZ),
                    "plataforma": "linux",
                }
            )
            meta.write_text(conteudo, encoding="utf-8")
            resultado = self.bash_real(
                (
                    "inicio_processo",
                    "validar_identidade_app",
                    "ler_meta",
                    "pid_vivo",
                    "estado_app",
                ),
                'RAIZ="$1"; APP_META="$2"; APP_PID="$3"; PLATAFORMA=linux\n'
                'estado_app\n'
                '[[ -z "$APP_PID_ATUAL" && -n "$APP_ESTADO_ALHEIO" ]]',
                str(RAIZ),
                str(meta),
                str(Path(pasta) / "app.pid"),
            )
            self.assertEqual(resultado.returncode, 0, resultado.stderr)
            self.assertEqual(meta.read_text(encoding="utf-8"), conteudo)
            os.kill(os.getpid(), 0)


if __name__ == "__main__":
    unittest.main()
