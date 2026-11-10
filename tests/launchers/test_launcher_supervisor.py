"""Provas de supervisão e lease com Bash real em diretório descartável."""

from __future__ import annotations

import os
import signal
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "scripts"))
import launcher_artifacts as artefatos

SUPERVISOR = RAIZ / "scripts/launcher_supervisor.py"


@unittest.skipUnless(sys.platform.startswith("linux"), "supervisão Linux/WSL")
class TestSupervisor(unittest.TestCase):
    def setUp(self):
        self.temporario = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporario.cleanup)
        self.raiz = Path(self.temporario.name)
        self.gerenciador = artefatos.GerenciadorArtefatos(self.raiz)
        # Só o inventário externo é isolado; lease e manifesto são arquivos reais.
        with patch.object(artefatos, "processos_checkout", return_value=[]):
            self.gerenciador.ativar("linux")

    def criar_bash(self, corpo):
        (self.raiz / "run.sh").write_text(
            '#!/bin/bash\nset -eu\n'
            f'python3 "{SUPERVISOR}" --raiz "$PWD" --pai "$PPID" validar-filho\n'
            + corpo,
            encoding="utf-8",
        )

    def iniciar(self):
        processo = subprocess.Popen(
            [sys.executable, str(SUPERVISOR), "--raiz", str(self.raiz), "executar", "--", "app"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        self.addCleanup(self.encerrar, processo)
        return processo

    @staticmethod
    def encerrar(processo):
        if processo.poll() is None:
            processo.terminate()
        try:
            processo.communicate(timeout=5)
        except subprocess.TimeoutExpired:
            processo.kill()
            processo.communicate(timeout=5)

    def esperar(self, nome, processo):
        limite = time.monotonic() + 5
        while time.monotonic() < limite:
            if (self.raiz / nome).exists():
                return
            if processo.poll() is not None:
                saida, erro = processo.communicate()
                self.fail(f"Supervisor terminou cedo: {saida} {erro}")
            time.sleep(0.02)
        self.fail(f"Não apareceu a evidência {nome}")

    def test_lease_cobre_bash_ate_estado_e_libera_apos_saida(self):
        self.criar_bash(
            'touch pronto\nwhile [[ ! -f continuar ]]; do sleep .02; done\n'
            'mkdir -p .lyra-run/linux\nprintf "estado do teste" > .lyra-run/linux/app.json\n'
        )
        processo = self.iniciar()
        self.esperar("pronto", processo)
        self.assertTrue(self.gerenciador.lock.exists())
        with self.assertRaisesRegex(artefatos.ErroArtefatos, "Lock existente"):
            with artefatos.GerenciadorArtefatos(self.raiz).transacao():
                self.fail("Outro proprietário entrou no lease")
        (self.raiz / "continuar").touch()
        _, erro = processo.communicate(timeout=5)
        self.assertEqual(processo.returncode, 0, erro)
        self.assertFalse(self.gerenciador.lock.exists())
        self.assertTrue((self.raiz / ".lyra-run/linux/app.json").is_file())

    def test_sigterm_encaminhado_com_lease_ate_fim_do_filho(self):
        self.criar_bash(
            "trap 'test -f .lyra-run/artifacts/lock.json && touch lease-no-sinal; sleep .2; exit 143' TERM\n"
            'touch pronto\nwhile :; do sleep .05; done\n'
        )
        processo = self.iniciar()
        self.esperar("pronto", processo)
        processo.send_signal(signal.SIGTERM)
        _, erro = processo.communicate(timeout=5)
        self.assertEqual(processo.returncode, 143, erro)
        self.assertTrue((self.raiz / "lease-no-sinal").exists())
        self.assertFalse(self.gerenciador.lock.exists())

    def test_prova_sem_pai_proprietario_recusada(self):
        resultado = subprocess.run(
            [sys.executable, str(SUPERVISOR), "--raiz", str(self.raiz),
             "--pai", str(os.getpid()), "validar-filho"],
            capture_output=True, text=True, timeout=5,
        )
        self.assertEqual(resultado.returncode, 1)
        self.assertIn("lease", resultado.stderr)

    def test_estado_app_existente_na_mesma_plataforma_nao_alterna(self):
        estado = self.raiz / ".lyra-run/linux/app.json"
        estado.parent.mkdir(parents=True)
        estado.write_text("estado preservado", encoding="utf-8")
        self.criar_bash('test -f .lyra-run/linux/app.json\n')
        processo = self.iniciar()
        _, erro = processo.communicate(timeout=5)
        self.assertEqual(processo.returncode, 0, erro)
        self.assertEqual(estado.read_text(), "estado preservado")
        self.assertFalse(self.gerenciador.lock.exists())


if __name__ == "__main__":
    unittest.main()
