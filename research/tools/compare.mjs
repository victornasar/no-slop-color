// Step 4: classifies the reviewed pairs, compares the eight-way and two-axis models, and sets the
// evidence against the library's directions. Three evidence tiers stay apart:
//   exact pair      both ground and figure are recorded exact colors: full classification
//   exact partial   an exact record where only the ground is recorded: foundation only
//   category        a pre-2023 swatch record: category-level foundation only (black or white ground)
// Group C is a random draw from exact two-color Sites of the Day, so its shares are population
// estimates (Wilson 95% intervals). Groups A and B are described, never generalised.
// The library is not changed; directions the evidence challenges are listed for a decision.
// Output: research/data/analysis/{classified,models,library-challenge}.json and compare.md
import fs from 'node:fs';
import path from 'node:path';
import { RESEARCH } from './lib/sotd.mjs';
import { classifyPair, swatch } from '../../tools/classify.mjs';
import { data } from '../../tools/lib/data.mjs';
// Phase 2 compared against the library as it stood then (48 directions, flat primary), pinned in
// data/library-phase2.json so reruns reproduce the report. Live classifier calls use the two-axis shape.
const axesOf = (c) => (c.alternative_two_axis ?? { foundation: c.primary.foundation, structure: c.primary.structure });
const labelOf = (c) => c.primary.label ?? c.primary.display_label;

const OUT = path.join(RESEARCH, 'data/analysis');
const sel = JSON.parse(fs.readFileSync(path.join(RESEARCH, 'data/review-selection.json'), 'utf8')).sites;
const review = JSON.parse(fs.readFileSync(path.join(RESEARCH, 'data/thumbnail-review.json'), 'utf8')).sites;
const exactPop = JSON.parse(fs.readFileSync(path.join(OUT, 'exact.json'), 'utf8'));
const lib = JSON.parse(fs.readFileSync(path.join(RESEARCH, 'data/library-phase2.json'), 'utf8')).directions;
const M = data('primary').measurements;
const LEGACY = new Set(['#FFFFFF', '#000000', '#2779A7', '#9C9C9C', '#D14836', '#ECD06F', '#49C5B6', '#987654', '#DF6C4F', '#FF9398']);
const FLAT = ['Neutral', 'Colorful / Multicolor', 'Two-Tone', 'Monochromatic Foundation', 'Light + Vibrant', 'Dark + Vibrant', 'Light + Muted', 'Dark + Muted'];
const STRUCT = ['Neutral', 'Chromatic', 'Monochromatic', 'Two-Tone', 'Multicolor'];

const pct = (n, d) => (d ? Math.round((1000 * n) / d) / 10 : null);
function wilson(k, n) {
  if (!n) return null;
  const z = 1.96, p = k / n, d = 1 + z * z / n;
  const c = (p + z * z / (2 * n)) / d, h = (z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))) / d;
  return [Math.round(1000 * Math.max(0, c - h)) / 10, Math.round(1000 * Math.min(1, c + h)) / 10];
}
const est = (k, n) => ({ n: k, of: n, pct: pct(k, n), ci95: wilson(k, n) });
const tally = (xs, f) => xs.reduce((a, x) => { const k = f(x); a[k] = (a[k] || 0) + 1; return a; }, {});

// Which threshold each classifier flag comes from.
const flagKind = (f) => (/review band/.test(f) ? 'ground L near 0.60' : /neutral ceiling/.test(f) ? 'chroma near 0.04' : /vibrant floor/.test(f) ? 'relative chroma near vibrant floor' : /hue-family/.test(f) ? 'hue difference near 30°' : null);

// Reviewer words for unrecorded grounds that settle Light or Dark. Anything else stays unknown.
const LIGHT_WORDS = /white|cream|beige|greige|pale|light|off-white/;
const DARK_WORDS = /black|charcoal|dark|navy|indigo|deep/;
const describedFoundation = (v) => (typeof v === 'string' && v.startsWith('unrecorded: ') ? (DARK_WORDS.test(v) ? 'Dark' : LIGHT_WORDS.test(v) ? 'Light' : null) : null);

