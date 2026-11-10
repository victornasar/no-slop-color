// Tests the Image-Led concept (Phase 2 decision D2) against the photo-led entries of the thumbnail review,
// before any Image-Led direction is written.
//
// The concept: an Image-Led direction has no ground color. It is defined by the tone of its imagery
// (Light or Dark, the same foundation axis as pairs), one type color that sits on the imagery, and a scrim
// that protects legibility. For that to describe real sites, three things must hold. Criteria fixed before
// the first run:
//   C1 Tone resolves:   the thumbnail's median OKLCH L is outside 0.45–0.65 for at least 80% of entries.
//   C2 Type opposes tone: light type on dark imagery, or dark type on light imagery, for at least 80% of
//                         entries where both are known.
//   C3 One type color:  the reviewed figure is a single flat color for at least 80% of entries.
// Mockup thumbnails are measured whole and reported separately; the result is given with and without them.
// Output: research/data/analysis/image-led-test.json and image-led-test.md
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { RESEARCH } from './lib/sotd.mjs';
import { rgb8ToOklab, labToLch, hexToOklch } from '../../tools/lib/color.mjs';

const sel = JSON.parse(fs.readFileSync(path.join(RESEARCH, 'data/review-selection.json'), 'utf8')).sites;
const review = JSON.parse(fs.readFileSync(path.join(RESEARCH, 'data/thumbnail-review.json'), 'utf8')).sites;
const BAND = [0.45, 0.65], PASS = 0.8;
const isPhotoLed = (l) => l && /^Photo-led|^Monochrome photo/.test(l) && !/in mockup/.test(l);

// Type lightness: a recorded color is measured; an unrecorded one is read from the reviewer's words.
function typeTone(fig, colors) {
  if (typeof fig === 'number') return { tone: hexToOklch(colors[fig - 1])[0] >= 0.6 ? 'light' : 'dark', basis: 'recorded color' };
  if (typeof fig === 'string' && fig.startsWith('unrecorded: ')) {
    const w = fig.slice(12);
    if (/white|cream|gold|pale|light/.test(w)) return { tone: 'light', basis: 'reviewer description' };
    if (/black|dark|navy/.test(w)) return { tone: 'dark', basis: 'reviewer description' };
    return { tone: null, basis: 'reviewer description, tone unclear' };
  }
  return { tone: null, basis: fig };
}

