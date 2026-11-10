// Measures each selected thumbnail against the colors Awwwards recorded for it: the share of pixels
// nearest to each recorded color, within a distance, plus the largest unmatched color areas.
// This suggests a ground; the visual review decides it. Thumbnails are submitter images and often show
// the site inside a device or on a backdrop, so area here is evidence, not a verdict.
// Exact records use ΔEok 0.08. Category records use 0.15, since a swatch only names a family.
// Output: research/data/thumbnail-measures.json (numbers only, no image data)
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { RESEARCH } from './lib/sotd.mjs';
import { rgb8ToOklab, labToLch, rgbToHex } from '../../tools/lib/color.mjs';
import { hexToRgb } from '../../tools/lib/color.mjs';

const LEGACY = new Set(['#FFFFFF', '#000000', '#2779A7', '#9C9C9C', '#D14836', '#ECD06F', '#49C5B6', '#987654', '#DF6C4F', '#FF9398']);
const sel = JSON.parse(fs.readFileSync(path.join(RESEARCH, 'data/review-selection.json'), 'utf8')).sites;
const thumbs = path.join(RESEARCH, '.cache/thumbs');
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const r3 = (x) => Math.round(x * 1000) / 1000;

const out = [];
for (const s of sel) {
  const exactRecord = s.date >= '2023-01-01' && !s.colors.some((c) => LEGACY.has(c) && c !== '#FFFFFF' && c !== '#000000');
  const tol = exactRecord ? 0.08 : 0.15;
  const rec = s.colors.map((c) => rgb8ToOklab(...hexToRgb(c)));
  const { data, info } = await sharp(path.join(thumbs, `${s.id}.img`)).resize(200, 150, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const total = info.width * info.height;
  const near = rec.map(() => 0), border = rec.map(() => 0);
  let borderTotal = 0;
  const rest = new Map();
  for (let i = 0, p = 0; i < data.length; i += 3, p++) {
    const x = p % info.width, y = Math.floor(p / info.width);
    const edge = x < 8 || y < 6 || x >= info.width - 8 || y >= info.height - 6;
    const lab = rgb8ToOklab(data[i], data[i + 1], data[i + 2]);
    let best = -1, bd = Infinity;
    rec.forEach((c, k) => { const d = dist(lab, c); if (d < bd) { bd = d; best = k; } });
    if (edge) borderTotal++;
    if (best >= 0 && bd <= tol) { near[best]++; if (edge) border[best]++; continue; }
    const k = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
    const e = rest.get(k) || [0, 0, 0, 0];
    e[0]++; e[1] += data[i]; e[2] += data[i + 1]; e[3] += data[i + 2];
    rest.set(k, e);
  }
  const unmatched = [...rest.values()].sort((a, b) => b[0] - a[0]).slice(0, 3).map(([n, r, g, b]) => {
    const rgb = [r / n, g / n, b / n].map(Math.round);
    const [L, C, h] = labToLch(...rgb8ToOklab(...rgb));
    return { hex: rgbToHex(rgb), share: r3(n / total), oklch: [r3(L), r3(C), C < 0.01 ? null : Math.round(h)] };
  });
  const share = near.map((n) => r3(n / total));
  const lead = share.length > 1 ? (share[0] > share[1] ? 1 : 2) : 1;
  out.push({
    n: s.n, group: s.group, id: s.id, record: exactRecord ? 'exact' : 'category', tolerance: tol,
    recorded: s.colors,
    share,
    borderShare: border.map((n) => r3(n / borderTotal)),
    unmatchedShare: r3(1 - near.reduce((a, b) => a + b, 0) / total),
    largestUnmatched: unmatched,
    suggestedGround: s.colors.length >= 2 ? lead : null,
    margin: s.colors.length >= 2 ? r3(Math.abs(share[0] - share[1])) : null,
  });
}
fs.writeFileSync(path.join(RESEARCH, 'data/thumbnail-measures.json'), JSON.stringify({ method: 'Pixels of a 200x150 resize assigned to the nearest recorded color within the tolerance (ΔEok). Border is the outer 8 px by 6 px frame. Suggested ground is the recorded color with more area.', sites: out }, null, 1) + '\n');
const two = out.filter((o) => o.recorded.length === 2);
console.log(`${out.length} measured; two-color ${two.length}; margin < 0.10: ${two.filter((o) => o.margin < 0.1).length}; unmatched > 50%: ${out.filter((o) => o.unmatchedShare > 0.5).length}`);
