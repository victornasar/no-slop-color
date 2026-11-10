// Classifies a ground and figure pair (plus an optional accent) in OKLCH.
// Measured tags come from the tests in classifications/*.json. Curated tags (aesthetic,
// composition, natural/industrial/pastoral) and hybrid confirmations come from `judged`.
//
// CLI: node tools/classify.mjs --ground "oklch(0.98 0.004 250)" --figure "#1D2229" [--accent "#C06F0A"] [--area 85/15]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gamutMap, inSrgb, toHex, hexToOklch, deltaEOK, relativeChroma, contrast, floor2, hueDiff, arcSpan, inArc, cmax } from './lib/color.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PRIMARY = JSON.parse(fs.readFileSync(path.join(REPO, 'classifications/primary.json'), 'utf8'));
const SECONDARY = JSON.parse(fs.readFileSync(path.join(REPO, 'classifications/secondary.json'), 'utf8'));
const M = PRIMARY.measurements;
const NEUTRAL_C = M.neutralChromaCeiling.value;
const FAMILY = M.sameHueFamily.maxHueDifference;
const sec = Object.fromEntries(SECONDARY.dimensions.flatMap((d) => d.classifications.map((c) => [c.id, { ...c, dimension: d.id }])));
const WARM = sec.warm.params.hueArc, COOL = sec.cool.params.hueArc;

const r = (x, n) => (x == null ? null : Number(x.toFixed(n)));

export function parseColor(v) {
  if (Array.isArray(v)) return { lch: [v[0], v[1], v[2] ?? null], authored: true };
  if (typeof v === 'object' && v && 'l' in v) return { lch: [v.l, v.c, v.h ?? null], authored: true };
  const s = String(v).trim();
  const m = s.match(/^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+|none)\s*\)$/i);
  if (m) return { lch: [Number(m[1]) / (m[2] ? 100 : 1), Number(m[3]), m[4] === 'none' ? null : Number(m[4])], authored: true };
  if (/^#?[0-9a-f]{3}([0-9a-f]{3})?$/i.test(s)) return { lch: hexToOklch(s.startsWith('#') ? s : '#' + s), authored: false };
  throw new Error(`Unrecognised color: ${v}`);
}

export function swatch(v, name) {
  const { lch } = parseColor(v);
  let [L, C, h] = lch;
  if (C <= 0.000004) { C = 0; h = null; }
  const status = inSrgb(L, C, h) ? 'in-gamut' : 'gamut-mapped';
  const hex = toHex(...gamutMap(L, C, h));
  const out = {};
  if (name) out.name = name;
  Object.assign(out, {
    hex,
    oklch: { l: r(L, 4), c: r(C, 4), h: h == null ? null : r(((h % 360) + 360) % 360, 2) },
    css: `oklch(${r(L, 4)} ${r(C, 4)} ${h == null ? 'none' : r(h, 2)})`,
    relative_chroma: r(relativeChroma(L, Math.min(C, cmax(L, h)), h), 3),
    srgb: { status, delta_e_ok: r(deltaEOK([L, C, h], hexToOklch(hex)), 4) },
  });
  return out;
}

const lchOf = (s) => [s.oklch.l, s.oklch.c, s.oklch.h];
const chromatic = (s) => s.oklch.c > NEUTRAL_C;
const vibrant = (s) => chromatic(s) && s.relative_chroma >= M.vibrant.minRelativeChroma && s.oklch.c >= M.vibrant.minChroma;
const pastel = (s) => chromatic(s) && s.oklch.l >= M.pastel.minLightness && s.oklch.c <= M.pastel.maxChroma;

function parseArea(a, hasAccent) {
  if (!a) return null;
  const parts = String(a).split('/').map(Number);
  if (parts.reduce((x, y) => x + y, 0) !== 100) throw new Error(`area_distribution must sum to 100: ${a}`);
  if (parts.length === 3 && !hasAccent) throw new Error('area_distribution has an accent share but no accent was given');
  return { ground: parts[0] / 100, figure: parts[1] / 100, accent: (parts[2] ?? 0) / 100 };
}

