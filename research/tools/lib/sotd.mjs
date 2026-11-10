// Loads the pinned SOTD Index data file, fetching it on first use and verifying its checksum.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const RESEARCH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SOURCE = JSON.parse(fs.readFileSync(path.join(RESEARCH, 'data/source.json'), 'utf8'));
const LOCAL = path.join(RESEARCH, '.cache/src/sotd.js');

export async function loadSites() {
  if (!fs.existsSync(LOCAL)) {
    fs.mkdirSync(path.dirname(LOCAL), { recursive: true });
    const r = await fetch(SOURCE.fetchUrl);
    fs.writeFileSync(LOCAL, Buffer.from(await r.arrayBuffer()));
  }
  const buf = fs.readFileSync(LOCAL);
  const sha = crypto.createHash('sha256').update(buf).digest('hex');
  if (sha !== SOURCE.sha256) throw new Error(`sotd.js checksum ${sha} does not match pinned ${SOURCE.sha256}`);
  const ctx = { window: {} };
  vm.runInNewContext(buf.toString('utf8'), ctx);
  return ctx.window.SOTD.sites.map((s) => {
    const f = s.f || [];
    const awards = f.filter((x) => x.startsWith('award:')).map((x) => x.slice(6));
    return {
      id: s.s,
      name: s.t,
      url: s.u || null,
      awwwardsUrl: `https://www.awwwards.com/sites/${encodeURIComponent(s.s)}`,
      thumbnail: s.i || null,
      date: s.d,
      year: Number(s.d.slice(0, 4)),
      tier: awards.includes('site-of-the-year') ? 'year' : awards.includes('site-of-the-month') ? 'month' : 'day',
      awards,
      categories: f.filter((x) => x.startsWith('cat:')).map((x) => x.slice(4)),
      colors: (s.c || []).map(normHex),
    };
  });
}

function normHex(h) {
  let s = h.replace('#', '').toUpperCase();
  if (s.length === 3) s = [...s].map((c) => c + c).join('');
  return '#' + s;
}

export function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
