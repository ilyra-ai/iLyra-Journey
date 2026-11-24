#!/usr/bin/env node
/**
 * Marca iLyra (tarefa 173), aprovada pelo titular em 24/11/2026: "iLyra" em
 * Clicker Script com o pingo do "i" trocado pela estrela Vega, a mais
 * brilhante da constelação de Lyra, e o slogan em Imprima. O símbolo é um
 * anel com a constelação de Lyra e Vega em destaque.
 *
 * As letras viram curvas a partir das fontes do próprio projeto (SIL OFL, em
 * src/assets/fonts/), com o fontkit; o PNG sai do SVG pelo sharp. Tudo com
 * fundo transparente.
 *
 * Gera:
 * - src/components/marca/ilyra/desenho.ts: curvas usadas pelos componentes
 *   LogoILyra e SimboloILyra (SVG embutido, que segue as cores do tema);
 * - src/assets/marca/ilyra/*.svg: originais vetoriais;
 * - src/app/favicon.ico (16, 32, 48 e 64 px), src/app/icon.png (192 px) e
 *   src/app/apple-icon.png (180 px);
 * - public/icones/lyra-192.png, lyra-512.png e lyra-maskable-512.png
 *   (símbolo dentro da área segura de 80%);
 * - docs/marca/ilyra-logo-*.png: logo para o README, nos temas claro e
 *   escuro.
 *
 * Uso: node scripts/gerar-marca-ilyra.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as fontkit from 'fontkit';
import * as prettier from 'prettier';
import sharp from 'sharp';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fonte = (arquivo) =>
  fontkit.openSync(path.join(raiz, 'src/assets/fonts', arquivo));
const FONTES = {
  script: fonte('clicker-script/ClickerScript-Regular.ttf'),
  imprima: fonte('imprima/Imprima-Regular.ttf'),
};

const COR = {
  ouroClaro: '#F1DF94',
  ouroGrad: ['#F8EBB4', '#F1DF94', '#E6C766'],
  ouroIcone: ['#EDD27A', '#D9B24E', '#B8902F'],
  ouroTemaClaro: '#7A5B17',
  textoClaro: '#F7F1E6',
  textoEscuro: '#2A2118',
};

const r1 = (n) => Math.round(n * 10) / 10;
/** Arredonda os números de um caminho SVG para uma casa decimal. */
const enxuto = (d) => d.replace(/-?\d+\.\d+/g, (n) => String(r1(Number(n))));

function curvas(qual, texto, tamanho, espaco = 0) {
  const f = FONTES[qual];
  const s = tamanho / f.unitsPerEm;
  const run = f.layout(texto);
  let x = 0;
  const partes = [];
  const glifos = [];
  run.glyphs.forEach((g, i) => {
    const pos = run.positions[i];
    partes.push(
      g.path
        .scale(s, -s)
        .translate(x + pos.xOffset * s, 0)
        .toSVG()
    );
    const b = g.bbox;
    glifos.push({
      minX: x + b.minX * s,
      maxX: x + b.maxX * s,
      topo: -b.maxY * s,
      fundo: -b.minY * s,
    });
    x += pos.xAdvance * s + espaco;
  });
  return { d: partes.join(' '), largura: x - espaco, glifos };
}

function estrela(cx, cy, r, aperto = 0.16) {
  const k = r * aperto;
  const n = (v) => r1(v);
  return `M${n(cx)} ${n(cy - r)}Q${n(cx + k)} ${n(cy - k)} ${n(cx + r)} ${n(cy)}Q${n(cx + k)} ${n(cy + k)} ${n(cx)} ${n(cy + r)}Q${n(cx - k)} ${n(cy + k)} ${n(cx - r)} ${n(cy)}Q${n(cx - k)} ${n(cy - k)} ${n(cx)} ${n(cy - r)}Z`;
}

