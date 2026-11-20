"""Motor de backup dos launchers (tarefa 174): exportação, preparação da
restauração e diagnóstico de falhas, com o Docker simulado por um dublê que
registra os comandos e responde como o Docker real."""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

RAIZ_PROJETO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ_PROJETO / "scripts"))

import launcher_backup as backup


class MotorComDockerSimulado(backup.MotorBackup):
    """Motor sem o construtor real (que exige Node e o script do MySQL)."""

    def __init__(self, raiz: Path, falhar_no_tar: bool = False, rotulo_alheio: bool = False):
        self.raiz = raiz
        self.comandos: list[list[str]] = []
        self.falhar_no_tar = falhar_no_tar
        self.rotulo_alheio = rotulo_alheio
        self.volumes: dict[str, dict[str, str]] = {}

    def _docker(self, argumentos: list[str], **opcoes) -> bytes:
        self.comandos.append(list(argumentos))
        if argumentos[:2] == ["volume", "ls"]:
            return "\n".join(self.volumes).encode()
        if argumentos[:2] == ["volume", "create"]:
            rotulos = dict(
                valor.split("=", 1)
                for indice, valor in enumerate(argumentos)
                if indice > 0 and argumentos[indice - 1] == "--label"
            )
            if self.rotulo_alheio:
                rotulos["lyra.backup.owner"] = "outro-dono"
            self.volumes[argumentos[-1]] = rotulos
            return b""
        if argumentos[:2] == ["volume", "inspect"]:
            return json.dumps([{"Labels": self.volumes[argumentos[2]]}]).encode()
        if argumentos[:2] == ["volume", "rm"]:
            del self.volumes[argumentos[2]]
            return b""
        if argumentos[0] == "ps":
            return b""
        if argumentos[0] == "run" and "-xpf" in argumentos and self.falhar_no_tar:
            raise backup.ErroBackup("Operação de backup falhou em docker run (código 2): tar: This does not look like a tar archive")
        return b""


class TestMotorDeBackup(unittest.TestCase):
    def setUp(self) -> None:
        self.temporario = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporario.cleanup)
        self.raiz = Path(self.temporario.name).resolve()
        self.tar = self.raiz / "volume.tar"
        self.tar.write_bytes(b"conteudo")

    def test_exportacao_deixa_de_fora_so_o_link_do_socket_do_mysql(self) -> None:
        motor = MotorComDockerSimulado(self.raiz)
        motor._exportar("volume_x", "mysql:9", self.raiz / "saida.tar")
        comando = motor.comandos[-1]
        self.assertIn("--exclude=./mysql.sock", comando)
        self.assertEqual([arg for arg in comando if arg.startswith("--exclude")], ["--exclude=./mysql.sock"])

    def test_preparacao_envia_o_tar_pela_entrada_padrao(self) -> None:
        motor = MotorComDockerSimulado(self.raiz, falhar_no_tar=True)
        with self.assertRaises(backup.ErroBackup):
            motor._stage(self.tar, {"imagem": "mysql:9"}, "raiz-1")
        extracao = next(c for c in motor.comandos if c[0] == "run" and "-xpf" in c)
        self.assertEqual(extracao[:2], ["run", "-i"])

    def test_falha_na_preparacao_remove_o_volume_proprio(self) -> None:
        motor = MotorComDockerSimulado(self.raiz, falhar_no_tar=True)
        with self.assertRaises(backup.ErroBackup):
            motor._stage(self.tar, {"imagem": "mysql:9"}, "raiz-1")
        self.assertEqual(motor.volumes, {})
        self.assertTrue(any(c[:2] == ["volume", "rm"] for c in motor.comandos))

    def test_sem_posse_comprovada_nada_e_removido(self) -> None:
        motor = MotorComDockerSimulado(self.raiz, rotulo_alheio=True)
        with self.assertRaises(backup.ErroBackup):
            motor._stage(self.tar, {"imagem": "mysql:9"}, "raiz-1")
        self.assertEqual(len(motor.volumes), 1)
        self.assertFalse(any(c[:2] == ["volume", "rm"] for c in motor.comandos))

    def test_erro_de_comando_mostra_etapa_codigo_e_stderr(self) -> None:
        motor = MotorComDockerSimulado(self.raiz)
        script = "import sys; sys.stderr.write('linha antiga\\nfalha real do comando\\n'); sys.exit(3)"
        with self.assertRaises(backup.ErroBackup) as contexto:
            backup.MotorBackup._executar(motor, [sys.executable, "-c", script])
        mensagem = str(contexto.exception)
        self.assertIn("código 3", mensagem)
        self.assertIn("falha real do comando", mensagem)


if __name__ == "__main__":
    unittest.main()
