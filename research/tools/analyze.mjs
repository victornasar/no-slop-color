// Step 2: swatch analysis of every Awwwards Site of the Day in the pinned SOTD Index.
// Exact-color records and category-swatch records are analysed separately and written to
// separate files; the thumbnail selection is reported per group, never pooled.
// Pairs are labelled with the library's own classifier under both possible ground
// assignments, since the order Awwwards lists colors does not identify the ground.
// Output: research/data/analysis/{datasets,exact,category,sample,library}.json and summary.md
import fs from 'node:fs';
import path from 'node:path';
import { loadSites, RESEARCH } from './lib/sotd.mjs';
import { classifyPair, swatch } from '../../tools/classify.mjs';
import { hueDiff } from '../../tools/lib/color.mjs';
import { data } from '../../tools/lib/data.mjs';
// Phase 2 compared against the library as it stood then (48 directions, flat primary), pinned in
// data/library-phase2.json so reruns reproduce the report. Live classifier calls use the two-axis shape.
const axesOf = (c) => (c.alternative_two_axis ?? { foundation: c.primary.foundation, structure: c.primary.structure });
const labelOf = (c) => c.primary.label ?? c.primary.display_label;

const OUT = path.join(RESEARCH, 'data/analysis');
fs.mkdirSync(OUT, { recursive: true });
const M = data('primary').measurements;
const NEUTRAL_C = M.neutralChromaCeiling.value, LIGHT_L = M.lightGround.minLightness, FAMILY = M.sameHueFamily.maxHueDifference;
const VIB_REL = M.vibrant.minRelativeChroma, VIB_C = M.vibrant.minChroma;

// The fixed Awwwards category palette used until 2022.
const SWATCH = {
  '#FFFFFF': 'white', '#000000': 'black', '#9C9C9C': 'gray',
  '#2779A7': 'blue', '#D14836': 'red', '#ECD06F': 'yellow', '#49C5B6': 'teal', '#987654': 'brown', '#DF6C4F': 'orange', '#FF9398': 'pink',
};
const NEUTRAL_SWATCH = new Set(['white', 'black', 'gray']);
const WARM_NAMED = new Set(['red', 'orange', 'pink', 'yellow', 'brown']);
const BW = (c) => c === '#FFFFFF' || c === '#000000';
const EXACT_FROM = '2023-01-01';

const pct = (n, d) => (d ? Math.round((1000 * n) / d) / 10 : null);
const tally = (xs, f = (x) => x) => xs.reduce((a, x) => { const k = f(x); a[k] = (a[k] || 0) + 1; return a; }, {});
const sortDesc = (o) => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]));
const shares = (o, d) => Object.fromEntries(Object.entries(sortDesc(o)).map(([k, v]) => [k, { n: v, pct: pct(v, d) }]));

// ---------- Datasets ----------
const all = await loadSites();
function recordType(s) {
  if (!s.colors.length) return 'no-colors';
  const legacyHue = s.colors.some((c) => SWATCH[c] && !BW(c));
  const exact = s.colors.some((c) => !SWATCH[c]);
  if (exact && legacyHue) return 'mixed';
  if (s.date >= EXACT_FROM) return legacyHue ? 'legacy-after-cutover' : 'exact';
  return exact ? 'exact-before-cutover' : 'category';
}
for (const s of all) s.record = recordType(s);
const exactSites = all.filter((s) => s.record === 'exact');
const catSites = all.filter((s) => s.record === 'category');
const datasets = {
  source: 'research/data/source.json (pinned SOTD Index commit, SHA-256 verified on load)',
  total: all.length,
  definitions: {
    exact: `Dated ${EXACT_FROM} or later and containing no legacy hue swatch. Black and white count as exact here, because from this date Awwwards records exact colors for every entry.`,
    category: `Dated before ${EXACT_FROM}, with every recorded color from the fixed legacy palette (white, black, gray and seven hues). These are category choices, not measurements.`,
  },
  counts: tally(all, (s) => s.record),
  exclusions: {
    'no-colors': 'No colors recorded.',
    'exact-before-cutover': 'Exact colors recorded before 2023 (mostly 2022, the transition year). Excluded from the exact dataset because black-and-white records of the same period cannot be told apart from legacy swatches, so including only the chromatic ones would bias the set.',
    'legacy-after-cutover': 'A legacy hue swatch on an entry dated 2023 or later.',
    mixed: 'Exact and legacy hue colors in one record.',
  },
  exactBeforeCutoverByYear: tally(all.filter((s) => s.record === 'exact-before-cutover'), (s) => s.year),
  byYear: Object.fromEntries(Object.entries(tally(all, (s) => s.year)).map(([y]) => [y, tally(all.filter((s) => s.year === +y), (s) => s.record)])),
};

