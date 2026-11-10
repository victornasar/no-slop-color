// Chooses the sites whose Awwwards thumbnails get a visual review.
// Group A: every Site of the Month or Site of the Year, 2018 to 2026.
// Group B: two-color Sites of the Day, randomly chosen per year (2011 to 2026), excluding group A.
// Output: research/data/review-selection.json
import fs from 'node:fs';
import path from 'node:path';
import { loadSites, rng, RESEARCH } from './lib/sotd.mjs';

const SEED = 20261110;
const B_YEARS = [2011, 2026];
const B_TOTAL = 120;

const sites = (await loadSites()).filter((s) => s.thumbnail);
const groupA = sites.filter((s) => s.tier !== 'day' && s.year >= 2018).sort((a, b) => a.date.localeCompare(b.date));
const inA = new Set(groupA.map((s) => s.id));

const years = [];
for (let y = B_YEARS[0]; y <= B_YEARS[1]; y++) years.push(y);
const base = Math.floor(B_TOTAL / years.length), extra = B_TOTAL - base * years.length;
const rand = rng(SEED);
const groupB = [];
years.forEach((y, i) => {
  const quota = base + (i < extra ? 1 : 0);
  const pool = sites.filter((s) => s.year === y && s.tier === 'day' && s.colors.length === 2 && !inA.has(s.id)).sort((a, b) => a.id.localeCompare(b.id));
  for (let k = pool.length - 1; k > 0; k--) {
    const j = Math.floor(rand() * (k + 1));
    [pool[k], pool[j]] = [pool[j], pool[k]];
  }
  groupB.push(...pool.slice(0, quota));
});

const pick = (s, group, n) => ({ n, group, id: s.id, name: s.name, url: s.url, awwwardsUrl: s.awwwardsUrl, thumbnail: s.thumbnail, date: s.date, year: s.year, tier: s.tier, categories: s.categories, colors: s.colors });
const all = [...groupA.map((s) => ['A', s]), ...groupB.map((s) => ['B', s])].map(([g, s], i) => pick(s, g, i + 1));
fs.writeFileSync(path.join(RESEARCH, 'data/review-selection.json'), JSON.stringify({
  seed: SEED,
  groups: {
    A: { rule: 'Every Site of the Month or Site of the Year dated 2018 or later, any number of recorded colors.', count: groupA.length },
    B: { rule: `Two-color Sites of the Day, ${base} or ${base + 1} per year from ${B_YEARS[0]} to ${B_YEARS[1]}, seeded shuffle, excluding group A.`, count: groupB.length },
  },
  sites: all,
}, null, 1) + '\n');
console.log(`A ${groupA.length} (two-color ${groupA.filter((s) => s.colors.length === 2).length}), B ${groupB.length}`);
