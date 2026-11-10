"""Contratos do launcher Linux sem subir ou parar serviços do projeto.

Sockets e processos são reais e exclusivos dos testes. As fronteiras externas
do Docker são interceptadas para provar a recusa antes de qualquer mutação;
isso não constitui uma validação da subida integrada do ambiente.
"""

from __future__ import annotations

import re
import socket
import subprocess
import sys
import unittest
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]


@unittest.skipUnless(sys.platform.startswith("linux"), "executar no Linux/WSL")
class TestDependenciasRunSh(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.fonte = (RAIZ / "run.sh").read_text(encoding="utf-8")

    def funcao(self, nome: str) -> str:
        trecho = re.search(
            rf"^{re.escape(nome)}\(\) \{{[^\n]*\n.*?^\}}",
            self.fonte,
            re.MULTILINE | re.DOTALL,
        )
        self.assertIsNotNone(trecho, nome)
        assert trecho is not None
        return trecho.group(0)

    def executar(self, nomes: tuple[str, ...], corpo: str, *args: str):
        programa = "set -uo pipefail\n" + "\n".join(map(self.funcao, nomes))
        return subprocess.run(
            ["bash", "-c", programa + "\n" + corpo, "teste", *args],
            capture_output=True,
            text=True,
            timeout=15,
            check=False,
        )

    def test_porta_planejada_define_callback_antes_do_compose(self):
        with socket.socket() as ocupante:
            ocupante.bind(("127.0.0.1", 0))
            ocupante.listen(8)
            porta = ocupante.getsockname()[1]
            resultado = self.executar(
                ("porta_em_uso", "porta_livre_a_partir", "planejar_app", "compose"),
                'LYRA_APP_PORT="$1"; PORTA_APP_PADRAO=3000; FAIXA_BUSCA_PORTA=50\n'
                'ENV_LOCAL=.env.local; DB_PORTA=""\n'
                'estado_app() { APP_ESTADO_ALHEIO=""; APP_PID_ATUAL=""; APP_PORTA=""; }\n'
                'ler_env() { :; }\n'
                'env_valor() { printf "%s" "http://host.docker.internal:3000/callback"; }\n'
                'dono_da_porta() { printf "%s" ocupante-do-teste; }\n'
                'aviso() { :; }; erro() { printf "%s\\n" "$*" >&2; }\n'
                'docker() { printf "%s|%s\\n" "$LYRA_MEMORIA_APP_URL" "$*"; }\n'
                'planejar_app || exit 1\n'
                '[[ "$APP_PORTA_PLANEJADA" != "$LYRA_APP_PORT" ]] || exit 2\n'
                'compose config\n'
                'printf "PORTA=%s\\n" "$APP_PORTA_PLANEJADA"',
                str(porta),
            )
            self.assertEqual(resultado.returncode, 0, resultado.stderr)
            nova = re.search(r"PORTA=(\d+)", resultado.stdout)
            self.assertIsNotNone(nova)
            assert nova is not None
            self.assertIn(
                f"http://host.docker.internal:{nova.group(1)}/callback|compose --env-file .env.local config",
                resultado.stdout,
            )
            with socket.create_connection(("127.0.0.1", porta), timeout=2):
                pass

    def test_banco_invisivel_ocupado_nao_altera_env_nem_cria_container(self):
        with socket.socket() as ocupante:
            ocupante.bind(("127.0.0.1", 0))
            ocupante.listen(8)
            porta = ocupante.getsockname()[1]
            resultado = self.executar(
                ("porta_em_uso", "etapa_porta_banco"),
                'PORTA_DB_PADRAO="$1"; CONTAINER_DB=lyra-metacare-mysql\n'
                'ler_env() { :; }; env_valor() { printf "%s" "$PORTA_DB_PADRAO"; }\n'
                'estado_banco() { DB_ESTADO=""; DB_INDISPONIVEL=""; DB_PORTA=""; }\n'
                'dono_da_porta() { printf "%s" ocupante-do-teste; }\n'
                'docker() { case "$*" in "context show") echo default;; "info "*) echo motor-teste;; *) echo MUTACAO; exit 90;; esac; }\n'
                'definir_env() { echo MUTACAO; exit 91; }\n'
                'erro() { printf "%s\\n" "$*"; }\n'
                'etapa_porta_banco',
                str(porta),
            )
            self.assertEqual(resultado.returncode, 1, resultado.stderr)
            self.assertIn("Possível divergência", resultado.stdout)
            self.assertNotIn("MUTACAO", resultado.stdout)
            with socket.create_connection(("127.0.0.1", porta), timeout=2):
                pass

    def test_sinal_recusa_inicio_diferente_e_aceita_identidade_real(self):
        processo = subprocess.Popen(["sleep", "30"])
        try:
            funcoes = (
                "inicio_processo", "pid_vivo", "processo_identificado_vivo",
                "sinalizar_processo_identificado",
            )
            recusado = self.executar(
                funcoes,
                'PLATAFORMA=linux\nsinalizar_processo_identificado "$1" inicio-incorreto KILL',
                str(processo.pid),
            )
            self.assertEqual(recusado.returncode, 1, recusado.stderr)
            self.assertIsNone(processo.poll())
            aceito = self.executar(
                funcoes,
                'PLATAFORMA=linux\ninicio="$(inicio_processo "$1")"\n'
                'sinalizar_processo_identificado "$1" "$inicio" TERM',
                str(processo.pid),
            )
            self.assertEqual(aceito.returncode, 0, aceito.stderr)
            self.assertEqual(processo.wait(timeout=5), -15)
        finally:
            if processo.poll() is None:
                processo.terminate()
                processo.wait(timeout=5)

    def test_orquestracao_planeja_antes_da_memoria(self):
        for nome in ("cmd_up", "cmd_app"):
            corpo = self.funcao(nome)
            self.assertLess(corpo.index("planejar_app"), corpo.index("etapa_memoria"))


if __name__ == "__main__":
    unittest.main()