// ---------- Pair measurement (exact colors) ----------
function measure(hex) {
  const s = swatch(hex);
  const { l, c, h } = s.oklch;
  const chromatic = c > NEUTRAL_C;
  return { hex, l, c, h, rel: s.relative_chroma, chromatic, vibrant: chromatic && s.relative_chroma >= VIB_REL && c >= VIB_C, pastel: chromatic && l >= M.pastel.minLightness && c <= M.pastel.maxChroma };
}
const hueFamily = (h) => `${Math.floor(((h + 15) % 360) / 30) * 30}`; // 12 bins centred on 0, 30, ...

function analysePair(a, b) {
  const x = classifyPair({ ground: a, figure: b }), y = classifyPair({ ground: b, figure: a });
  const [ma, mb] = [measure(a), measure(b)];
  const structure = axesOf(x).structure; // symmetric in ground and figure
  const flatA = labelOf(x), flatB = labelOf(y);
  const lightA = ma.l >= LIGHT_L, lightB = mb.l >= LIGHT_L;
  const chrom = [ma, mb].filter((m) => m.chromatic);
  const out = {
    structure,
    flat: flatA === flatB ? flatA : null,
    flatOptions: flatA === flatB ? [flatA] : [flatA, flatB].sort(),
    foundation: lightA === lightB ? (lightA ? 'Light' : 'Dark') : null,
    contrast: x.secondary.contrast[0],
    temperature: x.secondary.temperature[0] || 'None',
    pureBW: BW(a) && BW(b) && a !== b,
  };
  if (structure === 'Chromatic') {
    const [cm] = chrom, nm = cm === ma ? mb : ma;
    out.chromaticVibrant = cm.vibrant;
    out.chromaticPastel = cm.pastel;
    out.neutralSide = nm.l >= LIGHT_L ? 'light' : 'dark';
    out.chromaticSide = cm.l >= LIGHT_L ? 'light' : 'dark';
  }
  if (chrom.length === 2) out.hueDiff = hueDiff(ma.h, mb.h);
  // Distance from each threshold, used to count fragile labels.
  out.nearNeutralCeiling = [ma, mb].some((m) => Math.abs(m.c - NEUTRAL_C) < 0.008);
  out.nearVibrantFloor = chrom.some((m) => Math.abs(m.rel - VIB_REL) < 0.05 && m.c >= VIB_C);
  out.nearFamilyLimit = out.hueDiff != null && Math.abs(out.hueDiff - FAMILY) < 6;
  return out;
}

function histogram(values, lo, hi, step) {
  const bins = [];
  for (let v = lo; v < hi - 1e-9; v += step) bins.push({ from: +v.toFixed(4), n: 0 });
  for (const v of values) { const i = Math.floor((v - lo) / step + 1e-9); if (i >= 0 && i < bins.length) bins[i].n++; }
  return bins;
}
// Density in a window around a threshold, relative to the two neighbouring windows of the same width.
// A valley means fewer values near the threshold than on either side. On a sloping distribution the
// ratio can fall below 1 without a valley, so both are reported.
function thresholdDensity(values, t, w) {
  const n = (a, b) => values.filter((v) => v >= a && v < b).length;
  const at = n(t - w, t + w), left = n(t - 3 * w, t - w), right = n(t + w, t + 3 * w);
  return { threshold: t, window: w, at, left, right, ratio: left + right ? +((2 * at) / (left + right)).toFixed(2) : null, valley: at < left && at < right };
}

