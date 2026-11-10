// Runs the golden briefs against the repo engine and the bundled skill script.
// Fails if an expectation breaks or if the bundle disagrees with the repo.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { query, parseQueryArgs, tieBreak, TIE_CONTRAST } from './query.mjs';
import { classifyPair } from './classify.mjs';
import { buildDirection } from './build.mjs';
import { applyDirection, FORMATS } from './apply.mjs';
import { data } from './lib/data.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUNDLE = path.join(REPO, 'skills/find-color/scripts/find-color.mjs');
const { briefs } = JSON.parse(fs.readFileSync(path.join(REPO, 'tools/golden.json'), 'utf8'));
const failures = [];

for (const b of briefs) {
  const r = query(parseQueryArgs(b.args));
  const ids = r.directions.map((d) => d.id);
  const e = b.expect, fail = (m) => failures.push(`${b.name}: ${m}`);
  if (e.pick && r.pick?.id !== e.pick) fail(`pick is ${r.pick?.id}, expected ${e.pick}`);
  for (const id of e.include || []) if (!ids.includes(id)) fail(`missing ${id}`);
  for (const id of e.exclude || []) if (ids.includes(id)) fail(`should not include ${id}`);
  if (e.count && ids.length !== e.count) fail(`returned ${ids.length}, expected ${e.count}`);
  if (e.foundation && r.directions.some((d) => d.primary.foundation !== e.foundation)) fail(`a direction is not ${e.foundation}`);
  if (e.allExact && r.directions.some((d) => d.match !== 'exact')) fail('a direction is not curated for these domains');
  if (e.noteContains && !r.notes.some((n) => n.includes(e.noteContains))) fail(`no note containing "${e.noteContains}"`);
  if (e.pickFollows && !r.directions.find((d) => d.id === r.pick?.id)?.follows.some((f) => f.id === e.pickFollows)) fail(`pick does not follow ${e.pickFollows}`);
  for (const [conv, max] of Object.entries(e.maxFollowers || {})) {
    const n = r.directions.filter((d) => d.follows.some((f) => f.id === conv)).length;
    if (n > max) fail(`${n} directions follow ${conv}, at most ${max} allowed`);
  }
  if (r.pairwise.some((p) => p.differsOn.length < 1)) fail('two directions are identical on every measure');

  const run = spawnSync(process.execPath, [BUNDLE, 'recommend', ...b.args], { encoding: 'utf8' });
  if (run.status !== 0) fail(`bundle exited ${run.status}: ${run.stderr.trim()}`);
  else if (JSON.stringify(JSON.parse(run.stdout)) !== JSON.stringify(r)) fail('bundle output differs from the repo engine; run node tools/bundle.mjs');
  console.log(`${failures.some((f) => f.startsWith(b.name + ':')) ? 'FAIL' : 'ok  '} ${b.name}: pick ${r.pick?.name} · ${r.directions.map((d) => d.name).join(', ')}`);
}

for (const fmt of ['css', 'tailwind', 'tokens']) {
  const run = spawnSync(process.execPath, [BUNDLE, 'apply', 'lib.parchment-and-ink', '--format', fmt, '--text'], { encoding: 'utf8' });
  if (run.status !== 0 || !/ground/.test(run.stdout)) failures.push(`apply ${fmt}: failed`);
}

// Image-Led path: a direction with no ground must build, rank, render and apply without a pair.
// It runs on a fixture, because the library holds no Image-Led directions yet.
{
  const fx = buildDirection(JSON.parse(fs.readFileSync(path.join(REPO, 'tools/fixtures/image-led.json'), 'utf8')).direction);
  const fail = (m) => failures.push(`image-led fixture: ${m}`);
  const c = fx.classification;
  if (c.kind !== 'image-led' || c.ground !== undefined || c.primary.foundation !== null || c.primary.structure !== 'Image-Led') fail('classification is not a groundless Image-Led');
  const roles = [...fx.usage.assignments.flatMap((a) => [a.color, a.on]), ...fx.accessibility.pairs.flatMap((p) => [p.foreground, p.background])];
  if (roles.includes('ground')) fail('a usage or accessibility entry refers to a ground');
  const lib = [...data('library').directions, fx];
  const r = query(parseQueryArgs(['--domains', 'photography']), lib);
  const card = r.directions.find((d) => d.id === fx.id);
  if (!card) fail('not returned for its own domain');
  else if (card.kind !== 'image-led' || card.ground !== null || !card.scrim || card.keyNumbers.typeOnWorstCaseImagery == null) fail('card is not an Image-Led card');
  if (r.pairwise.some((p) => p.differsOn.length < 1)) fail('identical to another returned direction');
  const dark = query(parseQueryArgs(['--domains', 'photography', '--foundation', 'dark']), lib);
  if (dark.excluded[fx.id] !== 'Image-Led has no foundation') fail('not excluded by a foundation filter');
  for (const fmt of FORMATS) {
    const a = applyDirection(fx, fmt);
    if (!a.tokens.some((t) => t.role === 'scrim') || a.tokens.some((t) => t.role === 'ground') || /-ground:|"ground":/.test(a.text)) fail(`apply ${fmt} does not give a scrim token without a ground token`);
  }
  console.log(`${failures.some((f) => f.startsWith('image-led')) ? 'FAIL' : 'ok  '} image-led fixture: builds, ranks, renders and applies with no ground (type ${c.measurements.wcag_ratio}:1 on worst-case imagery)`);
}

