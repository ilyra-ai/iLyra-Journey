"""Provas do launcher Windows: sockets/CIM reais e guardas determinísticas.

Não iniciam, param ou recriam aplicação/banco do projeto. Dublês nos testes
de ramificação são identificados e não equivalem à prova de subida integral.
"""

from __future__ import annotations

import os
import json
import io
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
        self.assertFalse(parser.parse_args(["backup"]).full)
        self.assertTrue(parser.parse_args(["backup", "--full"]).full)
        self.assertEqual(parser.parse_args(["restore", "backup.zip"]).arquivo, "backup.zip")

    def test_menu_agrupa_comandos_e_despacha_somente_a_escolha(self) -> None:
        saida = io.StringIO()
        with mock.patch("builtins.input", side_effect=["8", "0"]), \
             mock.patch.object(run_windows, "main", return_value=0) as main, \
             mock.patch("sys.stdout", saida):
            self.assertEqual(run_windows.menu(), 0)
        main.assert_called_once_with(["migrate"])
        texto = saida.getvalue()
        posicoes = [texto.index("\n" + grupo + "\n") for grupo in (
            "Ambiente", "Aplicação", "Banco", "Diagnóstico", "Manutenção")]
        self.assertEqual(posicoes, sorted(posicoes))


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

    def test_shutdown_rejeita_raiz_reciclada_antes_de_encerrar(self) -> None:
        with mock.patch.object(run_windows, "estado_app", return_value=self.meta), \
             mock.patch.object(run_windows, "processos", return_value=[{**self.processo, "created": "outro-instante"}]), \
             mock.patch.object(run_windows, "powershell") as encerrar:
            with self.assertRaisesRegex(run_windows.Falha, "raiz mudou"):
                run_windows.parar_app()
            encerrar.assert_not_called()

    def test_consulta_preserva_estado_obsoleto_e_stop_explicito_libera(self) -> None:
        with tempfile.TemporaryDirectory() as pasta:
            arquivo = Path(pasta) / "app.json"
            run_windows.gravar_json(arquivo, self.meta)
            with mock.patch.object(run_windows, "APP_META", arquivo), \
                 mock.patch.object(run_windows, "processos", return_value=[]), \
                 mock.patch.object(run_windows, "powershell") as encerrar:
                self.assertEqual(run_windows.estado_app(), {})
                self.assertTrue(arquivo.exists())
                run_windows.parar_app()
                self.assertFalse(arquivo.exists())
                encerrar.assert_not_called()

    def test_estado_estrangeiro_sem_pid_ativo_nunca_e_apagado(self) -> None:
        for chave, valor in (("host", "outro-host"), ("platform", "linux"), ("root", "D:/outra-raiz"), ("pid", True)):
            with self.subTest(chave=chave), tempfile.TemporaryDirectory() as pasta:
                arquivo = Path(pasta) / "app.json"
                run_windows.gravar_json(arquivo, {**self.meta, chave: valor})
                anterior = arquivo.read_bytes()
                with mock.patch.object(run_windows, "APP_META", arquivo), \
                     mock.patch.object(run_windows, "processos", return_value=[]), \
                     mock.patch.object(run_windows, "powershell") as encerrar:
                    with self.assertRaisesRegex(run_windows.Falha, "estado preservado"):
                        run_windows.parar_app()
                    encerrar.assert_not_called()
                    self.assertEqual(arquivo.read_bytes(), anterior)

    def test_pid_reaparece_antes_de_limpar_registro_obsoleto(self) -> None:
        with tempfile.TemporaryDirectory() as pasta:
            arquivo = Path(pasta) / "app.json"
            run_windows.gravar_json(arquivo, self.meta)
            with mock.patch.object(run_windows, "APP_META", arquivo), \
                 mock.patch.object(run_windows, "processos", side_effect=[[], [self.processo]]), \
                 mock.patch.object(run_windows, "powershell") as encerrar:
                with self.assertRaisesRegex(run_windows.Falha, "PID reapareceu"):
                    run_windows.parar_app()
                self.assertTrue(arquivo.exists())
                encerrar.assert_not_called()

    def test_shutdown_rejeita_arvore_incompleta_sem_parada_parcial(self) -> None:
        filho = {**self.processo, "pid": 124, "parent": 123, "command": None}
        with mock.patch.object(run_windows, "estado_app", return_value=self.meta), \
             mock.patch.object(run_windows, "processos", return_value=[self.processo, filho]), \
             mock.patch.object(run_windows, "powershell") as encerrar:
            with self.assertRaisesRegex(run_windows.Falha, "sem identidade"):
                run_windows.parar_app()
            encerrar.assert_not_called()

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
    def test_callback_memoria_incompativel_preserva_servico_e_env(self) -> None:
        memoria = {"Config": {"Env": ["LYRA_MEMORIA_APP_URL=http://host.docker.internal:3000"]}}
        with mock.patch.object(run_windows, "containers", return_value=[memoria]), \
             mock.patch.object(run_windows, "compose") as compose, \
             mock.patch.object(run_windows, "atualizar_env") as atualizar:
            with self.assertRaisesRegex(run_windows.Falha, "porta 3001"):
                run_windows.memoria(3001)
            compose.assert_not_called()
            atualizar.assert_not_called()

    def test_logs_propaga_exit_docker(self) -> None:
        args = run_windows.criar_parser().parse_args(["logs", "db"])
        with mock.patch.object(run_windows, "containers", return_value=[{"Id": "container-de-teste"}]), \
             mock.patch.object(run_windows.subprocess, "run", return_value=subprocess.CompletedProcess([], 19)):
            with self.assertRaisesRegex(run_windows.Falha, "código 19"):
                run_windows.logs(args)

    def test_logs_seguir_todos_nao_finge_seguir(self) -> None:
        args = run_windows.criar_parser().parse_args(["logs", "todos", "--seguir"])
        with tempfile.TemporaryDirectory() as pasta:
            with mock.patch.object(run_windows, "LOGS", Path(pasta)), \
                 mock.patch.object(run_windows, "containers") as containers:
                with self.assertRaisesRegex(run_windows.Falha, "escolha"):
                    run_windows.logs(args)
                containers.assert_not_called()

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


