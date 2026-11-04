#!/usr/bin/env node
// Confere a resolução corrigida e os consumidores reais dos padrões de lint.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { ESLint } from 'eslint';

const require = createRequire(import.meta.url);
const requireEslint = createRequire(require.resolve('eslint'));
const requireArray = createRequire(
  requireEslint.resolve('@eslint/config-array')
);
const requireConfig = createRequire(require.resolve('eslint-config-next'));
const requireTypescript = createRequire(
  requireConfig.resolve('typescript-eslint')
);
const requireParser = createRequire(
  requireTypescript.resolve('@typescript-eslint/parser')
);
const requireEstree = createRequire(
  requireParser.resolve('@typescript-eslint/typescript-estree')
);

for (const consumidor of [requireEslint, requireArray, requireEstree]) {
  assert.equal(consumidor('minimatch/package.json').version, '11.0.4');
  const { Minimatch, minimatch } = consumidor('minimatch');
  assert.equal(new Minimatch('src/**/*.tsx').match('src/app/page.tsx'), true);
  assert.equal(
    new Minimatch('src/**/*.tsx').match('scripts/env-init.mjs'),
    false
  );
  assert.equal(minimatch('.config.js', '*.js', { dot: true }), true);
  // Duas formas da classe de entrada do advisory, sem expansão recursiva.
  for (const padrao of ['**/../**/../arquivo', '**/a/../**/b/../arquivo']) {
    assert.equal(
      typeof minimatch('arquivo', padrao, { optimizationLevel: 2 }),
      'boolean'
    );
  }
}

const eslint = new ESLint({
  overrideConfigFile: true,
  overrideConfig: [
    { ignores: ['src/ignorado/**'] },
    {
      files: ['src/**/*.js'],
      rules: { 'no-debugger': 'error' },
    },
  ],
});
const [resultado] = await eslint.lintText('debugger;', {
  filePath: 'src/verificacao.js',
});
assert.equal(resultado.messages[0]?.ruleId, 'no-debugger');
assert.equal(await eslint.isPathIgnored('src/ignorado/verificacao.js'), true);
const descobertos = await new ESLint().lintFiles([
  'src/lib/plans/rotas.test.ts',
]);
assert.equal(descobertos.length, 1);
assert.equal(descobertos[0].fatalErrorCount, 0);

const parser = requireParser('@typescript-eslint/parser');
const analisado = parser.parseForESLint('const valor = 1;', {
  filePath: 'verificacao-minimatch.js',
  tsconfigRootDir: process.cwd(),
  projectService: { allowDefaultProject: ['verificacao-*.js'] },
});
assert.ok(analisado.services.program);
console.log(
  'Minimatch 11.0.4: resolução, padrões adversariais, descoberta, ignores, regra e parser real aprovados.'
);