/** Constelação de Lyra estilizada: Vega, ε, ζ e o paralelogramo ζ δ γ β. */
function lira(x, y, e) {
  const p = {
    vega: [0, 0],
    epsilon: [0.42, -0.1],
    zeta: [0.34, 0.36],
    delta: [0.66, 0.78],
    gamma: [0.5, 1.32],
    beta: [0.16, 1.18],
  };
  const P = Object.fromEntries(
    Object.entries(p).map(([k, [a, b]]) => [k, [r1(x + a * e), r1(y + b * e)]])
  );
  const L = [
    ['vega', 'epsilon'],
    ['epsilon', 'zeta'],
    ['zeta', 'vega'],
    ['zeta', 'delta'],
    ['delta', 'gamma'],
    ['gamma', 'beta'],
    ['beta', 'zeta'],
  ];
  return {
    P,
    linhas: L.map(
      ([a, b]) => `M${P[a][0]} ${P[a][1]}L${P[b][0]} ${P[b][1]}`
    ).join(''),
  };
}

// ---------------------------------------------------------------- logotipo
function montarLogo() {
  const tam = 210;
  const base = 250;
  const i = curvas('script', 'ı', tam);
  const lyra = curvas('script', 'Lyra', tam);
  const gi = i.glifos[0];
  const gap = 22;
  const lyraX = i.largura + gap;
  const vx = gi.maxX - (gi.maxX - gi.minX) * 0.28;
  const vy = base + gi.topo - 40;
  const sl = curvas(
    'imprima',
    'DECIFRANDO O COSMOS, ILUMINANDO DESTINOS',
    26,
    5.2
  );
  // Caixa justa: da ponta esquerda da estrela até o fim do "a"; do topo da
  // estrela ao fim da perna do "y" (sem slogan) ou ao fim do slogan.
  const minX = Math.min(vx - 36, gi.minX);
  const maxX = lyraX + Math.max(...lyra.glifos.map((g) => g.maxX));
  const minY = Math.min(
    vy - 30 - 9,
    base + Math.min(...lyra.glifos.map((g) => g.topo))
  );
  const fundoNome =
    base +
    Math.max(
      ...lyra.glifos.map((g) => g.fundo),
      ...i.glifos.map((g) => g.fundo)
    );
  const larguraNome = maxX - minX;
  const slogY = fundoNome + 46;
  const pad = 6;
  // Origem no canto do nome: o slogan, centralizado sob o nome, pode passar
  // dos dois lados, e o viewBox com slogan começa num x negativo.
  const ox = -minX + pad;
  const oy = -minY + pad;
  const larguraComPad = larguraNome + pad * 2;
  const slX = (larguraComPad - sl.largura) / 2;
  const mover = (d, dx, dy) => enxuto(transladar(d, dx, dy));
  const alturaNome = fundoNome - minY + pad * 2;
  return {
    viewBox: [0, 0, r1(larguraComPad), r1(alturaNome)],
    viewBoxSlogan: [
      r1(Math.min(0, slX - pad)),
      0,
      r1(Math.max(larguraComPad, sl.largura + pad * 2)),
      r1(slogY + oy + 12),
    ],
    i: mover(i.d, ox, base + oy),
    lyra: mover(lyra.d, lyraX + ox, base + oy),
    vega: estrela(vx + ox, vy + oy, 36),
    brilho: [r1(vx + ox), r1(vy + oy), 46],
    estrelinha: estrela(vx + 52 + ox, vy - 30 + oy, 9),
    slogan: mover(sl.d, slX, slogY + oy),
  };
}

/** Translada todas as coordenadas de um caminho SVG absoluto (M, L, Q, C, Z). */
function transladar(d, dx, dy) {
  return d.replace(/([MLQCZ])([^MLQCZ]*)/g, (_, cmd, args) => {
    if (cmd === 'Z') return 'Z';
    const nums = args
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    const out = nums.map((v, k) => (k % 2 === 0 ? v + dx : v + dy));
    return cmd + out.map((v) => r1(v)).join(' ');
  });
}