// Default-pick tie-break: contrast only gates eligibility and breaks the last tie (Phase 2 follow-up).
{
  const fail = (m) => failures.push(`tie-break: ${m}`);
  const cand = (id, ratio, industry, matched) => ({ d: { id, classification: { industry, measurements: { wcag_ratio: ratio } } }, matched, match: matched.length ? 'exact' : 'general' });
  const cases = [
    ['21:1 is no advantage when fit and usage decide', [cand('a.stark', 21, ['x', 'p', 'q', 'r', 's'], ['p']), cand('b.fit', 11, ['x', 'p', 'q', 'r'], ['p'])], ['p'], 'b.fit', 'usage'],
    ['closer curated position wins', [cand('a.stark', 21, ['p', 'q'], ['p']), cand('b.listed-later', 12, ['q', 'p'], ['p'])], ['p'], 'a.stark', 'fit'],
    ['fit is checked before usage', [cand('a.broad', 9, ['p', 'q', 'r', 's', 't'], ['p']), cand('b.narrow', 9, ['q', 'p'], ['p'])], ['p'], 'a.broad', 'fit'],
    ['a candidate below AAA cannot win against one above', [cand('a.low', TIE_CONTRAST - 0.02, ['p'], ['p']), cand('b.high', 12, ['q', 'r', 's', 'p'], ['p'])], ['p'], 'b.high', 'eligibility'],
    ['below AAA everywhere, the highest contrast wins', [cand('a.low', 4.5, ['p'], ['p']), cand('b.lower', 3.1, ['p'], ['p'])], ['p'], 'a.low', 'contrast'],
    ['uncurated candidates fall back to contrast, not usage', [cand('a.broad', 15, ['q', 'r', 's'], []), cand('b.narrow', 10, ['q'], [])], ['p'], 'a.broad', 'fallback'],
    ['a full tie is stable by contrast, then id', [cand('b.same', 10, ['p'], ['p']), cand('a.same', 10, ['p'], ['p'])], ['p'], 'a.same', 'fallback'],
  ];
  for (const [name, tied, domains, want, by] of cases) {
    const got = tieBreak(tied, domains);
    if (got.pick.d.id !== want || got.decidedBy !== by) fail(`${name}: got ${got.pick.d.id} by ${got.decidedBy}, expected ${want} by ${by}`);
  }
  console.log(`${failures.some((f) => f.startsWith('tie-break')) ? 'FAIL' : 'ok  '} tie-break: ${cases.length} cases`);
}

// Near-floor flags: Vibrant needs relative chroma and C both above their floors (Phase 2 errata 2).
{
  const fail = (m) => failures.push(`near-floor flag: ${m}`);
  const flagged = (figure) => classifyPair({ ground: [0.97, 0.006, 240], figure, area: '85/15' }).flags.filter((f) => f.includes('vibrant'));
  // Cabin Navy's figure: relative chroma clears its floor, C 0.065 is under 0.08, so C decides and is flagged.
  if (!flagged([0.3, 0.065, 255]).some((f) => f.includes('vibrant chroma floor'))) fail('Cabin Navy figure (C 0.065) is not flagged');
  // Far from both floors: no flag.
  if (flagged([0.3, 0.02, 255]).length) fail('a near-neutral figure is flagged');
  if (flagged([0.6, 0.2, 30]).length) fail('a clearly vibrant figure is flagged');
  console.log(`${failures.some((f) => f.startsWith('near-floor')) ? 'FAIL' : 'ok  '} near-floor flag: absolute chroma checked when relative chroma clears its floor`);
}

if (failures.length) { console.error('\n' + failures.join('\n')); process.exit(1); }
console.log(`\nall ${briefs.length} golden briefs pass, and the bundle matches the repo engine`);
