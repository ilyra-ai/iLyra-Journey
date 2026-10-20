"""Regressões do preparo do MySQL no Python embutido do TUI-WEBNOVA.

Os testes de contrato não exigem Docker: respostas de processos são dublês
explícitos. Não substituem a validação de integração com o MySQL real.
Executar: python -m unittest discover -s tests/launchers -p test_webnova_mysql.py -v
"""

from __future__ import annotations

import ast
import contextlib
import io
import json
import re
import subprocess
import types
import unittest
from pathlib import Path
from unittest import mock


RAIZ = Path(__file__).resolve().parents[2]
FONTE = (RAIZ / "tui-webnova.sh").read_text(encoding="utf-8")
PYTHON_EMBUTIDO = FONTE.split("<<'PY_WEBNOVA'\n", 1)[1].rsplit("\nPY_WEBNOVA", 1)[0]
ARVORE = ast.parse(PYTHON_EMBUTIDO)


def carregar_banco() -> types.ModuleType:
    """Carrega as funções reais sem importar os módulos PTY exclusivos do Linux."""
    nomes = {
        "FalhaInterna", "mysql_sql", "ocultar_segredos", "inspecionar_saude_mysql",
        "diagnosticar_mysql", "reconciliar_acesso_mysql", "interno_preparar_banco", "sql_texto",
    }
    modulo = types.ModuleType("webnova_banco")
    modulo.__dict__.update({
        "re": re, "json": json, "subprocess": subprocess, "Dict": dict,
        "CONTAINER_DB": "lyra-metacare-mysql", "time": mock.Mock(),
        "ler_env_local": mock.Mock(return_value={
            "MYSQL_DATABASE": "lyra_metacare", "MYSQL_USER": "lyra",
            "MYSQL_PASSWORD": "senha-unitaria'\\!", "MYSQL_ROOT_PASSWORD": "root-unitario",
        }),
        "ambiente": mock.Mock(return_value={}),
        "_argv_docker": lambda args: ["docker", *args],
    })
    selecionados = [no for no in ARVORE.body if getattr(no, "name", "") in nomes]
    exec(compile(ast.Module(body=selecionados, type_ignores=[]), "tui-webnova.sh", "exec"), modulo.__dict__)
    return modulo


def estado(saude: str = "healthy", status: str = "running") -> dict:
    return {"Status": status, "Health": {"Status": saude, "Log": []}}