function summarisePairs(pairs) {
  const n = pairs.length;
  const chromaticPairs = pairs.filter((p) => p.structure === 'Chromatic');
  return {
    n,
    structure: shares(tally(pairs, (p) => p.structure), n),
    flatDeterminedFromRecords: { n: pairs.filter((p) => p.flat).length, pct: pct(pairs.filter((p) => p.flat).length, n) },
    flatDetermined: shares(tally(pairs.filter((p) => p.flat), (p) => p.flat), n),
    flatNeedsGround: shares(tally(pairs.filter((p) => !p.flat), (p) => p.flatOptions.join(' | ')), n),
    foundation: shares(tally(pairs, (p) => p.foundation || 'needs ground'), n),
    chromaticPairs: {
      n: chromaticPairs.length,
      vibrant: { n: chromaticPairs.filter((p) => p.chromaticVibrant).length, pct: pct(chromaticPairs.filter((p) => p.chromaticVibrant).length, chromaticPairs.length) },
      pastel: { n: chromaticPairs.filter((p) => p.chromaticPastel).length, pct: pct(chromaticPairs.filter((p) => p.chromaticPastel).length, chromaticPairs.length) },
      neutralSide: shares(tally(chromaticPairs, (p) => p.neutralSide), chromaticPairs.length),
    },
    neutralPairs: { n: pairs.filter((p) => p.structure === 'Neutral').length, pureBlackWhite: pairs.filter((p) => p.pureBW).length },
    contrast: shares(tally(pairs, (p) => p.contrast), n),
    temperature: shares(tally(pairs, (p) => p.temperature), n),
    fragile: {
      nearNeutralCeiling: { n: pairs.filter((p) => p.nearNeutralCeiling).length, pct: pct(pairs.filter((p) => p.nearNeutralCeiling).length, n) },
      nearVibrantFloor: { n: pairs.filter((p) => p.nearVibrantFloor).length, pct: pct(pairs.filter((p) => p.nearVibrantFloor).length, n) },
      nearFamilyLimit: { n: pairs.filter((p) => p.nearFamilyLimit).length, pct: pct(pairs.filter((p) => p.nearFamilyLimit).length, n) },
    },
  };
}