// ----------------------------------------------------------------- símbolo
function montarSimbolo() {
  const t = 100;
  const { P, linhas } = lira(t * 0.34, t * 0.3, t * 0.34);
  return {
    viewBox: [0, 0, t, t],
    anel: { cx: 50, cy: 50, r: 40 },
    completo: {
      linhas,
      pontos: Object.entries(P)
        .filter(([k]) => k !== 'vega')
        .map(([, p]) => p),
      vega: estrela(P.vega[0], P.vega[1], 15),
      brilho: [P.vega[0], P.vega[1], 13],
    },
    simples: { vega: estrela(50, 50, 27, 0.2) },
  };
}

const LOGO = montarLogo();
const SIMBOLO = montarSimbolo();

// ------------------------------------------------------- arquivo para o app
const ts = `// Gerado por scripts/gerar-marca-ilyra.mjs a partir das fontes do projeto.
// Não editar à mão: rode \`node scripts/gerar-marca-ilyra.mjs\`.

export const DESENHO_DO_LOGO = ${JSON.stringify(LOGO, null, 2)} as const;

export const DESENHO_DO_SIMBOLO = ${JSON.stringify(SIMBOLO, null, 2)} as const;
`;
fs.mkdirSync(path.join(raiz, 'src/components/marca/ilyra'), {
  recursive: true,
});
// Já no formato do Prettier do projeto, para `pnpm check:format` continuar
// verde depois de gerar de novo.
const arquivoDoDesenho = path.join(
  raiz,
  'src/components/marca/ilyra/desenho.ts'
);
fs.writeFileSync(
  arquivoDoDesenho,
  await prettier.format(ts, {
    ...(await prettier.resolveConfig(arquivoDoDesenho)),
    filepath: arquivoDoDesenho,
  })
);

// ---------------------------------------------------------- SVGs estáticos
const gradiente = (id, cores) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${cores
    .map(
      (c, k) => `<stop offset="${k / (cores.length - 1)}" stop-color="${c}"/>`
    )
    .join('')}</linearGradient>`;
const brilho = `<radialGradient id="brilho"><stop offset="0" stop-color="#FFF6D2" stop-opacity="0.8"/><stop offset="1" stop-color="#F1DF94" stop-opacity="0"/></radialGradient>`;

function svgLogo({ slogan, texto, ouro, comBrilho }) {
  const vb = slogan ? LOGO.viewBoxSlogan : LOGO.viewBox;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}" width="${vb[2]}" height="${vb[3]}" role="img" aria-label="iLyra">
<title>iLyra</title>
<defs>${gradiente('ouro', ouro)}${brilho}</defs>
${comBrilho ? `<circle cx="${LOGO.brilho[0]}" cy="${LOGO.brilho[1]}" r="${LOGO.brilho[2]}" fill="url(#brilho)"/>` : ''}
<path d="${LOGO.vega}" fill="url(#ouro)"/>
<path d="${LOGO.estrelinha}" fill="url(#ouro)" opacity="0.8"/>
<path d="${LOGO.i}" fill="url(#ouro)"/>
<path d="${LOGO.lyra}" fill="${texto}"/>
${slogan ? `<path d="${LOGO.slogan}" fill="url(#ouro)"/>` : ''}
</svg>
`;
}

