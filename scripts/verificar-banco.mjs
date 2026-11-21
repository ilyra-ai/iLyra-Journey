#!/usr/bin/env node
/**
 * Verificação do banco antes do `pnpm dev` (script `predev`).
 *
 * Sem o MySQL no ar, o servidor de desenvolvimento subia normalmente e todas
 * as páginas falhavam com 500 (configurações, planos, cadastro e
 * login), sem dizer que a causa era o banco. Aqui, antes de iniciar o Next:
 *   1. conecta ao MySQL do `.env.local` (até 10 s);
 *   2. confere se todas as migrations do repositório estão aplicadas.
 * Na falha, mostra a causa e o comando que resolve e encerra com exit 1.
 * Nunca imprime senhas.
 *
 * Para iniciar mesmo assim (ex.: trabalhar só em telas estáticas):
 *   LYRA_IGNORAR_VERIFICACAO_DO_BANCO=1 pnpm dev
 */
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import mysql from 'mysql2/promise';

import { loadEnvFile } from './lib/env-file.mjs';
import { MIGRATION_TABLE, sortMigrationFiles } from './lib/migrations.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const COMO_SUBIR =
  'Suba o banco com "./run.sh db" (WSL2/Linux), "py run_windows.py db" (Windows) ou "pnpm db:start".';

function falhar(mensagem) {
  console.error(`[ERRO] ${mensagem}`);
  console.error(
    '       Para iniciar mesmo assim: LYRA_IGNORAR_VERIFICACAO_DO_BANCO=1 pnpm dev'
  );
  process.exitCode = 1;
}

function explicar(erro, destino) {
  const codigo = erro?.code;
  if (
    [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'EHOSTUNREACH',
      'EAI_AGAIN',
    ].includes(codigo)
  ) {
    return `MySQL inacessível em ${destino} (${codigo}). ${COMO_SUBIR} Confira também MYSQL_HOST e MYSQL_PORT no .env.local.`;
  }
  if (codigo === 'ER_ACCESS_DENIED_ERROR') {
    return `O MySQL em ${destino} recusou o usuário (${codigo}). Confira MYSQL_USER e MYSQL_PASSWORD no .env.local.`;
  }
  if (codigo === 'ER_BAD_DB_ERROR') {
    return `O banco ${destino} não existe (${codigo}). ${COMO_SUBIR}`;
  }
  return `Falha ao conectar em ${destino}: ${codigo ?? erro?.message ?? 'erro desconhecido'}.`;
}

async function main() {
  if (process.env.LYRA_IGNORAR_VERIFICACAO_DO_BANCO === '1') {
    console.warn('[AVISO] Verificação do banco ignorada a pedido.');
    return;
  }
  await loadEnvFile(raiz, '.env.local');
  await loadEnvFile(raiz, '.env');

  const faltando = [
    'MYSQL_HOST',
    'MYSQL_USER',
    'MYSQL_PASSWORD',
    'MYSQL_DATABASE',
  ].filter((chave) => !process.env[chave]);
  if (faltando.length > 0) {
    falhar(
      `Variáveis ausentes: ${faltando.join(', ')}. Rode "pnpm env:init" para criar o .env.local.`
    );
    return;
  }

  const porta = Number(process.env.MYSQL_PORT ?? '3306');
  const destino = `${process.env.MYSQL_HOST}:${porta}/${process.env.MYSQL_DATABASE}`;
  let conexao;
  try {
    conexao = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: porta,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      connectTimeout: 10_000,
    });
  } catch (erro) {
    falhar(explicar(erro, destino));
    return;
  }

  try {
    const arquivos = sortMigrationFiles(
      (await readdir(path.join(raiz, 'mysql', 'migrations'))).filter((nome) =>
        nome.endsWith('.sql')
      )
    );
    let aplicadas = new Set();
    try {
      const [linhas] = await conexao.query(
        `SELECT name FROM ${MIGRATION_TABLE}`
      );
      aplicadas = new Set(linhas.map((linha) => linha.name));
    } catch (erro) {
      if (erro?.code !== 'ER_NO_SUCH_TABLE') throw erro;
    }
    const pendentes = arquivos.filter((arquivo) => !aplicadas.has(arquivo));
    if (pendentes.length > 0) {
      falhar(
        `${pendentes.length} migration(s) pendente(s) em ${destino} (primeira: ${pendentes[0]}). Rode "./run.sh migrate", "py run_windows.py migrate" ou "pnpm db:migrate".`
      );
      return;
    }
    console.log(
      `[OK] MySQL em ${destino} com ${arquivos.length} migrations aplicadas.`
    );
  } catch (erro) {
    falhar(
      `Falha ao conferir as migrations em ${destino}: ${erro?.code ?? erro?.message}.`
    );
  } finally {
    await conexao.end();
  }
}

await main();
