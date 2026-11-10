import { hueDiff } from './color.mjs';

// Measures on which two directions differ. The key color is the more chromatic of ground and figure;
// an Image-Led direction has no ground, so its key is the figure and ground measures are skipped.
// display-label is the derived eight-way name: it adds saturation (Vibrant or Muted) for one-chromatic pairs.
export function differences(a, b) {
  const chromatic = (s) => s && s.oklch.c > 0.04;
  const key = (c) => (c.ground && c.ground.oklch.c > c.figure.oklch.c ? c.ground : c.figure);
  const both = (f) => f(a) && f(b);
  const diff = [];
  if (a.primary.display_label !== b.primary.display_label) diff.push('display-label');
  if (a.primary.foundation !== b.primary.foundation) diff.push('foundation');
  if (a.primary.structure !== b.primary.structure) diff.push('structure');
  const ka = key(a), kb = key(b);
  if (chromatic(ka) && chromatic(kb) && hueDiff(ka.oklch.h, kb.oklch.h) >= 40) diff.push('key-hue');
  if (both((c) => chromatic(c.ground)) && hueDiff(a.ground.oklch.h, b.ground.oklch.h) >= 40) diff.push('ground-hue');
  if (chromatic(a.figure) && chromatic(b.figure) && hueDiff(a.figure.oklch.h, b.figure.oklch.h) >= 40) diff.push('figure-hue');
  if (Math.abs(a.figure.oklch.l - b.figure.oklch.l) >= 0.2) diff.push('figure-lightness');
  if (both((c) => c.ground) && Math.abs(a.ground.oklch.l - b.ground.oklch.l) >= 0.1) diff.push('ground-lightness');
  // Tint: the hue a neutral pair leans toward (C at least 0.01), or none. Pairs only.
  if (both((c) => c.ground)) {
    const tint = (c) => { const t = [c.ground, c.figure].filter((x) => x.oklch.c >= 0.01).sort((x, y) => y.oklch.c - x.oklch.c)[0]; return t ? t.oklch.h : null; };
    const ta = tint(a), tb = tint(b);
    if ((ta == null) !== (tb == null) || (ta != null && tb != null && hueDiff(ta, tb) >= 40)) diff.push('tint');
  }
  const xa = chromatic(a.optional_accent), xb = chromatic(b.optional_accent);
  if (xa !== xb || (xa && xb && hueDiff(a.optional_accent.oklch.h, b.optional_accent.oklch.h) >= 40)) diff.push('accent');
  return diff;
}
