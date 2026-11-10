// Reduces a screenshot to an area-weighted palette: 32 levels per channel, the mean color of each bin.
// Usage: node research/tools/palette-from-image.mjs screenshot.png > palette.json
// Ported from the v0 prototype's palette_from_image.py.
import sharp from 'sharp';

const file = process.argv[2];
if (!file) { console.error('Usage: node palette-from-image.mjs <image>'); process.exit(1); }
const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const total = info.width * info.height;
const bins = new Map();
for (let i = 0; i < data.length; i += 3) {
  const r = data[i], g = data[i + 1], b = data[i + 2];
  const k = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
  const e = bins.get(k) || [0, 0, 0, 0];
  e[0]++; e[1] += r; e[2] += g; e[3] += b;
  bins.set(k, e);
}
const hex = (x) => Math.round(x).toString(16).padStart(2, '0');
const palette = [...bins.values()]
  .map(([n, r, g, b]) => ({ hex: `#${hex(r / n)}${hex(g / n)}${hex(b / n)}`.toUpperCase(), share: Number((n / total).toFixed(6)) }))
  .sort((a, b) => b.share - a.share);
console.log(JSON.stringify(palette, null, 1));
