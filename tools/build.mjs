// Builds curated sources into the files agents read, and stops on any rule failure.
//   node tools/build.mjs examples   examples/source/*.json (recommendations) -> examples/*.recommendation.json
//   node tools/build.mjs library    library/source/*.json (direction lists)   -> library/directions.json
//   node tools/build.mjs all        examples, library, bundled skill script and golden check
// Library sources may use the compact form (figure_use, button, accent_use, figure_role, accent_role);
// the build expands it into accessibility pairs and usage assignments. A source with kind "image-led"
// has no ground: a type color, a scrim and an optional accent, checked against the worst-case image.
// library/policy.json caps display labels whose growth is paused.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyPair, classifyImageLed } from './classify.mjs';
import { contrast, floor2, deltaEOK } from './lib/color.mjs';
import { differences } from './lib/diversity.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = process.argv[2] || 'examples';
const srcDir = path.join(REPO, target, 'source');
const DOMAINS = new Set(JSON.parse(fs.readFileSync(path.join(REPO, 'contexts/domains.json'), 'utf8')).domains.map((d) => d.id));
const REQUIRED = { 'body-text': 4.5, 'large-text': 3, 'ui-component': 3, decorative: null };
const STANDARD_NOTES = ['Contrast applies to the listed pairs only.', 'Do not rely on color alone for meaning (WCAG 1.4.1).'];

const fail = (where, msg) => { throw new Error(`${where}: ${msg}`); };
export const SCHEMA_VERSION = '0.3.0';

export function buildDirection(d) {
  if (d.kind === 'image-led') return buildImageLed(d);
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
  if (d.expect && d.expect !== cls.primary.display_label) fail(where, `expected display label ${d.expect}, classifier says ${cls.primary.display_label}`);

  const roles = { ground: cls.ground, figure: cls.figure, text: cls.derived.text_neutrals[0], 'text-muted': cls.derived.text_neutrals[1] };
  if (cls.optional_accent) roles.accent = cls.optional_accent;
  cls.derived.tints.forEach((s, i) => (roles[`tint-${i + 1}`] = s));
  cls.derived.shades.forEach((s, i) => (roles[`shade-${i + 1}`] = s));
  const role = (k) => roles[k] || fail(where, `role ${k} does not exist in this direction`);
  const ratio = (a, b) => contrast(role(a).hex, role(b).hex);

  let { accessibility, usage } = d;
  if (!accessibility) {
    // Compact form.
    const fill = d.button || 'figure';
    const label = ['ground', 'text', 'figure'].filter((k) => k !== fill).sort((a, b) => ratio(b, fill) - ratio(a, fill))[0];
    const pairs = [['text', 'ground', 'body-text'], ['text-muted', 'ground', 'body-text'], ['figure', 'ground', d.figure_use]];
    if (fill !== 'figure' || d.figure_use !== 'body-text') pairs.push([label, fill, 'body-text']);
    if (d.accent && d.accent_use) pairs.push(['accent', 'ground', d.accent_use]);
    accessibility = { pairs, notes: [...STANDARD_NOTES, ...(d.a11y_notes || [])] };
    const assignments = [
      { element: 'Page background', color: 'ground' },
      { element: 'Body text', color: 'text', on: 'ground' },
      d.figure_use === 'decorative' ? { element: d.figure_role, color: 'figure' } : { element: d.figure_role, color: 'figure', on: 'ground' },
      { element: 'Primary button', color: fill },
      { element: 'Button label', color: label, on: fill },
      ...(d.accent ? [d.accent_use === 'decorative' || !d.accent_use ? { element: d.accent_role, color: 'accent' } : { element: d.accent_role, color: 'accent', on: 'ground' }] : []),
      ...(d.extra_assignments || []),
    ];
    usage = { assignments, do: d.do, avoid: d.avoid };
  }

  const pairs = accessibility.pairs.map(([fg, bg, use]) => {
    const v = ratio(fg, bg), req = REQUIRED[use];
    if (!(use in REQUIRED)) fail(where, `unknown intended use ${use}`);
    if (req != null && v < req) fail(where, `${fg} on ${bg} is ${floor2(v)}:1, below ${req}:1 for ${use}`);
    return { foreground: fg, background: bg, intended_use: use, ratio: floor2(v), required: req, passes: req == null ? true : v >= req };
  });
  for (const a of usage.assignments) { role(a.color); if (a.on) role(a.on); }
  const fill = (text) => text.replace(/\{ratio:([a-z0-9-]+)\/([a-z0-9-]+)\}/g, (_, a, b) => `${floor2(ratio(a, b))}:1`).replace(/\{(\w+)\}/g, (m, k) => (k in cls.measurements ? String(cls.measurements[k]) : m));
  const reasoning = d.reasoning.map((x) => ({ ...x, claim: fill(x.claim) }));
  for (const x of reasoning) if (/\{[^}]+\}/.test(x.claim)) fail(where, `unfilled placeholder in "${x.claim}"`);

  const out = { id: d.id, name: d.name };
  for (const k of ['status', 'curation', 'use_for', 'choose_if']) if (d[k] !== undefined) out[k] = d[k];
  if (d.watch_out !== undefined) out.watch_out = fill(d.watch_out);
  Object.assign(out, { classification: cls, reasoning, usage, accessibility: { standard: 'WCAG 2.2 contrast computed from sRGB HEX', pairs, notes: accessibility.notes } });
  return out;
}

