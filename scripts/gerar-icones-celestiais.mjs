#!/usr/bin/env node
/**
 * Ícones de instalação com o símbolo celestial aprovado (tarefa 219).
 *
 * O favicon e o `icon.png` já vêm do símbolo celestial
 * (`scripts/gerar-icones-da-marca.py --favicon-celestial`), mas o ícone da
 * tela inicial do iOS e os ícones do manifesto (PWA) continuavam com o logo
 * antigo num ladrilho branco. Este script os gera do mesmo símbolo, sem
 * redesenhá-lo:
 *
 * - `src/app/apple-icon.png` (180 px): o iOS não aceita transparência;
 * - `public/icones/lyra-192.png` e `lyra-512.png`: o símbolo inteiro, que já
 *   tem o fundo azul-noite da arte aprovada;
 * - `public/icones/lyra-maskable-512.png`: o Android recorta o ícone em
 *   formas variadas; a marca fica na área segura (círculo central de 80%),
 *   com o mesmo fundo da arte em volta.
 *
 * Todos são opacos, como os formatos exigem. A cor do fundo é amostrada no
 * canto do símbolo, para a borda acrescentada no maskable não destoar.
 *
 * Uso (na raiz do repositório): node scripts/gerar-icones-celestiais.mjs
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const origem = path.join(raiz, 'src/assets/celestial/simbolo.png');
// Área segura do maskable: 80% do lado (especificação W3C de ícones
// mascaráveis); 0,78 deixa uma pequena folga além dela.
const ESCALA_MASKABLE = 0.78;

const meta = await sharp(origem).metadata();
if (meta.width !== meta.height) {
  throw new Error('O símbolo celestial precisa ser quadrado.');
}
const canto = await sharp(origem)
  .extract({ left: 2, top: 2, width: 1, height: 1 })
  .removeAlpha()
  .raw()
  .toBuffer();
const fundo = { r: canto[0], g: canto[1], b: canto[2] };

async function inteiro(lado, destino) {
  await sharp(origem)
    .resize(lado, lado, { kernel: 'lanczos3' })
    .flatten({ background: fundo })
    .png({ compressionLevel: 9 })
    .toFile(path.join(raiz, destino));
  return destino;
}

async function mascaravel(lado, destino) {
  const interno = Math.round(lado * ESCALA_MASKABLE);
  const simbolo = await sharp(origem)
    .resize(interno, interno, { kernel: 'lanczos3' })
    .flatten({ background: fundo })
    .png()
    .toBuffer();
  const deslocamento = Math.round((lado - interno) / 2);
  await sharp({
    create: { width: lado, height: lado, channels: 3, background: fundo },
  })
    .composite([{ input: simbolo, left: deslocamento, top: deslocamento }])
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(path.join(raiz, destino));
  return destino;
}

const gerados = [
  await inteiro(180, 'src/app/apple-icon.png'),
  await inteiro(192, 'public/icones/lyra-192.png'),
  await inteiro(512, 'public/icones/lyra-512.png'),
  await mascaravel(512, 'public/icones/lyra-maskable-512.png'),
];
for (const arquivo of gerados) {
  const m = await sharp(path.join(raiz, arquivo)).metadata();
  console.log(
    `${arquivo}  ${m.width}x${m.height}  ${m.hasAlpha ? 'com alfa' : 'opaco'}`
  );
}
