"""Contrato destrutivo do purge: Bash/Node reais, fronteira Docker interceptada.

Nenhum container ou volume real é criado, parado, copiado ou removido.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]


@unittest.skipUnless(sys.platform.startswith("linux") and shutil.which("node"), "exige Bash e Node Linux")
class TestPurgeRunSh(unittest.TestCase):
    def executar(self, caso: str = "ok", confirmado: bool = True):
        fonte = (RAIZ / "run.sh").read_text(encoding="utf-8")
        trecho = re.search(r"^cmd_purge\(\) \{\n.*?^\}", fonte, re.MULTILINE | re.DOTALL)
        self.assertIsNotNone(trecho)
        assert trecho is not None
        identificador = "a" * 64
        item = {
            "Id": identificador,
            "Config": {"Labels": {
                "com.docker.compose.service": "mysql",
                "com.docker.compose.project.working_dir": "/projeto",
                "com.docker.compose.project": "lyra",
            }},
            "Mounts": [{"Destination": "/var/lib/mysql", "Type": "volume", "Name": "lyra_mysql_data"}],
        }
        if caso == "alheio":
            item["Config"]["Labels"]["com.docker.compose.project.working_dir"] = "/outro"
        if caso == "bind":
            item["Mounts"][0]["Type"] = "bind"
        if caso == "volume_divergente":
            item["Mounts"][0]["Name"] = "outro_mysql_data"
        ambiente = dict(os.environ, CASO=caso, ID=identificador, INSPECAO=json.dumps([item]))
        with tempfile.TemporaryDirectory() as pasta:
            ambiente["ULTIMA_SAIDA"] = str(Path(pasta) / "backup.log")
            programa = r'''
set -uo pipefail
RAIZ=/projeto; SERVICO_DB=mysql
titulo() { :; }; info() { :; }; ok() { :; }; etapa() { :; }
erro() { printf '%s\n' "$*" >&2; }
etapa_preflight() { :; }; etapa_env() { :; }
parar_app() { echo APP_PARADO; }
remover_artefato() { echo "ARTEFATO:$*"; }
compose() {
  case "$*" in
    "ps -a -q mysql") [[ "$CASO" != ausente ]] && printf '%s' "$ID";;
    "config --format json") printf '%s' '{"services":{"mysql":{"volumes":[{"type":"volume","source":"mysql_data","target":"/var/lib/mysql"}]}},"volumes":{"mysql_data":{"name":"lyra_mysql_data"}}}';;
    *) echo "COMPOSE_PROIBIDO:$*" >&2; return 80;;
  esac
}
docker() {
  case "$*" in
    "inspect "*)
      if [[ "$CASO" == troca && -f "$ULTIMA_SAIDA" ]]; then printf '[]'; else printf '%s' "$INSPECAO"; fi;;
    "volume inspect --format "*) [[ "$CASO" != volume_alheio ]] && printf lyra;;
    "volume inspect lyra_mysql_backup") [[ "$CASO" != backup_ausente ]];;
    "rm -f "*) echo "REMOVER_CONTAINER:$*";;
    "volume rm "*) echo "REMOVER_VOLUME:$*";;
    *) echo "DOCKER_PROIBIDO:$*" >&2; return 81;;
  esac
}
consultar() { "$@"; }
executar() {
  shift
  if [[ "$1" == node ]]; then
    echo BACKUP_SOLICITADO
    [[ "$CASO" != backup_falha ]] || return 82
    case "$CASO" in
      sem_backup) printf 'Volume inexistente\n' > "$ULTIMA_SAIDA";;
      backup_igual) printf 'BACKUP_VOLUME=lyra_mysql_data\n' > "$ULTIMA_SAIDA";;
      *) printf 'BACKUP_VOLUME=lyra_mysql_backup\n' > "$ULTIMA_SAIDA";;
    esac
  else
    "$@"
  fi
}
'''
            programa += "\n" + trecho.group(0) + "\ncmd_purge "
            programa += "--confirmar-purge" if confirmado else ""
            return subprocess.run(["bash", "-c", programa], env=ambiente, text=True,
                                  capture_output=True, check=False, timeout=15)

    def test_remove_somente_mysql_apos_backup(self):
        resultado = self.executar()
        self.assertEqual(resultado.returncode, 0, resultado.stderr)
        self.assertIn("BACKUP_SOLICITADO", resultado.stdout)
        self.assertIn("REMOVER_CONTAINER:rm -f " + "a" * 64, resultado.stdout)
        self.assertIn("REMOVER_VOLUME:volume rm lyra_mysql_data", resultado.stdout)
        self.assertLess(resultado.stdout.index("BACKUP_SOLICITADO"), resultado.stdout.index("REMOVER_CONTAINER"))
        self.assertNotIn("PROIBIDO", resultado.stderr)
        self.assertNotIn("memoria_data", resultado.stdout)
        self.assertNotIn("treinamento_data", resultado.stdout)

    def test_recusa_sem_confirmacao_antes_de_qualquer_mutacao(self):
        resultado = self.executar(confirmado=False)
        self.assertEqual(resultado.returncode, 2)
        self.assertNotIn("APP_PARADO", resultado.stdout)

    def test_recusa_identidade_ou_montagem_nao_comprovada(self):
        for caso in ("ausente", "alheio", "bind", "volume_divergente", "volume_alheio"):
            with self.subTest(caso=caso):
                resultado = self.executar(caso)
                self.assertNotEqual(resultado.returncode, 0)
                self.assertNotIn("APP_PARADO", resultado.stdout)
                self.assertNotIn("REMOVER_", resultado.stdout)

    def test_backup_falho_ausente_ou_identidade_alterada_nao_remove(self):
        for caso in ("backup_falha", "sem_backup", "backup_igual", "backup_ausente", "troca"):
            with self.subTest(caso=caso):
                resultado = self.executar(caso)
                self.assertNotEqual(resultado.returncode, 0)
                self.assertNotIn("REMOVER_", resultado.stdout)
                self.assertNotIn("ARTEFATO:", resultado.stdout)


if __name__ == "__main__":
    unittest.main()