function buildImageLed(d) {
  const where = d.id;
  for (const id of d.industry || []) if (!DOMAINS.has(id)) fail(where, `unknown industry id ${id}`);
  if (d.ground) fail(where, 'an Image-Led direction has no ground');
  const cls = classifyImageLed({
    figure: d.figure.oklch, scrim: { color: d.scrim.oklch, opacity: d.scrim.opacity }, accent: d.accent?.oklch,
    names: { figure: d.figure.name, scrim: d.scrim.name, accent: d.accent?.name },
    industry: d.industry, judged: d.judged, summary: d.summary, imagery: d.imagery,
  });
  for (const s of [cls.figure, cls.scrim, cls.optional_accent].filter(Boolean)) {
    if (s.srgb.status !== 'in-gamut') fail(where, `${s.name} is outside sRGB; curated colors must be in gamut`);
  }
  if (d.expect && d.expect !== cls.primary.display_label) fail(where, `expected display label ${d.expect}, classifier says ${cls.primary.display_label}`);
  const roles = { figure: cls.figure, scrim: cls.scrim, 'imagery-worst': cls.imagery.worst_case };
  if (cls.optional_accent) roles.accent = cls.optional_accent;
  const role = (k) => roles[k] || fail(where, `role ${k} does not exist in this direction`);
  const ratio = (a, b) => contrast(role(a).hex, role(b).hex);
  const accessibility = {
    pairs: [['figure', 'imagery-worst', 'large-text'], ['figure', 'scrim', 'body-text'], ...(d.accent && d.accent_use ? [['accent', 'scrim', d.accent_use]] : [])],
    notes: [...STANDARD_NOTES, 'imagery-worst is the scrim at its opacity over pure white or pure black, whichever gives lower contrast, so the ratio holds on any image.', ...(d.a11y_notes || [])],
  };
  const usage = {
    assignments: [
      { element: 'Headlines and display type on imagery', color: 'figure', on: 'imagery-worst' },
      { element: 'Overlay behind type on imagery', color: 'scrim' },
      { element: 'Text panels and forms', color: 'scrim' },
      { element: 'Body text on panels', color: 'figure', on: 'scrim' },
      ...(d.accent ? [d.accent_use && d.accent_use !== 'decorative' ? { element: d.accent_role, color: 'accent', on: 'scrim' } : { element: d.accent_role, color: 'accent' }] : []),
    ],
    do: d.do, avoid: d.avoid,
  };
  const pairs = accessibility.pairs.map(([fg, bg, use]) => {
    const v = ratio(fg, bg), req = REQUIRED[use];
    if (req != null && v < req) fail(where, `${fg} on ${bg} is ${floor2(v)}:1, below ${req}:1 for ${use}`);
    return { foreground: fg, background: bg, intended_use: use, ratio: floor2(v), required: req, passes: req == null ? true : v >= req };
  });
  const fill = (text) => text.replace(/\{ratio:([a-z0-9-]+)\/([a-z0-9-]+)\}/g, (_, a, b) => `${floor2(ratio(a, b))}:1`);
  const reasoning = d.reasoning.map((x) => ({ ...x, claim: fill(x.claim) }));
  for (const x of reasoning) if (/\{[^}]+\}/.test(x.claim)) fail(where, `unfilled placeholder in "${x.claim}"`);
  const out = { id: d.id, name: d.name };
  for (const k of ['status', 'curation', 'use_for', 'choose_if']) if (d[k] !== undefined) out[k] = d[k];
  if (d.watch_out !== undefined) out.watch_out = fill(d.watch_out);
  Object.assign(out, { classification: cls, reasoning, usage, accessibility: { standard: 'WCAG 2.2 contrast computed from sRGB HEX', pairs, notes: accessibility.notes } });
  return out;
}