class TestPreparoMysql(unittest.TestCase):
    def setUp(self) -> None:
        self.banco = carregar_banco()
        self.banco.time.monotonic.return_value = 0
        self.saida = io.StringIO()
        self.redirecionar = contextlib.redirect_stdout(self.saida)
        self.redirecionar.__enter__()
        self.addCleanup(self.redirecionar.__exit__, None, None, None)

    def executar(self, estados: list[dict], respostas: list) -> tuple[int, mock.Mock]:
        self.banco.inspecionar_saude_mysql = mock.Mock(side_effect=estados)
        self.banco.mysql_sql = mock.Mock(side_effect=respostas)
        self.banco.reconciliar_acesso_mysql = mock.Mock()
        return self.banco.interno_preparar_banco(), self.banco.reconciliar_acesso_mysql

    def test_so_aprova_com_sql_autenticado_e_healthcheck(self) -> None:
        codigo, reparar = self.executar([estado()], ["1\n"])
        self.assertEqual(codigo, 0)
        reparar.assert_not_called()
        self.banco.mysql_sql.assert_called_with("SELECT 1", tcp=True, timeout=15)

    def test_unhealthy_anterior_nao_interrompe_a_nova_espera(self) -> None:
        codigo, reparar = self.executar([estado("unhealthy"), estado()], ["1", "1"])
        self.assertEqual(codigo, 0)
        self.banco.time.sleep.assert_called_once_with(2)
        reparar.assert_not_called()

    def test_acesso_e_schema_sao_reparados_uma_vez(self) -> None:
        for numero in (1044, 1045, 1049, 1130):
            with self.subTest(numero=numero):
                codigo, reparar = self.executar(
                    [estado("unhealthy"), estado()],
                    [self.banco.FalhaInterna(f"ERROR {numero} (HY000): falha"), "1"],
                )
                self.assertEqual(codigo, 0)
                reparar.assert_called_once_with()

    def test_rede_e_tls_nao_disparam_alteracao_de_credenciais(self) -> None:
        for numero in (2003, 2026, 2061):
            with self.subTest(numero=numero):
                codigo, reparar = self.executar(
                    [estado("starting"), estado()],
                    [self.banco.FalhaInterna(f"ERROR {numero} (HY000): conexão"), "1"],
                )
                self.assertEqual(codigo, 0)
                reparar.assert_not_called()

    def test_sem_healthcheck_e_container_parado_falham(self) -> None:
        for valor in ({"Status": "running"}, estado(status="exited")):
            with self.subTest(estado=valor):
                codigo, reparar = self.executar([valor], ["1"])
                self.assertEqual(codigo, 1)
                reparar.assert_not_called()

    def test_timeout_termina_com_diagnostico(self) -> None:
        self.banco.time.monotonic.side_effect = [0, 311]
        self.assertEqual(self.banco.interno_preparar_banco(), 1)
        self.assertIn("310 s", self.saida.getvalue())

    def test_exibe_erro_do_healthcheck_sem_senhas(self) -> None:
        senha = self.banco.ler_env_local()["MYSQL_PASSWORD"]
        valor = estado("unhealthy")
        valor["Health"]["Log"] = [{"ExitCode": 1, "Output": f"ERROR 1045: {senha}"}]
        self.banco.diagnosticar_mysql(valor, "falha")
        self.assertIn("ERROR 1045", self.saida.getvalue())
        self.assertNotIn(senha, self.saida.getvalue())

    def test_reparo_recusado_quando_root_nao_autentica(self) -> None:
        self.banco.mysql_sql = mock.Mock(side_effect=self.banco.FalhaInterna("ERROR 1045: root"))
        with self.assertRaisesRegex(self.banco.FalhaInterna, "root.*não autenticou"):
            self.banco.reconciliar_acesso_mysql()
        self.banco.mysql_sql.assert_called_once_with("SELECT 1", root=True, com_banco=False, timeout=15)

    def test_segredo_curto_nao_apaga_codigo_de_erro(self) -> None:
        self.banco.ler_env_local.return_value["MYSQL_ROOT_PASSWORD"] = "1"
        texto = self.banco.ocultar_segredos("ERROR 1045 (28000): senha=1")
        self.assertIn("ERROR 1045 (28000)", texto)
        self.assertIn("senha=[segredo oculto]", texto)

    def test_reparo_escapa_senha_limita_grants_e_valida_tcp(self) -> None:
        self.banco.mysql_sql = mock.Mock(side_effect=["1", "%\nlocalhost\n", "", "1"])
        self.banco.reconciliar_acesso_mysql()
        chamadas = self.banco.mysql_sql.call_args_list
        ddl = chamadas[2].args[0]
        self.assertIn("CREATE DATABASE IF NOT EXISTS `lyra_metacare`", ddl)
        self.assertIn("ON `lyra\\_metacare`.*", ddl)
        self.assertIn("'lyra'@'localhost'", ddl)
        self.assertIn("caching_sha2_password BY 'senha-unitaria\\'\\\\!'", ddl)
        self.assertNotIn("DROP", ddl)
        self.assertNotIn("'root'@", ddl)
        self.assertNotIn(self.banco.ler_env_local()["MYSQL_PASSWORD"], self.saida.getvalue())
        self.assertEqual(chamadas[3], mock.call("SELECT 1", tcp=True, timeout=15))

    def test_reparo_rejeita_identificadores_perigosos_e_root(self) -> None:
        for chave, valor in (("MYSQL_USER", "root"), ("MYSQL_USER", "x'; DROP USER x"),
                             ("MYSQL_DATABASE", "x`; DROP DATABASE x")):
            with self.subTest(chave=chave, valor=valor):
                self.banco = carregar_banco()
                self.banco.ler_env_local.return_value[chave] = valor
                self.banco.mysql_sql = mock.Mock()
                with self.assertRaises(self.banco.FalhaInterna):
                    self.banco.reconciliar_acesso_mysql()
                self.banco.mysql_sql.assert_not_called()

    def test_senha_nao_aparece_nos_argumentos_do_processo(self) -> None:
        resultado = subprocess.CompletedProcess([], 0, "1\n", "")
        with mock.patch.object(subprocess, "run", return_value=resultado) as chamar:
            self.assertEqual(self.banco.mysql_sql("SELECT 1", tcp=True), "1\n")
        argumentos = chamar.call_args.args[0]
        senha = self.banco.ler_env_local()["MYSQL_PASSWORD"]
        self.assertNotIn(senha, " ".join(argumentos))
        self.assertIn("--protocol=TCP", argumentos)
        self.assertIn("--get-server-public-key", argumentos)
        self.assertEqual(chamar.call_args.kwargs["env"]["MYSQL_PWD"], senha)

    def test_fluxos_bash_usam_o_mesmo_preparo(self) -> None:
        constantes = {
            no.targets[0].id: ast.literal_eval(no.value)
            for no in ARVORE.body if isinstance(no, ast.Assign)
            and isinstance(no.targets[0], ast.Name)
            and no.targets[0].id in ("LIB", "S_BANCO", "S_PREPARAR_APP")
        }
        self.assertIn("webnova --interno preparar-banco", constantes["LIB"])
        self.assertIn("subir_mysql", constantes["S_BANCO"])
        self.assertIn("garantir_mysql", constantes["S_PREPARAR_APP"])
        self.assertNotIn("compose up -d --wait mysql", FONTE)


if __name__ == "__main__":
    unittest.main()