// ---------- Exact dataset ----------
const exactPairs = exactSites.filter((s) => s.colors.length === 2 && s.colors[0] !== s.colors[1]).map((s) => ({ site: s, ...analysePair(...s.colors) }));
const exactColors = exactSites.flatMap((s) => s.colors).map(measure);
const chromColors = exactColors.filter((m) => m.chromatic);
const neutralColors = exactColors.filter((m) => !m.chromatic);
const ones = exactSites.filter((s) => s.colors.length === 1).map((s) => measure(s.colors[0]));
const exact = {
  dataset: 'exact',
  caution: 'Colors were chosen by each submitter, not measured from the site. They are exact values, but they are the submitter\'s summary of the design.',
  sites: exactSites.length,
  colorCount: tally(exactSites, (s) => s.colors.length),
  identicalPairsExcluded: exactSites.filter((s) => s.colors.length === 2 && s.colors[0] === s.colors[1]).length,
  colors: {
    n: exactColors.length,
    neutral: { n: neutralColors.length, pct: pct(neutralColors.length, exactColors.length) },
    neutralLightness: shares(tally(neutralColors, (m) => (m.l >= 0.9 ? 'near-white (L ≥ 0.90)' : m.l < 0.25 ? 'near-black (L < 0.25)' : 'mid gray')), neutralColors.length),
    pureBlackOrWhite: { n: exactColors.filter((m) => BW(m.hex)).length, pct: pct(exactColors.filter((m) => BW(m.hex)).length, exactColors.length) },
    tintedNeutral: { n: neutralColors.filter((m) => m.c >= 0.005).length, pct: pct(neutralColors.filter((m) => m.c >= 0.005).length, neutralColors.length), note: 'Neutral (C ≤ 0.04) but visibly hued (C ≥ 0.005).' },
    chromatic: {
      n: chromColors.length,
      vibrant: { n: chromColors.filter((m) => m.vibrant).length, pct: pct(chromColors.filter((m) => m.vibrant).length, chromColors.length) },
      pastel: { n: chromColors.filter((m) => m.pastel).length, pct: pct(chromColors.filter((m) => m.pastel).length, chromColors.length) },
      hueFamily: shares(tally(chromColors, (m) => hueFamily(m.h)), chromColors.length),
    },
  },
  oneColorRecords: { n: ones.length, neutral: ones.filter((m) => !m.chromatic).length, vibrant: ones.filter((m) => m.vibrant).length },
  pairs: summarisePairs(exactPairs),
  byYear: Object.fromEntries([2023, 2024, 2025, 2026].map((y) => {
    const p = exactPairs.filter((x) => x.site.year === y);
    return [y, { n: p.length, structure: shares(tally(p, (x) => x.structure), p.length), chromaticVibrantPct: pct(p.filter((x) => x.chromaticVibrant).length, p.filter((x) => x.structure === 'Chromatic').length) }];
  })),
  byTier: Object.fromEntries(['day', 'month', 'year'].map((t) => { const p = exactPairs.filter((x) => x.site.tier === t); return [t, { n: p.length, structure: shares(tally(p, (x) => x.structure), p.length) }]; })),
  byCategory: Object.fromEntries(Object.entries(sortDesc(tally(exactPairs.flatMap((p) => p.site.categories)))).slice(0, 15).map(([c]) => {
    const p = exactPairs.filter((x) => x.site.categories.includes(c));
    return [c, { n: p.length, structure: shares(tally(p, (x) => x.structure), p.length) }];
  })),
  thresholds: {
    note: 'Counts within the window around each threshold against the two neighbouring windows. Valley means fewer values near the threshold than on either side, so labels there are stable. Without a valley, many labels hinge on small differences. The ratio alone misleads on a sloping distribution.',
    neutralChromaCeiling: thresholdDensity(exactColors.map((m) => m.c), NEUTRAL_C, 0.01),
    vibrantRelativeChroma: thresholdDensity(chromColors.filter((m) => m.c >= VIB_C).map((m) => m.rel), VIB_REL, 0.05),
    vibrantChroma: thresholdDensity(chromColors.map((m) => m.c), VIB_C, 0.01),
    lightGround: thresholdDensity(exactColors.map((m) => m.l), LIGHT_L, 0.05),
    lightGroundNeutralOnly: thresholdDensity(neutralColors.map((m) => m.l), LIGHT_L, 0.05),
    hueFamily: thresholdDensity(exactPairs.filter((p) => p.hueDiff != null).map((p) => p.hueDiff), FAMILY, 6),
  },
  histograms: {
    chroma: histogram(exactColors.map((m) => m.c), 0, 0.32, 0.01),
    relativeChromaOfChromatic: histogram(chromColors.map((m) => m.rel), 0, 1.0001, 0.05),
    lightness: histogram(exactColors.map((m) => m.l), 0, 1.0001, 0.05),
    lightnessNeutral: histogram(neutralColors.map((m) => m.l), 0, 1.0001, 0.05),
    lightnessChromatic: histogram(chromColors.map((m) => m.l), 0, 1.0001, 0.05),
    pairHueDifference: histogram(exactPairs.filter((p) => p.hueDiff != null).map((p) => p.hueDiff), 0, 180.001, 10),
  },
};