// ---------- Classify every reviewed site ----------
const rows = review.map((r, i) => {
  const s = sel[i];
  const exact = s.date >= '2023-01-01' && s.colors.length > 0 && !s.colors.some((c) => LEGACY.has(c) && c !== '#FFFFFF' && c !== '#000000');
  const category = s.date < '2023-01-01' && s.colors.length > 0 && s.colors.every((c) => LEGACY.has(c));
  const out = { n: r.n, group: s.group, id: s.id, record: exact ? 'exact' : category ? 'category' : s.colors.length ? 'exact-before-cutover' : 'no-colors', unresolved: !!r.proposed_label, proposed_label: r.proposed_label, image_ground: r.ground === 'image', mockup: r.mockup, tier: null };
  const g = typeof r.ground === 'number' ? s.colors[r.ground - 1] : null;
  const f = typeof r.figure === 'number' ? s.colors[r.figure - 1] : null;
  if (exact && g && f && !r.proposed_label) {
    const c = classifyPair({ ground: g, figure: f });
    Object.assign(out, {
      tier: 'exact pair', ground: g, figure: f,
      flat: labelOf(c), foundation: axesOf(c).foundation, structure: axesOf(c).structure,
      saturation: c.secondary.saturation_intensity, contrast: c.secondary.contrast[0], temperature: c.secondary.temperature[0] || null,
      thresholdFlags: c.flags.map(flagKind).filter(Boolean),
    });
  } else if (exact && g) {
    out.tier = 'exact partial'; out.ground = g;
    out.foundation = swatch(g).oklch.l >= M.lightGround.minLightness ? 'Light' : 'Dark';
  } else if (category && g) {
    out.tier = 'category'; out.groundSwatch = g;
    out.foundation = g === '#FFFFFF' ? 'Light' : g === '#000000' ? 'Dark' : null;
  }
  if (!out.foundation) {
    const d = describedFoundation(r.ground);
    if (d) { out.foundation = d; out.foundationBasis = 'reviewer description'; }
  } else out.foundationBasis = out.tier === 'category' ? 'black or white swatch' : 'recorded exact color';
  return out;
});

// ---------- Per-group results ----------
function groupResults(rs, generalise) {
  const n = rs.length;
  const e = generalise ? est : (k, m) => ({ n: k, of: m, pct: pct(k, m) });
  const pairs = rs.filter((r) => r.tier === 'exact pair');
  const withF = rs.filter((r) => r.foundation);
  return {
    sites: n,
    unresolved: e(rs.filter((r) => r.unresolved).length, n),
    imageGround: e(rs.filter((r) => r.image_ground).length, n),
    exactPairs: {
      n: pairs.length,
      flat: Object.fromEntries(FLAT.map((l) => [l, e(pairs.filter((p) => p.flat === l).length, pairs.length)])),
      structure: Object.fromEntries(STRUCT.map((l) => [l, e(pairs.filter((p) => p.structure === l).length, pairs.length)])),
      foundation: { Light: e(pairs.filter((p) => p.foundation === 'Light').length, pairs.length), Dark: e(pairs.filter((p) => p.foundation === 'Dark').length, pairs.length) },
    },
    foundationAllEvidence: {
      note: 'Every site whose ground Light/Dark is known: recorded exact ground, black or white swatch ground, or an unambiguous reviewer description of an unrecorded ground. Image-led grounds excluded.',
      n: withF.length,
      Light: e(withF.filter((r) => r.foundation === 'Light').length, withF.length),
      Dark: e(withF.filter((r) => r.foundation === 'Dark').length, withF.length),
      byBasis: tally(withF, (r) => r.foundationBasis),
    },
  };
}
const byGroup = {};
for (const g of ['A', 'B', 'C']) {
  const rs = rows.filter((r) => r.group === g);
  byGroup[g] = { all: groupResults(rs, g === 'C'), exactRecords: groupResults(rs.filter((r) => r.record === 'exact'), g === 'C'), categoryRecords: rs.some((r) => r.record === 'category') ? groupResults(rs.filter((r) => r.record === 'category'), false) : null };
}