// Text neutrals sit on the ground: tinted toward the ground (or the figure when the ground has no hue).
function textNeutral(ground, figure, target, use) {
  const h = ground.oklch.c >= 0.005 ? ground.oklch.h : figure.oklch.c >= 0.005 ? figure.oklch.h : null;
  const C = h == null ? 0 : Math.min(0.012, Math.max(ground.oklch.c, figure.oklch.c));
  const darker = ground.oklch.l >= 0.6;
  let lo = darker ? 0 : ground.oklch.l, hi = darker ? ground.oklch.l : 1;
  const ratio = (L) => contrast(toHex(...gamutMap(L, C, h)), ground.hex);
  const best = darker ? 0.08 : 0.99;
  if (ratio(best) < target) return finishText(best, C, h, ground, use, darker);
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    const ok = ratio(mid) >= target;
    if (darker) { if (ok) lo = mid; else hi = mid; } else { if (ok) hi = mid; else lo = mid; }
  }
  return finishText(darker ? lo : hi, C, h, ground, use, darker);
}
function finishText(L, C, h, ground, use, darker) {
  const s = swatch([darker ? Math.floor(L * 1000) / 1000 : Math.ceil(L * 1000) / 1000, C, h]);
  return { ...s, use, contrast_on_ground: floor2(contrast(s.hex, ground.hex)) };
}

// Tints and shades of the key color: the more chromatic of ground and figure.
// A side gets no steps when the key is already within 0.1 of its end (0.97 or 0.14).
function ramp(key, n = 3) {
  const [L0, C0, h] = lchOf(key);
  const rel0 = key.relative_chroma;
  const make = (L) => swatch([r(L, 3), h == null ? 0 : r(Math.min(rel0 * cmax(L, h), C0 * 1.1), 4), h]);
  const tints = [], shades = [];
  if (0.97 - L0 >= 0.1) for (let i = 1; i <= n; i++) tints.push(make(L0 + ((0.97 - L0) * i) / (n + 1)));
  if (L0 - 0.14 >= 0.1) for (let i = 1; i <= n; i++) shades.push(make(L0 - ((L0 - 0.14) * i) / (n + 1)));
  return { tints, shades };
}

const tempOf = (h) => (inArc(h, ...WARM) ? 'warm' : inArc(h, ...COOL) ? 'cool' : null);