// ---------- Category dataset ----------
const catName = (s) => s.colors.map((c) => SWATCH[c]);
function catComposition(s) {
  const names = [...new Set(catName(s))];
  const hues = names.filter((n) => !NEUTRAL_SWATCH.has(n));
  return hues.length === 0 ? 'neutral swatches only' : hues.length === 1 ? (names.length === 1 ? 'one hue swatch alone' : 'neutral + one hue swatch') : 'two or more hue swatches';
}
const catWith = (n) => catSites.filter((s) => s.colors.length === n);
const category = {
  dataset: 'category',
  caution: 'Each recorded color is one of ten fixed swatches chosen by the submitter. A swatch names a color family; it says nothing about the site\'s actual lightness, chroma or exact hue, so Light/Dark (beyond black and white), Vibrant/Muted, Pastel, contrast and the 30° hue-family rule cannot be measured here.',
  canEstablish: ['How many color categories a submitter recorded', 'Whether any hue category was recorded at all, or only black, white and gray', 'Which hue categories were recorded', 'Whether black, white or both were recorded', 'Whether a recorded hue is named warm (red, orange, pink, yellow, brown) or cool (blue, teal)'],
  cannotEstablish: ['Ground or figure', 'Lightness of a hue category', 'Vibrant versus Muted, or Pastel', 'Contrast', 'Monochromatic versus Two-Tone: red, orange and pink swatches sit within 18° of each other in OKLCH, so different swatches do not mean different hue families, and one swatch can cover several actual hues', 'Multicolor: no area shares are recorded'],
  sites: catSites.length,
  years: [Math.min(...catSites.map((s) => s.year)), Math.max(...catSites.map((s) => s.year))],
  swatchCount: tally(catSites, (s) => s.colors.length),
  swatchPresence: shares(tally(catSites.flatMap((s) => [...new Set(catName(s))])), catSites.length),
  composition: shares(tally(catSites, catComposition), catSites.length),
  compositionBySwatchCount: Object.fromEntries([1, 2, 3].map((n) => [n, shares(tally(catWith(n), catComposition), catWith(n).length)])),
  twoSwatchRecords: {
    n: catWith(2).length,
    blackAndWhite: catWith(2).filter((s) => catName(s).sort().join('+') === 'black+white').length,
    pairs: shares(tally(catWith(2), (s) => catName(s).sort().join('+')), catWith(2).length),
  },
  hueNameTemperature: (() => {
    const withHue = catSites.filter((s) => catName(s).some((n) => !NEUTRAL_SWATCH.has(n)));
    return shares(tally(withHue, (s) => {
      const h = catName(s).filter((n) => !NEUTRAL_SWATCH.has(n));
      const w = h.some((n) => WARM_NAMED.has(n)), c = h.some((n) => !WARM_NAMED.has(n));
      return w && c ? 'warm- and cool-named' : w ? 'warm-named only' : 'cool-named only';
    }), withHue.length);
  })(),
  byYear: Object.fromEntries([...new Set(catSites.map((s) => s.year))].sort().map((y) => {
    const ys = catSites.filter((s) => s.year === y);
    return [y, { n: ys.length, composition: shares(tally(ys, catComposition), ys.length), black: pct(ys.filter((s) => s.colors.includes('#000000')).length, ys.length), white: pct(ys.filter((s) => s.colors.includes('#FFFFFF')).length, ys.length) }];
  })),
};

// ---------- Thumbnail sample, per group ----------
const sel = JSON.parse(fs.readFileSync(path.join(RESEARCH, 'data/review-selection.json'), 'utf8'));
const byId = new Map(all.map((s) => [s.id, s]));
const sample = {
  note: 'The 320 sites are a stratified design, not a random sample of Awwwards. Each group answers a different question, so groups are reported separately and never pooled into a prevalence figure.',
  seed: sel.seed,
  groups: Object.fromEntries(Object.entries(sel.groups).map(([g, meta]) => {
    const ss = sel.sites.filter((x) => x.group === g).map((x) => byId.get(x.id));
    const ex = ss.filter((s) => s.record === 'exact' && s.colors.length === 2 && s.colors[0] !== s.colors[1]).map((s) => analysePair(...s.colors));
    const cat = ss.filter((s) => s.record === 'category');
    return [g, {
      rule: meta.rule,
      n: ss.length,
      recordType: tally(ss, (s) => s.record),
      exactTwoColor: ex.length ? summarisePairs(ex) : { n: 0 },
      category: { n: cat.length, composition: shares(tally(cat, catComposition), cat.length) },
      thumbnailMustDecide: { flat: ex.filter((p) => !p.flat).length, foundation: ex.filter((p) => !p.foundation).length, ofExactPairs: ex.length },
    }];
  })),
};
// Group C against the population it was drawn from.
const cPairs = sel.sites.filter((x) => x.group === 'C').map((x) => byId.get(x.id)).filter((s) => s.record === 'exact').map((s) => analysePair(...s.colors));
const popTwo = exactPairs.filter((p) => p.site.tier === 'day');
sample.representativenessC = {
  note: 'Group C against all exact two-color Sites of the Day. Differences of a few points are expected from an 80-site draw.',
  structure: Object.fromEntries(['Neutral', 'Chromatic', 'Monochromatic', 'Two-Tone'].map((k) => [k, { sample: pct(cPairs.filter((p) => p.structure === k).length, cPairs.length), population: pct(popTwo.filter((p) => p.structure === k).length, popTwo.length) }])),
  pureBlackWhite: { sample: pct(cPairs.filter((p) => p.pureBW).length, cPairs.length), population: pct(popTwo.filter((p) => p.pureBW).length, popTwo.length) },
  chromaticVibrant: { sample: pct(cPairs.filter((p) => p.chromaticVibrant).length, cPairs.filter((p) => p.structure === 'Chromatic').length), population: pct(popTwo.filter((p) => p.chromaticVibrant).length, popTwo.filter((p) => p.structure === 'Chromatic').length) },
};

