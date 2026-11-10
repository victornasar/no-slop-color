// Validates the thumbnail review against the selection and summarises it per group,
// with exact-color and category-swatch records kept apart.
// Output: research/data/analysis/review.json and review.md
import fs from 'node:fs';
import path from 'node:path';
import { RESEARCH } from './lib/sotd.mjs';

const sel = JSON.parse(fs.readFileSync(path.join(RESEARCH, 'data/review-selection.json'), 'utf8'));
const review = JSON.parse(fs.readFileSync(path.join(RESEARCH, 'data/thumbnail-review.json'), 'utf8')).sites;
const measures = JSON.parse(fs.readFileSync(path.join(RESEARCH, 'data/thumbnail-measures.json'), 'utf8')).sites;
const TAGS = new Set(['Color Blocking', 'Gradient', 'Accent-Led', 'Background-Led', 'Section-Based', 'Layered', 'Image-Led']);

// ---------- Validate ----------
const errors = [];
if (review.length !== sel.sites.length) errors.push(`review has ${review.length} sites, selection ${sel.sites.length}`);
review.forEach((r, i) => {
  const s = sel.sites[i];
  if (!s || r.n !== s.n || r.id !== s.id) { errors.push(`#${r.n}: does not match selection entry ${i + 1}`); return; }
  for (const k of ['ground', 'figure', 'accent']) {
    const v = r[k];
    if (v == null) { if (k !== 'accent') errors.push(`#${r.n}: ${k} missing`); continue; }
    if (typeof v === 'number' ? !(v >= 1 && v <= s.colors.length) : !(v === 'image' || v === 'multicolor' || /^unrecorded: .+/.test(v))) errors.push(`#${r.n}: bad ${k} ${v}`);
  }
  if (typeof r.ground === 'number' && r.ground === r.figure) errors.push(`#${r.n}: ground and figure are the same recorded color`);
  for (const t of r.composition) if (!TAGS.has(t)) errors.push(`#${r.n}: unknown composition tag ${t}`);
  if (!['high', 'medium', 'low'].includes(r.confidence)) errors.push(`#${r.n}: bad confidence`);
});
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }

// ---------- Summarise ----------
const pct = (n, d) => (d ? Math.round((1000 * n) / d) / 10 : null);
const tally = (xs, f) => xs.reduce((a, x) => { const k = f(x); a[k] = (a[k] || 0) + 1; return a; }, {});
const shares = (o, d) => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, { n: v, pct: pct(v, d) }]));
// Groups free-text proposed labels into families, so recurring missing categories are countable.
const family = (l) =>
  /in mockup/.test(l) ? 'Mockup hides the site' :
  /^Photo-led|^Monochrome photo/.test(l) ? 'Photo-led' :
  /multicolor/i.test(l) ? 'Multicolor imagery or blocking' :
  /luminous|neon|^Dark 3D scene$/.test(l) ? 'Dark ground, luminous figure' :
  /^Illustration-led/.test(l) ? 'Illustration-led' :
  /^Gradient-led/.test(l) ? 'Gradient-led' :
  /^Tonal/.test(l) ? 'Tonal, low contrast' : 'Other';
const kind = (v) => (typeof v === 'number' ? 'recorded' : v === 'image' || v === 'multicolor' ? v : 'unrecorded');
const flat = (v) => kind(v) === 'recorded' || kind(v) === 'unrecorded';

