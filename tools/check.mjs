// Runs the golden briefs against the repo engine and the bundled skill script.
// Fails if an expectation breaks or if the bundle disagrees with the repo.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { query, parseQueryArgs } from './query.mjs';

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
  if (e.foundation && r.directions.some((d) => d.twoAxis.foundation !== e.foundation)) fail(`a direction is not ${e.foundation}`);
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

if (failures.length) { console.error('\n' + failures.join('\n')); process.exit(1); }
console.log(`\nall ${briefs.length} golden briefs pass, and the bundle matches the repo engine`);