@unittest.skipUnless(sys.platform == "win32", "Shutdown real por CIM exige Windows")
class TestShutdownRealIsolado(unittest.TestCase):
    def test_encerra_somente_filho_descartavel_criado_por_este_teste(self) -> None:
        # Este processo não é app nem serviço: é uma fixture privada do teste.
        filho = subprocess.Popen([sys.executable, "-c", "import time; time.sleep(60)", str(RAIZ)])
        try:
            identidade = next((p for p in run_windows.processos() if p["pid"] == filho.pid), None)
            self.assertIsNotNone(identidade)
            with tempfile.TemporaryDirectory() as pasta:
                estado = Path(pasta) / "app.json"
                run_windows.gravar_json(estado, {**identidade, "root": str(RAIZ), "platform": "windows", "host": platform.node()})
                with mock.patch.object(run_windows, "APP_META", estado):
                    run_windows.parar_app()
                self.assertIsNotNone(filho.poll())
                self.assertFalse(estado.exists())
        finally:
            if filho.poll() is None:
                filho.terminate()
            filho.wait(timeout=10)


class TestStopDoBanco(unittest.TestCase):
    def test_stop_db_para_memoria_e_falkordb_antes_do_mysql(self) -> None:
        # Dublês: containers próprios por serviço e o Docker que registra.
        proprios = {"memoria": [{"Id": "m1"}], "falkordb": [{"Id": "f1"}], "mysql": [{"Id": "db1"}]}
        paradas: list[tuple[str, ...]] = []
        with mock.patch.object(run_windows, "containers", side_effect=lambda s: proprios.get(s, [])), \
             mock.patch.object(run_windows, "docker", side_effect=lambda *a: paradas.append(a)), \
             mock.patch.object(run_windows, "parar_app") as parar_app:
            args = run_windows.criar_parser().parse_args(["stop", "db"])
            self.assertEqual(run_windows.despachar(args), 0)
        parar_app.assert_not_called()
        self.assertEqual([p[-1] for p in paradas], ["m1", "f1", "db1"])
        self.assertTrue(all(p[:3] == ("stop", "--time", "60") for p in paradas))


