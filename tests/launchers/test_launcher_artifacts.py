"""Provas reais de filesystem do alternador; nunca usa o checkout ativo."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
import threading
import unittest
from pathlib import Path
from unittest import mock

RAIZ_PROJETO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ_PROJETO / "scripts"))

import launcher_artifacts as artefatos


class TestGerenciadorArtefatos(unittest.TestCase):
    def setUp(self) -> None:
        self.temporario = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporario.cleanup)
        self.raiz = Path(self.temporario.name).resolve()
        self.gerenciador = artefatos.GerenciadorArtefatos(self.raiz)
        self.plataforma = artefatos.plataforma_atual()
        self.outra = "windows" if self.plataforma == "linux" else "linux"
        # Estes testes isolam filesystem/lease do inventário global do host.
        # A fronteira de processos tem provas próprias abaixo.
        self.inventario = mock.patch.object(artefatos, "processos_checkout", return_value=[])
        self.inventario.start()
        self.addCleanup(self.inventario.stop)

    def arquivo(self, relativo: str, conteudo: str) -> Path:
        destino = self.raiz / relativo
        destino.parent.mkdir(parents=True, exist_ok=True)
        destino.write_text(conteudo, encoding="utf-8")
        return destino

    def instalar_fixture(self) -> None:
        self.arquivo("pnpm-lock.yaml", "lockfileVersion: '9.0'\n")
        self.arquivo("node_modules/.pnpm/lock.yaml", "lockfileVersion: '9.0'\n")
        store = "C:\\pnpm\\store" if self.plataforma == "windows" else "/tmp/pnpm/store"
        self.arquivo("node_modules/.modules.yaml", json.dumps({"storeDir": store}))
        self.arquivo("node_modules/pacote.txt", "dependência fixture local")
        self.arquivo(".next/BUILD_ID", "build-da-fixture")
        self.arquivo("next-env.d.ts", "declaração fixture")
        self.arquivo("tsconfig.tsbuildinfo", "incremental fixture")
        self.arquivo("public/offline-assets.json", '{"assets":[]}')

    def prova(self) -> artefatos.ComprovacaoOrigem:
        node = shutil.which("node")
        if not node:
            self.skipTest("Node real necessário para provar origem")
        return artefatos.ComprovacaoOrigem(
            plataforma=self.plataforma,
            node_executavel=str(Path(node).resolve()),
            lockfile_sha256=artefatos.sha256(self.raiz / "pnpm-lock.yaml"),
            evidencias={
                nome: artefatos.sha256(self.raiz / nome)
                for nome in ("node_modules/.modules.yaml", "node_modules/.pnpm/lock.yaml")
            },
        )

    def test_planejamento_nao_cria_nem_move_arquivos(self) -> None:
        self.arquivo(".next/BUILD_ID", "build-existente")
        estado = self.gerenciador.planejar(self.plataforma)
        self.assertTrue(estado["exige_comprovacao"])
        self.assertFalse(estado["bloqueado"])
        self.assertFalse(self.gerenciador.base.exists())
        self.assertEqual((self.raiz / ".next/BUILD_ID").read_text(), "build-existente")

    def test_origem_desconhecida_recusa_antes_de_mover(self) -> None:
        self.instalar_fixture()
        with self.assertRaisesRegex(artefatos.ErroArtefatos, "Origem inicial desconhecida"):
            self.gerenciador.ativar(self.outra)
        self.assertTrue((self.raiz / "node_modules/pacote.txt").is_file())
        self.assertFalse(self.gerenciador.journal.exists())

    def test_adocao_comprovada_e_idempotencia(self) -> None:
        self.instalar_fixture()
        primeira = self.gerenciador.ativar(self.plataforma, self.prova())
        manifesto = self.gerenciador.manifesto.read_bytes()
        segunda = self.gerenciador.ativar(self.plataforma)
        self.assertTrue(primeira["alterado"])
        self.assertFalse(segunda["alterado"])
        self.assertEqual(self.gerenciador.manifesto.read_bytes(), manifesto)

    def test_alternar_e_restaurar_sem_perder_artefatos(self) -> None:
        self.instalar_fixture()
        self.gerenciador.ativar(self.plataforma, self.prova())
        fontes = {nome: (self.raiz / nome).exists() for nome in artefatos.ARTEFATOS}
        self.gerenciador.ativar(self.outra)
        for nome in fontes:
            self.assertFalse((self.raiz / nome).exists())
            self.assertTrue((self.gerenciador.base / self.plataforma / nome).exists())
        self.arquivo("node_modules/outro.txt", "instalação da outra plataforma")
        self.arquivo(".next/BUILD_ID", "outro-build")
        self.gerenciador.ativar(self.plataforma)
        self.assertEqual((self.raiz / ".next/BUILD_ID").read_text(), "build-da-fixture")
        self.assertEqual((self.raiz / "tsconfig.tsbuildinfo").read_text(), "incremental fixture")
        self.assertEqual((self.raiz / "node_modules/pacote.txt").read_text(encoding="utf-8"), "dependência fixture local")
        self.assertEqual(
            (self.gerenciador.base / self.outra / ".next/BUILD_ID").read_text(),
            "outro-build",
        )

    def test_estado_app_linux_windows_e_legado_bloqueiam(self) -> None:
        for estado in (
            ".lyra-run/linux/app.json", ".lyra-run/windows/app.pid",
            ".lyra-run/app.pid", ".lyra-run-windows/app.json",
        ):
            with self.subTest(estado=estado):
                arquivo = self.arquivo(estado, "estado-sem-identidade-confirmada")
                with self.assertRaisesRegex(artefatos.ErroArtefatos, "estado de aplicação"):
                    self.gerenciador.ativar(self.plataforma)
                self.assertTrue(arquivo.exists())
                arquivo.unlink()

    def test_lock_alheio_nunca_e_removido(self) -> None:
        lock = self.arquivo(".lyra-run/artifacts/lock.json", '{"pid":123,"token":"alheio"}')
        anterior = lock.read_bytes()
        with self.assertRaisesRegex(artefatos.ErroArtefatos, "Lock existente"):
            self.gerenciador.ativar(self.plataforma)
        self.assertEqual(lock.read_bytes(), anterior)

    def test_destino_invalido_e_traversal_sao_recusados(self) -> None:
        with self.assertRaises(artefatos.ErroArtefatos):
            self.gerenciador.ativar("../../fora")
        with self.assertRaises(artefatos.ErroArtefatos):
            self.gerenciador._caminho("../fora")
        self.assertFalse(self.gerenciador.base.exists())

    def test_cache_existente_nao_e_sobrescrito(self) -> None:
        self.instalar_fixture()
        self.gerenciador.ativar(self.plataforma, self.prova())
        cache = self.arquivo(
            f".lyra-run/artifacts/{self.plataforma}/.next/BUILD_ID", "cache-preservado"
        )
        with self.assertRaisesRegex(artefatos.ErroArtefatos, "Cache de origem"):
            self.gerenciador.ativar(self.outra)
        self.assertEqual(cache.read_text(), "cache-preservado")
        self.assertEqual((self.raiz / ".next/BUILD_ID").read_text(), "build-da-fixture")

    def test_evidencia_alterada_impede_adocao(self) -> None:
        self.instalar_fixture()
        prova = self.prova()
        self.arquivo("node_modules/.modules.yaml", "storeDir: /outro/store")
        with self.assertRaisesRegex(artefatos.ErroArtefatos, "Evidência"):
            self.gerenciador.ativar(self.plataforma, prova)
        self.assertFalse(self.gerenciador.manifesto.exists())

    def test_falha_de_rename_deixa_journal_e_recupera(self) -> None:
        self.instalar_fixture()
        self.gerenciador.ativar(self.plataforma, self.prova())
        original = artefatos._renomear_sem_sobrescrever
        chamadas = 0

        def interromper(origem: Path, destino: Path) -> None:
            nonlocal chamadas
            chamadas += 1
            if chamadas == 2:
                raise OSError("falha controlada entre renames")
            original(origem, destino)

        with mock.patch.object(artefatos, "_renomear_sem_sobrescrever", interromper):
            with self.assertRaisesRegex(OSError, "falha controlada"):
                self.gerenciador.ativar(self.outra)
        self.assertTrue(self.gerenciador.journal.is_file())
        with self.assertRaisesRegex(artefatos.ErroArtefatos, "Recuperação explícita"):
            self.gerenciador.ativar(self.outra)
        self.assertTrue(self.gerenciador.recuperar()["recuperado"])
        for nome in artefatos.ARTEFATOS:
            self.assertTrue((self.raiz / nome).exists())
        self.assertFalse(self.gerenciador.journal.exists())
        self.assertEqual(self.gerenciador.status()["ativo"]["plataforma"], self.plataforma)

    def test_colisao_atomicamente_preserva_os_dois_arquivos(self) -> None:
        origem = self.arquivo("origem.txt", "origem")
        destino = self.arquivo("destino.txt", "destino")
        with self.assertRaises(artefatos.ErroArtefatos):
            artefatos._renomear_sem_sobrescrever(origem, destino)
        self.assertEqual(origem.read_text(), "origem")
        self.assertEqual(destino.read_text(), "destino")

    def test_link_no_cache_e_recusado(self) -> None:
        with tempfile.TemporaryDirectory() as externo:
            self.gerenciador.base.mkdir(parents=True)
            link = self.gerenciador.base / "linux"
            try:
                link.symlink_to(externo, target_is_directory=True)
            except OSError:
                self.skipTest("criação de link de teste não permitida neste sistema")
            with self.assertRaisesRegex(artefatos.ErroArtefatos, "link/junção"):
                self.gerenciador.status()
            self.assertEqual(list(Path(externo).iterdir()), [])

    def test_lock_real_impede_segundo_gerenciador(self) -> None:
        segundo = artefatos.GerenciadorArtefatos(self.raiz)
        with self.gerenciador._exclusao():
            identidade = json.loads(self.gerenciador.lock.read_text(encoding="utf-8"))
            self.assertEqual(identidade["plataforma"], self.plataforma)
            self.assertTrue(identidade["inicio_processo"])
            with self.assertRaisesRegex(artefatos.ErroArtefatos, "Lock existente"):
                segundo.ativar(self.plataforma)
            self.assertEqual(
                json.loads(self.gerenciador.lock.read_text(encoding="utf-8")), identidade
            )
        self.assertFalse(self.gerenciador.lock.exists())

    def test_queda_apos_rename_antes_de_confirmar_journal(self) -> None:
        self.instalar_fixture()
        self.gerenciador.ativar(self.plataforma, self.prova())
        original = self.gerenciador._gravar_json

        def interromper(caminho: Path, valor: dict) -> None:
            if caminho == self.gerenciador.journal and valor.get("concluidos") == 1:
                raise OSError("queda após rename antes de confirmar")
            original(caminho, valor)

        with mock.patch.object(self.gerenciador, "_gravar_json", interromper):
            with self.assertRaisesRegex(OSError, "queda após rename"):
                self.gerenciador.ativar(self.outra)
        self.assertFalse((self.raiz / "node_modules").exists())
        self.assertTrue(self.gerenciador.recuperar()["recuperado"])
        self.assertTrue((self.raiz / "node_modules/pacote.txt").exists())

    def test_identidade_compartilhada_nao_depende_da_grafia_do_caminho(self) -> None:
        self.gerenciador.ativar(self.plataforma)
        manifesto = json.loads(self.gerenciador.manifesto.read_text(encoding="utf-8"))
        manifesto["raiz"] = "grafia registrada pelo outro sistema operacional"
        self.gerenciador._gravar_json(self.gerenciador.manifesto, manifesto)
        segundo = artefatos.GerenciadorArtefatos(self.raiz)
        self.assertEqual(segundo.planejar(self.outra)["origem"], self.plataforma)

    def test_exigir_plataforma_nao_move_nem_exige_app_parado(self) -> None:
        with self.assertRaisesRegex(artefatos.ErroArtefatos, "plataforma ativa"):
            self.gerenciador.exigir_plataforma_ativa(self.plataforma)
        self.gerenciador.ativar(self.plataforma)
        estado = self.arquivo(f".lyra-run/{self.plataforma}/app.json", "estado fixture")
        with self.gerenciador.transacao(), mock.patch.object(
            artefatos, "_renomear_sem_sobrescrever"
        ) as mover:
            self.gerenciador.exigir_plataforma_ativa(self.plataforma)
            with self.assertRaisesRegex(artefatos.ErroArtefatos, "plataforma ativa"):
                self.gerenciador.exigir_plataforma_ativa(self.outra)
            self.arquivo(".lyra-run/artifacts/journal.json", "{}")
            with self.assertRaisesRegex(artefatos.ErroArtefatos, "Recuperação explícita"):
                self.gerenciador.exigir_plataforma_ativa(self.plataforma)
            mover.assert_not_called()
        self.assertTrue(estado.exists())

    def test_transacao_mantem_lock_apos_ativar_e_ate_registrar_app(self) -> None:
        segundo = artefatos.GerenciadorArtefatos(self.raiz)
        with self.gerenciador.transacao() as transacao:
            self.assertIs(transacao, self.gerenciador)
            transacao.ativar(self.plataforma)
            with transacao.transacao():
                self.assertTrue(transacao.lock.is_file())
            self.assertTrue(transacao.lock.is_file())
            with self.assertRaisesRegex(artefatos.ErroArtefatos, "Lock existente"):
                segundo.ativar(self.outra)
            estado = self.arquivo(f".lyra-run/{self.plataforma}/app.json", "estado fixture")
        self.assertFalse(transacao.lock.exists())
        self.assertTrue(estado.exists())
        with self.assertRaisesRegex(artefatos.ErroArtefatos, "estado de aplicação"):
            segundo.ativar(self.outra)

    def test_transacao_libera_lock_por_excecao_sem_apagar_artefatos(self) -> None:
        with self.assertRaisesRegex(OSError, "instalação interrompida"):
            with self.gerenciador.transacao():
                self.gerenciador.ativar(self.plataforma)
                arquivo = self.arquivo("node_modules/preservado.txt", "preservar")
                raise OSError("instalação interrompida")
        self.assertFalse(self.gerenciador.lock.exists())
        self.assertIsNone(self.gerenciador._lease)
        self.assertEqual(arquivo.read_text(), "preservar")
        with self.gerenciador.transacao():
            self.assertTrue(self.gerenciador.lock.exists())

    def test_reentrada_por_outra_thread_e_recusada_sem_deadlock(self) -> None:
        erros = []

        def disputar() -> None:
            try:
                with self.gerenciador.transacao():
                    erros.append("lease indevidamente compartilhado")
            except artefatos.ErroArtefatos as erro:
                erros.append(str(erro))

        with self.gerenciador.transacao():
            thread = threading.Thread(target=disputar, daemon=True)
            thread.start()
            thread.join(timeout=5)
            self.assertFalse(thread.is_alive(), "reentrada não pode bloquear a thread")
            self.assertEqual(len(erros), 1)
            self.assertIn("Lease não pertence", erros[0])
            self.assertTrue(self.gerenciador.lock.exists())
        self.assertFalse(self.gerenciador.lock.exists())

    def test_journal_adulterado_nao_move_artefato_para_outro_tipo(self) -> None:
        self.gerenciador.ativar(self.plataforma)
        identidade = self.gerenciador._identidade_raiz()
        origem = self.arquivo("node_modules/preservado.txt", "não mover")
        self.gerenciador._gravar_json(self.gerenciador.journal, {
            "versao": 1, "raiz_id": identidade, "anterior": None,
            "concluidos": 0,
            "movimentos": [{"origem": "node_modules", "destino": ".next"}],
        })
        with self.assertRaisesRegex(artefatos.ErroArtefatos, "fora do contrato"):
            self.gerenciador.recuperar()
        self.assertTrue(origem.is_file())
        self.assertTrue(self.gerenciador.journal.exists())


class TestFronteiraProcessos(unittest.TestCase):
    def test_falha_inventario_impede_rename(self) -> None:
        with tempfile.TemporaryDirectory() as temporario:
            gerenciador = artefatos.GerenciadorArtefatos(temporario)
            with mock.patch.object(
                artefatos, "processos_checkout", side_effect=artefatos.ErroArtefatos("consulta indisponível")
            ), mock.patch.object(artefatos, "_renomear_sem_sobrescrever") as mover:
                with self.assertRaisesRegex(artefatos.ErroArtefatos, "consulta indisponível"):
                    gerenciador.ativar(artefatos.plataforma_atual())
                mover.assert_not_called()
                self.assertFalse(gerenciador.manifesto.exists())

    def test_pid_vivo_sem_estado_impede_rename(self) -> None:
        with tempfile.TemporaryDirectory() as temporario:
            gerenciador = artefatos.GerenciadorArtefatos(temporario)
            with mock.patch.object(artefatos, "processos_checkout", return_value=[123]), \
                 mock.patch.object(artefatos, "_renomear_sem_sobrescrever") as mover:
                with self.assertRaisesRegex(artefatos.ErroArtefatos, "processo vivo"):
                    gerenciador.ativar(artefatos.plataforma_atual())
                mover.assert_not_called()

    def test_node_real_sem_estado_e_preservado(self) -> None:
        node = shutil.which("node")
        if not node:
            self.skipTest("Node real necessário")
        with tempfile.TemporaryDirectory() as temporario:
            raiz = Path(temporario).resolve()
            script = raiz / "processo-teste.js"
            script.write_text(
                "process.stdout.write('pronto\\n'); process.stdin.resume(); "
                "process.stdin.on('end', () => process.exit(0));", encoding="utf-8"
            )
            processo = subprocess.Popen(
                [node, str(script)], cwd=raiz, stdin=subprocess.PIPE,
                stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
            )
            try:
                self.assertEqual(processo.stdout.readline().strip(), "pronto")
                if artefatos.plataforma_atual() == "linux":
                    pids = artefatos._consultar_processos([
                        "/bin/sh", "-c", artefatos.CONSULTA_PROC_LINUX,
                        "lyra-inventario", str(raiz)
                    ])
                    self.assertIn(processo.pid, pids)
                gerenciador = artefatos.GerenciadorArtefatos(raiz)
                with self.assertRaises(artefatos.ErroArtefatos):
                    gerenciador.ativar(artefatos.plataforma_atual())
                self.assertIsNone(processo.poll())
                self.assertTrue(script.exists())
                self.assertFalse(gerenciador.manifesto.exists())
            finally:
                processo.stdin.close()
                processo.wait(timeout=10)
                processo.stdout.close()
                processo.stderr.close()


if __name__ == "__main__":
    unittest.main()


class TestRenomearSemRenameat2(unittest.TestCase):
    """Caminho sem RENAME_NOREPLACE (disco do Windows no WSL2, DrvFS)."""

    def setUp(self) -> None:
        self.temporario = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporario.cleanup)
        self.raiz = Path(self.temporario.name)

    def test_arquivo_vai_para_destino_ausente(self) -> None:
        origem, destino = self.raiz / "a.zip", self.raiz / "b.zip"
        origem.write_bytes(b"dados")
        artefatos._renomear_sem_renameat2(origem, destino)
        self.assertFalse(origem.exists())
        self.assertEqual(destino.read_bytes(), b"dados")

    def test_arquivo_nao_sobrescreve_destino_existente(self) -> None:
        origem, destino = self.raiz / "a.zip", self.raiz / "b.zip"
        origem.write_bytes(b"novo")
        destino.write_bytes(b"antigo")
        with self.assertRaises(artefatos.ErroArtefatos):
            artefatos._renomear_sem_renameat2(origem, destino)
        self.assertEqual(origem.read_bytes(), b"novo")
        self.assertEqual(destino.read_bytes(), b"antigo")

    def test_pasta_nao_sobrescreve_e_move_quando_livre(self) -> None:
        origem, destino = self.raiz / "node_modules", self.raiz / "alvo"
        origem.mkdir()
        (origem / "pacote.txt").write_text("x")
        destino.mkdir()
        with self.assertRaises(artefatos.ErroArtefatos):
            artefatos._renomear_sem_renameat2(origem, destino)
        self.assertTrue((origem / "pacote.txt").exists())
        destino.rmdir()
        artefatos._renomear_sem_renameat2(origem, destino)
        self.assertTrue((destino / "pacote.txt").exists())
        self.assertFalse(origem.exists())
