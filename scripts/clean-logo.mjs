// scripts/clean-logo.mjs — one-shot processor for the AIPCA logo source.
// The source PNG has a flattened checkerboard pattern baked into pixels
// where it should be transparent. This walks the raw buffer and zeros out
// alpha on any near-grey pixel (the checkerboard is greyscale ~239 / black),
// leaving the cross's coloured pixels untouched.
//
// Run once when the source logo changes:
//   node scripts/clean-logo.mjs
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const inPath = resolve(__dirname, '..', 'public', 'aipca-logo.png');
const outPath = resolve(__dirname, '..', 'public', 'aipca-logo.png');

const { data, info } = await sharp(await readFile(inPath))
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const buf = Buffer.from(data);

// Pixel-by-pixel: if the pixel is greyscale (R≈G≈B) and very light or near-
// black with low saturation, treat it as background and zero its alpha.
for (let i = 0; i < buf.length; i += 4) {
  const r = buf[i], g = buf[i + 1], b = buf[i + 2];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const range = max - min;
  const isGreyscale = range <= 6;
  const isLight = max >= 220;
  if (isGreyscale && isLight) {
    buf[i + 3] = 0;
  }
}

const cleaned = await sharp(buf, { raw: { width: info.width, height: info.height, channels: 4 } })
  .trim({ threshold: 5 })
  .png()
  .toBuffer();

await writeFile(outPath, cleaned);
console.log(`Cleaned logo → ${outPath} (${cleaned.length} bytes)`);