@unittest.skipUnless(sys.platform == "win32", "Identidade do processo por CIM exige Windows")
class TestAppQueEncerraAoIniciar(unittest.TestCase):
    def test_registro_do_app_encerrado_e_removido(self) -> None:
        # O "Next" desta fixture é um script Python que encerra com código 1
        # depois de 3 s, como o next dev que parou para exibir um aviso.
        with tempfile.TemporaryDirectory() as pasta:
            raiz = Path(pasta)
            cli = raiz / "node_modules/next/dist/bin/next"
            cli.parent.mkdir(parents=True)
            cli.write_text("import sys, time\ntime.sleep(3)\nsys.exit(1)\n", encoding="utf-8")
            estado = raiz / "app.json"
            with socket.socket() as sonda:
                sonda.bind(("127.0.0.1", 0))
                porta = sonda.getsockname()[1]
            with mock.patch.object(run_windows, "RAIZ", raiz), \
                 mock.patch.object(run_windows, "APP_META", estado), \
                 mock.patch.object(run_windows, "LOGS", raiz / "logs"), \
                 mock.patch.object(run_windows, "estado_app", return_value=None), \
                 mock.patch.object(run_windows, "memoria"), \
                 mock.patch.object(run_windows, "node", return_value=sys.executable), \
                 mock.patch.dict(os.environ, {"LYRA_APP_PORT": str(porta)}):
                with self.assertRaisesRegex(run_windows.Falha, "App encerrou código 1"):
                    run_windows.iniciar_app(False)
            self.assertFalse(estado.exists())


class TestLogsOperacionais(unittest.TestCase):
    def test_comando_real_registra_saida_erro_exit_e_oculta_segredos(self) -> None:
        with tempfile.TemporaryDirectory() as pasta, \
             mock.patch.object(run_windows, "LOGS", Path(pasta)), \
             mock.patch.object(run_windows, "ler_env", return_value={"MYSQL_PASSWORD": "credencial-fixture-banco"}):
            comando = [sys.executable, "-c", "import os,sys; print(os.environ['MYSQL_PASSWORD']); print(os.environ['CHAVE_TOKEN'],file=sys.stderr); sys.exit(7)"]
            with self.assertRaises(run_windows.Falha) as erro:
                run_windows.executar(comando, extra={"CHAVE_TOKEN": "credencial-fixture-extra"})
            arquivo = next(Path(pasta).glob("comandos-*.jsonl"))
            texto = arquivo.read_text(encoding="utf-8")
            entradas = [json.loads(linha) for linha in texto.splitlines()]
            self.assertEqual([e["evento"] for e in entradas], ["início", "fim"])
            self.assertEqual(entradas[-1]["codigo"], 7)
            self.assertIn("[segredo oculto]", entradas[-1]["stdout"])
            self.assertIn("[segredo oculto]", entradas[-1]["stderr"])
            for segredo in ("credencial-fixture-banco", "credencial-fixture-extra"):
                self.assertNotIn(segredo, texto + str(erro.exception))
            self.assertNotIn("import os,sys", texto)

    def test_identidades_cim_e_inspect_nao_persistem_argumentos_ou_ambientes(self) -> None:
        with tempfile.TemporaryDirectory() as pasta, mock.patch.object(run_windows, "LOGS", Path(pasta)):
            for comando in (["powershell.exe", "-EncodedCommand", "programa-fixture"], ["docker.exe", "inspect", "container"]):
                run_windows.registrar_comando(comando, "fim", {}, codigo=0,
                    stdout="credencial-desconhecida-de-terceiro", stderr="ambiente-de-terceiro")
            texto = next(Path(pasta).glob("comandos-*.jsonl")).read_text(encoding="utf-8")
            self.assertNotIn("credencial-desconhecida", texto)
            self.assertNotIn("ambiente-de-terceiro", texto)
            self.assertNotIn("programa-fixture", texto)

    def test_timeout_nao_expoe_argv(self) -> None:
        with tempfile.TemporaryDirectory() as pasta, mock.patch.object(run_windows, "LOGS", Path(pasta)), \
             mock.patch.object(run_windows.subprocess, "run", side_effect=subprocess.TimeoutExpired(["fixture", "segredo-nao-configurado"], 1)):
            with self.assertRaises(run_windows.Falha) as erro:
                run_windows.executar(["fixture", "segredo-nao-configurado"], tempo=1)
            texto = next(Path(pasta).glob("comandos-*.jsonl")).read_text(encoding="utf-8")
            self.assertNotIn("segredo-nao-configurado", texto + str(erro.exception))
            self.assertIn("Tempo limite", texto)


