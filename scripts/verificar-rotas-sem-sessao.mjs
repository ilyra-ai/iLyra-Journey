#!/usr/bin/env node
// Varredura das rotas de API sem sessão (tarefa 171, item 9).
//
// Chama cada método exportado de cada src/app/api/**/route.ts no servidor
// em execução, sem cookie nenhum, e confere que as rotas privadas recusam
// com 401 ou 403. Rotas públicas por desenho ficam na lista PUBLICAS, cada
// uma com o motivo. Sai com código 1 se alguma rota privada responder de
// outro jeito.
//
// Uso: node scripts/verificar-rotas-sem-sessao.mjs [origem]
//      (padrão: http://localhost:3000; o app precisa estar no ar)
import fs from 'node:fs';
import path from 'node:path';

const origem = (process.argv[2] ?? 'http://localhost:3000').replace(/\/+$/, '');
const base = path.join(process.cwd(), 'src', 'app', 'api');

const PUBLICAS = [
  // Descoberta gratuita, cartões, funil e catálogo de planos.
  /^\/api\/public\//,
  // Entrar, cadastrar, sair e ler a própria sessão (vazia sem cookie).
  /^\/api\/auth\/(login|register|logout|session)$/,
  // Login com Google e Apple: o estado assinado protege o retorno.
  /^\/api\/auth\/social\//,
  // Chaves de acesso: o login exige desafio de uso único.
  /^\/api\/auth\/chave\/login/,
  // Webhooks: assinatura do provedor conferida na rota.
  /^\/api\/webhooks\//,
  // Agenda no calendário: acesso pelo token secreto do próprio link.
  /^\/api\/calendario\/feed\//,
  /^\/api\/health/,
  // Céu geral sem sessão; com sessão, exige o plano.
  /^\/api\/astrology\/ephemeris$/,
  // Só a disponibilidade global dos recursos, sem atores nem histórico.
  /^\/api\/plataforma\/funcionalidades$/,
  // Avatares: dois buckets, só imagens raster, sem sair do bucket.
  /^\/api\/storage\/\[bucket\]/,
  // Rotina agendada: 404 sem segredo configurado, 401 com segredo errado.
  /^\/api\/coach\/rotina$/,
];

const VALOR = {
  '[provedor]': 'google',
  '[pageKey]': 'login',
  '[ambiente]': 'test',
};
const ID = '00000000-0000-4000-8000-000000000000';

function rotas(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return rotas(p);
    return e.name === 'route.ts' ? [p] : [];
  });
}

const resultado = [];
for (const arquivo of rotas(base)) {
  const codigo = fs.readFileSync(arquivo, 'utf8');
  const metodos = [
    ...codigo.matchAll(
      /export (?:async )?function (GET|POST|PUT|PATCH|DELETE)\b/g
    ),
  ].map((m) => m[1]);
  const rota = `/api/${path
    .relative(base, path.dirname(arquivo))
    .split(path.sep)
    .join('/')}`;
  const url = rota.replace(/\[[^\]]+\]/g, (p) => VALOR[p] ?? ID);
  const publica = PUBLICAS.some((r) => r.test(rota));
  for (const metodo of metodos) {
    let status = 0;
    let corpo = '';
    try {
      const r = await fetch(origem + url, {
        method: metodo,
        redirect: 'manual',
        headers: { origin: origem, 'content-type': 'application/json' },
        body: metodo === 'GET' ? undefined : '{}',
      });
      status = r.status;
      corpo = (await r.text()).slice(0, 140).replace(/\s+/g, ' ');
    } catch (erro) {
      corpo = String(erro);
    }
    const veredito = publica
      ? 'publica'
      : [401, 403].includes(status)
        ? 'ok'
        : 'falha';
    resultado.push({ rota, metodo, status, veredito, corpo });
  }
}

const contagem = resultado.reduce(
  (a, r) => ({ ...a, [r.veredito]: (a[r.veredito] ?? 0) + 1 }),
  {}
);
console.log(`Rotas e métodos: ${resultado.length}`, JSON.stringify(contagem));
const falhas = resultado.filter((r) => r.veredito === 'falha');
for (const r of falhas)
  console.log(`falha ${r.metodo} ${r.rota} -> ${r.status} ${r.corpo}`);
process.exit(falhas.length ? 1 : 0);