const rows = review.map((r, i) => ({ ...r, s: sel.sites[i], m: measures[i] }));
function summarise(rs) {
  const n = rs.length;
  const resolved = rs.filter((r) => flat(r.ground) && flat(r.figure) && !r.proposed_label);
  const recordedPair = rs.filter((r) => kind(r.ground) === 'recorded' && kind(r.figure) === 'recorded');
  const twoColor = rs.filter((r) => r.s.colors.length === 2 && kind(r.ground) === 'recorded');
  const withArea = rs.filter((r) => kind(r.ground) === 'recorded' && r.m.suggestedGround != null);
  return {
    n,
    ground: shares(tally(rs, (r) => kind(r.ground)), n),
    figure: shares(tally(rs, (r) => kind(r.figure)), n),
    resolvedPair: { n: resolved.length, pct: pct(resolved.length, n), note: 'Flat ground and flat figure, no proposed label.' },
    recordCapturesPair: { n: recordedPair.length, pct: pct(recordedPair.length, n), note: 'Both ground and figure are recorded colors, so the record alone holds the pair once the ground is known.' },
    unresolved: { n: rs.filter((r) => r.proposed_label).length, pct: pct(rs.filter((r) => r.proposed_label).length, n) },
    proposedFamilies: shares(tally(rs.filter((r) => r.proposed_label), (r) => family(r.proposed_label)), n),
    proposedLabels: shares(tally(rs.filter((r) => r.proposed_label), (r) => r.proposed_label), n),
    groundIsFirstListed: { n: twoColor.filter((r) => r.ground === 1).length, of: twoColor.length, pct: pct(twoColor.filter((r) => r.ground === 1).length, twoColor.length), note: 'Two-color records whose ground is a recorded color.' },
    areaAgreesWithVisualGround: { n: withArea.filter((r) => r.ground === r.m.suggestedGround).length, of: withArea.length, pct: pct(withArea.filter((r) => r.ground === r.m.suggestedGround).length, withArea.length) },
    mockup: { n: rs.filter((r) => r.mockup).length, pct: pct(rs.filter((r) => r.mockup).length, n) },
    composition: shares(tally(rs.flatMap((r) => r.composition), (t) => t), n),
    confidence: shares(tally(rs, (r) => r.confidence), n),
  };
}
const recType = (r) => (r.s.date >= '2023-01-01' ? 'exact' : r.s.colors.some((c) => !['#FFFFFF', '#000000', '#2779A7', '#9C9C9C', '#D14836', '#ECD06F', '#49C5B6', '#987654', '#DF6C4F', '#FF9398'].includes(c)) ? 'exact-before-cutover' : r.s.colors.length ? 'category' : 'no-colors');
const groups = {};
for (const g of Object.keys(sel.groups)) {
  const rs = rows.filter((r) => r.s.group === g);
  groups[g] = { rule: sel.groups[g].rule, all: summarise(rs), byRecord: Object.fromEntries(['exact', 'category', 'exact-before-cutover', 'no-colors'].map((t) => [t, rs.filter((r) => recType(r) === t)]).filter(([, x]) => x.length).map(([t, x]) => [t, summarise(x)])) };
}
const out = { note: 'Per group only. The groups are a stratified design and are never pooled.', groups };
fs.mkdirSync(path.join(RESEARCH, 'data/analysis'), { recursive: true });
fs.writeFileSync(path.join(RESEARCH, 'data/analysis/review.json'), JSON.stringify(out, null, 1) + '\n');

// ---------- Readable summary ----------
const line = (label, x) => `| ${label} | ${['A', 'B', 'C'].map((g) => x(groups[g])).join(' | ')} |`;
const cell = (o) => (o ? `${o.n} (${o.pct}%)` : '0');
const sub = (g, t, f) => (groups[g].byRecord[t] ? f(groups[g].byRecord[t]) : '–');
const labels = [...new Set(rows.filter((r) => r.proposed_label).map((r) => r.proposed_label))]
  .map((l) => [l, ['A', 'B', 'C'].map((g) => rows.filter((r) => r.s.group === g && r.proposed_label === l).length)])
  .sort((a, b) => b[1].reduce((x, y) => x + y) - a[1].reduce((x, y) => x + y));
