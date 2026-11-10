"""Provas do launcher Windows: sockets/CIM reais e guardas determinísticas.

Não iniciam, param ou recriam aplicação/banco do projeto. Dublês nos testes
de ramificação são identificados e não equivalem à prova de subida integral.
"""

from __future__ import annotations

import os
import platform
import socket
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ))

import run_windows


class TestComandos(unittest.TestCase):
    def rodar(self, *argumentos: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run([sys.executable, str(RAIZ / "run_windows.py"), *argumentos],
            stdin=subprocess.DEVNULL, capture_output=True, encoding="utf-8", errors="replace",
            timeout=120, check=False)

    def test_ajuda_real_sem_delegacao(self) -> None:
        resultado = self.rodar("help")
        self.assertEqual(resultado.returncode, 0, resultado.stderr)
        self.assertIn("launcher nativo Windows 11", resultado.stdout)
        self.assertIn(".lyra-run/windows", resultado.stdout)
        self.assertNotIn("wrapper fino", resultado.stdout)

    def test_comando_invalido_e_build(self) -> None:
        self.assertEqual(self.rodar("comando-inexistente").returncode, 2)
        resultado = self.rodar("build")
        self.assertEqual(resultado.returncode, 2)
        self.assertIn("up --prod", resultado.stderr)

    def test_aliases_preservados(self) -> None:
        for legado, novos in run_windows.COMANDOS_LEGADOS.items():
            with self.subTest(legado=legado):
                argumentos, aviso = run_windows.traduzir_argumentos([legado])
                self.assertEqual(argumentos, list(novos))
                self.assertIn(legado, aviso)
        self.assertEqual(run_windows.traduzir_argumentos(["--help"]), (["help"], ""))

    def test_parser_todos_os_comandos(self) -> None:
        parser = run_windows.criar_parser()
        for nome in ("up", "app", "db", "migrate", "doctor", "status", "fix", "repair", "purge", "logs", "stop", "help"):
            self.assertEqual(parser.parse_args([nome]).comando, nome)
        self.assertTrue(parser.parse_args(["up", "--prod"]).prod)
        self.assertTrue(parser.parse_args(["repair", "--sim"]).sim)
        self.assertTrue(parser.parse_args(["purge", "--confirmar-purge"]).confirmar_purge)


class TestPortasReais(unittest.TestCase):
    def test_ocupante_preservado_e_reserva_exclusiva(self) -> None:
        with socket.socket() as ocupado:
            ocupado.bind(("127.0.0.1", 0))
            ocupado.listen(1)
            porta = ocupado.getsockname()[1]
            if porta > 65485:
                self.skipTest("Porta efêmera fora da faixa de busca do launcher.")
            with run_windows.reservar_porta(porta) as reserva:
                nova = reserva.getsockname()[1]
                self.assertGreater(nova, porta)
                with socket.create_connection(("127.0.0.1", porta), timeout=2):
                    conexao, _ = ocupado.accept()
                    conexao.close()
                with socket.socket() as concorrente:
                    with self.assertRaises(OSError):
                        concorrente.bind(("127.0.0.1", nova))

    def test_portas_invalidas(self) -> None:
        for porta in (-1, 0, 80, 65535):
            with self.assertRaises(run_windows.Falha):
                run_windows.reservar_porta(porta)


class TestIdentidade(unittest.TestCase):
    def setUp(self) -> None:
        self.processo = {"pid": 123, "created": "2026-11-10T12:00:00.0000000Z",
            "command": f'node.exe "{RAIZ}/node_modules/next/dist/bin/next" dev',
            "executable": r"C:\Program Files\nodejs\node.exe", "parent": 100}
        self.meta = {**self.processo, "host": platform.node(), "platform": "windows", "root": str(RAIZ)}

    def test_identidade_completa_e_pid_reciclado(self) -> None:
        self.assertTrue(run_windows.identidade_valida(self.meta, self.processo))
        for chave, valor in (("created", "outro-instante"), ("command", "outro comando"),
                              ("executable", "outro.exe"), ("pid", 124)):
            self.assertFalse(run_windows.identidade_valida(self.meta, {**self.processo, chave: valor}))
        for chave, valor in (("host", "outro-host"), ("platform", "linux"), ("root", "D:\\outro")):
            self.assertFalse(run_windows.identidade_valida({**self.meta, chave: valor}, self.processo))
        self.assertFalse(run_windows.identidade_valida(self.meta, None))

    @unittest.skipUnless(sys.platform == "win32", "CIM real exige Windows")
    def test_cim_processo_deste_teste(self) -> None:
        atual = next((p for p in run_windows.processos() if p["pid"] == os.getpid()), None)
        self.assertIsNotNone(atual)
        self.assertTrue(atual["created"])
        self.assertTrue(atual["command"])
        self.assertEqual(Path(atual["executable"]).resolve(), Path(sys.executable).resolve())


class TestArquivosIsolados(unittest.TestCase):
    def setUp(self) -> None:
        self.temporario = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporario.cleanup)
        self.raiz = Path(self.temporario.name)
        for nome, valor in {"RAIZ": self.raiz, "ENV_LOCAL": self.raiz / ".env.local",
                "ARTEFATOS": self.raiz / ".lyra-run/windows/artifacts.json"}.items():
            patch = mock.patch.object(run_windows, nome, valor)
            patch.start()
            self.addCleanup(patch.stop)

    def test_env_preserva_segredos_e_comentarios(self) -> None:
        caminho = self.raiz / ".env.local"
        caminho.write_text('# conservar\nMYSQL_PASSWORD="teste=sem-segredo-real"\nMYSQL_PORT=3307\n', encoding="utf-8")
        run_windows.atualizar_env({"MYSQL_PORT": "3308", "MYSQL_HOST_PORT": "3308"})
        self.assertIn('# conservar\nMYSQL_PASSWORD="teste=sem-segredo-real"', caminho.read_text(encoding="utf-8"))
        self.assertEqual(run_windows.ler_env()["MYSQL_PORT"], "3308")
        self.assertEqual(run_windows.ler_env()["MYSQL_PASSWORD"], "teste=sem-segredo-real")

    def test_estado_linux_recusado_sem_exclusao(self) -> None:
        caminho = self.raiz / ".lyra-run/linux/app.json"
        caminho.parent.mkdir(parents=True)
        caminho.write_text('{"pid":123}', encoding="utf-8")
        with self.assertRaisesRegex(run_windows.Falha, "estrangeiro"):
            run_windows.verificar_artefatos()
        self.assertTrue(caminho.exists())

    def test_build_sem_origem_recusado_e_preservado(self) -> None:
        caminho = self.raiz / ".next"
        caminho.mkdir()
        with self.assertRaisesRegex(run_windows.Falha, "origem Windows"):
            run_windows.verificar_artefatos()
        self.assertTrue(caminho.is_dir())

    def test_dependencias_linux_recusadas(self) -> None:
        caminho = self.raiz / "node_modules/.pnpm/@next+swc-linux-x64-gnu@1"
        caminho.mkdir(parents=True)
        with self.assertRaisesRegex(run_windows.Falha, "SWC Linux"):
            run_windows.verificar_artefatos()
        self.assertTrue(caminho.is_dir())

    def test_remocao_recusa_alvo_fora_da_lista(self) -> None:
        with self.assertRaises(run_windows.Falha):
            run_windows.remover_artefato("../fora")

    def test_json_invalido_nunca_virar_estado_vazio(self) -> None:
        caminho = self.raiz / "estado.json"
        caminho.write_text("{invalido", encoding="utf-8")
        with self.assertRaises(run_windows.Falha):
            run_windows.ler_json(caminho)
        self.assertEqual(caminho.read_text(encoding="utf-8"), "{invalido")


