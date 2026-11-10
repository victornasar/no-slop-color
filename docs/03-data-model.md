# Data model

| Concern | Location | Contents |
| --- | --- | --- |
| Classification | `classifications/` | Definitions, tests and thresholds |
| Context | `contexts/domains.json` | 89 domains in 17 groups, with no colors |
| Classifier | `tools/classify.mjs`, `prompts/classify-pair.md` | Measures a pair and assigns tags |
| Curated data | `examples/source/`, built by `tools/build.mjs`; the future library | Authored pairs, reasoning and usage |
| Library | `library/source/*.json`, built to `library/directions.json` | 39 provisional curated directions |
| Engine | `tools/cli.mjs` (query, apply, classify), bundled into `skills/find-color/scripts/find-color.mjs` | Selects distinct directions, names a pick, and outputs tokens |

## Color

Every color is an object with OKLCH, the source of truth, and HEX, its sRGB output:

```json
{
  "name": "Persimmon",
  "hex": "#CE4714",
  "oklch": { "l": 0.58, "c": 0.18, "h": 38 },
  "css": "oklch(0.58 0.18 38)",
  "relative_chroma": 0.948,
  "srgb": { "status": "in-gamut", "delta_e_ok": 0.0008 }
}
```

- `oklch.h` is `null` for achromatic colors, matching CSS `none`.
- An out-of-gamut color is mapped with the CSS Color 4 algorithm and marked `gamut-mapped`. Curated pair colors must be in gamut.
- `relative_chroma` is C divided by the sRGB maximum at the same L and H.

## Pair classification

[`schemas/pair-classification.schema.json`](../schemas/pair-classification.schema.json) follows the classifier specification. Its fields:

| Field | Contents | Filled by |
| --- | --- | --- |
| `ground`, `figure`, `optional_accent` | Colors | Input |
| `area_distribution` | `"80/20"` or `"70/22/8"` | Input |
| `primary` | Flat label, confidence, notes, and `proposed_label` when Unresolved | Script; a model or curator may only lower confidence or set Unresolved |
| `alternative_two_axis` | Foundation and structure | Script |
| `secondary` | Seven dimensions of tags | Script for measured tags; a model or curator for curated tags |
| `industry` | Domain ids | Curator |
| `derived` | Two text neutrals (about 10:1 and 4.8:1 on the ground), three tints and three shades of the key color | Script |
| `measurements` | WCAG ratio, lightness difference, hue difference, ΔEOK | Script |
| `flags` | Why confidence is lower, and unconfirmed hybrid suggestions | Script |
| `summary` | One or two sentences | Curator, or a generated default |

The **key color** for tints and shades is the more chromatic of ground and figure. A side of the range is omitted when the key is already within 0.1 of that end, so black gets no shades.

## Direction

A direction wraps one pair classification:

| Field | Contents |
| --- | --- |
| `id`, `name` | Identity |
| `classification` | The pair classification |
| `reasoning` | Claims, each `measured`, `convention`, `cultural-context` (sources required) or `interpretation` |
| `usage` | Assignments of elements to roles, plus `do` and `avoid` |
| `accessibility` | Pairs by role, with intended use, ratio rounded down, minimum and result |

Usage and accessibility refer to colors by **role**: `ground`, `figure`, `accent`, `text`, `text-muted`, `tint-1` to `tint-3` and `shade-1` to `shade-3`. Every value therefore exists in one place.

## Diversity measures

Two directions are compared on primary, foundation, structure, key-color hue, ground hue, figure hue, figure lightness, ground lightness, tint and accent. The **key color** is the more chromatic of ground and figure. A hue measure counts at 40° or more, a lightness measure at 0.2 for the figure and 0.1 for the ground. **Tint** is the hue a neutral pair leans toward, or none. **Accent** counts when one direction has a chromatic accent and the other does not, or when the accent hues differ by 40° or more.

## Sources and builds

Curated directions are written once in `<dir>/source/*.json`. Library sources can use a compact form: `figure_use` (the intended use of the figure on the ground), `figure_role`, `button` (which role fills the primary button), and `accent_use` and `accent_role`. From these, the build derives the accessibility pairs and the main usage lines, and picks the button label with the strongest contrast. An optional `expect` field makes the build fail if the classifier assigns a different primary. A source gives:

- The pair as OKLCH, the area split and the industry ids.
- Judged tags, the reasoning and usage.
- The accessibility pairs and their intended uses.

Reasoning can embed computed values, such as `{ratio:figure/ground}`.

`node tools/build.mjs examples` or `node tools/build.mjs library` classifies each pair, fills those values in, checks the rules and writes `<dir>/*.recommendation.json`. The build stops when:

- A pair color is outside sRGB.
- An industry id or role does not exist.
- A contrast pair misses the minimum for its use.
- A hybrid tag is confirmed without the measurement supporting it.
- A placeholder is left unfilled.
- Two directions in one recommendation differ on fewer than two diversity measures, or two library directions differ on none.

The build has no dependencies. JSON Schema validation of the outputs is a separate step.

## Versioning

Data files carry `schemaVersion` 0.2.0, the pair model. Adding optional fields is a minor change. Renaming a field, or changing a threshold in a way that reclassifies existing pairs, is a breaking change.