// ---------- Model comparison ----------
// Pool of exact pairs from every group for model mechanics only (not prevalence): how each model behaves on real pairs.
const P = rows.filter((r) => r.tier === 'exact pair');
const foundationHidden = P.filter((p) => ['Neutral', 'Two-Tone', 'Monochromatic Foundation', 'Colorful / Multicolor'].includes(p.flat));
const flatFragile = P.filter((p) => p.thresholdFlags.length);
const axisFragile = P.filter((p) => p.thresholdFlags.some((f) => f !== 'relative chroma near vibrant floor'));
const popStruct = exactPop.pairs.structure;
const popFlatLow = exactPop.pairs.flatDetermined;
const models = {
  note: 'Model mechanics use the reviewed exact pairs from all three groups together (they test how a model behaves on real pairs, not how common anything is). Population figures come from the Step 2 exact dataset.',
  reviewedExactPairs: P.length,
  coverage: {
    note: 'Neither model can label a site with no flat ground or figure; both need the Unresolved path. Shares per group.',
    unresolved: Object.fromEntries(['A', 'B', 'C'].map((g) => [g, byGroup[g].all.unresolved])),
  },
  informationLoss: {
    flatHidesFoundation: { ...est(foundationHidden.length, P.length), note: 'Pairs whose flat label (Neutral, Two-Tone, Monochromatic, Multicolor) says nothing about Light or Dark. The two-axis model keeps it for every pair.' },
    flatHidesSaturation: { note: 'The two-axis model moves Vibrant/Muted into secondary tags, so it loses nothing; the flat model keeps saturation only for one-chromatic pairs.', oneChromaticPairs: P.filter((p) => p.structure === 'Chromatic').length },
  },
  groundDependence: {
    note: 'How much of each label the records alone can settle, from the 1,157 exact two-color pairs in Step 2.',
    flatDeterminedFromRecords: exactPop.pairs.flatDeterminedFromRecords,
    structureDeterminedFromRecords: { n: exactPop.pairs.n, pct: 100 },
    foundationDeterminedFromRecords: { n: exactPop.pairs.n - exactPop.pairs.foundation['needs ground'].n, pct: Math.round(1000 * (1 - exactPop.pairs.foundation['needs ground'].n / exactPop.pairs.n)) / 10 },
  },
  fragility: {
    note: 'Pairs with at least one value inside a threshold review band. The vibrant floor sits on a slope with no valley (Step 2), so labels that depend on it are the least stable.',
    flat: est(flatFragile.length, P.length),
    twoAxis: est(axisFragile.length, P.length),
    byThreshold: tally(P.flatMap((p) => [...new Set(p.thresholdFlags)]), (f) => f),
  },
};

