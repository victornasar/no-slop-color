// Selects distinct directions from the curated library for a brief, names a default pick, and
// gives each candidate a "choose if" condition. Deterministic: the same inputs always return the
// same result. It never creates colors; every value comes from library/directions.json.
//
// node tools/query.mjs --domains fine-dining,restaurants [--brief "text"] [--foundation light|dark]
//   [--avoid-hues 70-100,120-170] [--prefer quiet|bold] [--existing "#1F4FE0"] [--exclude lib.x,lib.y]
//   [--convention mix|follow|avoid] [--count 4] [--full]
import { fileURLToPath } from 'node:url';
import { inArc, hexToOklch, deltaEOK } from './lib/color.mjs';
import { differences } from './lib/diversity.mjs';
import { data } from './lib/data.mjs';

const chromatic = (s) => s && s.oklch.c > 0.04;
// Quiet directions: Neutral or Monochromatic structure, or a Chromatic pair whose chromatic color is not
// vibrant (display label Light + Muted or Dark + Muted). The accent does not count. Image-Led is never quiet.
const quiet = (c) => ['Neutral', 'Monochromatic'].includes(c.primary.structure) || (c.primary.structure === 'Chromatic' && c.primary.display_label.endsWith('+ Muted'));
const colorsOf = (c) => [c.ground, c.figure, c.optional_accent, c.scrim].filter(Boolean);
const groupOf = (id) => data('domains').domains.find((d) => d.id === id)?.group;

export function resolveDomains(list = [], brief = '') {
  const CTX = data('domains');
  const found = new Set(), unknown = [];
  const byKey = new Map();
  for (const d of CTX.domains) for (const k of [d.id, d.label, ...(d.aliases || [])]) byKey.set(k.toLowerCase(), d.id);
  for (const x of list) {
    const id = byKey.get(x.toLowerCase().trim());
    if (id) found.add(id); else unknown.push(x);
  }
  if (brief) {
    // Whole-word match on labels, ids and aliases, ignoring hyphens and simple plurals.
    const norm = (t) => ` ${t.toLowerCase().replace(/[^a-z0-9']+/g, ' ').trim()} `;
    const singular = (w) => w.replace(/ies$/, 'y').replace(/(ch|sh|x)es$/, '$1').replace(/s$/, '');
    const b = norm(brief);
    for (const d of CTX.domains) for (const k of [d.id, d.label, ...(d.aliases || [])]) {
      const n = norm(k).trim();
      const forms = [n, singular(n), n.split(' ').map(singular).join(' ')];
      if (forms.some((f) => f.length > 2 && b.includes(` ${f} `))) found.add(d.id);
      // Two-word labels also match when both words appear apart, e.g. "pet food brand" for "Pet brands".
      const words = n.split(' ').map(singular);
      if (words.length === 2 && words.every((w) => w.length > 2 && new RegExp(` ${w}s? `).test(b))) found.add(d.id);
    }
  }
  return { domains: [...found], unknown };
}

// Does a direction follow a convention? See contexts/conventions.json for the match rules.
// Conventions describe pairs, so an Image-Led direction never follows one.
export function follows(c, m) {
  if (!c.ground) return false;
  const pair = [c.ground, c.figure];
  if (m.keyHueArc) {
    const key = c.ground.oklch.c > c.figure.oklch.c ? c.ground : c.figure;
    if (!(key.oklch.c >= (m.minChroma ?? 0.04) && key.oklch.h != null && inArc(key.oklch.h, ...m.keyHueArc))) return false;
  }
  if (m.anyColorHueArc) {
    const [lo, hi] = m.lightnessRange || [0, 1];
    if (![...pair, c.optional_accent].filter(Boolean).some((s) => s.oklch.c >= (m.minChroma ?? 0.04) && s.oklch.h != null && inArc(s.oklch.h, ...m.anyColorHueArc) && s.oklch.l >= lo && s.oklch.l <= hi)) return false;
  }
  if (m.achromaticPair) {
    if (!pair.every((s) => s.oklch.c <= 0.02)) return false;
    if (m.darkestMaxLightness != null && Math.min(...pair.map((s) => s.oklch.l)) > m.darkestMaxLightness) return false;
  }
  return true;
}