// ---------- Library mix, for comparison with the exact pairs ----------
const lib = JSON.parse(fs.readFileSync(path.join(RESEARCH, 'data/library-phase2.json'), 'utf8')).directions;
const libN = lib.length;
const library = {
  note: 'Preliminary. Structure is the only primary dimension the records measure without knowing the ground, so it is the only like-for-like comparison before the thumbnail review. Library directions may carry accents; award records carry at most two colors.',
  n: libN,
  structure: shares(tally(lib, (d) => axesOf(d.classification).structure), libN),
  flat: shares(tally(lib, (d) => labelOf(d.classification)), libN),
  foundation: shares(tally(lib, (d) => axesOf(d.classification).foundation), libN),
  chromaticVibrant: (() => {
    const c = lib.filter((d) => axesOf(d.classification).structure === 'Chromatic');
    return { n: c.length, vibrant: c.filter((d) => /Vibrant/.test(labelOf(d.classification))).length };
  })(),
  pureBlackWhite: lib.filter((d) => BW(d.classification.ground.hex) && BW(d.classification.figure.hex)).length,
  comparison: Object.fromEntries(['Neutral', 'Chromatic', 'Monochromatic', 'Two-Tone', 'Multicolor'].map((k) => [k, {
    library: pct(lib.filter((d) => axesOf(d.classification).structure === k).length, libN),
    awardExactPairs: pct(exactPairs.filter((p) => p.structure === k).length, exactPairs.length),
  }])),
};

// ---------- Write ----------
const strip = (o) => JSON.stringify(o, (k, v) => (k === 'site' ? undefined : v), 1) + '\n';
for (const [f, o] of Object.entries({ datasets, exact, category, sample, library })) fs.writeFileSync(path.join(OUT, `${f}.json`), strip(o));

// ---------- Summary ----------
const row = (o) => Object.entries(o).map(([k, v]) => `| ${k} | ${v.n} | ${v.pct}% |`).join('\n');
const table = (h, o, unit = 'Sites') => `| ${h} | ${unit} | Share |\n| --- | ---: | ---: |\n${row(o)}`;
const bars = (bins, fmt) => bins.map((b) => `${fmt(b.from).padStart(6)} ${'█'.repeat(Math.round(b.n / Math.max(...bins.map((x) => x.n)) * 40))} ${b.n}`).join('\n');
const E = exact.pairs, T = exact.thresholds;
const md = `# Step 2: swatch analysis

Generated by \`research/tools/analyze.mjs\` from the pinned SOTD Index. Every number below comes from the JSON files beside this one; do not edit by hand.

Two evidence types, kept apart:

- **Exact colors** (${exact.sites} sites, ${EXACT_FROM} onward): real HEX values chosen by submitters. Lightness, chroma, hue and temperature are measurable. Ground is not.
- **Category swatches** (${category.sites} sites, ${category.years.join('–')}): one of ten fixed swatches per color. Only category-level statements are possible.

## Datasets

| Record type | Sites |
| --- | ---: |
${Object.entries(sortDesc(datasets.counts)).map(([k, v]) => `| ${k} | ${v} |`).join('\n')}
| **Total** | **${datasets.total}** |

${Object.entries(datasets.exclusions).map(([k, v]) => `- \`${k}\`: ${v}`).join('\n')}

## A. Exact colors, ${EXACT_FROM} onward

${exact.caution}

Records hold ${Object.entries(exact.colorCount).map(([k, v]) => `${k} color${k > 1 ? 's' : ''}: ${v}`).join(', ')}. No record has three colors, so **Colorful / Multicolor cannot occur** in this data. Identical two-color records excluded: ${exact.identicalPairsExcluded}.

### Individual colors (${exact.colors.n})