// ---------- Library against the evidence ----------
const hueBin = (h) => `${Math.floor(((h + 15) % 360) / 30) * 30}`;
const awardHue = exactPop.colors.chromatic.hueFamily;
const libChrom = lib.flatMap((d) => [d.classification.ground, d.classification.figure]).filter((s) => s.oklch.c > M.neutralChromaCeiling.value);
const libHue = tally(libChrom, (s) => hueBin(s.oklch.h));
const C = byGroup.C.all;
// Award range per flat label over the 1,157 exact pairs: low counts pairs the records settle,
// high adds every undecided pair that could resolve to the label. Colorful / Multicolor cannot occur in two-color records.
// A primary is outside the range only when it is at least two whole directions beyond it; one direction is 2.1 points.
const flatRange = Object.fromEntries(FLAT.map((l) => {
  const low = popFlatLow[l]?.n || 0;
  const extra = Object.entries(exactPop.pairs.flatNeedsGround).filter(([k]) => k.split(' | ').includes(l)).reduce((a, [, v]) => a + v.n, 0);
  const libN = lib.filter((d) => labelOf(d.classification) === l).length;
  const libPct = pct(libN, lib.length), lo = pct(low, exactPop.pairs.n), hi = pct(low + extra, exactPop.pairs.n);
  return [l, { library: libPct, libraryDirections: libN, awardLow: lo, awardHigh: hi, position: l === 'Colorful / Multicolor' ? 'untestable from records' : libN - (hi * lib.length) / 100 >= 2 ? 'library above award range' : (lo * lib.length) / 100 - libN >= 2 ? 'library below award range' : 'within award range' }];
}));
const challenges = [];
const flag = (d, reason, evidence) => challenges.push({ id: d.id, name: d.name, primary: labelOf(d.classification), reason, evidence });
for (const d of lib) {
  const cl = d.classification, g = cl.ground.oklch, f = cl.figure.oklch;
  const s = axesOf(cl).structure;
  if (g.c <= M.neutralChromaCeiling.value && g.l > 0.35 && g.l < 0.75) flag(d, 'Neutral ground in the band award neutrals avoid', `Ground L ${g.l}. Only 54 of 1,607 exact award neutral colors sit between L 0.35 and 0.75.`);
  if (g.c > M.neutralChromaCeiling.value && g.l >= M.lightGround.reviewBand[0] && g.l <= M.lightGround.reviewBand[1]) flag(d, 'Chromatic mid-tone ground forced into Light or Dark', `Ground L ${g.l}, C ${g.c}: inside the 0.50–0.70 review band, where award chromatic colors peak.`);
  if (s === 'Chromatic' && !/Vibrant/.test(labelOf(cl)) && f.c > M.neutralChromaCeiling.value && Math.abs(cl.figure.relative_chroma - M.vibrant.minRelativeChroma) < 0.05) flag(d, 'Vibrant/Muted label rests on the threshold', `Figure relative chroma ${cl.figure.relative_chroma}, within 0.05 of ${M.vibrant.minRelativeChroma}; the distribution has no gap there.`);
}
// Group-level signals: a whole primary sits outside the award range.
const groupSignals = Object.entries(flatRange).filter(([, v]) => /above|below/.test(v.position)).map(([l, v]) => ({
  primary: l, signal: v.position, library: `${v.libraryDirections} directions (${v.library}%)`, award: `${v.awardLow}–${v.awardHigh}% of exact pairs`,
  directions: lib.filter((d) => labelOf(d.classification) === l).map((d) => d.name),
}));
const library = {
  note: 'Gaps and over-representation are prompts for review, not quotas. A pattern common on award sites is not automatically a good recommendation, and a rare one is not wrong. Nothing in the library has been changed.',
  structure: Object.fromEntries(STRUCT.map((k) => [k, { library: pct(lib.filter((d) => axesOf(d.classification).structure === k).length, lib.length), awardExactPairs: popStruct[k]?.pct ?? 0, awardBasis: 'all 1,157 exact pairs (records)' }])),
  foundation: {
    library: { Light: pct(lib.filter((d) => axesOf(d.classification).foundation === 'Light').length, lib.length), Dark: pct(lib.filter((d) => axesOf(d.classification).foundation === 'Dark').length, lib.length) },
    awardGroupC: { Light: C.foundationAllEvidence.Light, Dark: C.foundationAllEvidence.Dark, basis: 'Group C, every site with a known ground (estimate for exact two-color Sites of the Day)' },
  },
  chromaticSaturation: {
    library: (() => { const c = lib.filter((d) => axesOf(d.classification).structure === 'Chromatic'); return { vibrant: c.filter((d) => /Vibrant/.test(labelOf(d.classification))).length, of: c.length, pct: pct(c.filter((d) => /Vibrant/.test(labelOf(d.classification))).length, c.length) }; })(),
    awardExactPairs: exactPop.pairs.chromaticPairs.vibrant,
  },
  pureBlackWhite: { library: lib.filter((d) => ['#000000', '#FFFFFF'].includes(d.classification.ground.hex) && ['#000000', '#FFFFFF'].includes(d.classification.figure.hex)).length, awardExactPairsPct: pct(exactPop.pairs.neutralPairs.pureBlackWhite, exactPop.pairs.n) },
  imageLed: { library: 0, awardUnresolvedGroupC: C.unresolved, note: 'The library has no image-led direction, and neither model has a place for one.' },
  hueFamily: Object.fromEntries(Object.keys(awardHue).sort((a, b) => a - b).map((h) => [h, { library: pct(libHue[h] || 0, libChrom.length), award: awardHue[h].pct }])),
  flatRange,
  groupSignals,
  challenged: challenges,
};

// ---------- Write ----------
fs.writeFileSync(path.join(OUT, 'classified.json'), JSON.stringify({ note: 'One row per reviewed site. tier says how far the evidence supports classification.', byGroup, sites: rows }, null, 1) + '\n');
fs.writeFileSync(path.join(OUT, 'models.json'), JSON.stringify(models, null, 1) + '\n');
fs.writeFileSync(path.join(OUT, 'library-challenge.json'), JSON.stringify(library, null, 1) + '\n');

