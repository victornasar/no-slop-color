// Builds curated sources into the files agents read, and stops on any rule failure.
// Each source in <dir>/source/*.json is a recommendation whose directions are authored pairs.
// Usage: node tools/build.mjs [examples]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyPair } from './classify.mjs';
import { contrast, floor2, hueDiff, deltaEOK } from './lib/color.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = process.argv[2] || 'examples';
const srcDir = path.join(REPO, target, 'source');
const DOMAINS = new Set(JSON.parse(fs.readFileSync(path.join(REPO, 'contexts/domains.json'), 'utf8')).domains.map((d) => d.id));
const REQUIRED = { 'body-text': 4.5, 'large-text': 3, 'ui-component': 3, decorative: null };

const fail = (where, msg) => { throw new Error(`${where}: ${msg}`); };

function buildDirection(d) {
  const where = d.id;
  for (const id of d.industry || []) if (!DOMAINS.has(id)) fail(where, `unknown industry id ${id}`);
  const cls = classifyPair({
    ground: d.ground.oklch, figure: d.figure.oklch, accent: d.accent?.oklch, area: d.area,
    names: { ground: d.ground.name, figure: d.figure.name, accent: d.accent?.name },
    industry: d.industry, judged: d.judged, summary: d.summary,
  });
  for (const s of [cls.ground, cls.figure, cls.optional_accent].filter(Boolean)) {
    if (s.srgb.status !== 'in-gamut') fail(where, `${s.name} is outside sRGB; curated pair colors must be in gamut`);
  }

  const roles = { ground: cls.ground, figure: cls.figure, text: cls.derived.text_neutrals[0], 'text-muted': cls.derived.text_neutrals[1] };
  if (cls.optional_accent) roles.accent = cls.optional_accent;
  cls.derived.tints.forEach((s, i) => (roles[`tint-${i + 1}`] = s));
  cls.derived.shades.forEach((s, i) => (roles[`shade-${i + 1}`] = s));
  const role = (k) => roles[k] || fail(where, `role ${k} does not exist in this direction`);
  const ratio = (a, b) => contrast(role(a).hex, role(b).hex);

  const pairs = d.accessibility.pairs.map(([fg, bg, use]) => {
    const v = ratio(fg, bg), req = REQUIRED[use];
    if (req != null && v < req) fail(where, `${fg} on ${bg} is ${floor2(v)}:1, below ${req}:1 for ${use}`);
    return { foreground: fg, background: bg, intended_use: use, ratio: floor2(v), required: req, passes: req == null ? true : v >= req };
  });
  for (const a of d.usage.assignments) { role(a.color); if (a.on) role(a.on); }
  const fill = (text) => text.replace(/\{ratio:([a-z0-9-]+)\/([a-z0-9-]+)\}/g, (_, a, b) => `${floor2(ratio(a, b))}:1`).replace(/\{(\w+)\}/g, (m, k) => (k in cls.measurements ? String(cls.measurements[k]) : m));
  const reasoning = d.reasoning.map((x) => ({ ...x, claim: fill(x.claim) }));
  for (const x of reasoning) if (/\{[^}]+\}/.test(x.claim)) fail(where, `unfilled placeholder in "${x.claim}"`);

  return { id: d.id, name: d.name, classification: cls, reasoning, usage: d.usage, accessibility: { standard: 'WCAG 2.2 contrast computed from sRGB HEX', pairs, notes: d.accessibility.notes } };
}

function diversity(ds) {
  const lch = (s) => [s.oklch.l, s.oklch.c, s.oklch.h];
  const out = [];
  for (let i = 0; i < ds.length; i++) for (let j = i + 1; j < ds.length; j++) {
    const a = ds[i].classification, b = ds[j].classification, diff = [];
    if (a.primary.label !== b.primary.label) diff.push('primary');
    if (a.alternative_two_axis.foundation !== b.alternative_two_axis.foundation) diff.push('foundation');
    if (a.alternative_two_axis.structure !== b.alternative_two_axis.structure) diff.push('structure');
    if (a.figure.oklch.c > 0.04 && b.figure.oklch.c > 0.04 && hueDiff(a.figure.oklch.h, b.figure.oklch.h) >= 40) diff.push('figure-hue');
    if (Math.abs(a.figure.oklch.l - b.figure.oklch.l) >= 0.2) diff.push('figure-lightness');
    if (diff.length < 2) fail(`${ds[i].id} vs ${ds[j].id}`, `directions differ on only ${diff.join(', ') || 'nothing'}`);
    out.push({ a: ds[i].id, b: ds[j].id, groundDeltaEOK: +deltaEOK(lch(a.ground), lch(b.ground)).toFixed(3), figureDeltaEOK: +deltaEOK(lch(a.figure), lch(b.figure)).toFixed(3), differsOn: diff });
  }
  return { primariesRepresented: [...new Set(ds.map((d) => d.classification.primary.label))], pairs: out };
}

for (const file of fs.readdirSync(srcDir).filter((f) => f.endsWith('.json')).sort()) {
  const src = JSON.parse(fs.readFileSync(path.join(srcDir, file), 'utf8'));
  for (const id of src.context.domains) if (!DOMAINS.has(id)) fail(file, `unknown domain ${id}`);
  const directions = src.directions.map(buildDirection);
  const out = { $schema: '../schemas/recommendation.schema.json', schemaVersion: '0.2.0', fixture: true, request: src.request, context: src.context, signals: src.signals, directions, diversity: diversity(directions), openQuestions: src.openQuestions };
  const dest = path.join(REPO, target, file.replace('.json', '.recommendation.json'));
  fs.writeFileSync(dest, JSON.stringify(out, null, 2) + '\n');
  console.log(`built ${path.relative(REPO, dest)}`);
  for (const d of directions) {
    const c = d.classification;
    console.log(`  ${d.name.padEnd(16)} ${c.primary.label.padEnd(25)} ${c.alternative_two_axis.foundation}/${c.alternative_two_axis.structure.padEnd(13)} ${c.primary.confidence.padEnd(6)} ${Object.values(c.secondary).flat().join(', ')}${c.flags.length ? '  [' + c.flags.join('; ') + ']' : ''}`);
  }
}
