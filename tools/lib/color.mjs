// OKLCH, sRGB and WCAG contrast utilities.
// Matrices from Björn Ottosson's Oklab reference; gamut mapping follows CSS Color 4 (binary search with local MINDE).

export const LINEAR = new Float64Array(256).map((_, i) => {
  const c = i / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
});

const gam = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function linearToOklab(r, g, b) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function oklabToLinear(L, a, b) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

export const POWERLESS = 0.000004;

export function labToLch(L, a, b) {
  const C = Math.hypot(a, b);
  if (C <= POWERLESS) return [L, 0, null];
  return [L, C, ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360];
}

export function lchToLab(L, C, h) {
  const r = ((h ?? 0) * Math.PI) / 180;
  return [L, C * Math.cos(r), C * Math.sin(r)];
}

export const rgb8ToOklab = (r, g, b) => linearToOklab(LINEAR[r], LINEAR[g], LINEAR[b]);

export function inSrgb(L, C, h, eps = 0) {
  return oklabToLinear(...lchToLab(L, C, h)).every((x) => x >= -eps && x <= 1 + eps);
}

export function toRgb8(L, C, h) {
  return oklabToLinear(...lchToLab(L, C, h)).map((x) => Math.round(Math.max(0, Math.min(1, gam(Math.max(0, Math.min(1, x))))) * 255));
}

export const rgbToHex = (rgb) => '#' + rgb.map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase();
export const toHex = (L, C, h) => rgbToHex(toRgb8(L, C, h));

export function hexToRgb(hex) {
  let s = hex.replace('#', '');
  if (s.length === 3) s = [...s].map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
}

export const hexToOklch = (hex) => labToLch(...rgb8ToOklab(...hexToRgb(hex)));

export function deltaEOK(x, y) {
  const p = lchToLab(...x), q = lchToLab(...y);
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

function clipLch(L, C, h) {
  const rgb = oklabToLinear(...lchToLab(L, C, h)).map((x) => Math.max(0, Math.min(1, x)));
  return labToLch(...linearToOklab(...rgb));
}

export function gamutMap(L, C, h) {
  if (L >= 1) return [1, 0, null];
  if (L <= 0) return [0, 0, null];
  if (inSrgb(L, C, h)) return [L, C, h];
  const JND = 0.02, EPS = 0.0001;
  let cur = [L, C, h], clipped = clipLch(...cur);
  if (deltaEOK(clipped, cur) < JND) return clipped;
  let lo = 0, hi = C, minInGamut = true;
  while (hi - lo > EPS) {
    const mid = (lo + hi) / 2;
    cur = [L, mid, h];
    if (minInGamut && inSrgb(...cur)) { lo = mid; continue; }
    clipped = clipLch(...cur);
    const e = deltaEOK(clipped, cur);
    if (e < JND) {
      if (JND - e < EPS) return clipped;
      minInGamut = false; lo = mid;
    } else hi = mid;
  }
  return clipLch(...cur);
}

const cmaxCache = new Map();
export function cmax(L, h) {
  if (h == null) return 0;
  const key = `${L.toFixed(3)}|${h.toFixed(1)}`;
  if (cmaxCache.has(key)) return cmaxCache.get(key);
  let lo = 0, hi = 0.5;
  for (let i = 0; i < 32; i++) {
    const m = (lo + hi) / 2;
    if (inSrgb(L, m, h)) lo = m; else hi = m;
  }
  cmaxCache.set(key, lo);
  return lo;
}

export function relativeChroma(L, C, h) {
  if (h == null || C === 0) return 0;
  const mx = cmax(L, h);
  return mx > 0 ? Math.min(1, C / mx) : 0;
}

export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((x) => LINEAR[x]);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  let x = luminance(a), y = luminance(b);
  if (x < y) [x, y] = [y, x];
  return (x + 0.05) / (y + 0.05);
}

export const floor2 = (x) => Math.floor(x * 100) / 100;

export function hueDiff(a, b) {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}

export function arcSpan(hues) {
  if (hues.length < 2) return 0;
  const s = hues.map((h) => ((h % 360) + 360) % 360).sort((x, y) => x - y);
  let maxGap = 0;
  for (let i = 0; i < s.length; i++) maxGap = Math.max(maxGap, (s[(i + 1) % s.length] - s[i] + 360) % 360 || (s.length === 1 ? 360 : 0));
  return 360 - maxGap;
}

export const inArc = (h, a, b) => (a <= b ? h >= a && h <= b : h >= a || h <= b);

export const polarity = (hex) => (contrast(hex, '#000000') > contrast(hex, '#FFFFFF') ? 'light' : 'dark');