function svgSimbolo({ px, ouro = COR.ouroIcone, area = 1 }) {
  const s = SIMBOLO;
  const simples = px < 48;
  const escala = area;
  const off = (100 - 100 * escala) / 2;
  const corpo = simples
    ? `<circle cx="50" cy="50" r="44" fill="none" stroke="url(#ouro)" stroke-width="8"/><path d="${s.simples.vega}" fill="url(#ouro)"/>`
    : `<circle cx="50" cy="50" r="${s.anel.r}" fill="none" stroke="url(#ouro)" stroke-width="2.4"/>
<circle cx="${s.completo.brilho[0]}" cy="${s.completo.brilho[1]}" r="${s.completo.brilho[2]}" fill="url(#brilho)"/>
<path d="${s.completo.linhas}" stroke="${ouro[1]}" stroke-opacity="0.75" stroke-width="1.3" fill="none"/>
${s.completo.pontos.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="${ouro[1]}"/>`).join('')}
<path d="${s.completo.vega}" fill="url(#ouro)"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${px}" height="${px}" role="img" aria-label="iLyra">
<defs>${gradiente('ouro', ouro)}${brilho}</defs>
<g transform="translate(${off} ${off}) scale(${escala})">${corpo}</g>
</svg>
`;
}

const dirMarca = path.join(raiz, 'src/assets/marca/ilyra');
fs.mkdirSync(dirMarca, { recursive: true });
const originais = {
  'logo-ilyra.svg': svgLogo({
    slogan: false,
    texto: COR.textoClaro,
    ouro: COR.ouroGrad,
    comBrilho: true,
  }),
  'logo-ilyra-slogan.svg': svgLogo({
    slogan: true,
    texto: COR.textoClaro,
    ouro: COR.ouroGrad,
    comBrilho: true,
  }),
  'logo-ilyra-tema-claro.svg': svgLogo({
    slogan: false,
    texto: COR.textoEscuro,
    ouro: COR.ouroIcone,
    comBrilho: false,
  }),
  'logo-ilyra-slogan-tema-claro.svg': svgLogo({
    slogan: true,
    texto: COR.textoEscuro,
    ouro: COR.ouroIcone,
    comBrilho: false,
  }),
  'simbolo-ilyra.svg': svgSimbolo({ px: 512 }),
  'simbolo-ilyra-pequeno.svg': svgSimbolo({ px: 32 }),
};
for (const [nome, conteudo] of Object.entries(originais))
  fs.writeFileSync(path.join(dirMarca, nome), conteudo);

// -------------------------------------------------------------- PNG e ICO
const png = (svg, largura) =>
  sharp(Buffer.from(svg), { density: 300 })
    .resize({ width: largura })
    .png({ compressionLevel: 9 })
    .toBuffer();

/** ICO com imagens PNG embutidas (formato aceito desde o Windows Vista). */
function ico(imagens) {
  const cabecalho = Buffer.alloc(6);
  cabecalho.writeUInt16LE(0, 0);
  cabecalho.writeUInt16LE(1, 2);
  cabecalho.writeUInt16LE(imagens.length, 4);
  let deslocamento = 6 + 16 * imagens.length;
  const entradas = imagens.map(({ px, dados }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(px >= 256 ? 0 : px, 0);
    e.writeUInt8(px >= 256 ? 0 : px, 1);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(dados.length, 8);
    e.writeUInt32LE(deslocamento, 12);
    deslocamento += dados.length;
    return e;
  });
  return Buffer.concat([
    cabecalho,
    ...entradas,
    ...imagens.map((i) => i.dados),
  ]);
}

const gravar = (rel, dados) => {
  fs.mkdirSync(path.dirname(path.join(raiz, rel)), { recursive: true });
  fs.writeFileSync(path.join(raiz, rel), dados);
  console.log(`  ${rel}`);
};

console.log('Marca iLyra:');
gravar(
  'src/app/favicon.ico',
  ico(
    await Promise.all(
      [16, 32, 48, 64].map(async (px) => ({
        px,
        dados: await png(svgSimbolo({ px }), px),
      }))
    )
  )
);
gravar('src/app/icon.png', await png(svgSimbolo({ px: 192 }), 192));
gravar(
  'src/app/apple-icon.png',
  await png(svgSimbolo({ px: 180, area: 0.86 }), 180)
);
gravar('public/icones/lyra-192.png', await png(svgSimbolo({ px: 192 }), 192));
gravar('public/icones/lyra-512.png', await png(svgSimbolo({ px: 512 }), 512));
gravar(
  'public/icones/lyra-maskable-512.png',
  await png(svgSimbolo({ px: 512, area: 0.72 }), 512)
);
gravar(
  'docs/marca/ilyra-logo-tema-escuro.png',
  await png(originais['logo-ilyra-slogan.svg'], 1200)
);
gravar(
  'docs/marca/ilyra-logo-tema-claro.png',
  await png(originais['logo-ilyra-slogan-tema-claro.svg'], 1200)
);
console.log(
  '  src/components/marca/ilyra/desenho.ts e src/assets/marca/ilyra/*.svg'
);