const md = `# Step 3: thumbnail review

Generated by \`research/tools/review-summary.mjs\` from \`data/thumbnail-review.json\`. ${out.note}

The review is visual judgement by one reviewer, read beside the measured area of each recorded color. Thumbnails are submitter images, often a device mockup on a backdrop.

| Measure | A: Month/Year (${groups.A.all.n}) | B: random two-color Day (${groups.B.all.n}) | C: exact-era two-color Day (${groups.C.all.n}) |
| --- | ---: | ---: | ---: |
${line('Resolved pair', (g) => cell(g.all.resolvedPair))}
${line('Unresolved (proposed label)', (g) => cell(g.all.unresolved))}
${line('Ground is a recorded color', (g) => cell(g.all.ground.recorded))}
${line('Ground is an unrecorded color', (g) => cell(g.all.ground.unrecorded))}
${line('Ground is imagery', (g) => cell(g.all.ground.image))}
${line('Ground is several flat colors', (g) => cell(g.all.ground.multicolor))}
${line('Record holds both ground and figure', (g) => cell(g.all.recordCapturesPair))}
${line('Mockup thumbnail', (g) => cell(g.all.mockup))}
${line('Low confidence', (g) => cell(g.all.confidence.low))}

## Exact-color records against category-swatch records

| Measure | A exact | A category | B exact | B category | C exact |
| --- | ---: | ---: | ---: | ---: | ---: |
${[['Sites', (x) => x.n], ['Resolved pair', (x) => cell(x.resolvedPair)], ['Record holds both ground and figure', (x) => cell(x.recordCapturesPair)], ['Ground is imagery', (x) => cell(x.ground.image)], ['Mockup thumbnail', (x) => cell(x.mockup)]].map(([k, f]) => `| ${k} | ${sub('A', 'exact', f)} | ${sub('A', 'category', f)} | ${sub('B', 'exact', f)} | ${sub('B', 'category', f)} | ${sub('C', 'exact', f)} |`).join('\n')}

## Does list order identify the ground?

Two-color records whose ground is a recorded color, share where the ground is listed first:

| Group | Exact | Category |
| --- | ---: | ---: |
${['A', 'B', 'C'].map((g) => `| ${g} | ${sub(g, 'exact', (x) => `${x.groundIsFirstListed.n} of ${x.groundIsFirstListed.of} (${x.groundIsFirstListed.pct}%)`)} | ${sub(g, 'category', (x) => `${x.groundIsFirstListed.n} of ${x.groundIsFirstListed.of} (${x.groundIsFirstListed.pct}%)`)} |`).join('\n')}

## Does measured thumbnail area find the ground?

Where the visual ground is a recorded color, share where the recorded color with more thumbnail area is that ground:

${['A', 'B', 'C'].map((g) => `- ${g}: ${groups[g].all.areaAgreesWithVisualGround.n} of ${groups[g].all.areaAgreesWithVisualGround.of} (${groups[g].all.areaAgreesWithVisualGround.pct}%)`).join('\n')}

## Unresolved sites by family

Each proposed label is free text in the review; families group them by what made the pair unclassifiable.

| Family | A | B | C |
| --- | ---: | ---: | ---: |
${[...new Set(rows.filter((r) => r.proposed_label).map((r) => family(r.proposed_label)))].map((f) => [f, ['A', 'B', 'C'].map((g) => rows.filter((r) => r.s.group === g && r.proposed_label && family(r.proposed_label) === f).length)]).sort((a, b) => b[1].reduce((x, y) => x + y) - a[1].reduce((x, y) => x + y)).map(([f, c]) => `| ${f} | ${c.join(' | ')} |`).join('\n')}

## Proposed labels for Unresolved sites

| Proposed label | A | B | C |
| --- | ---: | ---: | ---: |
${labels.map(([l, c]) => `| ${l} | ${c.join(' | ')} |`).join('\n')}

## Composition tags

| Tag | A | B | C |
| --- | ---: | ---: | ---: |
${[...TAGS].map((t) => line(t, (g) => cell(g.all.composition[t])).replace(/^\| /, '| ')).join('\n')}
`;
fs.writeFileSync(path.join(RESEARCH, 'data/analysis/review.md'), md);
console.log(`validated ${review.length} reviews; written data/analysis/review.{json,md}`);