const axes = (c) => `${c.primary.foundation ?? 'No foundation'} / ${c.primary.structure}`;
function diversity(ds) {
  const lch = (s) => [s.oklch.l, s.oklch.c, s.oklch.h];
  const dE = (a, b) => (a && b ? +deltaEOK(lch(a), lch(b)).toFixed(3) : null);
  const out = [];
  for (let i = 0; i < ds.length; i++) for (let j = i + 1; j < ds.length; j++) {
    const a = ds[i].classification, b = ds[j].classification, diff = differences(a, b);
    if (diff.length < 2) fail(`${ds[i].id} vs ${ds[j].id}`, `directions differ on only ${diff.join(', ') || 'nothing'}`);
    out.push({ a: ds[i].id, b: ds[j].id, groundDeltaEOK: dE(a.ground, b.ground), figureDeltaEOK: dE(a.figure, b.figure), differsOn: diff });
  }
  return { primariesRepresented: [...new Set(ds.map((d) => axes(d.classification)))], displayLabelsRepresented: [...new Set(ds.map((d) => d.classification.primary.display_label))], pairs: out };
}

const line = (d) => {
  const c = d.classification;
  return `  ${d.name.padEnd(22)} ${axes(c).padEnd(26)} ${c.primary.display_label.padEnd(25)} ${c.primary.confidence.padEnd(6)} ${c.measurements.wcag_ratio}:1  ${Object.values(c.secondary).flat().join(', ')}${c.flags.length ? '  [' + c.flags.join('; ') + ']' : ''}`;
};

if (process.argv[1] === fileURLToPath(import.meta.url) && target === 'all') {
  // Everything a release needs: examples, library, the bundled skill script, then the golden check.
  const { spawnSync } = await import('node:child_process');
  const steps = [[fileURLToPath(import.meta.url), 'examples'], [fileURLToPath(import.meta.url), 'library'], [path.join(REPO, 'tools/bundle.mjs')], [path.join(REPO, 'tools/check.mjs')]];
  for (const step of steps) {
    const r = spawnSync(process.execPath, step, { stdio: 'inherit' });
    if (r.status !== 0) process.exit(r.status ?? 1);
  }
} else if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.json')).sort();
  if (target === 'library') {
    const directions = [], errors = [];
    for (const file of files) {
      const src = JSON.parse(fs.readFileSync(path.join(srcDir, file), 'utf8'));
      for (const d of src.directions) {
        try { directions.push(buildDirection({ status: 'provisional', ...d })); } catch (e) { errors.push(e.message); }
      }
    }
    if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
    const ids = new Set();
    for (const d of directions) { if (ids.has(d.id)) fail(d.id, 'duplicate id'); ids.add(d.id); }
    const same = [];
    for (let i = 0; i < directions.length; i++) for (let j = i + 1; j < directions.length; j++) {
      if (differences(directions[i].classification, directions[j].classification).length === 0) same.push(`${directions[i].id} vs ${directions[j].id}: identical on every diversity measure`);
    }
    if (same.length) { console.error(same.join('\n')); process.exit(1); }
    const coverage = {};
    for (const d of directions) for (const id of d.classification.industry) coverage[id] = (coverage[id] || 0) + 1;
    const count = (f) => directions.reduce((a, d) => { const k = f(d.classification.primary); a[k] = (a[k] || 0) + 1; return a; }, {});
    const primaries = { foundation: count((p) => p.foundation ?? 'none'), structure: count((p) => p.structure), display_label: count((p) => p.display_label) };
    // Paused display labels (library/policy.json): the build stops if one grows past its cap.
    const policy = JSON.parse(fs.readFileSync(path.join(REPO, 'library/policy.json'), 'utf8'));
    for (const p of policy.paused) {
      const n = primaries.display_label[p.display_label] || 0;
      if (n > p.max) { console.error(`${p.display_label}: ${n} directions, above the paused cap of ${p.max}. ${p.reason}`); process.exit(1); }
    }
    const out = { $schema: '../schemas/library.schema.json', schemaVersion: SCHEMA_VERSION, status: 'provisional', count: directions.length, primaries, coverage, directions };
    fs.writeFileSync(path.join(REPO, 'library/directions.json'), JSON.stringify(out, null, 2) + '\n');
    console.log(`built library/directions.json: ${directions.length} directions`);
    console.log('  primaries', JSON.stringify(primaries));
    for (const d of directions) console.log(line(d));
  } else {
    for (const file of files) {
      const src = JSON.parse(fs.readFileSync(path.join(srcDir, file), 'utf8'));
      for (const id of src.context.domains) if (!DOMAINS.has(id)) fail(file, `unknown domain ${id}`);
      const directions = src.directions.map(buildDirection);
      const out = { $schema: '../schemas/recommendation.schema.json', schemaVersion: SCHEMA_VERSION, fixture: true, request: src.request, context: src.context, signals: src.signals, directions, diversity: diversity(directions), openQuestions: src.openQuestions };
      const dest = path.join(REPO, target, file.replace('.json', '.recommendation.json'));
      fs.writeFileSync(dest, JSON.stringify(out, null, 2) + '\n');
      console.log(`built ${path.relative(REPO, dest)}`);
      for (const d of directions) console.log(line(d));
    }
  }
}
