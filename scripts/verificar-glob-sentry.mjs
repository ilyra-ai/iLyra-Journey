#!/usr/bin/env node
/*
  Verifica a substituição do glob 13 pelo 14 no @sentry/bundler-plugins
  (override em pnpm-workspace.yaml, que elimina os avisos GHSA-3g3m-2fjr-6pw4
  e GHSA-g3hv-75wg-m249).

  O plugin só usa o glob em `globFiles`, ao localizar os arquivos gerados
  pelo build para injetar os identificadores de depuração e enviar os source
  maps. Este script chama essa função real com padrões de arquivos do próprio
  repositório e compara o resultado com a listagem do sistema de arquivos:
  mesmos arquivos, caminhos absolutos e nenhum diretório.

  Uso: node scripts/verificar-glob-sentry.mjs
*/
import { readdirSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const raizNext = realpathSync(path.join('node_modules', '@sentry', 'nextjs'));
const raizPlugin = path.dirname(
  require.resolve('@sentry/bundler-plugins/package.json', {
    paths: [raizNext],
  })
);
const versaoDoGlob = require(
  require.resolve('glob/package.json', { paths: [raizPlugin] })
).version;
const { globFiles } = require(path.join(raizPlugin, 'build/cjs/core/glob.js'));

const esperado = readdirSync('scripts', { withFileTypes: true })
  .filter((e) => e.isFile() && e.name.endsWith('.mjs'))
  .map((e) => path.resolve('scripts', e.name))
  .sort();
const obtido = (await globFiles(['scripts/*.mjs', 'scripts'])).sort();

const falhas = [];
if (Number(versaoDoGlob.split('.')[0]) < 14)
  falhas.push(`glob ${versaoDoGlob} ainda é a versão vulnerável`);
if (JSON.stringify(obtido) !== JSON.stringify(esperado))
  falhas.push(
    `resultado diferente do sistema de arquivos:\n  esperado ${JSON.stringify(esperado)}\n  obtido   ${JSON.stringify(obtido)}`
  );
if (obtido.some((c) => !path.isAbsolute(c)))
  falhas.push('caminho relativo no resultado');

if (falhas.length) {
  console.error(`Falhou (glob ${versaoDoGlob}):\n- ${falhas.join('\n- ')}`);
  process.exit(1);
}
console.log(
  `globFiles do Sentry com glob ${versaoDoGlob}: ${obtido.length} arquivos, absolutos e sem diretórios, iguais à listagem.`
);
