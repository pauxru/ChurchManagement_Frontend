// scripts/generate-og-png.mjs — converts public/og-image.svg to public/og-image.png
// Run once after the SVG changes: `node scripts/generate-og-png.mjs`
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = resolve(__dirname, '..', 'public', 'og-image.svg');
const pngPath = resolve(__dirname, '..', 'public', 'og-image.png');

const svg = await readFile(svgPath);
const png = await sharp(svg, { density: 200 }).resize(1200, 630).png({ quality: 90 }).toBuffer();
await writeFile(pngPath, png);
console.log(`Wrote ${pngPath} (${png.length} bytes)`);