- Neutral (C ≤ ${NEUTRAL_C}): ${exact.colors.neutral.pct}%. Of those, ${Object.entries(exact.colors.neutralLightness).map(([k, v]) => `${k} ${v.pct}%`).join(', ')}; tinted ${exact.colors.tintedNeutral.pct}%.
- Pure #000000 or #FFFFFF: ${exact.colors.pureBlackOrWhite.pct}% of all colors.
- Chromatic: ${exact.colors.chromatic.n}. Vibrant ${exact.colors.chromatic.vibrant.pct}%, pastel ${exact.colors.chromatic.pastel.pct}%.

Hue family of chromatic colors (30° bins centred on the value):

${table('Hue', exact.colors.chromatic.hueFamily, 'Colors')}

### Pairs (${E.n} two-color records)

Structure needs no ground, so the records measure it directly:

${table('Structure', E.structure, 'Pairs')}

Neutral pairs that are pure black and white: ${E.neutralPairs.pureBlackWhite} of ${E.neutralPairs.n}.

Of the pairs with one chromatic color (${E.chromaticPairs.n}): the chromatic color is vibrant in ${E.chromaticPairs.vibrant.pct}%, pastel in ${E.chromaticPairs.pastel.pct}%. The neutral side is ${Object.entries(E.chromaticPairs.neutralSide).map(([k, v]) => `${k} in ${v.pct}%`).join(', ')}.

**Flat label from records alone.** The eight-way label is decided by the records in ${E.flatDeterminedFromRecords.pct}% of pairs, because both ground assignments give the same answer:

${table('Determined label', E.flatDetermined, 'Pairs')}

The rest need the thumbnail to say which color is the ground:

${table('Undetermined between', E.flatNeedsGround, 'Pairs')}

Foundation (Light or Dark) from records: ${Object.entries(E.foundation).map(([k, v]) => `${k} ${v.pct}%`).join(', ')}.

Contrast between the two colors: ${Object.entries(E.contrast).map(([k, v]) => `${k} ${v.pct}%`).join(', ')}.

Temperature of the pair: ${Object.entries(E.temperature).map(([k, v]) => `${k} ${v.pct}%`).join(', ')}.

### Do the thresholds fall where the data splits?

${T.note}

| Threshold | Value | Near it | Neighbours | Ratio | Valley |
| --- | ---: | ---: | ---: | ---: | --- |
${[['Neutral chroma ceiling', T.neutralChromaCeiling], ['Vibrant relative chroma', T.vibrantRelativeChroma], ['Vibrant chroma floor', T.vibrantChroma], ['Light ground L, all colors', T.lightGround], ['Light ground L, neutral colors', T.lightGroundNeutralOnly], ['Hue family', T.hueFamily]].map(([k, t]) => `| ${k} | ${t.threshold} ±${t.window} | ${t.at} | ${t.left} / ${t.right} | ${t.ratio} | ${t.valley ? 'yes' : 'no'} |`).join('\n')}

Pairs with a value close to a threshold: neutral ceiling ${E.fragile.nearNeutralCeiling.pct}%, vibrant floor ${E.fragile.nearVibrantFloor.pct}%, hue-family limit ${E.fragile.nearFamilyLimit.pct}%.

Chroma of every exact color:

