// Turns one library direction into tokens an agent can put into a codebase: CSS custom properties,
// Tailwind v4 @theme, or W3C design-tokens JSON. It prints; it never writes to a project.
//
// node tools/apply.mjs <direction-id> [--format css|tailwind|tokens] [--prefix color]
import { fileURLToPath } from 'node:url';
import { data } from './lib/data.mjs';

export const FORMATS = ['css', 'tailwind', 'tokens'];

export function tokensOf(d) {
  const c = d.classification;
  if (c.kind === 'image-led') {
    // No ground: the type color, the scrim (with its opacity) and an optional accent.
    const t = [
      ['figure', c.figure, d.usage.assignments.find((a) => a.color === 'figure')?.element || 'Type set on imagery'],
      ['scrim', c.scrim, `Overlay behind type on imagery, at ${Math.round(c.scrim.opacity * 100)}% opacity; solid for text panels`],
    ];
    if (c.optional_accent) t.push(['accent', c.optional_accent, d.usage.assignments.find((a) => a.color === 'accent')?.element || 'Small accents']);
    return t.map(([role, s, use]) => ({ role, name: s.name || null, hex: s.hex, oklch: s.oklch, use, ...(role === 'scrim' ? { opacity: c.scrim.opacity } : {}) }));
  }
  const t = [
    ['ground', c.ground, 'Page background and the largest surfaces'],
    ['figure', c.figure, d.usage.assignments.find((a) => a.color === 'figure' && a.element !== 'Primary button')?.element || 'The identity color'],
  ];
  if (c.optional_accent) t.push(['accent', c.optional_accent, d.usage.assignments.find((a) => a.color === 'accent')?.element || 'Small accents']);
  t.push(['text', c.derived.text_neutrals[0], 'Body text on the ground']);
  t.push(['text-muted', c.derived.text_neutrals[1], 'Secondary text on the ground']);
  c.derived.tints.forEach((s, i) => t.push([`tint-${i + 1}`, s, `Lighter step ${i + 1} of the ${c.ground.oklch.c > c.figure.oklch.c ? 'ground' : 'figure'}`]));
  c.derived.shades.forEach((s, i) => t.push([`shade-${i + 1}`, s, `Darker step ${i + 1} of the ${c.ground.oklch.c > c.figure.oklch.c ? 'ground' : 'figure'}`]));
  return t.map(([role, s, use]) => ({ role, name: s.name || null, hex: s.hex, oklch: s.oklch, use }));
}

const css = (o) => `oklch(${o.l} ${o.c} ${o.h ?? 'none'})`;

export function apply(id, format = 'css', prefix = 'color') {
  const d = data('library').directions.find((x) => x.id === id || x.id === `lib.${id}`);
  if (!d) throw new Error(`No direction with id ${id}`);
  return applyDirection(d, format, prefix);
}

export function applyDirection(d, format = 'css', prefix = 'color') {
  if (!FORMATS.includes(format)) throw new Error(`--format must be one of ${FORMATS.join(', ')}`);
  const tokens = tokensOf(d);
  const roles = d.usage.assignments.map((a) => ({ element: a.element, token: `--${prefix}-${a.color}`, on: a.on ? `--${prefix}-${a.on}` : null }));
  const contrast = d.accessibility.pairs.map((p) => ({ foreground: `--${prefix}-${p.foreground}`, background: `--${prefix}-${p.background}`, use: p.intended_use, ratio: p.ratio, required: p.required }));
  const p = d.classification.primary;
  const header = `no-slop-color: ${d.name} (${d.id}) · ${p.display_label} · ${p.foundation ? `${p.foundation} foundation · ${p.structure} structure` : 'no ground: set the figure on imagery over the scrim'}`;
  // The scrim keeps its opacity: CSS and Tailwind get an alpha channel, tokens get an alpha component.
  const value = (t) => (t.opacity != null ? css(t.oklch).replace(')', ` / ${t.opacity})`) : css(t.oklch));

  let text;
  if (format === 'css') {
    const lines = tokens.flatMap((t) => [`  --${prefix}-${t.role}: ${t.hex}${t.opacity != null ? Math.round(t.opacity * 255).toString(16).padStart(2, '0').toUpperCase() : ''};`, `  --${prefix}-${t.role}: ${value(t)};${t.use ? ` /* ${t.use} */` : ''}`]);
    text = `/* ${header} */\n/* Each token is declared twice: HEX as a fallback, then OKLCH for browsers that support it. */\n:root {\n${lines.join('\n')}\n}\n`;
  } else if (format === 'tailwind') {
    text = `/* ${header} */\n@theme {\n${tokens.map((t) => `  --color-${t.role}: ${value(t)};${t.use ? ` /* ${t.use}; HEX ${t.hex} */` : ''}`).join('\n')}\n}\n`;
  } else {
    const out = { $description: header, [prefix]: {} };
    for (const t of tokens) out[prefix][t.role] = { $type: 'color', $value: { colorSpace: 'oklch', components: [t.oklch.l, t.oklch.c, t.oklch.h ?? 'none'], ...(t.opacity != null ? { alpha: t.opacity } : {}), hex: t.hex }, $description: t.use };
    text = JSON.stringify(out, null, 2) + '\n';
  }
  return { id: d.id, name: d.name, format, text, tokens, roles, contrast, do: d.usage.do, avoid: d.usage.avoid, watchOut: d.watch_out, accessibilityNotes: d.accessibility.notes };
}

// cli-start
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (k, v) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : v; };
  try { console.log(JSON.stringify(apply(args[0], opt('--format', 'css'), opt('--prefix', 'color')), null, 2)); }
  catch (e) { console.error(e.message); process.exit(1); }
}
// cli-end