// library is for tests only; agents always query the curated library.
export function query(opts = {}, library = data('library').directions) {
  const LIB = library;
  const CTX = data('domains');
  const count = Math.min(Math.max(Number(opts.count) || 4, 1), 5);
  const { domains, unknown } = resolveDomains(opts.domains || [], opts.brief || '');
  const groups = [...new Set(domains.map(groupOf).filter(Boolean))];
  const avoid = (opts.avoidHues || []).map((r) => r.split('-').map(Number));
  const exclude = new Set(opts.exclude || []);
  const existing = opts.existing ? hexToOklch(opts.existing) : null;
  const mode = opts.convention || 'mix';
  const applicable = data('conventions').conventions.map((v) => ({ ...v, strengths: v.domains.filter((x) => domains.includes(x.id)) })).filter((v) => v.strengths.length);
  const excludedBy = {};

  const scored = [];
  for (const d of LIB) {
    const c = d.classification;
    if (exclude.has(d.id)) { excludedBy[d.id] = 'excluded by request'; continue; }
    if (opts.foundation && c.primary.foundation?.toLowerCase() !== opts.foundation) { excludedBy[d.id] = c.primary.foundation ? `foundation is ${c.primary.foundation}` : 'Image-Led has no foundation'; continue; }
    const hit = colorsOf(c).filter(chromatic).find((s) => avoid.some(([a, b]) => inArc(s.oklch.h, a, b)));
    if (hit) { excludedBy[d.id] = `${hit.name} hue ${hit.oklch.h} is in an avoided range`; continue; }
    const exact = c.industry.filter((x) => domains.includes(x));
    const inGroup = c.industry.some((x) => groups.includes(groupOf(x)));
    let score = exact.length * 3 + (inGroup ? 1 : 0);
    if (!exact.length && !inGroup && quiet(c)) score += 0.5; // general fallback: versatile directions first
    if (opts.prefer === 'quiet' && quiet(c)) score += 1;
    if (opts.prefer === 'bold' && !quiet(c)) score += 1;
    const conv = applicable.filter((v) => follows(c, v.match));
    if (mode === 'avoid' && conv.some((v) => v.stance !== 'preferred')) { excludedBy[d.id] = `follows ${conv.map((v) => v.id).join(', ')}`; continue; }
    if (conv.some((v) => v.stance === 'preferred')) score += 2;
    if (mode === 'follow' && conv.length) score += 3;
    let nearestExisting = null;
    if (existing) {
      nearestExisting = Math.min(...colorsOf(c).map((s) => deltaEOK(existing, [s.oklch.l, s.oklch.c, s.oklch.h])));
      if (nearestExisting < 0.08) score += 2;
    }
    scored.push({ d, score, match: exact.length ? 'exact' : inGroup ? 'group' : 'general', matched: exact, nearestExisting, conv });
  }
  scored.sort((a, b) => b.score - a.score || a.d.id.localeCompare(b.d.id));

  const chosen = [];
  const notes = [];
  for (const minDiff of [2, 1]) {
    for (const s of scored) {
      if (chosen.length >= count) break;
      if (chosen.includes(s)) continue;
      if (chosen.every((x) => differences(x.d.classification, s.d.classification).length >= minDiff)) chosen.push(s);
    }
    if (chosen.length >= count) break;
    if (minDiff === 2) notes.push('Fewer distinct directions were available than requested, so some differ on only one measure.');
  }

  // In mix mode a 'context' convention is represented by exactly one direction when the library has one.
  if (mode === 'mix') {
    for (const v of applicable.filter((x) => x.stance === 'context')) {
      const followers = chosen.filter((s) => s.conv.includes(v));
      for (const extra of followers.slice(1)) {
        const alt = scored.find((s) => !chosen.includes(s) && !s.conv.includes(v) && chosen.filter((x) => x !== extra).every((x) => differences(x.d.classification, s.d.classification).length >= 1));
        if (alt) chosen.splice(chosen.indexOf(extra), 1, alt);
      }
      if (!followers.length) {
        const cand = scored.find((s) => !chosen.includes(s) && s.conv.includes(v) && s.match !== 'general');
        const replaceable = [...chosen].reverse().find((x) => !x.conv.length);
        if (cand && replaceable && chosen.filter((x) => x !== replaceable).every((x) => differences(x.d.classification, cand.d.classification).length >= 1)) {
          chosen.splice(chosen.indexOf(replaceable), 1, cand);
        }
      }
    }
  }
  // Keep the ranking order after any convention swaps.
  chosen.sort((a, b) => b.score - a.score || a.d.id.localeCompare(b.d.id));

  if (chosen.some((s) => s.match !== 'exact')) notes.push('Some directions come from related domains or the general library, because the exact domains had too few distinct options.');
  if (!domains.length) notes.push('No domain was recognised in the brief, so directions were chosen for variety alone. Pass domains explicitly for a better result.');

  // Default pick: the best-scoring candidate. Ties are broken by tieBreak below, never by contrast alone.
  const top = chosen.length ? Math.max(...chosen.map((s) => s.score)) : null;
  const tied = chosen.filter((s) => s.score === top);
  const { pick, decidedBy, gated, belowAAA } = tieBreak(tied);
  if (belowAAA) notes.push(`No equally ranked option reaches ${TIE_CONTRAST}:1 (AAA), so the default pick was chosen on domain fit. ${pick.d.name} is ${pick.d.classification.measurements.wcag_ratio}:1 figure on ground, below AAA; check each text pair against its use.`);
  for (const g of gated) notes.push(`${g.d.name} is curated more closely for ${g.matched.join(', ')} than ${pick.d.name}, but its figure on ground is ${g.d.classification.measurements.wcag_ratio}:1, under the ${TIE_CONTRAST}:1 needed to win a tie for the default pick.`);
  const preferred = pick?.conv.find((v) => v.stance === 'preferred');
  const pickReason = !pick ? null
    : preferred ? `The preferred direction for ${pick.matched.join(', ') || 'this category'}: ${preferred.label.toLowerCase()}.`
    : pick.match === 'exact' ? `Curated for ${pick.matched.join(', ')}${TIE_REASON[decidedBy] ?? ''}.`
    : 'The best available option; no direction is curated for these exact domains.';

  const differentiators = [...new Set(groups.flatMap((g) => CTX.groups.find((x) => x.id === g)?.differentiators || []))];
  return {
    request: { brief: opts.brief || null, domains, unknownDomains: unknown, foundation: opts.foundation || null, avoidHues: opts.avoidHues || [], prefer: opts.prefer || null, existing: opts.existing || null, convention: mode, count },
    pick: pick ? { id: pick.d.id, name: pick.d.name, reason: pickReason } : null,
    openQuestions: differentiators,
    conventions: applicable.map((v) => ({ id: v.id, label: v.label, stance: v.stance, strength: v.strengths, confidence: v.confidence, summary: v.summary, evidence: v.evidence, notes: v.notes, followedBy: chosen.filter((s) => s.conv.includes(v)).map((s) => s.d.id) })),
    notes,
    excluded: excludedBy,
    directions: chosen.map((s, i) => card({ ...s, crossDomainUsage: crossDomainUsage(s.d, domains) }, i, opts.full)),
    pairwise: chosen.flatMap((a, i) => chosen.slice(i + 1).map((b) => ({ a: a.d.id, b: b.d.id, differsOn: differences(a.d.classification, b.d.classification) }))),
  };
}