const rows = [];
for (const r of review.filter((x) => isPhotoLed(x.proposed_label))) {
  const s = sel[r.n - 1];
  const { data } = await sharp(path.join(RESEARCH, '.cache/thumbs', `${s.id}.img`)).resize(160, 120, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const Ls = [], Cs = [];
  for (let i = 0; i < data.length; i += 3) { const [L, C] = labToLch(...rgb8ToOklab(data[i], data[i + 1], data[i + 2])); Ls.push(L); Cs.push(C); }
  Ls.sort((a, b) => a - b); Cs.sort((a, b) => a - b);
  const median = Ls[Ls.length >> 1], chroma = Cs[Cs.length >> 1];
  const tone = median < BAND[0] ? 'Dark' : median > BAND[1] ? 'Light' : null;
  const t = typeTone(r.figure, s.colors);
  rows.push({
    n: r.n, group: s.group, mockup: r.mockup, label: r.proposed_label,
    medianL: +median.toFixed(3), medianC: +chroma.toFixed(3), imageryTone: tone,
    typeFlat: typeof r.figure === 'number' || (typeof r.figure === 'string' && r.figure.startsWith('unrecorded: ')),
    typeTone: t.tone, typeBasis: t.basis,
    opposes: tone && t.tone ? (tone === 'Dark') === (t.tone === 'light') : null,
  });
}

function evaluate(rs) {
  const c1 = rs.filter((r) => r.imageryTone).length, c2n = rs.filter((r) => r.opposes != null), c2 = c2n.filter((r) => r.opposes).length, c3 = rs.filter((r) => r.typeFlat).length;
  const crit = (k, n) => ({ n: k, of: n, pct: Math.round((1000 * k) / n) / 10, pass: k / n >= PASS });
  const out = { n: rs.length, C1_toneResolves: crit(c1, rs.length), C2_typeOpposesTone: crit(c2, c2n.length), C3_oneTypeColor: crit(c3, rs.length) };
  out.pass = out.C1_toneResolves.pass && out.C2_typeOpposesTone.pass && out.C3_oneTypeColor.pass;
  out.tone = { Dark: rs.filter((r) => r.imageryTone === 'Dark').length, Light: rs.filter((r) => r.imageryTone === 'Light').length, unresolved: rs.filter((r) => !r.imageryTone).length };
  out.imageryChroma = { 'near-neutral (median C < 0.03)': rs.filter((r) => r.medianC < 0.03).length, 'muted (0.03–0.08)': rs.filter((r) => r.medianC >= 0.03 && r.medianC < 0.08).length, 'colorful (≥ 0.08)': rs.filter((r) => r.medianC >= 0.08).length };
  out.typeTone = { light: rs.filter((r) => r.typeTone === 'light').length, dark: rs.filter((r) => r.typeTone === 'dark').length, unknown: rs.filter((r) => !r.typeTone).length };
  return out;
}

const result = {
  concept: 'Image-Led: imagery tone (Light/Dark) + one type color + a scrim, with no ground color.',
  criteria: { C1: `median thumbnail L outside ${BAND.join('–')} for ≥ ${PASS * 100}%`, C2: `type polarity opposes imagery tone for ≥ ${PASS * 100}% of entries where both are known`, C3: `figure is a single flat color for ≥ ${PASS * 100}%` },
  entries: rows.length,
  all: evaluate(rows),
  withoutMockups: evaluate(rows.filter((r) => !r.mockup)),
  byGroup: Object.fromEntries(['A', 'B', 'C'].map((g) => [g, evaluate(rows.filter((r) => r.group === g))])),
  failures: rows.filter((r) => !r.imageryTone || r.opposes === false || !r.typeFlat),
  rows,
};
fs.writeFileSync(path.join(RESEARCH, 'data/analysis/image-led-test.json'), JSON.stringify(result, null, 1) + '\n');

const crit = (c) => `${c.n} of ${c.of} (${c.pct}%) · ${c.pass ? 'pass' : 'FAIL'}`;
const md = `# Image-Led concept test

Generated by \`research/tools/image-led-test.mjs\`. Phase 2 decision D2 asked for this test before any Image-Led direction is written.

**Concept.** ${result.concept}

**Criteria, fixed before the first run.** C1: ${result.criteria.C1}. C2: ${result.criteria.C2}. C3: ${result.criteria.C3}.

**Entries.** The ${rows.length} reviewed sites whose proposed label is photo-led (family "Photo-led" in \`review.md\`). Imagery tone is measured from thumbnail pixels; type tone is measured for recorded colors and read from the reviewer's words otherwise.

| | All (${result.all.n}) | Without mockups (${result.withoutMockups.n}) |
| --- | --- | --- |
| C1 Tone resolves | ${crit(result.all.C1_toneResolves)} | ${crit(result.withoutMockups.C1_toneResolves)} |
| C2 Type opposes tone | ${crit(result.all.C2_typeOpposesTone)} | ${crit(result.withoutMockups.C2_typeOpposesTone)} |
| C3 One type color | ${crit(result.all.C3_oneTypeColor)} | ${crit(result.withoutMockups.C3_oneTypeColor)} |
| **Concept** | **${result.all.pass ? 'supported' : 'not supported'}** | **${result.withoutMockups.pass ? 'supported' : 'not supported'}** |

Imagery tone: Dark ${result.all.tone.Dark}, Light ${result.all.tone.Light}, unresolved ${result.all.tone.unresolved}. Type tone: light ${result.all.typeTone.light}, dark ${result.all.typeTone.dark}, unknown ${result.all.typeTone.unknown}. Imagery chroma: ${Object.entries(result.all.imageryChroma).map(([k, v]) => `${k} ${v}`).join(', ')}.

| Group | Entries | C1 | C2 | C3 |
| --- | ---: | --- | --- | --- |
${Object.entries(result.byGroup).map(([g, v]) => `| ${g} | ${v.n} | ${v.C1_toneResolves.pct}% | ${v.C2_typeOpposesTone.pct}% | ${v.C3_oneTypeColor.pct}% |`).join('\n')}

## Entries that miss a criterion

| # | Group | Label | Median L | Imagery tone | Type | Opposes |
| --- | --- | --- | ---: | --- | --- | --- |
${result.failures.map((r) => `| ${r.n} | ${r.group} | ${r.label} | ${r.medianL} | ${r.imageryTone || 'mid'} | ${r.typeTone || 'unknown'} (${r.typeBasis}) | ${r.opposes == null ? '–' : r.opposes ? 'yes' : 'no'} |`).join('\n')}
`;
fs.writeFileSync(path.join(RESEARCH, 'data/analysis/image-led-test.md'), md);
console.log(`${rows.length} photo-led entries; concept ${result.all.pass ? 'supported' : 'not supported'} (C1 ${result.all.C1_toneResolves.pct}%, C2 ${result.all.C2_typeOpposesTone.pct}%, C3 ${result.all.C3_oneTypeColor.pct}%)`);