class TestBancoComDubles(unittest.TestCase):
    def test_migrate_nao_exige_artefatos_next(self) -> None:
        with mock.patch.object(run_windows, "preflight"), \
             mock.patch.object(run_windows, "preparar_ambiente"), \
             mock.patch.object(run_windows, "dependencias_banco") as deps_banco, \
             mock.patch.object(run_windows, "banco"), \
             mock.patch.object(run_windows, "migrations") as migrations, \
             mock.patch.object(run_windows, "verificar_artefatos") as artefatos, \
             mock.patch.object(run_windows, "dependencias") as deps_app:
            self.assertEqual(run_windows.despachar(run_windows.criar_parser().parse_args(["migrate"])), 0)
            deps_banco.assert_called_once()
            migrations.assert_called_once()
            artefatos.assert_not_called()
            deps_app.assert_not_called()

    def test_banco_saudavel_nao_recria_container(self) -> None:
        banco = {"Id": "container-de-teste", "State": {"Running": True, "Health": {"Status": "healthy"}},
            "NetworkSettings": {"Ports": {"3306/tcp": [{"HostPort": "3307"}]}}}
        with mock.patch.object(run_windows, "containers", return_value=[banco]), \
             mock.patch.object(run_windows, "ler_env", return_value={"MYSQL_PORT": "3307", "MYSQL_HOST_PORT": "3307"}), \
             mock.patch.object(run_windows, "compose") as compose, \
             mock.patch.object(run_windows, "docker") as docker:
            self.assertEqual(run_windows.banco(), banco)
            compose.assert_not_called()
            docker.assert_not_called()

    def test_container_de_outro_projeto_recusado(self) -> None:
        self.assertFalse(run_windows.pertence_projeto({"Config": {"Labels": {
            "com.docker.compose.project.working_dir": "D:/outro-projeto"}}}))
        self.assertTrue(run_windows.pertence_projeto({"Config": {"Labels": {
            "com.docker.compose.project.working_dir": str(RAIZ)}}}))


@unittest.skipUnless(sys.platform == "win32", "Exclusão msvcrt exige Windows")
class TestConcorrenciaReal(unittest.TestCase):
    def test_duas_operacoes_nao_pegam_o_mesmo_lock(self) -> None:
        with tempfile.TemporaryDirectory() as pasta:
            with mock.patch.object(run_windows, "ESTADO", Path(pasta)):
                with run_windows.exclusao_mutua():
                    with self.assertRaises(run_windows.Falha):
                        with run_windows.exclusao_mutua():
                            self.fail("Duas operações receberam o lock exclusivo")
                with run_windows.exclusao_mutua():
                    self.assertTrue((Path(pasta) / "operation.lock").is_file())


if __name__ == "__main__":
    unittest.main()