class TestDoctorComDubles(unittest.TestCase):
    def diagnosticar(self, codigo: int, banco_falha: bool = False):
        with mock.patch.object(run_windows, "windows_nativo"), \
             mock.patch.object(run_windows, "node", return_value="node.exe"), \
             mock.patch.object(run_windows, "pnpm"), \
             mock.patch.object(run_windows, "docker"), \
             mock.patch.object(run_windows, "verificar_artefatos"), \
             mock.patch.object(run_windows, "containers", return_value=[]), \
             mock.patch.object(run_windows, "estado_app", return_value={"port": 3001, "pid": 999}), \
             mock.patch.object(run_windows, "consultar_http", return_value=(codigo, "")) as http, \
             mock.patch.object(run_windows, "executar", side_effect=run_windows.Falha("migrations pendentes") if banco_falha else None,
                 return_value=subprocess.CompletedProcess([], 0, "migrations conferidas", "")) as executar:
            resultado = run_windows.diagnostico()
            executar.assert_called_once_with(["node.exe", str(RAIZ / "scripts/verificar-banco.mjs")],
                tempo=30, extra={"LYRA_IGNORAR_VERIFICACAO_DO_BANCO": "0"})
            http.assert_called_once_with("http://127.0.0.1:3001/api/health")
            return resultado

    def test_doctor_confere_migrations_e_saude_http(self) -> None:
        self.assertEqual(self.diagnosticar(200), 0)

    def test_doctor_falha_com_http_indisponivel_ou_migrations_pendentes(self) -> None:
        self.assertEqual(self.diagnosticar(503), 1)
        self.assertEqual(self.diagnosticar(200, banco_falha=True), 1)