export function classifyPair(input) {
  const ground = swatch(input.ground, input.names?.ground);
  const figure = swatch(input.figure, input.names?.figure);
  const accent = input.accent ? swatch(input.accent, input.names?.accent) : null;
  const area = parseArea(input.area, !!accent);
  const judged = input.judged || {};
  const flags = [];
  const notes = [];

  const pair = [ground, figure];
  const all = accent ? [ground, figure, accent] : pair;
  const chrom = all.filter(chromatic);
  const pairChrom = pair.filter(chromatic);
  const hd = ground.oklch.h != null && figure.oklch.h != null ? hueDiff(ground.oklch.h, figure.oklch.h) : null;
  const ratio = contrast(ground.hex, figure.hex);

  // Foundation.
  const gL = ground.oklch.l;
  const foundation = gL >= M.lightGround.minLightness ? 'Light' : 'Dark';
  if (gL >= M.lightGround.reviewBand[0] && gL <= M.lightGround.reviewBand[1]) flags.push(`ground L ${r(gL, 3)} is in the review band ${M.lightGround.reviewBand.join('–')}`);

  // Structure.
  const accentSubstantial = accent && chromatic(accent) && area && area.accent >= M.multicolorAccentShare.value;
  const hues3 = accent ? [ground, figure, accent].map((s) => s.oklch.h) : [];
  const multicolor = accentSubstantial && pairChrom.length === 2 && hues3.every((a, i) => hues3.every((b, j) => i === j || hueDiff(a, b) > FAMILY));
  let structure;
  if (!pairChrom.length) structure = 'Neutral';
  else if (multicolor) structure = 'Multicolor';
  else if (pairChrom.length === 1) structure = 'Chromatic';
  else structure = hd <= FAMILY ? 'Monochromatic' : 'Two-Tone';

  // Flat primary, first matching rule.
  let label;
  if (structure === 'Neutral') label = 'Neutral';
  else if (structure === 'Multicolor') label = 'Colorful / Multicolor';
  else if (structure === 'Two-Tone') label = 'Two-Tone';
  else if (structure === 'Monochromatic') label = 'Monochromatic Foundation';
  else label = `${foundation} + ${vibrant(pairChrom[0]) ? 'Vibrant' : 'Muted'}`;

  // Confidence: values close to a threshold make the label fragile.
  for (const s of pair) {
    if (Math.abs(s.oklch.c - NEUTRAL_C) < 0.008) flags.push(`${s.name || s.hex} chroma ${s.oklch.c} is near the neutral ceiling ${NEUTRAL_C}`);
    if (chromatic(s) && Math.abs(s.relative_chroma - M.vibrant.minRelativeChroma) < 0.05 && s.oklch.c >= M.vibrant.minChroma) flags.push(`${s.name || s.hex} relative chroma ${s.relative_chroma} is near the vibrant floor`);
  }
  if (hd != null && pairChrom.length === 2 && Math.abs(hd - FAMILY) < 6) flags.push(`hue difference ${r(hd, 1)} is near the hue-family limit ${FAMILY}`);
  if (accent && chromatic(accent) && !area && pairChrom.length === 2) notes.push('No area_distribution, so the accent cannot make this Multicolor.');
  const confidence = flags.length === 0 ? 'high' : flags.length === 1 ? 'medium' : 'low';

  // Secondary: measured.
  const S = { temperature: [], saturation_intensity: [], color_character: [], relationships: [], contrast: [], aesthetic: [], composition: [] };
  const tempsOf = (set) => (set.some(chromatic) ? set.filter(chromatic) : set.filter((s) => s.oklch.c >= 0.01)).map((s) => tempOf(s.oklch.h)).filter(Boolean);
  let tempSet = tempsOf(pair);
  if (!tempSet.length && accent) tempSet = tempsOf([accent]);
  if (tempSet.includes('warm') && tempSet.includes('cool')) S.temperature.push('Balanced');
  else if (tempSet.includes('warm')) S.temperature.push('Warm');
  else if (tempSet.includes('cool')) S.temperature.push('Cool');

  const anyVibrant = chrom.some(vibrant);
  if (anyVibrant) S.saturation_intensity.push('Vibrant');
  if (chrom.some((s) => !vibrant(s) && !pastel(s))) S.saturation_intensity.push('Muted');
  if (chrom.some(pastel)) S.saturation_intensity.push('Pastel');
  if ((anyVibrant && ratio >= 4.5) || pair.every(vibrant)) S.saturation_intensity.push('High Intensity');
  if (!anyVibrant && ratio < 7) S.saturation_intensity.push('Low Intensity');

  const j = sec['jewel-tones'].params;
  if (chrom.some((s) => s.oklch.l >= j.lightnessRange[0] && s.oklch.l <= j.lightnessRange[1] && s.relative_chroma >= j.minRelativeChroma && s.oklch.c >= j.minChroma)) S.color_character.push('Jewel Tones');
  const e = sec.earthy.params;
  const earthySuggested = chrom.some((s) => inArc(s.oklch.h, ...e.hueArc) && s.oklch.l >= e.lightnessRange[0] && s.oklch.l <= e.lightnessRange[1] && s.oklch.c >= e.chromaRange[0] && s.oklch.c <= e.chromaRange[1]);
  const judgedChar = judged.color_character || [];
  if (judgedChar.includes('Earthy')) {
    if (!earthySuggested) throw new Error('Earthy was confirmed but no color falls in the earth-tone range');
    S.color_character.push('Earthy');
  } else if (earthySuggested) flags.push('Earthy is suggested by the earth-tone range but not confirmed');
  for (const t of judgedChar) if (['Natural', 'Industrial', 'Pastoral'].includes(t)) S.color_character.push(t);
  for (const t of judgedChar) if (!['Earthy', 'Natural', 'Industrial', 'Pastoral'].includes(t)) throw new Error(`${t} is measured, not judged`);

  const tinted = all.filter((s) => s.oklch.c >= 0.01).map((s) => s.oklch.h);
  if (tinted.length >= 2 && arcSpan(tinted) <= FAMILY) S.relationships.push('Monochromatic');
  const ch = chrom.map((s) => s.oklch.h);
  const span = arcSpan(ch);
  if (ch.length >= 2 && span > FAMILY && span <= 60) S.relationships.push('Analogous');
  let maxD = 0;
  for (let a = 0; a < ch.length; a++) for (let b = a + 1; b < ch.length; b++) maxD = Math.max(maxD, hueDiff(ch[a], ch[b]));
  if (maxD >= 150) S.relationships.push('Complementary');
  if (ch.length === 3) {
    const d = [[0, 1], [0, 2], [1, 2]].map(([a, b]) => hueDiff(ch[a], ch[b]));
    if (d.every((x) => x >= 100 && x <= 140)) S.relationships.push('Triadic');
    for (let base = 0; base < 3; base++) {
      const others = [0, 1, 2].filter((x) => x !== base);
      const ok = others.every((o) => { const x = hueDiff(ch[base], ch[o]); return x >= 120 && x <= 165; });
      const between = hueDiff(ch[others[0]], ch[others[1]]);
      if (ok && between >= 15 && between <= 75) { S.relationships.push('Split Complementary'); break; }
    }
  }
  if ((!pairChrom.length && accent && chromatic(accent)) || (pairChrom.length === 1 && area && (chromatic(ground) ? area.ground : area.figure) <= 0.25)) S.relationships.push('Near-Neutral + Accent');

  S.contrast.push(ratio >= 7 ? 'High Contrast' : ratio >= 3 ? 'Moderate Contrast' : 'Low Contrast');
  const sameFamily = (!chromatic(ground) && !chromatic(figure)) || (pairChrom.length === 2 && hd <= FAMILY);
  if (sameFamily && Math.abs(ground.oklch.l - figure.oklch.l) < 0.25) S.contrast.push('Tonal');

  // Secondary: curated.
  const allowed = (dim) => new Set(SECONDARY.dimensions.find((d) => d.id === dim).classifications.map((c) => c.label));
  for (const dim of ['aesthetic', 'composition']) {
    for (const t of judged[dim] || []) {
      if (!allowed(dim).has(t)) throw new Error(`Unknown ${dim} tag: ${t}`);
      S[dim].push(t);
    }
  }

  const key = chromatic(figure) || !chromatic(ground) ? figure : ground;
  const { tints, shades } = ramp(key);
  const derived = {
    text_neutrals: [textNeutral(ground, figure, 10, 'text'), textNeutral(ground, figure, 4.8, 'text-muted')],
    tints,
    shades,
  };

  const describe = () => {
    const fig = chromatic(figure) ? `${vibrant(figure) ? 'vibrant' : pastel(figure) ? 'pastel' : 'muted'} ${figure.name || figure.hex}` : `neutral ${figure.name || figure.hex}`;
    const gr = `${foundation.toLowerCase()} ${chromatic(ground) ? 'chromatic' : 'neutral'} ground (${ground.name || ground.hex})`;
    return `${label}: a ${fig} figure on a ${gr}, ${S.contrast[0].toLowerCase()} at ${floor2(ratio)}:1.`;
  };

  if (notes.length === 0 && flags.length) notes.push('Confidence lowered by the flags listed.');
  return {
    ground,
    figure,
    optional_accent: accent,
    area_distribution: input.area ?? null,
    primary: { label, confidence, notes: notes.join(' ') || 'All measurements are clear of thresholds.' },
    alternative_two_axis: { foundation, structure },
    secondary: S,
    industry: input.industry || [],
    derived,
    measurements: {
      wcag_ratio: floor2(ratio),
      lightness_difference: r(Math.abs(ground.oklch.l - figure.oklch.l), 3),
      hue_difference: hd == null ? null : r(hd, 1),
      delta_e_ok: r(deltaEOK(lchOf(ground), lchOf(figure)), 3),
    },
    flags,
    summary: input.summary || describe(),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  if (!opt('--ground') || !opt('--figure')) {
    console.error('Usage: node tools/classify.mjs --ground <hex|oklch()> --figure <hex|oklch()> [--accent <color>] [--area 80/20]');
    process.exit(1);
  }
  console.log(JSON.stringify(classifyPair({ ground: opt('--ground'), figure: opt('--figure'), accent: opt('--accent'), area: opt('--area') }), null, 2));
}