\`\`\`
${bars(exact.histograms.chroma, (v) => v.toFixed(2))}
\`\`\`

Relative chroma of chromatic colors:

\`\`\`
${bars(exact.histograms.relativeChromaOfChromatic, (v) => v.toFixed(2))}
\`\`\`

Lightness of neutral colors, the likeliest grounds:

\`\`\`
${bars(exact.histograms.lightnessNeutral, (v) => v.toFixed(2))}
\`\`\`

Lightness of chromatic colors:

\`\`\`
${bars(exact.histograms.lightnessChromatic, (v) => v.toFixed(2))}
\`\`\`

Hue difference in pairs where both colors are chromatic:

\`\`\`
${bars(exact.histograms.pairHueDifference, (v) => `${v}°`)}
\`\`\`

### By year

| Year | Pairs | ${['Neutral', 'Chromatic', 'Monochromatic', 'Two-Tone'].join(' | ')} | Vibrant (of Chromatic) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
${Object.entries(exact.byYear).map(([y, v]) => `| ${y} | ${v.n} | ${['Neutral', 'Chromatic', 'Monochromatic', 'Two-Tone'].map((k) => `${v.structure[k]?.pct ?? 0}%`).join(' | ')} | ${v.chromaticVibrantPct}% |`).join('\n')}

### By award tier

| Tier | Pairs | ${['Neutral', 'Chromatic', 'Monochromatic', 'Two-Tone'].join(' | ')} |
| --- | ---: | ---: | ---: | ---: | ---: |
${Object.entries(exact.byTier).map(([y, v]) => `| ${y} | ${v.n} | ${['Neutral', 'Chromatic', 'Monochromatic', 'Two-Tone'].map((k) => `${v.structure[k]?.pct ?? 0}%`).join(' | ')} |`).join('\n')}

### By Awwwards category (15 largest)

| Category | Pairs | ${['Neutral', 'Chromatic', 'Monochromatic', 'Two-Tone'].join(' | ')} |
| --- | ---: | ---: | ---: | ---: | ---: |
${Object.entries(exact.byCategory).map(([y, v]) => `| ${y} | ${v.n} | ${['Neutral', 'Chromatic', 'Monochromatic', 'Two-Tone'].map((k) => `${v.structure[k]?.pct ?? 0}%`).join(' | ')} |`).join('\n')}

## B. Category swatches, ${category.years.join('–')}

${category.caution}

Can establish: ${category.canEstablish.join('; ')}.

Cannot establish: ${category.cannotEstablish.join('; ')}.

Swatches per record: ${Object.entries(category.swatchCount).map(([k, v]) => `${k}: ${v}`).join(', ')}.

${table('Swatch recorded', category.swatchPresence)}

${table('Composition', category.composition)}

Two-swatch records: ${category.twoSwatchRecords.n}, of which black + white ${category.twoSwatchRecords.blackAndWhite}.

${table('Two-swatch pair', Object.fromEntries(Object.entries(category.twoSwatchRecords.pairs).slice(0, 12)))}

Hue-name temperature, records with any hue swatch:

${table('Named', category.hueNameTemperature)}

| Year | Sites | Neutral only | Neutral + one hue | Two or more hues | Has black | Has white |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
${Object.entries(category.byYear).map(([y, v]) => `| ${y} | ${v.n} | ${v.composition['neutral swatches only']?.pct ?? 0}% | ${v.composition['neutral + one hue swatch']?.pct ?? 0}% | ${v.composition['two or more hue swatches']?.pct ?? 0}% | ${v.black}% | ${v.white}% |`).join('\n')}

## C. Thumbnail sample, by group

${sample.note}

| Group | Sites | Record types | Exact two-color pairs | Flat label needs thumbnail | Foundation needs thumbnail |
| --- | ---: | --- | ---: | ---: | ---: |
${Object.entries(sample.groups).map(([g, v]) => `| ${g} | ${v.n} | ${Object.entries(v.recordType).map(([k, n]) => `${k} ${n}`).join(', ')} | ${v.thumbnailMustDecide.ofExactPairs} | ${v.thumbnailMustDecide.flat} | ${v.thumbnailMustDecide.foundation} |`).join('\n')}

Group C against its population (exact two-color Sites of the Day):

| Measure | Group C | Population |
| --- | ---: | ---: |
${Object.entries(sample.representativenessC.structure).map(([k, v]) => `| ${k} | ${v.sample}% | ${v.population}% |`).join('\n')}
| Pure black and white | ${sample.representativenessC.pureBlackWhite.sample}% | ${sample.representativenessC.pureBlackWhite.population}% |
| Vibrant, of Chromatic | ${sample.representativenessC.chromaticVibrant.sample}% | ${sample.representativenessC.chromaticVibrant.population}% |

## D. Library mix against exact award pairs (preliminary)

${library.note}

| Structure | Library (${library.n}) | Exact award pairs (${E.n}) |
| --- | ---: | ---: |
${Object.entries(library.comparison).map(([k, v]) => `| ${k} | ${v.library}% | ${v.awardExactPairs}% |`).join('\n')}

Library pure black-and-white pairs: ${library.pureBlackWhite}. Library Chromatic directions that are vibrant: ${library.chromaticVibrant.vibrant} of ${library.chromaticVibrant.n}.
`;
fs.writeFileSync(path.join(OUT, 'summary.md'), md);
console.log(`exact ${exact.sites} sites, ${E.n} pairs; category ${category.sites} sites; written to ${path.relative(process.cwd(), OUT)}`);
