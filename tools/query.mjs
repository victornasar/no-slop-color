// Selects distinct directions from the curated library for a brief. Deterministic: the same
// inputs always return the same directions. It never creates colors; every value comes from
// library/directions.json.
//
// node tools/query.mjs --domains fine-dining,restaurants [--brief "text"] [--foundation light|dark]
//   [--avoid-hues 70-100,120-170] [--prefer quiet|bold] [--existing "#1F4FE0"] [--exclude lib.x,lib.y]
//   [--convention mix|follow|avoid] [--count 4] [--full]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { differences } from './build.mjs';
import { inArc, hexToOklch, deltaEOK } from './lib/color.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIB = JSON.parse(fs.readFileSync(path.join(REPO, 'library/directions.json'), 'utf8')).directions;
const CTX = JSON.parse(fs.readFileSync(path.join(REPO, 'contexts/domains.json'), 'utf8'));
const CONV = JSON.parse(fs.readFileSync(path.join(REPO, 'contexts/conventions.json'), 'utf8')).conventions;
const QUIET = new Set(['Neutral', 'Light + Muted', 'Dark + Muted', 'Monochromatic Foundation']);

export function resolveDomains(list = [], brief = '') {
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
    const b = norm(brief);
    for (const d of CTX.domains) for (const k of [d.id, d.label, ...(d.aliases || [])]) {
      const n = norm(k).trim();
      const singular = (w) => w.replace(/ies$/, 'y').replace(/s$/, '');
      const forms = [n, singular(n), n.split(' ').map(singular).join(' ')];
      if (forms.some((f) => f.length > 2 && b.includes(` ${f} `))) found.add(d.id);
    }
  }
  return { domains: [...found], unknown };
}

const groupOf = (id) => CTX.domains.find((d) => d.id === id)?.group;
const chromatic = (s) => s && s.oklch.c > 0.04;