// Equally scored candidates are ranked in three steps (docs/04-recommendation-design.md, "Default pick"):
// 1. Contrast eligibility: only candidates at or above AAA (7:1 figure on ground) take part. If none
//    reach it, all take part, and the query notes that the pick is below AAA.
// 2. Domain fit: curated for a requested domain beats not curated for it. Industry ids are listed
//    closest fit first, so among curated candidates a lower average position of the requested domains
//    wins. Candidates matched only by group or as general fallbacks carry no fit evidence.
// 3. Stable fallback: highest contrast, then id.
// Contrast never decides on its own above the threshold, so 21:1 is not an advantage in itself.
// Cross-domain usage is reported on each card but never ranks: being curated for fewer domains is
// rarity, not suitability.
export const TIE_CONTRAST = 7;
// Curated domains outside the request. Reported for analysis and available to multi-result diversity; not a ranking signal.
export const crossDomainUsage = (d, domains) => d.classification.industry.filter((x) => !domains.includes(x)).length;
const TIE_REASON = {
  eligibility: ', and the only one of the equally ranked options to reach AAA contrast',
  fit: ', and the closest curated fit of the equally ranked options',
  fallback: ', and first of the equally ranked options by contrast',
};

export function tieBreak(tied) {
  const ratio = (s) => s.d.classification.measurements.wcag_ratio;
  const byContrast = (a, b) => ratio(b) - ratio(a) || a.d.id.localeCompare(b.d.id);
  if (tied.length <= 1) return { pick: tied[0], decidedBy: null, gated: [] };
  // Fit is the average list position of the requested domains, lower is better; uncurated candidates rank after.
  const fit = (s) => (s.matched.length ? s.matched.reduce((a, x) => a + s.d.classification.industry.indexOf(x), 0) / s.matched.length : Infinity);
  const fitCmp = (a, b) => (fit(a) === fit(b) ? 0 : fit(a) - fit(b));
  const eligible = tied.filter((s) => ratio(s) >= TIE_CONTRAST);
  let pick, decidedBy;
  const pool = eligible.length ? eligible : tied;
  if (pool.length === 1) [pick, decidedBy] = [pool[0], 'eligibility'];
  else {
    const [first, second] = [...pool].sort((a, b) => fitCmp(a, b) || byContrast(a, b));
    [pick, decidedBy] = [first, fitCmp(first, second) ? 'fit' : 'fallback'];
  }
  // Below-AAA candidates that fit the request more closely than the pick; the query reports them in notes.
  const gated = tied.filter((s) => s !== pick && ratio(s) < TIE_CONTRAST && fitCmp(s, pick) < 0);
  return { pick, decidedBy, gated, belowAAA: !eligible.length };
}

