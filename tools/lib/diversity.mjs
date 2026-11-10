import { hueDiff } from './color.mjs';

// Measures on which two directions differ. The key color is the more chromatic of ground and figure.
export function differences(a, b) {
  const chromatic = (s) => s && s.oklch.c > 0.04;
  const key = (c) => (c.ground.oklch.c > c.figure.oklch.c ? c.ground : c.figure);
  const diff = [];
  if (a.primary.label !== b.primary.label) diff.push('primary');
  if (a.alternative_two_axis.foundation !== b.alternative_two_axis.foundation) diff.push('foundation');
  if (a.alternative_two_axis.structure !== b.alternative_two_axis.structure) diff.push('structure');
  const ka = key(a), kb = key(b);
  if (chromatic(ka) && chromatic(kb) && hueDiff(ka.oklch.h, kb.oklch.h) >= 40) diff.push('key-hue');
  if (chromatic(a.ground) && chromatic(b.ground) && hueDiff(a.ground.oklch.h, b.ground.oklch.h) >= 40) diff.push('ground-hue');
  if (chromatic(a.figure) && chromatic(b.figure) && hueDiff(a.figure.oklch.h, b.figure.oklch.h) >= 40) diff.push('figure-hue');
  if (Math.abs(a.figure.oklch.l - b.figure.oklch.l) >= 0.2) diff.push('figure-lightness');
  if (Math.abs(a.ground.oklch.l - b.ground.oklch.l) >= 0.1) diff.push('ground-lightness');
  // Tint: the hue a neutral pair leans toward (C at least 0.01), or none.
  const tint = (c) => { const t = [c.ground, c.figure].filter((x) => x.oklch.c >= 0.01).sort((x, y) => y.oklch.c - x.oklch.c)[0]; return t ? t.oklch.h : null; };
  const ta = tint(a), tb = tint(b);
  if ((ta == null) !== (tb == null) || (ta != null && tb != null && hueDiff(ta, tb) >= 40)) diff.push('tint');
  const xa = chromatic(a.optional_accent), xb = chromatic(b.optional_accent);
  if (xa !== xb || (xa && xb && hueDiff(a.optional_accent.oklch.h, b.optional_accent.oklch.h) >= 40)) diff.push('accent');
  return diff;
}