// Does a direction follow a convention? See contexts/conventions.json for the match rules.
export function follows(c, m) {
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

export function query(opts) {
  const count = Math.min(Math.max(Number(opts.count) || 4, 1), 5);
  const { domains, unknown } = resolveDomains(opts.domains || [], opts.brief || '');
  const groups = [...new Set(domains.map(groupOf).filter(Boolean))];
  const avoid = (opts.avoidHues || []).map((r) => r.split('-').map(Number));
  const exclude = new Set(opts.exclude || []);
  const existing = opts.existing ? hexToOklch(opts.existing) : null;
  const excludedBy = {};
  const mode = opts.convention || 'mix';
  const applicable = CONV.map((v) => ({ ...v, strengths: v.domains.filter((x) => domains.includes(x.id)) })).filter((v) => v.strengths.length);

  const scored = [];
  for (const d of LIB) {
    const c = d.classification;
    if (exclude.has(d.id)) { excludedBy[d.id] = 'excluded by request'; continue; }
    if (opts.foundation && c.alternative_two_axis.foundation.toLowerCase() !== opts.foundation) { excludedBy[d.id] = `foundation is ${c.alternative_two_axis.foundation}`; continue; }
    const hit = [c.ground, c.figure, c.optional_accent].filter(chromatic).find((s) => avoid.some(([a, b]) => inArc(s.oklch.h, a, b)));
    if (hit) { excludedBy[d.id] = `${hit.name} hue ${hit.oklch.h} is in an avoided range`; continue; }
    const exact = c.industry.filter((x) => domains.includes(x));
    const inGroup = c.industry.some((x) => groups.includes(groupOf(x)));
    let score = exact.length * 3 + (inGroup ? 1 : 0);
    if (!exact.length && !inGroup && QUIET.has(c.primary.label)) score += 0.5; // general fallback: versatile directions first
    if (opts.prefer === 'quiet' && QUIET.has(c.primary.label)) score += 1;
    if (opts.prefer === 'bold' && !QUIET.has(c.primary.label)) score += 1;
    const conv = applicable.filter((v) => follows(c, v.match));
    if (mode === 'avoid' && conv.some((v) => v.stance !== 'preferred')) { excludedBy[d.id] = `follows ${conv.map((v) => v.id).join(', ')}`; continue; }
    if (conv.some((v) => v.stance === 'preferred')) score += 2;
    if (mode === 'follow' && conv.length) score += 3;
    let nearestExisting = null;
    if (existing) {
      nearestExisting = Math.min(...[c.ground, c.figure, c.optional_accent].filter(Boolean).map((s) => deltaEOK(existing, [s.oklch.l, s.oklch.c, s.oklch.h])));
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
  if (chosen.some((s) => s.match !== 'exact')) notes.push('Some directions come from related domains or the general library, because the exact domains had too few distinct options.');
  if (!domains.length) notes.push('No domain was recognised in the brief, so directions were chosen for variety alone.');

  const differentiators = [...new Set(groups.flatMap((g) => CTX.groups.find((x) => x.id === g)?.differentiators || []))];
  return {
    request: { brief: opts.brief || null, domains, unknownDomains: unknown, foundation: opts.foundation || null, avoidHues: opts.avoidHues || [], prefer: opts.prefer || null, existing: opts.existing || null, convention: mode, count },
    conventions: applicable.map((v) => ({ id: v.id, label: v.label, stance: v.stance, strength: v.strengths, confidence: v.confidence, summary: v.summary, evidence: v.evidence, notes: v.notes, followedBy: chosen.filter((s) => s.conv.includes(v)).map((s) => s.d.id) })),
    differentiators,
    excluded: excludedBy,
    notes,
    directions: chosen.map((s, i) => card(s, i, opts.full)),
    pairwise: chosen.flatMap((a, i) => chosen.slice(i + 1).map((b) => ({ a: a.d.id, b: b.d.id, differsOn: differences(a.d.classification, b.d.classification) }))),
  };
}

function swatch(s) { return s ? { name: s.name, hex: s.hex, oklch: s.oklch } : null; }

function card(s, rank, full) {
  const { d } = s, c = d.classification;
  const pair = (fg, bg) => d.accessibility.pairs.find((p) => (p.foreground === fg && p.background === bg) || (p.foreground === bg && p.background === fg));
  const button = d.usage.assignments.find((a) => a.element === 'Primary button');
  const label = d.usage.assignments.find((a) => a.element === 'Button label');
  const out = {
    rank: rank + 1,
    id: d.id,
    name: d.name,
    match: s.match,
    matchedDomains: s.matched,
    score: s.score,
    primary: c.primary,
    twoAxis: c.alternative_two_axis,
    secondary: c.secondary,
    ground: swatch(c.ground),
    figure: swatch(c.figure),
    accent: swatch(c.optional_accent),
    area: c.area_distribution,
    text: c.derived.text_neutrals.map((t) => ({ use: t.use, hex: t.hex, oklch: t.oklch, contrastOnGround: t.contrast_on_ground })),
    keyNumbers: {
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
    nearestExistingDeltaEOK: s.nearestExisting == null ? undefined : +s.nearestExisting.toFixed(3),
  };
  if (full) out.direction = d;
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  const list = (k) => (opt(k) ? opt(k).split(',').map((x) => x.trim()).filter(Boolean) : []);
  if (!opt('--domains') && !opt('--brief')) {
    console.error('Usage: node tools/query.mjs --domains <ids> | --brief "<text>" [--foundation light|dark] [--avoid-hues 70-100] [--prefer quiet|bold] [--existing #hex] [--exclude ids] [--count 4] [--full]');
    process.exit(1);
  }
  const foundation = opt('--foundation')?.toLowerCase();
  if (foundation && !['light', 'dark'].includes(foundation)) { console.error('--foundation must be light or dark'); process.exit(1); }
  if (opt('--convention') && !['mix', 'follow', 'avoid'].includes(opt('--convention'))) { console.error('--convention must be mix, follow or avoid'); process.exit(1); }
  const prefer = opt('--prefer');
  if (prefer && !['quiet', 'bold'].includes(prefer)) { console.error('--prefer must be quiet or bold'); process.exit(1); }
  console.log(JSON.stringify(query({
    domains: list('--domains'), brief: opt('--brief'), foundation, avoidHues: list('--avoid-hues'), prefer,
    existing: opt('--existing'), exclude: list('--exclude'), convention: opt('--convention'), count: opt('--count'), full: args.includes('--full'),
  }), null, 2));
}
