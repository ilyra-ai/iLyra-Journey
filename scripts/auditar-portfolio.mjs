/** Inventário estático reproduzível. Não consulta dados, segredos ou serviços. */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

const raiz = process.cwd();
const relativo = (arquivo) =>
  path.relative(raiz, arquivo).split(path.sep).join('/');
async function listar(diretorio) {
  const resultado = [];
  for (const entrada of await readdir(diretorio, { withFileTypes: true })) {
    const arquivo = path.join(diretorio, entrada.name);
    if (entrada.isDirectory()) resultado.push(...(await listar(arquivo)));
    else if (entrada.isFile() && /\.(?:ts|tsx)$/.test(entrada.name))
      resultado.push(arquivo);
  }
  return resultado.sort();
}

const arquivos = [
  ...(await listar(path.join(raiz, 'src'))),
  ...(await listar(path.join(raiz, 'modules'))),
];
const conhecidos = new Set(arquivos);
const metodos = new Set([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
]);
const sinaisDeControle =
  /^(?:require|autorizar|exigir|lerJson|withTransaction|consumeUsageQuota|conferir)/;
const modulos = [];
const testes = [];
for (const arquivo of arquivos) {
  const fonte = await readFile(arquivo, 'utf8');
  const nome = relativo(arquivo);
  if (/\.(?:test|spec)\.tsx?$/.test(nome)) {
    testes.push(nome);
    continue;
  }
  if (nome.endsWith('.d.ts')) continue;
  const arvore = ts.createSourceFile(nome, fonte, ts.ScriptTarget.Latest, true);
  const importacoes = [];
  const exportacoes = [];
  const controles = new Set();
  let funcoes = 0;
  const linha = (no) =>
    arvore.getLineAndCharacterOfPosition(no.getStart(arvore)).line + 1;
  const exportado = (no) =>
    no.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
  const visitar = (no) => {
    if (
      ts.isFunctionDeclaration(no) ||
      ts.isArrowFunction(no) ||
      ts.isFunctionExpression(no) ||
      ts.isMethodDeclaration(no) ||
      ts.isGetAccessor(no) ||
      ts.isSetAccessor(no)
    )
      funcoes++;
    if (ts.isCallExpression(no)) {
      const chamado = no.expression.getText(arvore);
      if (sinaisDeControle.test(chamado)) controles.add(chamado);
    }
    if (
      (ts.isImportDeclaration(no) || ts.isExportDeclaration(no)) &&
      no.moduleSpecifier &&
      ts.isStringLiteral(no.moduleSpecifier)
    ) {
      const origem = no.moduleSpecifier.text;
      const base = origem.startsWith('@/')
        ? path.join(raiz, 'src', origem.slice(2))
        : origem.startsWith('.')
          ? path.resolve(path.dirname(arquivo), origem)
          : null;
      const alvo =
        base &&
        [
          base,
          base + '.ts',
          base + '.tsx',
          path.join(base, 'index.ts'),
          path.join(base, 'index.tsx'),
        ].find((p) => conhecidos.has(p));
      importacoes.push({
        origem,
        alvo: alvo ? relativo(alvo) : null,
        linha: linha(no),
      });
    }
    if (exportado(no)) {
      if (ts.isFunctionDeclaration(no))
        exportacoes.push({
          nome: no.name?.text ?? 'default',
          tipo: 'funcao',
          linha: linha(no),
        });
      else if (ts.isVariableStatement(no)) {
        for (const declaracao of no.declarationList.declarations)
          exportacoes.push({
            nome: declaracao.name.getText(arvore),
            tipo:
              declaracao.initializer &&
              (ts.isArrowFunction(declaracao.initializer) ||
                ts.isFunctionExpression(declaracao.initializer))
                ? 'funcao'
                : 'valor',
            linha: linha(declaracao),
          });
      }
    }
    ts.forEachChild(no, visitar);
  };
  visitar(arvore);
  const ehApi = /^src\/app\/api\/.+\/route\.ts$/.test(nome);
  const ehPagina = /^src\/app\/(?:.+\/)?page\.tsx$/.test(nome);
  const rota =
    ehApi || ehPagina
      ? '/' +
        nome
          .replace(/^src\/app\//, '')
          .replace(/(?:^|\/)(?:page\.tsx|route\.ts)$/, '')
          .split('/')
          .filter((p) => !/^\([^)]*\)$/.test(p))
          .join('/')
      : null;
  modulos.push({
    arquivo: nome,
    sha256: createHash('sha256').update(fonte).digest('hex'),
    funcoes,
    exportacoes,
    importacoes,
    ...(rota !== null
      ? {
          rota,
          tipo: ehApi ? 'api' : 'pagina',
          metodos: ehApi
            ? exportacoes.filter((e) => metodos.has(e.nome)).map((e) => e.nome)
            : [],
          sinaisDeControle: [...controles].sort(),
        }
      : {}),
  });
}
const tabelas = new Set();
const migracoes = (await readdir(path.join(raiz, 'mysql/migrations')))
  .filter((n) => n.endsWith('.sql'))
  .sort();