const swatch = (s) => (s ? { name: s.name, hex: s.hex, oklch: s.oklch } : null);

export function card(s, rank, full) {
  const { d } = s, c = d.classification;
  const pair = (fg, bg) => d.accessibility.pairs.find((p) => (p.foreground === fg && p.background === bg) || (p.foreground === bg && p.background === fg));
  const button = d.usage.assignments.find((a) => a.element === 'Primary button');
  const label = d.usage.assignments.find((a) => a.element === 'Button label');
  const imageLed = c.kind === 'image-led';
  const out = {
    rank: rank + 1,
    id: d.id,
    name: d.name,
    kind: imageLed ? 'image-led' : 'pair',
    chooseIf: d.choose_if,
    match: s.match,
    matchedDomains: s.matched,
    crossDomainUsage: s.crossDomainUsage ?? null,
    score: s.score,
    primary: c.primary,
    secondary: c.secondary,
    ground: swatch(c.ground),
    figure: swatch(c.figure),
    accent: swatch(c.optional_accent),
    area: c.area_distribution ?? null,
    text: c.derived.text_neutrals.map((t) => ({ use: t.use, hex: t.hex, oklch: t.oklch, contrastOnGround: t.contrast_on_ground })),
    keyNumbers: imageLed
      ? { typeOnWorstCaseImagery: c.measurements.wcag_ratio, typeOnScrim: c.measurements.type_on_scrim, scrimOpacity: c.measurements.scrim_opacity }
      : {
        figureOnGround: c.measurements.wcag_ratio,
        bodyTextOnGround: pair('text', 'ground')?.ratio ?? null,
        button: button && label ? { fill: button.color, label: label.color, ratio: pair(label.color, button.color)?.ratio ?? null } : null,
      },
    summary: c.summary,
    reasoning: d.reasoning,
    useFor: d.use_for,
    watchOut: d.watch_out,
    do: d.usage.do,
    avoid: d.usage.avoid,
    flags: c.flags,
    follows: s.conv.map((v) => ({ id: v.id, label: v.label, stance: v.stance })),
  };
  if (imageLed) { out.scrim = { ...swatch(c.scrim), opacity: c.scrim.opacity }; out.imagery = c.imagery.brief; }
  if (s.nearestExisting != null) out.nearestExistingDeltaEOK = +s.nearestExisting.toFixed(3);
  if (full) out.direction = d;
  return out;
}

export function parseQueryArgs(args) {
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  const list = (k) => (opt(k) ? opt(k).split(',').map((x) => x.trim()).filter(Boolean) : []);
  const foundation = opt('--foundation')?.toLowerCase();
  if (foundation && !['light', 'dark'].includes(foundation)) throw new Error('--foundation must be light or dark');
  const prefer = opt('--prefer');
  if (prefer && !['quiet', 'bold'].includes(prefer)) throw new Error('--prefer must be quiet or bold');
  const convention = opt('--convention');
  if (convention && !['mix', 'follow', 'avoid'].includes(convention)) throw new Error('--convention must be mix, follow or avoid');
  if (!opt('--domains') && !opt('--brief')) throw new Error('Give --domains <ids> or --brief "<text>"');
  return { domains: list('--domains'), brief: opt('--brief'), foundation, avoidHues: list('--avoid-hues'), prefer, existing: opt('--existing'), exclude: list('--exclude'), convention, count: opt('--count'), full: args.includes('--full') };
}

// cli-start
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(query(parseQueryArgs(process.argv.slice(2))), null, 2)); }
  catch (e) { console.error(e.message); process.exit(1); }
}
// cli-end