class TestBackupWindowsComDubles(unittest.TestCase):
    def test_backup_banco_e_full_reusam_lease_sem_instalar_ou_parar(self) -> None:
        for argumentos, tipo in ((["backup"], "banco"), (["backup", "--full"], "full")):
            with self.subTest(tipo=tipo), mock.patch.object(run_windows, "preflight"), \
                 mock.patch.object(run_windows, "node", return_value="node.exe"), \
                 mock.patch.object(run_windows, "MotorBackup") as motor, \
                 mock.patch.object(run_windows, "preparar_ambiente") as preparar, \
                 mock.patch.object(run_windows, "parar_app") as parar:
                gerenciador = object()
                motor.return_value.backup.return_value = Path("backup.zip")
                self.assertEqual(run_windows.despachar(run_windows.criar_parser().parse_args(argumentos), gerenciador), 0)
                motor.assert_called_once_with(RAIZ, "node.exe", gerenciador=gerenciador)
                motor.return_value.backup.assert_called_once_with(tipo)
                preparar.assert_not_called()
                parar.assert_not_called()

    def test_restore_recusa_app_ativo_sem_parada_automatica(self) -> None:
        with tempfile.TemporaryDirectory() as pasta:
            arquivo = Path(pasta) / "backup.zip"
            arquivo.write_bytes(b"fixture-apenas-fluxo-do-launcher")
            with mock.patch.object(run_windows, "preflight"), \
                 mock.patch.object(run_windows, "node", return_value="node.exe"), \
                 mock.patch.object(run_windows, "MotorBackup") as motor, \
                 mock.patch.object(run_windows, "estado_app", return_value={"pid": 999}), \
                 mock.patch.object(run_windows, "confirmar") as confirmar, \
                 mock.patch.object(run_windows, "parar_app") as parar:
                with self.assertRaisesRegex(run_windows.Falha, "Pare a aplicação"):
                    run_windows.despachar(run_windows.criar_parser().parse_args(["restore", str(arquivo)]))
                motor.return_value.restaurar.assert_not_called()
                confirmar.assert_not_called()
                parar.assert_not_called()

    def test_restore_exige_confirmacao_antes_do_motor(self) -> None:
        with tempfile.TemporaryDirectory() as pasta:
            arquivo = Path(pasta) / "backup.zip"
            arquivo.write_bytes(b"fixture-apenas-fluxo-do-launcher")
            args = run_windows.criar_parser().parse_args(["restore", str(arquivo)])
            with mock.patch.object(run_windows, "preflight"), \
                 mock.patch.object(run_windows, "node", return_value="node.exe"), \
                 mock.patch.object(run_windows, "MotorBackup") as motor, \
                 mock.patch.object(run_windows, "estado_app", return_value={}), \
                 mock.patch("sys.stdin.isatty", return_value=False):
                with self.assertRaisesRegex(run_windows.Falha, "confirmação explícita"):
                    run_windows.despachar(args)
                motor.return_value.restaurar.assert_not_called()
            with mock.patch.object(run_windows, "preflight"), \
                 mock.patch.object(run_windows, "node", return_value="node.exe"), \
                 mock.patch.object(run_windows, "MotorBackup") as motor, \
                 mock.patch.object(run_windows, "estado_app", return_value={}), \
                 mock.patch("sys.stdin.isatty", return_value=True), \
                 mock.patch("builtins.input", return_value="RESTAURAR"):
                motor.return_value.restaurar.return_value = {"restaurado": True}
                self.assertEqual(run_windows.despachar(args), 0)
                motor.return_value.restaurar.assert_called_once_with(arquivo.absolute(), confirmar=True)

    def test_menu_restore_pede_arquivo_e_permite_cancelar_sem_despachar(self) -> None:
        with mock.patch("builtins.input", side_effect=["10", "", "10", "pasta com espaço/backup.zip", "0"]), \
             mock.patch.object(run_windows, "main", return_value=0) as main, \
             mock.patch("sys.stdout", io.StringIO()):
            self.assertEqual(run_windows.menu(), 0)
        main.assert_called_once_with(["restore", "pasta com espaço/backup.zip"])


class TestIntegracaoLease(unittest.TestCase):
    def test_verificacao_reusa_o_mesmo_lease_sem_deadlock(self) -> None:
        # Inventário externo interceptado; arquivos, rename e lock são reais.
        with tempfile.TemporaryDirectory() as pasta:
            raiz = Path(pasta)
            gerenciador = run_windows.GerenciadorArtefatos(raiz)
            with mock.patch("scripts.launcher_artifacts.processos_checkout", return_value=[]), \
                 mock.patch.object(run_windows, "RAIZ", raiz):
                with gerenciador.transacao():
                    gerenciador.ativar("windows")
                    run_windows.verificar_artefatos(gerenciador)
                    self.assertTrue(gerenciador.lock.exists())
                    concorrente = run_windows.GerenciadorArtefatos(raiz)
                    with self.assertRaises(run_windows.ErroArtefatos):
                        with concorrente.transacao():
                            self.fail("Operação concorrente entrou durante o preparo")
                self.assertFalse(gerenciador.lock.exists())


if __name__ == "__main__":
    unittest.main()