for (const nome of migracoes) {
  const sql = await readFile(path.join(raiz, 'mysql/migrations', nome), 'utf8');
  for (const resultado of sql.matchAll(
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)/gi
  ))
    tabelas.add(resultado[1]);
}
const codigoPython = `
import ast, hashlib, json
from pathlib import Path
resultado = []
for arquivo in sorted(Path('services').rglob('*.py')):
    fonte = arquivo.read_bytes()
    arvore = ast.parse(fonte, filename=str(arquivo))
    funcoes = []
    for no in ast.walk(arvore):
        if isinstance(no, (ast.FunctionDef, ast.AsyncFunctionDef)):
            rotas = []
            for decorador in no.decorator_list:
                if isinstance(decorador, ast.Call) and isinstance(decorador.func, ast.Attribute) and decorador.func.attr in ('get', 'post', 'put', 'patch', 'delete'):
                    rota = decorador.args[0] if decorador.args else None
                    if isinstance(rota, ast.Constant) and isinstance(rota.value, str):
                        rotas.append({'metodo': decorador.func.attr.upper(), 'rota': rota.value})
            funcoes.append({'nome': no.name, 'linha': no.lineno, 'assincrona': isinstance(no, ast.AsyncFunctionDef), 'rotas': rotas})
    resultado.append({'arquivo': arquivo.as_posix(), 'sha256': hashlib.sha256(fonte).hexdigest(), 'funcoes': funcoes})
print(json.dumps(resultado))
`;
const servicosPython = JSON.parse(
  execFileSync('python3', ['-c', codigoPython], { encoding: 'utf8' })
);
const inventario = {
  geradoEm: new Date().toISOString(),
  commitBase: execFileSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
  }).trim(),
  escopo:
    'Arquivos TS/TSX de src e modules, sem testes ou declarações de tipos; serviços Python e migrations SQL. Metadados estáticos, não homologação funcional ou prova de autorização.',
  totais: {
    modulos: modulos.length,
    funcoes: modulos.reduce((s, m) => s + m.funcoes, 0),
    paginas: modulos.filter((m) => m.tipo === 'pagina').length,
    apis: modulos.filter((m) => m.tipo === 'api').length,
    operacoesHttp: modulos.reduce((s, m) => s + (m.metodos?.length ?? 0), 0),
    testes: testes.length,
    migracoes: migracoes.length,
    tabelasDeclaradas: tabelas.size,
  },
  tabelasDeclaradas: [...tabelas].sort(),
  testes,
  modulos,
  servicosPython,
};
const saida = process.argv[2];
if (saida) {
  const destino = path.resolve(raiz, saida);
  const basePermitida = path.join(raiz, 'docs', 'auditoria') + path.sep;
  if (!destino.startsWith(basePermitida) || !destino.endsWith('.json'))
    throw new Error('A saída deve ser um JSON dentro de docs/auditoria.');
  await writeFile(destino, JSON.stringify(inventario, null, 2) + '\n', 'utf8');
  console.log(
    JSON.stringify({ arquivo: relativo(destino), ...inventario.totais })
  );
} else console.log(JSON.stringify(inventario, null, 2));
