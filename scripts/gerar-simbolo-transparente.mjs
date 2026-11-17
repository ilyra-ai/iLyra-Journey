#!/usr/bin/env node
/**
 * Gera o símbolo da Lyra com fundo transparente (tarefa 222).
 *
 * Origem: `src/assets/celestial/simbolo.png` (1254 × 1254, "L" dourado
 * abraçando o coração sobre azul-noite opaco). O fundo é uniforme; a cor é
 * amostrada nos quatro cantos. Cada pixel recebe opacidade proporcional à
 * distância de cor até o fundo, com uma faixa de transição para a borda
 * suave, e a cor é "despremultiplicada" (retirada a parcela do fundo) para o
 * contorno dourado não ficar com franja azul sobre fundos claros.
 *
 * Uso: node scripts/gerar-simbolo-transparente.mjs
 * Determinístico: a mesma origem gera o mesmo arquivo.
 */
import sharp from 'sharp';

const ORIGEM = 'src/assets/celestial/simbolo.png';
const DESTINO = 'src/assets/celestial/simbolo-transparente.png';
/** Distância de cor (0 a ~441) abaixo da qual o pixel é fundo. */
const INICIO_DA_BORDA = 18;
/** Distância a partir da qual o pixel é totalmente opaco. */
const FIM_DA_BORDA = 120;

const { data, info } = await sharp(ORIGEM)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

const cantos = [
  [4, 4],
  [width - 5, 4],
  [4, height - 5],
  [width - 5, height - 5],
];
const fundo = [0, 1, 2].map((c) =>
  Math.round(
    cantos.reduce(
      (soma, [x, y]) => soma + data[(y * width + x) * channels + c],
      0
    ) / cantos.length
  )
);

const saida = Buffer.alloc(width * height * 4);
for (let i = 0, j = 0; i < data.length; i += channels, j += 4) {
  const cor = [data[i], data[i + 1], data[i + 2]];
  const distancia = Math.hypot(
    cor[0] - fundo[0],
    cor[1] - fundo[1],
    cor[2] - fundo[2]
  );
  const alfa = Math.min(
    1,
    Math.max(
      0,
      (distancia - INICIO_DA_BORDA) / (FIM_DA_BORDA - INICIO_DA_BORDA)
    )
  );
  for (let c = 0; c < 3; c += 1) {
    // cor = alfa · original + (1 − alfa) · fundo  ⇒  original = …
    const original =
      alfa > 0 ? (cor[c] - (1 - alfa) * fundo[c]) / alfa : fundo[c];
    saida[j + c] = Math.round(Math.min(255, Math.max(0, original)));
  }
  saida[j + 3] = Math.round(alfa * 255);
}

// Recorta as bordas vazias (o original tem ~15% de margem) e devolve uma
// margem pequena e igual nos quatro lados, num quadrado.
const recortado = await sharp(
  await sharp(saida, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer()
)
  .trim({ threshold: 1 })
  .toBuffer({ resolveWithObject: true });
const lado = Math.max(recortado.info.width, recortado.info.height);
const margem = Math.round(lado * 0.04);
const total = lado + 2 * margem;
const esquerda = Math.floor((total - recortado.info.width) / 2);
const topo = Math.floor((total - recortado.info.height) / 2);
await sharp(recortado.data)
  .extend({
    left: esquerda,
    right: total - recortado.info.width - esquerda,
    top: topo,
    bottom: total - recortado.info.height - topo,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png({ compressionLevel: 9 })
  .toFile(DESTINO);

const conferido = await sharp(DESTINO).stats();
console.log(
  `Fundo amostrado: rgb(${fundo.join(', ')}). Gerado ${DESTINO} (alfa mínimo ${conferido.channels[3].min}, máximo ${conferido.channels[3].max}).`
);
