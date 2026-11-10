// Downloads the selected Awwwards thumbnails and lays them out as numbered review sheets,
// each thumbnail shown with its recorded colors in Awwwards order (labelled 1, 2, 3).
// Thumbnails and sheets stay in research/.cache: they are Awwwards and submitter images.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { RESEARCH } from './lib/sotd.mjs';

const sel = JSON.parse(fs.readFileSync(path.join(RESEARCH, 'data/review-selection.json'), 'utf8')).sites;
const thumbs = path.join(RESEARCH, '.cache/thumbs');
const sheets = path.join(RESEARCH, '.cache/sheets');
fs.mkdirSync(thumbs, { recursive: true });
fs.mkdirSync(sheets, { recursive: true });

for (const s of sel) {
  const file = path.join(thumbs, `${s.id}.img`);
  if (fs.existsSync(file)) continue;
  try {
    const r = await fetch(s.thumbnail);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    console.log('thumbnail failed', s.id, String(e));
  }
  await new Promise((r) => setTimeout(r, 150));
}

const TW = 352, TH = 264, CELL_W = 364, CELL_H = 312, COLS = 4, ROWS = 4;
const esc = (t) => t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
for (let p = 0; p * COLS * ROWS < sel.length; p++) {
  const page = sel.slice(p * COLS * ROWS, (p + 1) * COLS * ROWS);
  const layers = [];
  for (const [i, s] of page.entries()) {
    const x = (i % COLS) * CELL_W + 6, y = Math.floor(i / COLS) * CELL_H + 6;
    const file = path.join(thumbs, `${s.id}.img`);
    if (fs.existsSync(file)) {
      try { layers.push({ input: await sharp(file).resize(TW, TH, { fit: 'contain', background: '#808080' }).toBuffer(), left: x, top: y }); } catch {}
    }
    const chips = s.colors.map((c, k) => `<rect x="${110 + k * 62}" y="2" width="56" height="30" fill="${c}" stroke="#808080"/><text x="${110 + k * 62 + 4}" y="22" font-size="15" font-family="Helvetica" font-weight="bold" fill="${k % 2 ? '#ff00ff' : '#00ffff'}" stroke="#000" stroke-width="0.6">${k + 1}</text>`).join('');
    const svg = `<svg width="${TW}" height="36" xmlns="http://www.w3.org/2000/svg"><rect width="${TW}" height="36" fill="#ffffff"/><text x="4" y="23" font-size="17" font-family="Helvetica" font-weight="bold" fill="#000">#${s.n} ${s.group}${s.year % 100}</text>${chips}</svg>`;
    layers.push({ input: Buffer.from(svg), left: x, top: y + TH + 4 });
  }
  const out = path.join(sheets, `sheet-${String(p + 1).padStart(2, '0')}.jpg`);
  await sharp({ create: { width: COLS * CELL_W + 6, height: ROWS * CELL_H + 6, channels: 3, background: '#808080' } }).composite(layers).jpeg({ quality: 82 }).toFile(out);
  console.log(out, page.map((s) => s.n).join(','));
}