// ---------- Readable summary ----------
const ci = (o) => (o ? `${o.pct}%${o.ci95 ? ` (${o.ci95[0]}–${o.ci95[1]})` : ''}` : '–');
const cnt = (o) => (o ? `${o.n} of ${o.of}` : '–');
const md = `# Step 4: classification, model comparison and library challenge

Generated by \`research/tools/compare.mjs\`. Do not edit by hand.

Evidence tiers, never mixed:

- **Exact pair**: ground and figure are both recorded exact colors (2023 onward), ground taken from the review. Fully classified.
- **Exact partial**: exact record, ground recorded, figure not. Light/Dark only.
- **Category**: pre-2023 swatch record. Light/Dark only when the ground is the black or white swatch; a hue swatch says nothing about lightness.
- **Reviewer description**: an unrecorded ground described as clearly light or dark. Light/Dark only, and labelled as judgement.

Group C is a random draw from exact two-color Sites of the Day, so its figures carry 95% intervals and stand as estimates for that population. Groups A and B are counts only.

## 1. Classified pairs

| | A | B | C (estimate, 95% CI) |
| --- | ---: | ---: | ---: |
| Sites | ${byGroup.A.all.sites} | ${byGroup.B.all.sites} | ${byGroup.C.all.sites} |
| Unresolved | ${cnt(byGroup.A.all.unresolved)} | ${cnt(byGroup.B.all.unresolved)} | ${ci(C.unresolved)} |
| Ground is imagery | ${cnt(byGroup.A.all.imageGround)} | ${cnt(byGroup.B.all.imageGround)} | ${ci(C.imageGround)} |
| Exact pairs classified | ${byGroup.A.all.exactPairs.n} | ${byGroup.B.all.exactPairs.n} | ${C.exactPairs.n} |
| Light ground, all evidence | ${cnt(byGroup.A.all.foundationAllEvidence.Light)} | ${cnt(byGroup.B.all.foundationAllEvidence.Light)} | ${ci(C.foundationAllEvidence.Light)} |
| Dark ground, all evidence | ${cnt(byGroup.A.all.foundationAllEvidence.Dark)} | ${cnt(byGroup.B.all.foundationAllEvidence.Dark)} | ${ci(C.foundationAllEvidence.Dark)} |

Light/Dark by basis: ${['A', 'B', 'C'].map((g) => `${g}: ${Object.entries(byGroup[g].all.foundationAllEvidence.byBasis).map(([k, v]) => `${k} ${v}`).join(', ')}`).join('; ')}.

Category records only (A and B): Light/Dark is known for ${['A', 'B'].map((g) => `${g} ${byGroup[g].categoryRecords.foundationAllEvidence.n} of ${byGroup[g].categoryRecords.sites}`).join(' and ')} sites, almost all from black or white swatches or reviewer descriptions. No flat label is assigned to a category record.

### Flat labels of the exact pairs

| Flat label | A | B | C (estimate, 95% CI) |
| --- | ---: | ---: | ---: |
${FLAT.map((l) => `| ${l} | ${byGroup.A.all.exactPairs.flat[l].n} | ${byGroup.B.all.exactPairs.flat[l].n} | ${C.exactPairs.flat[l].n}: ${ci(C.exactPairs.flat[l])} |`).join('\n')}

### Two-axis labels of the exact pairs

| Structure | A | B | C (estimate, 95% CI) |
| --- | ---: | ---: | ---: |
${STRUCT.map((l) => `| ${l} | ${byGroup.A.all.exactPairs.structure[l].n} | ${byGroup.B.all.exactPairs.structure[l].n} | ${C.exactPairs.structure[l].n}: ${ci(C.exactPairs.structure[l])} |`).join('\n')}
| **Foundation Light** | ${byGroup.A.all.exactPairs.foundation.Light.n} | ${byGroup.B.all.exactPairs.foundation.Light.n} | ${C.exactPairs.foundation.Light.n}: ${ci(C.exactPairs.foundation.Light)} |
| **Foundation Dark** | ${byGroup.A.all.exactPairs.foundation.Dark.n} | ${byGroup.B.all.exactPairs.foundation.Dark.n} | ${C.exactPairs.foundation.Dark.n}: ${ci(C.exactPairs.foundation.Dark)} |

## 2. Eight-way against two-axis

${models.note}

| Test | Eight-way flat | Two-axis |
| --- | --- | --- |
| Labels sites with no flat ground (Unresolved: A ${models.coverage.unresolved.A.pct}%, B ${models.coverage.unresolved.B.pct}%, C ${models.coverage.unresolved.C.pct}%) | No | No |
| Settled by the records alone (1,157 exact pairs) | ${models.groundDependence.flatDeterminedFromRecords.pct}% | Structure 100%, foundation ${models.groundDependence.foundationDeterminedFromRecords.pct}% |
| Keeps Light/Dark for every pair | No: hidden for ${models.informationLoss.flatHidesFoundation.n} of ${models.reviewedExactPairs} reviewed pairs (${models.informationLoss.flatHidesFoundation.pct}%) | Yes |
| Keeps saturation | Only for one-chromatic pairs | As a secondary tag, for every pair |
| Reviewed pairs near a threshold | ${models.fragility.flat.pct}% | ${models.fragility.twoAxis.pct}% |

Threshold flags among reviewed pairs: ${Object.entries(models.fragility.byThreshold).map(([k, v]) => `${k} ${v}`).join(', ')}.


## 3. Library against the evidence

${library.note}

| Structure | Library (48) | Exact award pairs (1,157) |
| --- | ---: | ---: |
${STRUCT.map((k) => `| ${k} | ${library.structure[k].library}% | ${library.structure[k].awardExactPairs}% |`).join('\n')}

Flat labels. The award range runs from pairs the records settle to that plus every undecided pair that could resolve to the label. A primary counts as outside only when it is at least two whole directions beyond the range:

| Flat label | Library | Award range | Position |
| --- | ---: | ---: | --- |
${Object.entries(flatRange).map(([l, v]) => `| ${l} | ${v.libraryDirections} (${v.library}%) | ${v.awardLow}–${v.awardHigh}% | ${v.position} |`).join('\n')}

| Measure | Library | Award evidence |
| --- | ---: | ---: |
| Light ground | ${library.foundation.library.Light}% | ${ci(library.foundation.awardGroupC.Light)} (group C) |
| Dark ground | ${library.foundation.library.Dark}% | ${ci(library.foundation.awardGroupC.Dark)} (group C) |
| Vibrant, of one-chromatic pairs | ${library.chromaticSaturation.library.pct}% (${library.chromaticSaturation.library.vibrant} of ${library.chromaticSaturation.library.of}) | ${library.chromaticSaturation.awardExactPairs.pct}% |
| Pure black and white pairs | ${library.pureBlackWhite.library} directions | ${library.pureBlackWhite.awardExactPairsPct}% of pairs |
| Image-led | none | ${ci(library.imageLed.awardUnresolvedGroupC)} of group C unresolved |

Hue family of chromatic pair colors (30° bins):

| Hue | Library | Award |
| --- | ---: | ---: |
${Object.entries(library.hueFamily).map(([h, v]) => `| ${h}° | ${v.library}% | ${v.award}% |`).join('\n')}

### Primaries the evidence challenges as a group

${groupSignals.map((s) => `- **${s.primary}**: ${s.signal}. Library ${s.library}, award ${s.award}. ${/below/.test(s.signal) ? 'Existing directions, not challenged' : 'Directions to review'}: ${s.directions.join(', ')}.`).join('\n')}

### Individual directions the evidence challenges

For decision, not changed. ${challenges.length} flags on ${new Set(challenges.map((c) => c.id)).size} directions.

| Direction | Primary | Reason | Evidence |
| --- | --- | --- | --- |
${challenges.map((c) => `| ${c.name} | ${c.primary} | ${c.reason} | ${c.evidence} |`).join('\n')}
`;
fs.writeFileSync(path.join(OUT, 'compare.md'), md);
console.log(`classified ${rows.length} sites (${P.length} exact pairs); ${challenges.length} challenge flags on ${new Set(challenges.map((c) => c.id)).size} directions`);
