import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const raiz = path.resolve('.next/static');
async function listar(dir) {
  const partes = await Promise.all(
    (await readdir(dir, { withFileTypes: true })).map(async (e) => {
      const p = path.join(dir, e.name);
      return e.isDirectory()
        ? listar(p)
        : /\.(js|css|woff2?|ttf)$/.test(e.name)
          ? [
              '/_next/static/' +
                path.relative(raiz, p).split(path.sep).join('/'),
            ]
          : [];
    })
  );
  return partes.flat();
}
const assets = (await listar(raiz)).sort();
const build = await readFile('.next/BUILD_ID', 'utf8');
const versao = createHash('sha256')
  .update(build + JSON.stringify(assets))
  .digest('hex')
  .slice(0, 24);
await writeFile(
  'public/offline-assets.json',
  JSON.stringify({ versao, assets })
);
console.log(`Recursos públicos offline preparados: ${assets.length}.`);
