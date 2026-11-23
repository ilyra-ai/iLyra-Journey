#!/usr/bin/env bash
# Prova de backup e restauração do MySQL sem tocar no banco em uso
# (tarefa 172, item 4).
#
# 1. Faz um dump lógico consistente (--single-transaction) do banco do app.
# 2. Restaura o dump num banco descartável no mesmo servidor.
# 3. Compara, tabela a tabela, a quantidade de linhas e o CHECKSUM TABLE.
# 4. Apaga o banco descartável e o arquivo temporário.
#
# As credenciais vêm do .env.local e passam pelo ambiente do contêiner
# (MYSQL_PWD), nunca pela linha de comando nem pela saída.
#
# Uso: bash scripts/verificar-backup-restauracao.sh [contêiner]
set -euo pipefail

CONTAINER="${1:-lyra-metacare-mysql}"
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
ler() { grep -E "^$1=" "$RAIZ/.env.local" | head -1 | cut -d= -f2- | sed -E "s/^['\"]|['\"]$//g"; }

BANCO="$(ler MYSQL_DATABASE)"
SENHA="$(ler MYSQL_ROOT_PASSWORD)"
[ -n "$BANCO" ] && [ -n "$SENHA" ] || {
  echo "Faltam MYSQL_DATABASE ou MYSQL_ROOT_PASSWORD no .env.local." >&2
  exit 2
}
COPIA="${BANCO}_restauracao_$(date +%s)"
mysql_root() { docker exec -i -e MYSQL_PWD="$SENHA" "$CONTAINER" mysql -uroot "$@"; }

limpar() { mysql_root -e "DROP DATABASE IF EXISTS \`$COPIA\`" >/dev/null 2>&1 || true; }
trap limpar EXIT

inicio=$(date +%s)
docker exec -e MYSQL_PWD="$SENHA" "$CONTAINER" sh -c \
  "mysqldump -uroot --single-transaction --routines --triggers --no-tablespaces --set-gtid-purged=OFF '$BANCO' > /tmp/lyra-backup.sql"
tamanho=$(docker exec "$CONTAINER" sh -c 'wc -c < /tmp/lyra-backup.sql')
echo "Backup: ${tamanho} bytes em $(( $(date +%s) - inicio )) s."

mysql_root -e "CREATE DATABASE \`$COPIA\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
docker exec -e MYSQL_PWD="$SENHA" "$CONTAINER" sh -c \
  "mysql -uroot '$COPIA' < /tmp/lyra-backup.sql && rm -f /tmp/lyra-backup.sql"
echo "Restauração no banco descartável concluída em $(( $(date +%s) - inicio )) s."

TABELAS=$(mysql_root -N -e "SELECT table_name FROM information_schema.tables WHERE table_schema = '$BANCO' AND table_type = 'BASE TABLE' ORDER BY table_name")
total=0
diferentes=0
for t in $TABELAS; do
  total=$((total + 1))
  a=$(mysql_root -N -e "SELECT COUNT(*) FROM \`$BANCO\`.\`$t\`; CHECKSUM TABLE \`$BANCO\`.\`$t\`" | awk 'NR==1{c=$1} NR==2{s=$2} END{print c":"s}')
  b=$(mysql_root -N -e "SELECT COUNT(*) FROM \`$COPIA\`.\`$t\`; CHECKSUM TABLE \`$COPIA\`.\`$t\`" | awk 'NR==1{c=$1} NR==2{s=$2} END{print c":"s}')
  if [ "$a" != "$b" ]; then
    diferentes=$((diferentes + 1))
    echo "DIFERENTE: $t (original $a, restaurado $b)"
  fi
done
echo "Tabelas conferidas: $total; diferentes: $diferentes."
[ "$diferentes" -eq 0 ]
