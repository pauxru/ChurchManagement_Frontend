// scripts/generate-og-png.mjs — composites the AIPCA logo onto a 1200x630
// social card with title text. Run after the logo changes:
//   node scripts/generate-og-png.mjs
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const logoPath = resolve(__dirname, '..', 'public', 'aipca-logo.png');
const pngPath = resolve(__dirname, '..', 'public', 'og-image.png');

const W = 1200;
const H = 630;

// Red-gradient background + the title text rendered via SVG overlay.
const overlaySvg = Buffer.from(`
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#991b1b"/>
      <stop offset="100%" stop-color="#7f1d1d"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <text x="720" y="270" fill="#fde047" font-family="Georgia, serif"
        font-size="36" font-weight="bold" letter-spacing="4">
    AIPCA · GATUNDU DIOCESE
  </text>
  <text x="720" y="350" fill="#ffffff" font-family="Georgia, serif"
        font-size="64" font-weight="bold">
    African Independent
  </text>
  <text x="720" y="420" fill="#ffffff" font-family="Georgia, serif"
        font-size="64" font-weight="bold">
    Pentecostal Church
  </text>
  <text x="720" y="490" fill="#fecaca" font-family="Georgia, serif"
        font-size="28" font-style="italic">
    Rooted in Christ, Reaching the Nations
  </text>
</svg>
`);

// Source logo has a ~5px opaque off-white border. Trim it with a lenient
// threshold so the bg color shows through cleanly behind the cross.
const logo = await sharp(await readFile(logoPath))
  .trim({ threshold: 40 })
  .resize(420, 420, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .toBuffer();

const png = await sharp(overlaySvg)
  .composite([{ input: logo, left: 110, top: 105 }])
  .png({ quality: 90 })
  .toBuffer();

await writeFile(pngPath, png);
console.log(`Wrote ${pngPath} (${png.length} bytes)`);
